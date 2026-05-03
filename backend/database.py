"""
database.py — persistence layer for the Nexus backend.

Uses PostgreSQL when DATABASE_URL env var is set (Render production).
Falls back to SQLite for local development.

Seeds from data/*.py on first init. All mutable data persists across
restarts. Static reference data (jobs, companies, users) is re-seeded
each startup so seed changes are reflected.
"""

import json
import time
import os
import hashlib
import secrets

# ---------------------------------------------------------------------------
# DB mode detection
# ---------------------------------------------------------------------------
_DATABASE_URL = os.environ.get('DATABASE_URL', '')
_USE_PG       = bool(_DATABASE_URL)
_DB_PATH      = os.path.join(os.path.dirname(__file__), 'nexus.db')

if _USE_PG:  # pragma: no cover
    import psycopg2
    import psycopg2.extras
else:
    import sqlite3

# In-memory session cache: token -> user_id
_sessions: dict = {}

# Serial primary key syntax differs between the two engines
_PK_SERIAL = 'BIGSERIAL PRIMARY KEY' if _USE_PG else 'INTEGER PRIMARY KEY AUTOINCREMENT'
_PK_INT    = 'INTEGER PRIMARY KEY'   # for tables with caller-supplied IDs


# ---------------------------------------------------------------------------
# Connection + query helpers
# ---------------------------------------------------------------------------

