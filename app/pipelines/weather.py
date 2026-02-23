"""Weather alerts pipeline using the Open-Meteo API."""

import logging

import requests

from app.models import db, AlertHistory, TrackedEntity

logger = logging.getLogger(__name__)

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"


def check_weather(entity_names, user_id):
    """Check weather conditions against user thresholds.

    Returns a list of new result dicts.
    """
    all_new = []

    for name in entity_names:
        entity = TrackedEntity.query.filter_by(
            user_id=user_id, entity_name=name
        ).join(TrackedEntity.category).filter_by(slug="weather").first()

        if not entity:
            continue

        metadata = entity.get_metadata()
        alert_type = metadata.get("alert_type", "temp_above")
        threshold = metadata.get("threshold")

        if not threshold:
            continue

        try:
            threshold = float(threshold)
        except (ValueError, TypeError):
            continue

        try:
            result = _fetch_weather(name, alert_type, threshold)
        except Exception:
            logger.exception("Failed to fetch weather for %s", name)
            continue

        if result is None:
            continue

        seen_keys = _get_seen_keys(user_id, entity.id)
        key = _make_key(result)
        if key in seen_keys:
            continue

        alert = AlertHistory(
            user_id=user_id,
            tracked_entity_id=entity.id,
        )
        alert.set_content(result)
        db.session.add(alert)
        all_new.append(result)

    db.session.commit()
    return all_new


def _fetch_weather(city, alert_type, threshold):
    """Geocode a city and check today's forecast against the threshold."""
    # Geocode
    resp = requests.get(GEOCODE_URL, params={"name": city, "count": 1}, timeout=15)
    resp.raise_for_status()
    geo_data = resp.json()

    locations = geo_data.get("results", [])
    if not locations:
        return None

    lat = locations[0]["latitude"]
    lon = locations[0]["longitude"]
    resolved_name = locations[0].get("name", city)

    # Fetch today's forecast
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
        "timezone": "auto",
        "forecast_days": 1,
    }
    resp = requests.get(FORECAST_URL, params=params, timeout=15)
    resp.raise_for_status()
    forecast = resp.json()

    daily = forecast.get("daily", {})
    temp_max = (daily.get("temperature_2m_max") or [None])[0]
    temp_min = (daily.get("temperature_2m_min") or [None])[0]
    precip = (daily.get("precipitation_sum") or [None])[0]
    wind = (daily.get("wind_speed_10m_max") or [None])[0]
    forecast_date = (daily.get("time") or [""])[0]

    triggered = False
    current_value = None

    if alert_type == "temp_above" and temp_max is not None:
        triggered = temp_max >= threshold
        current_value = temp_max
    elif alert_type == "temp_below" and temp_min is not None:
        triggered = temp_min <= threshold
        current_value = temp_min
    elif alert_type == "rain_above" and precip is not None:
        triggered = precip >= threshold
        current_value = precip
    elif alert_type == "wind_above" and wind is not None:
        triggered = wind >= threshold
        current_value = wind

    if not triggered:
        return None

    return {
        "type": "weather_alert",
        "city": resolved_name,
        "alert_type": alert_type,
        "threshold": threshold,
        "current_value": current_value,
        "temp_max": temp_max,
        "temp_min": temp_min,
        "precipitation": precip,
        "wind_speed": wind,
        "forecast_date": forecast_date,
    }


def _make_key(item):
    """Create a dedup key — one alert per city per alert type per day."""
    return f"{item['city']}|{item['alert_type']}|{item['forecast_date']}"


def _get_seen_keys(user_id, entity_id):
    """Get set of already-seen dedup keys for this user+entity."""
    alerts = AlertHistory.query.filter_by(
        user_id=user_id, tracked_entity_id=entity_id
    ).all()
    keys = set()
    for a in alerts:
        content = a.get_content()
        keys.add(_make_key(content))
    return keys
