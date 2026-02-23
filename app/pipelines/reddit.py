"""Reddit monitor pipeline using the Reddit JSON API."""

import logging

import requests

from app.models import db, AlertHistory, TrackedEntity

logger = logging.getLogger(__name__)

REDDIT_SEARCH_URL = "https://www.reddit.com/search.json"
REDDIT_SUBREDDIT_URL = "https://www.reddit.com/r/{subreddit}/search.json"
USER_AGENT = "DigestApp/1.0 (personal project)"


def check_reddit(entity_names, user_id):
    """Check for top Reddit posts matching tracked keywords.

    Returns a list of new result dicts.
    """
    all_new = []

    for name in entity_names:
        entity = TrackedEntity.query.filter_by(
            user_id=user_id, entity_name=name
        ).join(TrackedEntity.category).filter_by(slug="reddit").first()

        if not entity:
            continue

        metadata = entity.get_metadata()
        subreddit = metadata.get("subreddit", "").strip()

        try:
            results = _fetch_posts(name, subreddit)
        except Exception:
            logger.exception("Failed to fetch Reddit posts for %s", name)
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


def _fetch_posts(keyword, subreddit=""):
    """Fetch top recent Reddit posts matching a keyword."""
    headers = {"User-Agent": USER_AGENT}

    if subreddit:
        url = REDDIT_SUBREDDIT_URL.format(subreddit=subreddit)
        params = {"q": keyword, "sort": "new", "restrict_sr": "on", "limit": 10, "t": "week"}
    else:
        url = REDDIT_SEARCH_URL
        params = {"q": keyword, "sort": "new", "limit": 10, "t": "week"}

    resp = requests.get(url, headers=headers, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    results = []
    for child in data.get("data", {}).get("children", []):
        post = child.get("data", {})
        results.append({
            "type": "reddit_post",
            "keyword": keyword,
            "title": post.get("title", ""),
            "subreddit": post.get("subreddit", ""),
            "score": post.get("score", 0),
            "num_comments": post.get("num_comments", 0),
            "author": post.get("author", ""),
            "link": f"https://reddit.com{post.get('permalink', '')}",
        })
    return results


def _make_key(item):
    """Create a dedup key from a result item."""
    return f"{item['keyword']}|{item['title']}"


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
