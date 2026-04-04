"""
Unit tests for backend/database.py
Test types used:
  BB  — Black Box      (function contract only)
  WB  — White Box      (specific source lines / branches)
  GB  — Gray Box       (threshold values visible in source)
  EP  — Equivalence Partitioning (distinct input buckets)
  RG  — Regression     (known past bugs / silent failures)
  EC  — Edge Case      (structural extremes of valid input)
"""

import json
import os
import sqlite3
import sys
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import database


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _create_schema(db_path: str):
    """Create all tables without seeding any data."""
    conn = sqlite3.connect(db_path)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id      INTEGER PRIMARY KEY,
            name    TEXT NOT NULL,
            email   TEXT UNIQUE NOT NULL,
            pw_hash TEXT NOT NULL,
            data    TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS posts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            author_id   INTEGER NOT NULL,
            content     TEXT NOT NULL,
            created_at  INTEGER NOT NULL,
            data        TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS jobs  (id INTEGER PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS companies (id INTEGER PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS messages (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_id       INTEGER NOT NULL,
            text            TEXT NOT NULL,
            timestamp       INTEGER NOT NULL,
            is_read         INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id      INTEGER PRIMARY KEY,
            is_read INTEGER NOT NULL DEFAULT 0,
            data    TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token      TEXT PRIMARY KEY,
            user_id    INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        );
    """)
    conn.commit()
    conn.close()


def _raw(db_path: str, sql: str, params=()):
    """Helper: run a raw SQL query on the test DB."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    row = conn.execute(sql, params).fetchone()
    conn.close()
    return row


def _raw_all(db_path: str, sql: str, params=()):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return rows


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    """Redirect every database call to a fresh temp DB for each test."""
    db_file = str(tmp_path / "nexus_test.db")
    monkeypatch.setattr(database, "_DB_PATH", db_file)
    database._sessions.clear()
    _create_schema(db_file)
    yield db_file
    database._sessions.clear()


# ---------------------------------------------------------------------------
# Helpers used by multiple test classes
# ---------------------------------------------------------------------------

def seed_user(db_path, uid=1, name="Alex Johnson",
              email="alex@example.com", pw="password123",
              extra=None):
    """Insert a minimal user row directly so tests don't depend on init_db."""
    pw_hash = database._hash_pw(pw)
    data = {"id": uid, "name": name, "email": email.lower(),
            "headline": "Engineer", "location": "NYC",
            "about": "", "pronouns": "", "industry": "Tech",
            "connections": 0, "followers": 0,
            "avatarColor": "#0F5DBD", "isPremium": False,
            "openToWork": False, "experience": [], "education": [], "skills": []}
    if extra:
        data.update(extra)
    conn = sqlite3.connect(db_path)
    conn.execute(
        "INSERT OR REPLACE INTO users (id, name, email, pw_hash, data) VALUES (?,?,?,?,?)",
        (uid, name, email.lower(), pw_hash, json.dumps(data))
    )
    conn.commit()
    conn.close()
    return data


def seed_post(db_path, uid=1, content="Hello world", ts=None, post_id=None):
    now = ts or int(time.time() * 1000)
    blob = {"reactions": {"like": 0}, "totalReactions": 0,
            "comments": 0, "commentsList": [], "author": {"id": uid, "name": "Alex Johnson"}}
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    if post_id:
        c.execute("INSERT INTO posts (id, author_id, content, created_at, data) VALUES (?,?,?,?,?)",
                  (post_id, uid, content, now, json.dumps(blob)))
    else:
        c.execute("INSERT INTO posts (author_id, content, created_at, data) VALUES (?,?,?,?)",
                  (uid, content, now, json.dumps(blob)))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    return new_id


def seed_conv(db_path, conv_id=1, participant_name="Sarah Chen"):
    meta = {"participant": {"id": 2, "name": participant_name},
            "lastMessage": "Hi", "lastTimestamp": 1000}
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO conversations (id, data) VALUES (?,?)",
                 (conv_id, json.dumps(meta)))
    conn.commit()
    conn.close()


def seed_message(db_path, conv_id=1, sender_id=1, text="Hey", ts=1000, is_read=0):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("INSERT INTO messages (conversation_id, sender_id, text, timestamp, is_read) VALUES (?,?,?,?,?)",
              (conv_id, sender_id, text, ts, is_read))
    conn.commit()
    conn.close()


def seed_notif(db_path, notif_id=1, is_read=0, content="You got a connection"):
    data = {"id": notif_id, "content": content, "type": "connection"}
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO notifications (id, is_read, data) VALUES (?,?,?)",
                 (notif_id, is_read, json.dumps(data)))
    conn.commit()
    conn.close()


