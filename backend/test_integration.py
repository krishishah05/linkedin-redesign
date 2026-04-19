"""
Nexus Integration Tests  (backend/test_integration.py)
CS485 AI-Assisted Software Engineering — Spring 2026

Run locally (seed DB required):
  BASE_URL=http://localhost:5000/api pytest backend/test_integration.py -v

Run against deployed app:
  BASE_URL=https://linkedin-redesign-z364.onrender.com/api pytest backend/test_integration.py -v
"""

import os
import uuid
import pytest
import requests

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TIMEOUT = 60


def _url(base_url, path):
    return f"{base_url}/{path.lstrip('/')}"


def _unique_email():
    return f"test_{uuid.uuid4().hex[:10]}@example.com"


def _register_temp_user(base_url):
    """Register a throwaway user and return (user_dict, token)."""
    resp = requests.post(
        _url(base_url, "/auth/register"),
        json={"name": "Temp User", "email": _unique_email(), "password": "temppass123"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 201, f"_register_temp_user failed: {resp.text}"
    data = resp.json()
    return data["user"], data["token"]


# ---------------------------------------------------------------------------
# 3.1 Authentication
# ---------------------------------------------------------------------------


def test_IT_A01_login_valid_credentials(base_url):
    """IT-A01: Login succeeds with valid credentials."""
    resp = requests.post(
        _url(base_url, "/auth/login"),
        json={"email": "alex.johnson@gmail.com", "password": "password123"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "user" in body
    assert "token" in body
    assert body["token"] != ""


def test_IT_A02_login_wrong_password(base_url):
    """IT-A02: Login fails with wrong password."""
    resp = requests.post(
        _url(base_url, "/auth/login"),
        json={"email": "alex.johnson@gmail.com", "password": "wrongpass"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 401
    assert "error" in resp.json()


def test_IT_A03_login_missing_email(base_url):
    """IT-A03: Login fails with missing email."""
    resp = requests.post(
        _url(base_url, "/auth/login"),
        json={"email": "", "password": "password123"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 400


def test_IT_A04_register_new_user(base_url):
    """IT-A04: Register new user successfully."""
    resp = requests.post(
        _url(base_url, "/auth/register"),
        json={"name": "Test User", "email": _unique_email(), "password": "securepass123"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "user" in body
    assert "token" in body
    user = body["user"]
    assert "id" in user
    assert "name" in user
    assert "email" in user


def test_IT_A05_register_duplicate_email(base_url):
    """IT-A05: Register fails with duplicate email."""
    resp = requests.post(
        _url(base_url, "/auth/register"),
        json={"name": "Alex J", "email": "alex.johnson@gmail.com", "password": "pass1234"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 409


def test_IT_A06_register_short_password(base_url):
    """IT-A06: Register fails with short password."""
    resp = requests.post(
        _url(base_url, "/auth/register"),
        json={"name": "Bob", "email": "bob@x.com", "password": "short"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 400


def test_IT_A07_register_invalid_email(base_url):
    """IT-A07: Register fails with invalid email format."""
    resp = requests.post(
        _url(base_url, "/auth/register"),
        json={"name": "Bob", "email": "notanemail", "password": "pass1234"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# 3.2 Current User / Profile
# ---------------------------------------------------------------------------


def test_IT_U01_fetch_me_authenticated(base_url, auth_headers):
    """IT-U01: Fetch current user profile (authenticated)."""
    resp = requests.get(_url(base_url, "/me"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    user = resp.json()
    assert "id" in user
    assert "name" in user
    assert "headline" in user


def test_IT_U02_fetch_me_unauthenticated_falls_back(base_url):
    """IT-U02: Unauthenticated GET /api/me returns user id=1."""
    resp = requests.get(_url(base_url, "/me"), timeout=TIMEOUT)
    assert resp.status_code == 200
    assert resp.json().get("id") == 1


def test_IT_U03_update_profile_headline(base_url, auth_headers):
    """IT-U03: Update profile headline."""
    resp = requests.put(
        _url(base_url, "/me"),
        headers=auth_headers,
        json={"headline": "Software Engineer"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200
    assert resp.json().get("headline") == "Software Engineer"


def test_IT_U04_update_profile_invalid_fields(base_url, auth_headers):
    """IT-U04: Update profile with no valid fields returns 400."""
    resp = requests.put(
        _url(base_url, "/me"),
        headers=auth_headers,
        json={"invalidField": "x"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 400


def test_IT_U05_add_education_entry(base_url, auth_headers):
    """IT-U05: Add education entry."""
    resp = requests.post(
        _url(base_url, "/me/education"),
        headers=auth_headers,
        json={"school": "MIT", "degree": "BS", "field": "CS", "startDate": "2020", "endDate": "2024"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200
    education = resp.json().get("education", [])
    schools = [e.get("school") for e in education]
    assert "MIT" in schools


def test_IT_U06_add_education_missing_school(base_url, auth_headers):
    """IT-U06: Add education without school returns 400."""
    resp = requests.post(
        _url(base_url, "/me/education"),
        headers=auth_headers,
        json={"degree": "BS"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 400


def test_IT_U07_add_skill(base_url, auth_headers):
    """IT-U07: Add skill."""
    resp = requests.post(
        _url(base_url, "/me/skills"),
        headers=auth_headers,
        json={"skill": "Python"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200
    skills = resp.json().get("skills", [])
    # Skills are objects {name, category, endorsements}
    skill_names = [s.get("name") if isinstance(s, dict) else s for s in skills]
    assert "Python" in skill_names


def test_IT_U08_fetch_profile_readiness(base_url, auth_headers):
    """IT-U08: Fetch profile readiness score."""
    resp = requests.get(_url(base_url, "/profile-readiness"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    body = resp.json()
    assert "score" in body


def test_IT_U09_fetch_social_state(base_url, auth_headers):
    """IT-U09: Fetch social state."""
    resp = requests.get(_url(base_url, "/me/social"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    body = resp.json()
    for key in ("connections", "following", "savedJobs", "appliedJobs"):
        assert key in body, f"Missing key '{key}' in social state"


# ---------------------------------------------------------------------------
# 3.3 Feed & Posts
# ---------------------------------------------------------------------------


def test_IT_F01_fetch_feed(base_url, auth_headers):
    """IT-F01: Fetch feed returns list of posts."""
    resp = requests.get(_url(base_url, "/feed"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    posts = resp.json()
    assert isinstance(posts, list)
    if posts:
        post = posts[0]
        assert "id" in post
        assert "content" in post
        assert "author" in post or "authorId" in post
        assert any(k in post for k in ("likes", "likesCount", "likeCount"))


def test_IT_F02_create_post(base_url, auth_headers):
    """IT-F02: Create a new text post."""
    resp = requests.post(
        _url(base_url, "/feed"),
        headers=auth_headers,
        json={"content": "Hello Nexus!", "imageUrl": None},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 201
    post = resp.json()
    assert post.get("content") == "Hello Nexus!"
    assert "id" in post


def test_IT_F03_create_post_without_content(base_url, auth_headers):
    """IT-F03: Create post without content returns 400."""
    resp = requests.post(
        _url(base_url, "/feed"),
        headers=auth_headers,
        json={},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 400


def test_IT_F04_like_post_toggles_count(base_url, auth_headers):
    """IT-F04: Like a post increments count; liking again (toggle) decrements it."""
    create = requests.post(
        _url(base_url, "/feed"),
        headers=auth_headers,
        json={"content": "Like me!"},
        timeout=TIMEOUT,
    )
    assert create.status_code == 201
    post_id = create.json()["id"]

    def get_likes(pid):
        feed = requests.get(_url(base_url, "/feed"), headers=auth_headers, timeout=TIMEOUT)
        posts_map = {p["id"]: p for p in feed.json()}
        assert pid in posts_map, f"Post {pid} not found in feed"
        p = posts_map[pid]
        return p.get("likeCount", p.get("likes", p.get("likesCount", 0)))

    initial = get_likes(post_id)
    assert initial == 0, f"Freshly created post should have 0 likes, got {initial}"

    # First like — should increment to 1
    r1 = requests.post(
        _url(base_url, f"/feed/{post_id}/like"), headers=auth_headers, timeout=TIMEOUT
    )
    assert r1.status_code == 200
    assert get_likes(post_id) == 1, "Like count should be 1 after first like"

    # Second like (toggle off) — should return to 0
    r2 = requests.post(
        _url(base_url, f"/feed/{post_id}/like"), headers=auth_headers, timeout=TIMEOUT
    )
    assert r2.status_code == 200
    assert get_likes(post_id) == 0, "Like count should return to 0 after unliking"


def test_IT_F05_comment_on_post(base_url, auth_headers):
    """IT-F05: Comment on a post."""
    # Create a post to comment on
    create = requests.post(
        _url(base_url, "/feed"),
        headers=auth_headers,
        json={"content": "Comment on me!"},
        timeout=TIMEOUT,
    )
    post_id = create.json()["id"]

    resp = requests.post(
        _url(base_url, f"/feed/{post_id}/comments"),
        headers=auth_headers,
        json={"text": "Great post!"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 201
    comment = resp.json()
    assert comment.get("text") == "Great post!"


def test_IT_F06_delete_own_post(base_url, auth_headers):
    """IT-F06: Delete own post removes it from feed."""
    # Create a post to delete
    create = requests.post(
        _url(base_url, "/feed"),
        headers=auth_headers,
        json={"content": "Delete me!"},
        timeout=TIMEOUT,
    )
    assert create.status_code == 201
    post_id = create.json()["id"]

    # Delete it
    del_resp = requests.delete(
        _url(base_url, f"/feed/{post_id}"),
        headers=auth_headers,
        timeout=TIMEOUT,
    )
    assert del_resp.status_code == 200

    # Verify it's gone
    feed = requests.get(_url(base_url, "/feed"), headers=auth_headers, timeout=TIMEOUT)
    assert all(p["id"] != post_id for p in feed.json())


def test_IT_F07_delete_other_users_post_forbidden(base_url, auth_headers):
    """IT-F07: Delete another user's post returns 403."""
    _, other_token = _register_temp_user(base_url)
    other_headers = {"Authorization": f"Bearer {other_token}"}

    create = requests.post(
        _url(base_url, "/feed"),
        headers=other_headers,
        json={"content": "Other user's post"},
        timeout=TIMEOUT,
    )
    assert create.status_code == 201
    post_id = create.json()["id"]

    del_resp = requests.delete(
        _url(base_url, f"/feed/{post_id}"),
        headers=auth_headers,
        timeout=TIMEOUT,
    )
    assert del_resp.status_code in (401, 403), (
        f"Expected 403 (forbidden) when deleting another user's post, got {del_resp.status_code}"
    )


# ---------------------------------------------------------------------------
# 3.4 Connections & Network
# ---------------------------------------------------------------------------


def test_IT_N01_fetch_all_users(base_url, auth_headers):
    """IT-N01: Fetch all users returns list."""
    resp = requests.get(_url(base_url, "/users"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_IT_N02_fetch_specific_user(base_url, auth_headers):
    """IT-N02: Fetch a specific user by id."""
    resp = requests.get(_url(base_url, "/users/2"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    assert resp.json().get("id") == 2


def test_IT_N03_fetch_nonexistent_user(base_url, auth_headers):
    """IT-N03: Fetch non-existent user returns 404."""
    resp = requests.get(_url(base_url, "/users/99999"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 404


def test_IT_N04_send_connection_request(base_url, auth_headers):
    """IT-N04: Send a connection request."""
    # Register a target user to avoid conflicts with existing connection state
    target_user, _ = _register_temp_user(base_url)
    target_id = target_user["id"]

    resp = requests.post(
        _url(base_url, f"/me/connections/{target_id}"),
        headers=auth_headers,
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200


def test_IT_N05_accept_connection_request(base_url, auth_headers):
    """IT-N05: Accept a connection request."""
    # Get main user's id
    me_resp = requests.get(_url(base_url, "/me"), headers=auth_headers, timeout=TIMEOUT)
    main_user_id = me_resp.json()["id"]

    # Register a secondary user who will send the request
    _, other_token = _register_temp_user(base_url)
    other_headers = {"Authorization": f"Bearer {other_token}"}
    other_me = requests.get(_url(base_url, "/me"), headers=other_headers, timeout=TIMEOUT).json()
    other_id = other_me["id"]

    # Other user sends connection request to main user
    conn = requests.post(
        _url(base_url, f"/me/connections/{main_user_id}"),
        headers=other_headers,
        timeout=TIMEOUT,
    )
    assert conn.status_code == 200

    # Main user accepts
    accept = requests.post(
        _url(base_url, f"/me/connections/{other_id}/accept"),
        headers=auth_headers,
        timeout=TIMEOUT,
    )
    assert accept.status_code == 200


def test_IT_N06_toggle_follow(base_url, auth_headers):
    """IT-N06: Toggle follow on a user."""
    target_user, _ = _register_temp_user(base_url)
    target_id = target_user["id"]

    resp = requests.post(
        _url(base_url, f"/me/following/{target_id}"),
        headers=auth_headers,
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 3.5 Messaging
# ---------------------------------------------------------------------------


def test_IT_M01_fetch_all_conversations(base_url, auth_headers):
    """IT-M01: Fetch all conversations."""
    resp = requests.get(_url(base_url, "/conversations"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, list)


def test_IT_M02_fetch_single_conversation(base_url, auth_headers):
    """IT-M02: Fetch single conversation with messages (requires seed conversation id=1)."""
    resp = requests.get(_url(base_url, "/conversations/1"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    body = resp.json()
    assert "messages" in body


def test_IT_M03_create_conversation(base_url, auth_headers):
    """IT-M03: Create a new conversation."""
    # Use a fresh registered user to ensure no existing conversation
    target_user, _ = _register_temp_user(base_url)
    resp = requests.post(
        _url(base_url, "/conversations"),
        headers=auth_headers,
        json={"participantId": target_user["id"]},
        timeout=TIMEOUT,
    )
    assert resp.status_code in (200, 201), resp.text
    body = resp.json()
    assert "id" in body


def test_IT_M04_send_message(base_url, auth_headers):
    """IT-M04: Send a message in a conversation."""
    # Create a conversation first
    target_user, _ = _register_temp_user(base_url)
    conv_resp = requests.post(
        _url(base_url, "/conversations"),
        headers=auth_headers,
        json={"participantId": target_user["id"]},
        timeout=TIMEOUT,
    )
    assert conv_resp.status_code in (200, 201), conv_resp.text
    conv_id = conv_resp.json()["id"]

    resp = requests.post(
        _url(base_url, f"/conversations/{conv_id}/messages"),
        headers=auth_headers,
        json={"text": "Hey there!"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 201
    msg = resp.json()
    assert msg.get("text") == "Hey there!"


def test_IT_M05_send_empty_message(base_url, auth_headers):
    """IT-M05: Send empty message returns 400."""
    # Create a conversation to send to
    target_user, _ = _register_temp_user(base_url)
    conv_resp = requests.post(
        _url(base_url, "/conversations"),
        headers=auth_headers,
        json={"participantId": target_user["id"]},
        timeout=TIMEOUT,
    )
    assert conv_resp.status_code in (200, 201), conv_resp.text
    conv_id = conv_resp.json()["id"]

    resp = requests.post(
        _url(base_url, f"/conversations/{conv_id}/messages"),
        headers=auth_headers,
        json={"text": ""},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# 3.6 Jobs
# ---------------------------------------------------------------------------


def test_IT_J01_fetch_all_jobs(base_url, auth_headers):
    """IT-J01: Fetch all jobs."""
    resp = requests.get(_url(base_url, "/jobs"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    jobs = resp.json()
    assert isinstance(jobs, list)
    if jobs:
        job = jobs[0]
        assert "id" in job
        assert "title" in job or "company" in job


def test_IT_J02_fetch_specific_job(base_url, auth_headers):
    """IT-J02: Fetch a specific job by id."""
    resp = requests.get(_url(base_url, "/jobs/1"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    assert resp.json().get("id") == 1


def test_IT_J03_save_job_toggles_state(base_url, auth_headers):
    """IT-J03: Save a job toggles saved state and persists to social."""
    # Ensure job 1 starts in a known unsaved state regardless of prior test runs
    social_initial = requests.get(
        _url(base_url, "/me/social"), headers=auth_headers, timeout=TIMEOUT
    ).json()
    if 1 in social_initial.get("savedJobs", []):
        requests.post(
            _url(base_url, "/me/saved-jobs/1"), headers=auth_headers, timeout=TIMEOUT
        )

    social_before = requests.get(
        _url(base_url, "/me/social"), headers=auth_headers, timeout=TIMEOUT
    ).json()
    assert 1 not in social_before.get("savedJobs", []), "Job 1 should be unsaved"

    # Toggle job 1 to saved
    resp = requests.post(
        _url(base_url, "/me/saved-jobs/1"), headers=auth_headers, timeout=TIMEOUT
    )
    assert resp.status_code == 200

    social_after = requests.get(
        _url(base_url, "/me/social"), headers=auth_headers, timeout=TIMEOUT
    ).json()
    assert 1 in social_after.get("savedJobs", []), "Job 1 should now be saved"

    # Restore job 1 to unsaved
    resp = requests.post(
        _url(base_url, "/me/saved-jobs/1"), headers=auth_headers, timeout=TIMEOUT
    )
    assert resp.status_code == 200

    social_final = requests.get(
        _url(base_url, "/me/social"), headers=auth_headers, timeout=TIMEOUT
    ).json()
    assert 1 not in social_final.get("savedJobs", []), "Job 1 should be unsaved again"


def test_IT_J04_apply_to_job(base_url, auth_headers):
    """IT-J04: Apply to a job."""
    resp = requests.post(
        _url(base_url, "/me/applied-jobs/1"),
        headers=auth_headers,
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200
    social = requests.get(_url(base_url, "/me/social"), headers=auth_headers, timeout=TIMEOUT).json()
    assert 1 in social.get("appliedJobs", [])


# ---------------------------------------------------------------------------
# 3.7 Notifications
# ---------------------------------------------------------------------------


def test_IT_NT01_fetch_notifications(base_url, auth_headers):
    """IT-NT01: Fetch notifications returns list."""
    resp = requests.get(_url(base_url, "/notifications"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    notifs = resp.json()
    assert isinstance(notifs, list)
    if notifs:
        n = notifs[0]
        assert "id" in n
        # Backend uses "isRead", spec says "read"
        assert "isRead" in n or "read" in n


def test_IT_NT02_mark_single_notification_read(base_url, auth_headers):
    """IT-NT02: Mark a single notification as read."""
    # Fetch notifications to find a valid id
    notifs = requests.get(_url(base_url, "/notifications"), headers=auth_headers, timeout=TIMEOUT).json()
    if not notifs:
        pytest.skip("No notifications available to mark as read")

    notif_id = notifs[0]["id"]
    resp = requests.patch(
        _url(base_url, f"/notifications/{notif_id}/read"),
        headers=auth_headers,
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200
    notif = resp.json()
    assert notif.get("isRead") is True or notif.get("read") is True


def test_IT_NT03_mark_all_notifications_read(base_url, auth_headers):
    """IT-NT03: Mark all notifications as read."""
    notifs_before = requests.get(
        _url(base_url, "/notifications"), headers=auth_headers, timeout=TIMEOUT
    ).json()
    if not notifs_before:
        pytest.skip("No notifications exist — cannot verify read-all behavior")

    resp = requests.patch(
        _url(base_url, "/notifications/read-all"), headers=auth_headers, timeout=TIMEOUT
    )
    assert resp.status_code == 200

    notifs_after = requests.get(
        _url(base_url, "/notifications"), headers=auth_headers, timeout=TIMEOUT
    ).json()
    assert len(notifs_after) > 0, "Notifications disappeared after read-all"
    unread = [n for n in notifs_after if not (n.get("isRead") is True or n.get("read") is True)]
    assert not unread, f"Expected all notifications read, still unread: {unread}"


# ---------------------------------------------------------------------------
# 3.8 Events & Groups
# ---------------------------------------------------------------------------


def test_IT_E01_fetch_events_list(base_url, auth_headers):
    """IT-E01: Fetch events list."""
    resp = requests.get(_url(base_url, "/events"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_IT_E02_create_event(base_url, auth_headers):
    """IT-E02: Create a new event."""
    resp = requests.post(
        _url(base_url, "/events"),
        headers=auth_headers,
        json={"name": "Hackathon", "date": "2026-05-01", "location": "Online", "description": "Coding event"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 201
    event = resp.json()
    assert event.get("name") == "Hackathon"


def test_IT_E03_attend_event(base_url, auth_headers):
    """IT-E03: Attend an event."""
    # Create an event first to get a valid user-created event id
    create = requests.post(
        _url(base_url, "/events"),
        headers=auth_headers,
        json={"name": "Attend Test Event", "date": "2026-06-01", "location": "Online", "description": ""},
        timeout=TIMEOUT,
    )
    assert create.status_code == 201
    event_id = create.json()["id"]

    resp = requests.post(
        _url(base_url, f"/events/{event_id}/attend"),
        headers=auth_headers,
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200


def test_IT_G01_fetch_groups_list(base_url):
    """IT-G01: Fetch groups list (no auth required)."""
    resp = requests.get(_url(base_url, "/groups"), timeout=TIMEOUT)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_IT_G02_create_group(base_url, auth_headers):
    """IT-G02: Create a new group."""
    resp = requests.post(
        _url(base_url, "/groups"),
        headers=auth_headers,
        json={"name": "AI Enthusiasts", "description": "A group for AI fans", "industry": "Technology"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 201
    assert resp.json().get("name") == "AI Enthusiasts"


def test_IT_G03_toggle_group_membership(base_url, auth_headers):
    """IT-G03: Toggle group membership."""
    # Get a valid group id from the list
    groups = requests.get(_url(base_url, "/groups"), timeout=TIMEOUT).json()
    assert groups, "No groups available"
    group_id = groups[0]["id"]

    resp = requests.post(
        _url(base_url, f"/me/groups/{group_id}/toggle"),
        headers=auth_headers,
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 3.9 Search
# ---------------------------------------------------------------------------


def test_IT_S01_search_known_user(base_url, auth_headers):
    """IT-S01: Search for a known user by name."""
    resp = requests.get(_url(base_url, "/search?q=Alex"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    body = resp.json()
    users = body.get("users", [])
    names = [u.get("name", "") for u in users]
    assert any("Alex" in name for name in names), f"Alex Johnson not found in results: {names}"


def test_IT_S02_search_empty_query(base_url, auth_headers):
    """IT-S02: Search with empty query returns 200 (not an error)."""
    resp = requests.get(_url(base_url, "/search?q="), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200


def test_IT_S03_search_job_keyword(base_url, auth_headers):
    """IT-S03: Search for a job title keyword."""
    resp = requests.get(_url(base_url, "/search?q=Engineer"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    body = resp.json()
    jobs = body.get("jobs", [])
    assert isinstance(jobs, list)


# ---------------------------------------------------------------------------
# 3.10 Outreach — Story #1: Message Guidance
# ---------------------------------------------------------------------------


def test_IT_O01_generate_outreach_valid(base_url, auth_headers):
    """IT-O01: Generate outreach message with valid inputs."""
    resp = requests.post(
        _url(base_url, "/outreach/generate"),
        headers=auth_headers,
        json={"recipientId": 2, "tone": "professional", "goal": "networking", "custom_note": "", "details": {}},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200
    body = resp.json()
    draft = body.get("draft") or body.get("message")
    assert draft and isinstance(draft, str) and draft.strip(), (
        f"Expected non-empty generated message in 'draft' or 'message', got: {body}"
    )


def test_IT_O02_generate_outreach_all_optional_fields(base_url, auth_headers):
    """IT-O02: Generate outreach with all optional fields populated."""
    resp = requests.post(
        _url(base_url, "/outreach/generate"),
        headers=auth_headers,
        json={
            "recipientId": 2,
            "tone": "casual",
            "goal": "job_inquiry",
            "custom_note": "Met at conference",
            "details": {},
        },
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200
    body = resp.json()
    draft = body.get("draft") or body.get("message")
    assert draft and isinstance(draft, str) and draft.strip(), (
        f"Expected non-empty generated message in 'draft' or 'message', got: {body}"
    )


def test_IT_O03_generate_outreach_missing_recipient_id(base_url, auth_headers):
    """IT-O03: Generate outreach missing recipientId returns 400."""
    resp = requests.post(
        _url(base_url, "/outreach/generate"),
        headers=auth_headers,
        json={"tone": "professional"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 400


def test_IT_O04_generate_outreach_invalid_recipient_id(base_url, auth_headers):
    """IT-O04: Generate outreach with invalid recipientId returns 404 or 400."""
    resp = requests.post(
        _url(base_url, "/outreach/generate"),
        headers=auth_headers,
        json={"recipientId": 999999, "tone": "professional", "goal": "networking"},
        timeout=TIMEOUT,
    )
    assert resp.status_code in (400, 404)


# ---------------------------------------------------------------------------
# 3.11 Outreach — Story #2: Readiness Check
# ---------------------------------------------------------------------------


def test_IT_R01_fetch_readiness_current_user(base_url, auth_headers):
    """IT-R01: Fetch readiness score for current user."""
    resp = requests.get(_url(base_url, "/outreach/readiness"), headers=auth_headers, timeout=TIMEOUT)
    assert resp.status_code == 200
    body = resp.json()
    assert "score" in body
    assert "breakdown" in body


def test_IT_R02_fetch_readiness_specific_user(base_url, auth_headers):
    """IT-R02: Fetch readiness score for a specific userId."""
    resp = requests.get(
        _url(base_url, "/outreach/readiness?userId=2"),
        headers=auth_headers,
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "score" in body


def test_IT_R03_fetch_readiness_nonexistent_user(base_url, auth_headers):
    """IT-R03: Fetch readiness for non-existent user returns 404."""
    resp = requests.get(
        _url(base_url, "/outreach/readiness?userId=999999"),
        headers=auth_headers,
        timeout=TIMEOUT,
    )
    assert resp.status_code == 404
