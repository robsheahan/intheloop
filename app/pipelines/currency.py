"""Currency exchange rate alerts pipeline using the Frankfurter API."""

import logging
from datetime import date

import requests

from app.models import db, AlertHistory, TrackedEntity

logger = logging.getLogger(__name__)

FRANKFURTER_URL = "https://api.frankfurter.app/latest"


def check_currency(entity_names, user_id):
    """Check currency exchange rates against user thresholds.

    entity_name format is "FROM/TO", e.g. "USD/AUD".
    Returns a list of new result dicts.
    """
    all_new = []

    for name in entity_names:
        entity = TrackedEntity.query.filter_by(
            user_id=user_id, entity_name=name
        ).join(TrackedEntity.category).filter_by(slug="currency").first()

        if not entity:
            continue

        metadata = entity.get_metadata()
        target_rate = metadata.get("target_rate")
        direction = metadata.get("direction", "above")

        if not target_rate:
            continue

        try:
            target_rate = float(target_rate)
        except (ValueError, TypeError):
            continue

        parts = name.split("/")
        if len(parts) != 2:
            continue
        from_cur, to_cur = parts[0].strip(), parts[1].strip()

        try:
            current_rate = _fetch_rate(from_cur, to_cur)
        except Exception:
            logger.exception("Failed to fetch exchange rate for %s", name)
            continue

        if current_rate is None:
            continue

        triggered = (
            (direction == "above" and current_rate >= target_rate)
            or (direction == "below" and current_rate <= target_rate)
        )

        if not triggered:
            continue

        check_date = date.today().isoformat()
        item = {
            "type": "currency_alert",
            "pair": name,
            "from_currency": from_cur,
            "to_currency": to_cur,
            "current_rate": current_rate,
            "target_rate": target_rate,
            "direction": direction,
            "check_date": check_date,
        }

        seen_keys = _get_seen_keys(user_id, entity.id)
        key = _make_key(item)
        if key in seen_keys:
            continue

        alert = AlertHistory(
            user_id=user_id,
            tracked_entity_id=entity.id,
        )
        alert.set_content(item)
        db.session.add(alert)
        all_new.append(item)

    db.session.commit()
    return all_new


def _fetch_rate(from_currency, to_currency):
    """Fetch the latest exchange rate from the Frankfurter API."""
    params = {"from": from_currency, "to": to_currency}
    resp = requests.get(FRANKFURTER_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    rates = data.get("rates", {})
    return rates.get(to_currency)


def _make_key(item):
    """Create a dedup key — one alert per pair per day per direction."""
    return f"{item['pair']}|{item['direction']}|{item['check_date']}"


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
