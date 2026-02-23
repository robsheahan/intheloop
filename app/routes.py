from datetime import datetime, timezone

from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_user, logout_user, login_required, current_user

from app.models import db, User, Category, TrackedEntity, AlertHistory

main = Blueprint("main", __name__)


# --- Auth ---


@main.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("main.dashboard"))

    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            login_user(user)
            next_page = request.args.get("next")
            return redirect(next_page or url_for("main.dashboard"))

        flash("Invalid email or password.", "error")

    return render_template("login.html")


@main.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("main.login"))


# --- Dashboard ---


@main.route("/")
@login_required
def dashboard():
    categories = Category.query.all()
    digest = []

    for cat in categories:
        unread = AlertHistory.query.filter_by(
            user_id=current_user.id, seen_at=None
        ).join(TrackedEntity).filter(TrackedEntity.category_id == cat.id).all()

        digest.append(
            {
                "category": cat,
                "unread_count": len(unread),
                "alerts": unread[:10],
            }
        )

    return render_template("dashboard.html", digest=digest)


# --- Mark alerts as seen ---


@main.route("/alerts/mark-seen/<int:alert_id>", methods=["POST"])
@login_required
def mark_seen(alert_id):
    alert = AlertHistory.query.filter_by(
        id=alert_id, user_id=current_user.id
    ).first_or_404()
    alert.seen_at = datetime.now(timezone.utc)
    db.session.commit()
    return redirect(request.referrer or url_for("main.dashboard"))


@main.route("/alerts/mark-all-seen/<slug>", methods=["POST"])
@login_required
def mark_all_seen(slug):
    cat = Category.query.filter_by(slug=slug).first_or_404()
    alerts = AlertHistory.query.filter_by(
        user_id=current_user.id, seen_at=None
    ).join(TrackedEntity).filter(TrackedEntity.category_id == cat.id).all()

    for alert in alerts:
        alert.seen_at = datetime.now(timezone.utc)

    db.session.commit()
    flash(f"Marked all {cat.name} alerts as seen.", "success")
    return redirect(request.referrer or url_for("main.dashboard"))


# --- Category detail ---


@main.route("/category/<slug>")
@login_required
def category_detail(slug):
    cat = Category.query.filter_by(slug=slug).first_or_404()
    alerts = (
        AlertHistory.query.filter_by(user_id=current_user.id, seen_at=None)
        .join(TrackedEntity)
        .filter(TrackedEntity.category_id == cat.id)
        .order_by(AlertHistory.created_at.desc())
        .all()
    )
    return render_template("category_detail.html", category=cat, alerts=alerts)


# --- Tracked entities management ---


@main.route("/tracked")
@login_required
def tracked_entities():
    categories = Category.query.all()
    entities_by_cat = {}
    for cat in categories:
        entities_by_cat[cat.slug] = TrackedEntity.query.filter_by(
            user_id=current_user.id, category_id=cat.id
        ).order_by(TrackedEntity.entity_name).all()
    return render_template(
        "tracked.html", categories=categories, entities_by_cat=entities_by_cat
    )


@main.route("/tracked/add", methods=["POST"])
@login_required
def add_entity():
    category_slug = request.form.get("category_slug", "").strip()
    entity_name = request.form.get("entity_name", "").strip()

    # Currency: construct entity_name from from/to fields
    if category_slug == "currency":
        from_cur = request.form.get("from_currency", "").strip().upper()
        to_cur = request.form.get("to_currency", "").strip().upper()
        if from_cur and to_cur:
            entity_name = f"{from_cur}/{to_cur}"

    if not category_slug or not entity_name:
        flash("Category and name are required.", "error")
        return redirect(url_for("main.tracked_entities"))

    cat = Category.query.filter_by(slug=category_slug).first()
    if not cat:
        flash("Invalid category.", "error")
        return redirect(url_for("main.tracked_entities"))

    existing = TrackedEntity.query.filter_by(
        user_id=current_user.id, category_id=cat.id, entity_name=entity_name
    ).first()
    if existing:
        flash(f"'{entity_name}' is already tracked in {cat.name}.", "error")
        return redirect(url_for("main.tracked_entities"))

    metadata = {}
    if category_slug == "music":
        release_type = request.form.get("release_type", "all").strip()
        if release_type in ("album", "single", "all"):
            metadata["release_type"] = release_type
    elif category_slug == "tours":
        city = request.form.get("city", "").strip()
        country = request.form.get("country", "").strip()
        if city:
            metadata["city"] = city
        if country:
            metadata["country"] = country
    elif category_slug == "crypto":
        target_price = request.form.get("target_price", "").strip()
        direction = request.form.get("direction", "above").strip()
        if target_price:
            metadata["target_price"] = target_price
        if direction in ("above", "below"):
            metadata["direction"] = direction
    elif category_slug == "stocks":
        target_price = request.form.get("target_price", "").strip()
        direction = request.form.get("direction", "above").strip()
        if target_price:
            metadata["target_price"] = target_price
        if direction in ("above", "below"):
            metadata["direction"] = direction
    elif category_slug == "movies":
        track_type = request.form.get("track_type", "actor").strip()
        if track_type in ("actor", "director"):
            metadata["track_type"] = track_type
    elif category_slug == "weather":
        alert_type = request.form.get("alert_type", "temp_above").strip()
        threshold = request.form.get("threshold", "").strip()
        if alert_type in ("temp_above", "temp_below", "rain_above", "wind_above"):
            metadata["alert_type"] = alert_type
        if threshold:
            metadata["threshold"] = threshold
    elif category_slug == "reddit":
        subreddit = request.form.get("subreddit", "").strip()
        if subreddit:
            metadata["subreddit"] = subreddit
    elif category_slug == "currency":
        target_rate = request.form.get("target_rate", "").strip()
        direction = request.form.get("direction", "above").strip()
        if target_rate:
            metadata["target_rate"] = target_rate
        if direction in ("above", "below"):
            metadata["direction"] = direction

    entity = TrackedEntity(
        user_id=current_user.id,
        category_id=cat.id,
        entity_name=entity_name,
    )
    entity.set_metadata(metadata)
    db.session.add(entity)
    db.session.commit()
    flash(f"Added '{entity_name}' to {cat.name}.", "success")
    return redirect(url_for("main.tracked_entities"))


@main.route("/tracked/remove/<int:entity_id>", methods=["POST"])
@login_required
def remove_entity(entity_id):
    entity = TrackedEntity.query.filter_by(
        id=entity_id, user_id=current_user.id
    ).first_or_404()

    AlertHistory.query.filter_by(tracked_entity_id=entity.id).delete()
    db.session.delete(entity)
    db.session.commit()
    flash(f"Removed '{entity.entity_name}'.", "success")
    return redirect(url_for("main.tracked_entities"))


# --- Alert history ---


@main.route("/history")
@login_required
def alert_history():
    page = request.args.get("page", 1, type=int)
    per_page = 30
    alerts = (
        AlertHistory.query.filter_by(user_id=current_user.id)
        .order_by(AlertHistory.created_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )
    return render_template("history.html", alerts=alerts)


# --- Manual pipeline trigger ---


@main.route("/run-pipelines", methods=["POST"])
@login_required
def run_pipelines():
    from app.scheduler import run_all_pipelines
    from flask import current_app

    run_all_pipelines(current_app._get_current_object())
    flash("Pipelines ran successfully. Check dashboard for new alerts.", "success")
    return redirect(url_for("main.dashboard"))