def _connect():
    if _USE_PG:  # pragma: no cover
        return psycopg2.connect(_DATABASE_URL)
    conn = sqlite3.connect(_DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def _execute(conn, sql, params=()):
    """
    Run a query and return the cursor.
    Handles placeholder differences (%s vs ?) automatically.
    """
    if _USE_PG:  # pragma: no cover
        c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        c.execute(sql, params or ())
        return c
    sql = sql.replace('%s', '?')
    return conn.execute(sql, params or ())


def _insert_id(conn, sql, params=()):
    """
    Run an INSERT and return the new row's id.
    PostgreSQL: appends RETURNING id.
    SQLite:     uses cursor.lastrowid.
    sql must NOT already contain RETURNING.
    """
    if _USE_PG:  # pragma: no cover
        c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        c.execute(sql + ' RETURNING id', params or ())
        row = c.fetchone()
        return int(row['id']) if row else None
    sql = sql.replace('%s', '?')
    c = conn.cursor()
    c.execute(sql, params or ())
    return c.lastrowid


def _ts():
    return int(time.time() * 1000)


def _hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Schema + seed
# ---------------------------------------------------------------------------

def _pg_reset_sequence(conn, table: str) -> None:  # pragma: no cover
    """
    Advance the PostgreSQL BIGSERIAL sequence for `table`.id past its current
    maximum row id.  Handles three edge-cases that silently break the naive
    pg_get_serial_sequence approach:

      1. pg_get_serial_sequence returns NULL  — the column was created without
         BIGSERIAL on an older deploy.  We find the sequence via pg_class and
         attach it, then reset.
      2. The table is empty (MAX(id) = NULL) — we floor at 1 so the sequence
         stays valid.
      3. Unfetched cursor results — we always call fetchone() so psycopg2
         never leaves the connection with pending server-side results before
         commit().
    """
    c = conn.cursor()

    # Step 1 — try the fast path via pg_get_serial_sequence
    c.execute("SELECT pg_get_serial_sequence(%s, 'id')", (table,))
    row = c.fetchone()
    seq = row[0] if row else None
    c.close()

    # Step 2 — fallback: find sequence by naming convention or pg_class
    if not seq:
        c = conn.cursor()
        c.execute("""
            SELECT s.relname
            FROM   pg_class s
            JOIN   pg_depend d ON d.objid = s.oid
            JOIN   pg_class t ON t.oid   = d.refobjid
            JOIN   pg_attribute a ON a.attrelid = t.oid
                                 AND a.attnum   = d.refobjsubid
            WHERE  s.relkind = 'S'
            AND    t.relname = %s
            AND    a.attname = 'id'
            LIMIT  1
        """, (table,))
        row = c.fetchone()
        seq = row[0] if row else None
        c.close()

    if not seq:
        # No sequence exists — create one and attach it so INSERTs work.
        seq = f"{table}_id_seq"
        c = conn.cursor()
        c.execute(f"CREATE SEQUENCE IF NOT EXISTS {seq}")
        c.execute(
            f"SELECT setval('{seq}', GREATEST((SELECT COALESCE(MAX(id), 0) FROM {table}), 1))"
        )
        c.fetchone()
        c.execute(f"ALTER TABLE {table} ALTER COLUMN id SET DEFAULT nextval('{seq}')")
        c.execute(f"ALTER SEQUENCE {seq} OWNED BY {table}.id")
        c.close()
        return

    # Step 3 — advance the sequence to MAX(id), floor 1, and consume result
    c = conn.cursor()
    c.execute(
        f"SELECT setval(%s, GREATEST((SELECT COALESCE(MAX(id), 0) FROM {table}), 1))",
        (seq,)
    )
    c.fetchone()   # must consume so psycopg2 doesn't leave pending results
    c.close()


def init_db():  # pragma: no cover
    """Create tables and seed from data/*.py. Safe to call multiple times."""
    from data import users as users_data
    from data import posts as posts_data
    from data import jobs as jobs_data
    from data import companies as companies_data
    from data import conversations as convs_data
    from data import notifications as notifs_data

    conn = _connect()

    # -- Users ----------------------------------------------------------------
    _execute(conn, f"""
        CREATE TABLE IF NOT EXISTS users (
            id      {_PK_SERIAL},
            name    TEXT NOT NULL,
            email   TEXT UNIQUE NOT NULL,
            pw_hash TEXT NOT NULL,
            data    TEXT NOT NULL
        )
    """)

    # -- Posts ----------------------------------------------------------------
    _execute(conn, f"""
        CREATE TABLE IF NOT EXISTS posts (
            id          {_PK_SERIAL},
            author_id   INTEGER NOT NULL,
            content     TEXT NOT NULL,
            created_at  BIGINT NOT NULL,
            data        TEXT NOT NULL
        )
    """)

    # -- Jobs -----------------------------------------------------------------
    _execute(conn, f"""
        CREATE TABLE IF NOT EXISTS jobs (
            id   {_PK_INT},
            data TEXT NOT NULL
        )
    """)

    # -- Companies ------------------------------------------------------------
    _execute(conn, f"""
        CREATE TABLE IF NOT EXISTS companies (
            id   {_PK_INT},
            data TEXT NOT NULL
        )
    """)

    # -- Conversations --------------------------------------------------------
    _execute(conn, f"""
        CREATE TABLE IF NOT EXISTS conversations (
            id   {_PK_SERIAL},
            data TEXT NOT NULL
        )
    """)

    # -- Messages -------------------------------------------------------------
    _execute(conn, f"""
        CREATE TABLE IF NOT EXISTS messages (
            id              {_PK_SERIAL},
            conversation_id INTEGER NOT NULL,
            sender_id       INTEGER NOT NULL,
            text            TEXT NOT NULL,
            timestamp       BIGINT NOT NULL,
            is_read         INTEGER NOT NULL DEFAULT 0
        )
    """)

    # -- Notifications --------------------------------------------------------
    _execute(conn, f"""
        CREATE TABLE IF NOT EXISTS notifications (
            id      {_PK_INT},
            is_read INTEGER NOT NULL DEFAULT 0,
            data    TEXT NOT NULL
        )
    """)

    # -- Sessions -------------------------------------------------------------
    _execute(conn, f"""
        CREATE TABLE IF NOT EXISTS sessions (
            token      TEXT PRIMARY KEY,
            user_id    INTEGER NOT NULL,
            created_at BIGINT NOT NULL
        )
    """)

    # -- Post likes -----------------------------------------------------------
    _execute(conn, """
        CREATE TABLE IF NOT EXISTS post_likes (
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            PRIMARY KEY (post_id, user_id)
        )
    """)

    # -- User-created events --------------------------------------------------
    _execute(conn, f"""
        CREATE TABLE IF NOT EXISTS user_events (
            id         {_PK_SERIAL},
            creator_id INTEGER NOT NULL,
            created_at BIGINT NOT NULL,
            data       TEXT NOT NULL
        )
    """)

    # -- Event attendance -----------------------------------------------------
    _execute(conn, """
        CREATE TABLE IF NOT EXISTS event_attendance (
            event_id  INTEGER NOT NULL,
            event_src TEXT NOT NULL DEFAULT 'static',
            user_id   INTEGER NOT NULL,
            PRIMARY KEY (event_id, event_src, user_id)
        )
    """)
    _execute(conn, """
        CREATE TABLE IF NOT EXISTS event_interest (
            event_id  INTEGER NOT NULL,
            event_src TEXT NOT NULL DEFAULT 'static',
            user_id   INTEGER NOT NULL,
            PRIMARY KEY (event_id, event_src, user_id)
        )
    """)

    # -- Social state tables --------------------------------------------------
    _execute(conn, """
        CREATE TABLE IF NOT EXISTS user_saved_jobs (
            user_id INTEGER NOT NULL,
            job_id  INTEGER NOT NULL,
            PRIMARY KEY (user_id, job_id)
        )
    """)
    _execute(conn, """
        CREATE TABLE IF NOT EXISTS user_connections (
            user_id           INTEGER NOT NULL,
            connected_user_id INTEGER NOT NULL,
            PRIMARY KEY (user_id, connected_user_id)
        )
    """)
    _execute(conn, """
        CREATE TABLE IF NOT EXISTS user_pending_connections (
            user_id        INTEGER NOT NULL,
            target_user_id INTEGER NOT NULL,
            PRIMARY KEY (user_id, target_user_id)
        )
    """)
    _execute(conn, """
        CREATE TABLE IF NOT EXISTS user_following (
            user_id          INTEGER NOT NULL,
            followed_user_id INTEGER NOT NULL,
            PRIMARY KEY (user_id, followed_user_id)
        )
    """)
    _execute(conn, """
        CREATE TABLE IF NOT EXISTS user_applied_jobs (
            user_id INTEGER NOT NULL,
            job_id  INTEGER NOT NULL,
            PRIMARY KEY (user_id, job_id)
        )
    """)
    _execute(conn, """
        CREATE TABLE IF NOT EXISTS user_joined_groups (
            user_id  INTEGER NOT NULL,
            group_id INTEGER NOT NULL,
            PRIMARY KEY (user_id, group_id)
        )
    """)
    _execute(conn, """
        CREATE TABLE IF NOT EXISTS user_dismissed_invitations (
            user_id        INTEGER NOT NULL,
            invitation_key TEXT    NOT NULL,
            PRIMARY KEY (user_id, invitation_key)
        )
    """)

    # -- Conference stories ---------------------------------------------------
    _execute(conn, f"""
        CREATE TABLE IF NOT EXISTS conference_stories (
            id         {_PK_SERIAL},
            author_id  INTEGER NOT NULL,
            created_at BIGINT NOT NULL,
            data       TEXT NOT NULL
        )
    """)

    conn.commit()

    # ---- Seed users (always upsert so seed changes are reflected) -----------
    current = users_data.CURRENT_USER.copy()
    current.setdefault("email", "alex.johnson@gmail.com")
    _upsert_user(conn, current["id"], current["name"], current["email"],
                 _hash_pw("password123"), current)

    for u in users_data.USERS:
        safe_name = u['name'].lower().replace(' ', '.').replace("'", '')
        email = f"{safe_name}@example.com"
        _upsert_user(conn, u["id"], u["name"], email, _hash_pw("password123"), u)

    # ---- Seed jobs ----------------------------------------------------------
    _execute(conn, "DELETE FROM jobs")
    for j in jobs_data.JOBS:
        _execute(conn,
                 "INSERT INTO jobs (id, data) VALUES (%s, %s)",
                 (j["id"], json.dumps(j)))

    # ---- Seed companies -----------------------------------------------------
    _execute(conn, "DELETE FROM companies")
    for co in companies_data.COMPANIES:
        _execute(conn,
                 "INSERT INTO companies (id, data) VALUES (%s, %s)",
                 (co["id"], json.dumps(co)))

    # ---- Seed conversations (upsert metadata, seed messages only if empty) --
    row = _execute(conn, "SELECT COUNT(*) AS cnt FROM conversations").fetchone()
    is_empty = (row['cnt'] if _USE_PG else row[0]) == 0
    for conv in convs_data.get_conversations():
        meta = {k: v for k, v in conv.items() if k != "messages"}
        _execute(conn, """
            INSERT INTO conversations (id, data) VALUES (%s, %s)
            ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data
        """, (conv["id"], json.dumps(meta)))
        if is_empty:
            for msg in conv.get("messages", []):
                _execute(conn, """
                    INSERT INTO messages
                        (conversation_id, sender_id, text, timestamp, is_read)
                    VALUES (%s, %s, %s, %s, %s)
                """, (conv["id"], msg["senderId"], msg["text"],
                      msg["timestamp"], 1 if msg.get("isRead") else 0))

    # ---- Seed posts (only if empty) ----------------------------------------
    row = _execute(conn, "SELECT COUNT(*) AS cnt FROM posts").fetchone()
    if (row['cnt'] if _USE_PG else row[0]) == 0:
        for p in posts_data.get_posts():
            blob = {k: v for k, v in p.items()
                    if k not in ("id", "author_id", "content", "created_at")}
            _execute(conn, """
                INSERT INTO posts (id, author_id, content, created_at, data)
                VALUES (%s, %s, %s, %s, %s)
            """, (p["id"], p["author"]["id"], p["content"],
                  p["timestamp"], json.dumps(blob)))

    # ---- Seed notifications (only if empty) ---------------------------------
    row = _execute(conn, "SELECT COUNT(*) AS cnt FROM notifications").fetchone()
    if (row['cnt'] if _USE_PG else row[0]) == 0:
        for n in notifs_data.NOTIFICATIONS:
            _execute(conn, """
                INSERT INTO notifications (id, is_read, data)
                VALUES (%s, %s, %s)
            """, (n["id"], 1 if n.get("isRead") else 0, json.dumps(n)))

    # ---- Seed default joined groups for demo user (id=1) -------------------
    for gid in (1, 2, 4):
        _execute(conn, """
            INSERT INTO user_joined_groups (user_id, group_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
        """, (1, gid))

    # ---- Reset PG sequences after explicit-ID seed inserts -----------------
    if _USE_PG:
        for _tbl in ('users', 'posts', 'conversations'):
            _pg_reset_sequence(conn, _tbl)

    conn.commit()
    conn.close()


def _upsert_user(conn, uid, name, email, pw_hash, data_dict):  # pragma: no cover
    _execute(conn, """
        INSERT INTO users (id, name, email, pw_hash, data)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT(id) DO UPDATE SET
            name=EXCLUDED.name,
            email=EXCLUDED.email,
            data=EXCLUDED.data
    """, (uid, name, email, pw_hash, json.dumps(data_dict)))


# ---------------------------------------------------------------------------
# Auth / session functions
# ---------------------------------------------------------------------------

def verify_credentials(email: str, password: str):
    """Check email+password. Returns user dict on success, None on failure."""
    conn = _connect()
    row = _execute(conn,
        "SELECT id, pw_hash, data FROM users WHERE email=%s",
        (email.lower(),)
    ).fetchone()
    conn.close()
    if not row:
        return None
    if row["pw_hash"] != _hash_pw(password):
        return None
    data = json.loads(row["data"])
    data.setdefault("isRecruiter", False)
    return data


def change_password(user_id: int, current_password: str, new_password: str):
    """Verify current password then update to new_password. Returns True on success, False if current wrong."""
    conn = _connect()
    row = _execute(conn, "SELECT pw_hash FROM users WHERE id=%s", (user_id,)).fetchone()
    if not row or row["pw_hash"] != _hash_pw(current_password):
        conn.close()
        return False
    _execute(conn, "UPDATE users SET pw_hash=%s WHERE id=%s", (_hash_pw(new_password), user_id))
    _execute(conn, "DELETE FROM sessions WHERE user_id=%s", (int(user_id),))
    conn.commit()
    conn.close()
    stale = [t for t, uid in _sessions.items() if uid == int(user_id)]
    for t in stale:
        _sessions.pop(t, None)
    return True


def invalidate_session(token: str) -> None:
    """Remove a session token from both the in-memory cache and the DB."""
    _sessions.pop(token, None)
    conn = _connect()
    _execute(conn, "DELETE FROM sessions WHERE token=%s", (token,))
    conn.commit()
    conn.close()


def create_session(user_id: int) -> str:
    """Generate a session token for the user and persist it."""
    token = secrets.token_hex(32)
    _sessions[token] = user_id
    conn = _connect()
    _execute(conn,
        "INSERT INTO sessions (token, user_id, created_at) VALUES (%s, %s, %s)",
        (token, user_id, _ts()))
    conn.commit()
    conn.close()
    return token


def get_session_user_id(token: str):
    """Look up user_id from a session token. Returns None if invalid."""
    if not token:
        return None
    if token in _sessions:
        return _sessions[token]
    conn = _connect()
    row = _execute(conn,
        "SELECT user_id FROM sessions WHERE token=%s", (token,)
    ).fetchone()
    conn.close()
    if row:
        _sessions[token] = row["user_id"]
        return row["user_id"]
    return None


# ---------------------------------------------------------------------------
# User functions
# ---------------------------------------------------------------------------

def get_current_user(user_id: int = 1):
    return get_user_by_id(user_id)


def get_user_by_id(user_id):
    conn = _connect()
    row = _execute(conn,
        "SELECT data FROM users WHERE id=%s", (int(user_id),)
    ).fetchone()
    conn.close()
    if not row:
        return None
    data = json.loads(row["data"])
    # Backwards-compat: accounts created before the isRecruiter field was added
    # won't have it in their stored JSON. Default to False so frontend guards work.
    data.setdefault("isRecruiter", False)
    return data


def get_all_users(exclude_id: int = 1):
    conn = _connect()
    rows = _execute(conn,
        "SELECT data FROM users WHERE id != %s", (exclude_id,)
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = json.loads(r["data"])
        d.setdefault("isRecruiter", False)
        result.append(d)
    return result


def update_current_user(updates: dict, user_id: int = 1):
    """Update allowed fields on a user. Returns updated user dict."""
    conn = _connect()
    row = _execute(conn,
        "SELECT data FROM users WHERE id=%s", (user_id,)
    ).fetchone()
    if not row:
        conn.close()
        return None
    data = json.loads(row["data"])
    field_map = {"name": "name", "headline": "headline", "location": "location",
                 "about": "about", "pronouns": "pronouns", "industry": "industry",
                 "photo": "photo"}
    for key, val in updates.items():
        if key in field_map:
            data[field_map[key]] = val
    _execute(conn,
        "UPDATE users SET name=%s, data=%s WHERE id=%s",
        (data.get("name", ""), json.dumps(data), user_id))
    conn.commit()
    conn.close()
    return data


def add_education(user_id: int, entry: dict):
    """Append an education entry to a user's data. Returns updated user dict."""
    conn = _connect()
    try:
        if _USE_PG:  # pragma: no cover
            row = _execute(conn, "SELECT data FROM users WHERE id=%s FOR UPDATE", (user_id,)).fetchone()
        else:
            conn.execute("BEGIN EXCLUSIVE")
            row = _execute(conn, "SELECT data FROM users WHERE id=%s", (user_id,)).fetchone()
        if not row:
            conn.close()
            return None
        data = json.loads(row["data"])
        edu_list = data.get("education", [])
        entry["id"] = max((e.get("id", 0) for e in edu_list), default=0) + 1
        edu_list.append(entry)
        data["education"] = edu_list
        _execute(conn, "UPDATE users SET data=%s WHERE id=%s", (json.dumps(data), user_id))
        conn.commit()
    except Exception:
        conn.rollback()
        conn.close()
        raise
    conn.close()
    return data


def add_experience(user_id: int, entry: dict):
    """Append a work experience entry to a user's data. Returns updated user dict."""
    conn = _connect()
    try:
        if _USE_PG:  # pragma: no cover
            row = _execute(conn, "SELECT data FROM users WHERE id=%s FOR UPDATE", (user_id,)).fetchone()
        else:
            conn.execute("BEGIN EXCLUSIVE")
            row = _execute(conn, "SELECT data FROM users WHERE id=%s", (user_id,)).fetchone()
        if not row:
            conn.close()
            return None
        data = json.loads(row["data"])
        exp_list = data.get("experience", [])
        entry["id"] = max((e.get("id", 0) for e in exp_list), default=0) + 1
        exp_list.insert(0, entry)
        data["experience"] = exp_list
        _execute(conn, "UPDATE users SET data=%s WHERE id=%s", (json.dumps(data), user_id))
        conn.commit()
    except Exception:
        conn.rollback()
        conn.close()
        raise
    conn.close()
    return data


def _delete_list_item(user_id: int, field: str, index: int):
    """Generic helper: remove item at index from a list field in user's JSON blob."""
    conn = _connect()
    try:
        if _USE_PG:  # pragma: no cover
            row = _execute(conn, "SELECT data FROM users WHERE id=%s FOR UPDATE", (user_id,)).fetchone()
        else:
            conn.execute("BEGIN EXCLUSIVE")
            row = _execute(conn, "SELECT data FROM users WHERE id=%s", (user_id,)).fetchone()
        if not row:
            conn.close()
            return None
        data = json.loads(row["data"])
        lst = data.get(field, [])
        if not (0 <= index < len(lst)):
            conn.close()
            return False
        lst.pop(index)
        data[field] = lst
        _execute(conn, "UPDATE users SET data=%s WHERE id=%s", (json.dumps(data), user_id))
        conn.commit()
    except Exception:
        conn.rollback()
        conn.close()
        raise
    conn.close()
    return data


def _update_list_item(user_id: int, field: str, index: int, entry: dict):
    """Generic helper: merge entry into item at index in a list field in user's JSON blob."""
    conn = _connect()
    try:
        if _USE_PG:  # pragma: no cover
            row = _execute(conn, "SELECT data FROM users WHERE id=%s FOR UPDATE", (user_id,)).fetchone()
        else:
            conn.execute("BEGIN EXCLUSIVE")
            row = _execute(conn, "SELECT data FROM users WHERE id=%s", (user_id,)).fetchone()
        if not row:
            conn.close()
            return None
        data = json.loads(row["data"])
        lst = data.get(field, [])
        if not (0 <= index < len(lst)):
            conn.close()
            return False
        lst[index] = {**lst[index], **entry}
        data[field] = lst
        _execute(conn, "UPDATE users SET data=%s WHERE id=%s", (json.dumps(data), user_id))
        conn.commit()
    except Exception:
        conn.rollback()
        conn.close()
        raise
    conn.close()
    return data


def update_experience(user_id: int, index: int, entry: dict):
    return _update_list_item(user_id, "experience", index, entry)


def update_education(user_id: int, index: int, entry: dict):
    return _update_list_item(user_id, "education", index, entry)


def update_project(user_id: int, index: int, entry: dict):
    return _update_list_item(user_id, "projects", index, entry)


def update_volunteering(user_id: int, index: int, entry: dict):
    return _update_list_item(user_id, "volunteering", index, entry)


def update_honor(user_id: int, index: int, entry: dict):
    return _update_list_item(user_id, "honors", index, entry)


def delete_experience(user_id: int, index: int):
    return _delete_list_item(user_id, "experience", index)


def delete_education(user_id: int, index: int):
    return _delete_list_item(user_id, "education", index)


def delete_project(user_id: int, index: int):
    return _delete_list_item(user_id, "projects", index)


def delete_volunteering(user_id: int, index: int):
    return _delete_list_item(user_id, "volunteering", index)


def delete_honor(user_id: int, index: int):
    return _delete_list_item(user_id, "honors", index)


def delete_skill(user_id: int, index: int):
    return _delete_list_item(user_id, "skills", index)


def add_project(user_id: int, entry: dict):
    """Append a project entry to a user's data. Returns updated user dict."""
    conn = _connect()
    row = _execute(conn, "SELECT data FROM users WHERE id=%s", (user_id,)).fetchone()
    if not row:
        conn.close()
        return None
    data = json.loads(row["data"])
    proj_list = data.get("projects", [])
    entry["id"] = max((e.get("id", 0) for e in proj_list), default=0) + 1
    proj_list.insert(0, entry)
    data["projects"] = proj_list
    _execute(conn, "UPDATE users SET data=%s WHERE id=%s", (json.dumps(data), user_id))
    conn.commit()
    conn.close()
    return data


def add_volunteering(user_id: int, entry: dict):
    """Append a volunteering entry to a user's data. Returns updated user dict."""
    conn = _connect()
    row = _execute(conn, "SELECT data FROM users WHERE id=%s", (user_id,)).fetchone()
    if not row:
        conn.close()
        return None
    data = json.loads(row["data"])
    vol_list = data.get("volunteering", [])
    entry["id"] = max((e.get("id", 0) for e in vol_list), default=0) + 1
    vol_list.insert(0, entry)
    data["volunteering"] = vol_list
    _execute(conn, "UPDATE users SET data=%s WHERE id=%s", (json.dumps(data), user_id))
    conn.commit()
    conn.close()
    return data


def add_honor(user_id: int, entry: dict):
    """Append a honor/award entry to a user's data. Returns updated user dict."""
    conn = _connect()
    row = _execute(conn, "SELECT data FROM users WHERE id=%s", (user_id,)).fetchone()
    if not row:
        conn.close()
        return None
    data = json.loads(row["data"])
    hon_list = data.get("honors", [])
    entry["id"] = max((e.get("id", 0) for e in hon_list), default=0) + 1
    hon_list.insert(0, entry)
    data["honors"] = hon_list
    _execute(conn, "UPDATE users SET data=%s WHERE id=%s", (json.dumps(data), user_id))
    conn.commit()
    conn.close()
    return data


def add_skill(user_id: int, skill: str):
    """Append a skill string to a user's skills list (no duplicates). Returns updated user dict."""
    conn = _connect()
    try:
        if _USE_PG:  # pragma: no cover
            row = _execute(conn, "SELECT data FROM users WHERE id=%s FOR UPDATE", (user_id,)).fetchone()
        else:
            conn.execute("BEGIN EXCLUSIVE")
            row = _execute(conn, "SELECT data FROM users WHERE id=%s", (user_id,)).fetchone()
        if not row:
            conn.close()
            return None
        data = json.loads(row["data"])
        skills = data.get("skills", [])
        skill_names = [s if isinstance(s, str) else s.get("name", "") for s in skills]
        if skill not in skill_names:
            skills.append(skill)
        data["skills"] = skills
        _execute(conn, "UPDATE users SET data=%s WHERE id=%s", (json.dumps(data), user_id))
        conn.commit()
    except Exception:
        conn.rollback()
        conn.close()
        raise
    conn.close()
    return data


def create_user(name: str, email: str, password: str, is_recruiter: bool = False):
    """Create a new user. Raises ValueError if email already taken."""
    conn = _connect()
    existing = _execute(conn,
        "SELECT id FROM users WHERE email=%s", (email.lower(),)
    ).fetchone()
    if existing:
        conn.close()
        raise ValueError("email_taken")

    pw_hash = _hash_pw(password)
    new_id = _insert_id(conn,
        "INSERT INTO users (name, email, pw_hash, data) VALUES (%s, %s, %s, %s)",
        (name, email.lower(), pw_hash, json.dumps({})))

    user = {
        "id": new_id,
        "name": name,
        "email": email.lower(),
        "headline": "",
        "location": "",
        "connections": 0,
        "followers": 0,
        "avatarColor": "#0F5DBD",
        "photo": "",
        "isPremium": False,
        "openToWork": False,
        "isRecruiter": is_recruiter,
        "about": "",
        "experience": [],
        "education": [],
        "skills": [],
    }
    _execute(conn,
        "UPDATE users SET data=%s WHERE id=%s",
        (json.dumps(user), new_id))
    conn.commit()
    conn.close()
    return user


def delete_user(user_id: int):
    """Delete a user by id. Raises ValueError if trying to delete id=1."""
    if int(user_id) == 1:
        raise ValueError("cannot_delete_primary_user")
    conn = _connect()
    row = _execute(conn,
        "SELECT id FROM users WHERE id=%s", (int(user_id),)
    ).fetchone()
    if not row:
        conn.close()
        return False
    _execute(conn, "DELETE FROM conference_stories WHERE author_id=%s", (int(user_id),))
    _execute(conn, "DELETE FROM users WHERE id=%s", (int(user_id),))
    conn.commit()
    conn.close()
    return True


# ---------------------------------------------------------------------------
# Post functions
# ---------------------------------------------------------------------------

def get_all_posts():
    conn = _connect()
    rows = _execute(conn,
        "SELECT id, author_id, content, created_at, data FROM posts ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        blob = json.loads(r["data"])
        reactions    = blob.get("reactions", {})
        like_count   = blob.get("totalReactions") or (sum(reactions.values()) if reactions else 0)
        comments_list = blob.get("commentsList", [])
        comment_count = blob.get("comments") if isinstance(blob.get("comments"), int) else len(comments_list)
        result.append({
            "id":           r["id"],
            "authorId":     r["author_id"],
            "content":      r["content"],
            "createdAt":    r["created_at"],
            "timestamp":    r["created_at"],
            "likeCount":    like_count,
            "comments":     comments_list,
            "commentCount": comment_count,
            **{k: v for k, v in blob.items() if k not in ("commentsList", "comments")},
        })
    return result


def create_post(author_id: int, content: str, image_url: str | None = None, video_url: str | None = None):
    user = get_user_by_id(author_id)
    author_blob = {
        "id":          user["id"],
        "name":        user["name"],
        "headline":    user.get("headline", ""),
        "avatarColor": user.get("avatarColor", "#0F5DBD"),
    }
    now  = _ts()
    blob = {
        "author":         author_blob,
        "reactions":      {"like": 0, "celebrate": 0, "love": 0,
                           "support": 0, "insightful": 0, "funny": 0},
        "totalReactions": 0,
        "comments":       0,
        "reposts":        0,
        "isLiked":        False,
        "isSaved":        False,
        "reactionType":   None,
        "type":           "text",
        "tags":           [],
        "commentsList":   [],
    }
    if image_url:
        blob["image"] = image_url
    if video_url:
        blob["videoUrl"] = video_url
    conn   = _connect()
    new_id = _insert_id(conn,
        "INSERT INTO posts (author_id, content, created_at, data) VALUES (%s, %s, %s, %s)",
        (author_id, content, now, json.dumps(blob)))
    conn.commit()
    conn.close()
    return {
        "id":           new_id,
        "authorId":     author_id,
        "content":      content,
        "timestamp":    now,
        "createdAt":    now,
        "likeCount":    0,
        "comments":     [],
        "commentCount": 0,
        **{k: v for k, v in blob.items() if k not in ("commentsList", "comments")},
    }


def delete_post(post_id: int, user_id: int):
    """Delete a post owned by user_id.

    Returns:
        "deleted"     — success
        "forbidden"   — post exists but belongs to another user
        "not_found"   — post does not exist
    """
    conn = _connect()
    row = _execute(
        conn, "SELECT author_id FROM posts WHERE id=%s", (int(post_id),)
    ).fetchone()
    if not row:
        conn.close()
        return "not_found"
    if row["author_id"] != int(user_id):
        conn.close()
        return "forbidden"
    _execute(conn, "DELETE FROM posts WHERE id=%s", (int(post_id),))
    conn.commit()
    conn.close()
    return "deleted"


def toggle_post_like(post_id: int, user_id: int):
    conn = _connect()
    existing = _execute(conn,
        "SELECT 1 FROM post_likes WHERE post_id=%s AND user_id=%s",
        (int(post_id), int(user_id))
    ).fetchone()
    if existing:
        _execute(conn,
            "DELETE FROM post_likes WHERE post_id=%s AND user_id=%s",
            (int(post_id), int(user_id)))
        liked = False
    else:
        _execute(conn,
            "INSERT INTO post_likes (post_id, user_id) VALUES (%s, %s)",
            (int(post_id), int(user_id)))
        liked = True
    row = _execute(conn,
        "SELECT COUNT(*) AS cnt FROM post_likes WHERE post_id=%s",
        (int(post_id),)
    ).fetchone()
    count = row["cnt"] if _USE_PG else row[0]

    # Keep the data blob's totalReactions in sync so get_all_posts reflects the correct count
    post_row = _execute(conn, "SELECT data FROM posts WHERE id=%s", (int(post_id),)).fetchone()
    if post_row:
        blob = json.loads(post_row["data"])
        blob["totalReactions"] = count
        blob["reactions"]["like"] = count
        _execute(conn, "UPDATE posts SET data=%s WHERE id=%s", (json.dumps(blob), int(post_id)))

    conn.commit()
    conn.close()
    return {"liked": liked, "likeCount": count}


def add_post_comment(post_id: int, author_id: int, text: str):
    conn     = _connect()
    row      = _execute(conn, "SELECT data FROM posts WHERE id=%s", (int(post_id),)).fetchone()
    if not row:
        conn.close()
        return None
    user_row = _execute(conn, "SELECT data FROM users WHERE id=%s", (int(author_id),)).fetchone()
    user     = json.loads(user_row["data"]) if user_row else {}
    blob     = json.loads(row["data"])
    comment  = {
        "author":         user.get("name", "User"),
        "authorHeadline": user.get("headline", ""),
        "text":           text,
        "timestamp":      "Just now",
        "likes":          0,
    }
    comments = blob.get("commentsList", [])
    comments.insert(0, comment)
    blob["commentsList"] = comments
    _execute(conn,
        "UPDATE posts SET data=%s WHERE id=%s",
        (json.dumps(blob), int(post_id)))
    conn.commit()
    conn.close()
    return comment


def get_post_likes_for_user(user_id: int):
    conn = _connect()
    rows = _execute(conn,
        "SELECT post_id FROM post_likes WHERE user_id=%s", (int(user_id),)
    ).fetchall()
    conn.close()
    return {r["post_id"] for r in rows}


# ---------------------------------------------------------------------------
# Job functions
# ---------------------------------------------------------------------------

def get_all_jobs():
    conn = _connect()
    rows = _execute(conn, "SELECT data FROM jobs ORDER BY id").fetchall()
    conn.close()
    return [json.loads(r["data"]) for r in rows]


def get_job_by_id(job_id: int):
    conn = _connect()
    row  = _execute(conn, "SELECT data FROM jobs WHERE id=%s", (int(job_id),)).fetchone()
    conn.close()
    return json.loads(row["data"]) if row else None


# ---------------------------------------------------------------------------
# Company functions
# ---------------------------------------------------------------------------

def get_company_by_id(company_id: int):
    conn = _connect()
    row  = _execute(conn,
        "SELECT data FROM companies WHERE id=%s", (int(company_id),)
    ).fetchone()
    conn.close()
    return json.loads(row["data"]) if row else None


# ---------------------------------------------------------------------------
# Conversation + message functions
# ---------------------------------------------------------------------------

def get_all_conversations():
    """Return conversation summaries (no messages list)."""
    conn   = _connect()
    rows   = _execute(conn,
        "SELECT id, data FROM conversations ORDER BY id"
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        meta = json.loads(r["data"])
        meta["id"] = r["id"]
        if "participantName" not in meta:
            p = meta.get("participant")
            meta["participantName"] = p.get("name", "") if isinstance(p, dict) else ""
        result.append(meta)
    return result


def get_conversations_for_user(user_id: int):  # pragma: no cover
    """Return conversation summaries where user is the owner or the participant."""
    conn = _connect()
    rows = _execute(conn, "SELECT id, data FROM conversations ORDER BY id").fetchall()
    conn.close()
    result = []
    for r in rows:
        meta = json.loads(r["data"])
        owner = int(meta.get("ownerId", 1))
        participant_id = int(meta.get("participantId") or meta.get("participant", {}).get("id", 0) or 0)
        if owner != int(user_id) and participant_id != int(user_id):
            continue
        meta["id"] = r["id"]
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


def create_conversation(owner_id: int, participant: dict):  # pragma: no cover
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
    new_id = _insert_id(conn,
        "INSERT INTO conversations (data) VALUES (%s)", (json.dumps(meta),))
    conn.commit()
    conn.close()
    meta["id"] = new_id
    meta["messages"] = []
    return meta


def get_conversation_by_id(conv_id: int):
    """Return full conversation including messages list."""
    conn = _connect()
    row  = _execute(conn,
        "SELECT data FROM conversations WHERE id=%s", (int(conv_id),)
    ).fetchone()
    if not row:
        conn.close()
        return None
    meta = json.loads(row["data"])
    meta["id"] = int(conv_id)
    msg_rows = _execute(conn, """
        SELECT id, sender_id, text, timestamp, is_read
        FROM messages WHERE conversation_id=%s ORDER BY timestamp ASC
    """, (int(conv_id),)).fetchall()
    conn.close()
    meta["messages"] = [
        {
            "id":        m["id"],
            "senderId":  m["sender_id"],
            "text":      m["text"],
            "timestamp": m["timestamp"],
            "isRead":    bool(m["is_read"]),
        }
        for m in msg_rows
    ]
    return meta


def send_message(conv_id: int, sender_id: int, text: str):
    """Append a message to a conversation. Returns the new message dict."""
    now  = _ts()
    conn = _connect()
    row  = _execute(conn,
        "SELECT data FROM conversations WHERE id=%s", (int(conv_id),)
    ).fetchone()
    if not row:
        conn.close()
        return None
    new_id = _insert_id(conn, """
        INSERT INTO messages (conversation_id, sender_id, text, timestamp, is_read)
        VALUES (%s, %s, %s, %s, 0)
    """, (int(conv_id), int(sender_id), text, now))
    meta = json.loads(row["data"])
    meta["lastMessage"]   = text
    meta["lastTimestamp"] = now
    _execute(conn,
        "UPDATE conversations SET data=%s WHERE id=%s",
        (json.dumps(meta), int(conv_id)))
    conn.commit()
    conn.close()
    return {
        "id":        new_id,
        "senderId":  int(sender_id),
        "text":      text,
        "timestamp": now,
        "isRead":    False,
    }


# ---------------------------------------------------------------------------
# Notification functions
# ---------------------------------------------------------------------------

def get_all_notifications():
    conn = _connect()
    rows = _execute(conn,
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
    row  = _execute(conn,
        "SELECT data FROM notifications WHERE id=%s", (int(notif_id),)
    ).fetchone()
    if not row:
        conn.close()
        return None
    _execute(conn,
        "UPDATE notifications SET is_read=1 WHERE id=%s", (int(notif_id),))
    conn.commit()
    n = json.loads(row["data"])
    n["isRead"] = True
    conn.close()
    return n


def mark_all_notifications_read():
    conn = _connect()
    _execute(conn, "UPDATE notifications SET is_read=1")
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def search(q: str, exclude_user_id: int = 1):
    q_lower = q.lower().strip()
    if not q_lower:
        return {"users": [], "jobs": [], "companies": [], "posts": [], "query": q}

    conn = _connect()

    user_rows = _execute(conn, "SELECT data FROM users").fetchall()
    users = [
        json.loads(r["data"]) for r in user_rows
        if q_lower in json.loads(r["data"]).get("name", "").lower()
        or q_lower in json.loads(r["data"]).get("headline", "").lower()
        or q_lower in json.loads(r["data"]).get("location", "").lower()
    ]

    job_rows = _execute(conn, "SELECT data FROM jobs").fetchall()
    jobs = [
        json.loads(r["data"]) for r in job_rows
        if q_lower in json.loads(r["data"]).get("title", "").lower()
        or q_lower in json.loads(r["data"]).get("company", "").lower()
        or q_lower in json.loads(r["data"]).get("location", "").lower()
    ]

    co_rows = _execute(conn, "SELECT data FROM companies").fetchall()
    companies = [
        json.loads(r["data"]) for r in co_rows
        if q_lower in json.loads(r["data"]).get("name", "").lower()
        or q_lower in json.loads(r["data"]).get("industry", "").lower()
    ]

    post_rows = _execute(conn,
        "SELECT id, author_id, content, created_at, data FROM posts"
    ).fetchall()
    posts = []
    for r in post_rows:
        if q_lower in r["content"].lower():
            blob = json.loads(r["data"])
            posts.append({"id": r["id"], "content": r["content"],
                          "timestamp": r["created_at"], **blob})

    conn.close()
    return {"users": users, "jobs": jobs, "companies": companies,
            "posts": posts, "query": q}


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

def get_all_events_with_attendance(user_id: int):
    from data.events import get_events as _get_static_events

    conn    = _connect()
    _ensure_event_interest_table(conn)
    attended  = set()
    interested = set()
    if user_id is not None:
        att_rows = _execute(conn,
            "SELECT event_id, event_src FROM event_attendance WHERE user_id=%s",
            (int(user_id),)
        ).fetchall()
        for r in att_rows:
            attended.add((r["event_id"], r["event_src"]))
        int_rows = _execute(conn,
            "SELECT event_id, event_src FROM event_interest WHERE user_id=%s",
            (int(user_id),)
        ).fetchall()
        for r in int_rows:
            interested.add((r["event_id"], r["event_src"]))

    static_events = _get_static_events()
    result = []
    for e in static_events:
        ev = dict(e)
        ev["isAttending"]  = (ev.get("id", 0), "static") in attended
        ev["isInterested"] = (ev.get("id", 0), "static") in interested
        ev["source"] = "static"
        result.append(ev)

    ue_rows = _execute(conn,
        "SELECT id, creator_id, created_at, data FROM user_events ORDER BY created_at DESC"
    ).fetchall()
    for r in ue_rows:
        ev = json.loads(r["data"])
        ev["id"]           = f"u{r['id']}"
        ev["creatorId"]    = r["creator_id"]
        ev["isAttending"]  = (r["id"], "user") in attended
        ev["isInterested"] = (r["id"], "user") in interested
        ev["source"]       = "user"
        result.append(ev)

    conn.close()
    return result


def create_event(creator_id: int, data: dict):
    now    = _ts()
    conn   = _connect()
    new_id = _insert_id(conn,
        "INSERT INTO user_events (creator_id, created_at, data) VALUES (%s, %s, %s)",
        (int(creator_id), now, json.dumps(data)))
    conn.commit()
    conn.close()
    return {**data, "id": f"u{new_id}", "creatorId": creator_id,
            "source": "user", "isAttending": False}


def toggle_event_attend(event_id, event_src: str, user_id: int):
    raw_id   = int(str(event_id).lstrip("u"))
    conn     = _connect()
    existing = _execute(conn,
        "SELECT 1 FROM event_attendance WHERE event_id=%s AND event_src=%s AND user_id=%s",
        (raw_id, event_src, int(user_id))
    ).fetchone()
    if existing:
        _execute(conn,
            "DELETE FROM event_attendance WHERE event_id=%s AND event_src=%s AND user_id=%s",
            (raw_id, event_src, int(user_id)))
        attending = False
    else:
        _execute(conn,
            "INSERT INTO event_attendance (event_id, event_src, user_id) VALUES (%s, %s, %s)",
            (raw_id, event_src, int(user_id)))
        attending = True
    conn.commit()
    conn.close()
    return {"attending": attending}


def _ensure_event_interest_table(conn):
    _execute(conn, """
        CREATE TABLE IF NOT EXISTS event_interest (
            event_id  INTEGER NOT NULL,
            event_src TEXT    NOT NULL DEFAULT 'static',
            user_id   INTEGER NOT NULL,
            PRIMARY KEY (event_id, event_src, user_id)
        )
    """)


def toggle_event_interest(event_id, event_src: str, user_id: int):
    raw_id = int(str(event_id).lstrip("u"))
    uid    = int(user_id)
    conn   = _connect()
    _ensure_event_interest_table(conn)
    # Remove conflicting attendance row first (mutually exclusive states)
    _execute(conn,
        "DELETE FROM event_attendance WHERE event_id=%s AND event_src=%s AND user_id=%s",
        (raw_id, event_src, uid))
    existing = _execute(conn,
        "SELECT 1 FROM event_interest WHERE event_id=%s AND event_src=%s AND user_id=%s",
        (raw_id, event_src, uid)
    ).fetchone()
    if existing:
        _execute(conn,
            "DELETE FROM event_interest WHERE event_id=%s AND event_src=%s AND user_id=%s",
            (raw_id, event_src, uid))
        interested = False
    else:
        _execute(conn,
            "INSERT INTO event_interest (event_id, event_src, user_id) VALUES (%s, %s, %s)",
            (raw_id, event_src, uid))
        interested = True
    conn.commit()
    conn.close()
    return {"interested": interested}


# ---------------------------------------------------------------------------
# Social state
# ---------------------------------------------------------------------------

def get_social_state(user_id: int):  # pragma: no cover
    conn        = _connect()
    saved_jobs  = [r["job_id"]            for r in _execute(conn, "SELECT job_id FROM user_saved_jobs WHERE user_id=%s",                  (user_id,)).fetchall()]
    connections = [r["connected_user_id"] for r in _execute(conn, "SELECT connected_user_id FROM user_connections WHERE user_id=%s",      (user_id,)).fetchall()]
    following   = [r["followed_user_id"]  for r in _execute(conn, "SELECT followed_user_id FROM user_following WHERE user_id=%s",         (user_id,)).fetchall()]
    pending     = [r["target_user_id"]    for r in _execute(conn, "SELECT target_user_id FROM user_pending_connections WHERE user_id=%s", (user_id,)).fetchall()]
    dismissed   = [r["invitation_key"]    for r in _execute(conn, "SELECT invitation_key FROM user_dismissed_invitations WHERE user_id=%s", (user_id,)).fetchall()]
    applied     = [r["job_id"]            for r in _execute(conn, "SELECT job_id FROM user_applied_jobs WHERE user_id=%s",                 (user_id,)).fetchall()]
    groups      = [r["group_id"]          for r in _execute(conn, "SELECT group_id FROM user_joined_groups WHERE user_id=%s",             (user_id,)).fetchall()]
    conn.close()
    return {
        "savedJobs":            saved_jobs,
        "connections":          connections,
        "following":            following,
        "pendingConnections":   pending,
        "dismissedInvitations": dismissed,
        "appliedJobs":          applied,
        "joinedGroups":         groups,
    }


def toggle_saved_job(user_id: int, job_id: int):  # pragma: no cover
    conn     = _connect()
    existing = _execute(conn,
        "SELECT 1 FROM user_saved_jobs WHERE user_id=%s AND job_id=%s",
        (user_id, job_id)
    ).fetchone()
    if existing:
        _execute(conn,
            "DELETE FROM user_saved_jobs WHERE user_id=%s AND job_id=%s",
            (user_id, job_id))
        saved = False
    else:
        _execute(conn,
            "INSERT INTO user_saved_jobs (user_id, job_id) VALUES (%s, %s)",
            (user_id, job_id))
        saved = True
    conn.commit()
    conn.close()
    return {"saved": saved}


def save_job(user_id: int, job_id: int):  # pragma: no cover
    """Idempotent save — no-op if already saved."""
    conn = _connect()
    _execute(conn,
        "INSERT INTO user_saved_jobs (user_id, job_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
        (user_id, job_id))
    conn.commit()
    conn.close()
    return {"saved": True}


def unsave_job(user_id: int, job_id: int):  # pragma: no cover
    """Idempotent unsave — no-op if not saved."""
    conn = _connect()
    _execute(conn,
        "DELETE FROM user_saved_jobs WHERE user_id=%s AND job_id=%s",
        (user_id, job_id))
    conn.commit()
    conn.close()
    return {"saved": False}


def connect_user(user_id: int, target_id: int):  # pragma: no cover
    conn = _connect()
    _execute(conn, """
        INSERT INTO user_pending_connections (user_id, target_user_id)
        VALUES (%s, %s) ON CONFLICT DO NOTHING
    """, (user_id, target_id))
    conn.commit()
    conn.close()
    return {"pending": True}


def get_incoming_connection_requests(user_id: int):  # pragma: no cover
    """Return users who have sent a pending connection request to user_id."""
    conn = _connect()
    rows = _execute(conn,
        "SELECT user_id FROM user_pending_connections WHERE target_user_id=%s",
        (user_id,)
    ).fetchall()
    conn.close()
    requester_ids = [r["user_id"] for r in rows]
    if not requester_ids:
        return []
    return [get_user_by_id(rid) for rid in requester_ids if get_user_by_id(rid)]


def decline_connection_request(requester_id: int, target_id: int):  # pragma: no cover
    """Remove a pending connection request without accepting it."""
    conn = _connect()
    _execute(conn,
        "DELETE FROM user_pending_connections WHERE user_id=%s AND target_user_id=%s",
        (requester_id, target_id))
    conn.commit()
    conn.close()
    return {"declined": True}


def accept_connection(user_id: int, target_id: int):  # pragma: no cover
    conn = _connect()
    _execute(conn,
        "DELETE FROM user_pending_connections WHERE user_id=%s AND target_user_id=%s",
        (user_id, target_id))
    _execute(conn, """
        INSERT INTO user_connections (user_id, connected_user_id)
        VALUES (%s, %s) ON CONFLICT DO NOTHING
    """, (user_id, target_id))
    _execute(conn, """
        INSERT INTO user_connections (user_id, connected_user_id)
        VALUES (%s, %s) ON CONFLICT DO NOTHING
    """, (target_id, user_id))
    conn.commit()
    conn.close()
    return {"connected": True}


def toggle_following(user_id: int, target_id: int):  # pragma: no cover
    conn     = _connect()
    existing = _execute(conn,
        "SELECT 1 FROM user_following WHERE user_id=%s AND followed_user_id=%s",
        (user_id, target_id)
    ).fetchone()
    if existing:
        _execute(conn,
            "DELETE FROM user_following WHERE user_id=%s AND followed_user_id=%s",
            (user_id, target_id))
        following = False
    else:
        _execute(conn,
            "INSERT INTO user_following (user_id, followed_user_id) VALUES (%s, %s)",
            (user_id, target_id))
        following = True
    conn.commit()
    conn.close()
    return {"following": following}


def apply_to_job(user_id: int, job_id: int):  # pragma: no cover
    conn = _connect()
    _execute(conn, """
        INSERT INTO user_applied_jobs (user_id, job_id)
        VALUES (%s, %s) ON CONFLICT DO NOTHING
    """, (user_id, job_id))
    conn.commit()
    conn.close()
    return {"applied": True}


def toggle_group(user_id: int, group_id: int):  # pragma: no cover
    conn     = _connect()
    existing = _execute(conn,
        "SELECT 1 FROM user_joined_groups WHERE user_id=%s AND group_id=%s",
        (user_id, group_id)
    ).fetchone()
    if existing:
        _execute(conn,
            "DELETE FROM user_joined_groups WHERE user_id=%s AND group_id=%s",
            (user_id, group_id))
        joined = False
    else:
        _execute(conn,
            "INSERT INTO user_joined_groups (user_id, group_id) VALUES (%s, %s)",
            (user_id, group_id))
        joined = True
    conn.commit()
    conn.close()
    return {"joined": joined}


def dismiss_invitation(user_id: int, key: str):  # pragma: no cover
    conn = _connect()
    _execute(conn, """
        INSERT INTO user_dismissed_invitations (user_id, invitation_key)
        VALUES (%s, %s) ON CONFLICT DO NOTHING
    """, (user_id, key))
    conn.commit()
    conn.close()
    return {"dismissed": True}


# ---------------------------------------------------------------------------
# Conference story functions
# ---------------------------------------------------------------------------

def get_conference_stories():
    conn = _connect()
    rows = _execute(conn,
        "SELECT id, author_id, created_at, data FROM conference_stories ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        story = json.loads(r["data"])
        story["id"]        = r["id"]
        story["authorId"]  = r["author_id"]
        story["createdAt"] = r["created_at"]
        result.append(story)
    return result


def create_conference_story(author_id: int, conference_name: str, tagline: str,
                             description: str, photo_url: str = None,
                             company_logo_url: str = None):
    user = get_user_by_id(author_id)
    if not user:
        return None
    now  = _ts()
    blob = {
        "conferenceName":  conference_name,
        "tagline":         tagline,
        "description":     description,
        "photoUrl":        photo_url or "",
        "companyLogoUrl":  company_logo_url or "",
        "author": {
            "id":          user["id"],
            "name":        user["name"],
            "headline":    user.get("headline", ""),
            "avatarColor": user.get("avatarColor", "#0F5DBD"),
        },
    }
    conn   = _connect()
    new_id = _insert_id(conn,
        "INSERT INTO conference_stories (author_id, created_at, data) VALUES (%s, %s, %s)",
        (int(author_id), now, json.dumps(blob)))
    conn.commit()
    conn.close()
    return {**blob, "id": new_id, "authorId": author_id, "createdAt": now}
