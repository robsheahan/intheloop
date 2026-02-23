"""Podcast episodes pipeline using the iTunes Search API."""

import logging

import requests

from app.models import db, AlertHistory, TrackedEntity

logger = logging.getLogger(__name__)

ITUNES_SEARCH_URL = "https://itunes.apple.com/search"
ITUNES_LOOKUP_URL = "https://itunes.apple.com/lookup"


def check_podcasts(entity_names, user_id):
    """Check for new podcast episodes for tracked shows.

    Returns a list of new result dicts.
    """
    all_new = []

    for name in entity_names:
        entity = TrackedEntity.query.filter_by(
            user_id=user_id, entity_name=name
        ).join(TrackedEntity.category).filter_by(slug="podcasts").first()

        if not entity:
            continue

        try:
            results = _fetch_episodes(name)
        except Exception:
            logger.exception("Failed to fetch podcast episodes for %s", name)
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


def _fetch_episodes(podcast_name):
    """Search iTunes for a podcast and fetch recent episodes."""
    # Search for the podcast
    params = {
        "term": podcast_name,
        "media": "podcast",
        "entity": "podcast",
        "limit": 1,
    }
    resp = requests.get(ITUNES_SEARCH_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    podcasts = data.get("results", [])
    if not podcasts:
        return []

    collection_id = podcasts[0].get("collectionId")
    if not collection_id:
        return []

    # Lookup episodes
    params = {
        "id": collection_id,
        "media": "podcast",
        "entity": "podcastEpisode",
        "limit": 10,
    }
    resp = requests.get(ITUNES_LOOKUP_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    results = []
    for item in data.get("results", []):
        if item.get("wrapperType") != "podcastEpisode":
            continue

        results.append({
            "type": "podcast_episode",
            "podcast": podcast_name,
            "episode_title": item.get("trackName", ""),
            "published": item.get("releaseDate", ""),
            "duration_ms": item.get("trackTimeMillis", 0),
            "link": item.get("trackViewUrl", ""),
        })
    return results


def _make_key(item):
    """Create a dedup key from a result item."""
    return f"{item['podcast']}|{item['episode_title']}"


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