# ===========================================================================
# _hash_pw
# ===========================================================================

class TestHashPw:
    def test_T01_WB_same_input_same_hash(self):
        """WB: SHA-256 is deterministic — same input always yields same hash."""
        assert database._hash_pw("password123") == database._hash_pw("password123")

    def test_T02_WB_different_inputs_different_hashes(self):
        """WB: Different inputs produce different hashes."""
        assert database._hash_pw("abc") != database._hash_pw("ABC")

    def test_T03_EC_empty_string_hashable(self):
        """EC: Empty string produces a valid 64-char hex hash without error."""
        result = database._hash_pw("")
        assert isinstance(result, str)
        assert len(result) == 64

    def test_T04_BB_returns_64_char_hex(self):
        """BB: Output is always a 64-character hex string (SHA-256 digest)."""
        result = database._hash_pw("nexus2026")
        assert len(result) == 64
        assert all(c in "0123456789abcdef" for c in result)


# ===========================================================================
# _ts
# ===========================================================================

class TestTs:
    def test_T05_BB_returns_positive_int(self):
        """BB: _ts() returns a positive integer."""
        result = database._ts()
        assert isinstance(result, int)
        assert result > 0

    def test_T06_GB_within_2s_of_now(self):
        """GB: Value is within 2 seconds of current epoch-ms (threshold ±2000 ms)."""
        result = database._ts()
        now_ms = time.time() * 1000
        assert abs(result - now_ms) < 2000


# ===========================================================================
# verify_credentials
# ===========================================================================

class TestVerifyCredentials:
    def test_T07_BB_correct_credentials_return_user(self, isolated_db):
        """BB: Correct email+password returns a user dict with 'id' key."""
        seed_user(isolated_db, uid=1, email="alex@example.com", pw="password123")
        result = database.verify_credentials("alex@example.com", "password123")
        assert result is not None
        assert result["id"] == 1

    def test_T08_WB_unknown_email_returns_none(self, isolated_db):
        """WB: Unknown email hits 'if not row: return None' at line 221."""
        result = database.verify_credentials("nobody@example.com", "password123")
        assert result is None

    def test_T09_WB_wrong_password_returns_none(self, isolated_db):
        """WB: Wrong password fails hash comparison at line 223-224."""
        seed_user(isolated_db, uid=1, email="alex@example.com", pw="password123")
        result = database.verify_credentials("alex@example.com", "wrongpassword")
        assert result is None

    def test_T10_EP_email_lookup_case_insensitive(self, isolated_db):
        """EP: Email bucket — mixed-case email resolves to same account."""
        seed_user(isolated_db, uid=1, email="user@example.com", pw="pass1234")
        result = database.verify_credentials("USER@EXAMPLE.COM", "pass1234")
        assert result is not None

    def test_T11_EC_empty_email_returns_none(self, isolated_db):
        """EC: Empty string email is a structural extreme — returns None."""
        result = database.verify_credentials("", "password123")
        assert result is None


# ===========================================================================
# create_session / get_session_user_id
# ===========================================================================

