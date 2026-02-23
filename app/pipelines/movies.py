"""Movie & TV releases pipeline using the TMDB API."""

import logging

import requests
from flask import current_app

from app.models import db, AlertHistory, TrackedEntity

logger = logging.getLogger(__name__)

TMDB_BASE = "https://api.themoviedb.org/3"


def check_movies(entity_names, user_id):
    """Check for new movie/TV credits for tracked actors or directors.

    Returns a list of new result dicts.
    """
    api_key = current_app.config.get("TMDB_API_KEY", "")
    if not api_key:
        logger.warning("TMDB_API_KEY not configured — skipping movies pipeline")
        return []

    all_new = []

    for name in entity_names:
        entity = TrackedEntity.query.filter_by(
            user_id=user_id, entity_name=name
        ).join(TrackedEntity.category).filter_by(slug="movies").first()

        if not entity:
            continue

        metadata = entity.get_metadata()
        track_type = metadata.get("track_type", "actor")

        try:
            results = _fetch_credits(name, track_type, api_key)
        except Exception:
            logger.exception("Failed to fetch movies for %s", name)
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


def _fetch_credits(person_name, track_type, api_key):
    """Search for a person on TMDB and return their recent credits."""
    # Find person
    params = {"api_key": api_key, "query": person_name}
    resp = requests.get(f"{TMDB_BASE}/search/person", params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    persons = data.get("results", [])
    if not persons:
        return []

    person_id = persons[0]["id"]

    # Get combined credits
    resp = requests.get(
        f"{TMDB_BASE}/person/{person_id}/combined_credits",
        params={"api_key": api_key},
        timeout=15,
    )
    resp.raise_for_status()
    credits_data = resp.json()

    if track_type == "director":
        items = credits_data.get("crew", [])
        items = [i for i in items if i.get("job") == "Director"]
    else:
        items = credits_data.get("cast", [])

    # Sort by release date descending, take newest 10
    items.sort(key=lambda x: x.get("release_date") or x.get("first_air_date") or "", reverse=True)
    items = items[:10]

    results = []
    for item in items:
        title = item.get("title") or item.get("name", "Unknown")
        media_type = item.get("media_type", "movie")
        release_date = item.get("release_date") or item.get("first_air_date", "")
        tmdb_id = item.get("id", "")
        link = f"https://www.themoviedb.org/{media_type}/{tmdb_id}" if tmdb_id else ""

        results.append({
            "type": "movie_release",
            "person": person_name,
            "title": title,
            "media_type": media_type,
            "release_date": release_date,
            "link": link,
            "track_type": track_type,
        })
    return results


def _make_key(item):
    """Create a dedup key from a result item."""
    return f"{item['person']}|{item['title']}|{item['media_type']}"


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
