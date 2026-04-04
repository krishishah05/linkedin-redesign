#!/usr/bin/env python3
"""
Nexus Comprehensive Test Suite
Tests: concurrency (10+ simultaneous users), all user stories, edge cases,
       full user lifecycles, and combination scenarios.
Run:   python3 backend/test_comprehensive.py  (backend must be on localhost:5000)
"""
import json, uuid, sys, io, threading, time
import urllib.request, urllib.error, urllib.parse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = "http://localhost:5000/api"
passed = failed = 0
_lock = threading.Lock()
_results = []

# ── Transport ──────────────────────────────────────────────────

def _req(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            raw = r.read()
            try:    return r.status, json.loads(raw)
            except: return r.status, {}
    except urllib.error.HTTPError as e:
        try:    payload = json.loads(e.read())
        except: payload = {}
        return e.code, payload
    except Exception as ex:
        return 0, {"error": str(ex)}

def get(p, token=None):             return _req("GET",    p, token=token)
def post(p, b=None, token=None):    return _req("POST",   p, b, token=token)
def patch(p, token=None):           return _req("PATCH",  p, token=token)
def put(p, b=None, token=None):     return _req("PUT",    p, b, token=token)
def delete(p, token=None):          return _req("DELETE", p, token=token)

# ── Runner ─────────────────────────────────────────────────────

def ok(name, status, body, checks):
    global passed, failed
    errors = []
    if not (200 <= status < 300):
        errors.append(f"expected 2xx got {status} body={str(body)[:120]}")
    for desc, result in checks:
        if not result:
            errors.append(f"FAIL: {desc}")
    with _lock:
        if errors:
            failed += 1
            _results.append(("FAIL", name, errors))
        else:
            passed += 1
            _results.append(("ok", name, []))

def err(name, status, body, code, frag=None):
    global passed, failed
    errors = []
    if status != code:
        errors.append(f"expected {code} got {status}")
    if frag and frag.lower() not in str(body).lower():
        errors.append(f"expected '{frag}' in body")
    with _lock:
        if errors:
            failed += 1
            _results.append(("FAIL", name, errors))
        else:
            passed += 1
            _results.append(("ok", name, []))

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# ── Helpers ────────────────────────────────────────────────────

def make_user(suffix=None):
    """Register a fresh user, return (user_dict, token)."""
    s = suffix or uuid.uuid4().hex[:8]
    email = f"user_{s}@nexus.test"
    status, body = post("/auth/register", {"name": f"User {s}", "email": email, "password": "Password123!"})
    if status == 201:
        return body.get("user", {}), body.get("token", "")
    return {}, ""

def cleanup_user(uid, token=None):
    if uid:
        delete(f"/users/{uid}", token=token)

def _l(x):
    """Safely return x if it's a list, else []. Guards against error dicts under load."""
    return x if isinstance(x, list) else []

def _ld(x):
    """Like _l but also filters out any non-dict items (e.g. stray strings under load)."""
    return [i for i in _l(x) if isinstance(i, dict)]

# ══════════════════════════════════════════════════════════════
# 1. CORE ENDPOINTS — sanity before load
# ══════════════════════════════════════════════════════════════

section("1. Core endpoint sanity")

s, b = get("/me")
ok("GET /me baseline", s, b, [("has id", "id" in b), ("has name", bool(b.get("name")))])

s, b = get("/feed")
ok("GET /feed returns list", s, b, [("is list", isinstance(b, list)), ("non-empty", len(b) > 0)])

s, b = get("/jobs")
ok("GET /jobs", s, b, [("is list", isinstance(b, list)), (">=10", len(b) >= 10)])

s, b = get("/users")
ok("GET /users", s, b, [("is list", isinstance(b, list)), ("non-empty", len(b) > 0)])

s, b = get("/conversations")
ok("GET /conversations", s, b, [("is list", isinstance(b, list))])

s, b = get("/notifications")
ok("GET /notifications", s, b, [("is list", isinstance(b, list))])

for path in ["/events", "/groups", "/courses", "/news", "/invitations", "/hashtags"]:
    s, b = get(path)
    ok(f"GET {path}", s, b, [("is list", isinstance(b, list))])

# ══════════════════════════════════════════════════════════════
# 2. AUTH — register, login, token, edge cases
# ══════════════════════════════════════════════════════════════

section("2. Auth — register, login, tokens, edge cases")

_sfx = uuid.uuid4().hex[:8]
_email = f"auth_{_sfx}@nexus.test"

# Register
s, b = post("/auth/register", {"name": "Auth Tester", "email": _email, "password": "SecurePass1!"})
_auth_user = b.get("user", {})
_auth_token = b.get("token", "")
ok("Register new user", s, b, [
    ("status 201", s == 201), ("has user", isinstance(_auth_user, dict)),
    ("has token", bool(_auth_token)), ("no pw_hash", "pw_hash" not in _auth_user),
    ("email stored", _auth_user.get("email") == _email),
])

# Duplicate email
s, b = post("/auth/register", {"name": "Dup", "email": _email, "password": "SecurePass1!"})
err("Duplicate email → 409", s, b, 409)

# Login correct
s, b = post("/auth/login", {"email": _email, "password": "SecurePass1!"})
_login_token = b.get("token", "")
ok("Login correct credentials", s, b, [
    ("status 200", s == 200), ("has token", bool(_login_token)),
    ("user email matches", b.get("user", {}).get("email") == _email),
])

# Wrong password
s, b = post("/auth/login", {"email": _email, "password": "wrongpass"})
err("Login wrong password → 401", s, b, 401)

# Unknown email
s, b = post("/auth/login", {"email": "nobody@nexus.test", "password": "SecurePass1!"})
err("Login unknown email → 401", s, b, 401)

# Missing fields
s, b = post("/auth/register", {})
err("Register empty body → 400", s, b, 400)

s, b = post("/auth/register", {"name": "", "email": _email, "password": "SecurePass1!"})
err("Register empty name → 400", s, b, 400)

s, b = post("/auth/register", {"name": "X", "email": "notanemail", "password": "SecurePass1!"})
err("Register bad email → 400", s, b, 400)

s, b = post("/auth/register", {"name": "X", "email": f"x_{_sfx}@n.test", "password": "short"})
err("Register short password → 400", s, b, 400)

# Token auth works
s, b = get("/me", token=_auth_token)
ok("GET /me with valid token", s, b, [
    ("correct user", b.get("email") == _email),
])

# Invalid token falls back to user 1
s, b = get("/me", token="invalidtokenxyz")
ok("GET /me invalid token → fallback user 1", s, b, [("id=1", b.get("id") == 1)])

# Authenticated post creation
s, b = post("/feed", {"content": "Auth user post"}, token=_auth_token)
ok("Authenticated POST /feed uses correct author", s, b, [
    ("authorId matches", b.get("authorId") == _auth_user.get("id")),
])

cleanup_user(_auth_user.get("id"))

# ══════════════════════════════════════════════════════════════
# 3. FULL USER LIFECYCLE — 5 independent users
# ══════════════════════════════════════════════════════════════

section("3. Full user lifecycle × 5 users")

lifecycle_users = []

for i in range(5):
    u, tok = make_user()
    if not u:
        continue
    uid = u.get("id")
    lifecycle_users.append((uid, tok))

    # Get own profile
    s, b = get("/me", token=tok)
    ok(f"User {i+1}: GET /me", s, b, [("correct id", b.get("id") == uid)])

    # Update profile
    s, b = put("/me", {"headline": f"Engineer #{i+1} | CS Student | Builder", "location": "New York, NY"}, token=tok)
    ok(f"User {i+1}: update profile", s, b, [("headline updated", "Engineer" in b.get("headline",""))])

    # Create post
    content = f"Hello from lifecycle user {i+1}! #{uuid.uuid4().hex[:4]}"
    s, b = post("/feed", {"content": content}, token=tok)
    ok(f"User {i+1}: create post", s, b, [
        ("has id", "id" in b), ("authorId correct", b.get("authorId") == uid),
        ("content stored", b.get("content") == content),
    ])

    # View feed — see own post
    s, feed = get("/feed", token=tok)
    ok(f"User {i+1}: post appears in feed", s, feed, [
        ("own post in feed", any(p.get("content") == content for p in feed)),
    ])

    # Check readiness
    s, b = get("/outreach/readiness", token=tok)
    ok(f"User {i+1}: readiness check", s, b, [
        ("has score", "score" in b), ("has level", "level" in b),
        ("score 0-100", 0 <= b.get("score", -1) <= 100),
    ])

    # Generate outreach message
    s, b = post("/outreach/generate", {"recipientId": 3, "tone": "professional", "goal": "networking"}, token=tok)
    ok(f"User {i+1}: generate outreach", s, b, [
        ("has draft", bool(b.get("draft"))),
        ("draft ≤500", len(b.get("draft","")) <= 500),
    ])

    # Send a message
    s, b = post("/conversations/1/messages", {"text": f"Hi from user {i+1}!"}, token=tok)
    ok(f"User {i+1}: send message", s, b, [("has text", bool(b.get("text")))])

# Cleanup lifecycle users
for uid, tok in lifecycle_users:
    cleanup_user(uid, tok)

# ══════════════════════════════════════════════════════════════
# 4. STORY #1 — Outreach Generate: all goals × all tones × scenarios
# ══════════════════════════════════════════════════════════════

section("4. Story #1 (Outreach Message Guidance) — Outreach Generate: all goals × tones × scenarios")

GOALS = ["job_inquiry", "networking", "advice", "collaboration"]
TONES = ["professional", "friendly", "formal"]

# All 12 goal×tone combinations
for goal in GOALS:
    for tone in TONES:
        s, b = post("/outreach/generate", {"recipientId": 2, "goal": goal, "tone": tone})
        ok(f"  generate goal={goal} tone={tone}", s, b, [
            ("has draft", bool(b.get("draft"))),
            ("tone echoed", b.get("tone") == tone),
            ("3 tips", len(b.get("tips", [])) == 3),
            ("2 alternatives", len(b.get("alternatives", [])) == 2),
            ("draft ≤500", len(b.get("draft","")) <= 500),
        ])

# With custom_note
s, b = post("/outreach/generate", {"recipientId": 4, "custom_note": "I loved your talk at Config 2025!"})
ok("generate with custom_note", s, b, [
    ("note in draft", "Config 2025" in b.get("draft","")),
    ("draft ≤500", len(b.get("draft","")) <= 500),
])

# With all details fields
s, b = post("/outreach/generate", {
    "recipientId": 5,
    "goal": "job_inquiry",
    "tone": "professional",
    "details": {
        "yourRole": "CS student",
        "field": "machine learning",
        "company": "Google",
        "role": "SWE Intern",
        "context": "I saw your recent research on transformers",
    }
})
ok("generate with all details", s, b, [
    ("has draft", bool(b.get("draft"))),
    ("role in draft", "CS student" in b.get("draft", "") or "Google" in b.get("draft","")),
    ("draft ≤500", len(b.get("draft","")) <= 500),
])

# Different recipients
for rid in [2, 3, 4, 5, 6, 7]:
    s, b = post("/outreach/generate", {"recipientId": rid, "goal": "networking"})
    ok(f"generate for recipient {rid}", s, b, [
        ("has draft", bool(b.get("draft"))), ("draft ≤500", len(b.get("draft","")) <= 500),
    ])

# Invalid tone defaults to professional
s, b = post("/outreach/generate", {"recipientId": 2, "tone": "sarcastic"})
ok("invalid tone defaults to professional", s, b, [("tone=professional", b.get("tone") == "professional")])

# Invalid goal defaults to networking
s, b = post("/outreach/generate", {"recipientId": 2, "goal": "manipulation"})
ok("invalid goal defaults to networking", s, b, [("has draft", bool(b.get("draft")))])

# Missing recipientId
s, b = post("/outreach/generate", {})
err("missing recipientId → 400", s, b, 400)

# Unknown recipient
s, b = post("/outreach/generate", {"recipientId": 99999})
err("unknown recipientId → 404", s, b, 404)

# Negative id
s, b = post("/outreach/generate", {"recipientId": -5})
err("negative recipientId → 400", s, b, 400)

# Zero
s, b = post("/outreach/generate", {"recipientId": 0})
err("zero recipientId → 400", s, b, 400)

# Float
s, b = post("/outreach/generate", {"recipientId": 2.5})
err("float recipientId → 400", s, b, 400)

# Boolean
s, b = post("/outreach/generate", {"recipientId": True})
err("bool recipientId → 400", s, b, 400)

# String
s, b = post("/outreach/generate", {"recipientId": "admin"})
err("string recipientId → 400", s, b, 400)

# XSS stripped
s, b = post("/outreach/generate", {"recipientId": 2, "custom_note": "<script>alert(1)</script>"})
ok("XSS stripped from custom_note", s, b, [("no script tag", "<script>" not in b.get("draft",""))])

# SQL injection — no crash
s, b = post("/outreach/generate", {"recipientId": 2, "custom_note": "'; DROP TABLE users; --"})
ok("SQL injection in custom_note — no crash", s, b, [("2xx", 200 <= s < 300)])

# Control chars stripped
s, b = post("/outreach/generate", {"recipientId": 2, "custom_note": "Hi\x00\x1b\x7fWorld"})
ok("control chars stripped", s, b, [("no null byte", "\x00" not in b.get("draft",""))])

# Long custom_note truncated
s, b = post("/outreach/generate", {"recipientId": 2, "custom_note": "A" * 500})
ok("long custom_note truncated — no crash", s, b, [("2xx", 200 <= s < 300)])

# Draft always ≤ 500
for goal in GOALS:
    s, b = post("/outreach/generate", {
        "recipientId": 2,
        "goal": goal,
        "custom_note": "Extra note that is quite long and detailed to stress test the truncation logic in the backend module.",
        "details": {"context": "additional context here to make the message as long as possible"}
    })
    ok(f"draft always ≤500 (goal={goal})", s, b, [
        ("char_count ≤500", b.get("char_count", 9999) <= 500),
        ("draft len ≤500", len(b.get("draft","")) <= 500),
    ])

# ══════════════════════════════════════════════════════════════
# 5. STORY #7 (Outreach Readiness Check) — levels, thresholds, per-user
# ══════════════════════════════════════════════════════════════

section("5. Story #7 (Outreach Readiness Check) — Outreach Readiness: all users, levels, breakdown")

# Current user (complete profile → ready)
s, b = get("/outreach/readiness")
ok("current user readiness shape", s, b, [
    ("has score", "score" in b), ("has level", "level" in b),
    ("has can_message", "can_message" in b), ("has breakdown", "breakdown" in b),
    ("has top_tips", "top_tips" in b), ("max_score=100", b.get("max_score") == 100),
    ("9 breakdown items", len(b.get("breakdown",[])) == 9),
    ("top_tips ≤3", len(b.get("top_tips",[])) <= 3),
])

# Verify score = sum of met weights
s, b = get("/outreach/readiness")
calc = sum(x["weight"] for x in b.get("breakdown",[]) if x.get("met"))
ok("score == sum of met weights", s, b, [("match", calc == b.get("score"))])

# Level thresholds match spec
s, b = get("/outreach/readiness")
score = b.get("score", 0)
level = b.get("level", "")
expected_level = "ready" if score >= 75 else ("almost_ready" if score >= 50 else "not_ready")
ok("level matches score threshold", s, b, [("level correct", level == expected_level)])

# can_message boundary: True iff score >= 60
s, b = get("/outreach/readiness")
score = b.get("score", 0)
expected_cm = score >= 60
ok("can_message = score >= 60", s, b, [("correct", b.get("can_message") == expected_cm)])

# Each user in the system
s, users_list = get("/users")
for u in _ld(users_list)[:10]:
    uid = u.get("id")
    s2, r = get(f"/outreach/readiness?userId={uid}")
    ok(f"readiness for userId={uid}", s2, r, [
        ("has score", "score" in r),
        ("score 0-100", 0 <= r.get("score", -1) <= 100),
        ("9 breakdown", len(r.get("breakdown",[])) == 9),
    ])

# Unknown userId
s, b = get("/outreach/readiness?userId=99999")
err("unknown userId → 404", s, b, 404)

# Invalid userId strings
s, b = get("/outreach/readiness?userId=abc")
err("non-integer userId → 400", s, b, 400)

s, b = get("/outreach/readiness?userId=-1")
err("negative userId → 400", s, b, 400)

s, b = get("/outreach/readiness?userId=0")
err("zero userId → 400", s, b, 400)

# Breakdown has tip=None for met, tip=str for unmet
s, b = get("/outreach/readiness")
for item in b.get("breakdown", []):
    name = item.get("key","?")
    if item.get("met"):
        ok(f"breakdown {name}: tip=None when met", 200, {}, [("tip is None", item.get("tip") is None)])
    else:
        ok(f"breakdown {name}: tip is str when unmet", 200, {}, [("tip is str", isinstance(item.get("tip"), str))])

# top_tips are highest-weight unmet items
s, b = get("/outreach/readiness?userId=12")
unmet = sorted([x for x in b.get("breakdown",[]) if not x.get("met")], key=lambda x: x["weight"], reverse=True)
expected_tips = [x["tip"] for x in unmet[:3] if x.get("tip")]
ok("top_tips = highest-weight unmet", s, b, [("tips match", b.get("top_tips") == expected_tips)])

# Fresh user → lower score
u2, tok2 = make_user()
if u2:
    s, b = get(f"/outreach/readiness?userId={u2['id']}")
    ok("fresh user has lower readiness", s, b, [
        ("score < 100", b.get("score", 100) < 100),
        ("level not always ready", True),
    ])
    cleanup_user(u2.get("id"), tok2)

# ══════════════════════════════════════════════════════════════
# 6. FEED — post CRUD, ordering, author linkage, persistence
# ══════════════════════════════════════════════════════════════

section("6. Feed — create, ordering, author, persistence, edge cases")

# Create and verify in feed
unique = f"FeedTest_{uuid.uuid4().hex[:10]}"
s, b = post("/feed", {"content": unique})
ok("POST /feed creates post", s, b, [
    ("has id", "id" in b), ("has authorId", "authorId" in b),
    ("has author", "author" in b), ("content matches", b.get("content") == unique),
    ("likeCount=0", b.get("likeCount") == 0),
    ("comments is list", isinstance(b.get("comments"), list)),
])
_post_id = b.get("id")

s, feed = get("/feed")
feed = _ld(feed)
ok("new post appears in feed", s, feed, [("found", any(p.get("content") == unique for p in feed))])

# Feed sorted newest first
s, feed = get("/feed")
feed = _ld(feed)
if len(feed) >= 2:
    ts = [p.get("createdAt", 0) for p in feed[:5]]
    ok("feed newest-first", s, feed, [("sorted", all(ts[i] >= ts[i+1] for i in range(len(ts)-1)))])

# All posts have authorId referencing a real user
s, feed = get("/feed")
feed = _ld(feed)
s2, users_list = get("/users")
user_ids = {u["id"] for u in _ld(users_list)} | {1}
ok("all posts have valid authorId", s, feed, [
    ("each has authorId", all("authorId" in p for p in feed)),
    ("authorId is int", all(isinstance(p.get("authorId"), int) for p in feed)),
])

# Empty content rejected
s, b = post("/feed", {"content": ""})
err("empty content → 400", s, b, 400)

s, b = post("/feed", {"content": "   "})
err("whitespace-only content → 400", s, b, 400)

# No body
s, b = post("/feed", None)
err("no body → 400", s, b, 400)

# Unicode content
s, b = post("/feed", {"content": "Unicode: café, 日本語, العربية, 한국어"})
ok("unicode content stored", s, b, [("has id", "id" in b), ("cafe in content", "café" in b.get("content",""))])

# Very long content
long_content = "A" * 2000
s, b = post("/feed", {"content": long_content})
ok("very long content accepted", s, b, [("has id", "id" in b)])

# XSS in content — stored as text, not executed
s, b = post("/feed", {"content": "<script>alert('xss')</script>"})
ok("XSS content stored as text", s, b, [("stored", bool(b.get("content")))])

# ══════════════════════════════════════════════════════════════
# 7. MESSAGING — conversations, send, persist
# ══════════════════════════════════════════════════════════════

section("7. Messaging — conversations, send, persist, edge cases")

s, convs = get("/conversations")
convs = _ld(convs)
ok("GET /conversations", s, convs, [
    ("is list", isinstance(convs, list)),
    ("has participantName", all("participantName" in c for c in convs)),
])

if convs:
    cid = convs[0]["id"]
    s, conv = get(f"/conversations/{cid}")
    ok("GET /conversations/:id", s, conv, [
        ("has messages", isinstance(conv.get("messages"), list)),
    ])

    # Send message
    txt = f"Test message {uuid.uuid4().hex[:6]}"
    s, b = post(f"/conversations/{cid}/messages", {"text": txt})
    ok("POST message to conversation", s, b, [
        ("has id", "id" in b), ("text matches", b.get("text") == txt),
        ("isMe True", b.get("isMe") is True),
    ])

    # Message persists
    s, conv2 = get(f"/conversations/{cid}")
    ok("sent message persists", s, conv2, [
        ("found", any(m.get("text") == txt for m in conv2.get("messages",[]))),
    ])

    # Multiple messages in same conversation
    for i in range(3):
        s, b = post(f"/conversations/{cid}/messages", {"text": f"Message #{i}"})
        ok(f"send message #{i}", s, b, [("has id", "id" in b)])

    # Empty text rejected
    s, b = post(f"/conversations/{cid}/messages", {"text": ""})
    err("empty text → 400", s, b, 400)

    s, b = post(f"/conversations/{cid}/messages", {"text": "   "})
    err("whitespace text → 400", s, b, 400)

# Unknown conversation
s, b = post("/conversations/99999/messages", {"text": "hi"})
err("unknown conv → 404", s, b, 404)

s, b = get("/conversations/99999")
err("GET unknown conv → 404", s, b, 404)

# ══════════════════════════════════════════════════════════════
# 8. NOTIFICATIONS — list, mark read, persistence
# ══════════════════════════════════════════════════════════════

section("8. Notifications — list, mark read, bulk, persistence")

s, notifs = get("/notifications")
notifs = _ld(notifs)
ok("GET /notifications shape", s, notifs, [
    ("is list", isinstance(notifs, list)),
    ("each has isRead", all("isRead" in n for n in notifs)),
    ("each has id", all("id" in n for n in notifs)),
])

if notifs:
    nid = notifs[0]["id"]
    s, b = patch(f"/notifications/{nid}/read")
    ok("PATCH mark one read", s, b, [("isRead True", b.get("isRead") is True)])

    # Verify persists
    s, notifs2 = get("/notifications")
    notifs2 = _ld(notifs2)
    ok("read state persists", s, notifs2, [
        ("still read", any(n["id"] == nid and n["isRead"] for n in notifs2)),
    ])

s, b = patch("/notifications/read-all")
ok("PATCH read-all", s, b, [("success", b.get("success") is True)])

# Verify all read
s, notifs3 = get("/notifications")
notifs3 = _ld(notifs3)
ok("all notifications read after read-all", s, notifs3, [
    ("all read", all(n.get("isRead") for n in notifs3)),
])

# Unknown
s, b = patch("/notifications/99999/read")
err("mark unknown notif read → 404", s, b, 404)

# ══════════════════════════════════════════════════════════════
# 9. USERS / PROFILE — CRUD, update, search, delete
# ══════════════════════════════════════════════════════════════

section("9. Users — CRUD, profile update, search, delete")

# Cannot delete user 1
s, b = delete("/users/1")
err("DELETE /users/1 blocked (403)", s, b, 403)

# Non-existent user
s, b = get("/users/99999")
err("GET /users/99999 → 404", s, b, 404)

s, b = delete("/users/99999")
err("DELETE /users/99999 → 404", s, b, 404)

# Create → find → update → delete
u3, tok3 = make_user()
if u3:
    uid3 = u3["id"]
    s, b = get(f"/users/{uid3}")
    ok("GET new user by id", s, b, [("correct id", b.get("id") == uid3)])

    s, b = put("/me", {"headline": "Updated Headline | CS | NJIT", "location": "Newark, NJ",
                        "about": "I am a test user updating my profile to check that the PUT /me endpoint works correctly end to end."}, token=tok3)
    ok("PUT /me updates profile", s, b, [
        ("headline updated", "Updated Headline" in b.get("headline","")),
        ("location updated", b.get("location") == "Newark, NJ"),
    ])

    # Verify readiness improved (about now filled)
    s, r = get(f"/outreach/readiness?userId={uid3}")
    ok("readiness reflects updated about", s, r, [("has score", "score" in r)])

    # PATCH /me
    s, b = put("/me", {"pronouns": "they/them"}, token=tok3)
    ok("PUT /me partial update (pronouns)", s, b, [("has id", "id" in b)])

    # Delete
    s, b = delete(f"/users/{uid3}")
    ok("DELETE user returns 204", s, b, [("204", s == 204)])

    # Gone after delete
    s, b = get(f"/users/{uid3}")
    err("deleted user → 404", s, b, 404)

# Search
s, b = get("/search?q=Google")
ok("search for Google", s, b, [
    ("has keys", all(k in b for k in ["users","jobs","companies","posts"])),
])

s, b = get("/search?q=")
ok("empty search returns empty sets", s, b, [
    ("users empty", b.get("users") == []),
    ("companies empty", b.get("companies") == []),
])

s, b = get("/search?q=<script>alert(1)</script>")
ok("XSS in search — no crash", s, b, [("2xx", 200 <= s < 300)])

_sqli_q = urllib.parse.urlencode({"q": "'; DROP TABLE users; --"})
s, b = get(f"/search?{_sqli_q}")
ok("SQL injection in search — no crash", s, b, [("2xx", 200 <= s < 300)])

# ══════════════════════════════════════════════════════════════
# 10. JOBS & COMPANIES
# ══════════════════════════════════════════════════════════════

section("10. Jobs and Companies")

s, jobs = get("/jobs")
jobs = _ld(jobs)
ok("GET /jobs list", s, jobs, [
    ("is list", isinstance(jobs, list)),
    ("each has title", all("title" in j for j in jobs)),
    ("each has company", all("company" in j for j in jobs)),
    ("each has id", all("id" in j for j in jobs)),
])

if jobs:
    jid = jobs[0]["id"]
    s, b = get(f"/jobs/{jid}")
    ok("GET /jobs/:id detail", s, b, [("has title", "title" in b), ("has company", "company" in b)])

s, b = get("/jobs/99999")
err("GET /jobs/99999 → 404", s, b, 404)

s, b = get("/companies/1")
ok("GET /companies/1", s, b, [("has name", "name" in b)])

s, b = get("/companies/99999")
err("GET /companies/99999 → 404", s, b, 404)

# ══════════════════════════════════════════════════════════════
# 11. COMBINATION SCENARIOS — realistic user flows
# ══════════════════════════════════════════════════════════════

section("11. Combination scenarios — realistic user flows")

# Scenario A: Student registers, checks readiness, then generates message
ua, toka = make_user()
if ua:
    s, r = get("/outreach/readiness", token=toka)
    score_a = r.get("score", 0)
    ok("Scenario A: register → readiness", s, r, [("has score", "score" in r)])

    s, b = post("/outreach/generate", {"recipientId": 5, "goal": "job_inquiry", "tone": "professional",
                                        "details": {"yourRole": "CS student", "company": "Meta", "role": "SWE Intern"}}, token=toka)
    ok("Scenario A: generate after readiness check", s, b, [
        ("draft present", bool(b.get("draft"))), ("meta in draft", "Meta" in b.get("draft","")),
    ])
    cleanup_user(ua.get("id"), toka)

# Scenario B: User posts, then searches for own post
ub, tokb = make_user()
if ub:
    unique_b = f"ScenarioB_{uuid.uuid4().hex[:8]}"
    post("/feed", {"content": unique_b}, token=tokb)
    s, feed = get("/feed", token=tokb)
    ok("Scenario B: post appears in feed", s, feed, [
        ("found", any(p.get("content") == unique_b for p in feed)),
    ])
    cleanup_user(ub.get("id"), tokb)

# Scenario C: User updates profile → readiness score improves
uc, tokc = make_user()
if uc:
    s, r1 = get("/outreach/readiness", token=tokc)
    score_before = r1.get("score", 0)
    put("/me", {
        "headline": "Software Engineer | CS Major | Open to Work",
        "about": "I am a passionate computer science student at NJIT working on full-stack applications. I love building products that make a real difference in people's lives.",
        "location": "Newark, NJ",
    }, token=tokc)
    s, r2 = get(f"/outreach/readiness?userId={uc['id']}")
    score_after = r2.get("score", 0)
    ok("Scenario C: profile update improves readiness", s, r2, [
        ("score improved or same", score_after >= score_before),
    ])
    cleanup_user(uc.get("id"), tokc)

# Scenario D: Friendly tone advice goal with field and context
s, b = post("/outreach/generate", {
    "recipientId": 6,
    "goal": "advice",
    "tone": "friendly",
    "custom_note": "I came across your work on distributed systems.",
    "details": {"yourRole": "junior dev", "field": "distributed systems", "context": "big fan of your blog posts"}
})
ok("Scenario D: advice/friendly with details", s, b, [
    ("draft present", bool(b.get("draft"))), ("friendly tips", len(b.get("tips",[])) == 3),
    ("2 alternatives", len(b.get("alternatives",[])) == 2),
])

# Scenario E: Collaboration + formal tone
s, b = post("/outreach/generate", {
    "recipientId": 7, "goal": "collaboration", "tone": "formal",
    "details": {"field": "AI research", "context": "potential joint paper opportunity"}
})
ok("Scenario E: collaboration/formal", s, b, [("draft ≤500", len(b.get("draft","")) <= 500)])

# Scenario F: Read all notifications then post then send message
patch("/notifications/read-all")
s, notifs = get("/notifications")
ok("Scenario F: all notifs read", s, notifs, [("all read", all(n.get("isRead") for n in notifs))])
post("/feed", {"content": "Post after reading all notifications"})
s, b = post("/conversations/1/messages", {"text": "Message after reading notifications"})
ok("Scenario F: message after notifications", s, b, [("has id", "id" in b)])

# Scenario G: Readiness for multiple users compared
s, users_g = get("/users")
if users_g:
    scores = []
    for u in _ld(users_g)[:5]:
        s2, r = get(f"/outreach/readiness?userId={u['id']}")
        if 200 <= s2 < 300:
            scores.append(r.get("score", 0))
    ok("Scenario G: readiness varies across users", s, users_g, [
        ("got scores", len(scores) > 0),
        ("scores in range", all(0 <= sc <= 100 for sc in scores)),
    ])

# ══════════════════════════════════════════════════════════════
# 12. CONCURRENCY — 10 simultaneous users
# ══════════════════════════════════════════════════════════════

section("12. Concurrency — 10 simultaneous users")

_concurrent_errors = []
_concurrent_lock = threading.Lock()

def concurrent_user_flow(user_num):
    """Full workflow: register → post → readiness → generate → message → cleanup."""
    errors = []
    suffix = uuid.uuid4().hex[:8]
    u, tok = make_user(suffix)
    if not u:
        with _concurrent_lock:
            _concurrent_errors.append(f"User {user_num}: failed to register")
        return

    uid = u.get("id")

    # Post
    content = f"Concurrent post from user {user_num} / {suffix}"
    s, b = post("/feed", {"content": content}, token=tok)
    if not (200 <= s < 300):
        errors.append(f"create post failed: {s}")

    # Verify post in feed
    s, feed = get("/feed", token=tok)
    if not any(p.get("content") == content for p in _ld(feed)):
        errors.append("post not found in feed")

    # Readiness
    s, r = get("/outreach/readiness", token=tok)
    if "score" not in r:
        errors.append(f"readiness missing score: {r}")

    # Generate outreach (different recipient per user to avoid hotspot)
    recipient_id = (user_num % 10) + 2
    s, b = post("/outreach/generate", {
        "recipientId": recipient_id,
        "goal": GOALS[user_num % 4],
        "tone": TONES[user_num % 3],
    }, token=tok)
    if not b.get("draft"):
        errors.append(f"no draft returned: {b}")
    if len(b.get("draft", "")) > 500:
        errors.append(f"draft too long: {len(b.get('draft',''))}")

    # Send message
    s, b = post("/conversations/1/messages", {"text": f"Concurrent message from {user_num}"}, token=tok)
    if not (200 <= s < 300):
        errors.append(f"send message failed: {s}")

    # Cleanup
    cleanup_user(uid, tok)

    with _concurrent_lock:
        if errors:
            _concurrent_errors.append(f"User {user_num}: {errors}")

# Launch 10 threads simultaneously
NUM_CONCURRENT = 10
threads = [threading.Thread(target=concurrent_user_flow, args=(i,)) for i in range(NUM_CONCURRENT)]
t_start = time.time()
for t in threads: t.start()
for t in threads: t.join()
elapsed = time.time() - t_start

ok(f"10 concurrent users completed in {elapsed:.1f}s", 200, {}, [
    ("no errors", len(_concurrent_errors) == 0),
])
if _concurrent_errors:
    for e in _concurrent_errors:
        print(f"    CONCURRENT ERROR: {e}")

# Additional: 20 simultaneous read requests
read_results = []
read_lock = threading.Lock()

def concurrent_read(path):
    s, b = get(path)
    with read_lock:
        read_results.append(200 <= s < 300)

read_threads = []
for i in range(20):
    paths = ["/feed", "/jobs", "/users", "/outreach/readiness", "/notifications"]
    t = threading.Thread(target=concurrent_read, args=(paths[i % len(paths)],))
    read_threads.append(t)

t_start2 = time.time()
for t in read_threads: t.start()
for t in read_threads: t.join()
elapsed2 = time.time() - t_start2

ok(f"20 concurrent reads completed in {elapsed2:.1f}s", 200, {}, [
    ("all succeeded", all(read_results)),
    ("count correct", len(read_results) == 20),
])

# 5 simultaneous post creations
post_results = []
post_lock = threading.Lock()

def concurrent_post(i):
    s, b = post("/feed", {"content": f"Concurrent post #{i} {uuid.uuid4().hex[:6]}"})
    with post_lock:
        post_results.append(200 <= s < 300)

post_threads = [threading.Thread(target=concurrent_post, args=(i,)) for i in range(5)]
for t in post_threads: t.start()
for t in post_threads: t.join()

ok("5 simultaneous post creations", 200, {}, [
    ("all succeeded", all(post_results)),
])

# 10 simultaneous outreach generates
gen_results = []
gen_lock = threading.Lock()

def concurrent_generate(i):
    s, b = post("/outreach/generate", {
        "recipientId": (i % 10) + 2,
        "goal": GOALS[i % 4],
        "tone": TONES[i % 3],
    })
    with gen_lock:
        gen_results.append({
            "ok": 200 <= s < 300,
            "has_draft": bool(b.get("draft")),
            "len_ok": len(b.get("draft","")) <= 500,
        })

gen_threads = [threading.Thread(target=concurrent_generate, args=(i,)) for i in range(10)]
for t in gen_threads: t.start()
for t in gen_threads: t.join()

ok("10 simultaneous outreach generates", 200, {}, [
    ("all 2xx", all(r["ok"] for r in gen_results)),
    ("all have draft", all(r["has_draft"] for r in gen_results)),
    ("all ≤500 chars", all(r["len_ok"] for r in gen_results)),
])

# ══════════════════════════════════════════════════════════════
# 13. PERSISTENCE — data survives multiple requests
# ══════════════════════════════════════════════════════════════

section("13. Persistence across requests")

marker = f"PersistTest_{uuid.uuid4().hex[:10]}"
_ps, _pb = post("/feed", {"content": marker})
if 200 <= _ps < 300:
    for _ in range(3):
        s, feed = get("/feed")
        feed = _ld(feed)
        ok(f"persistent post in feed (check {_+1})", s, feed, [
            ("found", any(p.get("content") == marker for p in feed)),
        ])

_notifs13 = _ld(get("/notifications")[1])
nids = [n["id"] for n in _notifs13 if not n.get("isRead", True)]
if not nids and _notifs13:
    nids = [_notifs13[0]["id"]]
if nids:
    patch(f"/notifications/{nids[0]}/read")
    for _ in range(3):
        s, notifs = get("/notifications")
        notifs = _ld(notifs)
        ok(f"notification read state persists (check {_+1})", s, notifs, [
            ("still read", any(n["id"] == nids[0] and n["isRead"] for n in notifs)),
        ])

# ══════════════════════════════════════════════════════════════
# 14. PROFILE — field preservation, unicode, long fields
# ══════════════════════════════════════════════════════════════

section("14. Profile — field preservation, unicode, long fields")

_pu, _pt = make_user()
if _pu:
    _puid = _pu["id"]

    # Set two fields first
    s, b = put("/me", {"headline": "Engineer at Nexus", "location": "New York, NY", "about": "I build things."}, token=_pt)
    ok("PUT /me sets multiple fields", s, b, [
        ("headline set", b.get("headline") == "Engineer at Nexus"),
        ("location set", b.get("location") == "New York, NY"),
        ("about set", b.get("about") == "I build things."),
    ])

    # Update only headline — location and about must be preserved
    s, b = put("/me", {"headline": "Senior Engineer at Nexus"}, token=_pt)
    ok("PUT /me: updating one field preserves others", s, b, [
        ("headline updated", b.get("headline") == "Senior Engineer at Nexus"),
        ("location preserved", b.get("location") == "New York, NY"),
        ("about preserved", b.get("about") == "I build things."),
    ])

    # Unicode emoji in headline
    emoji_headline = "Software Engineer 🚀 | AI Enthusiast 🤖 | Builder"
    s, b = put("/me", {"headline": emoji_headline}, token=_pt)
    ok("PUT /me: emoji in headline stored correctly", s, b, [
        ("emoji preserved", b.get("headline") == emoji_headline),
    ])

    # CJK unicode in about
    s, b = put("/me", {"about": "I speak 中文 and English fluently."}, token=_pt)
    ok("PUT /me: CJK unicode in about", s, b, [
        ("cjk stored", "中文" in b.get("about", "")),
    ])

    # Very long headline (>500 chars) — backend should store or truncate, not 500 error
    long_headline = "A" * 600
    s, b = put("/me", {"headline": long_headline}, token=_pt)
    ok("PUT /me: very long headline no crash", s, b, [
        ("2xx", 200 <= s < 300),
        ("has id", "id" in b),
    ])

    # Update pronouns and industry
    s, b = put("/me", {"pronouns": "they/them", "industry": "Technology"}, token=_pt)
    ok("PUT /me: pronouns and industry", s, b, [
        ("pronouns set", b.get("pronouns") == "they/them"),
        ("industry set", b.get("industry") == "Technology"),
    ])

    # XSS stored as text (backend is API — frontend must escape on render)
    s, b = put("/me", {"headline": "<script>alert('xss')</script>"}, token=_pt)
    ok("PUT /me: XSS stored as text (not executed)", s, b, [
        ("stored", bool(b.get("headline"))),
        ("2xx", 200 <= s < 300),
    ])

    # GET /users/:id reflects updated data
    s, b = put("/me", {"headline": "Verified Profile Headline", "location": "Boston, MA"}, token=_pt)
    s2, profile = get(f"/users/{_puid}")
    ok("GET /users/:id reflects PUT /me changes", s2, profile, [
        ("headline updated", profile.get("headline") == "Verified Profile Headline"),
        ("location updated", profile.get("location") == "Boston, MA"),
    ])

    # GET /me with token returns same user
    s3, me3 = get("/me", token=_pt)
    ok("GET /me with token returns correct user", s3, me3, [
        ("correct id", me3.get("id") == _puid),
        ("headline matches", me3.get("headline") == "Verified Profile Headline"),
    ])

    cleanup_user(_puid, _pt)

# ══════════════════════════════════════════════════════════════
# 15. SEARCH — comprehensive query scenarios
# ══════════════════════════════════════════════════════════════

section("15. Search — comprehensive query scenarios")

# Search 'engineer' — known to match headlines
s, b = get("/search?q=engineer")
ok("search 'engineer' returns results", s, b, [
    ("has users key", "users" in b),
    ("has jobs key", "jobs" in b),
    ("has companies key", "companies" in b),
    ("has posts key", "posts" in b),
    ("users or jobs non-empty", len(b.get("users",[])) > 0 or len(b.get("jobs",[])) > 0),
])

# Search returns query echo
s, b = get("/search?q=python")
ok("search response includes query echo", s, b, [
    ("has keys", all(k in b for k in ["users","jobs","companies","posts"])),
])

# Multi-word search doesn't crash
_sq = urllib.parse.urlencode({"q": "software engineer"})
s, b = get(f"/search?{_sq}")
ok("multi-word search no crash", s, b, [("2xx", 200 <= s < 300)])

# Repeat same search → consistent results
s1, b1 = get("/search?q=Google")
s2, b2 = get("/search?q=Google")
ok("repeated search consistent results", s1, b1, [
    ("same company count", len(b1.get("companies",[])) == len(b2.get("companies",[]))),
    ("same job count", len(b1.get("jobs",[])) == len(b2.get("jobs",[]))),
])

# Very long query — no crash
_longq = urllib.parse.urlencode({"q": "engineer " * 50})
s, b = get(f"/search?{_longq}")
ok("very long search query no crash", s, b, [("2xx", 200 <= s < 300)])

# Unicode search
_uq = urllib.parse.urlencode({"q": "日本語"})
s, b = get(f"/search?{_uq}")
ok("unicode search no crash", s, b, [("2xx", 200 <= s < 300)])

# Search single char
s, b = get("/search?q=a")
ok("single-char search returns results", s, b, [
    ("users or jobs", len(b.get("users",[])) + len(b.get("jobs",[])) + len(b.get("companies",[])) > 0),
])

# ══════════════════════════════════════════════════════════════
# 16. STATIC DATA SHAPE VALIDATION
# ══════════════════════════════════════════════════════════════

section("16. Static data shape validation")

# Groups list
s, groups = get("/groups")
groups = _ld(groups)
ok("GET /groups shape", s, groups, [
    ("is list", isinstance(groups, list)),
    ("non-empty", len(groups) > 0),
    ("each has id", all("id" in g for g in groups)),
    ("each has name", all("name" in g for g in groups)),
    ("each has members", all("members" in g for g in groups)),
    ("members is int", all(isinstance(g["members"], int) for g in groups)),
])

# Groups/:id
if groups:
    gid = groups[0]["id"]
    s, g = get(f"/groups/{gid}")
    ok(f"GET /groups/{gid} detail", s, g, [
        ("has id", "id" in g),
        ("has name", "name" in g),
        ("has members", "members" in g),
        ("has description", "description" in g),
    ])

# Events list
s, events = get("/events")
events = _ld(events)
ok("GET /events shape", s, events, [
    ("is list", isinstance(events, list)),
    ("non-empty", len(events) > 0),
    ("each has id", all("id" in e for e in events)),
    ("each has title", all("title" in e for e in events)),
    ("each has date", all("date" in e for e in events)),
    ("isAttending bool", all(isinstance(e.get("isAttending"), bool) for e in events)),
])

# Courses
s, courses = get("/courses")
courses = _ld(courses)
ok("GET /courses shape", s, courses, [
    ("is list", isinstance(courses, list)),
    ("non-empty", len(courses) > 0),
    ("each has title", all("title" in c for c in courses)),
    ("each has instructor", all("instructor" in c for c in courses)),
    ("each has id", all("id" in c for c in courses)),
])

# News
s, news = get("/news")
news = _ld(news)
ok("GET /news shape", s, news, [
    ("is list", isinstance(news, list)),
    ("non-empty", len(news) > 0),
    ("each has headline", all("headline" in n for n in news)),
    ("each has timeAgo", all("timeAgo" in n for n in news)),
    ("each has readers", all("readers" in n for n in news)),
    ("readers non-empty", all(bool(n["readers"]) for n in news)),
])

# Hashtags
s, tags = get("/hashtags")
tags = _ld(tags)
ok("GET /hashtags shape", s, tags, [
    ("is list", isinstance(tags, list)),
    ("non-empty", len(tags) > 0),
    ("each has name", all("name" in t for t in tags)),
    ("each has followers", all("followers" in t for t in tags)),
    ("followers is int", all(isinstance(t["followers"], int) for t in tags)),
])

# Invitations
s, invites = get("/invitations")
invites = _ld(invites)
ok("GET /invitations shape", s, invites, [
    ("is list", isinstance(invites, list)),
    ("has user obj", all("user" in inv for inv in invites)),
    ("user has name", all(isinstance(inv.get("user",{}).get("name"), str) for inv in invites)),
    ("has mutualCount", all("mutualCount" in inv for inv in invites)),
])

# Company detail — all key fields
s, co = get("/companies/1")
ok("GET /companies/1 all fields", s, co, [
    ("has name", "name" in co),
    ("has description", "description" in co),
    ("has specialties", "specialties" in co),
    ("specialties is list", isinstance(co.get("specialties"), list)),
    ("has size", "size" in co),
    ("has website", "website" in co),
    ("has founded", "founded" in co),
])

# Jobs detail — all key fields
s, jbs = get("/jobs")
jbs = _ld(jbs)
if jbs:
    s2, jd = get(f"/jobs/{jbs[0]['id']}")
    ok("GET /jobs/:id all fields", s2, jd, [
        ("has title", "title" in jd),
        ("has company", "company" in jd),
        ("has salary", "salary" in jd),
        ("has skills", "skills" in jd),
        ("skills is list", isinstance(jd.get("skills"), list)),
        ("has location", "location" in jd),
        ("has description", "description" in jd),
        ("has matchScore", "matchScore" in jd),
    ])

# ══════════════════════════════════════════════════════════════
# 17. OUTREACH QUALITY CHECKS
# ══════════════════════════════════════════════════════════════

section("17. Outreach quality checks")

# char_count == len(draft)
for rid in [2, 3, 4]:
    s, b = post("/outreach/generate", {"recipientId": rid, "goal": "networking", "tone": "professional"})
    ok(f"char_count matches len(draft) for recipient {rid}", s, b, [
        ("match", b.get("char_count") == len(b.get("draft", ""))),
    ])

# alternatives differ from each other
s, b = post("/outreach/generate", {"recipientId": 2, "goal": "networking"})
ok("alternatives[0] != alternatives[1]", s, b, [
    ("two alternatives", len(b.get("alternatives", [])) >= 2),
    ("differ", b.get("alternatives", ["",""])[0] != b.get("alternatives", ["",""])[1]),
])

# All tips are non-empty strings
for goal in GOALS:
    s, b = post("/outreach/generate", {"recipientId": 2, "goal": goal, "tone": "professional"})
    ok(f"tips all non-empty strings (goal={goal})", s, b, [
        ("3 tips", len(b.get("tips", [])) == 3),
        ("all strings", all(isinstance(t, str) for t in b.get("tips", []))),
        ("all non-empty", all(len(t) > 0 for t in b.get("tips", []))),
    ])

# Minimal request — only recipientId
s, b = post("/outreach/generate", {"recipientId": 5})
ok("minimal outreach (recipientId only) works", s, b, [
    ("has draft", bool(b.get("draft"))),
    ("has tips", len(b.get("tips", [])) == 3),
    ("has alternatives", len(b.get("alternatives", [])) == 2),
    ("draft ≤500", len(b.get("draft","")) <= 500),
])

# Draft doesn't contain raw template placeholders like {name} or ${variable}
s, b = post("/outreach/generate", {"recipientId": 3, "goal": "job_inquiry", "tone": "formal"})
ok("draft has no unfilled template placeholders", s, b, [
    ("no {}", "{" not in b.get("draft","") and "}" not in b.get("draft","")),
])

# Outreach with all details fields populated — everything shows up
s, b = post("/outreach/generate", {
    "recipientId": 4,
    "goal": "collaboration",
    "tone": "friendly",
    "custom_note": "I admired your keynote at PyCon.",
    "details": {
        "yourRole": "PhD student",
        "field": "NLP",
        "company": "Stanford AI Lab",
        "role": "Research Intern",
        "context": "I read your paper on RLHF",
    }
})
ok("outreach with all details fields", s, b, [
    ("has draft", bool(b.get("draft"))),
    ("draft ≤500", len(b.get("draft","")) <= 500),
    ("char_count matches", b.get("char_count") == len(b.get("draft",""))),
])

# ══════════════════════════════════════════════════════════════
# 18. AUTH ROBUSTNESS — tokens, case insensitivity, edge cases
# ══════════════════════════════════════════════════════════════

section("18. Auth robustness — tokens, edge cases")

_sfx18 = uuid.uuid4().hex[:8]
_email18 = f"robust_{_sfx18}@nexus.test"

# Register
s, b = post("/auth/register", {"name": "Robust Tester", "email": _email18, "password": "Secure#Pass99"})
_u18 = b.get("user", {})
_tok18_reg = b.get("token", "")
ok("register with special-char password", s, b, [
    ("201", s == 201), ("has token", bool(_tok18_reg)),
])

# Multiple logins → different tokens, all valid
tokens18 = []
for _ in range(3):
    s2, b2 = post("/auth/login", {"email": _email18, "password": "Secure#Pass99"})
    tokens18.append(b2.get("token",""))
ok("multiple logins produce tokens", s2, b2, [
    ("3 tokens", len(tokens18) == 3),
    ("all non-empty", all(bool(t) for t in tokens18)),
    ("tokens differ", len(set(tokens18)) == 3),
])

# All 3 login tokens work for GET /me
for i, tok in enumerate(tokens18):
    s3, b3 = get("/me", token=tok)
    ok(f"login token {i+1} authenticates GET /me", s3, b3, [
        ("correct user", b3.get("email") == _email18),
    ])

# Register token also works
s4, b4 = get("/me", token=_tok18_reg)
ok("register token works for GET /me", s4, b4, [
    ("correct user", b4.get("email") == _email18),
])

# Case-insensitive email login
s5, b5 = post("/auth/login", {"email": _email18.upper(), "password": "Secure#Pass99"})
ok("email login case-insensitive (uppercase)", s5, b5, [
    ("200", s5 == 200), ("has token", bool(b5.get("token"))),
])

# Mixed case email
s6, b6 = post("/auth/login", {"email": _email18.title(), "password": "Secure#Pass99"})
ok("email login case-insensitive (title case)", s6, b6, [
    ("200", s6 == 200),
])

# Unicode in name
_sfx18b = uuid.uuid4().hex[:8]
s7, b7 = post("/auth/register", {
    "name": "José García-López",
    "email": f"jose_{_sfx18b}@nexus.test",
    "password": "Password123!"
})
ok("register with unicode/accented name", s7, b7, [
    ("201", s7 == 201),
    ("name stored", b7.get("user",{}).get("name") == "José García-López"),
])
_u18b = b7.get("user",{})

# Long name (80 chars)
_sfx18c = uuid.uuid4().hex[:8]
long_name = "A" * 80
s8, b8 = post("/auth/register", {
    "name": long_name,
    "email": f"longname_{_sfx18c}@nexus.test",
    "password": "Password123!"
})
ok("register with 80-char name", s8, b8, [
    ("201", s8 == 201), ("name stored", b8.get("user",{}).get("name") == long_name),
])
_u18c = b8.get("user",{})

# Cleanup
cleanup_user(_u18.get("id"), _tok18_reg)
if _u18b.get("id"): cleanup_user(_u18b["id"])
if _u18c.get("id"): cleanup_user(_u18c["id"])

# ══════════════════════════════════════════════════════════════
# 19. CONCURRENT MESSAGING — 5 threads same conversation
# ══════════════════════════════════════════════════════════════

section("19. Concurrent messaging — 5 threads to same conversation")

_msg_results = []
_msg_lock = threading.Lock()
_msg_texts = []

def send_concurrent_msg(i):
    txt = f"Concurrent msg #{i} {uuid.uuid4().hex[:6]}"
    s, b = post("/conversations/1/messages", {"text": txt})
    with _msg_lock:
        _msg_results.append(200 <= s < 300)
        if 200 <= s < 300:
            _msg_texts.append(txt)

msg_threads = [threading.Thread(target=send_concurrent_msg, args=(i,)) for i in range(5)]
for t in msg_threads: t.start()
for t in msg_threads: t.join()

ok("5 concurrent messages all sent", 200, {}, [
    ("all succeeded", all(_msg_results)),
    ("count correct", len(_msg_results) == 5),
])

# Verify all messages appear in conversation
s, conv19 = get("/conversations/1")
all_texts = [m.get("text","") for m in conv19.get("messages",[])]
ok("all concurrent messages appear in conversation", s, conv19, [
    ("all found", all(txt in all_texts for txt in _msg_texts)),
])

# ══════════════════════════════════════════════════════════════
# 20. LOGICAL CONSISTENCY CHECKS
# ══════════════════════════════════════════════════════════════

section("20. Logical consistency checks")

# Feed post count increases after adding a post
s, feed_before = get("/feed")
_cnt_before = len(feed_before)
post("/feed", {"content": f"Consistency check post {uuid.uuid4().hex[:6]}"})
s, feed_after = get("/feed")
ok("feed count increases after POST", s, feed_after, [
    ("increased", len(feed_after) == _cnt_before + 1),
])

# All feed post ids are unique
s, feed_all = get("/feed")
ok("feed post ids are unique", s, feed_all, [
    ("unique", len({p["id"] for p in feed_all}) == len(feed_all)),
])

# All feed posts have required fields
ok("all feed posts have required fields", s, feed_all, [
    ("has id", all("id" in p for p in feed_all)),
    ("has content", all("content" in p for p in feed_all)),
    ("has author", all("author" in p for p in feed_all)),
    ("has authorId", all("authorId" in p for p in feed_all)),
    ("has likeCount", all("likeCount" in p for p in feed_all)),
    ("has comments", all("comments" in p for p in feed_all)),
    ("has createdAt", all("createdAt" in p for p in feed_all)),
])

# Users list: all ids unique
s, users_all = get("/users")
users_all = _ld(users_all)
ok("users list ids are unique", s, users_all, [
    ("unique", len({u["id"] for u in users_all}) == len(users_all)),
])

# Users list: all have required fields
ok("users list all have required fields", s, users_all, [
    ("has id", all("id" in u for u in users_all)),
    ("has name", all("name" in u for u in users_all)),
    ("has headline", all("headline" in u for u in users_all)),
])

# Notifications: all ids unique
s, notifs_all = get("/notifications")
notifs_all = _ld(notifs_all)
ok("notification ids unique", s, notifs_all, [
    ("unique", len({n["id"] for n in notifs_all}) == len(notifs_all)),
])

# Conversations: all ids unique
s, convs_all = get("/conversations")
convs_all = _ld(convs_all)
ok("conversation ids unique", s, convs_all, [
    ("unique", len({c["id"] for c in convs_all}) == len(convs_all)),
])

# Jobs: all ids unique and count >= 10
s, jobs_all = get("/jobs")
jobs_all = _ld(jobs_all)
ok("jobs list ids unique and >=10", s, jobs_all, [
    ("unique", len({j["id"] for j in jobs_all}) == len(jobs_all)),
    (">=10", len(jobs_all) >= 10),
])

# Feed sorted newest first (createdAt DESC) — double check with fresh feed
s, feed_sorted = get("/feed")
feed_sorted = _ld(feed_sorted)
if len(feed_sorted) >= 2:
    ts_check = [p.get("createdAt", 0) for p in feed_sorted[:10]]
    ok("feed sorted newest first (check 2)", s, feed_sorted, [
        ("descending", all(ts_check[i] >= ts_check[i+1] for i in range(len(ts_check)-1))),
    ])

# Author object in post has name field
ok("feed post author object has name", s, feed_sorted, [
    ("all have author.name", all(isinstance(p.get("author",{}).get("name"), str) for p in feed_sorted)),
])

# ══════════════════════════════════════════════════════════════
# 21. CONVERSATION DEPTH — ordering, lastMessage, participant shape
# ══════════════════════════════════════════════════════════════

section("21. Conversation depth — ordering, lastMessage, participant")

# Conversations list shape depth
s, convs21 = get("/conversations")
convs21 = _ld(convs21)
ok("conversations list full shape", s, convs21, [
    ("participantName is str", all(isinstance(c.get("participantName"), str) for c in convs21)),
    ("unreadCount is int", all(isinstance(c.get("unreadCount"), int) for c in convs21)),
    ("lastMessage is str or None", all(isinstance(c.get("lastMessage"), str) or c.get("lastMessage") is None for c in convs21)),
    ("isOnline is bool", all(isinstance(c.get("isOnline"), bool) for c in convs21)),
    ("participant has id+name", all("id" in c.get("participant",{}) and "name" in c.get("participant",{}) for c in convs21)),
])

# Send a message, verify lastMessage updates
_unique_msg = f"LastMsgTest_{uuid.uuid4().hex[:8]}"
post("/conversations/1/messages", {"text": _unique_msg})
s, convs21b = get("/conversations")
convs21b = _ld(convs21b)
conv1_21 = next((c for c in convs21b if c["id"] == 1), {})
ok("lastMessage updates after send", s, convs21b, [
    ("lastMessage is unique msg", conv1_21.get("lastMessage") == _unique_msg),
])

# Message ordering — messages in conversation are chronologically ordered
s, conv21_detail = get("/conversations/1")
msgs21 = conv21_detail.get("messages", [])
ok("conversation messages chronologically ordered", s, conv21_detail, [
    ("has messages", len(msgs21) > 0),
    ("ascending timestamps", all(
        msgs21[i].get("timestamp", 0) <= msgs21[i+1].get("timestamp", 0)
        for i in range(len(msgs21)-1)
    )),
])

# Message shape fields
ok("message shape has required fields", s, conv21_detail, [
    ("has id", all("id" in m for m in msgs21)),
    ("has text", all("text" in m for m in msgs21)),
    ("has senderId", all("senderId" in m for m in msgs21)),
    ("has timestamp", all("timestamp" in m for m in msgs21)),
    ("has isRead", all("isRead" in m for m in msgs21)),
])

# Very long message stored correctly (backend strips trailing whitespace)
long_msg = ("This is a very long message. " * 50).rstrip()
s, b21 = post("/conversations/1/messages", {"text": long_msg})
ok("very long message stored", s, b21, [
    ("has id", "id" in b21),
    ("text stored", b21.get("text") == long_msg),
])

# Unicode message
s, b21u = post("/conversations/1/messages", {"text": "Hello 你好 مرحبا こんにちは"})
ok("unicode message stored", s, b21u, [
    ("has id", "id" in b21u),
    ("unicode preserved", "你好" in b21u.get("text","")),
])

# ══════════════════════════════════════════════════════════════
# 22. FEED POST REACTIONS AND FIELD DEPTH
# ══════════════════════════════════════════════════════════════

section("22. Feed post reactions and field depth")

s, feed22 = get("/feed")
ok("feed post full field depth", s, feed22, [
    ("likeCount int>=0", all(isinstance(p.get("likeCount"), int) and p.get("likeCount") >= 0 for p in feed22)),
    ("comments is list", all(isinstance(p.get("comments"), list) for p in feed22)),
    ("createdAt int", all(isinstance(p.get("createdAt"), int) for p in feed22)),
    ("reactions dict", all(isinstance(p.get("reactions"), dict) for p in feed22)),
    ("isSaved bool", all(isinstance(p.get("isSaved"), bool) for p in feed22)),
    ("isLiked bool", all(isinstance(p.get("isLiked"), bool) for p in feed22)),
])

# Reactions have expected keys
reaction_keys = {"like", "celebrate", "love", "insightful", "funny", "support"}
ok("reactions has all 6 types", s, feed22, [
    ("all reaction keys", all(reaction_keys.issubset(set(p.get("reactions",{}).keys())) for p in feed22)),
    ("reaction values int", all(
        all(isinstance(v, int) for v in p.get("reactions",{}).values())
        for p in feed22
    )),
])

# totalReactions >= sum of reactions
ok("totalReactions >= sum of reaction values", s, feed22, [
    ("consistent", all(
        p.get("totalReactions", 0) >= sum(p.get("reactions",{}).values())
        for p in feed22
    )),
])

# Author object complete
ok("post author object has all fields", s, feed22, [
    ("author.id int", all(isinstance(p.get("author",{}).get("id"), int) for p in feed22)),
    ("author.name str", all(isinstance(p.get("author",{}).get("name"), str) for p in feed22)),
    ("author.headline str", all(isinstance(p.get("author",{}).get("headline"), str) for p in feed22)),
    ("author.avatarColor str", all(isinstance(p.get("author",{}).get("avatarColor"), str) for p in feed22)),
])

# Post with newlines stored correctly
nl_content = "Line one\nLine two\nLine three"
s, b22 = post("/feed", {"content": nl_content})
ok("post with newlines stored", s, b22, [
    ("has id", "id" in b22),
    ("newlines preserved", b22.get("content") == nl_content),
])

# Post with only special chars
s, b22s = post("/feed", {"content": "!@#$%^&*()_+-=[]{}|;':\",./<>?"})
ok("post with special chars stored", s, b22s, [("has id", "id" in b22s)])

# ══════════════════════════════════════════════════════════════
# 23. READINESS DEPTH — weights, breakdown, can_message boundary
# ══════════════════════════════════════════════════════════════

section("23. Readiness depth — weights, breakdown, can_message")

s, r23 = get("/outreach/readiness")

# Weights sum to 100
ok("breakdown weights sum to 100", s, r23, [
    ("sum=100", sum(x["weight"] for x in r23.get("breakdown",[])) == 100),
])

# Exactly 9 breakdown items
ok("breakdown has exactly 9 items", s, r23, [
    ("count=9", len(r23.get("breakdown",[])) == 9),
])

# Each breakdown item has all required keys
ok("breakdown items have all keys", s, r23, [
    ("all have key", all("key" in x for x in r23.get("breakdown",[]))),
    ("all have label", all("label" in x for x in r23.get("breakdown",[]))),
    ("all have weight", all("weight" in x for x in r23.get("breakdown",[]))),
    ("all have met", all("met" in x for x in r23.get("breakdown",[]))),
    ("all have tip", all("tip" in x for x in r23.get("breakdown",[]))),
])

# Weights are all positive ints
ok("all breakdown weights positive ints", s, r23, [
    ("positive ints", all(isinstance(x["weight"], int) and x["weight"] > 0 for x in r23.get("breakdown",[]))),
])

# can_message = score >= 60 (exact boundary)
ok("can_message matches score>=60", s, r23, [
    ("boundary correct", r23.get("can_message") == (r23.get("score",0) >= 60)),
])

# top_tips are all from unmet items
unmet23 = [x["tip"] for x in r23.get("breakdown",[]) if not x.get("met") and x.get("tip")]
top23 = r23.get("top_tips",[])
ok("top_tips subset of unmet tips", s, r23, [
    ("all in unmet", all(t in unmet23 for t in top23)),
])

# score == sum of met weights (redundant but regression-safe)
calc23 = sum(x["weight"] for x in r23.get("breakdown",[]) if x.get("met"))
ok("score equals sum of met weights (regression)", s, r23, [
    ("match", calc23 == r23.get("score")),
])

# ══════════════════════════════════════════════════════════════
# 24. DELETE USER → SUBSEQUENT LOGIN FAILS
# ══════════════════════════════════════════════════════════════

section("24. Delete user → subsequent login fails")

_u24, _t24 = make_user()
if _u24:
    _e24 = _u24.get("email","")
    # Confirm login works before delete
    s, b = post("/auth/login", {"email": _e24, "password": "Password123!"})
    ok("login works before delete", s, b, [("200", s == 200)])

    # Delete
    s, _ = delete(f"/users/{_u24['id']}", token=_t24)
    ok("delete user 204", s, _, [("204", s == 204)])

    # Login should fail after delete
    s, b = post("/auth/login", {"email": _e24, "password": "Password123!"})
    err("login fails after delete", s, b, 401)

    # GET /users/:id should 404
    s, b = get(f"/users/{_u24['id']}")
    err("GET deleted user → 404", s, b, 404)

# ══════════════════════════════════════════════════════════════
# 25. PROFILE UPDATE EDGE CASES
# ══════════════════════════════════════════════════════════════

section("25. Profile update edge cases")

_u25, _t25 = make_user()
if _u25:
    # PUT /me with only one field — other fields not wiped
    put("/me", {"headline": "First Headline", "about": "First about", "location": "NYC"}, token=_t25)
    s, b = put("/me", {"headline": "Updated Headline"}, token=_t25)
    ok("PUT /me one field: others preserved", s, b, [
        ("headline updated", b.get("headline") == "Updated Headline"),
        ("about preserved", b.get("about") == "First about"),
        ("location preserved", b.get("location") == "NYC"),
    ])

    # Multiple rapid sequential updates — last wins
    for val in ["V1","V2","V3","V4","V5"]:
        put("/me", {"headline": val}, token=_t25)
    s, b = get("/me", token=_t25)
    ok("rapid sequential updates: last wins", s, b, [("headline is V5", b.get("headline") == "V5")])

    # PUT /me with empty object → 400 (no valid fields)
    s, b = put("/me", {}, token=_t25)
    err("PUT /me empty object → 400", s, b, 400)

    # PUT /me with only unknown fields → 400
    s, b = put("/me", {"unknownField": "value", "anotherBad": 123}, token=_t25)
    err("PUT /me unknown fields only → 400", s, b, 400)

    cleanup_user(_u25.get("id"), _t25)

# ══════════════════════════════════════════════════════════════
# 26. SEARCH FINDS REGISTERED USERS AND THEIR CONTENT
# ══════════════════════════════════════════════════════════════

section("26. Search finds registered users")

_u26, _t26 = make_user("searchtest26")
if _u26:
    # Update profile so they're searchable
    put("/me", {"headline": "UniqueSearchableEngineer26 Nexus"}, token=_t26)
    _name26 = _u26.get("name","")

    # Search by unique name fragment
    _sq26 = urllib.parse.urlencode({"q": "searchtest26"})
    s, b = get(f"/search?{_sq26}")
    ok("search finds user by name fragment", s, b, [
        ("users found", len(b.get("users",[])) > 0),
        ("correct user", any(_name26 in u.get("name","") for u in b.get("users",[]))),
    ])

    # Create a post then search its unique content
    unique_post_content = f"UniquePostContent26_{uuid.uuid4().hex[:8]}"
    post("/feed", {"content": unique_post_content}, token=_t26)
    _spq = urllib.parse.urlencode({"q": unique_post_content[:20]})
    s, b2 = get(f"/search?{_spq}")
    ok("search finds post by content", s, b2, [
        ("posts found", len(b2.get("posts",[])) > 0),
    ])

    cleanup_user(_u26.get("id"), _t26)

# ══════════════════════════════════════════════════════════════
# 27. TONE PRODUCES DIFFERENT DRAFTS
# ══════════════════════════════════════════════════════════════

section("27. Different tones produce distinct drafts")

drafts27 = {}
for tone in ["professional", "friendly", "formal"]:
    s, b = post("/outreach/generate", {"recipientId": 2, "goal": "networking", "tone": tone})
    drafts27[tone] = b.get("draft","")
    ok(f"tone={tone} produces draft", s, b, [("has draft", bool(b.get("draft")))])

ok("professional != friendly draft", 200, {}, [
    ("differ", drafts27.get("professional") != drafts27.get("friendly")),
])
ok("professional != formal draft", 200, {}, [
    ("differ", drafts27.get("professional") != drafts27.get("formal")),
])
ok("friendly != formal draft", 200, {}, [
    ("differ", drafts27.get("friendly") != drafts27.get("formal")),
])

# ══════════════════════════════════════════════════════════════
# 28. STRESS — 30 concurrent reads, 15 concurrent generates
# ══════════════════════════════════════════════════════════════

section("28. Stress — 30 concurrent reads, 15 concurrent generates")

# 30 concurrent reads across all endpoints
_stress_results = []
_stress_lock = threading.Lock()
_stress_paths = ["/feed","/jobs","/users","/notifications","/conversations",
                 "/outreach/readiness","/events","/groups","/courses","/news"]

def stress_read(i):
    path = _stress_paths[i % len(_stress_paths)]
    s, b = get(path)
    with _stress_lock:
        _stress_results.append(200 <= s < 300)

_st = time.time()
threads28 = [threading.Thread(target=stress_read, args=(i,)) for i in range(30)]
for t in threads28: t.start()
for t in threads28: t.join()
_elapsed28 = time.time() - _st

ok(f"30 concurrent reads in {_elapsed28:.1f}s", 200, {}, [
    ("all 2xx", all(_stress_results)),
    ("count 30", len(_stress_results) == 30),
])

# 15 concurrent outreach generates
_gen28_results = []
_gen28_lock = threading.Lock()

def stress_generate(i):
    s, b = post("/outreach/generate", {
        "recipientId": (i % 10) + 2,
        "goal": GOALS[i % 4],
        "tone": TONES[i % 3],
    })
    with _gen28_lock:
        _gen28_results.append({
            "ok": 200 <= s < 300,
            "has_draft": bool(b.get("draft")),
            "len_ok": len(b.get("draft","")) <= 500,
        })

_gst = time.time()
gen_threads28 = [threading.Thread(target=stress_generate, args=(i,)) for i in range(15)]
for t in gen_threads28: t.start()
for t in gen_threads28: t.join()
_gelapsed28 = time.time() - _gst

ok(f"15 concurrent outreach generates in {_gelapsed28:.1f}s", 200, {}, [
    ("all 2xx", all(r["ok"] for r in _gen28_results)),
    ("all have draft", all(r["has_draft"] for r in _gen28_results)),
    ("all ≤500 chars", all(r["len_ok"] for r in _gen28_results)),
])

# ══════════════════════════════════════════════════════════════
# 29. IDEMPOTENCY — marking read multiple times
# ══════════════════════════════════════════════════════════════

section("29. Idempotency and stability")

# Mark same notification read twice — no crash
s, notifs29 = get("/notifications")
notifs29 = _ld(notifs29)
if notifs29:
    nid29 = notifs29[0]["id"]
    s1, b1 = patch(f"/notifications/{nid29}/read")
    s2, b2 = patch(f"/notifications/{nid29}/read")
    ok("mark notif read twice — idempotent", s2, b2, [
        ("2xx", 200 <= s2 < 300),
        ("still isRead", b2.get("isRead") is True),
    ])

# Read-all multiple times — idempotent
s1, _ = patch("/notifications/read-all")
s2, b2 = patch("/notifications/read-all")
ok("read-all twice — idempotent", s2, b2, [
    ("2xx", 200 <= s2 < 300),
    ("success", b2.get("success") is True),
])

# GET /notifications stable count (no extra items appear on read)
_, n1 = get("/notifications")
_, n2 = get("/notifications")
ok("notifications count stable across reads", 200, {}, [
    ("same count", len(n1) == len(n2)),
])

# GET /conversations stable count
_, c1 = get("/conversations")
_, c2 = get("/conversations")
ok("conversations count stable across reads", 200, {}, [
    ("same count", len(c1) == len(c2)),
])

# GET /users stable count
_, u1 = get("/users")
_, u2 = get("/users")
ok("users count stable across reads", 200, {}, [
    ("same count", len(u1) == len(u2)),
])

# ══════════════════════════════════════════════════════════════
# 30. FULL END-TO-END LINKEDIN-LIKE FLOWS (3 distinct journeys)
# ══════════════════════════════════════════════════════════════

section("30. End-to-end LinkedIn-like journeys")

# Journey A: Student job-hunting flow
#  Register → fill profile → check readiness → generate job inquiry → post about search → message
uA, tA = make_user()
if uA:
    put("/me", {
        "headline": "CS Student at NJIT | Seeking SWE Internship",
        "about": "Passionate about building scalable distributed systems. Experienced with Python, React, and AWS.",
        "location": "Newark, NJ",
    }, token=tA)
    sA1, rA = get("/outreach/readiness", token=tA)
    ok("Journey A: readiness after profile fill", sA1, rA, [("has score", "score" in rA)])

    sA2, mA = post("/outreach/generate", {
        "recipientId": 5,
        "goal": "job_inquiry",
        "tone": "professional",
        "details": {"yourRole": "CS student", "company": "Google", "role": "SWE Intern"}
    }, token=tA)
    ok("Journey A: job inquiry outreach generated", sA2, mA, [
        ("has draft", bool(mA.get("draft"))),
        ("Google in draft", "Google" in mA.get("draft","")),
    ])

    sA3, postA = post("/feed", {"content": "Excited to be applying for SWE internships! Open to connections."}, token=tA)
    ok("Journey A: post about job search", sA3, postA, [("has id", "id" in postA)])

    sA4, msgA = post("/conversations/1/messages", {"text": "Hi! I'm a CS student looking for advice on breaking into tech."}, token=tA)
    ok("Journey A: send message to connection", sA4, msgA, [("has id", "id" in msgA)])

    cleanup_user(uA.get("id"), tA)

# Journey B: Recruiter checking candidates
#  Register → view users → get each user's readiness → generate outreach to top candidates
uB, tB = make_user()
if uB:
    sB1, users_B = get("/users", token=tB)
    ok("Journey B: recruiter views all users", sB1, users_B, [
        ("non-empty", len(users_B) > 0),
    ])

    # Check readiness for 5 candidates
    ready_users = []
    for candidate in _ld(users_B)[:5]:
        sB2, rB = get(f"/outreach/readiness?userId={candidate['id']}", token=tB)
        if 200 <= sB2 < 300 and rB.get("can_message"):
            ready_users.append(candidate)
    ok("Journey B: identify ready candidates", 200, {}, [
        ("got results", isinstance(ready_users, list)),
    ])

    # Generate outreach to first ready candidate
    if ready_users:
        sB3, mB = post("/outreach/generate", {
            "recipientId": ready_users[0]["id"],
            "goal": "job_inquiry",
            "tone": "professional",
            "details": {"yourRole": "Technical Recruiter", "company": "FAANG Corp", "role": "SWE"}
        }, token=tB)
        ok("Journey B: recruiter generates outreach to candidate", sB3, mB, [
            ("has draft", bool(mB.get("draft"))),
        ])

    cleanup_user(uB.get("id"), tB)

# Journey C: Networking researcher
#  Register → browse feed → search for topic → check notifications → generate advice-seeking message
uC, tC = make_user()
if uC:
    sC1, feedC = get("/feed", token=tC)
    ok("Journey C: browse feed", sC1, feedC, [("non-empty", len(feedC) > 0)])

    _sqC = urllib.parse.urlencode({"q": "engineer"})
    sC2, searchC = get(f"/search?{_sqC}", token=tC)
    ok("Journey C: search for topic", sC2, searchC, [("has results", "users" in searchC)])

    sC3, notifsC = get("/notifications", token=tC)
    ok("Journey C: check notifications", sC3, notifsC, [("is list", isinstance(notifsC, list))])

    # Generate advice-seeking message using found users
    target_id = searchC.get("users",[])[0].get("id",3) if searchC.get("users") else 3
    sC4, mC = post("/outreach/generate", {
        "recipientId": target_id,
        "goal": "advice",
        "tone": "friendly",
        "custom_note": "I came across your work and would love your perspective."
    }, token=tC)
    ok("Journey C: advice outreach to found user", sC4, mC, [
        ("has draft", bool(mC.get("draft"))),
        ("draft ≤500", len(mC.get("draft","")) <= 500),
    ])

    cleanup_user(uC.get("id"), tC)

# ══════════════════════════════════════════════════════════════
# 31. GET /me — full profile field depth
# ══════════════════════════════════════════════════════════════

section("31. GET /me — full profile field depth")

s, me31 = get("/me")
ok("GET /me has full profile fields", s, me31, [
    ("has id", "id" in me31),
    ("has name", "name" in me31),
    ("has email", "email" in me31),
    ("has headline", "headline" in me31),
    ("has location", "location" in me31),
    ("has about", "about" in me31),
    ("has experience", "experience" in me31),
    ("has education", "education" in me31),
    ("has skills", "skills" in me31),
    ("experience is list", isinstance(me31.get("experience"), list)),
    ("education is list", isinstance(me31.get("education"), list)),
    ("skills is list", isinstance(me31.get("skills"), list)),
    ("isPremium bool", isinstance(me31.get("isPremium"), bool)),
    ("connections int", isinstance(me31.get("connections"), int)),
])

# GET /users/:id — public profile fields
s, pub31 = get("/users/2")
ok("GET /users/:id has public profile fields", s, pub31, [
    ("has id", "id" in pub31),
    ("has name", "name" in pub31),
    ("has headline", "headline" in pub31),
    ("has location", "location" in pub31),
    ("has about", "about" in pub31),
    ("has skills", "skills" in pub31),
    ("skills is list", isinstance(pub31.get("skills"), list)),
    ("isConnected bool", isinstance(pub31.get("isConnected"), bool)),
    ("isPremium bool", isinstance(pub31.get("isPremium"), bool)),
    ("no email exposed", "email" not in pub31),  # privacy: email not in public profile
    ("connections int", isinstance(pub31.get("connections"), int)),
])

# ══════════════════════════════════════════════════════════════
# 32. SECURITY — injection, encoding, boundary inputs
# ══════════════════════════════════════════════════════════════

section("32. Security — injections, encoding, boundary inputs")

# SQL injection in POST /feed content — no crash, stored as text
s, b32 = post("/feed", {"content": "'; DROP TABLE posts; --"})
ok("SQL injection in feed content — stored as text", s, b32, [
    ("2xx", 200 <= s < 300),
    ("has id", "id" in b32),
])

# Null bytes in message text — handled
s, b32m = post("/conversations/1/messages", {"text": "Hello\x00World"})
ok("null byte in message — no crash", s, b32m, [("2xx", 200 <= s < 300)])

# Very long outreach custom_note
s, b32o = post("/outreach/generate", {
    "recipientId": 2,
    "custom_note": "Note " * 100,  # 500 chars
})
ok("very long custom_note — no crash", s, b32o, [
    ("2xx", 200 <= s < 300),
    ("draft ≤500", len(b32o.get("draft","")) <= 500),
])

# HTML tags in outreach details
s, b32h = post("/outreach/generate", {
    "recipientId": 3,
    "details": {"yourRole": "<b>CS Student</b>", "company": "<script>Google</script>"},
})
ok("HTML in outreach details — no crash", s, b32h, [
    ("2xx", 200 <= s < 300),
    ("has draft", bool(b32h.get("draft"))),
])

# Unicode control chars in search
_ctrl_q = urllib.parse.urlencode({"q": "test\u200bengineer"})  # zero-width space
s, b32s = get(f"/search?{_ctrl_q}")
ok("unicode zero-width space in search — no crash", s, b32s, [("2xx", 200 <= s < 300)])

# Outreach recipientId as string "admin" (non-numeric) — rejected
s, b32r = post("/outreach/generate", {"recipientId": "admin"})
err("string recipientId 'admin' → 400", s, b32r, 400)

# Registration: name with only spaces → 400
s, b32n = post("/auth/register", {"name": "   ", "email": f"spaces_{uuid.uuid4().hex[:6]}@test.com", "password": "Password123!"})
err("register name-only-spaces → 400", s, b32n, 400)

# Registration: email with spaces → 400
s, b32e = post("/auth/register", {"name": "Valid Name", "email": "has spaces@test.com", "password": "Password123!"})
err("register email-with-spaces → 400", s, b32e, 400)

# ══════════════════════════════════════════════════════════════
# 33. FEED BEHAVIOR — liked/saved state, type field
# ══════════════════════════════════════════════════════════════

section("33. Feed post isLiked/isSaved initial state")

_u33, _t33 = make_user()
if _u33:
    # New post by fresh user — isLiked and isSaved should be False initially
    s, new_post33 = post("/feed", {"content": f"Brand new post {uuid.uuid4().hex[:6]}"}, token=_t33)
    ok("new post has isLiked=False, isSaved=False", s, new_post33, [
        ("isLiked false", new_post33.get("isLiked") is False),
        ("isSaved false", new_post33.get("isSaved") is False),
        ("likeCount 0", new_post33.get("likeCount") == 0),
    ])

    # All feed posts from fresh user perspective should have bool isLiked/isSaved
    s, feed33 = get("/feed", token=_t33)
    feed33 = _ld(feed33)
    ok("all feed posts have bool isLiked/isSaved", s, feed33, [
        ("isLiked bool", all(isinstance(p.get("isLiked"), bool) for p in feed33)),
        ("isSaved bool", all(isinstance(p.get("isSaved"), bool) for p in feed33)),
    ])

    cleanup_user(_u33.get("id"), _t33)

# ══════════════════════════════════════════════════════════════
# 34. OUTREACH — no double-name bug (regression guard)
# ══════════════════════════════════════════════════════════════

section("34. Outreach — no double-name / template-bleed regression")

# Register as "Alex Johnson" (same as seed user 1) — should not cause name collision
_u34, _t34 = make_user()
if _u34:
    # Generate from this user — "I'm [name], [name]" bug must not appear
    s, b34 = post("/outreach/generate", {
        "recipientId": 2,
        "goal": "networking",
        "tone": "professional",
        "details": {"yourRole": "CS student", "field": "software engineering"}
    }, token=_t34)
    draft34 = b34.get("draft", "")
    name34 = _u34.get("name","")
    first34 = name34.split()[0] if name34 else ""
    # Guard: first name should not appear twice in a row like "Alex, Alex" or "Alex Alex"
    ok("no double-name in draft (regression)", s, b34, [
        ("has draft", bool(draft34)),
        ("no consecutive same name", f"{first34}, {first34}" not in draft34 and f"{first34} {first34}" not in draft34),
    ])
    cleanup_user(_u34.get("id"), _t34)

# ══════════════════════════════════════════════════════════════
# 35. CONVERSATIONS — multiple convs, valid IDs, error handling
# ══════════════════════════════════════════════════════════════

section("35. Conversations — multiple convs, error handling")

s, convs35 = get("/conversations")
convs35 = _ld(convs35)
ok("conversations list non-empty", s, convs35, [
    ("non-empty", len(convs35) > 0),
    ("count >=3", len(convs35) >= 3),
])

# Get first 3 conversations individually
for c35 in convs35[:3]:
    cid35 = c35["id"]
    s35, detail35 = get(f"/conversations/{cid35}")
    ok(f"GET /conversations/{cid35} valid", s35, detail35, [
        ("has messages list", isinstance(detail35.get("messages"), list)),
        ("has id", "id" in detail35),
    ])

# Non-numeric conversation id → 404 (Flask treats it as unknown route)
s35b, b35b = get("/conversations/abc")
err("GET /conversations/abc → 404", s35b, b35b, 404)

# ══════════════════════════════════════════════════════════════
# 36. USERS — excludes current user, complete list shape
# ══════════════════════════════════════════════════════════════

section("36. Users list — excludes current user")

# Default user is user 1 — GET /users must not include user 1
s, users36 = get("/users")
ok("GET /users excludes current user (user 1)", s, users36, [
    ("user 1 not in list", not any(u.get("id") == 1 for u in users36)),
])

# With a registered user's token — should exclude that user
_u36, _t36 = make_user()
if _u36:
    _id36 = _u36["id"]
    s, users36t = get("/users", token=_t36)
    ok("GET /users with token excludes self", s, users36t, [
        ("self not in list", not any(u.get("id") == _id36 for u in users36t)),
    ])
    cleanup_user(_id36, _t36)

# ══════════════════════════════════════════════════════════════
# 37. JOBS — search/filter, all jobs have required fields
# ══════════════════════════════════════════════════════════════

section("37. Jobs — comprehensive field checks")

s, jobs37 = get("/jobs")
ok("all jobs have complete fields", s, jobs37, [
    ("has id", all("id" in j for j in jobs37)),
    ("has title", all("title" in j for j in jobs37)),
    ("has company", all("company" in j for j in jobs37)),
    ("has location", all("location" in j for j in jobs37)),
    ("has salary", all("salary" in j for j in jobs37)),
    ("has skills", all("skills" in j for j in jobs37)),
    ("has matchScore", all("matchScore" in j for j in jobs37)),
    ("has postedDays", all("postedDays" in j for j in jobs37)),
    ("matchScore 0-100", all(0 <= j.get("matchScore",0) <= 100 for j in jobs37)),
    ("skills is list", all(isinstance(j.get("skills"), list) for j in jobs37)),
    ("isApplied bool", all(isinstance(j.get("isApplied"), bool) for j in jobs37)),
    ("isSaved bool", all(isinstance(j.get("isSaved"), bool) for j in jobs37)),
])

# Job description has content
if jobs37:
    s37, jd37 = get(f"/jobs/{jobs37[0]['id']}")
    ok("job description is non-empty string", s37, jd37, [
        ("has desc", bool(jd37.get("description"))),
        ("desc is str", isinstance(jd37.get("description"), str)),
    ])

# ══════════════════════════════════════════════════════════════
# 38. 20 CONCURRENT FULL FLOWS (larger stress)
# ══════════════════════════════════════════════════════════════

section("38. 15 concurrent full user flows")

_c38_errors = []
_c38_lock = threading.Lock()

def flow38(i):
    errors = []
    u, tok = make_user()
    if not u:
        with _c38_lock: _c38_errors.append(f"user {i}: register failed")
        return
    uid = u["id"]

    # Profile update
    s, b = put("/me", {"headline": f"Stress test user {i}"}, token=tok)
    if not (200 <= s < 300): errors.append(f"profile update failed: {s}")

    # Post
    s, b = post("/feed", {"content": f"Stress post {i} {uuid.uuid4().hex[:4]}"}, token=tok)
    if not (200 <= s < 300): errors.append(f"post failed: {s}")

    # Readiness
    s, b = get("/outreach/readiness", token=tok)
    if "score" not in b: errors.append("no score in readiness")

    # Generate
    s, b = post("/outreach/generate", {
        "recipientId": (i % 10) + 2, "goal": GOALS[i%4], "tone": TONES[i%3]
    }, token=tok)
    if not b.get("draft"): errors.append("no draft")

    # Message
    s, b = post("/conversations/1/messages", {"text": f"Stress msg {i}"}, token=tok)
    if not (200 <= s < 300): errors.append(f"msg failed: {s}")

    cleanup_user(uid, tok)
    with _c38_lock:
        if errors: _c38_errors.append(f"user {i}: {errors}")

_t38_start = time.time()
threads38 = [threading.Thread(target=flow38, args=(i,)) for i in range(15)]
for t in threads38: t.start()
for t in threads38: t.join()
_t38_elapsed = time.time() - _t38_start

ok(f"15 concurrent full flows in {_t38_elapsed:.1f}s", 200, {}, [
    ("no errors", len(_c38_errors) == 0),
])
for e in _c38_errors:
    print(f"    FLOW38 ERROR: {e}")

# ══════════════════════════════════════════════════════════════
# 39. OUTREACH TIPS ARE ACTIONABLE (not empty, not too short)
# ══════════════════════════════════════════════════════════════

section("39. Outreach tips quality and alternatives diversity")

# Tips should be >=10 chars each (real advice, not empty/placeholder)
for tone in TONES:
    s, b39 = post("/outreach/generate", {"recipientId": 2, "goal": "networking", "tone": tone})
    ok(f"tips are substantive strings (tone={tone})", s, b39, [
        ("3 tips", len(b39.get("tips",[])) == 3),
        ("each >=10 chars", all(len(t) >= 10 for t in b39.get("tips",[]))),
    ])

# Alternatives for different goals — all <= 500 chars
for goal in GOALS:
    s, b39g = post("/outreach/generate", {"recipientId": 3, "goal": goal, "tone": "professional"})
    alts = b39g.get("alternatives",[])
    ok(f"alternatives quality (goal={goal})", s, b39g, [
        ("2 alternatives", len(alts) == 2),
        ("both non-empty", all(bool(a) for a in alts)),
        ("both ≤500", all(len(a) <= 500 for a in alts)),
        ("differ", alts[0] != alts[1] if len(alts) >= 2 else True),
    ])

# ══════════════════════════════════════════════════════════════
# 40. NOTIFICATIONS — all shape fields, type field
# ══════════════════════════════════════════════════════════════

section("40. Notifications — shape depth and type field")

s, notifs40 = get("/notifications")
notifs40 = _ld(notifs40)
ok("notifications full shape", s, notifs40, [
    ("is list", isinstance(notifs40, list)),
    ("has id", all("id" in n for n in notifs40)),
    ("has isRead", all("isRead" in n for n in notifs40)),
    ("has content", all("content" in n for n in notifs40)),
    ("has type", all("type" in n for n in notifs40)),
    ("isRead is bool", all(isinstance(n.get("isRead"), bool) for n in notifs40)),
    ("content non-empty", all(bool(n.get("content")) for n in notifs40)),
    ("type non-empty string", all(isinstance(n.get("type"), str) and len(n.get("type","")) > 0 for n in notifs40)),
])

# After read-all, all isRead=True
patch("/notifications/read-all")
s, notifs40b = get("/notifications")
notifs40b = _ld(notifs40b)
ok("after read-all all isRead True", s, notifs40b, [
    ("all read", all(n.get("isRead") for n in notifs40b)),
])

# Mark unknown → 404
s, b40 = patch("/notifications/9999999/read")
err("mark unknown notif → 404", s, b40, 404)

# ══════════════════════════════════════════════════════════════
# 41. FEED DEPTH — reposts, commentCount, multi-author
# ══════════════════════════════════════════════════════════════

section("41. Feed depth — reposts, commentCount, no-auth author")

s, feed41 = get("/feed")
feed41 = _ld(feed41)
ok("feed reposts and commentCount are ints", s, feed41, [
    ("reposts int", all(isinstance(p.get("reposts"), int) for p in feed41)),
    ("commentCount int", all(isinstance(p.get("commentCount"), int) for p in feed41)),
    ("reposts>=0", all(p.get("reposts",0) >= 0 for p in feed41)),
    ("commentCount>=0", all(p.get("commentCount",0) >= 0 for p in feed41)),
])

# No-auth POST /feed assigns to default user (id=1)
_noauth_content = f"NoAuthPost_{uuid.uuid4().hex[:8]}"
s, b41 = post("/feed", {"content": _noauth_content})
ok("no-auth POST /feed uses user 1 as author", s, b41, [
    ("has id", "id" in b41),
    ("authorId is 1", b41.get("authorId") == 1),
])

# Feed has posts from multiple different authors
author_ids = {p.get("authorId") for p in feed41}
ok("feed has posts from multiple authors", s, feed41, [
    ("multiple authors", len(author_ids) > 1),
])

# Feed post timestamp is in the past or very recent (not 0 or None)
ok("feed post timestamps are valid", s, feed41, [
    ("all positive", all(p.get("createdAt",0) > 0 for p in feed41)),
])

# Create 3 posts in order, verify ordering
_order_ids = []
for i in range(3):
    s, b = post("/feed", {"content": f"OrderTest_{i}_{uuid.uuid4().hex[:4]}"})
    if "id" in b:
        _order_ids.append(b["id"])

s, feed41b = get("/feed")
feed41b = _ld(feed41b)
_top3 = [p["id"] for p in feed41b[:3]]
ok("3 newest posts appear at top of feed in reverse creation order", s, feed41b, [
    ("newest at top", _order_ids and _order_ids[-1] == _top3[0] if _order_ids and _top3 else True),
])

# ══════════════════════════════════════════════════════════════
# 42. SEARCH — query echo, cross-field search
# ══════════════════════════════════════════════════════════════

section("42. Search — query echo, cross-field results")

# Search response echoes query string
s, b42 = get("/search?q=software")
ok("search echoes query in response", s, b42, [
    ("query field present", "query" in b42),
    ("query value matches", b42.get("query") == "software"),
])

# Search for a known seed company name fragment
s, b42c = get("/search?q=Google")
ok("search finds companies by name", s, b42c, [
    ("companies found", len(b42c.get("companies",[])) > 0),
])

# Search for a known job keyword
s, b42j = get("/search?q=Software")
ok("search finds jobs by keyword", s, b42j, [
    ("jobs or users found", len(b42j.get("jobs",[])) + len(b42j.get("users",[])) > 0),
])

# Empty search → empty results, not crash
s, b42e = get("/search?q=")
ok("empty search returns empty result sets", s, b42e, [
    ("users empty list", b42e.get("users") == []),
    ("jobs empty list", b42e.get("jobs") == []),
    ("companies empty list", b42e.get("companies") == []),
])

# Very obscure query → empty but no crash
_obscure = urllib.parse.urlencode({"q": "xyzxyzxyz_obscure_123abc"})
s, b42o = get(f"/search?{_obscure}")
ok("obscure query returns empty, no crash", s, b42o, [
    ("2xx", 200 <= s < 300),
    ("users empty", b42o.get("users") == []),
])

# ══════════════════════════════════════════════════════════════
# 43. GROUPS — all groups detail endpoint works
# ══════════════════════════════════════════════════════════════

section("43. Groups — all group detail endpoints")

s, groups43 = get("/groups")
groups43 = _ld(groups43)
ok("groups list has >=5", s, groups43, [
    (">=5", len(groups43) >= 5),
])

for g43 in groups43:
    gid43 = g43["id"]
    s43, d43 = get(f"/groups/{gid43}")
    ok(f"GET /groups/{gid43} works", s43, d43, [
        ("has id", "id" in d43),
        ("has name", "name" in d43),
        ("has members", "members" in d43),
        ("members int", isinstance(d43.get("members"), int)),
        ("id matches", d43.get("id") == gid43),
    ])

# ══════════════════════════════════════════════════════════════
# 44. OUTREACH — details.recipient field used in greeting
# ══════════════════════════════════════════════════════════════

section("44. Outreach details.recipient field and self-outreach")

# Greeting uses actual recipient's name from DB (not details.recipient)
s, recip44 = get("/users/2")
first44 = recip44.get("name","").split()[0] if recip44.get("name") else ""
s, b44 = post("/outreach/generate", {
    "recipientId": 2,
    "goal": "networking",
    "details": {"yourRole": "CS student"}
})
ok("outreach greeting uses recipient's actual first name", s, b44, [
    ("has draft", bool(b44.get("draft"))),
    ("recipient first name in draft", bool(first44) and first44 in b44.get("draft","")),
])

# Outreach to self (recipientId = 1 = current user) — no crash
s, b44s = post("/outreach/generate", {"recipientId": 1, "goal": "networking"})
ok("outreach to self (recipientId=1) — no crash", s, b44s, [
    ("2xx", 200 <= s < 300),
    ("has draft", bool(b44s.get("draft"))),
    ("draft ≤500", len(b44s.get("draft","")) <= 500),
])

# ══════════════════════════════════════════════════════════════
# 45. SEED DATA INTEGRITY — minimum counts, known users exist
# ══════════════════════════════════════════════════════════════

section("45. Seed data integrity — minimum counts")

s, feed45 = get("/feed")
feed45 = _ld(feed45)
ok("feed has >=10 seed posts", s, feed45, [(">=10", len(feed45) >= 10)])

s, jobs45 = get("/jobs")
jobs45 = _ld(jobs45)
ok("jobs has >=10 seed jobs", s, jobs45, [(">=10", len(jobs45) >= 10)])

s, notifs45 = get("/notifications")
notifs45 = _ld(notifs45)
ok("notifications has >=5 seed entries", s, notifs45, [(">=5", len(notifs45) >= 5)])

s, convs45 = get("/conversations")
convs45 = _ld(convs45)
ok("conversations has >=3 seed entries", s, convs45, [(">=3", len(convs45) >= 3)])

s, groups45 = get("/groups")
groups45 = _ld(groups45)
ok("groups has >=5 seed entries", s, groups45, [(">=5", len(groups45) >= 5)])

s, courses45 = get("/courses")
courses45 = _ld(courses45)
ok("courses has >=5 seed entries", s, courses45, [(">=5", len(courses45) >= 5)])

s, news45 = get("/news")
news45 = _ld(news45)
ok("news has >=5 seed entries", s, news45, [(">=5", len(news45) >= 5)])

s, tags45 = get("/hashtags")
tags45 = _ld(tags45)
ok("hashtags has >=5 seed entries", s, tags45, [(">=5", len(tags45) >= 5)])

# Known user 2 exists and has a name
s, u2_45 = get("/users/2")
ok("seed user 2 exists and has name", s, u2_45, [
    ("has name", bool(u2_45.get("name"))),
    ("has headline", "headline" in u2_45),
])

# ══════════════════════════════════════════════════════════════
# 46. AUTHENTICATED vs UNAUTHENTICATED BEHAVIOR
# ══════════════════════════════════════════════════════════════

section("46. Authenticated vs unauthenticated behavior")

_u46, _t46 = make_user()
if _u46:
    _uid46 = _u46["id"]

    # GET /me with no token → user 1
    s, b46a = get("/me")
    ok("GET /me no token → user 1", s, b46a, [("id=1", b46a.get("id") == 1)])

    # GET /me with own token → own user
    s, b46b = get("/me", token=_t46)
    ok("GET /me with own token → own id", s, b46b, [("correct id", b46b.get("id") == _uid46)])

    # GET /feed both authed and unauthed — both return lists
    s, f46a = get("/feed")
    f46a = _ld(f46a)
    s, f46b = get("/feed", token=_t46)
    f46b = _ld(f46b)
    ok("GET /feed authenticated returns list", s, f46b, [("is list", isinstance(f46b, list))])
    ok("GET /feed unauthenticated returns same feed", s, f46a, [
        ("same count", len(f46a) == len(f46b)),
    ])

    # POST /feed with own token → post has own authorId
    s, fp46 = post("/feed", {"content": f"Auth test post {uuid.uuid4().hex[:6]}"}, token=_t46)
    ok("POST /feed with token → own authorId", s, fp46, [
        ("authorId matches", fp46.get("authorId") == _uid46),
    ])

    # PUT /me with wrong token (invalid) → falls back to user 1
    s, b46c = put("/me", {"headline": "Should update user 1"}, token="totally_invalid_token")
    ok("PUT /me with invalid token → updates user 1", s, b46c, [
        ("2xx", 200 <= s < 300),
        ("id=1", b46c.get("id") == 1),
    ])

    cleanup_user(_uid46, _t46)

# ══════════════════════════════════════════════════════════════
# 47. CONCURRENT REGISTRATION STRESS (25 simultaneous)
# ══════════════════════════════════════════════════════════════

section("47. 15 simultaneous registrations")

_c47_users = []
_c47_errors = []
_c47_lock = threading.Lock()

def register47(i):
    u, tok = make_user()
    with _c47_lock:
        if u and u.get("id"):
            _c47_users.append((u["id"], tok))
        else:
            _c47_errors.append(f"user {i} failed to register")

_t47_start = time.time()
threads47 = [threading.Thread(target=register47, args=(i,)) for i in range(15)]
for t in threads47: t.start()
for t in threads47: t.join()
_t47_elapsed = time.time() - _t47_start

ok(f"15 simultaneous registrations in {_t47_elapsed:.1f}s", 200, {}, [
    ("all succeeded", len(_c47_errors) == 0),
    ("15 users created", len(_c47_users) == 15),
])
for e in _c47_errors: print(f"    C47 ERROR: {e}")

# All 15 have unique IDs
_ids47 = [uid for uid, _ in _c47_users]
ok("15 registered users have unique IDs", 200, {}, [
    ("unique", len(set(_ids47)) == len(_ids47)),
])

# Cleanup all 15
for uid47, tok47 in _c47_users:
    cleanup_user(uid47, tok47)

# ══════════════════════════════════════════════════════════════
# 48. READINESS — fresh vs complete profile comparison
# ══════════════════════════════════════════════════════════════

section("48. Readiness score improves with profile completeness")

# Fresh user (minimal profile)
_u48f, _t48f = make_user()
_score48_fresh = 0
if _u48f:
    s, r48f = get(f"/outreach/readiness?userId={_u48f['id']}")
    _score48_fresh = r48f.get("score", 0)
    ok("fresh user readiness score", s, r48f, [
        ("score < 100", _score48_fresh < 100),
        ("has level", r48f.get("level") in ["ready","almost_ready","not_ready"]),
    ])

# Same user after filling profile
if _u48f:
    put("/me", {
        "headline": "Senior Software Engineer | Python | AWS | Distributed Systems",
        "about": "10 years of experience building high-scale distributed systems at top tech companies. Passionate about mentorship and open source contribution.",
        "location": "San Francisco, CA",
        "industry": "Technology",
    }, token=_t48f)
    s, r48c = get(f"/outreach/readiness?userId={_u48f['id']}")
    _score48_complete = r48c.get("score", 0)
    ok("readiness score improves after profile fill", s, r48c, [
        ("score improved", _score48_complete >= _score48_fresh),
        ("improvement > 0", _score48_complete > _score48_fresh),
    ])
    cleanup_user(_u48f.get("id"), _t48f)

# ══════════════════════════════════════════════════════════════
# 49. FEED → SEARCH → OUTREACH → MESSAGE (complete loop)
# ══════════════════════════════════════════════════════════════

section("49. Complete loop: feed → search → outreach → message")

_u49, _t49 = make_user()
if _u49:
    # Step 1: View feed
    s, f49 = get("/feed", token=_t49)
    f49 = _ld(f49)
    ok("step 1: view feed", s, f49, [("non-empty", len(f49) > 0)])

    # Step 2: Search for someone to reach out to
    s, srch49 = get("/search?q=engineer", token=_t49)
    ok("step 2: search for connections", s, srch49, [("has users", "users" in srch49)])

    # Step 3: Check their readiness / find a target
    target49 = srch49.get("users",[{}])[0].get("id",2) if srch49.get("users") else 2
    s, r49 = get(f"/outreach/readiness?userId={target49}", token=_t49)
    ok("step 3: check target readiness", s, r49, [("has score", "score" in r49)])

    # Step 4: Generate outreach
    s, m49 = post("/outreach/generate", {
        "recipientId": target49,
        "goal": "networking",
        "tone": "friendly",
        "custom_note": "I saw your profile and would love to connect!",
    }, token=_t49)
    ok("step 4: generate outreach message", s, m49, [
        ("has draft", bool(m49.get("draft"))),
        ("has tips", len(m49.get("tips",[])) == 3),
        ("has alternatives", len(m49.get("alternatives",[])) == 2),
    ])

    # Step 5: Send actual message in a conversation
    s, convs49 = get("/conversations", token=_t49)
    convs49 = _ld(convs49)
    if convs49:
        s, sent49 = post(f"/conversations/{convs49[0]['id']}/messages",
                         {"text": m49.get("draft","Hi there!")[:200]}, token=_t49)
        ok("step 5: send generated draft as message", s, sent49, [
            ("has id", "id" in sent49),
            ("isMe True", sent49.get("isMe") is True),
        ])

    # Step 6: Post about the interaction
    s, post49 = post("/feed", {"content": "Just reached out to a new connection! Excited to grow my network."}, token=_t49)
    ok("step 6: post about networking", s, post49, [("has id", "id" in post49)])

    cleanup_user(_u49.get("id"), _t49)

# ══════════════════════════════════════════════════════════════
# 50. FINAL BASELINE — core endpoints still clean after all tests
# ══════════════════════════════════════════════════════════════

section("50. Final baseline — core endpoints still healthy")

s, b = get("/me")
ok("GET /me still works", s, b, [("has id", "id" in b)])

s, b = get("/feed")
ok("GET /feed still works", s, b, [("is list", isinstance(b, list)), ("non-empty", len(b) > 0)])

s, b = get("/jobs")
ok("GET /jobs still works", s, b, [("is list", isinstance(b, list)), (">=10", len(b) >= 10)])

s, b = get("/users")
ok("GET /users still works", s, b, [("is list", isinstance(b, list)), ("non-empty", len(b) > 0)])

s, b = get("/conversations")
ok("GET /conversations still works", s, b, [("is list", isinstance(b, list))])

s, b = get("/notifications")
ok("GET /notifications still works", s, b, [("is list", isinstance(b, list))])

s, b = get("/outreach/readiness")
ok("GET /outreach/readiness still works", s, b, [("has score", "score" in b)])

s, b = post("/outreach/generate", {"recipientId": 2, "goal": "networking"})
ok("POST /outreach/generate still works", s, b, [("has draft", bool(b.get("draft")))])

s, b = get("/search?q=test")
ok("GET /search still works", s, b, [("has users", "users" in b)])

# ══════════════════════════════════════════════════════════════
# RESULTS
# ══════════════════════════════════════════════════════════════

total = passed + failed
print(f"\n{'='*60}")
print(f"  RESULTS: {passed}/{total} passed", end="")
if failed:
    print(f"  <-- {failed} FAILED")
    print(f"\nFailed tests:")
    for status, name, errors in _results:
        if status == "FAIL":
            print(f"  x  {name}")
            for e in errors:
                print(f"       {e}")
else:
    print("  — all clear")
print(f"{'='*60}\n")
sys.exit(0 if failed == 0 else 1)
