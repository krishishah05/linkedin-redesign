"""
Unit tests for backend/app.py (Flask route handlers)
Test types used:
  BB  — Black Box      (function contract only)
  WB  — White Box      (specific source lines / branches)
  GB  — Gray Box       (threshold values visible in source)
  EP  — Equivalence Partitioning (distinct input buckets)
  RG  — Regression     (known past bugs / silent failures)
  EC  — Edge Case      (structural extremes of valid input)

Strategy: Flask test client + monkeypatching all database / outreach /
static-data calls so no real DB or network is needed.
"""

import json
import os
import sys

import pytest

# ── Path setup ────────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Patch init_db to a no-op BEFORE importing app (it runs at module level)
import database as _db
_db.init_db = lambda: None

import app as flask_app   # noqa: E402  (must come after the patch above)


# ── Shared mock data ──────────────────────────────────────────────────────────

MOCK_USER = {
    "id": 1, "name": "Alex Johnson", "email": "alex@example.com",
    "headline": "Software Engineer at NJIT",
    "location": "New York", "about": "Test about section",
    "pronouns": "", "industry": "Tech",
    "connections": 5, "followers": 10,
    "avatarColor": "#0F5DBD", "isPremium": False, "openToWork": False,
    "experience": [], "education": [], "skills": [],
}

MOCK_USER_2 = {
    "id": 2, "name": "Sarah Chen", "email": "sarah@example.com",
    "headline": "Product Manager", "location": "SF",
    "about": "", "pronouns": "", "industry": "Product",
    "connections": 0, "followers": 0, "avatarColor": "#E91E8C",
    "isPremium": False, "openToWork": False,
    "experience": [], "education": [], "skills": [],
}

MOCK_POST = {
    "id": 1, "content": "Hello world", "authorId": 1,
    "author": {"id": 1, "name": "Alex Johnson"},
    "createdAt": 1700000000000, "likeCount": 0,
}

MOCK_JOB = {"id": 1, "title": "Engineer", "company": "Nexus Corp"}

MOCK_COMPANY = {"id": 1, "name": "Nexus Corp", "description": "A company"}

MOCK_CONV = {
    "id": 1, "participant": {"id": 2, "name": "Sarah Chen"},
    "messages": [],
}

MOCK_NOTIF = {"id": 1, "isRead": False, "content": "Someone liked your post"}

MOCK_MSG = {
    "id": 10, "conversationId": 1, "senderId": 1,
    "text": "Hi there", "timestamp": 1700000000000, "isRead": False,
}

MOCK_READINESS = {
    "score": 40, "max_score": 100, "level": "almost_ready",
    "can_message": False, "breakdown": [], "top_tips": [],
}

