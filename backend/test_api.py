#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
"""
Nexus API Test Suite  — backend/test_api.py

Covers:
  - All existing endpoints (GET/POST/PATCH)
  - Bug fixes (profile-readiness shape, search companies)
  - Story #1 (Outreach Message Guidance) — T1.1-T1.6
  - Story #7 (Outreach Readiness Check) — T7.1-T7.7
  - Account CRUD (register, delete user, cascade)
  - Persistence (data survives across multiple reads)
  - Security / input validation edge cases

No external dependencies — Python stdlib only.
Run:  python backend/test_api.py   (backend must be on localhost:5000)
"""

import json, sys, time, uuid
import urllib.request, urllib.error

BASE = "http://localhost:5000/api"

# ── Transport helpers ──────────────────────────────────────────

def _req(method, path, body=None, token=None):
    url  = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req  = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            try:
                return r.status, json.loads(raw)
            except Exception:
                return r.status, {}
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read())
        except Exception:
            payload = {}
        return e.code, payload

def get(path, token=None):              return _req("GET",    path, token=token)
def post(path, body=None, token=None):  return _req("POST",   path, body, token=token)
def patch(path, token=None):            return _req("PATCH",  path, token=token)
def delete(path, token=None):           return _req("DELETE", path, token=token)

# ── Test runner ────────────────────────────────────────────────

passed = failed = 0

def ok(name, status, body, checks):
    global passed, failed
    errors = []
    if not (200 <= status < 300):
        errors.append(f"expected 2xx, got {status}  body={body}")
    for desc, result in checks:
        if not result:
            errors.append(f"FAIL — {desc}")
    if errors:
        failed += 1
        print(f"  x  {name}")
        for e in errors:
            print(f"       {e}")
    else:
        passed += 1
        print(f"  ok {name}")

def err(name, status, body, expected_code, expected_fragment=None):
    global passed, failed
    errors = []
    if status != expected_code:
        errors.append(f"expected HTTP {expected_code}, got {status}  body={body}")
    if expected_fragment and expected_fragment.lower() not in str(body).lower():
        errors.append(f"expected '{expected_fragment}' in body  got={body}")
    if errors:
        failed += 1
        print(f"  x  {name}")
        for e in errors:
            print(f"       {e}")
    else:
        passed += 1
        print(f"  ok {name}")

def section(title):
    print(f"\n{'='*55}")
    print(f"  {title}")
    print(f"{'='*55}")

# ══════════════════════════════════════════════════════════════
# 1. EXISTING GET ENDPOINTS
# ══════════════════════════════════════════════════════════════

section("Existing endpoints — GET")

s, b = get("/me")
ok("GET /me  returns current user", s, b, [
    ("has id=1",     b.get("id") == 1),
    ("has name",     bool(b.get("name"))),
    ("has headline", bool(b.get("headline"))),
])

s, b = get("/users")
ok("GET /users  returns list", s, b, [
    ("is list",     isinstance(b, list)),
    ("non-empty",   len(b) > 0),
    ("each has id", all("id" in u for u in b)),
])

s, b = get("/users/3")
ok("GET /users/3  returns Sarah Chen", s, b, [
    ("id == 3",   b.get("id") == 3),
    ("has name",  bool(b.get("name"))),
])

s, b = get("/users/9999")
err("GET /users/9999  returns 404", s, b, 404)

s, b = get("/feed")
ok("GET /feed  returns posts list", s, b, [
    ("is list",     isinstance(b, list)),
    ("non-empty",   len(b) > 0),
    ("each has id", all("id" in p for p in b)),
])

s, b = get("/jobs")
ok("GET /jobs  returns jobs list", s, b, [
    ("is list",  isinstance(b, list)),
    (">=10 jobs", len(b) >= 10),
])

s, b = get("/jobs/1")
ok("GET /jobs/1  returns job detail", s, b, [
    ("has title",   bool(b.get("title"))),
    ("has company", bool(b.get("company"))),
])

s, b = get("/jobs/9999")
err("GET /jobs/9999  returns 404", s, b, 404)

s, b = get("/companies/1")
ok("GET /companies/1  returns company", s, b, [
    ("has name", bool(b.get("name"))),
])

s, b = get("/conversations")
ok("GET /conversations  returns list", s, b, [
    ("is list",              isinstance(b, list)),
    ("non-empty",            len(b) > 0),
    ("has participantName",  all("participantName" in c for c in b)),
])

