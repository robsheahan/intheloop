"""APScheduler setup for running pipelines on a schedule."""

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.models import db, User, Category, TrackedEntity
from app.pipelines.music import check_releases
from app.pipelines.tours import check_tours
from app.pipelines.books import check_books
from app.pipelines.crypto import check_crypto
from app.pipelines.stocks import check_stocks
from app.pipelines.movies import check_movies
from app.pipelines.news import check_news
from app.pipelines.github import check_github
from app.pipelines.steam import check_steam
from app.pipelines.podcasts import check_podcasts
from app.pipelines.weather import check_weather
from app.pipelines.reddit import check_reddit
from app.pipelines.currency import check_currency

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

PIPELINE_MAP = {
    "music": check_releases,
    "tours": check_tours,
    "books": check_books,
    "crypto": check_crypto,
    "stocks": check_stocks,
    "movies": check_movies,
    "news": check_news,
    "github": check_github,
    "steam": check_steam,
    "podcasts": check_podcasts,
    "weather": check_weather,
    "reddit": check_reddit,
    "currency": check_currency,
}


def run_all_pipelines(app):
    """Run all pipelines for all users. Called by APScheduler."""
    with app.app_context():
        users = User.query.all()
        categories = Category.query.all()

        for user in users:
            for category in categories:
                pipeline_fn = PIPELINE_MAP.get(category.slug)
                if not pipeline_fn:
                    continue

                entities = TrackedEntity.query.filter_by(
                    user_id=user.id, category_id=category.id
                ).all()
                entity_names = [e.entity_name for e in entities]

                if not entity_names:
                    continue

                logger.info(
                    "Running %s pipeline for user %s with %d entities",
                    category.slug,
                    user.email,
                    len(entity_names),
                )

                try:
                    new_items = pipeline_fn(entity_names, user.id)
                    logger.info(
                        "Pipeline %s found %d new items for user %s",
                        category.slug,
                        len(new_items),
                        user.email,
                    )
                except Exception:
                    logger.exception(
                        "Pipeline %s failed for user %s",
                        category.slug,
                        user.email,
                    )


def init_scheduler(app):
    """Initialize and start the scheduler."""
    if not app.config.get("SCHEDULER_ENABLED", True):
        logger.info("Scheduler disabled by config")
        return

    hour = app.config.get("PIPELINE_HOUR", 7)
    minute = app.config.get("PIPELINE_MINUTE", 0)

    scheduler.add_job(
        run_all_pipelines,
        "cron",
        hour=hour,
        minute=minute,
        args=[app],
        id="daily_pipeline_run",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started, pipelines will run daily at %02d:%02d", hour, minute)
