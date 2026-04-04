#!/usr/bin/env python3
"""
Frontend API contract tests — backend/test_frontend_contract.py

Simulates the same API calls the frontend (api.js) makes and asserts
response shapes the UI expects. No frontend code is changed.

Run: python backend/test_frontend_contract.py  (backend on localhost:5000)
"""

import json
import urllib.request
import urllib.error
import sys

BASE = "http://localhost:5000/api"

def req(method, path, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(
        url, data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(r) as res:
            raw = res.read()
            return res.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read())
        except Exception:
            payload = {}
        return e.code, payload

def get(path):
    return req("GET", path)
def post(path, body=None):
    return req("POST", path, body)
def patch(path):
    return req("PATCH", path)
def delete(path):
    return req("DELETE", path)

passed = failed = 0

def ok(name, status, body, checks):
    global passed, failed
    errs = []
    if status not in (200, 201):
        errs.append(f"expected 2xx, got {status}")
    for desc, result in checks:
        if not result:
            errs.append(desc)
    if errs:
        failed += 1
        print(f"  x  {name}")
        for e in errs:
            print(f"       {e}")
    else:
        passed += 1
        print(f"  ok {name}")

def err(name, status, body, code):
    global passed, failed
    if status != code:
        failed += 1
        print(f"  x  {name}  (expected {code}, got {status})")
    else:
        passed += 1
        print(f"  ok {name}")

def section(t):
    print(f"\n--- {t} ---")

# ── Contract: getMe() ─────────────────────────────────────────
section("Frontend: getMe()")
s, b = get("/me")
ok("GET /me  shape: id, name, headline, experience, education, skills", s, b, [
    ("status 200", s == 200),
    ("id", isinstance(b.get("id"), int)),
    ("name", isinstance(b.get("name"), str)),
    ("headline", "headline" in b),
    ("experience", isinstance(b.get("experience"), list)),
    ("education", isinstance(b.get("education"), list)),
    ("skills", isinstance(b.get("skills"), list)),
])

# ── Contract: getUsers(), getUser(id) ──────────────────────────
section("Frontend: getUsers() / getUser(id)")
s, b = get("/users")
ok("GET /users  list of objects with id, name", s, b, [
    ("is list", isinstance(b, list)),
    ("each has id", all("id" in u for u in b)),
    ("each has name", all("name" in u for u in b)),
])
if b:
    uid = b[0]["id"]
    s2, u = get(f"/users/{uid}")
    ok(f"GET /users/{uid}  single user shape", s2, u, [
        ("id", u.get("id") == uid),
        ("name", isinstance(u.get("name"), str)),
    ])

# ── Contract: getFeed(), createPost(content) ─────────────────────
section("Frontend: getFeed() / createPost(content)")
s, b = get("/feed")
ok("GET /feed  list of posts with author, content, comments, likeCount", s, b, [
    ("is list", isinstance(b, list)),
    ("each has id", all("id" in p for p in b)),
    ("each has author", all("author" in p for p in b)),
    ("each has content", all("content" in p for p in b)),
    ("each has comments", all("comments" in p for p in b)),
    ("each has likeCount", all("likeCount" in p for p in b)),
    ("each has authorId", all("authorId" in p for p in b)),
])
s, b = post("/feed", {"content": "Contract test post"})
ok("POST /feed  returns post with author, content, id, authorId", s, b, [
    ("status 201", s == 201),
    ("id", "id" in b),
    ("content", b.get("content") == "Contract test post"),
    ("author", "author" in b),
    ("authorId", "authorId" in b),
])

# ── Contract: getJobs(), getJob(id) ────────────────────────────
section("Frontend: getJobs() / getJob(id)")
s, b = get("/jobs")
ok("GET /jobs  list with id, title, company", s, b, [
    ("is list", isinstance(b, list)),
    ("each has id, title, company", all("id" in j and "title" in j and "company" in j for j in b)),
])
if b:
    s2, j = get(f"/jobs/{b[0]['id']}")
    ok("GET /jobs/:id  job detail shape", s2, j, [
        ("title", "title" in j),
        ("company", "company" in j),
    ])

# ── Contract: getCompany(id) ──────────────────────────────────
section("Frontend: getCompany(id)")
s, b = get("/companies/1")
ok("GET /companies/1  company with name", s, b, [
    ("name", "name" in b),
    ("id", b.get("id") == 1),
])

# ── Contract: getConversations(), getConversation(id) ───────────
section("Frontend: getConversations() / getConversation(id)")
s, b = get("/conversations")
ok("GET /conversations  list with participantName, messages", s, b, [
    ("is list", isinstance(b, list)),
    ("each has participantName or participantId", all("participantName" in c or "participantId" in c for c in b)),
])
if b:
    cid = b[0]["id"]
    s2, c = get(f"/conversations/{cid}")
    ok("GET /conversations/:id  has messages array", s2, c, [
        ("messages", isinstance(c.get("messages"), list)),
    ])

# ── Contract: getNotifications(), markRead(), markAllRead() ─────
section("Frontend: getNotifications() / markRead() / markAllRead()")
s, b = get("/notifications")
ok("GET /notifications  list with id, isRead, type, content", s, b, [
    ("is list", isinstance(b, list)),
    ("each has id, isRead", all("id" in n and "isRead" in n for n in b)),
])
if b:
    s2, n = patch(f"/notifications/{b[0]['id']}/read")
    ok("PATCH /notifications/:id/read  returns notification with isRead", s2, n, [
        ("isRead", n.get("isRead") is True),
    ])
s, b = patch("/notifications/read-all")
ok("PATCH /notifications/read-all  returns success", s, b, [
    ("success", b.get("success") is True),
])

# ── Contract: search(q) ────────────────────────────────────────
section("Frontend: search(q)")
s, b = get("/search?q=test")
ok("GET /search?q=  returns users, jobs, companies, posts", s, b, [
    ("users", "users" in b),
    ("jobs", "jobs" in b),
    ("companies", "companies" in b),
    ("posts", "posts" in b),
])

# ── Contract: getProfileReadiness() ─────────────────────────────
section("Frontend: getProfileReadiness()")
s, b = get("/profile-readiness")
ok("GET /profile-readiness  score, sections, fixes", s, b, [
    ("score", "score" in b and 0 <= b["score"] <= 100),
    ("sections", isinstance(b.get("sections"), list)),
    ("fixes", isinstance(b.get("fixes"), list)),
])

# ── Contract: getOutreachReadiness(), generateOutreachMessage() ─
section("Frontend: getOutreachReadiness() / generateOutreachMessage()")
s, b = get("/outreach/readiness")
ok("GET /outreach/readiness  score, level, can_message, breakdown, top_tips", s, b, [
    ("score", "score" in b),
    ("level", "level" in b),
    ("can_message", "can_message" in b),
    ("breakdown", isinstance(b.get("breakdown"), list)),
    ("top_tips", isinstance(b.get("top_tips"), list)),
])
s, b = post("/outreach/generate", {"recipientId": 2, "tone": "professional", "goal": "networking"})
ok("POST /outreach/generate  draft, tips, alternatives", s, b, [
    ("draft", "draft" in b),
    ("tips", isinstance(b.get("tips"), list)),
    ("alternatives", isinstance(b.get("alternatives"), list)),
])

# ── Contract: register(), deleteUser() ─────────────────────────
section("Frontend: register() / deleteUser()")
import uuid
email = f"contract_{uuid.uuid4().hex[:8]}@test.local"
s, b = post("/auth/register", {"name": "Contract User", "email": email, "password": "password123"})
_reg_user = b.get("user", {})
ok("POST /auth/register  returns user with id, no password", s, b, [
    ("status 201", s == 201),
    ("has user object", isinstance(_reg_user, dict)),
    ("id", "id" in _reg_user),
    ("name", _reg_user.get("name") == "Contract User"),
    ("no password", "password" not in _reg_user and "pw_hash" not in _reg_user),
    ("has token", bool(b.get("token"))),
])
if s == 201 and "id" in _reg_user:
    uid = _reg_user["id"]
    s2, _ = delete(f"/users/{uid}")
    err(f"DELETE /users/{uid}  returns 204", s2, None, 204)

# ── Contract: sendMessage(id, text) ─────────────────────────────
section("Frontend: sendMessage(id, text)")
s, b = get("/conversations")
if b:
    cid = b[0]["id"]
    s2, m = post(f"/conversations/{cid}/messages", {"text": "Contract test message"})
    ok("POST /conversations/:id/messages  returns message with text, id", s2, m, [
        ("id", "id" in m),
        ("text", m.get("text") == "Contract test message"),
    ])

# ── Contract: static endpoints (events, groups, courses, etc.) ──
section("Frontend: events, groups, courses, news, invitations, hashtags")
for path, key in [
    ("/events", "list"),
    ("/groups", "list"),
    ("/courses", "list"),
    ("/news", "list"),
    ("/invitations", "list"),
    ("/hashtags", "list"),
]:
    s, b = get(path)
    ok(f"GET {path}  returns array", s, b, [
        ("status 200", s == 200),
        ("is list", isinstance(b, list)),
    ])

# ── What doesn't work (frontend expectations that fail) ─────────
section("Frontend: known gaps (document only)")
# GET /users/9999 -> 404: frontend must handle 404
s, b = get("/users/99999")
if s == 404:
    print("  ok GET /users/99999 returns 404 (frontend must handle)")
    passed += 1
else:
    print("  x  GET /users/99999 expected 404")
    failed += 1
# GET /feed when empty still returns []
s, b = get("/feed")
if isinstance(b, list):
    print("  ok GET /feed always returns array")
    passed += 1
else:
    print("  x  GET /feed must return array")
    failed += 1

# ── Summary ────────────────────────────────────────────────────
total = passed + failed
print(f"\n{'='*55}")
print(f"  Frontend contract: {passed}/{total} passed", end="")
if failed:
    print(f"  ({failed} failed)")
else:
    print("  - all clear")
print(f"{'='*55}\n")
sys.exit(0 if failed == 0 else 1)