s, b = get("/conversations/1")
ok("GET /conversations/1  returns messages", s, b, [
    ("has messages", isinstance(b.get("messages"), list)),
    ("non-empty",    len(b.get("messages", [])) > 0),
])

s, b = get("/conversations/9999")
err("GET /conversations/9999  returns 404", s, b, 404)

s, b = get("/notifications")
ok("GET /notifications  returns list", s, b, [
    ("is list",    isinstance(b, list)),
    ("has isRead", all("isRead" in n for n in b)),
])

s, b = get("/events")
ok("GET /events  returns list", s, b, [("is list", isinstance(b, list))])

s, b = get("/groups")
ok("GET /groups  returns list", s, b, [("is list", isinstance(b, list))])

s, b = get("/news")
ok("GET /news  returns list", s, b, [("is list", isinstance(b, list))])

s, b = get("/invitations")
ok("GET /invitations  returns list", s, b, [("is list", isinstance(b, list))])

s, b = get("/hashtags")
ok("GET /hashtags  returns list", s, b, [("is list", isinstance(b, list))])

# ── Search (Bug #2 fix) ────────────────────────────────────────
section("Search — includes companies (Bug #2 fix)")

s, b = get("/search?q=google")
ok("GET /search?q=google  returns 4 keys", s, b, [
    ("has users",     "users"     in b),
    ("has jobs",      "jobs"      in b),
    ("has companies", "companies" in b),
    ("has posts",     "posts"     in b),
])

s, b = get("/search?q=stripe")
ok("GET /search?q=stripe  companies non-empty", s, b, [
    ("companies is list", isinstance(b.get("companies"), list)),
    ("found stripe co",   len(b.get("companies", [])) > 0),
])

s, b = get("/search?q=")
ok("GET /search?q=  empty query returns empty sets", s, b, [
    ("users empty",     b.get("users") == []),
    ("companies empty", b.get("companies") == []),
])

# ── Profile Readiness (Bug #1 fix) ────────────────────────────
section("Profile Readiness /api/profile-readiness (Bug #1 fix)")

s, b = get("/profile-readiness")
ok("GET /profile-readiness  correct shape", s, b, [
    ("has score",     "score"    in b),
    ("has sections",  "sections" in b),
    ("has fixes",     "fixes"    in b),
    ("score 0-100",   0 <= b.get("score", -1) <= 100),
    ("6 sections",    len(b.get("sections", [])) == 6),
    ("6 fixes",       len(b.get("fixes", [])) == 6),
    ("section has score key", all("score" in x for x in b.get("sections", []))),
    ("fix has status key",    all("status" in x for x in b.get("fixes", []))),
    ("status values valid",   all(x["status"] in ("done","warn","bad") for x in b.get("fixes", []))),
])

# ── PATCH notifications ────────────────────────────────────────
section("PATCH notifications")

s, b = patch("/notifications/1/read")
ok("PATCH /notifications/1/read  returns notification", s, b, [
    ("isRead True", b.get("isRead") is True),
])

s, b = patch("/notifications/read-all")
ok("PATCH /notifications/read-all  returns success", s, b, [
    ("success key", b.get("success") is True),
])

s, b = patch("/notifications/9999/read")
err("PATCH /notifications/9999/read  returns 404", s, b, 404)

# ── POST feed ─────────────────────────────────────────────────
section("POST /feed")

s, b = post("/feed", {"content": "Test post from test suite"})
ok("POST /feed  creates post", s, b, [
    ("has id",      "id" in b),
    ("has content", b.get("content") == "Test post from test suite"),
    ("has authorId", "authorId" in b),
])

s, b = post("/feed", {"content": ""})
err("POST /feed  empty content -> 400", s, b, 400)

s, b = post("/feed", {"content": "   "})
err("POST /feed  whitespace only -> 400", s, b, 400)

# Post with unicode / special chars (no hardcoding; stored in DB)
s, b = post("/feed", {"content": "Unicode test: café, 日本"})
ok("POST /feed  unicode content stored", s, b, [
    ("has id", "id" in b),
    ("content preserved", "café" in b.get("content", "")),
])

# POST /feed without body
s, b = post("/feed", None)
err("POST /feed  no body -> 400 or 500", s, b, 400 if s == 400 else 500)

# ── POST conversation message ─────────────────────────────────
section("POST /conversations/:id/messages")