MOCK_OUTREACH_RESULT = {
    "draft": "Hi Sarah, hope this finds you well.",
    "char_count": 38, "tone": "professional",
    "tips": [], "alternatives": [],
}


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def client(monkeypatch):
    """
    Returns a Flask test client with all database + outreach calls mocked.
    Individual tests override specific mocks as needed.
    """
    # Auth helpers
    monkeypatch.setattr(flask_app.dbl, "get_session_user_id", lambda token: 1)
    monkeypatch.setattr(flask_app.dbl, "get_current_user", lambda uid: MOCK_USER)

    # Users
    monkeypatch.setattr(flask_app.dbl, "verify_credentials", lambda e, p: MOCK_USER)
    monkeypatch.setattr(flask_app.dbl, "create_session", lambda uid: "mock-token-abc")
    monkeypatch.setattr(flask_app.dbl, "create_user", lambda n, e, p: MOCK_USER_2)
    monkeypatch.setattr(flask_app.dbl, "get_all_users", lambda excl: [MOCK_USER_2])
    monkeypatch.setattr(flask_app.dbl, "get_user_by_id", lambda uid: MOCK_USER_2)
    monkeypatch.setattr(flask_app.dbl, "update_current_user",
                        lambda updates, uid: {**MOCK_USER, **updates})
    monkeypatch.setattr(flask_app.dbl, "delete_user", lambda uid: True)

    # Feed
    monkeypatch.setattr(flask_app.dbl, "get_all_posts", lambda: [MOCK_POST])
    monkeypatch.setattr(flask_app.dbl, "create_post",
                        lambda uid, content: {**MOCK_POST, "content": content})

    # Jobs
    monkeypatch.setattr(flask_app.dbl, "get_all_jobs", lambda: [MOCK_JOB])
    monkeypatch.setattr(flask_app.dbl, "get_job_by_id", lambda jid: MOCK_JOB)

    # Companies
    monkeypatch.setattr(flask_app.dbl, "get_company_by_id", lambda cid: MOCK_COMPANY)

    # Conversations
    monkeypatch.setattr(flask_app.dbl, "get_all_conversations", lambda: [MOCK_CONV])
    monkeypatch.setattr(flask_app.dbl, "get_conversation_by_id", lambda cid: MOCK_CONV)
    monkeypatch.setattr(flask_app.dbl, "send_message",
                        lambda cid, sender_id, text: {**MOCK_MSG, "text": text})

    # Notifications
    monkeypatch.setattr(flask_app.dbl, "get_all_notifications", lambda: [MOCK_NOTIF])
    monkeypatch.setattr(flask_app.dbl, "mark_notification_read",
                        lambda nid: {**MOCK_NOTIF, "isRead": True})
    monkeypatch.setattr(flask_app.dbl, "mark_all_notifications_read", lambda: None)

    # Search
    monkeypatch.setattr(flask_app.dbl, "search",
                        lambda q, exclude_user_id: {
                            "users": [MOCK_USER_2], "jobs": [],
                            "companies": [], "posts": [], "query": q,
                        })

    # Outreach
    monkeypatch.setattr(flask_app.outreach_mod, "compute_outreach_readiness",
                        lambda user: MOCK_READINESS)
    monkeypatch.setattr(flask_app.outreach_mod, "generate_outreach_message",
                        lambda sender, recipient, ctx: MOCK_OUTREACH_RESULT)

    flask_app.app.config["TESTING"] = True
    with flask_app.app.test_client() as c:
        yield c


# ── Helper ────────────────────────────────────────────────────────────────────

def _json(resp):
    return json.loads(resp.data)


def _post(client, path, body):
    return client.post(path, data=json.dumps(body),
                       content_type="application/json")


def _patch(client, path, body=None):
    return client.patch(path, data=json.dumps(body or {}),
                        content_type="application/json")


# ══════════════════════════════════════════════════════════════════════════════
# Auth — login
# ══════════════════════════════════════════════════════════════════════════════

class TestLogin:

    def test_T01_BB_valid_credentials_return_user_and_token(self, client):
        resp = _post(client, "/api/auth/login",
                     {"email": "alex@example.com", "password": "password123"})
        assert resp.status_code == 200
        body = _json(resp)
        assert "user" in body and "token" in body

    def test_T02_BB_wrong_password_returns_401(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "verify_credentials", lambda e, p: None)
        resp = _post(client, "/api/auth/login",
                     {"email": "alex@example.com", "password": "wrong"})
        assert resp.status_code == 401

    def test_T03_WB_missing_email_returns_400(self, client):
        resp = _post(client, "/api/auth/login", {"password": "password123"})
        assert resp.status_code == 400

    def test_T04_WB_missing_password_returns_400(self, client):
        resp = _post(client, "/api/auth/login", {"email": "alex@example.com"})
        assert resp.status_code == 400

    def test_T05_EC_empty_body_returns_400(self, client):
        resp = _post(client, "/api/auth/login", {})
        assert resp.status_code == 400

    def test_T06_EP_email_normalized_to_lowercase(self, client, monkeypatch):
        captured = {}
        def fake_verify(email, pw):
            captured["email"] = email
            return MOCK_USER
        monkeypatch.setattr(flask_app.dbl, "verify_credentials", fake_verify)
        _post(client, "/api/auth/login",
              {"email": "ALEX@EXAMPLE.COM", "password": "password123"})
        assert captured["email"] == "alex@example.com"


