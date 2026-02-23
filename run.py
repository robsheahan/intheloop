import logging

from app import create_app
from app.models import db, User, Category, TrackedEntity
from app.scheduler import init_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = create_app()

CATEGORY_DEFINITIONS = [
    {"name": "Music Releases", "slug": "music", "description": "New album and single releases", "api_source": "itunes"},
    {"name": "Tour Dates", "slug": "tours", "description": "Upcoming concerts and tour dates", "api_source": "bandsintown"},
    {"name": "Book Releases", "slug": "books", "description": "New book releases by author", "api_source": "openlibrary"},
    {"name": "Crypto Price Alerts", "slug": "crypto", "description": "Cryptocurrency price threshold alerts", "api_source": "crypto.com"},
    {"name": "Stock Price Alerts", "slug": "stocks", "description": "Stock price threshold alerts", "api_source": "alphavantage"},
    {"name": "Movie & TV Releases", "slug": "movies", "description": "New movie and TV releases by actor or director", "api_source": "tmdb"},
    {"name": "News by Keyword", "slug": "news", "description": "News articles matching your keywords", "api_source": "googlenews"},
    {"name": "GitHub Releases", "slug": "github", "description": "New releases for GitHub repositories", "api_source": "github"},
    {"name": "Steam Game Sales", "slug": "steam", "description": "Steam game discounts and sales", "api_source": "steam"},
    {"name": "Podcast Episodes", "slug": "podcasts", "description": "New episodes from your favourite podcasts", "api_source": "itunes"},
    {"name": "Weather Alerts", "slug": "weather", "description": "Weather threshold alerts for your cities", "api_source": "openmeteo"},
    {"name": "Reddit Monitor", "slug": "reddit", "description": "Top Reddit posts matching your keywords", "api_source": "reddit"},
    {"name": "Currency Exchange", "slug": "currency", "description": "Currency exchange rate threshold alerts", "api_source": "frankfurter"},
]


def ensure_categories():
    """Create any missing categories on startup. Safe for existing databases."""
    with app.app_context():
        existing_slugs = {c.slug for c in Category.query.all()}
        added = 0
        for defn in CATEGORY_DEFINITIONS:
            if defn["slug"] not in existing_slugs:
                db.session.add(Category(**defn))
                added += 1
        if added:
            db.session.commit()
            logging.info("Added %d new categories.", added)


def seed_database():
    """Seed the database with an admin user, categories, and example entities."""
    with app.app_context():
        if User.query.first():
            return

        # Admin user
        admin = User(email="admin@local.com")
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.flush()

        # Categories
        music = Category(
            name="Music Releases",
            slug="music",
            description="New album and single releases",
            api_source="itunes",
        )
        tours = Category(
            name="Tour Dates",
            slug="tours",
            description="Upcoming concerts and tour dates",
            api_source="bandsintown",
        )
        books = Category(
            name="Book Releases",
            slug="books",
            description="New book releases by author",
            api_source="openlibrary",
        )
        db.session.add_all([music, tours, books])
        db.session.flush()

        # Example tracked entities
        example_entities = [
            TrackedEntity(user_id=admin.id, category_id=music.id, entity_name="Radiohead"),
            TrackedEntity(user_id=admin.id, category_id=music.id, entity_name="Taylor Swift"),
            TrackedEntity(user_id=admin.id, category_id=tours.id, entity_name="Radiohead"),
            TrackedEntity(user_id=admin.id, category_id=tours.id, entity_name="Billie Eilish"),
            TrackedEntity(user_id=admin.id, category_id=books.id, entity_name="Brandon Sanderson"),
            TrackedEntity(user_id=admin.id, category_id=books.id, entity_name="Colleen Hoover"),
        ]
        db.session.add_all(example_entities)
        db.session.commit()

        logging.info("Database seeded with admin user and example entities.")


# Always run seed + ensure on import (needed for gunicorn)
seed_database()
ensure_categories()
init_scheduler(app)

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, host="0.0.0.0", port=5000)