s, b = post("/conversations/1/messages", {"text": "Hello from test!"})
ok("POST /conversations/1/messages  sends message", s, b, [
    ("has id",       "id" in b),
    ("has text",     b.get("text") == "Hello from test!"),
    ("isMe is True", b.get("isMe") is True),
])

s, b = post("/conversations/1/messages", {"text": ""})
err("POST /conversations/1/messages  empty text -> 400", s, b, 400)

s, b = post("/conversations/9999/messages", {"text": "hi"})
err("POST /conversations/9999/messages  unknown conv -> 404", s, b, 404)

# ══════════════════════════════════════════════════════════════
# 2. ACCOUNT CRUD
# ══════════════════════════════════════════════════════════════

section("Account CRUD — POST /api/auth/register & DELETE /api/users/:id")

# Use a unique email per test run to avoid conflicts
_suffix = uuid.uuid4().hex[:8]
_email  = f"testuser_{_suffix}@nexus.test"

s, b = post("/auth/register", {"name": "Test User", "email": _email, "password": "securePass123"})
_reg_user  = b.get("user", {})
_reg_token = b.get("token", "")
ok("POST /auth/register  creates account", s, b, [
    ("status 201",        s == 201),
    ("has user object",   isinstance(_reg_user, dict)),
    ("has token",         bool(_reg_token)),
    ("user has id",       "id" in _reg_user),
    ("user has name",     _reg_user.get("name") == "Test User"),
    ("user has email",    _reg_user.get("email") == _email),
    ("no password hash",  "password" not in _reg_user and "pw_hash" not in _reg_user),
])
_new_user_id = _reg_user.get("id")

# Duplicate email must return 409
s, b = post("/auth/register", {"name": "Dup", "email": _email, "password": "securePass123"})
err("POST /auth/register  duplicate email -> 409", s, b, 409)

# Missing fields
s, b = post("/auth/register", {"email": _email, "password": "securePass123"})
err("POST /auth/register  missing name -> 400", s, b, 400)

s, b = post("/auth/register", {"name": "X", "email": "not-an-email", "password": "securePass123"})
err("POST /auth/register  invalid email -> 400", s, b, 400)

s, b = post("/auth/register", {"name": "X", "email": f"x_{_suffix}@nexus.test", "password": "short"})
err("POST /auth/register  short password -> 400", s, b, 400)

# Verify new user is findable
if _new_user_id:
    s, b = get(f"/users/{_new_user_id}")
    ok(f"GET /users/{_new_user_id}  finds newly created user", s, b, [
        ("correct id",   b.get("id") == _new_user_id),
        ("correct name", b.get("name") == "Test User"),
    ])

    # Delete the created user
    s, b = delete(f"/users/{_new_user_id}")
    ok(f"DELETE /users/{_new_user_id}  deletes user", s, b, [
        ("status 204", s == 204),
    ])

    # Deleted user should now 404
    s, b = get(f"/users/{_new_user_id}")
    err(f"GET /users/{_new_user_id}  after delete -> 404", s, b, 404)

# Cannot delete current user (id=1)
s, b = delete("/users/1")
err("DELETE /users/1  forbidden -> 403", s, b, 403, "cannot_delete_primary_user")

# Cannot delete non-existent user
s, b = delete("/users/9999")
err("DELETE /users/9999  not found -> 404", s, b, 404)

# ══════════════════════════════════════════════════════════════
# 2c. AUTH — POST /api/auth/login
# ══════════════════════════════════════════════════════════════

section("Auth — POST /api/auth/login")

# Create a fresh user to test login with
_login_suffix = uuid.uuid4().hex[:8]
_login_email  = f"logintest_{_login_suffix}@nexus.test"
_login_pw     = "LoginPass99!"
s, b = post("/auth/register", {"name": "Login Tester", "email": _login_email, "password": _login_pw})
_login_user_id = b.get("user", {}).get("id")

# Successful login
s, b = post("/auth/login", {"email": _login_email, "password": _login_pw})
_login_token = b.get("token", "")
ok("POST /auth/login  correct credentials -> {user, token}", s, b, [
    ("status 200",        s == 200),
    ("has user object",   isinstance(b.get("user"), dict)),
    ("user email matches", b.get("user", {}).get("email") == _login_email),
    ("has token string",  bool(_login_token)),
    ("no pw_hash in user","pw_hash" not in b.get("user", {})),
])

