"""Book releases pipeline using the Open Library Search API."""

import json
import logging

import requests

from app.models import db, AlertHistory, TrackedEntity

logger = logging.getLogger(__name__)

OPENLIBRARY_SEARCH_URL = "https://openlibrary.org/search.json"


def check_books(entity_names, user_id):
    """Check for new books by a list of author names.

    Returns a list of new result dicts.
    """
    all_new = []

    for name in entity_names:
        entity = TrackedEntity.query.filter_by(
            user_id=user_id, entity_name=name
        ).join(TrackedEntity.category).filter_by(slug="books").first()

        if not entity:
            continue

        try:
            results = _fetch_books(name)
        except Exception:
            logger.exception("Failed to fetch books for %s", name)
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


def _fetch_books(author_name):
    """Query Open Library for books by an author, sorted by newest."""
    params = {
        "author": author_name,
        "sort": "new",
        "limit": 10,
    }
    resp = requests.get(OPENLIBRARY_SEARCH_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    results = []
    for doc in data.get("docs", []):
        key = doc.get("key", "")
        link = f"https://openlibrary.org{key}" if key else ""

        results.append(
            {
                "type": "book_release",
                "author": author_name,
                "title": doc.get("title", "Unknown"),
                "publish_date": doc.get("first_publish_year", ""),
                "link": link,
                "cover_id": doc.get("cover_i", ""),
            }
        )
    return results


def _make_key(item):
    """Create a dedup key from a result item."""
    return f"{item['author']}|{item['title']}"


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
