from flask import Flask
from flask_login import LoginManager

from app.models import db, User
from config import Config

login_manager = LoginManager()
login_manager.login_view = "main.login"


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    login_manager.init_app(app)

    from app.routes import main

    app.register_blueprint(main)

    with app.app_context():
        db.create_all()

    return app
