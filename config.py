import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'digest.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SCHEDULER_ENABLED = os.environ.get("SCHEDULER_ENABLED", "true").lower() == "true"
    # Run pipelines once daily at 7am by default
    PIPELINE_HOUR = int(os.environ.get("PIPELINE_HOUR", "7"))
    PIPELINE_MINUTE = int(os.environ.get("PIPELINE_MINUTE", "0"))
    # Optional API keys (pipelines skip gracefully if missing)
    ALPHA_VANTAGE_KEY = os.environ.get("ALPHA_VANTAGE_KEY", "")
    TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")
