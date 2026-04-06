"""
Nexus — Flask Backend  (backend/app.py)
CS485 Project

All mutable data (users, posts, conversations, messages, notifications,
jobs, companies) lives in SQLite via database.py.

Static reference data (events, groups, courses, news, invitations, hashtags)
is served directly from data/*.py — they have no mutation routes.

Run:
    pip3 install -r backend/requirements.txt
    python3 backend/app.py
"""

from flask import Flask, jsonify, request, abort, send_from_directory
from flask_cors import CORS
import sys
import os
import re

# Allow running from repo root: python backend/app.py
sys.path.insert(0, os.path.dirname(__file__))

import database as dbl          # SQLite data layer
import outreach as outreach_mod  # NX.BE.OutreachModule

# Static reference data (read-only, never mutated)
import data as static_data

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

app = Flask(__name__, static_folder=ROOT_DIR, static_url_path="")
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialise DB (creates schema + seeds if empty)
dbl.init_db()


def _auth_user():
    """
    Extract and validate the session token from the Authorization header.
    Returns the user dict on success, or None if unauthenticated/invalid token.
    """
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
    uid = dbl.get_session_user_id(token) if token else None
    return dbl.get_current_user(uid) if uid else None


# ── Serve SPA ─────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(ROOT_DIR, "app.html")


# ── Error handlers ────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": str(e)}), 404


@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": str(e)}), 400


@app.errorhandler(401)
def unauthorized(e):
    return jsonify({"error": str(e)}), 401


@app.errorhandler(409)
def conflict(e):
    return jsonify({"error": str(e)}), 409


# ══════════════════════════════════════════════════════════════
# Auth / Account Endpoints
# ══════════════════════════════════════════════════════════════

@app.route("/api/auth/login", methods=["POST"])
def login():
    """
    POST /api/auth/login — authenticate an existing user.
    Body: { email, password }
    Returns { user, token } on success or 401 on failure.
    """
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        abort(400, description="email and password are required")

    user = dbl.verify_credentials(email, password)
    if not user:
        abort(401, description="Invalid email or password")

    token = dbl.create_session(user["id"])
    return jsonify({"user": user, "token": token}), 200


@app.route("/api/auth/register", methods=["POST"])
def register():
    """
    POST /api/auth/register — create a new user account.
    Body: { name, email, password }
    Returns the new user dict (201) or 400/409 on validation failure.
    """
    body = request.get_json(silent=True) or {}

    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not name:
        abort(400, description="name is required")
    if not email or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        abort(400, description="a valid email is required")
    if len(password) < 8:
        abort(400, description="password must be at least 8 characters")

    try:
        user = dbl.create_user(name, email, password)
    except ValueError as exc:
        abort(409, description=str(exc))

    token = dbl.create_session(user["id"])
    return jsonify({"user": user, "token": token}), 201


# ══════════════════════════════════════════════════════════════
# User Endpoints
# ══════════════════════════════════════════════════════════════

