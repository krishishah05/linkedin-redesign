"""
Nexus — Flask Backend  (backend/app.py)
CS485 Project — Spring 2026

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
    uid = dbl.get_session_user_id(token)
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


@app.errorhandler(502)
def bad_gateway(e):
    return jsonify({"error": str(e)}), 502


@app.errorhandler(503)
def service_unavailable(e):
    return jsonify({"error": str(e)}), 503




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
        abort(401, description="Not authenticated")
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


@app.route("/api/me/education", methods=["POST"])
def add_education():
    """POST /api/me/education — append an education entry to the current user."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True) or {}
    school = (body.get("school") or "").strip()
    if not school:
        abort(400, description="school is required")
    entry = {
        "school": school,
        "degree": (body.get("degree") or "").strip(),
        "field": (body.get("field") or "").strip(),
        "startDate": (body.get("startDate") or "").strip(),
        "endDate": (body.get("endDate") or "").strip(),
    }
    updated = dbl.add_education(user["id"], entry)
    if not updated:
        abort(404, description="User not found")
    return jsonify(updated)


@app.route("/api/me/skills", methods=["POST"])
def add_skill():
    """POST /api/me/skills — append a skill to the current user."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True) or {}
    skill = (body.get("skill") or "").strip()
    if not skill:
        abort(400, description="skill is required")
    updated = dbl.add_skill(user["id"], skill)
    if not updated:
        abort(404, description="User not found")
    return jsonify(updated)


@app.route("/api/groups", methods=["POST"])
def create_group():
    """POST /api/groups — create a new group (persisted in memory for the session)."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        abort(400, description="name is required")
    new_id = max((g["id"] for g in static_data.GROUPS), default=0) + 1
    new_group = {
        "id": new_id,
        "name": name,
        "privacy": body.get("privacy", "Public"),
        "members": 1,
        "posts": 0,
        "description": (body.get("description") or "").strip(),
        "coverGradient": "linear-gradient(135deg, #0F5DBD 0%, #0A4A9E 100%)",
        "isJoined": True,
        "category": (body.get("category") or "Technology").strip(),
        "unread": 0,
        "logo": "",
    }
    static_data.GROUPS.append(new_group)
    return jsonify(new_group), 201


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
    """POST /api/feed — create a new post. Body: {content: str, imageUrl?: str}"""
    body = request.get_json(silent=True) or {}
    content = (body.get("content") or "").strip()
    if not content:
        abort(400, description="content is required and must not be empty")

    image_url = (body.get("imageUrl") or "").strip() or None

    current_user = _auth_user()
    if not current_user:
        abort(401, description="Authentication required")

    post = dbl.create_post(current_user["id"], content)
    return jsonify(post), 201


@app.route("/api/feed/<int:post_id>", methods=["DELETE"])
def delete_post(post_id):
    """DELETE /api/feed/:id — delete a post (owner only)."""
    current_user = _auth_user()
    result = dbl.delete_post(post_id, current_user["id"])
    if result == "not_found":
        abort(404, description=f"Post {post_id} not found")
    if result == "forbidden":
        abort(403, description="You do not own this post")
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
    if not user:
        abort(401, description="Authentication required")
    return jsonify(dbl.get_conversations_for_user(user["id"]))


@app.route("/api/conversations/<int:conv_id>")
def get_conversation(conv_id):
    """GET /api/conversations/:id — single conversation with full messages."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    uid = user["id"]
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


# ══════════════════════════════════════════════════════════════
# AI Profile Improvement  (OpenRouter)
# ══════════════════════════════════════════════════════════════

@app.route("/api/profile/improve", methods=["POST"])
def profile_improve():
    """POST /api/profile/improve — ask an LLM for actionable profile tips."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")

    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        abort(503, description="AI service not configured — set OPENROUTER_API_KEY")

    # Build a concise profile summary for the prompt
    exp_lines = []
    for e in (user.get("experience") or [])[:4]:
        exp_lines.append(f"- {e.get('title','?')} at {e.get('company','?')} ({e.get('startDate','')}–{e.get('endDate','Present')})")

    edu_lines = []
    for e in (user.get("education") or [])[:3]:
        edu_lines.append(f"- {e.get('degree','?')} at {e.get('school','?')}")

    skills_sample = ", ".join(
        (s["name"] if isinstance(s, dict) else s)
        for s in (user.get("skills") or [])[:12]
    )

    cert_lines = [c.get("name", "") for c in (user.get("certifications") or [])[:4]]

    about_len = len(user.get("about") or "")
    headline = user.get("headline") or ""

    profile_text = f"""Name: {user.get('name', 'Unknown')}
Headline: {headline if headline else '(none)'}
Location: {user.get('location') or '(not set)'}
About section: {about_len} characters{'' if about_len == 0 else ' — present'}
Experience ({len(user.get('experience') or [])} entries):
{chr(10).join(exp_lines) or '  (none)'}
Education ({len(user.get('education') or [])} entries):
{chr(10).join(edu_lines) or '  (none)'}
Skills: {skills_sample or '(none)'}
Certifications: {', '.join(cert_lines) or '(none)'}
Open to Work: {user.get('openToWork', False)}"""

    system_prompt = (
        "You are a LinkedIn profile coach. Analyze the profile below and return "
        "EXACTLY 5 concise, actionable improvement tips as a JSON array of strings. "
        "Each tip should be one sentence and start with an action verb. "
        "Focus on gaps, weak sections, and LinkedIn best practices. "
        "Respond ONLY with valid JSON — no markdown, no explanation outside the array."
    )

    model = os.environ.get("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")

    try:
        import requests as req_lib
        resp = req_lib.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://linkedin-redesign-z364.onrender.com",
                "X-Title": "Nexus LinkedIn Redesign",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": profile_text},
                ],
                "max_tokens": 512,
                "temperature": 0.7,
            },
            timeout=20,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        # Strip markdown code fences if the model wrapped the JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        import json as _json
        tips = _json.loads(raw)
        if not isinstance(tips, list):
            raise ValueError("Expected a JSON array")
        tips = [str(t) for t in tips[:5]]
    except Exception as exc:
        abort(502, description=f"AI service error: {exc}")

    return jsonify({"tips": tips}), 200


