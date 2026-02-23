"""News by keyword pipeline using Google News RSS."""

import logging
from urllib.parse import quote_plus

import feedparser

from app.models import db, AlertHistory, TrackedEntity

logger = logging.getLogger(__name__)

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q={query}&hl=en"


def check_news(entity_names, user_id):
    """Check for news articles matching tracked keywords.

    Returns a list of new result dicts.
    """
    all_new = []

    for name in entity_names:
        entity = TrackedEntity.query.filter_by(
            user_id=user_id, entity_name=name
        ).join(TrackedEntity.category).filter_by(slug="news").first()

        if not entity:
            continue

        try:
            results = _fetch_news(name)
        except Exception:
            logger.exception("Failed to fetch news for %s", name)
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


def _fetch_news(keyword):
    """Fetch recent news articles from Google News RSS for a keyword."""
    url = GOOGLE_NEWS_RSS.format(query=quote_plus(keyword))
    feed = feedparser.parse(url)

    results = []
    for entry in feed.entries[:10]:
        results.append({
            "type": "news_article",
            "keyword": keyword,
            "title": entry.get("title", ""),
            "source": entry.get("source", {}).get("title", ""),
            "published": entry.get("published", ""),
            "link": entry.get("link", ""),
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
