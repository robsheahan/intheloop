import json
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    tracked_entities = db.relationship("TrackedEntity", backref="user", lazy=True)
    alerts = db.relationship("AlertHistory", backref="user", lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    api_source = db.Column(db.String(100))

    tracked_entities = db.relationship("TrackedEntity", backref="category", lazy=True)


class TrackedEntity(db.Model):
    __tablename__ = "tracked_entities"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    entity_name = db.Column(db.String(255), nullable=False)
    entity_metadata = db.Column(db.Text, default="{}")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    alerts = db.relationship("AlertHistory", backref="tracked_entity", lazy=True)

    def get_metadata(self):
        return json.loads(self.entity_metadata or "{}")

    def set_metadata(self, data):
        self.entity_metadata = json.dumps(data)


class AlertHistory(db.Model):
    __tablename__ = "alert_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    tracked_entity_id = db.Column(
        db.Integer, db.ForeignKey("tracked_entities.id"), nullable=False
    )
    content = db.Column(db.Text, nullable=False)
    seen_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def get_content(self):
        return json.loads(self.content)

    def set_content(self, data):
        self.content = json.dumps(data)