# ══════════════════════════════════════════════════════════════════════════════
# Auth — register
# ══════════════════════════════════════════════════════════════════════════════

class TestRegister:

    def test_T07_BB_valid_registration_returns_201_with_token(self, client):
        resp = _post(client, "/api/auth/register",
                     {"name": "Alice", "email": "alice@test.com",
                      "password": "password123"})
        assert resp.status_code == 201
        body = _json(resp)
        assert "user" in body and "token" in body

    def test_T08_WB_missing_name_returns_400(self, client):
        resp = _post(client, "/api/auth/register",
                     {"email": "alice@test.com", "password": "password123"})
        assert resp.status_code == 400

    def test_T09_WB_invalid_email_format_returns_400(self, client):
        resp = _post(client, "/api/auth/register",
                     {"name": "Alice", "email": "notanemail",
                      "password": "password123"})
        assert resp.status_code == 400

    def test_T10_GB_password_shorter_than_8_returns_400(self, client):
        resp = _post(client, "/api/auth/register",
                     {"name": "Alice", "email": "alice@test.com",
                      "password": "short"})
        assert resp.status_code == 400

    def test_T11_GB_password_exactly_8_chars_accepted(self, client):
        resp = _post(client, "/api/auth/register",
                     {"name": "Alice", "email": "alice@test.com",
                      "password": "12345678"})
        assert resp.status_code == 201

    def test_T12_RG_duplicate_email_returns_409(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "create_user",
                            lambda n, e, p: (_ for _ in ()).throw(
                                ValueError("Email already registered")))
        resp = _post(client, "/api/auth/register",
                     {"name": "Alice", "email": "alex@example.com",
                      "password": "password123"})
        assert resp.status_code == 409

    def test_T13_EC_empty_body_returns_400(self, client):
        resp = _post(client, "/api/auth/register", {})
        assert resp.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/me  &  PATCH /api/me
# ══════════════════════════════════════════════════════════════════════════════

class TestGetMe:

    def test_T14_BB_returns_current_user_json(self, client):
        resp = client.get("/api/me")
        assert resp.status_code == 200
        assert _json(resp)["id"] == 1

    def test_T15_WB_no_auth_header_uses_fallback(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "get_session_user_id", lambda t: None)
        resp = client.get("/api/me")
        assert resp.status_code == 200

    def test_T78_WB_bearer_token_passed_to_get_session_user_id(
            self, client, monkeypatch):
        captured = {}
        def fake_session(token):
            captured["token"] = token
            return 1
        monkeypatch.setattr(flask_app.dbl, "get_session_user_id", fake_session)
        client.get("/api/me",
                   headers={"Authorization": "Bearer test-token-xyz"})
        assert captured.get("token") == "test-token-xyz"


class TestUpdateMe:

    def test_T16_BB_valid_field_update_returns_200(self, client):
        resp = _patch(client, "/api/me", {"headline": "New Headline"})
        assert resp.status_code == 200
        assert _json(resp)["headline"] == "New Headline"

    def test_T17_WB_no_valid_fields_returns_400(self, client):
        resp = _patch(client, "/api/me", {"unknownKey": "value"})
        assert resp.status_code == 400

    def test_T18_EC_empty_body_returns_400(self, client):
        resp = _patch(client, "/api/me", {})
        assert resp.status_code == 400

    def test_T19_WB_non_string_value_filtered_returns_400(self, client):
        resp = _patch(client, "/api/me", {"headline": 123})
        assert resp.status_code == 400

    def test_T80_EC_multiple_valid_fields_all_updated(self, client):
        resp = _patch(client, "/api/me",
                      {"headline": "Engineer", "location": "NYC"})
        assert resp.status_code == 200
        body = _json(resp)
        assert body["headline"] == "Engineer"
        assert body["location"] == "NYC"