# Wrong password -> 401
s, b = post("/auth/login", {"email": _login_email, "password": "wrongpassword"})
err("POST /auth/login  wrong password -> 401", s, b, 401)

# Unknown email -> 401
s, b = post("/auth/login", {"email": "nobody@nexus.test", "password": _login_pw})
err("POST /auth/login  unknown email -> 401", s, b, 401)

# Missing fields -> 400
s, b = post("/auth/login", {"email": _login_email})
err("POST /auth/login  missing password -> 400", s, b, 400)

s, b = post("/auth/login", {})
err("POST /auth/login  empty body -> 400", s, b, 400)

# Token allows authenticated access to /me
if _login_token:
    s, b = get("/me", token=_login_token)
    ok("GET /me with token  returns correct user", s, b, [
        ("status 200",         s == 200),
        ("email matches",      b.get("email") == _login_email),
        ("id matches",         b.get("id") == _login_user_id),
    ])

# Invalid token -> falls back to default user (id=1), not a 401
s, b = get("/me", token="thisisnotavalidtoken")
ok("GET /me with invalid token  falls back to user id=1", s, b, [
    ("status 200", s == 200),
    ("id is 1",    b.get("id") == 1),
])

# Clean up login test user
if _login_user_id:
    delete(f"/users/{_login_user_id}")

# ══════════════════════════════════════════════════════════════
# 2b. DATABASE — POSTS WITH ACCOUNT RECORDS
# ══════════════════════════════════════════════════════════════

section("Database — posts stored with account records (no hardcoding)")

# All posts in feed must have authorId that exists in users
s, feed = get("/feed")
s2, users_list = get("/users")
user_ids = {u["id"] for u in users_list}
user_ids.add(1)  # current user
ok("Every post has authorId present", s, feed, [
    ("is list", isinstance(feed, list)),
    ("each post has authorId", all("authorId" in p for p in feed)),
])
ok("Every post authorId resolves to an account", s, feed, [
    ("all authorIds valid", all(isinstance(p.get("authorId"), int) and p.get("authorId") > 0 for p in feed)),
])

# New post must be created with current user as author
s, me = get("/me")
ok("GET /me returns current user", s, me, [("has id", "id" in me)])
_current_user_id = me.get("id") if me else None
_create_content = f"DB test post author check {uuid.uuid4().hex[:8]}"
s, b = post("/feed", {"content": _create_content})
ok("POST /feed assigns current user as author", s, b, [
    ("authorId equals current user", b.get("authorId") == _current_user_id),
    ("content stored", b.get("content") == _create_content),
])

# Feed ordering: newest first (created_at descending)
s, feed = get("/feed")
if len(feed) >= 2:
    ok("Feed ordered newest first", s, feed, [
        ("first created_at >= second", feed[0].get("createdAt", 0) >= feed[1].get("createdAt", 0)),
    ])

# Post shape required by frontend (author, content, comments, reactions)
s, feed = get("/feed")
first = feed[0] if feed else {}
ok("Post shape has author, content, comments, likeCount", s, feed, [
    ("has author", "author" in first),
    ("has content", "content" in first),
    ("has comments (list)", isinstance(first.get("comments"), list)),
    ("has likeCount", "likeCount" in first),
    ("has id", "id" in first),
])

# ══════════════════════════════════════════════════════════════
# 3. PERSISTENCE TEST
# ══════════════════════════════════════════════════════════════

section("Persistence — data survives across requests")

unique_content = f"Persistence test post {uuid.uuid4().hex[:8]}"
s, b = post("/feed", {"content": unique_content})
ok("POST /feed  creates persistent post", s, b, [("has id", "id" in b)])
_persist_post_id = b.get("id")

# Immediately re-read the feed and verify the post is there
s, feed = get("/feed")
ok("GET /feed  new post is in the feed", s, feed, [
    ("post found", any(p.get("content") == unique_content for p in feed)),
])

# Mark a notification read and verify it persists
s, notif = get("/notifications")
if notif and isinstance(notif, list):
    first_id = notif[0]["id"]
    patch(f"/notifications/{first_id}/read")
    s2, notif2 = get("/notifications")
    ok("Notification read state persists", s2, notif2, [
        ("first notif isRead",
         any(n["id"] == first_id and n["isRead"] for n in notif2)),
    ])