@app.route("/api/me")
def get_me():
    """GET /api/me — current logged-in user profile."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    return jsonify(user)


@app.route("/api/me", methods=["PUT", "PATCH"])
def update_me():
    """PUT /api/me — update current user profile fields."""
    body = request.get_json(silent=True) or {}
    allowed = {"name", "headline", "location", "about", "pronouns", "industry"}
    updates = {k: v for k, v in body.items() if k in allowed and isinstance(v, str)}
    if not updates:
        abort(400, description="No valid fields to update")
    current_user = _auth_user()
    if not current_user:
        abort(401, description="Not authenticated")
    updated = dbl.update_current_user(updates, current_user["id"])
    if not updated:
        abort(404, description="Current user not found")
    return jsonify(updated)


@app.route("/api/users")
def get_users():
    """GET /api/users — all users in the network (excludes current user)."""
    current = _auth_user()
    return jsonify(dbl.get_all_users(current["id"] if current else 1))


@app.route("/api/users/<int:user_id>")
def get_user(user_id):
    """GET /api/users/:id — single user by ID."""
    user = dbl.get_user_by_id(user_id)
    if not user:
        abort(404, description=f"User {user_id} not found")
    return jsonify(user)


@app.route("/api/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    """
    DELETE /api/users/:id — remove a user account and all their data.
    Cannot delete user id=1 (the primary demo account).
    Returns 204 on success, 404 if not found, 403 if protected.
    """
    try:
        deleted = dbl.delete_user(user_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 403

    if not deleted:
        abort(404, description=f"User {user_id} not found")
    return "", 204


# ══════════════════════════════════════════════════════════════
# Feed Endpoints
# ══════════════════════════════════════════════════════════════

@app.route("/api/feed")
def get_feed():
    """GET /api/feed — all posts, newest first, with userLiked flag."""
    current_user = _auth_user()
    posts = dbl.get_all_posts()
    liked_ids = dbl.get_post_likes_for_user(current_user["id"]) if current_user else set()
    for p in posts:
        p["userLiked"] = p["id"] in liked_ids
    return jsonify(posts)


@app.route("/api/feed", methods=["POST"])
def create_post():
    """POST /api/feed — create a new post. Body: {content: str}"""
    body = request.get_json(silent=True) or {}
    content = (body.get("content") or "").strip()
    if not content:
        abort(400, description="content is required and must not be empty")

    current_user = _auth_user()
    if not current_user:
        abort(401, description="Authentication required")

    post = dbl.create_post(current_user["id"], content)
    return jsonify(post), 201


@app.route("/api/feed/<int:post_id>", methods=["DELETE"])
def delete_post(post_id):
    """DELETE /api/feed/:id — delete a post (owner only)."""
    current_user = _auth_user()
    deleted = dbl.delete_post(post_id, current_user["id"])
    if not deleted:
        abort(404, description=f"Post {post_id} not found or not yours")
    return jsonify({"deleted": True})


@app.route("/api/feed/<int:post_id>/like", methods=["POST"])
def toggle_post_like(post_id):
    """POST /api/feed/:id/like — toggle like on a post."""
    current_user = _auth_user()
    result = dbl.toggle_post_like(post_id, current_user["id"])
    return jsonify(result)


@app.route("/api/feed/<int:post_id>/comments", methods=["POST"])
def add_post_comment(post_id):
    """POST /api/feed/:id/comments — add a comment. Body: {text: str}"""
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        abort(400, description="text is required")
    current_user = _auth_user()
    comment = dbl.add_post_comment(post_id, current_user["id"], text)
    if comment is None:
        abort(404, description=f"Post {post_id} not found")
    return jsonify(comment), 201


# ══════════════════════════════════════════════════════════════
# Job Endpoints
# ══════════════════════════════════════════════════════════════

@app.route("/api/jobs")
def get_jobs():
    """GET /api/jobs — all job listings."""
    return jsonify(dbl.get_all_jobs())


@app.route("/api/jobs/<int:job_id>")
def get_job(job_id):
    """GET /api/jobs/:id — single job listing."""
    job = dbl.get_job_by_id(job_id)
    if not job:
        abort(404, description=f"Job {job_id} not found")
    return jsonify(job)


# ══════════════════════════════════════════════════════════════
# Company Endpoints
# ══════════════════════════════════════════════════════════════

@app.route("/api/companies/<int:company_id>")
def get_company(company_id):
    """GET /api/companies/:id — company detail."""
    company = dbl.get_company_by_id(company_id)
    if not company:
        abort(404, description=f"Company {company_id} not found")
    return jsonify(company)


# ══════════════════════════════════════════════════════════════
# Conversation Endpoints
# ══════════════════════════════════════════════════════════════

@app.route("/api/conversations", methods=["POST"])
def create_conversation():
    """POST /api/conversations — start a new conversation with another user."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True) or {}
    participant_id = body.get("participantId")
    if not participant_id:
        abort(400, description="participantId is required")
    participant = dbl.get_user_by_id(int(participant_id))
    if not participant:
        abort(404, description="Participant not found")
    conv = dbl.create_conversation(user["id"], participant)
    return jsonify(conv), 201


@app.route("/api/conversations")
def get_conversations_list():
    """GET /api/conversations — message threads for the current user."""
    user = _auth_user()
    uid = user["id"] if user else 1
    return jsonify(dbl.get_conversations_for_user(uid))


@app.route("/api/conversations/<int:conv_id>")
def get_conversation(conv_id):
    """GET /api/conversations/:id — single conversation with full messages."""
    user = _auth_user()
    uid = user["id"] if user else 1
    conv = dbl.get_conversation_by_id(conv_id)
    if not conv:
        abort(404, description=f"Conversation {conv_id} not found")
    participant_id = int(conv.get("participantId") or conv.get("participant", {}).get("id", 0) or 0)
    if int(conv.get("ownerId", 1)) != uid and participant_id != uid:
        abort(403, description="Access denied")
    return jsonify(conv)


