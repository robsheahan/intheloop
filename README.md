# Digest

A personal web app that monitors topics you care about and delivers a digest of updates. Tracks music releases, tour dates, and book releases via free public APIs.

## Setup

```bash
cd ~/digest-app

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the app (seeds the database on first run)
python run.py
```

The app starts at **http://localhost:5000**.

## Default Login

- **Email:** admin@local.com
- **Password:** admin123

## How It Works

1. **Track entities** — Add artist names, author names, etc. on the Tracked page.
2. **Pipelines run daily** — APScheduler runs each category pipeline once a day at 7:00 AM (configurable).
3. **View your digest** — The dashboard shows unread alerts grouped by category.
4. **Manual trigger** — Click "Run pipelines now" on the dashboard to fetch results immediately.

## Category Pipelines

| Category | API | What It Checks |
|----------|-----|----------------|
| Music Releases | iTunes Search API | New albums by artist |
| Tour Dates | Bandsintown API | Upcoming shows by artist |
| Book Releases | Open Library API | New books by author |

## Configuration

Environment variables (or edit `config.py`):

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `dev-secret-change-in-production` | Flask session secret |
| `DATABASE_URL` | `sqlite:///digest.db` | Database connection string |
| `SCHEDULER_ENABLED` | `true` | Enable/disable scheduled jobs |
| `PIPELINE_HOUR` | `7` | Hour to run pipelines (0-23) |
| `PIPELINE_MINUTE` | `0` | Minute to run pipelines (0-59) |

## Project Structure

```
digest-app/
  app/
    pipelines/
      music.py       # iTunes Search API
      tours.py       # Bandsintown API
      books.py       # Open Library API
    templates/       # Jinja2 templates
    static/          # CSS
    models.py        # SQLAlchemy models
    routes.py        # Flask routes
    scheduler.py     # APScheduler setup
    __init__.py      # App factory
  run.py             # Entry point + database seeding
  config.py          # Configuration
  requirements.txt
```

## Multi-User Ready

The schema and all queries are built with `user_id` filtering from the start. Adding a signup flow later requires only a new route and form — no restructuring needed.