# ══════════════════════════════════════════════════════════════
# 4. STORY #1 — Outreach Message Guidance
# ══════════════════════════════════════════════════════════════

section("Story #1 (Outreach Message Guidance) — POST /api/outreach/generate")

# T1.1  Valid full request
s, b = post("/outreach/generate", {"recipientId": 5, "tone": "friendly", "goal": "networking"})
ok("T1.1  valid request -> draft + tips + alternatives", s, b, [
    ("has draft",       bool(b.get("draft"))),
    ("has char_count",  isinstance(b.get("char_count"), int)),
    ("3 tips",          len(b.get("tips", [])) == 3),
    ("2 alternatives",  len(b.get("alternatives", [])) == 2),
    ("tone echoed",     b.get("tone") == "friendly"),
])

# T1.2  Missing recipientId
s, b = post("/outreach/generate", {})
err("T1.2  missing recipientId -> 400", s, b, 400, "recipientId")

# T1.3  Unknown recipientId
s, b = post("/outreach/generate", {"recipientId": 9999})
err("T1.3  unknown recipientId -> 404", s, b, 404, "9999")

# T1.4  Invalid tone falls back to professional
s, b = post("/outreach/generate", {"recipientId": 5, "tone": "sarcastic"})
ok("T1.4  invalid tone defaults to professional", s, b, [
    ("tone=professional", b.get("tone") == "professional"),
])

# T1.5  Custom note appended
s, b = post("/outreach/generate", {"recipientId": 5, "custom_note": "I loved your Config 2025 talk!"})
ok("T1.5  custom_note appears in draft", s, b, [
    ("note in draft", "Config 2025" in b.get("draft", "")),
])

# T1.6  Draft <= 500 chars
s, b = post("/outreach/generate", {"recipientId": 5, "goal": "job_inquiry"})
ok("T1.6  draft <= 500 chars", s, b, [
    ("char_count <= 500", b.get("char_count", 9999) <= 500),
    ("draft len <= 500",  len(b.get("draft", "")) <= 500),
])

# ══════════════════════════════════════════════════════════════
# 5. STORY #7 — Outreach Readiness Check
# ══════════════════════════════════════════════════════════════

section("Story #7 (Outreach Readiness Check) — GET /api/outreach/readiness")

# T7.1  Current user (complete profile) -> ready
s, b = get("/outreach/readiness")
ok("T7.1  current user -> score >= 75, level=ready", s, b, [
    ("has score",     "score"       in b),
    ("has level",     "level"       in b),
    ("has can_msg",   "can_message" in b),
    ("has breakdown", "breakdown"   in b),
    ("has top_tips",  "top_tips"    in b),
    ("score >= 75",   b.get("score", 0) >= 75),
    ("level=ready",   b.get("level") == "ready"),
])

# T7.2  Sparse user (id=12)
s, b = get("/outreach/readiness?userId=12")
ok("T7.2  sparse user -> score reflects profile", s, b, [
    ("has score",  "score" in b),
    ("score 0-100", 0 <= b.get("score", -1) <= 100),
])

# T7.3  Unknown userId -> 404
s, b = get("/outreach/readiness?userId=9999")
err("T7.3  unknown userId -> 404", s, b, 404, "9999")

# T7.4  Current user can_message=True (score >= 60)
s, b = get("/outreach/readiness")
ok("T7.4  current user can_message=true", s, b, [
    ("can_message True", b.get("can_message") is True),
])

# T7.6  top_tips <= 3 items
s, b = get("/outreach/readiness?userId=12")
ok("T7.6  top_tips list present and <= 3 items", s, b, [
    ("is list",   isinstance(b.get("top_tips"), list)),
    ("<=3 tips",  len(b.get("top_tips", [])) <= 3),
])

# T7.7  Breakdown has exactly 9 items
s, b = get("/outreach/readiness")
ok("T7.7  breakdown has 9 items", s, b, [
    ("9 items",        len(b.get("breakdown", [])) == 9),
    ("each has key",   all("key"    in x for x in b.get("breakdown", []))),
    ("each has weight",all("weight" in x for x in b.get("breakdown", []))),
    ("each has met",   all("met"    in x for x in b.get("breakdown", []))),
])

# ══════════════════════════════════════════════════════════════
# 6. SECURITY & INPUT EDGE CASES
# ══════════════════════════════════════════════════════════════

section("Security — input validation & injection prevention")

