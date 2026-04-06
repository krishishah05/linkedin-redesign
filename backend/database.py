"""
database.py — SQLite persistence layer for the Nexus backend.

Seeds from data/*.py on first init. All mutable data (posts, messages,
notifications) persists across restarts. Static reference data (jobs,
companies, users) is re-seeded each startup so seed changes are reflected.
"""

import sqlite3
import json
import time
import os
import hashlib
import secrets

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
_DB_PATH = os.path.join(os.path.dirname(__file__), "nexus.db")


def _connect():
    conn = sqlite3.connect(_DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=30000")  # 30s busy timeout at SQL level too
    return conn


# In-memory session store: token -> user_id
_sessions: dict = {}


def _ts():
    return int(time.time() * 1000)


# ---------------------------------------------------------------------------
# Schema + seed
# ---------------------------------------------------------------------------
def init_db():
    """Create tables and seed from data/*.py. Safe to call multiple times."""
    from data import users as users_data
    from data import posts as posts_data
    from data import jobs as jobs_data
    from data import companies as companies_data
    from data import conversations as convs_data
    from data import notifications as notifs_data

    conn = _connect()
    c = conn.cursor()

    # -- Users ----------------------------------------------------------------
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id      INTEGER PRIMARY KEY,
            name    TEXT NOT NULL,
            email   TEXT UNIQUE NOT NULL,
            pw_hash TEXT NOT NULL,
            data    TEXT NOT NULL   -- full JSON blob
        )
    """)

    # -- Posts ----------------------------------------------------------------
    c.execute("""
        CREATE TABLE IF NOT EXISTS posts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            author_id   INTEGER NOT NULL,
            content     TEXT NOT NULL,
            created_at  INTEGER NOT NULL,
            data        TEXT NOT NULL   -- full JSON blob (reactions, comments, etc.)
        )
    """)

    # -- Jobs -----------------------------------------------------------------
    c.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id   INTEGER PRIMARY KEY,
            data TEXT NOT NULL
        )
    """)

    # -- Companies ------------------------------------------------------------
    c.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id   INTEGER PRIMARY KEY,
            data TEXT NOT NULL
        )
    """)

    # -- Conversations --------------------------------------------------------
    c.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id   INTEGER PRIMARY KEY,
            data TEXT NOT NULL   -- metadata (participant, unreadCount, etc.)
        )
    """)

    # -- Messages -------------------------------------------------------------
    c.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL REFERENCES conversations(id),
            sender_id       INTEGER NOT NULL,
            text            TEXT NOT NULL,
            timestamp       INTEGER NOT NULL,
            is_read         INTEGER NOT NULL DEFAULT 0
        )
    """)

    # -- Notifications --------------------------------------------------------
    c.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id      INTEGER PRIMARY KEY,
            is_read INTEGER NOT NULL DEFAULT 0,
            data    TEXT NOT NULL
        )
    """)

    conn.commit()

    # ---- Seed users (always replace so data changes are reflected) ----------
    current = users_data.CURRENT_USER.copy()
    current.setdefault("email", "alex.johnson@gmail.com")
    _upsert_user(c, current["id"], current["name"], current["email"],
                 _hash_pw("password123"), current)

    for u in users_data.USERS:
        safe_name = u['name'].lower().replace(' ', '.').replace("'", '')
        email = f"{safe_name}@example.com"
        _upsert_user(c, u["id"], u["name"], email, _hash_pw("password123"), u)

    # ---- Seed jobs ----------------------------------------------------------
    c.execute("DELETE FROM jobs")
    for j in jobs_data.JOBS:
        c.execute("INSERT INTO jobs (id, data) VALUES (?, ?)",
                  (j["id"], json.dumps(j)))

    # ---- Seed companies -----------------------------------------------------
    c.execute("DELETE FROM companies")
    for co in companies_data.COMPANIES:
        c.execute("INSERT INTO companies (id, data) VALUES (?, ?)",
                  (co["id"], json.dumps(co)))

    # ---- Seed conversations (upsert metadata so ownerId stays current) ------
    c.execute("SELECT COUNT(*) FROM conversations")
    is_empty = c.fetchone()[0] == 0
    for conv in convs_data.get_conversations():
        meta = {k: v for k, v in conv.items() if k != "messages"}
        c.execute("""
            INSERT INTO conversations (id, data) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET data=excluded.data
        """, (conv["id"], json.dumps(meta)))
        if is_empty:
            for msg in conv.get("messages", []):
                c.execute("""
                    INSERT INTO messages
                        (conversation_id, sender_id, text, timestamp, is_read)
                    VALUES (?, ?, ?, ?, ?)
                """, (conv["id"], msg["senderId"],
                      msg["text"], msg["timestamp"],
                      1 if msg.get("isRead") else 0))

    # ---- Seed posts (only if empty) ----------------------------------------
    c.execute("SELECT COUNT(*) FROM posts")
    if c.fetchone()[0] == 0:
        for p in posts_data.get_posts():
            blob = {k: v for k, v in p.items()
                    if k not in ("id", "author_id", "content", "created_at")}
            c.execute("""
                INSERT INTO posts (id, author_id, content, created_at, data)
                VALUES (?, ?, ?, ?, ?)
            """, (p["id"], p["author"]["id"], p["content"],
                  p["timestamp"], json.dumps(blob)))

    # ---- Seed notifications (only if empty) ---------------------------------
    c.execute("SELECT COUNT(*) FROM notifications")
    if c.fetchone()[0] == 0:
        for n in notifs_data.NOTIFICATIONS:
            c.execute("""
                INSERT INTO notifications (id, is_read, data)
                VALUES (?, ?, ?)
            """, (n["id"], 1 if n.get("isRead") else 0, json.dumps(n)))

    # -- Sessions -------------------------------------------------------------
    c.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token   TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        )
    """)

    # -- Post likes (per-user) ------------------------------------------------
    c.execute("""
        CREATE TABLE IF NOT EXISTS post_likes (
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            PRIMARY KEY (post_id, user_id)
        )
    """)

    # -- User-created events --------------------------------------------------
    c.execute("""
        CREATE TABLE IF NOT EXISTS user_events (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            creator_id INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            data       TEXT NOT NULL
        )
    """)

    # -- Event attendance (covers both static and user-created events) --------
    c.execute("""
        CREATE TABLE IF NOT EXISTS event_attendance (
            event_id   INTEGER NOT NULL,
            event_src  TEXT NOT NULL DEFAULT 'static',
            user_id    INTEGER NOT NULL,
            PRIMARY KEY (event_id, event_src, user_id)
        )
    """)

    conn.commit()
    conn.close()


def _hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def _upsert_user(c, uid, name, email, pw_hash, data_dict):
    c.execute("""
        INSERT INTO users (id, name, email, pw_hash, data)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            email=excluded.email,
            data=excluded.data
    """, (uid, name, email, pw_hash, json.dumps(data_dict)))


# ---------------------------------------------------------------------------
# User functions
# ---------------------------------------------------------------------------
def verify_credentials(email: str, password: str):
    """Check email+password. Returns user dict on success, None on failure."""
    conn = _connect()
    row = conn.execute(
        "SELECT id, pw_hash, data FROM users WHERE email=?", (email.lower(),)
    ).fetchone()
    conn.close()
    if not row:
        return None
    if row["pw_hash"] != _hash_pw(password):
        return None
    return json.loads(row["data"])


def create_session(user_id: int) -> str:
    """Generate a session token for the user and persist it."""
    token = secrets.token_hex(32)
    _sessions[token] = user_id
    conn = _connect()
    conn.execute(
        "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
        (token, user_id, _ts()),
    )
    conn.commit()
    conn.close()
    return token


def get_session_user_id(token: str):
    """Look up user_id from a session token. Returns None if invalid."""
    if not token:
        return None
    # Fast in-memory lookup first
    if token in _sessions:
        return _sessions[token]
    # Fall back to DB (e.g. after server restart)
    conn = _connect()
    row = conn.execute(
        "SELECT user_id FROM sessions WHERE token=?", (token,)
    ).fetchone()
    conn.close()
    if row:
        _sessions[token] = row["user_id"]
        return row["user_id"]
    return None


def get_current_user(user_id: int = 1):
    """Return a user by id (defaults to id=1 for backward compat)."""
    return get_user_by_id(user_id)


def update_current_user(updates: dict, user_id: int = 1):
    """Update allowed fields on a user. Returns updated user dict."""
    conn = _connect()
    row = conn.execute("SELECT data FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        conn.close()
        return None
    data = json.loads(row["data"])
    field_map = {"name": "name", "headline": "headline", "location": "location",
                 "about": "about", "pronouns": "pronouns", "industry": "industry"}
    for key, val in updates.items():
        if key in field_map:
            data[field_map[key]] = val
    name_val = data.get("name", "")
    conn.execute("UPDATE users SET name=?, data=? WHERE id=?",
                 (name_val, json.dumps(data), user_id))
    conn.commit()
    conn.close()
    return data


def get_all_users(exclude_id: int = 1):
    conn = _connect()
    rows = conn.execute("SELECT data FROM users WHERE id != ?", (exclude_id,)).fetchall()
    conn.close()
    return [json.loads(r["data"]) for r in rows]


def get_user_by_id(user_id):
    conn = _connect()
    row = conn.execute("SELECT data FROM users WHERE id=?",
                       (int(user_id),)).fetchone()
    conn.close()
    return json.loads(row["data"]) if row else None


def create_user(name: str, email: str, password: str):
    """
    Create a new user. Raises ValueError if email already taken.
    Returns the new user dict.
    """
    conn = _connect()
    existing = conn.execute("SELECT id FROM users WHERE email=?",
                            (email.lower(),)).fetchone()
    if existing:
        conn.close()
        raise ValueError("email_taken")

    pw_hash = _hash_pw(password)
    # Let SQLite assign the id atomically via INTEGER PRIMARY KEY rowid alias
    c = conn.cursor()
    c.execute("""
        INSERT INTO users (name, email, pw_hash, data)
        VALUES (?, ?, ?, ?)
    """, (name, email.lower(), pw_hash, json.dumps({})))
    new_id = c.lastrowid
    user = {
        "id": new_id,
        "name": name,
        "email": email.lower(),
        "headline": "",
        "location": "",
        "connections": 0,
        "followers": 0,
        "avatarColor": "#0F5DBD",
        "isPremium": False,
        "openToWork": False,
        "about": "",
        "experience": [],
        "education": [],
        "skills": [],
    }
    c.execute("UPDATE users SET data=? WHERE id=?", (json.dumps(user), new_id))
    conn.commit()
    conn.close()
    return user


def delete_user(user_id: int):
    """
    Delete a user by id. Raises ValueError if trying to delete id=1.
    Returns True on success, False if user not found.
    """
    if int(user_id) == 1:
        raise ValueError("cannot_delete_primary_user")
    conn = _connect()
    row = conn.execute("SELECT id FROM users WHERE id=?",
                       (int(user_id),)).fetchone()
    if not row:
        conn.close()
        return False
    conn.execute("DELETE FROM users WHERE id=?", (int(user_id),))
    conn.commit()
    conn.close()
    return True


# ---------------------------------------------------------------------------
# Post functions
# ---------------------------------------------------------------------------
def get_all_posts():
    conn = _connect()
    rows = conn.execute(
        "SELECT id, author_id, content, created_at, data FROM posts ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        blob = json.loads(r["data"])
        reactions = blob.get("reactions", {})
        like_count = blob.get("totalReactions") or (sum(reactions.values()) if reactions else 0)
        comments_list = blob.get("commentsList", [])
        comment_count = blob.get("comments") if isinstance(blob.get("comments"), int) else len(comments_list)
        post = {
            "id": r["id"],
            "authorId": r["author_id"],
            "content": r["content"],
            "createdAt": r["created_at"],
            "timestamp": r["created_at"],
            "likeCount": like_count,
            "comments": comments_list,
            "commentCount": comment_count,
            **{k: v for k, v in blob.items() if k not in ("commentsList", "comments")},
        }
        result.append(post)
    return result


def create_post(author_id: int, content: str):
    """Create a new post. Returns the full post dict."""
    user = get_user_by_id(author_id)
    author_blob = {
        "id": user["id"],
        "name": user["name"],
        "headline": user.get("headline", ""),
        "avatarColor": user.get("avatarColor", "#0F5DBD"),
    }
    now = _ts()
    blob = {
        "author": author_blob,
        "reactions": {"like": 0, "celebrate": 0, "love": 0,
                      "support": 0, "insightful": 0, "funny": 0},
        "totalReactions": 0,
        "comments": 0,
        "reposts": 0,
        "isLiked": False,
        "isSaved": False,
        "reactionType": None,
        "type": "text",
        "tags": [],
        "commentsList": [],
    }
    conn = _connect()
    c = conn.cursor()
    c.execute("""
        INSERT INTO posts (author_id, content, created_at, data)
        VALUES (?, ?, ?, ?)
    """, (author_id, content, now, json.dumps(blob)))
    new_id = c.lastrowid
    conn.commit()
    conn.close()
    return {
        "id": new_id,
        "authorId": author_id,
        "content": content,
        "timestamp": now,
        "createdAt": now,
        "likeCount": 0,
        "comments": [],
        "commentCount": 0,
        **{k: v for k, v in blob.items() if k not in ("commentsList", "comments")},
    }


# ---------------------------------------------------------------------------
# Job functions
# ---------------------------------------------------------------------------
def get_all_jobs():
    conn = _connect()
    rows = conn.execute("SELECT data FROM jobs ORDER BY id").fetchall()
    conn.close()
    return [json.loads(r["data"]) for r in rows]


def get_job_by_id(job_id: int):
    conn = _connect()
    row = conn.execute("SELECT data FROM jobs WHERE id=?",
                       (int(job_id),)).fetchone()
    conn.close()
    return json.loads(row["data"]) if row else None


# ---------------------------------------------------------------------------
# Company functions
# ---------------------------------------------------------------------------
def get_company_by_id(company_id: int):
    conn = _connect()
    row = conn.execute("SELECT data FROM companies WHERE id=?",
                       (int(company_id),)).fetchone()
    conn.close()
    return json.loads(row["data"]) if row else None


# ---------------------------------------------------------------------------
# Conversation + message functions
# ---------------------------------------------------------------------------
def get_all_conversations():
    """Return conversation summaries (no messages list)."""
    conn = _connect()
    rows = conn.execute("SELECT id, data FROM conversations ORDER BY id").fetchall()
    conn.close()
    result = []
    for r in rows:
        meta = json.loads(r["data"])
        meta["id"] = r["id"]
        # Flatten participantName for easy frontend access
        if "participantName" not in meta:
            p = meta.get("participant")
            meta["participantName"] = p.get("name", "") if isinstance(p, dict) else ""
        result.append(meta)
    return result


def get_conversations_for_user(user_id: int):
    """Return conversation summaries where user is the owner or the participant."""
    conn = _connect()
    rows = conn.execute("SELECT id, data FROM conversations ORDER BY id").fetchall()
    conn.close()
    result = []
    for r in rows:
        meta = json.loads(r["data"])
        owner = int(meta.get("ownerId", 1))
        participant_id = int(meta.get("participantId") or meta.get("participant", {}).get("id", 0) or 0)
        if owner != int(user_id) and participant_id != int(user_id):
            continue
        meta["id"] = r["id"]
        # If the current user is the participant (not owner), flip perspective
        if owner != int(user_id) and participant_id == int(user_id):
            owner_user = get_user_by_id(owner)
            if owner_user:
                meta["participant"] = {
                    "id": owner_user["id"],
                    "name": owner_user.get("name", ""),
                    "headline": owner_user.get("headline", ""),
                    "avatarColor": owner_user.get("avatarColor", "#0F5DBD"),
                }
                meta["participantName"] = owner_user.get("name", "")
        if "participantName" not in meta:
            p = meta.get("participant")
            meta["participantName"] = p.get("name", "") if isinstance(p, dict) else ""
        result.append(meta)
    return result


def create_conversation(owner_id: int, participant: dict):
    """Create a new conversation between owner and participant. Returns summary."""
    now = _ts()
    meta = {
        "ownerId": owner_id,
        "participantId": participant["id"],
        "participant": {
            "id": participant["id"],
            "name": participant.get("name", ""),
            "headline": participant.get("headline", ""),
            "avatarColor": participant.get("avatarColor", "#0F5DBD"),
        },
        "participantName": participant.get("name", ""),
        "unreadCount": 0,
        "lastMessage": "",
        "lastTimestamp": now,
    }
    conn = _connect()
    c = conn.cursor()
    c.execute("INSERT INTO conversations (data) VALUES (?)", (json.dumps(meta),))
    new_id = c.lastrowid
    conn.commit()
    conn.close()
    meta["id"] = new_id
    meta["messages"] = []
    return meta


def get_conversation_by_id(conv_id: int):
    """Return full conversation including messages list."""
    conn = _connect()
    row = conn.execute("SELECT data FROM conversations WHERE id=?",
                       (int(conv_id),)).fetchone()
    if not row:
        conn.close()
        return None
    meta = json.loads(row["data"])
    meta["id"] = int(conv_id)

    msg_rows = conn.execute("""
        SELECT id, sender_id, text, timestamp, is_read
        FROM messages WHERE conversation_id=? ORDER BY timestamp ASC
    """, (int(conv_id),)).fetchall()
    conn.close()

    meta["messages"] = [
        {
            "id": m["id"],
            "senderId": m["sender_id"],
            "text": m["text"],
            "timestamp": m["timestamp"],
            "isRead": bool(m["is_read"]),
        }
        for m in msg_rows
    ]
    return meta


def send_message(conv_id: int, sender_id: int, text: str):
    """Append a message to a conversation. Returns the new message dict."""
    now = _ts()
    conn = _connect()

    # Verify conversation exists
    row = conn.execute("SELECT data FROM conversations WHERE id=?",
                       (int(conv_id),)).fetchone()
    if not row:
        conn.close()
        return None

    c = conn.cursor()
    c.execute("""
        INSERT INTO messages (conversation_id, sender_id, text, timestamp, is_read)
        VALUES (?, ?, ?, ?, 0)
    """, (int(conv_id), int(sender_id), text, now))
    new_id = c.lastrowid

    # Update conversation metadata (lastMessage, lastTimestamp)
    meta = json.loads(row["data"])
    meta["lastMessage"] = text
    meta["lastTimestamp"] = now
    c.execute("UPDATE conversations SET data=? WHERE id=?",
              (json.dumps(meta), int(conv_id)))

    conn.commit()
    conn.close()
    return {
        "id": new_id,
        "senderId": int(sender_id),
        "text": text,
        "timestamp": now,
        "isRead": False,
    }


# ---------------------------------------------------------------------------
# Notification functions
# ---------------------------------------------------------------------------
def get_all_notifications():
    conn = _connect()
    rows = conn.execute(
        "SELECT id, is_read, data FROM notifications ORDER BY id"
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        n = json.loads(r["data"])
        n["isRead"] = bool(r["is_read"])
        result.append(n)
    return result


def mark_notification_read(notif_id: int):
    conn = _connect()
    row = conn.execute("SELECT data FROM notifications WHERE id=?",
                       (int(notif_id),)).fetchone()
    if not row:
        conn.close()
        return None
    conn.execute("UPDATE notifications SET is_read=1 WHERE id=?",
                 (int(notif_id),))
    conn.commit()
    n = json.loads(row["data"])
    n["isRead"] = True
    conn.close()
    return n


def mark_all_notifications_read():
    conn = _connect()
    conn.execute("UPDATE notifications SET is_read=1")
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------
def search(q: str, exclude_user_id: int = 1):
    """Full-text search across users, jobs, companies, and posts."""
    q_lower = q.lower().strip()
    if not q_lower:
        return {"users": [], "jobs": [], "companies": [], "posts": [], "query": q}

    conn = _connect()

    # Users (search across ALL users — no exclusion, so queries like "alex" find the primary user too)
    user_rows = conn.execute("SELECT data FROM users").fetchall()
    users = [
        json.loads(r["data"]) for r in user_rows
        if q_lower in json.loads(r["data"]).get("name", "").lower()
        or q_lower in json.loads(r["data"]).get("headline", "").lower()
        or q_lower in json.loads(r["data"]).get("location", "").lower()
    ]

    # Jobs
    job_rows = conn.execute("SELECT data FROM jobs").fetchall()
    jobs = [
        json.loads(r["data"]) for r in job_rows
        if q_lower in json.loads(r["data"]).get("title", "").lower()
        or q_lower in json.loads(r["data"]).get("company", "").lower()
        or q_lower in json.loads(r["data"]).get("location", "").lower()
    ]

    # Companies
    co_rows = conn.execute("SELECT data FROM companies").fetchall()
    companies = [
        json.loads(r["data"]) for r in co_rows
        if q_lower in json.loads(r["data"]).get("name", "").lower()
        or q_lower in json.loads(r["data"]).get("industry", "").lower()
    ]

    # Posts
    post_rows = conn.execute(
        "SELECT id, author_id, content, created_at, data FROM posts"
    ).fetchall()
    posts = []
    for r in post_rows:
        if q_lower in r["content"].lower():
            blob = json.loads(r["data"])
            posts.append({"id": r["id"], "content": r["content"],
                          "timestamp": r["created_at"], **blob})

    conn.close()
    return {
        "users": users,
        "jobs": jobs,
        "companies": companies,
        "posts": posts,
        "query": q,
    }


# ---------------------------------------------------------------------------
# Post likes
# ---------------------------------------------------------------------------
def toggle_post_like(post_id: int, user_id: int):
    """Toggle a like on a post. Returns {liked: bool, likeCount: int}."""
    conn = _connect()
    c = conn.cursor()

    existing = c.execute(
        "SELECT 1 FROM post_likes WHERE post_id=? AND user_id=?",
        (int(post_id), int(user_id))
    ).fetchone()

    if existing:
        c.execute("DELETE FROM post_likes WHERE post_id=? AND user_id=?",
                  (int(post_id), int(user_id)))
        liked = False
    else:
        c.execute("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)",
                  (int(post_id), int(user_id)))
        liked = True

    count = c.execute(
        "SELECT COUNT(*) FROM post_likes WHERE post_id=?", (int(post_id),)
    ).fetchone()[0]

    conn.commit()
    conn.close()
    return {"liked": liked, "likeCount": count}


def add_post_comment(post_id: int, author_id: int, text: str):
    """Append a comment to a post's commentsList blob. Returns the new comment."""
    conn = _connect()
    c = conn.cursor()

    row = c.execute("SELECT data FROM posts WHERE id=?", (int(post_id),)).fetchone()
    if not row:
        conn.close()
        return None

    user_row = c.execute("SELECT data FROM users WHERE id=?", (int(author_id),)).fetchone()
    user = json.loads(user_row["data"]) if user_row else {}

    blob = json.loads(row["data"])
    comment = {
        "author": user.get("name", "User"),
        "authorHeadline": user.get("headline", ""),
        "text": text,
        "timestamp": "Just now",
        "likes": 0,
    }
    comments = blob.get("commentsList", [])
    comments.insert(0, comment)
    blob["commentsList"] = comments

    c.execute("UPDATE posts SET data=? WHERE id=?",
              (json.dumps(blob), int(post_id)))
    conn.commit()
    conn.close()
    return comment