# ══════════════════════════════════════════════════════════════════════════════
# Users
# ══════════════════════════════════════════════════════════════════════════════

class TestUsers:

    def test_T20_BB_get_users_returns_list(self, client):
        resp = client.get("/api/users")
        assert resp.status_code == 200
        assert isinstance(_json(resp), list)

    def test_T21_BB_get_user_by_id_found(self, client):
        resp = client.get("/api/users/2")
        assert resp.status_code == 200
        assert _json(resp)["id"] == 2

    def test_T22_BB_get_user_not_found_returns_404(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "get_user_by_id", lambda uid: None)
        resp = client.get("/api/users/999")
        assert resp.status_code == 404

    def test_T23_BB_delete_user_success_returns_204(self, client):
        resp = client.delete("/api/users/2")
        assert resp.status_code == 204
        assert resp.data == b""

    def test_T24_BB_delete_user_not_found_returns_404(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "delete_user", lambda uid: False)
        resp = client.delete("/api/users/999")
        assert resp.status_code == 404

    def test_T25_WB_delete_protected_user_returns_403(self, client, monkeypatch):
        monkeypatch.setattr(
            flask_app.dbl, "delete_user",
            lambda uid: (_ for _ in ()).throw(ValueError("Cannot delete admin")))
        resp = client.delete("/api/users/1")
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# Feed
# ══════════════════════════════════════════════════════════════════════════════

class TestFeed:

    def test_T26_BB_get_feed_returns_list(self, client):
        resp = client.get("/api/feed")
        assert resp.status_code == 200
        assert isinstance(_json(resp), list)

    def test_T27_EC_get_feed_empty_returns_empty_list(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "get_all_posts", lambda: [])
        resp = client.get("/api/feed")
        assert resp.status_code == 200
        assert _json(resp) == []

    def test_T28_BB_create_post_valid_returns_201(self, client):
        resp = _post(client, "/api/feed", {"content": "Hello world"})
        assert resp.status_code == 201
        assert _json(resp)["content"] == "Hello world"

    def test_T29_WB_create_post_empty_content_returns_400(self, client):
        resp = _post(client, "/api/feed", {"content": ""})
        assert resp.status_code == 400

    def test_T30_EC_create_post_whitespace_content_returns_400(self, client):
        resp = _post(client, "/api/feed", {"content": "   "})
        assert resp.status_code == 400

    def test_T81_RG_create_post_missing_body_returns_400(self, client):
        resp = client.post("/api/feed", content_type="application/json")
        assert resp.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
# Jobs
# ══════════════════════════════════════════════════════════════════════════════

class TestJobs:

    def test_T31_BB_get_jobs_returns_list(self, client):
        resp = client.get("/api/jobs")
        assert resp.status_code == 200
        assert isinstance(_json(resp), list)

    def test_T32_BB_get_job_found(self, client):
        resp = client.get("/api/jobs/1")
        assert resp.status_code == 200
        assert "id" in _json(resp)

    def test_T33_BB_get_job_not_found_returns_404(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "get_job_by_id", lambda jid: None)
        resp = client.get("/api/jobs/999")
        assert resp.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# Companies
# ══════════════════════════════════════════════════════════════════════════════

class TestCompanies:

    def test_T34_BB_get_company_found(self, client):
        resp = client.get("/api/companies/1")
        assert resp.status_code == 200
        assert "id" in _json(resp)

    def test_T35_BB_get_company_not_found_returns_404(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "get_company_by_id", lambda cid: None)
        resp = client.get("/api/companies/999")
        assert resp.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# Conversations
# ══════════════════════════════════════════════════════════════════════════════

