"""
LinkedIn Redesign — Mock Flask Backend
CS485 Project

Run:
    pip install flask flask-cors
    python backend/app.py

API base: http://localhost:5000/api
"""

from flask import Flask, jsonify, request, abort, send_from_directory
from flask_cors import CORS
import sys
import os
import time
import copy

# Allow running from repo root: python backend/app.py
sys.path.insert(0, os.path.dirname(__file__))
import data as db

# Serve the project root (one level up from backend/) as static files
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

app = Flask(__name__, static_folder=ROOT_DIR, static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route('/')
def index():
    return send_from_directory(ROOT_DIR, 'app.html')

# ── In-memory mutable stores ──────────────────────────────────
# These are initialized lazily on first request so timestamps
# are relative to server start, not module import time.
_posts_store = None
_notifications_store = None
_conversations_store = None


def get_posts_store():
    global _posts_store
    if _posts_store is None:
        _posts_store = copy.deepcopy(db.get_posts())
    return _posts_store


def get_notifications_store():
    global _notifications_store
    if _notifications_store is None:
        _notifications_store = copy.deepcopy(db.NOTIFICATIONS)
    return _notifications_store


def get_conversations_store():
    global _conversations_store
    if _conversations_store is None:
        _conversations_store = copy.deepcopy(db.get_conversations())
    return _conversations_store


# ── Error handlers ────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": str(e)}), 404


@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": str(e)}), 400


# ── User Endpoints ────────────────────────────────────────────
@app.route("/api/me")
def get_me():
    """GET /api/me — current logged-in user profile."""
    return jsonify(db.CURRENT_USER)


@app.route("/api/users")
def get_users():
    """GET /api/users — all users in the network."""
    return jsonify(db.USERS)


@app.route("/api/users/<int:user_id>")
def get_user(user_id):
    """GET /api/users/:id — single user by ID."""
    user = db.get_user_by_id(user_id)
    if not user:
        abort(404, description=f"User {user_id} not found")
    return jsonify(user)


# ── Feed Endpoints ────────────────────────────────────────────
def _flatten_post(post):
    """Normalize a post object to the shape the React frontend expects."""
    author = post.get("author") or {}
    reactions = post.get("reactions") or {}
    comments_list = post.get("commentsList") or []
    # Flatten each comment's nested author to just a name string
    flat_comments = [
        {"author": c["author"]["name"] if isinstance(c.get("author"), dict) else str(c.get("author", "")),
         "text": c.get("text", "")}
        for c in comments_list
    ]
    return {
        "id": post.get("id"),
        "author": author.get("name", "Unknown"),
        "authorId": author.get("id"),
        "authorTitle": author.get("headline", ""),
        "content": post.get("content", ""),
        "image": post.get("image"),
        "createdAt": post.get("timestamp"),
        "likeCount": reactions.get("like", 0),
        "commentCount": post.get("comments", 0) if isinstance(post.get("comments"), int) else len(comments_list),
        "comments": flat_comments,
        "totalReactions": post.get("totalReactions", 0),
        "reposts": post.get("reposts", 0),
        "isLiked": post.get("isLiked", False),
        "isSaved": post.get("isSaved", False),
        "reactionType": post.get("reactionType"),
        "type": post.get("type", "text"),
        "tags": post.get("tags", []),
    }


@app.route("/api/feed")
def get_feed():
    """GET /api/feed — paginated posts feed."""
    return jsonify([_flatten_post(p) for p in get_posts_store()])


@app.route("/api/feed", methods=["POST"])
def create_post():
    """POST /api/feed — create a new post. Body: {content: str}"""
    body = request.get_json(silent=True)
    if not body or not body.get("content", "").strip():
        abort(400, description="content is required and must not be empty")

    new_post = {
        "id": int(time.time() * 1000),
        "author": db.CURRENT_USER,
        "content": body["content"].strip(),
        "timestamp": int(time.time() * 1000),
        "reactions": {"like": 0, "celebrate": 0, "love": 0, "insightful": 0, "support": 0, "funny": 0},
        "totalReactions": 0,
        "comments": 0,
        "commentsList": [],
        "reposts": 0,
        "isLiked": False,
        "isSaved": False,
        "reactionType": None,
        "type": "text",
        "tags": [],
    }
    get_posts_store().insert(0, new_post)
    return jsonify(_flatten_post(new_post)), 201


# ── Job Endpoints ─────────────────────────────────────────────
@app.route("/api/jobs")
def get_jobs():
    """GET /api/jobs — all job listings."""
    return jsonify(db.JOBS)


@app.route("/api/jobs/<int:job_id>")
def get_job(job_id):
    """GET /api/jobs/:id — single job listing."""
    job = db.get_job_by_id(job_id)
    if not job:
        abort(404, description=f"Job {job_id} not found")
    return jsonify(job)


# ── Company Endpoints ─────────────────────────────────────────
@app.route("/api/companies/<int:company_id>")
def get_company(company_id):
    """GET /api/companies/:id — company detail."""
    company = db.get_company_by_id(company_id)
    if not company:
        abort(404, description=f"Company {company_id} not found")
    return jsonify(company)


# ── Conversation Endpoints ────────────────────────────────────
@app.route("/api/conversations")
def get_conversations_list():
    """GET /api/conversations — all message threads (without full message history)."""
    convs = get_conversations_store()
    summaries = []
    for c in convs:
        p = c.get("participant") or {}
        summaries.append({
            "id": c["id"],
            "participantId": p.get("id"),
            "participantName": p.get("name", "Unknown"),
            "participantTitle": p.get("headline", ""),
            "isOnline": p.get("isOnline", False),
            "unreadCount": c.get("unreadCount", 0),
            "lastMessage": c.get("lastMessage", ""),
            "lastMessageTime": c.get("lastTimestamp"),
        })
    return jsonify(summaries)


@app.route("/api/conversations/<int:conv_id>")
def get_conversation(conv_id):
    """GET /api/conversations/:id — single conversation with full messages."""
    conv = db.get_conversation_by_id(conv_id, get_conversations_store())
    if not conv:
        abort(404, description=f"Conversation {conv_id} not found")
    p = conv.get("participant") or {}
    messages = []
    for m in (conv.get("messages") or []):
        messages.append({**m, "isMe": m.get("senderId") == 1})
    return jsonify({
        "id": conv["id"],
        "participantId": p.get("id"),
        "participantName": p.get("name", "Unknown"),
        "participantTitle": p.get("headline", ""),
        "isOnline": p.get("isOnline", False),
        "messages": messages,
    })


@app.route("/api/conversations/<int:conv_id>/messages", methods=["POST"])
def send_message(conv_id):
    """POST /api/conversations/:id/messages — send a message. Body: {text: str}"""
    convs = get_conversations_store()
    conv = db.get_conversation_by_id(conv_id, convs)
    if not conv:
        abort(404, description=f"Conversation {conv_id} not found")

    body = request.get_json(silent=True)
    if not body or not body.get("text", "").strip():
        abort(400, description="text is required")

    msg = {
        "id": int(time.time() * 1000),
        "senderId": 1,
        "isMe": True,
        "text": body["text"].strip(),
        "timestamp": int(time.time() * 1000),
        "isRead": True,
    }
    conv.setdefault("messages", []).append(msg)
    conv["lastMessage"] = msg["text"]
    conv["lastTimestamp"] = msg["timestamp"]
    return jsonify(msg), 201


# ── Notification Endpoints ────────────────────────────────────
@app.route("/api/notifications")
def get_notifications():
    """GET /api/notifications — all notifications."""
    return jsonify(get_notifications_store())


@app.route("/api/notifications/<int:notif_id>/read", methods=["PATCH"])
def mark_notification_read(notif_id):
    """PATCH /api/notifications/:id/read — mark a notification as read."""
    notifs = get_notifications_store()
    notif = next((n for n in notifs if n["id"] == notif_id), None)
    if not notif:
        abort(404, description=f"Notification {notif_id} not found")
    notif["isRead"] = True
    return jsonify(notif)


@app.route("/api/notifications/read-all", methods=["PATCH"])
def mark_all_notifications_read():
    """PATCH /api/notifications/read-all — mark all notifications as read."""
    for n in get_notifications_store():
        n["isRead"] = True
    return jsonify({"success": True})


# ── Events Endpoints ──────────────────────────────────────────
@app.route("/api/events")
def get_events():
    """GET /api/events — all events."""
    return jsonify(db.get_events())


# ── Groups Endpoints ──────────────────────────────────────────
@app.route("/api/groups")
def get_groups():
    """GET /api/groups — all groups."""
    return jsonify(db.GROUPS)


@app.route("/api/groups/<int:group_id>")
def get_group(group_id):
    """GET /api/groups/:id — single group detail."""
    group = db.get_group_by_id(group_id)
    if not group:
        abort(404, description=f"Group {group_id} not found")
    return jsonify(group)


# ── Courses Endpoints ─────────────────────────────────────────
@app.route("/api/courses")
def get_courses():
    """GET /api/courses — all courses."""
    return jsonify(db.COURSES)


# ── Misc Endpoints ────────────────────────────────────────────
@app.route("/api/news")
def get_news():
    """GET /api/news — trending news items."""
    return jsonify(db.NEWS)


@app.route("/api/invitations")
def get_invitations():
    """GET /api/invitations — pending connection invitations."""
    return jsonify(db.INVITATIONS)


@app.route("/api/hashtags")
def get_hashtags():
    """GET /api/hashtags — suggested hashtags."""
    return jsonify(db.HASHTAGS)


# ── Search Endpoint ───────────────────────────────────────────
@app.route("/api/search")
def search():
    """GET /api/search?q=query — search across users, jobs, and posts."""
    q = request.args.get("q", "").strip().lower()
    if not q:
        return jsonify({"users": [], "jobs": [], "posts": [], "query": ""})

    users = [
        u for u in db.USERS
        if q in u["name"].lower() or q in u.get("headline", "").lower()
    ]
    jobs = [
        j for j in db.JOBS
        if q in j.get("title", "").lower() or q in j.get("company", "").lower() or q in j.get("industry", "").lower()
    ]
    posts = [
        p for p in get_posts_store()
        if q in p.get("content", "").lower()
    ]

    return jsonify({
        "query": q,
        "users": users[:10],
        "jobs": jobs[:10],
        "posts": posts[:10],
    })


# ── Profile Readiness Endpoint ────────────────────────────────
@app.route("/api/profile-readiness")
def get_profile_readiness():
    """GET /api/profile-readiness — compute profile completeness score."""
    u = db.CURRENT_USER

    checks = [
        ("photo",       bool(u.get("avatarColor")),                    15, "Profile photo"),
        ("headline",    bool(u.get("headline", "").strip()),            15, "Headline"),
        ("about",       bool(u.get("about", "").strip()),               10, "About section"),
        ("experience",  len(u.get("experience", [])) >= 1,              20, "Work experience"),
        ("education",   len(u.get("education", [])) >= 1,               15, "Education"),
        ("skills",      len(u.get("skills", [])) >= 5,                  15, "Skills (5+ listed)"),
        ("connections", u.get("connections", 0) >= 50,                  10, "50+ connections"),
    ]

    score = 0
    breakdown = []
    for key, met, points, label in checks:
        if met:
            score += points
        breakdown.append({
            "key": key,
            "label": label,
            "points": points,
            "met": met,
            "status": "done" if met else ("warn" if points <= 15 else "bad"),
        })

    return jsonify({
        "score": score,
        "maxScore": 100,
        "breakdown": breakdown,
    })


if __name__ == "__main__":
    print("Starting LinkedIn Mock Backend on http://localhost:5000")
    print("App: http://localhost:5000/")
    print("API: http://localhost:5000/api/")
    app.run(debug=True, port=5000)