def delete_post(post_id: int, user_id: int):
    """Delete a post if it belongs to user_id. Returns True if deleted."""
    conn = _connect()
    row = conn.execute("SELECT author_id FROM posts WHERE id=?", (int(post_id),)).fetchone()
    if not row or row["author_id"] != int(user_id):
        conn.close()
        return False
    conn.execute("DELETE FROM posts WHERE id=?", (int(post_id),))
    conn.commit()
    conn.close()
    return True


def get_post_likes_for_user(user_id: int):
    """Return set of post IDs liked by user."""
    conn = _connect()
    rows = conn.execute(
        "SELECT post_id FROM post_likes WHERE user_id=?", (int(user_id),)
    ).fetchall()
    conn.close()
    return {r["post_id"] for r in rows}


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------
def get_all_events_with_attendance(user_id: int):
    """Return static events + user-created events, each with isAttending flag."""
    from data.events import get_events as _get_static_events

    conn = _connect()

    # Attended event keys for this user
    attended = set()
    rows = conn.execute(
        "SELECT event_id, event_src FROM event_attendance WHERE user_id=?",
        (int(user_id),)
    ).fetchall()
    for r in rows:
        attended.add((r["event_id"], r["event_src"]))

    # Static events
    static_events = _get_static_events()
    result = []
    for e in static_events:
        ev = dict(e)
        ev["isAttending"] = (ev.get("id", 0), "static") in attended
        ev["source"] = "static"
        result.append(ev)

    # User-created events
    ue_rows = conn.execute(
        "SELECT id, creator_id, created_at, data FROM user_events ORDER BY created_at DESC"
    ).fetchall()
    for r in ue_rows:
        ev = json.loads(r["data"])
        ev["id"] = f"u{r['id']}"
        ev["creatorId"] = r["creator_id"]
        ev["isAttending"] = (r["id"], "user") in attended
        ev["source"] = "user"
        result.append(ev)

    conn.close()
    return result