class TestConversations:

    def test_T36_BB_get_conversations_returns_list(self, client):
        resp = client.get("/api/conversations")
        assert resp.status_code == 200
        assert isinstance(_json(resp), list)

    def test_T37_BB_get_conversation_found(self, client):
        resp = client.get("/api/conversations/1")
        assert resp.status_code == 200
        assert _json(resp)["id"] == 1

    def test_T38_BB_get_conversation_not_found_returns_404(
            self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "get_conversation_by_id",
                            lambda cid: None)
        resp = client.get("/api/conversations/999")
        assert resp.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# Messages
# ══════════════════════════════════════════════════════════════════════════════

class TestMessages:

    def test_T39_BB_post_message_valid_returns_201(self, client):
        resp = _post(client, "/api/conversations/1/messages", {"text": "Hi!"})
        assert resp.status_code == 201

    def test_T40_WB_post_message_empty_text_returns_400(self, client):
        resp = _post(client, "/api/conversations/1/messages", {"text": ""})
        assert resp.status_code == 400

    def test_T41_WB_post_message_conv_not_found_returns_404(
            self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "get_conversation_by_id",
                            lambda cid: None)
        resp = _post(client, "/api/conversations/999/messages", {"text": "Hi"})
        assert resp.status_code == 404

    def test_T42_WB_post_message_response_has_is_me_true(self, client):
        resp = _post(client, "/api/conversations/1/messages", {"text": "Hi"})
        assert _json(resp)["isMe"] is True

    def test_T82_EC_post_message_whitespace_text_returns_400(self, client):
        resp = _post(client, "/api/conversations/1/messages", {"text": "   "})
        assert resp.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
# Notifications
# ══════════════════════════════════════════════════════════════════════════════

class TestNotifications:

    def test_T43_BB_get_notifications_returns_list(self, client):
        resp = client.get("/api/notifications")
        assert resp.status_code == 200
        assert isinstance(_json(resp), list)

    def test_T44_BB_mark_notification_read_returns_200(self, client):
        resp = _patch(client, "/api/notifications/1/read")
        assert resp.status_code == 200
        assert _json(resp)["isRead"] is True

    def test_T45_BB_mark_notification_read_not_found_returns_404(
            self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "mark_notification_read",
                            lambda nid: None)
        resp = _patch(client, "/api/notifications/999/read")
        assert resp.status_code == 404

    def test_T46_BB_mark_all_read_returns_success(self, client):
        resp = _patch(client, "/api/notifications/read-all")
        assert resp.status_code == 200
        assert _json(resp)["success"] is True


# ══════════════════════════════════════════════════════════════════════════════
# Static data endpoints
# ══════════════════════════════════════════════════════════════════════════════

class TestStaticData:

    def test_T47_BB_get_events_returns_list(self, client):
        resp = client.get("/api/events")
        assert resp.status_code == 200
        assert isinstance(_json(resp), list)

    def test_T48_BB_get_groups_returns_list(self, client):
        resp = client.get("/api/groups")
        assert resp.status_code == 200
        assert isinstance(_json(resp), list)

    def test_T49_BB_get_group_found(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.static_data, "get_group_by_id",
                            lambda gid: {"id": gid, "name": "Test Group"})
        resp = client.get("/api/groups/1")
        assert resp.status_code == 200

    def test_T50_BB_get_group_not_found_returns_404(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.static_data, "get_group_by_id",
                            lambda gid: None)
        resp = client.get("/api/groups/999")
        assert resp.status_code == 404

    def test_T51_BB_get_courses_returns_list(self, client):
        resp = client.get("/api/courses")
        assert resp.status_code == 200
        assert isinstance(_json(resp), list)

    def test_T52_BB_get_news_returns_list(self, client):
        resp = client.get("/api/news")
        assert resp.status_code == 200
        assert isinstance(_json(resp), list)

    def test_T53_BB_get_invitations_returns_list(self, client):
        resp = client.get("/api/invitations")
        assert resp.status_code == 200
        assert isinstance(_json(resp), list)

    def test_T54_BB_get_hashtags_returns_list(self, client):
        resp = client.get("/api/hashtags")
        assert resp.status_code == 200
        assert isinstance(_json(resp), list)


