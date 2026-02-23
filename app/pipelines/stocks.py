"""Stock price alerts pipeline using the Alpha Vantage API."""

import logging
from datetime import date

import requests
from flask import current_app

from app.models import db, AlertHistory, TrackedEntity

logger = logging.getLogger(__name__)

AV_URL = "https://www.alphavantage.co/query"


def check_stocks(entity_names, user_id):
    """Check stock prices against user thresholds.

    Returns a list of new result dicts.
    """
    api_key = current_app.config.get("ALPHA_VANTAGE_KEY", "")
    if not api_key:
        logger.warning("ALPHA_VANTAGE_KEY not configured — skipping stocks pipeline")
        return []

    all_new = []

    for name in entity_names:
        entity = TrackedEntity.query.filter_by(
            user_id=user_id, entity_name=name
        ).join(TrackedEntity.category).filter_by(slug="stocks").first()

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
            current_price = _fetch_price(name, api_key)
        except Exception:
            logger.exception("Failed to fetch stock price for %s", name)
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
            "type": "stock_alert",
            "symbol": name,
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


def _fetch_price(symbol, api_key):
    """Fetch the latest stock price from Alpha Vantage GLOBAL_QUOTE."""
    params = {
        "function": "GLOBAL_QUOTE",
        "symbol": symbol,
        "apikey": api_key,
    }
    resp = requests.get(AV_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    quote = data.get("Global Quote", {})
    price_str = quote.get("05. price")
    if not price_str:
        return None

    return float(price_str)


def _make_key(item):
    """Create a dedup key — one alert per symbol per day per direction."""
    return f"{item['symbol']}|{item['direction']}|{item['check_date']}"


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