def create_event(creator_id: int, data: dict):
    """Insert a user-created event. Returns the event dict with its new id."""
    now = _ts()
    conn = _connect()
    c = conn.cursor()
    c.execute(
        "INSERT INTO user_events (creator_id, created_at, data) VALUES (?, ?, ?)",
        (int(creator_id), now, json.dumps(data))
    )
    new_id = c.lastrowid
    conn.commit()
    conn.close()
    return {**data, "id": f"u{new_id}", "creatorId": creator_id, "source": "user", "isAttending": False}


def toggle_event_attend(event_id, event_src: str, user_id: int):
    """Toggle attendance for an event. Returns {attending: bool}."""
    raw_id = int(str(event_id).lstrip("u"))
    conn = _connect()
    c = conn.cursor()

    existing = c.execute(
        "SELECT 1 FROM event_attendance WHERE event_id=? AND event_src=? AND user_id=?",
        (raw_id, event_src, int(user_id))
    ).fetchone()

    if existing:
        c.execute(
            "DELETE FROM event_attendance WHERE event_id=? AND event_src=? AND user_id=?",
            (raw_id, event_src, int(user_id))
        )
        attending = False
    else:
        c.execute(
            "INSERT INTO event_attendance (event_id, event_src, user_id) VALUES (?, ?, ?)",
            (raw_id, event_src, int(user_id))
        )
        attending = True

    conn.commit()
    conn.close()
    return {"attending": attending}