class TestSessions:
    def test_T12_BB_create_session_returns_64_char_token(self, isolated_db):
        """BB: create_session returns a non-empty 64-char hex token."""
        seed_user(isolated_db, uid=1)
        token = database.create_session(1)
        assert isinstance(token, str)
        assert len(token) == 64

    def test_T13_WB_token_stored_in_sessions_dict(self, isolated_db):
        """WB: Token written to _sessions in-memory dict (line 231)."""
        seed_user(isolated_db, uid=2)
        token = database.create_session(2)
        assert database._sessions[token] == 2

    def test_T14_WB_token_persisted_to_db(self, isolated_db):
        """WB: Token inserted into sessions table (lines 233-235)."""
        seed_user(isolated_db, uid=1)
        token = database.create_session(1)
        row = _raw(isolated_db, "SELECT user_id FROM sessions WHERE token=?", (token,))
        assert row is not None
        assert row["user_id"] == 1

    def test_T15_BB_two_sessions_are_unique(self, isolated_db):
        """BB: Two calls to create_session produce different tokens."""
        seed_user(isolated_db, uid=1)
        t1 = database.create_session(1)
        t2 = database.create_session(1)
        assert t1 != t2

    def test_T16_WB_empty_token_returns_none(self, isolated_db):
        """WB: Empty string short-circuits at line 244-245."""
        assert database.get_session_user_id("") is None

    def test_T17_EC_none_token_returns_none(self, isolated_db):
        """EC: None token is a structural extreme — returns None."""
        assert database.get_session_user_id(None) is None

    def test_T18_WB_in_memory_cache_fast_path(self, isolated_db):
        """WB: Token in _sessions dict returns user_id via cache (line 247-248)."""
        seed_user(isolated_db, uid=1)
        token = database.create_session(1)
        # Token is already in _sessions — fast path
        result = database.get_session_user_id(token)
        assert result == 1

    def test_T19_WB_db_fallback_after_cache_cleared(self, isolated_db):
        """WB: Token not in cache falls back to DB query (lines 250-257)."""
        seed_user(isolated_db, uid=1)
        token = database.create_session(1)
        database._sessions.clear()          # simulate server restart
        result = database.get_session_user_id(token)
        assert result == 1

    def test_T20_WB_unknown_token_returns_none(self, isolated_db):
        """WB: Token not in cache and not in DB returns None (line 258)."""
        result = database.get_session_user_id("a" * 64)
        assert result is None

    def test_T21_RG_db_fallback_still_works_after_restart(self, isolated_db):
        """RG: After clearing _sessions (restart simulation), DB fallback returns correct user_id."""
        seed_user(isolated_db, uid=5)
        token = database.create_session(5)
        database._sessions.clear()
        assert database.get_session_user_id(token) == 5


# ===========================================================================
# get_current_user
# ===========================================================================

class TestGetCurrentUser:
    def test_T22_BB_valid_id_returns_user(self, isolated_db):
        """BB: Valid id returns user dict with 'id' key."""
        seed_user(isolated_db, uid=1)
        result = database.get_current_user(1)
        assert result is not None
        assert result["id"] == 1

    def test_T23_BB_nonexistent_id_returns_none(self, isolated_db):
        """BB: Non-existent id returns None."""
        assert database.get_current_user(9999) is None


# ===========================================================================
# update_current_user
# ===========================================================================

class TestUpdateCurrentUser:
    def test_T24_BB_updates_headline(self, isolated_db):
        """BB: Updating allowed field 'headline' is reflected in returned dict."""
        seed_user(isolated_db, uid=1)
        result = database.update_current_user({"headline": "Senior Engineer"}, 1)
        assert result["headline"] == "Senior Engineer"

    def test_T25_WB_nonexistent_user_returns_none(self, isolated_db):
        """WB: User not found returns None (line 271-272)."""
        result = database.update_current_user({}, 9999)
        assert result is None

    def test_T26_EP_unknown_keys_silently_ignored(self, isolated_db):
        """EP: Keys not in field_map are silently dropped (bucket: invalid field)."""
        seed_user(isolated_db, uid=1)
        result = database.update_current_user({"foo": "bar", "headline": "Dev"}, 1)
        assert "foo" not in result
        assert result["headline"] == "Dev"

    def test_T27_EC_empty_updates_returns_user_unchanged(self, isolated_db):
        """EC: Empty dict — structural extreme — returns existing user without error."""
        seed_user(isolated_db, uid=1)
        result = database.update_current_user({}, 1)
        assert result is not None
        assert result["id"] == 1

    def test_T28_BB_all_allowed_fields_update(self, isolated_db):
        """BB: All six allowed fields (name, headline, location, about, pronouns, industry) update."""
        seed_user(isolated_db, uid=1)
        updates = {"name": "Bob", "headline": "CTO", "location": "SF",
                   "about": "I build things", "pronouns": "he/him", "industry": "Finance"}
        result = database.update_current_user(updates, 1)
        for key, val in updates.items():
            assert result[key] == val


