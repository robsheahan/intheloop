"""GitHub releases pipeline using the GitHub REST API."""

import logging

import requests

from app.models import db, AlertHistory, TrackedEntity

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com/repos/{repo}/releases"


def check_github(entity_names, user_id):
    """Check for new GitHub releases for tracked repositories.

    Returns a list of new result dicts.
    """
    all_new = []

    for name in entity_names:
        entity = TrackedEntity.query.filter_by(
            user_id=user_id, entity_name=name
        ).join(TrackedEntity.category).filter_by(slug="github").first()

        if not entity:
            continue

        try:
            results = _fetch_releases(name)
        except Exception:
            logger.exception("Failed to fetch GitHub releases for %s", name)
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


def _fetch_releases(repo):
    """Fetch the latest releases for a GitHub repo (e.g. 'facebook/react')."""
    url = GITHUB_API.format(repo=repo)
    headers = {"Accept": "application/vnd.github.v3+json"}
    resp = requests.get(url, headers=headers, params={"per_page": 10}, timeout=15)
    resp.raise_for_status()
    releases = resp.json()

    results = []
    for rel in releases:
        results.append({
            "type": "github_release",
            "repo": repo,
            "tag": rel.get("tag_name", ""),
            "name": rel.get("name", "") or rel.get("tag_name", ""),
            "published": rel.get("published_at", ""),
            "link": rel.get("html_url", ""),
            "prerelease": rel.get("prerelease", False),
        })
    return results


def _make_key(item):
    """Create a dedup key from a result item."""
    return f"{item['repo']}|{item['tag']}"


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
