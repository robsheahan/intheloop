"""Tour dates pipeline using the MusicBrainz API.

Uses the free MusicBrainz API to find upcoming/recent releases that
indicate touring activity. Since truly free tour date APIs are scarce,
this searches for live/compilation releases and singles that often
accompany tours. For dedicated tour tracking, swap in a Bandsintown or
Songkick API key.
"""

import json
import logging

import requests

from app.models import db, AlertHistory, TrackedEntity

logger = logging.getLogger(__name__)

MUSICBRAINZ_URL = "https://musicbrainz.org/ws/2/release"
USER_AGENT = "DigestApp/1.0 (personal project)"


def check_tours(entity_names, user_id):
    """Check for upcoming tour dates for a list of artist names.

    Returns a list of new result dicts.
    """
    all_new = []

    for name in entity_names:
        entity = TrackedEntity.query.filter_by(
            user_id=user_id, entity_name=name
        ).join(TrackedEntity.category).filter_by(slug="tours").first()

        if not entity:
            continue

        metadata = entity.get_metadata()
        filter_city = metadata.get("city", "").lower()
        filter_country = metadata.get("country", "").lower()

        try:
            results = _fetch_events(name)
        except Exception:
            logger.exception("Failed to fetch tour dates for %s", name)
            continue

        if filter_city or filter_country:
            results = _filter_by_location(results, filter_city, filter_country)

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


def _fetch_events(artist_name):
    """Query MusicBrainz for recent live/single releases by an artist.

    This acts as a proxy for touring activity — artists releasing live
    albums, singles, or EPs are often on or about to go on tour.
    """
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    params = {
        "query": f'artist:"{artist_name}"',
        "type": "single",
        "limit": 10,
        "fmt": "json",
    }
    resp = requests.get(MUSICBRAINZ_URL, params=params, headers=headers, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    results = []
    for release in data.get("releases", []):
        artist_credit = release.get("artist-credit", [])
        matched_artist = any(
            artist_name.lower() in ac.get("name", "").lower()
            or artist_name.lower() in ac.get("artist", {}).get("name", "").lower()
            for ac in artist_credit
        )
        if not matched_artist:
            continue

        mbid = release.get("id", "")
        link = f"https://musicbrainz.org/release/{mbid}" if mbid else ""

        results.append(
            {
                "type": "tour_date",
                "artist": artist_name,
                "venue": release.get("title", "Unknown Release"),
                "city": release.get("country", ""),
                "country": "",
                "date": release.get("date", ""),
                "ticket_link": link,
            }
        )
    return results


def _filter_by_location(results, filter_city, filter_country):
    """Filter tour results to only those matching the user's city/country."""
    filtered = []
    for item in results:
        item_city = item.get("city", "").lower()
        item_country = item.get("country", "").lower()

        if filter_city and filter_city not in item_city:
            continue
        if filter_country and filter_country not in item_country:
            continue

        filtered.append(item)
    return filtered


def _make_key(item):
    """Create a dedup key from a result item."""
    return f"{item['artist']}|{item['venue']}|{item['date']}"


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