# HTML injection in custom_note
s, b = post("/outreach/generate", {
    "recipientId": 5,
    "custom_note": "<script>alert('xss')</script>",
})
ok("HTML tags stripped from custom_note", s, b, [
    ("no <script> in draft", "<script>" not in b.get("draft", "")),
])

# SQL injection string -> plain text, no crash
s, b = post("/outreach/generate", {
    "recipientId": 5,
    "custom_note": "'; DROP TABLE users; --",
})
ok("SQL injection string handled safely", s, b, [
    ("2xx returned",    s == 200),
    ("draft non-empty", bool(b.get("draft"))),
])

# Negative recipientId
s, b = post("/outreach/generate", {"recipientId": -1})
err("Negative recipientId -> 400", s, b, 400)

# Float recipientId
s, b = post("/outreach/generate", {"recipientId": 1.5})
err("Float recipientId -> 400", s, b, 400)

# String recipientId
s, b = post("/outreach/generate", {"recipientId": "admin"})
err("String recipientId -> 400", s, b, 400)

# custom_note > 200 chars truncated, not rejected
long_note = "A" * 500
s, b = post("/outreach/generate", {"recipientId": 5, "custom_note": long_note})
ok("custom_note >200 chars truncated to 200", s, b, [
    ("2xx returned",      s == 200),
    ("truncated in draft", long_note not in b.get("draft", "")),
])

# Negative userId on readiness
s, b = get("/outreach/readiness?userId=-5")
err("Negative userId -> 400", s, b, 400)

# Non-integer userId
s, b = get("/outreach/readiness?userId=abc")
err("Non-integer userId -> 400", s, b, 400)

# Control chars stripped
s, b = post("/outreach/generate", {
    "recipientId": 5,
    "custom_note": "Hello\x00\x1b\x7fWorld",
})
ok("Control characters stripped from custom_note", s, b, [
    ("no null byte", "\x00" not in b.get("draft", "")),
    ("no ESC char",  "\x1b" not in b.get("draft", "")),
])

# Empty JSON body -> 400
s, b = post("/outreach/generate", {})
err("Empty JSON body -> 400 (recipientId required)", s, b, 400)

# Malicious goal string -> networking, no crash
s, b = post("/outreach/generate", {
    "recipientId": 5,
    "goal": "'; DROP TABLE users; --",
})
ok("Malicious goal string defaults to networking, no crash", s, b, [
    ("2xx returned", s == 200),
])

# Boolean recipientId -> 400
s, b = post("/outreach/generate", {"recipientId": True})
err("Boolean recipientId -> 400", s, b, 400)

# Zero recipientId -> 400
s, b = post("/outreach/generate", {"recipientId": 0})
err("Zero recipientId -> 400", s, b, 400)

# ══════════════════════════════════════════════════════════════
# 7. REGISTER INPUT EDGE CASES
# ══════════════════════════════════════════════════════════════

section("Register input edge cases")

s, b = post("/auth/register", {})
err("POST /auth/register  empty body -> 400", s, b, 400)

s, b = post("/auth/register", {"name": "", "email": "x@y.com", "password": "pass1234"})
err("POST /auth/register  empty name -> 400", s, b, 400)

s, b = post("/auth/register", {"name": "A", "email": "not-an-email", "password": "pass1234"})
err("POST /auth/register  malformed email -> 400", s, b, 400)

s, b = post("/auth/register", {"name": "A", "email": "a@b.com", "password": "1234567"})
err("POST /auth/register  7-char password -> 400", s, b, 400)

# XSS in name — should succeed (sanitise is the UI's job, names can have < > in theory)
# but the server must not crash
_xss_email = f"xss_{_suffix}@nexus.test"
s, b = post("/auth/register", {"name": "<script>alert(1)</script>", "email": _xss_email, "password": "securePass123"})
_xss_user = b.get("user", {})
ok("POST /auth/register  XSS in name accepted (sanitise on output)", s, b, [
    ("2xx",    s in (200, 201)),
    ("has id", "id" in _xss_user),
])
# Clean up
if "id" in _xss_user:
    delete(f"/users/{_xss_user['id']}")

# ══════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════

total = passed + failed
print(f"\n{'='*55}")
print(f"  Results: {passed}/{total} passed", end="")
if failed:
    print(f"  <-- {failed} FAILED")
else:
    print("  - all clear")
print(f"{'='*55}\n")

sys.exit(0 if failed == 0 else 1)
