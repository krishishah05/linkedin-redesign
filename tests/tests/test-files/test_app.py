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
import types

import pytest

# ── Path setup ────────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))

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
def auth_header():
    """Fake Authorization header — auth is mocked in the client fixture."""
    return {"Authorization": "Bearer test-token"}


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
    monkeypatch.setattr(flask_app.dbl, "create_user", lambda n, e, p, is_recruiter=False: MOCK_USER_2)
    monkeypatch.setattr(flask_app.dbl, "get_all_users", lambda excl: [MOCK_USER_2])
    monkeypatch.setattr(flask_app.dbl, "get_user_by_id", lambda uid: MOCK_USER_2)
    monkeypatch.setattr(flask_app.dbl, "update_current_user",
                        lambda updates, uid: {**MOCK_USER, **updates})
    monkeypatch.setattr(flask_app.dbl, "delete_user", lambda uid: True)

    # Feed
    monkeypatch.setattr(flask_app.dbl, "get_all_posts", lambda: [MOCK_POST])
    monkeypatch.setattr(flask_app.dbl, "create_post",
                        lambda uid, content, image_url=None, video_url=None: {**MOCK_POST, "content": content, **({"image": image_url} if image_url else {}), **({"videoUrl": video_url} if video_url else {})})
    monkeypatch.setattr(flask_app.dbl, "get_post_likes_for_user", lambda uid: set())
    monkeypatch.setattr(flask_app.dbl, "toggle_post_like",
                        lambda pid, uid: {"liked": True, "likeCount": 1})
    monkeypatch.setattr(flask_app.dbl, "add_post_comment",
                        lambda pid, uid, text: {"author": "Test", "text": text, "timestamp": "Just now", "likes": 0})
    monkeypatch.setattr(flask_app.dbl, "delete_post", lambda pid, uid: True)

    # Jobs
    monkeypatch.setattr(flask_app.dbl, "get_all_jobs", lambda: [MOCK_JOB])
    monkeypatch.setattr(flask_app.dbl, "get_job_by_id", lambda jid: MOCK_JOB)

    # Companies
    monkeypatch.setattr(flask_app.dbl, "get_company_by_id", lambda cid: MOCK_COMPANY)

    # Conversations
    monkeypatch.setattr(flask_app.dbl, "get_all_conversations", lambda: [MOCK_CONV])
    monkeypatch.setattr(flask_app.dbl, "get_conversations_for_user", lambda uid: [MOCK_CONV])
    monkeypatch.setattr(flask_app.dbl, "get_conversation_by_id", lambda cid: MOCK_CONV)
    monkeypatch.setattr(flask_app.dbl, "send_message",
                        lambda cid, sender_id, text: {**MOCK_MSG, "text": text})

    # Notifications
    monkeypatch.setattr(flask_app.dbl, "get_all_notifications", lambda: [MOCK_NOTIF])
    monkeypatch.setattr(flask_app.dbl, "mark_notification_read",
                        lambda nid: {**MOCK_NOTIF, "isRead": True})
    monkeypatch.setattr(flask_app.dbl, "mark_all_notifications_read", lambda: None)

    # Events
    monkeypatch.setattr(flask_app.dbl, "get_all_events_with_attendance",
                        lambda uid: [{"id": 1, "name": "Test Event", "isAttending": False}])
    monkeypatch.setattr(flask_app.dbl, "create_event",
                        lambda uid, data: {**data, "id": "u1", "source": "user", "isAttending": False})
    monkeypatch.setattr(flask_app.dbl, "toggle_event_attend",
                        lambda eid, src, uid: {"attending": True})

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

    # Social state
    monkeypatch.setattr(flask_app.dbl, "get_social_state",
                        lambda uid: {"connections": [], "following": [], "savedJobs": []})
    monkeypatch.setattr(flask_app.dbl, "toggle_saved_job",
                        lambda uid, jid: {"saved": True})
    monkeypatch.setattr(flask_app.dbl, "save_job",
                        lambda uid, jid: {"saved": True})
    monkeypatch.setattr(flask_app.dbl, "unsave_job",
                        lambda uid, jid: {"saved": False})
    monkeypatch.setattr(flask_app.dbl, "get_incoming_connection_requests",
                        lambda uid: [])
    monkeypatch.setattr(flask_app.dbl, "decline_connection_request",
                        lambda rid, uid: {"declined": True})
    monkeypatch.setattr(flask_app.dbl, "connect_user",
                        lambda uid, tid: {"requested": True})
    monkeypatch.setattr(flask_app.dbl, "accept_connection",
                        lambda uid, tid: {"connected": True})
    monkeypatch.setattr(flask_app.dbl, "toggle_following",
                        lambda uid, tid: {"following": True})
    monkeypatch.setattr(flask_app.dbl, "apply_to_job",
                        lambda uid, jid: {"applied": True})
    monkeypatch.setattr(flask_app.dbl, "toggle_group",
                        lambda uid, gid: {"joined": True})
    monkeypatch.setattr(flask_app.dbl, "dismiss_invitation",
                        lambda uid, key: {"dismissed": True})

    # Profile CRUD
    monkeypatch.setattr(flask_app.dbl, "add_experience",
                        lambda uid, e: {**MOCK_USER, "experience": [e]})
    monkeypatch.setattr(flask_app.dbl, "update_experience",
                        lambda uid, idx, e: {**MOCK_USER, "experience": [e]})
    monkeypatch.setattr(flask_app.dbl, "update_education",
                        lambda uid, idx, e: {**MOCK_USER, "education": [e]})
    monkeypatch.setattr(flask_app.dbl, "update_project",
                        lambda uid, idx, e: {**MOCK_USER, "projects": [e]})
    monkeypatch.setattr(flask_app.dbl, "update_volunteering",
                        lambda uid, idx, e: {**MOCK_USER, "volunteering": [e]})
    monkeypatch.setattr(flask_app.dbl, "update_honor",
                        lambda uid, idx, e: {**MOCK_USER, "honors": [e]})
    monkeypatch.setattr(flask_app.dbl, "delete_experience",
                        lambda uid, idx: {**MOCK_USER, "experience": []})
    monkeypatch.setattr(flask_app.dbl, "delete_education",
                        lambda uid, idx: {**MOCK_USER, "education": []})
    monkeypatch.setattr(flask_app.dbl, "delete_project",
                        lambda uid, idx: {**MOCK_USER, "projects": []})
    monkeypatch.setattr(flask_app.dbl, "delete_volunteering",
                        lambda uid, idx: {**MOCK_USER, "volunteering": []})
    monkeypatch.setattr(flask_app.dbl, "delete_honor",
                        lambda uid, idx: {**MOCK_USER, "honors": []})
    monkeypatch.setattr(flask_app.dbl, "delete_skill",
                        lambda uid, idx: {**MOCK_USER, "skills": []})

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
                            lambda n, e, p, is_recruiter=False: (_ for _ in ()).throw(
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

    def test_T15_WB_no_auth_header_returns_401(self, client, monkeypatch):
        """GET /api/me with no valid token must return 401, not fall back to user 1."""
        monkeypatch.setattr(flask_app.dbl, "get_session_user_id", lambda t: None)
        resp = client.get("/api/me")
        assert resp.status_code == 401

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

    def test_T28B_BB_create_media_only_post_returns_201(self, client):
        resp = _post(client, "/api/feed", {"content": "", "imageUrl": "data:image/png;base64,abc"})
        assert resp.status_code == 201
        assert _json(resp)["image"] == "data:image/png;base64,abc"

    def test_T29_WB_create_post_empty_content_returns_400(self, client):
        resp = _post(client, "/api/feed", {"content": ""})
        assert resp.status_code == 400

    def test_T30_EC_create_post_whitespace_content_returns_400(self, client):
        resp = _post(client, "/api/feed", {"content": "   "})
        assert resp.status_code == 400

    def test_T81_RG_create_post_missing_body_returns_400(self, client):
        resp = client.post("/api/feed", content_type="application/json")
        assert resp.status_code == 400

    def test_T85_BB_delete_post_returns_200(self, client):
        resp = client.delete("/api/feed/1")
        assert resp.status_code == 200
        assert _json(resp)["deleted"] is True

    def test_T86_BB_delete_post_not_found_returns_404(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "delete_post", lambda pid, uid: "not_found")
        resp = client.delete("/api/feed/9999")
        assert resp.status_code == 404

    def test_delete_post_forbidden_returns_403(self, client, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "delete_post", lambda pid, uid: "forbidden")
        resp = client.delete("/api/feed/1")
        assert resp.status_code == 403

    def test_T87_BB_like_post_returns_liked(self, client):
        resp = client.post("/api/feed/1/like")
        assert resp.status_code == 200
        assert "liked" in _json(resp)

    def test_T88_BB_comment_on_post_returns_201(self, client):
        resp = _post(client, "/api/feed/1/comments", {"text": "Nice!"})
        assert resp.status_code == 201

    def test_T89_WB_comment_empty_text_returns_400(self, client):
        resp = _post(client, "/api/feed/1/comments", {"text": ""})
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

    def test_T84_WB_score_is_average_not_max(self, client, monkeypatch):
        # photo=100, headline=100 ("A"*60), rest=0 → sum=200, avg=200/6=33
        # If score used max instead of sum: max=100, 100/6=17 — catches that mutation
        user = {
            **MOCK_USER, "headline": "A" * 60, "avatarColor": "#abc",
            "about": "", "skills": [], "experience": [], "education": [],
        }
        monkeypatch.setattr(flask_app.dbl, "get_current_user", lambda uid: user)
        resp = client.get("/api/profile-readiness")
        assert _json(resp)["score"] == 33


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

    def test_T79_WB_no_auth_header_returns_401(self, client, monkeypatch):
        """Unauthenticated /api/me must return 401 (no silent fallback to user 1)."""
        monkeypatch.setattr(flask_app.dbl, "get_session_user_id", lambda t: None)
        resp = client.get("/api/me")
        assert resp.status_code == 401
        assert "error" in _json(resp)


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/profile/improve  — AI profile improvement tips
# ══════════════════════════════════════════════════════════════════════════════

def _make_mock_requests_post(tips):
    """Return a fake requests.post that returns the given tips list as JSON."""
    payload = json.dumps(tips)
    mock_response = types.SimpleNamespace(
        raise_for_status=lambda: None,
        json=lambda: {"choices": [{"message": {"content": payload}}]},
    )
    def fake_post(*args, **kwargs):
        return mock_response
    return fake_post


class TestProfileImprove:

    def test_T90_BB_unauthenticated_returns_401(self, client, monkeypatch):
        """BB: No valid token → 401 before hitting OpenRouter."""
        monkeypatch.setattr(flask_app.dbl, "get_session_user_id", lambda t: None)
        resp = client.post("/api/profile/improve")
        assert resp.status_code == 401

    def test_T91_BB_no_api_key_returns_503(self, client, auth_header, monkeypatch):
        """BB: Missing OPENROUTER_API_KEY env var → 503 service unavailable."""
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
        resp = client.post("/api/profile/improve", headers=auth_header)
        assert resp.status_code == 503
        assert "error" in _json(resp)

    def test_T92_BB_valid_request_returns_tips(self, client, auth_header, monkeypatch):
        """BB: Authenticated + key set + valid LLM response → 200 with tips list."""
        tips = ["Add a photo", "Expand your about", "List more skills",
                "Add certifications", "Open to work"]
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-xyz")

        import requests as _req
        monkeypatch.setattr(_req, "post", _make_mock_requests_post(tips))

        resp = client.post("/api/profile/improve", headers=auth_header)
        assert resp.status_code == 200
        data = _json(resp)
        assert "tips" in data
        assert data["tips"] == tips

    def test_T93_WB_llm_response_capped_at_five_tips(self, client, auth_header, monkeypatch):
        """WB: LLM returns more than 5 items — response is capped at 5."""
        many_tips = [f"Tip {i}" for i in range(10)]
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-xyz")

        import requests as _req
        monkeypatch.setattr(_req, "post", _make_mock_requests_post(many_tips))

        resp = client.post("/api/profile/improve", headers=auth_header)
        assert resp.status_code == 200
        assert len(_json(resp)["tips"]) == 5

    def test_T94_WB_llm_returns_json_in_markdown_fences(self, client, auth_header, monkeypatch):
        """WB: LLM wraps JSON in ```json fences — endpoint strips them correctly."""
        tips = ["tip A", "tip B", "tip C", "tip D", "tip E"]
        fenced = "```json\n" + json.dumps(tips) + "\n```"
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-xyz")

        mock_response = types.SimpleNamespace(
            raise_for_status=lambda: None,
            json=lambda: {"choices": [{"message": {"content": fenced}}]},
        )
        import requests as _req
        monkeypatch.setattr(_req, "post", lambda *a, **kw: mock_response)

        resp = client.post("/api/profile/improve", headers=auth_header)
        assert resp.status_code == 200
        assert _json(resp)["tips"] == tips

    def test_T95_WB_llm_network_error_returns_502(self, client, auth_header, monkeypatch):
        """WB: requests.post raises → 502 bad gateway."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-xyz")

        import requests as _req
        def boom(*a, **kw):
            raise ConnectionError("network down")
        monkeypatch.setattr(_req, "post", boom)

        resp = client.post("/api/profile/improve", headers=auth_header)
        assert resp.status_code == 502


class TestEducationAndSkills:
    def test_add_education_success(self, client, auth_header, monkeypatch):
        # Hits lines 181-198
        monkeypatch.setattr(flask_app.dbl, "add_education", lambda uid, entry: MOCK_USER)
        payload = {
            "school": "University of Waterloo",
            "degree": "Bachelor of Science",
            "field": "Computer Science",
            "startDate": "2020",
            "endDate": "2024"
        }
        resp = client.post("/api/me/education", json=payload, headers=auth_header)
        assert resp.status_code == 200

    def test_add_skill_success(self, client, auth_header, monkeypatch):
        # Hits lines 204-214
        monkeypatch.setattr(flask_app.dbl, "add_skill", lambda uid, skill: MOCK_USER)
        resp = client.post("/api/me/skills", json={"skill": "Python"}, headers=auth_header)
        assert resp.status_code == 200

class TestGroupCreation:
    def test_create_group_success(self, client, auth_header):
        # Hits lines 220-242
        payload = {"name": "AI Engineers", "description": "A group for AI enthusiasts"}
        resp = client.post("/api/groups", json=payload, headers=auth_header)
        assert resp.status_code == 201
        assert resp.get_json()["name"] == "AI Engineers"

class TestErrorPathCoverage:
    def test_get_conference_stories_returns_list(self, client, monkeypatch):
        story = {
            "id": 1,
            "conferenceName": "Grace Hopper Celebration",
            "tagline": "Great hallway track",
            "description": "Met engineers and recruiters.",
        }
        monkeypatch.setattr(flask_app.dbl, "get_conference_stories", lambda: [story])

        resp = client.get("/api/conference-stories")

        assert resp.status_code == 200
        assert _json(resp)[0]["conferenceName"] == "Grace Hopper Celebration"

    def test_create_conference_story_success(self, client, auth_header, monkeypatch):
        story = {
            "id": 7,
            "conferenceName": "AI Summit",
            "tagline": "Useful hiring conversations",
            "description": "I met several startup founders.",
            "photoUrl": "https://example.com/photo.jpg",
            "companyLogoUrl": "https://example.com/logo.png",
            "authorId": 1,
        }
        def create_story(uid, conference_name, tagline, description, photo_url, company_logo_url):
            assert photo_url == "https://example.com/photo.jpg"
            assert company_logo_url == "https://example.com/logo.png"
            return story

        monkeypatch.setattr(flask_app.dbl, "create_conference_story", create_story)

        resp = client.post("/api/conference-stories", json={
            "conferenceName": "AI Summit",
            "tagline": "Useful hiring conversations",
            "description": "I met several startup founders.",
            "photoUrl": " https://example.com/photo.jpg ",
            "companyLogoUrl": " https://example.com/logo.png ",
        }, headers=auth_header)

        assert resp.status_code == 201
        assert _json(resp)["id"] == 7

    def test_create_conference_story_missing_fields(self, client, auth_header):
        # Hits line 305 and adjacent error aborts
        resp = client.post("/api/conference-stories", json={"tagline": "missing name"}, headers=auth_header)
        assert resp.status_code == 400
        assert "conferenceName is required" in resp.get_json()["error"]

    def test_create_conference_story_requires_tagline(self, client, auth_header):
        resp = client.post("/api/conference-stories", json={
            "conferenceName": "AI Summit",
            "description": "Met engineers.",
        }, headers=auth_header)

        assert resp.status_code == 400
        assert "tagline is required" in resp.get_json()["error"]

    def test_create_conference_story_requires_description(self, client, auth_header):
        resp = client.post("/api/conference-stories", json={
            "conferenceName": "AI Summit",
            "tagline": "Great event",
        }, headers=auth_header)

        assert resp.status_code == 400
        assert "description is required" in resp.get_json()["error"]

    def test_create_conference_story_author_not_found(self, client, auth_header, monkeypatch):
        monkeypatch.setattr(flask_app.dbl, "create_conference_story", lambda *args: None)

        resp = client.post("/api/conference-stories", json={
            "conferenceName": "AI Summit",
            "tagline": "Great event",
            "description": "Met engineers.",
        }, headers=auth_header)

        assert resp.status_code == 404

    def test_conference_search_without_api_key_uses_fallback_and_cache(self, client, monkeypatch):
        flask_app._conference_search_cache.clear()
        monkeypatch.delenv("SERPAPI_API_KEY", raising=False)
        calls = {"count": 0}
        original_fallback = flask_app._fallback_conferences

        def counted_fallback(location, field):
            calls["count"] += 1
            return original_fallback(location, field)

        monkeypatch.setattr(flask_app, "_fallback_conferences", counted_fallback)

        resp = client.get("/api/conferences/search?location=Boston&field=healthcare")
        cached = client.get("/api/conferences/search?location=Boston&field=healthcare")

        assert resp.status_code == 200
        data = _json(resp)
        assert len(data) == 3
        assert data[0]["source"] == "fallback"
        assert "Healthcare" in data[0]["name"]
        assert 42.0 < data[0]["lat"] < 43.0
        assert -72.0 < data[0]["lng"] < -70.0
        assert _json(cached) == data
        assert calls["count"] == 1

    def test_conference_search_serpapi_success_maps_event_fields(self, client, monkeypatch):
        flask_app._conference_search_cache.clear()
        monkeypatch.setenv("SERPAPI_API_KEY", "serp-key")

        class MockResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {
                    "events_results": [{
                        "title": "Nursing Innovation Forum",
                        "address": ["Boston Convention Center", "Boston, MA"],
                        "venue": {"name": "BCEC"},
                        "gps_coordinates": {"latitude": "42.345", "longitude": "-71.044"},
                        "date": {"when": "May 20, 2026"},
                        "description": "Healthcare technology sessions.",
                        "link": "https://example.com/event",
                    }]
                }

        import requests as _req
        monkeypatch.setattr(_req, "get", lambda *args, **kwargs: MockResponse())

        resp = client.get("/api/conferences/search?location=Boston&field=nursing")

        assert resp.status_code == 200
        item = _json(resp)[0]
        assert item["source"] == "serpapi"
        assert item["name"] == "Nursing Innovation Forum"
        assert item["address"] == "Boston Convention Center, Boston, MA"
        assert item["lat"] == 42.345
        assert item["lng"] == -71.044

    def test_conference_search_serpapi_empty_results_falls_back(self, client, monkeypatch):
        flask_app._conference_search_cache.clear()
        monkeypatch.setenv("SERPAPI_API_KEY", "serp-key")

        class MockResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {"events_results": []}

        import requests as _req
        monkeypatch.setattr(_req, "get", lambda *args, **kwargs: MockResponse())

        resp = client.get("/api/conferences/search?location=Denver&field=energy")

        assert resp.status_code == 200
        assert _json(resp)[0]["source"] == "fallback"

    def test_conference_search_serpapi_error_falls_back(self, client, monkeypatch):
        flask_app._conference_search_cache.clear()
        monkeypatch.setenv("SERPAPI_API_KEY", "serp-key")

        import requests as _req
        monkeypatch.setattr(_req, "get", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("down")))

        resp = client.get("/api/conferences/search?location=Austin&field=robotics")

        assert resp.status_code == 200
        assert _json(resp)[0]["source"] == "fallback"

    def test_post_message_missing_conv_id(self, client, auth_header, monkeypatch):
        # Hits line 440/449 (Conversation errors)
        monkeypatch.setattr(flask_app.dbl, "get_conversation_by_id", lambda cid: None)
        resp = client.post("/api/conversations/9999/messages", json={"text": "hello"}, headers=auth_header)
        assert resp.status_code == 404

class TestEventsCoverage:
    def test_create_event_success(self, client, auth_header):
        # Hits lines 360-366
        resp = client.post("/api/events", json={"name": "Tech Meetup"}, headers=auth_header)
        assert resp.status_code == 201

    def test_toggle_event_attendance(self, client, auth_header):
        # Hits lines 370-379
        # 'u1' prefix triggers the 'user' source logic in dbl.toggle_event_attend
        resp = client.post("/api/events/u1/attend", headers=auth_header)
        assert resp.status_code == 200

class TestAddExperience:
    """Tests for POST /api/me/experience."""

    def _mock_updated(self):
        return {
            "id": 1, "name": "Test User", "email": "test@example.com",
            "headline": "", "location": "", "about": "", "pronouns": "",
            "industry": "", "avatarColor": None, "education": [],
            "skills": [], "phone": "", "isRecruiter": False,
            "experience": [{"id": 1, "title": "Engineer", "company": "ACME", "current": False}],
        }

    def test_T96_BB_happy_path_returns_200(self, client, monkeypatch):
        """BB: valid payload -> 200 with updated user data."""
        monkeypatch.setattr(flask_app.dbl, "add_experience", lambda uid, e: self._mock_updated())
        resp = client.post(
            "/api/me/experience",
            json={"title": "Engineer", "company": "ACME", "current": False},
            headers={"Authorization": "Bearer mock-token"},
        )
        assert resp.status_code == 200
        assert any(e["title"] == "Engineer" for e in _json(resp)["experience"])

    def test_T97_WB_missing_title_returns_400(self, client, monkeypatch):
        """WB: omitting title -> 400."""
        monkeypatch.setattr(flask_app.dbl, "add_experience", lambda uid, e: self._mock_updated())
        resp = client.post(
            "/api/me/experience",
            json={"company": "ACME", "current": False},
            headers={"Authorization": "Bearer mock-token"},
        )
        assert resp.status_code == 400

    def test_T98_WB_missing_company_returns_400(self, client, monkeypatch):
        """WB: omitting company -> 400."""
        monkeypatch.setattr(flask_app.dbl, "add_experience", lambda uid, e: self._mock_updated())
        resp = client.post(
            "/api/me/experience",
            json={"title": "Engineer", "current": False},
            headers={"Authorization": "Bearer mock-token"},
        )
        assert resp.status_code == 400

    def test_T99_WB_non_bool_current_returns_400(self, client, monkeypatch):
        """WB: current as string -> 400 (must be strict boolean)."""
        monkeypatch.setattr(flask_app.dbl, "add_experience", lambda uid, e: self._mock_updated())
        resp = client.post(
            "/api/me/experience",
            json={"title": "Engineer", "company": "ACME", "current": "false"},
            headers={"Authorization": "Bearer mock-token"},
        )
        assert resp.status_code == 400

    def test_T100_WB_unauthenticated_returns_401(self, client, monkeypatch):
        """WB: no valid auth token -> 401."""
        monkeypatch.setattr(flask_app.dbl, "get_session_user_id", lambda token: None)
        monkeypatch.setattr(flask_app.dbl, "get_current_user", lambda uid: None)
        resp = client.post(
            "/api/me/experience",
            json={"title": "Engineer", "company": "ACME", "current": False},
        )
        assert resp.status_code == 401

    def test_T101_WB_non_object_json_returns_400(self, client, monkeypatch):
        """WB: non-object JSON body (array) -> 400 (locks in body-type validation)."""
        monkeypatch.setattr(flask_app.dbl, "get_session_user_id", lambda token: 1)
        monkeypatch.setattr(flask_app.dbl, "get_current_user", lambda uid: MOCK_USER)
        monkeypatch.setattr(flask_app.dbl, "add_experience", lambda uid, e: self._mock_updated())
        resp = client.post(
            "/api/me/experience",
            json=[],
            headers={"Authorization": "Bearer mock-token"},
        )
        assert resp.status_code == 400

# ══════════════════════════════════════════════════════════════════════════════
# POST /api/profile-readiness/ai  — AI quality evaluation
# ══════════════════════════════════════════════════════════════════════════════

MOCK_AI_READINESS_RESULT = {
    "score": 75,
    "level": "Strong",
    "summary": "Your profile is solid with clear experience.",
    "sections": [
        {"key": "headline",   "label": "Headline",   "score": 80,  "feedback": "Good. To reach 100%: add industry keywords."},
        {"key": "about",      "label": "About",      "score": 70,  "feedback": "Decent. To reach 100%: add specific achievements."},
        {"key": "experience", "label": "Experience", "score": 75,  "feedback": "Good. To reach 100%: quantify your impact."},
        {"key": "education",  "label": "Education",  "score": 100, "feedback": "Excellent education section."},
        {"key": "skills",     "label": "Skills",     "score": 60,  "feedback": "Some skills. To reach 100%: add more relevant ones."},
        {"key": "projects",   "label": "Projects",   "score": 50,  "feedback": "Few projects. To reach 100%: add detailed descriptions."},
    ],
    "suggestions": [
        "Add measurable achievements to experience",
        "List more technical skills",
        "Expand your about section",
    ],
}


def _make_groq_post(content_str):
    """Return a fake requests.post that mimics a Groq API JSON response."""
    mock_resp = types.SimpleNamespace(
        raise_for_status=lambda: None,
        json=lambda: {"choices": [{"message": {"content": content_str}}]},
    )
    return lambda *a, **kw: mock_resp


class TestAIProfileReadiness:

    def test_T96_BB_unauthenticated_returns_401(self, client, monkeypatch):
        """BB: No valid token → 401 before hitting Groq."""
        monkeypatch.setattr(flask_app.dbl, "get_session_user_id", lambda t: None)
        resp = client.post("/api/profile-readiness/ai")
        assert resp.status_code == 401

    def test_T97_BB_no_groq_key_returns_503(self, client, monkeypatch):
        """BB: Missing GROQ_API_KEY → 503 service unavailable."""
        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        resp = client.post("/api/profile-readiness/ai")
        assert resp.status_code == 503
        assert "error" in _json(resp)

    def test_T98_BB_valid_request_returns_score_sections_suggestions(self, client, monkeypatch):
        """BB: Authenticated + key set + valid LLM response → 200 with score, sections, suggestions."""
        monkeypatch.setenv("GROQ_API_KEY", "test-key-xyz")
        import requests as _req
        monkeypatch.setattr(_req, "post", _make_groq_post(json.dumps(MOCK_AI_READINESS_RESULT)))
        resp = client.post("/api/profile-readiness/ai")
        assert resp.status_code == 200
        data = _json(resp)
        assert "score" in data
        assert "sections" in data
        assert "suggestions" in data
        assert 0 <= data["score"] <= 100
        assert "level" in data and data["level"]
        assert "summary" in data and data["summary"]
        for section in data["sections"]:
            assert "label" in section and section["label"]
            assert "feedback" in section and section["feedback"]

    def test_T99_WB_out_of_range_scores_clamped_to_0_100(self, client, monkeypatch):
        """WB: LLM returns scores > 100 → endpoint clamps them."""
        monkeypatch.setenv("GROQ_API_KEY", "test-key-xyz")
        clamped = dict(MOCK_AI_READINESS_RESULT)
        clamped["score"] = 150
        clamped["sections"] = [{"key": "headline", "label": "Headline", "score": 200, "feedback": "Perfect."}]
        import requests as _req
        monkeypatch.setattr(_req, "post", _make_groq_post(json.dumps(clamped)))
        resp = client.post("/api/profile-readiness/ai")
        assert resp.status_code == 200
        data = _json(resp)
        assert data["score"] == 100
        assert data["sections"][0]["score"] == 100

    def test_T100_WB_llm_network_error_returns_502(self, client, monkeypatch):
        """WB: requests.post raises → 502 bad gateway."""
        monkeypatch.setenv("GROQ_API_KEY", "test-key-xyz")
        import requests as _req
        def boom(*a, **kw):
            raise ConnectionError("down")
        monkeypatch.setattr(_req, "post", boom)
        resp = client.post("/api/profile-readiness/ai")
        assert resp.status_code == 502

    def test_T101_WB_llm_response_in_markdown_fences_parsed_correctly(self, client, monkeypatch):
        """WB: LLM wraps JSON in ```json fences — endpoint strips them and parses correctly."""
        monkeypatch.setenv("GROQ_API_KEY", "test-key-xyz")
        fenced = "```json\n" + json.dumps(MOCK_AI_READINESS_RESULT) + "\n```"
        import requests as _req
        monkeypatch.setattr(_req, "post", _make_groq_post(fenced))
        resp = client.post("/api/profile-readiness/ai")
        assert resp.status_code == 200
        assert "score" in _json(resp)


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/cover-letter/generate  — AI cover letter generation
# ══════════════════════════════════════════════════════════════════════════════

class TestCoverLetterGenerate:

    def test_T102_BB_unauthenticated_returns_401(self, client, monkeypatch):
        """BB: No valid token → 401 before hitting Groq."""
        monkeypatch.setattr(flask_app.dbl, "get_session_user_id", lambda t: None)
        resp = client.post("/api/cover-letter/generate",
                           json={"prompt": "Write a cover letter"})
        assert resp.status_code == 401

    def test_T103_BB_no_groq_key_returns_503(self, client, monkeypatch):
        """BB: Missing GROQ_API_KEY → 503."""
        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        resp = client.post("/api/cover-letter/generate",
                           json={"prompt": "Write a cover letter"})
        assert resp.status_code == 503
        assert "error" in _json(resp)

    def test_T104_WB_missing_prompt_returns_400(self, client, monkeypatch):
        """WB: Empty or absent prompt → 400 bad request."""
        monkeypatch.setenv("GROQ_API_KEY", "test-key-xyz")
        resp = client.post("/api/cover-letter/generate", json={})
        assert resp.status_code == 400
        assert "error" in _json(resp)

    def test_T105_BB_valid_request_returns_letter_string(self, client, monkeypatch):
        """BB: Authenticated + key + valid prompt → 200 with letter string."""
        monkeypatch.setenv("GROQ_API_KEY", "test-key-xyz")
        letter_text = "Dear Hiring Manager, I am excited to apply for this role."
        import requests as _req
        monkeypatch.setattr(_req, "post", _make_groq_post(letter_text))
        resp = client.post("/api/cover-letter/generate",
                           json={"prompt": "Write a cover letter for Engineer at Nexus"})
        assert resp.status_code == 200
        data = _json(resp)
        assert "letter" in data
        assert data["letter"] == letter_text

    def test_T106_WB_llm_network_error_returns_502(self, client, monkeypatch):
        """WB: requests.post raises → 502 bad gateway."""
        monkeypatch.setenv("GROQ_API_KEY", "test-key-xyz")
        import requests as _req
        def boom(*a, **kw):
            raise ConnectionError("down")
        monkeypatch.setattr(_req, "post", boom)
        resp = client.post("/api/cover-letter/generate",
                           json={"prompt": "Write a cover letter"})
        assert resp.status_code == 502


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/me/education  — add education entry
# ══════════════════════════════════════════════════════════════════════════════

class TestAddEducation:

    def test_T107_BB_unauthenticated_returns_401(self, client, monkeypatch):
        """BB: No valid token → 401."""
        monkeypatch.setattr(flask_app.dbl, "get_session_user_id", lambda t: None)
        resp = client.post("/api/me/education", json={"school": "NJIT"})
        assert resp.status_code == 401

    def test_T108_WB_missing_school_returns_400(self, client, monkeypatch):
        """WB: school field missing or blank → 400."""
        resp = client.post("/api/me/education", json={"degree": "BS"})
        assert resp.status_code == 400
        assert "error" in _json(resp)

    def test_T109_BB_valid_entry_returns_updated_user(self, client, monkeypatch):
        """BB: Valid education entry → 200 with updated user data containing education list."""
        entry = {"school": "NJIT", "degree": "BS", "field": "Computer Science",
                 "startDate": "2021", "endDate": "2025"}
        monkeypatch.setattr(flask_app.dbl, "add_education",
                            lambda uid, e: {**MOCK_USER, "education": [e]})
        resp = client.post("/api/me/education", json=entry)
        assert resp.status_code == 200
        assert "education" in _json(resp)


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/me/skills  — add skill
# ══════════════════════════════════════════════════════════════════════════════

class TestAddSkill:

    def test_T110_BB_unauthenticated_returns_401(self, client, monkeypatch):
        """BB: No valid token → 401."""
        monkeypatch.setattr(flask_app.dbl, "get_session_user_id", lambda t: None)
        resp = client.post("/api/me/skills", json={"skill": "Python"})
        assert resp.status_code == 401

    def test_T111_WB_missing_skill_returns_400(self, client, monkeypatch):
        """WB: skill field missing or blank → 400."""
        resp = client.post("/api/me/skills", json={})
        assert resp.status_code == 400
        assert "error" in _json(resp)

    def test_T112_BB_valid_skill_returns_updated_user(self, client, monkeypatch):
        """BB: Valid skill name → 200 with updated user containing skills list."""
        monkeypatch.setattr(flask_app.dbl, "add_skill",
                            lambda uid, s: {**MOCK_USER, "skills": [s]})
        resp = client.post("/api/me/skills", json={"skill": "Python"})
        assert resp.status_code == 200
        assert "skills" in _json(resp)


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/conversations  — create conversation
# ══════════════════════════════════════════════════════════════════════════════

class TestCreateConversation:

    def test_T113_BB_unauthenticated_returns_401(self, client, monkeypatch):
        """BB: No valid token → 401."""
        monkeypatch.setattr(flask_app.dbl, "get_session_user_id", lambda t: None)
        resp = client.post("/api/conversations", json={"participantId": 2})
        assert resp.status_code == 401

    def test_T114_WB_missing_participant_id_returns_400(self, client, monkeypatch):
        """WB: participantId missing from body → 400."""
        resp = client.post("/api/conversations", json={})
        assert resp.status_code == 400
        assert "error" in _json(resp)

    def test_T115_BB_valid_participant_returns_201_with_conversation(self, client, monkeypatch):
        """BB: Valid participantId → 201 with conversation object."""
        monkeypatch.setattr(flask_app.dbl, "create_conversation",
                            lambda uid, participant: MOCK_CONV)
        resp = client.post("/api/conversations", json={"participantId": 2})
        assert resp.status_code == 201
        assert "id" in _json(resp)


# ══════════════════════════════════════════════════════════════════════════════
# Social state endpoints
# ══════════════════════════════════════════════════════════════════════════════

class TestSocialState:

    def test_T116_BB_get_social_state_returns_200(self, client, monkeypatch):
        """BB: GET /api/me/social → 200 with social state dict."""
        resp = client.get("/api/me/social")
        assert resp.status_code == 200
        data = _json(resp)
        assert "connections" in data or "savedJobs" in data or isinstance(data, dict)

    def test_T117_BB_toggle_saved_job_returns_200(self, client, monkeypatch):
        """BB: POST /api/me/saved-jobs/:id → 200."""
        resp = client.post("/api/me/saved-jobs/1")
        assert resp.status_code == 200

    def test_T118_BB_save_job_returns_200(self, client, monkeypatch):
        """BB: PUT /api/me/saved-jobs/:id → 200."""
        resp = client.put("/api/me/saved-jobs/1")
        assert resp.status_code == 200

    def test_T119_BB_unsave_job_returns_200(self, client, monkeypatch):
        """BB: DELETE /api/me/saved-jobs/:id → 200."""
        resp = client.delete("/api/me/saved-jobs/1")
        assert resp.status_code == 200

    def test_T120_BB_get_connection_requests_returns_list(self, client, monkeypatch):
        """BB: GET /api/me/connection-requests → 200 with list."""
        resp = client.get("/api/me/connection-requests")
        assert resp.status_code == 200
        assert isinstance(_json(resp), list)

    def test_T121_BB_decline_connection_request_returns_200(self, client, monkeypatch):
        """BB: DELETE /api/me/connection-requests/:id → 200."""
        resp = client.delete("/api/me/connection-requests/2")
        assert resp.status_code == 200

    def test_T122_BB_connect_user_returns_200(self, client, monkeypatch):
        """BB: POST /api/me/connections/:id → 200."""
        resp = client.post("/api/me/connections/2")
        assert resp.status_code == 200

    def test_T123_BB_accept_connection_returns_200(self, client, monkeypatch):
        """BB: POST /api/me/connections/:id/accept → 200."""
        resp = client.post("/api/me/connections/2/accept")
        assert resp.status_code == 200

    def test_T124_BB_toggle_following_returns_200(self, client, monkeypatch):
        """BB: POST /api/me/following/:id → 200."""
        resp = client.post("/api/me/following/2")
        assert resp.status_code == 200

    def test_T125_BB_apply_to_job_returns_200(self, client, monkeypatch):
        """BB: POST /api/me/applied-jobs/:id → 200."""
        resp = client.post("/api/me/applied-jobs/1")
        assert resp.status_code == 200

    def test_T126_BB_toggle_group_returns_200(self, client, monkeypatch):
        """BB: POST /api/me/groups/:id/toggle → 200."""
        resp = client.post("/api/me/groups/1/toggle")
        assert resp.status_code == 200

    def test_T127_BB_dismiss_invitation_valid_key_returns_200(self, client, monkeypatch):
        """BB: POST /api/me/invitations/dismiss with valid key → 200."""
        resp = client.post("/api/me/invitations/dismiss", json={"key": "user-42"})
        assert resp.status_code == 200

    def test_T128_WB_dismiss_invitation_missing_key_returns_400(self, client, monkeypatch):
        """WB: POST /api/me/invitations/dismiss without key → 400."""
        resp = client.post("/api/me/invitations/dismiss", json={})
        assert resp.status_code == 400
        assert "error" in _json(resp)


# ══════════════════════════════════════════════════════════════════════════════
# Profile CRUD — update and delete endpoints
# ══════════════════════════════════════════════════════════════════════════════

class TestProfileCRUD:

    def test_T129_BB_update_experience_valid_returns_200(self, client, monkeypatch):
        """BB: PUT /api/me/experience/:index with valid body → 200."""
        resp = client.put("/api/me/experience/0",
                          json={"title": "Engineer", "company": "Nexus"})
        assert resp.status_code == 200

    def test_T130_WB_update_experience_missing_fields_returns_400(self, client, monkeypatch):
        """WB: PUT /api/me/experience/:index without title/company → 400."""
        resp = client.put("/api/me/experience/0", json={"location": "NY"})
        assert resp.status_code == 400

    def test_T131_BB_update_education_valid_returns_200(self, client, monkeypatch):
        """BB: PUT /api/me/education/:index with valid body → 200."""
        resp = client.put("/api/me/education/0",
                          json={"school": "NJIT", "degree": "BS"})
        assert resp.status_code == 200

    def test_T132_WB_update_education_missing_school_returns_400(self, client, monkeypatch):
        """WB: PUT /api/me/education/:index without school → 400."""
        resp = client.put("/api/me/education/0", json={"degree": "BS"})
        assert resp.status_code == 400

    def test_T133_BB_update_project_valid_returns_200(self, client, monkeypatch):
        """BB: PUT /api/me/projects/:index with valid body → 200."""
        resp = client.put("/api/me/projects/0",
                          json={"name": "My App", "description": "A cool project"})
        assert resp.status_code == 200

    def test_T134_WB_update_project_missing_name_returns_400(self, client, monkeypatch):
        """WB: PUT /api/me/projects/:index without name → 400."""
        resp = client.put("/api/me/projects/0", json={"description": "A project"})
        assert resp.status_code == 400

    def test_T135_BB_update_volunteering_valid_returns_200(self, client, monkeypatch):
        """BB: PUT /api/me/volunteering/:index with valid body → 200."""
        resp = client.put("/api/me/volunteering/0",
                          json={"role": "Mentor", "organization": "Code.org"})
        assert resp.status_code == 200

    def test_T136_BB_update_honor_valid_returns_200(self, client, monkeypatch):
        """BB: PUT /api/me/honors/:index with valid body → 200."""
        resp = client.put("/api/me/honors/0",
                          json={"title": "Dean's List", "issuer": "NJIT"})
        assert resp.status_code == 200

    def test_T137_BB_delete_experience_returns_200(self, client, monkeypatch):
        """BB: DELETE /api/me/experience/:index → 200 with updated list."""
        resp = client.delete("/api/me/experience/0")
        assert resp.status_code == 200

    def test_T138_BB_delete_education_returns_200(self, client, monkeypatch):
        """BB: DELETE /api/me/education/:index → 200 with updated list."""
        resp = client.delete("/api/me/education/0")
        assert resp.status_code == 200

    def test_T139_BB_delete_project_returns_200(self, client, monkeypatch):
        """BB: DELETE /api/me/projects/:index → 200 with updated list."""
        resp = client.delete("/api/me/projects/0")
        assert resp.status_code == 200

    def test_T140_BB_delete_volunteering_returns_200(self, client, monkeypatch):
        """BB: DELETE /api/me/volunteering/:index → 200 with updated list."""
        resp = client.delete("/api/me/volunteering/0")
        assert resp.status_code == 200

    def test_T141_BB_delete_honor_returns_200(self, client, monkeypatch):
        """BB: DELETE /api/me/honors/:index → 200 with updated list."""
        resp = client.delete("/api/me/honors/0")
        assert resp.status_code == 200

    def test_T142_BB_delete_skill_returns_200(self, client, monkeypatch):
        """BB: DELETE /api/me/skills/:index → 200 with updated list."""
        resp = client.delete("/api/me/skills/0")
        assert resp.status_code == 200

    def test_T143_BB_add_experience_valid_returns_200(self, client, monkeypatch):
        """BB: POST /api/me/experience with valid body → 200."""
        resp = client.post("/api/me/experience",
                           json={"title": "Engineer", "company": "Nexus"})
        assert resp.status_code == 200

    def test_T144_WB_add_experience_missing_fields_returns_400(self, client, monkeypatch):
        """WB: POST /api/me/experience without title/company → 400."""
        resp = client.post("/api/me/experience", json={"location": "NY"})
        assert resp.status_code == 400