# ===========================================================================
# get_all_users / get_user_by_id
# ===========================================================================

class TestUserLookup:
    def test_T29_BB_get_all_users_excludes_specified_id(self, isolated_db):
        """BB: get_all_users excludes the given user_id."""
        seed_user(isolated_db, uid=1, email="a@a.com")
        seed_user(isolated_db, uid=2, name="Bob", email="b@b.com")
        users = database.get_all_users(exclude_id=1)
        assert all(u["id"] != 1 for u in users)
        assert len(users) == 1

    def test_T30_EP_exclude_nonexistent_id_returns_all(self, isolated_db):
        """EP: Excluding an id not in DB returns all users (bucket: id absent)."""
        seed_user(isolated_db, uid=1, email="a@a.com")
        users = database.get_all_users(exclude_id=9999)
        assert len(users) == 1

    def test_T31_EC_exclude_only_user_returns_empty(self, isolated_db):
        """EC: Only one user in DB, exclude it — returns empty list."""
        seed_user(isolated_db, uid=1, email="a@a.com")
        assert database.get_all_users(exclude_id=1) == []

    def test_T32_BB_get_user_by_id_returns_dict(self, isolated_db):
        """BB: Valid id returns dict with 'id' and 'name' fields."""
        seed_user(isolated_db, uid=3, name="Carol", email="c@c.com")
        result = database.get_user_by_id(3)
        assert result is not None
        assert result["id"] == 3
        assert result["name"] == "Carol"

    def test_T33_BB_get_user_by_id_nonexistent_returns_none(self, isolated_db):
        """BB: Non-existent user_id returns None."""
        assert database.get_user_by_id(9999) is None

    def test_T34_WB_string_id_cast_to_int(self, isolated_db):
        """WB: int() cast applied to user_id — string '1' works (line 297)."""
        seed_user(isolated_db, uid=1, email="a@a.com")
        result = database.get_user_by_id("1")
        assert result is not None


# ===========================================================================
# create_user
# ===========================================================================

class TestCreateUser:
    def test_T35_BB_creates_user_with_expected_fields(self, isolated_db):
        """BB: Returns new user dict with id, name, email, headline, skills, etc."""
        result = database.create_user("Alice", "alice@test.com", "pass1234")
        for field in ("id", "name", "email", "headline", "connections", "skills", "experience"):
            assert field in result

    def test_T36_WB_duplicate_email_raises_value_error(self, isolated_db):
        """WB: Duplicate email raises ValueError('email_taken') (line 312)."""
        database.create_user("Alice", "alice@test.com", "pass1234")
        with pytest.raises(ValueError, match="email_taken"):
            database.create_user("Alice2", "alice@test.com", "pass5678")

    def test_T37_EP_email_normalized_to_lowercase(self, isolated_db):
        """EP: Mixed-case email bucket — stored and returned as lowercase."""
        result = database.create_user("Bob", "BOB@TEST.COM", "pass1234")
        assert result["email"] == "bob@test.com"

    def test_T38_WB_new_user_default_fields(self, isolated_db):
        """WB: New user has connections=0 and isPremium=False (lines 329-332)."""
        result = database.create_user("Carol", "carol@test.com", "pass1234")
        assert result["connections"] == 0
        assert result["isPremium"] is False

    def test_T39_EC_user_can_be_found_after_creation(self, isolated_db):
        """EC: Created user is retrievable immediately via get_user_by_id."""
        result = database.create_user("Dave", "dave@test.com", "pass1234")
        fetched = database.get_user_by_id(result["id"])
        assert fetched is not None
        assert fetched["name"] == "Dave"


# ===========================================================================
# delete_user
# ===========================================================================

