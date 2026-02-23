"""Music releases pipeline using the iTunes Search API."""

import json
import logging

import requests

from app.models import db, AlertHistory, TrackedEntity

logger = logging.getLogger(__name__)

ITUNES_SEARCH_URL = "https://itunes.apple.com/search"


def check_releases(entity_names, user_id):
    """Check for new music releases for a list of artist names.

    Returns a list of new result dicts.
    """
    all_new = []

    for name in entity_names:
        entity = TrackedEntity.query.filter_by(
            user_id=user_id, entity_name=name
        ).join(TrackedEntity.category).filter_by(slug="music").first()

        if not entity:
            continue

        metadata = entity.get_metadata()
        release_type = metadata.get("release_type", "all")

        try:
            results = _fetch_releases(name, release_type)
        except Exception:
            logger.exception("Failed to fetch music releases for %s", name)
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


def _fetch_releases(artist_name, release_type="all"):
    """Query iTunes Search API for releases by an artist.

    release_type controls what to search for:
      "album"  → albums only
      "single" → songs/singles only
      "all"    → both albums and songs (two API calls)
    """
    entity_types = []
    if release_type == "album":
        entity_types = ["album"]
    elif release_type == "single":
        entity_types = ["song"]
    else:
        entity_types = ["album", "song"]

    results = []
    for itunes_entity in entity_types:
        params = {
            "term": artist_name,
            "media": "music",
            "entity": itunes_entity,
            "limit": 10,
        }
        resp = requests.get(ITUNES_SEARCH_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        for item in data.get("results", []):
            if itunes_entity == "album":
                results.append(
                    {
                        "type": "music_release",
                        "release_type": "album",
                        "artist": item.get("artistName", artist_name),
                        "album": item.get("collectionName", "Unknown"),
                        "release_date": item.get("releaseDate", ""),
                        "link": item.get("collectionViewUrl", ""),
                        "artwork": item.get("artworkUrl100", ""),
                    }
                )
            else:
                results.append(
                    {
                        "type": "music_release",
                        "release_type": "single",
                        "artist": item.get("artistName", artist_name),
                        "album": item.get("trackName", "Unknown"),
                        "release_date": item.get("releaseDate", ""),
                        "link": item.get("trackViewUrl", ""),
                        "artwork": item.get("artworkUrl100", ""),
                    }
                )
    return results


def _make_key(item):
    """Create a dedup key from a result item."""
    return f"{item['artist']}|{item['album']}"


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
