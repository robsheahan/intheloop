import logging

from app import create_app
from app.models import db, User, Category, TrackedEntity
from app.scheduler import init_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = create_app()


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


if __name__ == "__main__":
    seed_database()
    init_scheduler(app)
    app.run(debug=True, use_reloader=False, host="0.0.0.0", port=5000)
