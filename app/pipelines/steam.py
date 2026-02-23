"""Steam game sales pipeline using the Steam Store API."""

import logging

import requests

from app.models import db, AlertHistory, TrackedEntity

logger = logging.getLogger(__name__)

STEAM_SEARCH_URL = "https://store.steampowered.com/api/storesearch"
STEAM_DETAILS_URL = "https://store.steampowered.com/api/appdetails"


def check_steam(entity_names, user_id):
    """Check for Steam game discounts for tracked games.

    Returns a list of new result dicts.
    """
    all_new = []

    for name in entity_names:
        entity = TrackedEntity.query.filter_by(
            user_id=user_id, entity_name=name
        ).join(TrackedEntity.category).filter_by(slug="steam").first()

        if not entity:
            continue

        try:
            results = _fetch_deals(name)
        except Exception:
            logger.exception("Failed to fetch Steam deals for %s", name)
            continue

        seen_keys = _get_seen_keys(user_id, entity.id)

        for item in results:
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


def _fetch_deals(game_name):
    """Search Steam for a game and check if it's on sale."""
    params = {"term": game_name, "l": "english", "cc": "us"}
    resp = requests.get(STEAM_SEARCH_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    items = data.get("items", [])
    if not items:
        return []

    results = []
    for item in items[:3]:
        app_id = item.get("id")
        if not app_id:
            continue

        # Fetch app details for price info
        detail_resp = requests.get(
            STEAM_DETAILS_URL,
            params={"appids": app_id, "cc": "us"},
            timeout=15,
        )
        detail_resp.raise_for_status()
        detail_data = detail_resp.json()

        app_data = detail_data.get(str(app_id), {}).get("data", {})
        if not app_data:
            continue

        price_info = app_data.get("price_overview", {})
        discount = price_info.get("discount_percent", 0)

        if discount <= 0:
            continue

        results.append({
            "type": "steam_sale",
            "game": app_data.get("name", game_name),
            "app_id": app_id,
            "discount_percent": discount,
            "final_price": price_info.get("final_formatted", ""),
            "original_price": price_info.get("initial_formatted", ""),
            "link": f"https://store.steampowered.com/app/{app_id}",
        })
    return results


def _make_key(item):
    """Create a dedup key from a result item."""
    return f"{item['app_id']}|{item['discount_percent']}"


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