class TestDeleteUser:
    def test_T40_BB_returns_true_on_success(self, isolated_db):
        """BB: Deleting an existing non-primary user returns True."""
        seed_user(isolated_db, uid=2, name="Bob", email="b@b.com")
        assert database.delete_user(2) is True

    def test_T41_BB_returns_false_if_not_found(self, isolated_db):
        """BB: Deleting non-existent user returns False."""
        assert database.delete_user(9999) is False

    def test_T42_WB_raises_for_user_id_1(self, isolated_db):
        """WB: id=1 raises ValueError('cannot_delete_primary_user') (line 349-350)."""
        with pytest.raises(ValueError, match="cannot_delete_primary_user"):
            database.delete_user(1)

    def test_T43_GB_threshold_id1_raises_id2_does_not(self, isolated_db):
        """GB: Threshold exactly at id=1 raises; id=2 does not raise."""
        seed_user(isolated_db, uid=2, name="Bob", email="b@b.com")
        with pytest.raises(ValueError):
            database.delete_user(1)
        assert database.delete_user(2) is True

    def test_T44_WB_user_removed_from_db_after_delete(self, isolated_db):
        """WB: After deletion, get_user_by_id returns None (line 357)."""
        seed_user(isolated_db, uid=2, name="Bob", email="b@b.com")
        database.delete_user(2)
        assert database.get_user_by_id(2) is None


# ===========================================================================
# get_all_posts / create_post
# ===========================================================================

class TestPosts:
    def test_T45_BB_get_all_posts_returns_expected_fields(self, isolated_db):
        """BB: Each post has id, authorId, content, likeCount fields."""
        seed_user(isolated_db, uid=1, email="a@a.com")
        seed_post(isolated_db, uid=1, content="Test post")
        posts = database.get_all_posts()
        assert len(posts) == 1
        for field in ("id", "authorId", "content", "likeCount"):
            assert field in posts[0]

    def test_T46_RG_posts_ordered_newest_first(self, isolated_db):
        """RG: Posts must be ordered by created_at DESC (regression: sort order)."""
        seed_user(isolated_db, uid=1, email="a@a.com")
        seed_post(isolated_db, uid=1, content="older", ts=1000)
        seed_post(isolated_db, uid=1, content="newer", ts=9000)
        posts = database.get_all_posts()
        assert posts[0]["createdAt"] > posts[1]["createdAt"]

    def test_T47_WB_likecount_from_total_reactions(self, isolated_db):
        """WB: likeCount computed from totalReactions blob field (line 376)."""
        blob = {"reactions": {}, "totalReactions": 7, "comments": 0, "commentsList": [],
                "author": {"id": 1, "name": "Alex"}}
        conn = sqlite3.connect(isolated_db)
        conn.execute("INSERT INTO posts (author_id, content, created_at, data) VALUES (?,?,?,?)",
                     (1, "hi", 1000, json.dumps(blob)))
        conn.commit()
        conn.close()
        posts = database.get_all_posts()
        assert posts[0]["likeCount"] == 7

    def test_T48_EC_empty_posts_returns_empty_list(self, isolated_db):
        """EC: Empty posts table returns empty list."""
        assert database.get_all_posts() == []

    def test_T49_BB_create_post_returns_correct_fields(self, isolated_db):
        """BB: create_post returns dict with id, authorId, content, likeCount=0, commentCount=0."""
        seed_user(isolated_db, uid=1, email="a@a.com")
        result = database.create_post(1, "Hello Nexus")
        assert result["authorId"] == 1
        assert result["content"] == "Hello Nexus"
        assert result["likeCount"] == 0
        assert result["commentCount"] == 0
        assert "id" in result

    def test_T50_WB_create_post_embeds_author_blob(self, isolated_db):
        """WB: Author name from user is embedded in post blob (lines 397-402)."""
        seed_user(isolated_db, uid=1, name="Alex Johnson", email="a@a.com")
        database.create_post(1, "Author test")
        posts = database.get_all_posts()
        author = posts[0].get("author", {})
        assert author.get("name") == "Alex Johnson"

    def test_T51_EC_very_long_content_stored(self, isolated_db):
        """EC: 1000-character content stored without error."""
        seed_user(isolated_db, uid=1, email="a@a.com")
        long_content = "x" * 1000
        result = database.create_post(1, long_content)
        assert result["content"] == long_content