@app.route("/api/conversations/<int:conv_id>/messages", methods=["POST"])
def post_message(conv_id):
    """POST /api/conversations/:id/messages — send a message. Body: {text: str}"""
    # Verify conversation exists
    conv = dbl.get_conversation_by_id(conv_id)
    if not conv:
        abort(404, description=f"Conversation {conv_id} not found")

    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        abort(400, description="text is required")

    current_user = _auth_user()
    if not current_user:
        abort(401, description="Authentication required")
    msg = dbl.send_message(conv_id, sender_id=current_user["id"], text=text)
    msg["isMe"] = True
    return jsonify(msg), 201


# ══════════════════════════════════════════════════════════════
# Notification Endpoints
# ══════════════════════════════════════════════════════════════

@app.route("/api/notifications")
def get_notifications():
    """GET /api/notifications — all notifications."""
    return jsonify(dbl.get_all_notifications())


@app.route("/api/notifications/<int:notif_id>/read", methods=["PATCH"])
def mark_notification_read(notif_id):
    """PATCH /api/notifications/:id/read — mark a notification as read."""
    notif = dbl.mark_notification_read(notif_id)
    if not notif:
        abort(404, description=f"Notification {notif_id} not found")
    return jsonify(notif)


@app.route("/api/notifications/read-all", methods=["PATCH"])
def mark_all_notifications_read():
    """PATCH /api/notifications/read-all — mark all notifications as read."""
    dbl.mark_all_notifications_read()
    return jsonify({"success": True})


# ══════════════════════════════════════════════════════════════
# Static Reference Data (read-only, served from data/*.py)
# ══════════════════════════════════════════════════════════════

@app.route("/api/events")
def get_events():
    current_user = _auth_user()
    return jsonify(dbl.get_all_events_with_attendance(current_user["id"]))


@app.route("/api/events", methods=["POST"])
def create_event():
    """POST /api/events — create a new event."""
    body = request.get_json(silent=True) or {}
    if not body.get("name"):
        abort(400, description="name is required")
    current_user = _auth_user()
    event = dbl.create_event(current_user["id"], body)
    return jsonify(event), 201


@app.route("/api/events/<event_id>/attend", methods=["POST"])
def toggle_event_attend(event_id):
    """POST /api/events/:id/attend — toggle attendance."""
    current_user = _auth_user()
    src = "user" if str(event_id).startswith("u") else "static"
    result = dbl.toggle_event_attend(event_id, src, current_user["id"])
    return jsonify(result)


@app.route("/api/groups")
def get_groups():
    return jsonify(static_data.GROUPS)


@app.route("/api/groups/<int:group_id>")
def get_group(group_id):
    group = static_data.get_group_by_id(group_id)
    if not group:
        abort(404, description=f"Group {group_id} not found")
    return jsonify(group)


@app.route("/api/courses")
def get_courses():
    return jsonify(static_data.COURSES)


@app.route("/api/news")
def get_news():
    return jsonify(static_data.NEWS)


@app.route("/api/invitations")
def get_invitations():
    """Return pending invitations for the current user.
    Falls back to hardcoded seed data only for the demo account (id=1)."""
    user = _auth_user()
    if user and user.get("id") == 1:
        return jsonify(static_data.INVITATIONS)
    return jsonify([])


@app.route("/api/hashtags")
def get_hashtags():
    return jsonify(static_data.HASHTAGS)


# ══════════════════════════════════════════════════════════════
# Search Endpoint
# ══════════════════════════════════════════════════════════════

@app.route("/api/search")
def search():
    """GET /api/search?q=query — search across users, jobs, companies, posts."""
    q = (request.args.get("q") or "").strip()
    if not q:
        return jsonify({"users": [], "jobs": [], "companies": [], "posts": [], "query": ""})
    current = _auth_user()
    return jsonify(dbl.search(q, exclude_user_id=current["id"] if current else 1))


# ══════════════════════════════════════════════════════════════
# Profile Readiness Endpoint
# ══════════════════════════════════════════════════════════════