# ══════════════════════════════════════════════════════════════════════════════
# Search
# ══════════════════════════════════════════════════════════════════════════════

class TestSearch:

    def test_T55_BB_search_with_query_returns_categorised_results(self, client):
        resp = client.get("/api/search?q=Alex")
        assert resp.status_code == 200
        body = _json(resp)
        assert all(k in body for k in ("users", "jobs", "companies", "posts"))

    def test_T56_WB_empty_query_returns_all_empty_lists(self, client):
        resp = client.get("/api/search?q=")
        assert resp.status_code == 200
        body = _json(resp)
        assert body["users"] == [] and body["jobs"] == []
        assert body["query"] == ""

    def test_T57_EC_no_q_param_returns_empty_result(self, client):
        resp = client.get("/api/search")
        assert resp.status_code == 200
        body = _json(resp)
        assert body["users"] == []


# ══════════════════════════════════════════════════════════════════════════════
# Profile readiness
# ══════════════════════════════════════════════════════════════════════════════

class TestProfileReadiness:

    def test_T58_BB_returns_score_sections_fixes(self, client):
        resp = client.get("/api/profile-readiness")
        assert resp.status_code == 200
        body = _json(resp)
        assert "score" in body and "sections" in body and "fixes" in body

    def test_T59_WB_headline_long_enough_status_done(self, client, monkeypatch):
        # 60-char headline → score 100 → status "done"
        user = {**MOCK_USER, "headline": "A" * 60}
        monkeypatch.setattr(flask_app.dbl, "get_current_user", lambda uid: user)
        resp = client.get("/api/profile-readiness")
        fixes = _json(resp)["fixes"]
        headline_fix = next(f for f in fixes if f["key"] == "headline")
        assert headline_fix["status"] == "done"

    def test_T60_GB_partial_headline_status_warn(self, client, monkeypatch):
        # 30-char headline → score 50 → status "warn"
        user = {**MOCK_USER, "headline": "A" * 30}
        monkeypatch.setattr(flask_app.dbl, "get_current_user", lambda uid: user)
        resp = client.get("/api/profile-readiness")
        fixes = _json(resp)["fixes"]
        headline_fix = next(f for f in fixes if f["key"] == "headline")
        assert headline_fix["status"] == "warn"

    def test_T61_GB_empty_headline_status_bad(self, client, monkeypatch):
        user = {**MOCK_USER, "headline": ""}
        monkeypatch.setattr(flask_app.dbl, "get_current_user", lambda uid: user)
        resp = client.get("/api/profile-readiness")
        fixes = _json(resp)["fixes"]
        headline_fix = next(f for f in fixes if f["key"] == "headline")
        assert headline_fix["status"] == "bad"

    def test_T62_WB_avatar_color_set_photo_score_100(self, client, monkeypatch):
        user = {**MOCK_USER, "avatarColor": "#abc"}
        monkeypatch.setattr(flask_app.dbl, "get_current_user", lambda uid: user)
        resp = client.get("/api/profile-readiness")
        sections = _json(resp)["sections"]
        photo = next(s for s in sections if s["key"] == "photo")
        assert photo["score"] == 100

    def test_T63_EC_all_empty_profile_score_near_zero(self, client, monkeypatch):
        empty_user = {
            **MOCK_USER, "headline": "", "about": "", "skills": [],
            "experience": [], "education": [], "avatarColor": None,
        }
        monkeypatch.setattr(flask_app.dbl, "get_current_user",
                            lambda uid: empty_user)
        resp = client.get("/api/profile-readiness")
        assert _json(resp)["score"] <= 17


# ══════════════════════════════════════════════════════════════════════════════
# Outreach generate
# ══════════════════════════════════════════════════════════════════════════════

