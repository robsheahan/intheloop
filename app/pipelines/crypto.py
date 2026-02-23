"""Crypto price alerts pipeline using the Crypto.com public API."""

import logging
from datetime import date

import requests

from app.models import db, AlertHistory, TrackedEntity

logger = logging.getLogger(__name__)

TICKER_URL = "https://api.crypto.com/exchange/v1/public/get-tickers"


def check_crypto(entity_names, user_id):
    """Check crypto prices against user thresholds.

    Returns a list of new result dicts.
    """
    all_new = []

    for name in entity_names:
        entity = TrackedEntity.query.filter_by(
            user_id=user_id, entity_name=name
        ).join(TrackedEntity.category).filter_by(slug="crypto").first()

        if not entity:
            continue

        metadata = entity.get_metadata()
        target_price = metadata.get("target_price")
        direction = metadata.get("direction", "above")

        if not target_price:
            continue

        try:
            target_price = float(target_price)
        except (ValueError, TypeError):
            continue

        try:
            current_price = _fetch_price(name)
        except Exception:
            logger.exception("Failed to fetch crypto price for %s", name)
            continue

        if current_price is None:
            continue

        triggered = (
            (direction == "above" and current_price >= target_price)
            or (direction == "below" and current_price <= target_price)
        )

        if not triggered:
            continue

        check_date = date.today().isoformat()
        item = {
            "type": "crypto_alert",
            "instrument": name,
            "current_price": current_price,
            "target_price": target_price,
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


def _fetch_price(instrument_name):
    """Fetch the latest price for an instrument from Crypto.com."""
    params = {"instrument_name": instrument_name}
    resp = requests.get(TICKER_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    tickers = data.get("result", {}).get("data", [])
    if not tickers:
        return None

    return float(tickers[0].get("a", 0))  # 'a' = last trade price


def _make_key(item):
    """Create a dedup key — one alert per instrument per day per direction."""
    return f"{item['instrument']}|{item['direction']}|{item['check_date']}"


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