# ===========================================================================
# get_all_jobs / get_job_by_id
# ===========================================================================

class TestJobs:
    def _seed_job(self, db_path, job_id, title):
        data = {"id": job_id, "title": title, "company": "Acme", "location": "Remote"}
        conn = sqlite3.connect(db_path)
        conn.execute("INSERT INTO jobs (id, data) VALUES (?,?)", (job_id, json.dumps(data)))
        conn.commit()
        conn.close()

    def test_T52_BB_get_all_jobs_returns_list(self, isolated_db):
        """BB: Returns a list of all seeded jobs."""
        self._seed_job(isolated_db, 1, "SWE")
        self._seed_job(isolated_db, 2, "PM")
        assert len(database.get_all_jobs()) == 2

    def test_T53_EC_empty_jobs_returns_empty_list(self, isolated_db):
        """EC: Empty jobs table returns empty list."""
        assert database.get_all_jobs() == []

    def test_T54_BB_get_job_by_id_returns_dict(self, isolated_db):
        """BB: Valid job_id returns job dict."""
        self._seed_job(isolated_db, 1, "SWE")
        result = database.get_job_by_id(1)
        assert result is not None
        assert result["title"] == "SWE"

    def test_T55_BB_get_job_by_id_nonexistent_returns_none(self, isolated_db):
        """BB: Non-existent job_id returns None."""
        assert database.get_job_by_id(9999) is None


# ===========================================================================
# get_company_by_id
# ===========================================================================

class TestCompanies:
    def _seed_company(self, db_path, co_id, name):
        data = {"id": co_id, "name": name, "industry": "Tech"}
        conn = sqlite3.connect(db_path)
        conn.execute("INSERT INTO companies (id, data) VALUES (?,?)", (co_id, json.dumps(data)))
        conn.commit()
        conn.close()

    def test_T56_BB_valid_id_returns_company(self, isolated_db):
        """BB: Valid company_id returns company dict."""
        self._seed_company(isolated_db, 1, "Acme")
        result = database.get_company_by_id(1)
        assert result is not None
        assert result["name"] == "Acme"

    def test_T57_BB_nonexistent_id_returns_none(self, isolated_db):
        """BB: Non-existent company_id returns None."""
        assert database.get_company_by_id(9999) is None


# ===========================================================================
# get_all_conversations / get_conversation_by_id
# ===========================================================================

class TestConversations:
    def test_T58_BB_get_all_conversations_has_id_and_participant(self, isolated_db):
        """BB: Each conversation summary has 'id' and 'participantName' fields."""
        seed_conv(isolated_db, conv_id=1, participant_name="Sarah Chen")
        convs = database.get_all_conversations()
        assert len(convs) == 1
        assert convs[0]["id"] == 1
        assert "participantName" in convs[0]

    def test_T59_WB_participant_name_flattened(self, isolated_db):
        """WB: participantName flattened from participant.name dict (lines 482-484)."""
        seed_conv(isolated_db, conv_id=1, participant_name="Bob Smith")
        convs = database.get_all_conversations()
        assert convs[0]["participantName"] == "Bob Smith"

    def test_T60_EC_empty_conversations_returns_empty(self, isolated_db):
        """EC: Empty conversations table returns empty list."""
        assert database.get_all_conversations() == []

    def test_T61_BB_get_conversation_by_id_has_messages(self, isolated_db):
        """BB: get_conversation_by_id returns dict with 'messages' list."""
        seed_conv(isolated_db, conv_id=1)
        seed_message(isolated_db, conv_id=1, text="Hey")
        result = database.get_conversation_by_id(1)
        assert result is not None
        assert isinstance(result["messages"], list)
        assert result["messages"][0]["text"] == "Hey"

    def test_T62_BB_nonexistent_conv_returns_none(self, isolated_db):
        """BB: Non-existent conv_id returns None."""
        assert database.get_conversation_by_id(9999) is None

    def test_T63_WB_is_read_is_python_bool(self, isolated_db):
        """WB: isRead on messages is Python bool, not integer (line 512)."""
        seed_conv(isolated_db, conv_id=1)
        seed_message(isolated_db, conv_id=1, is_read=1)
        result = database.get_conversation_by_id(1)
        assert result["messages"][0]["isRead"] is True

    def test_T64_WB_messages_ordered_by_timestamp_asc(self, isolated_db):
        """WB: Messages are ordered timestamp ASC (line 502)."""
        seed_conv(isolated_db, conv_id=1)
        seed_message(isolated_db, conv_id=1, text="second", ts=9000)
        seed_message(isolated_db, conv_id=1, text="first", ts=1000)
        result = database.get_conversation_by_id(1)
        msgs = result["messages"]
        assert msgs[0]["timestamp"] < msgs[1]["timestamp"]