class TestOutreachGenerate:

    def test_T64_BB_valid_recipient_returns_draft(self, client):
        resp = _post(client, "/api/outreach/generate", {"recipientId": 2})
        assert resp.status_code == 200
        body = _json(resp)
        assert "draft" in body and "tips" in body

    def test_T65_WB_missing_recipient_id_returns_400(self, client):
        resp = _post(client, "/api/outreach/generate", {})
        assert resp.status_code == 400

    def test_T66_WB_string_recipient_id_returns_400(self, client):
        resp = _post(client, "/api/outreach/generate", {"recipientId": "abc"})
        assert resp.status_code == 400

    def test_T67_WB_float_recipient_id_returns_400(self, client):
        resp = _post(client, "/api/outreach/generate", {"recipientId": 1.5})
        assert resp.status_code == 400

    def test_T68_WB_zero_recipient_id_returns_400(self, client):
        resp = _post(client, "/api/outreach/generate", {"recipientId": 0})
        assert resp.status_code == 400

    def test_T69_BB_unknown_recipient_returns_404(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "get_user_by_id", lambda uid: None)
        resp = _post(client, "/api/outreach/generate", {"recipientId": 999})
        assert resp.status_code == 404

    def test_T70_EP_invalid_tone_defaults_to_professional(self, client,
                                                           monkeypatch):
        captured = {}
        def fake_generate(sender, recipient, ctx):
            captured["tone"] = ctx["tone"]
            return MOCK_OUTREACH_RESULT
        monkeypatch.setattr(flask_app.outreach_mod, "generate_outreach_message",
                            fake_generate)
        _post(client, "/api/outreach/generate",
              {"recipientId": 2, "tone": "rude"})
        assert captured["tone"] == "professional"

    def test_T71_EP_invalid_goal_defaults_to_networking(self, client,
                                                         monkeypatch):
        captured = {}
        def fake_generate(sender, recipient, ctx):
            captured["goal"] = ctx["goal"]
            return MOCK_OUTREACH_RESULT
        monkeypatch.setattr(flask_app.outreach_mod, "generate_outreach_message",
                            fake_generate)
        _post(client, "/api/outreach/generate",
              {"recipientId": 2, "goal": "spam"})
        assert captured["goal"] == "networking"

    def test_T83_GB_negative_recipient_id_returns_400(self, client):
        resp = _post(client, "/api/outreach/generate", {"recipientId": -1})
        assert resp.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
# Outreach readiness
# ══════════════════════════════════════════════════════════════════════════════

class TestOutreachReadiness:

    def test_T72_BB_no_user_id_uses_current_user(self, client):
        resp = client.get("/api/outreach/readiness")
        assert resp.status_code == 200
        body = _json(resp)
        assert "score" in body and "level" in body

    def test_T73_BB_valid_user_id_returns_readiness(self, client):
        resp = client.get("/api/outreach/readiness?userId=2")
        assert resp.status_code == 200
        assert "score" in _json(resp)

    def test_T74_WB_invalid_user_id_returns_400(self, client):
        resp = client.get("/api/outreach/readiness?userId=abc")
        assert resp.status_code == 400

    def test_T75_WB_zero_user_id_returns_400(self, client):
        resp = client.get("/api/outreach/readiness?userId=0")
        assert resp.status_code == 400

    def test_T76_BB_nonexistent_user_id_returns_404(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "get_user_by_id", lambda uid: None)
        resp = client.get("/api/outreach/readiness?userId=999")
        assert resp.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# Error handlers
# ══════════════════════════════════════════════════════════════════════════════

class TestErrorHandlers:

    def test_T77_RG_unknown_route_returns_json_404(self, client):
        resp = client.get("/api/does-not-exist")
        assert resp.status_code == 404
        assert resp.content_type.startswith("application/json")
        assert "error" in _json(resp)

    def test_T79_WB_no_auth_header_still_returns_200(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "get_session_user_id", lambda t: None)
        resp = client.get("/api/me")
        assert resp.status_code == 200