@app.route("/api/profile-readiness")
def get_profile_readiness():
    """GET /api/profile-readiness — compute profile completeness score."""
    u = _auth_user()
    if not u:
        abort(401, description="Authentication required")

    headline_len = len((u.get("headline") or "").strip())
    about_len    = len((u.get("about") or "").strip())
    skill_count  = len(u.get("skills") or [])
    exp_count    = len(u.get("experience") or [])
    edu_count    = len(u.get("education") or [])

    raw_sections = [
        ("photo",    "Photo",      100 if u.get("avatarColor") else 0),
        ("headline", "Headline",   min(100, int(headline_len / 60 * 100))),
        ("about",    "About",      min(100, int(about_len / 200 * 100))),
        ("exp",      "Experience", min(100, exp_count * 25)),
        ("edu",      "Education",  min(100, edu_count * 50)),
        ("skills",   "Skills",     min(100, int(skill_count / 10 * 100))),
    ]
    sections = [{"key": k, "label": l, "score": s} for k, l, s in raw_sections]
    score = round(sum(s for _, _, s in raw_sections) / len(raw_sections))

    def _status(section_score):
        if section_score >= 80:
            return "done"
        if section_score >= 40:
            return "warn"
        return "bad"

    fixes = [{"key": k, "label": l, "status": _status(s)} for k, l, s in raw_sections]
    return jsonify({"score": score, "sections": sections, "fixes": fixes})


# ══════════════════════════════════════════════════════════════
# Outreach — Story #1 (Outreach Message Guidance)  (NX.API.3)
# ══════════════════════════════════════════════════════════════

@app.route("/api/outreach/generate", methods=["POST"])
def outreach_generate():
    """POST /api/outreach/generate — personalised outreach draft."""
    body = request.get_json(silent=True) or {}

    raw_id = body.get("recipientId")
    if raw_id is None:
        abort(400, description="recipientId is required")
    if isinstance(raw_id, (float, bool)):
        abort(400, description="recipientId must be a positive integer")
    try:
        recipient_id = int(raw_id)
        if recipient_id <= 0:
            raise ValueError
    except (TypeError, ValueError):
        abort(400, description="recipientId must be a positive integer")

    recipient = dbl.get_user_by_id(recipient_id)
    if not recipient:
        abort(404, description=f"User {recipient_id} not found")

    tone = outreach_mod.sanitize_text(str(body.get("tone") or ""), 20).lower()
    if tone not in outreach_mod.VALID_TONES:
        tone = "professional"

    goal = outreach_mod.sanitize_text(str(body.get("goal") or ""), 20).lower()
    if goal not in outreach_mod.VALID_GOALS:
        goal = "networking"

    custom_note = outreach_mod.sanitize_text(
        body.get("custom_note") or "", outreach_mod.MAX_CUSTOM_NOTE
    )

    raw_details = body.get("details") or {}
    details = {k: outreach_mod.sanitize_text(str(v), 100) for k, v in raw_details.items() if isinstance(v, str) and k in {"recipient", "yourRole", "field", "company", "role", "context"}}
    context = {"tone": tone, "goal": goal, "custom_note": custom_note, "details": details}

    current_user = _auth_user()
    if not current_user:
        abort(401, description="Authentication required")
    result = outreach_mod.generate_outreach_message(
        current_user,
        recipient,
        context,
    )
    return jsonify(result), 200


# ══════════════════════════════════════════════════════════════
# Outreach — Story #7 (Outreach Readiness Check)  (NX.API.4)
# ══════════════════════════════════════════════════════════════

@app.route("/api/outreach/readiness")
def outreach_readiness():
    """GET /api/outreach/readiness?userId=<int> — profile readiness score."""
    raw_id = (request.args.get("userId") or "").strip()

    if raw_id:
        try:
            user_id = int(raw_id)
            if user_id <= 0:
                raise ValueError
        except (TypeError, ValueError):
            abort(400, description="userId must be a positive integer")

        user = dbl.get_user_by_id(user_id)
        if not user:
            abort(404, description=f"User {user_id} not found")
    else:
        user = _auth_user()
        if not user:
            abort(401, description="Authentication required")

    return jsonify(outreach_mod.compute_outreach_readiness(user)), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Nexus Backend on http://localhost:{port}")
    app.run(host="0.0.0.0", debug=False, port=port, threaded=True)