# ===========================================================================
# send_message
# ===========================================================================

class TestSendMessage:
    def test_T65_BB_returns_message_dict(self, isolated_db):
        """BB: Returns dict with id, senderId, text, timestamp, isRead=False."""
        seed_conv(isolated_db, conv_id=1)
        result = database.send_message(1, 1, "Hello!")
        assert result is not None
        assert result["text"] == "Hello!"
        assert result["senderId"] == 1
        assert result["isRead"] is False
        assert "id" in result
        assert "timestamp" in result

    def test_T66_WB_nonexistent_conv_returns_none(self, isolated_db):
        """WB: Non-existent conv_id returns None (lines 527-529)."""
        assert database.send_message(9999, 1, "Hi") is None

    def test_T67_WB_conv_last_message_updated(self, isolated_db):
        """WB: Conversation metadata lastMessage updated in DB (lines 539-543)."""
        seed_conv(isolated_db, conv_id=1)
        database.send_message(1, 1, "Updated text")
        row = _raw(isolated_db, "SELECT data FROM conversations WHERE id=1")
        meta = json.loads(row["data"])
        assert meta["lastMessage"] == "Updated text"

    def test_T68_EC_long_text_stored(self, isolated_db):
        """EC: 500-character text stored without error."""
        seed_conv(isolated_db, conv_id=1)
        long_text = "y" * 500
        result = database.send_message(1, 1, long_text)
        assert result["text"] == long_text


# ===========================================================================
# get_all_notifications / mark_notification_read / mark_all_notifications_read
# ===========================================================================

class TestNotifications:
    def test_T69_BB_get_all_notifications_has_is_read(self, isolated_db):
        """BB: Each notification has 'isRead' field."""
        seed_notif(isolated_db, notif_id=1, is_read=0)
        notifs = database.get_all_notifications()
        assert len(notifs) == 1
        assert "isRead" in notifs[0]

    def test_T70_WB_is_read_is_python_bool(self, isolated_db):
        """WB: isRead is Python bool, not integer (line 568)."""
        seed_notif(isolated_db, notif_id=1, is_read=0)
        notifs = database.get_all_notifications()
        assert notifs[0]["isRead"] is False

    def test_T71_EC_empty_notifications_returns_empty(self, isolated_db):
        """EC: Empty notifications table returns empty list."""
        assert database.get_all_notifications() == []

    def test_T72_BB_mark_read_returns_dict_with_is_read_true(self, isolated_db):
        """BB: mark_notification_read returns notification dict with isRead=True."""
        seed_notif(isolated_db, notif_id=1, is_read=0)
        result = database.mark_notification_read(1)
        assert result is not None
        assert result["isRead"] is True

    def test_T73_BB_mark_read_nonexistent_returns_none(self, isolated_db):
        """BB: Non-existent notif_id returns None."""
        assert database.mark_notification_read(9999) is None

    def test_T74_WB_is_read_set_to_1_in_db(self, isolated_db):
        """WB: is_read column set to 1 in DB after mark_notification_read (lines 580-581)."""
        seed_notif(isolated_db, notif_id=1, is_read=0)
        database.mark_notification_read(1)
        row = _raw(isolated_db, "SELECT is_read FROM notifications WHERE id=1")
        assert row["is_read"] == 1

    def test_T75_RG_is_read_is_bool_not_int(self, isolated_db):
        """RG: isRead returned as Python True not integer 1 (type regression)."""
        seed_notif(isolated_db, notif_id=1, is_read=0)
        result = database.mark_notification_read(1)
        assert result["isRead"] is True
        assert result["isRead"] != 1 or type(result["isRead"]) is bool

    def test_T76_BB_mark_all_read_sets_all(self, isolated_db):
        """BB: mark_all_notifications_read sets isRead=True on all notifications."""
        for i in range(1, 4):
            seed_notif(isolated_db, notif_id=i, is_read=0)
        database.mark_all_notifications_read()
        notifs = database.get_all_notifications()
        assert all(n["isRead"] is True for n in notifs)

    def test_T77_EC_mark_all_empty_table_no_error(self, isolated_db):
        """EC: mark_all_notifications_read on empty table completes without exception."""
        database.mark_all_notifications_read()  # should not raise