# ══════════════════════════════════════════════════════════════
# Social State Endpoints
# ══════════════════════════════════════════════════════════════

@app.route("/api/me/social")
def get_social_state():  # pragma: no cover
    """GET /api/me/social — all social state for the current user."""
    user = _auth_user()
    return jsonify(dbl.get_social_state(user["id"]))


@app.route("/api/me/saved-jobs/<int:job_id>", methods=["POST"])
def toggle_saved_job(job_id):  # pragma: no cover
    """POST /api/me/saved-jobs/:id — toggle saved job."""
    user = _auth_user()
    return jsonify(dbl.toggle_saved_job(user["id"], job_id))


@app.route("/api/me/saved-jobs/<int:job_id>", methods=["PUT"])
def save_job(job_id):  # pragma: no cover
    """PUT /api/me/saved-jobs/:id — explicitly save a job (idempotent)."""
    user = _auth_user()
    return jsonify(dbl.save_job(user["id"], job_id))


@app.route("/api/me/saved-jobs/<int:job_id>", methods=["DELETE"])
def unsave_job(job_id):  # pragma: no cover
    """DELETE /api/me/saved-jobs/:id — explicitly unsave a job (idempotent)."""
    user = _auth_user()
    return jsonify(dbl.unsave_job(user["id"], job_id))


@app.route("/api/me/connections/<int:target_id>", methods=["POST"])
def connect_user(target_id):  # pragma: no cover
    """POST /api/me/connections/:id — send a connection request."""
    user = _auth_user()
    return jsonify(dbl.connect_user(user["id"], target_id))


@app.route("/api/me/connections/<int:target_id>/accept", methods=["POST"])
def accept_connection(target_id):  # pragma: no cover
    """POST /api/me/connections/:id/accept — confirm a connection."""
    user = _auth_user()
    return jsonify(dbl.accept_connection(user["id"], target_id))


@app.route("/api/me/following/<int:target_id>", methods=["POST"])
def toggle_following(target_id):  # pragma: no cover
    """POST /api/me/following/:id — toggle follow."""
    user = _auth_user()
    return jsonify(dbl.toggle_following(user["id"], target_id))


@app.route("/api/me/applied-jobs/<int:job_id>", methods=["POST"])
def apply_to_job(job_id):  # pragma: no cover
    """POST /api/me/applied-jobs/:id — mark a job as applied."""
    user = _auth_user()
    return jsonify(dbl.apply_to_job(user["id"], job_id))


@app.route("/api/me/groups/<int:group_id>/toggle", methods=["POST"])
def toggle_group(group_id):  # pragma: no cover
    """POST /api/me/groups/:id/toggle — join or leave a group."""
    user = _auth_user()
    return jsonify(dbl.toggle_group(user["id"], group_id))


@app.route("/api/me/invitations/dismiss", methods=["POST"])
def dismiss_invitation():  # pragma: no cover
    """POST /api/me/invitations/dismiss — dismiss an invitation. Body: {key: str}"""
    body = request.get_json(silent=True) or {}
    key = str(body.get("key") or "").strip()
    if not key:
        abort(400, description="key is required")
    user = _auth_user()
    return jsonify(dbl.dismiss_invitation(user["id"], key))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Nexus Backend on http://localhost:{port}")
    app.run(host="0.0.0.0", debug=False, port=port, threaded=True)