# ===========================================================================
# search
# ===========================================================================

class TestSearch:
    def test_T78_WB_empty_query_short_circuits(self, isolated_db):
        """WB: Empty query hits early return at line 603."""
        result = database.search("")
        assert result["users"] == []
        assert result["jobs"] == []
        assert result["companies"] == []
        assert result["posts"] == []

    def test_T79_WB_whitespace_query_treated_as_empty(self, isolated_db):
        """WB: Whitespace-only query stripped to empty by line 601."""
        result = database.search("   ")
        assert result["users"] == []

    def test_T80_BB_matches_user_by_name(self, isolated_db):
        """BB: Query matching a user's name returns that user."""
        seed_user(isolated_db, uid=1, name="Alice Wonder", email="a@a.com")
        result = database.search("alice")
        assert any(u["name"] == "Alice Wonder" for u in result["users"])

    def test_T81_EP_matches_user_by_headline(self, isolated_db):
        """EP: Headline bucket — user matched via headline field."""
        seed_user(isolated_db, uid=1, email="a@a.com",
                  extra={"headline": "Software Engineer"})
        result = database.search("software")
        assert len(result["users"]) >= 1

    def test_T82_BB_matches_job_by_title(self, isolated_db):
        """BB: Query matching a job title returns that job."""
        data = {"id": 1, "title": "Backend SWE", "company": "Nexus", "location": "NYC"}
        conn = sqlite3.connect(isolated_db)
        conn.execute("INSERT INTO jobs (id, data) VALUES (1,?)", (json.dumps(data),))
        conn.commit()
        conn.close()
        result = database.search("backend")
        assert len(result["jobs"]) == 1

    def test_T83_BB_matches_company_by_name(self, isolated_db):
        """BB: Query matching a company name returns that company."""
        data = {"id": 1, "name": "Acme Corp", "industry": "Tech"}
        conn = sqlite3.connect(isolated_db)
        conn.execute("INSERT INTO companies (id, data) VALUES (1,?)", (json.dumps(data),))
        conn.commit()
        conn.close()
        result = database.search("acme")
        assert len(result["companies"]) == 1

    def test_T84_BB_matches_post_by_content(self, isolated_db):
        """BB: Query matching post content returns that post."""
        seed_user(isolated_db, uid=1, email="a@a.com")
        seed_post(isolated_db, uid=1, content="hello world post")
        result = database.search("hello")
        assert len(result["posts"]) == 1

    def test_T85_GB_case_insensitive_at_boundary(self, isolated_db):
        """GB: Case-insensitive match — 'Alice' and 'alice' return same results."""
        seed_user(isolated_db, uid=1, name="Alice", email="a@a.com")
        upper_result = database.search("Alice")
        lower_result = database.search("alice")
        assert len(upper_result["users"]) == len(lower_result["users"])

    def test_T86_EP_no_match_returns_empty_lists(self, isolated_db):
        """EP: No-match bucket — all result lists are empty."""
        seed_user(isolated_db, uid=1, email="a@a.com")
        result = database.search("zzzzznotfound")
        assert result["users"] == []
        assert result["jobs"] == []
        assert result["companies"] == []
        assert result["posts"] == []
        assert result["query"] == "zzzzznotfound"
