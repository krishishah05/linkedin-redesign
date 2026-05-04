"""
Nexus - Flask Backend  (backend/app.py)
CS485 Project - Spring 2026

All mutable data (users, posts, conversations, messages, notifications,
jobs, companies) lives in SQLite via database.py.

Static reference data (events, groups, courses, news, invitations, hashtags)
is served directly from data/*.py - they have no mutation routes.

Run:
    pip3 install -r backend/requirements.txt
    python3 backend/app.py
"""

from flask import Flask, jsonify, request, abort, send_from_directory
from flask_cors import CORS
import sys
import os
import re
import time
import hashlib
from dotenv import load_dotenv

load_dotenv()

# Allow running from repo root: python backend/app.py
sys.path.insert(0, os.path.dirname(__file__))

import database as dbl          # SQLite data layer
import outreach as outreach_mod  # NX.BE.OutreachModule

# Static reference data (read-only, never mutated)
import data as static_data

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

app = Flask(__name__, static_folder=ROOT_DIR, static_url_path="")
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialise DB (creates schema + seeds if empty)
dbl.init_db()

# â”€â”€ The Muse live job cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
_muse_cache        = {"jobs": [], "fetched_at": 0.0}
_muse_detail_cache = {}   # museId -> full job dict
_MUSE_TTL          = 4 * 3600  # refresh every 4 hours
_conference_search_cache = {}
_CONFERENCE_SEARCH_TTL = 2 * 3600
_CONFERENCE_SEARCH_MAX = 128


def _purge_conference_search_cache(now=None):
    now = time.time() if now is None else now
    expired = [
        key for key, value in _conference_search_cache.items()
        if now - value.get("fetched_at", 0) >= _CONFERENCE_SEARCH_TTL
    ]
    for key in expired:
        _conference_search_cache.pop(key, None)
    while len(_conference_search_cache) > _CONFERENCE_SEARCH_MAX:
        oldest = min(_conference_search_cache, key=lambda k: _conference_search_cache[k].get("fetched_at", 0))
        _conference_search_cache.pop(oldest, None)


def _fetch_muse_jobs():
    """Pull live jobs from The Muse public API (no API key required)."""
    import requests as req_lib
    from datetime import datetime, timezone

    jobs = []
    MUSE_ID_OFFSET = 10000  # public ids above static seed data so they don't collide

    for page in range(5):  # 5 pages x 20 = up to 100 jobs
        try:
            r = req_lib.get(
                "https://www.themuse.com/api/public/jobs",
                params={"page": page, "descending": "true"},
                timeout=8,
            )
            if not r.ok:
                break
            results = r.json().get("results", [])
            if not results:
                break
            for j in results:
                company    = j.get("company", {})
                locations  = j.get("locations", [])
                levels     = j.get("levels", [])
                categories = j.get("categories", [])

                loc   = locations[0]["name"]   if locations   else "Remote"
                level = levels[0]["name"]      if levels      else ""
                cat   = categories[0]["name"]  if categories  else "General"

                pub = j.get("publication_date", "")
                try:
                    dt     = datetime.fromisoformat(pub.replace("Z", "+00:00"))
                    delta  = (datetime.now(timezone.utc) - dt).days
                    posted = "Today" if delta == 0 else f"{delta}d ago"
                except ValueError:
                    posted = pub[:10] if pub else ""

                muse_id = j.get("id")
                # Derive a stable public id from the Muse job id so saved/applied
                # records stay consistent across cache refreshes.
                try:
                    stable_id = MUSE_ID_OFFSET + int(muse_id)
                except (TypeError, ValueError):
                    import zlib
                    stable_id = MUSE_ID_OFFSET + (zlib.crc32(str(muse_id).encode()) & 0x7FFFFFFF)

                co_name = company.get("name", "")
                jobs.append({
                    "id":          stable_id,
                    "museId":      muse_id,
                    "title":       j.get("name", ""),
                    "company":     co_name,
                    "location":    loc,
                    "type":        "Full-time",
                    "level":       level,
                    "category":    cat,
                    "description": "",
                    "salary":      "",
                    "posted":      posted,
                    "logo":        (co_name[:1] or "?").upper(),
                    "applicants":  0,
                    "saved":       False,
                    "applied":     False,
                    "url":         j.get("refs", {}).get("landing_page", ""),
                    "source":      "muse",
                })
        except Exception:
            break

    return jobs


def _auth_user():
    """
    Extract and validate the session token from the Authorization header.
    Returns the user dict on success, or None if unauthenticated/invalid token.
    """
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
    uid = dbl.get_session_user_id(token)
    return dbl.get_current_user(uid) if uid else None


def _require_auth_user():
    """Like _auth_user() but aborts with 401 instead of returning None."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    return user


def _get_body():
    """Parse request JSON body; silently returns {} for non-dict payloads."""
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else {}


# â”€â”€ Health check (used by Render's deploy health check) â”€â”€â”€â”€â”€â”€â”€

@app.route("/api/health")
def health():
    return jsonify({"status": "ok"}), 200



# â”€â”€ Serve SPA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.route("/")
def index():
    return send_from_directory(ROOT_DIR, "app.html")


# â”€â”€ Error handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import requests


def _conference_cache_key(location, field):
    return (location or "").strip().lower(), (field or "").strip().lower()


def _conference_response(location, field, conferences, source, raw=None):
    return conferences


def _stringify_address(value):
    if isinstance(value, list):
        return ", ".join(str(part).strip() for part in value if str(part).strip())
    if isinstance(value, dict):
        return ", ".join(str(part).strip() for part in value.values() if str(part).strip())
    return str(value or "").strip()


def _extract_event_date(event):
    date_value = event.get("date") or {}
    if isinstance(date_value, dict):
        return date_value.get("when") or date_value.get("start_date") or "TBD"
    return str(date_value or "TBD")


def _stable_conference_id(event, index):
    seed = "|".join(str(event.get(key, "")) for key in ("title", "link", "address"))
    if not seed.strip("|"):
        seed = str(index)
    return int(hashlib.sha1(seed.encode("utf-8")).hexdigest()[:8], 16)


def _normalize_serpapi_conferences(data, location, field):
    events = data.get("events_results") if isinstance(data, dict) else []
    if not isinstance(events, list):
        return []

    fallback_lat, fallback_lng = _coordinates_for_location(location)
    offsets = [(0.010, 0.008), (-0.008, -0.012), (0.014, -0.006), (-0.012, 0.014), (0.006, -0.016)]
    normalized = []

    for index, event in enumerate(events):
        if not isinstance(event, dict):
            continue
        title = str(event.get("title") or "").strip()
        if not title:
            continue

        venue = event.get("venue")
        venue_name = venue.get("name") if isinstance(venue, dict) else ""
        address = _stringify_address(event.get("address")) or _stringify_address(venue) or location
        gps_coordinates = event.get("gps_coordinates") if isinstance(event.get("gps_coordinates"), dict) else {}
        lat = _coerce_float(event.get("latitude") or event.get("lat") or gps_coordinates.get("latitude"), None)
        lng = _coerce_float(event.get("longitude") or event.get("lng") or gps_coordinates.get("longitude"), None)
        if lat is None or lng is None:
            dlat, dlng = offsets[index % len(offsets)]
            lat = fallback_lat + dlat
            lng = fallback_lng + dlng

        tags = [field.title()] if field else ["Conference"]
        if event.get("type"):
            tags.append(str(event["type"]).title())

        map_data = event.get("event_location_map") if isinstance(event.get("event_location_map"), dict) else {}

        normalized.append({
            "id": _stable_conference_id(event, index),
            "name": title,
            "title": title,
            "category": field.title() if field else "Conference",
            "date": _extract_event_date(event),
            "venue": venue_name or address,
            "address": address,
            "lat": round(float(lat), 6),
            "lng": round(float(lng), 6),
            "description": str(event.get("description") or "").strip(),
            "link": event.get("link") or map_data.get("link") or "",
            "thumbnail": event.get("thumbnail") or "",
            "price": event.get("price") or "See event",
            "attendees": int(_coerce_float(event.get("attendees"), 0) or 0),
            "tags": tags[:3],
            "source": "serpapi",
        })

    return normalized


@app.route('/api/conferences/search', methods=['GET'])
def search_conferences():
    location = (request.args.get('location') or 'United States').strip()
    field = (request.args.get('field') or 'technology').strip()
    cache_key = _conference_cache_key(location, field)
    now = time.time()
    _purge_conference_search_cache(now)

    cached = _conference_search_cache.get(cache_key)
    if cached and now - cached.get("fetched_at", 0) < _CONFERENCE_SEARCH_TTL:
        return jsonify(cached["payload"])

    api_key = os.getenv("SERPAPI_API_KEY", "").strip()
    if not api_key:
        conferences = _fallback_conferences(location, field)
        _conference_search_cache[cache_key] = {"fetched_at": now, "payload": conferences}
        return jsonify(conferences), 200

    try:
        query = f"{field} conference in {location}"
        response = requests.get(
            "https://serpapi.com/search.json",
            params={"engine": "google_events", "q": query, "api_key": api_key},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        conferences = _normalize_serpapi_conferences(data, location, field)
        if not conferences:
            conferences = _fallback_conferences(location, field)
    except Exception:
        app.logger.warning("SerpAPI conference search failed; using fallback conference results")
        conferences = _fallback_conferences(location, field)

    _conference_search_cache[cache_key] = {"fetched_at": now, "payload": conferences}
    return jsonify(conferences), 200

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": str(e)}), 404


@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": str(e)}), 400


@app.errorhandler(401)
def unauthorized(e):
    return jsonify({"error": str(e)}), 401


@app.errorhandler(403)
def forbidden(e):
    return jsonify({"error": str(e)}), 403


@app.errorhandler(409)
def conflict(e):
    return jsonify({"error": str(e)}), 409


@app.errorhandler(502)
def bad_gateway(e):
    return jsonify({"error": str(e)}), 502


@app.errorhandler(503)
def service_unavailable(e):
    return jsonify({"error": str(e)}), 503




# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Auth / Account Endpoints
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/auth/login", methods=["POST"])
def login():
    """
    POST /api/auth/login - authenticate an existing user.
    Body: { email, password }
    Returns { user, token } on success or 401 on failure.
    """
    body = _get_body()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        abort(400, description="email and password are required")

    user = dbl.verify_credentials(email, password)
    if not user:
        abort(401, description="Invalid email or password")

    token = dbl.create_session(user["id"])
    return jsonify({"user": user, "token": token}), 200


@app.route("/api/auth/register", methods=["POST"])
def register():
    """
    POST /api/auth/register - create a new user account.
    Body: { name, email, password }
    Returns the new user dict (201) or 400/409 on validation failure.
    """
    body = _get_body()

    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    is_recruiter_raw = body.get("isRecruiter", False)
    if not isinstance(is_recruiter_raw, bool):
        abort(400, description="isRecruiter must be a boolean")
    is_recruiter = is_recruiter_raw

    if not name:
        abort(400, description="name is required")
    if not email or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        abort(400, description="a valid email is required")
    if len(password) < 8:
        abort(400, description="password must be at least 8 characters")

    try:
        user = dbl.create_user(name, email, password, is_recruiter=is_recruiter)
    except ValueError as exc:
        abort(409, description=str(exc))

    token = dbl.create_session(user["id"])
    return jsonify({"user": user, "token": token}), 201


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    """POST /api/auth/logout - invalidate the current session token."""
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
    if token:
        dbl.invalidate_session(token)
    return jsonify({"message": "Logged out"}), 200


@app.route("/api/auth/change-password", methods=["POST"])
def change_password():
    """POST /api/auth/change-password - update password for the authenticated user."""
    user = _require_auth_user()
    body = _get_body()
    current = body.get("current") or ""
    new_pw = body.get("newPassword") or ""
    if not current or not new_pw:
        abort(400, description="current and newPassword are required")
    if len(new_pw) < 8:
        abort(400, description="password must be at least 8 characters")
    success = dbl.change_password(user["id"], current, new_pw)
    if not success:
        abort(401, description="Current password is incorrect")
    return jsonify({"message": "Password updated successfully"}), 200



# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# User Endpoints
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/me")
def get_me():
    """GET /api/me - current logged-in user profile."""
    user = _auth_user()
    if not user:
        abort(401, description="Not authenticated")
    return jsonify(user)


@app.route("/api/me", methods=["PUT", "PATCH"])
def update_me():
    """PUT /api/me - update current user profile fields."""
    body = _get_body()
    allowed = {"name", "headline", "location", "about", "pronouns", "industry", "photo"}
    updates = {k: v for k, v in body.items() if k in allowed and isinstance(v, str)}
    if not updates:
        abort(400, description="No valid fields to update")
    current_user = _auth_user()
    if not current_user:
        abort(401, description="Not authenticated")
    updated = dbl.update_current_user(updates, current_user["id"])
    if not updated:
        abort(404, description="Current user not found")
    return jsonify(updated)


@app.route("/api/me/education", methods=["POST"])
def add_education():
    """POST /api/me/education - append an education entry to the current user."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = _get_body()
    school = (body.get("school") or "").strip()
    if not school:
        abort(400, description="school is required")
    entry = {
        "school": school,
        "degree": (body.get("degree") or "").strip(),
        "field": (body.get("field") or "").strip(),
        "startDate": (body.get("startDate") or "").strip(),
        "endDate": (body.get("endDate") or "").strip(),
    }
    updated = dbl.add_education(user["id"], entry)
    if not updated:
        abort(404, description="User not found")
    return jsonify(updated)


@app.route("/api/me/experience", methods=["POST"])
def add_experience():
    """POST /api/me/experience - append a work experience entry to the current user."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True)
    if body is not None and not isinstance(body, dict):
        abort(400, description="Request body must be a JSON object")
    body = body or {}
    title = (body.get("title") or "").strip()
    if not title:
        abort(400, description="title is required")
    company = (body.get("company") or "").strip()
    if not company:
        abort(400, description="company is required")
    current = body.get("current", False)
    if not isinstance(current, bool):
        abort(400, description="current must be a boolean")
    entry = {
        "title": title,
        "company": company,
        "type": (body.get("type") or "").strip(),
        "location": (body.get("location") or "").strip(),
        "startDate": (body.get("startDate") or "").strip(),
        "current": current,
        "description": (body.get("description") or "").strip(),
        "skills": body.get("skills") if isinstance(body.get("skills"), list) else [],
    }
    updated = dbl.add_experience(user["id"], entry)
    if not updated:
        abort(404, description="User not found")
    return jsonify(updated)


@app.route("/api/me/skills", methods=["POST"])
def add_skill():
    """POST /api/me/skills - append a skill to the current user."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = _get_body()
    skill = (body.get("skill") or "").strip()
    if not skill:
        abort(400, description="skill is required")
    updated = dbl.add_skill(user["id"], skill)
    if not updated:
        abort(404, description="User not found")
    return jsonify(updated)


@app.route("/api/me/experience/<int:index>", methods=["PUT"])
def update_experience(index):
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True) or {}
    if not (body.get("title") or "").strip() or not (body.get("company") or "").strip():
        abort(400, description="title and company are required")
    entry = {
        "title": (body.get("title") or "").strip(),
        "company": (body.get("company") or "").strip(),
        "type": (body.get("type") or "").strip(),
        "location": (body.get("location") or "").strip(),
        "startDate": (body.get("startDate") or "").strip(),
        "endDate": (body.get("endDate") or "").strip(),
        "description": (body.get("description") or "").strip(),
        "skills": (body.get("skills") or "").strip(),
    }
    if "current" in body:
        entry["current"] = bool(body["current"])
    updated = dbl.update_experience(user["id"], index, entry)
    if updated is None:
        abort(404, description="User not found")
    if updated is False:
        abort(404, description="Index out of range")
    return jsonify(updated)


@app.route("/api/me/education/<int:index>", methods=["PUT"])
def update_education(index):
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True) or {}
    if not (body.get("school") or "").strip():
        abort(400, description="school is required")
    entry = {
        "school": (body.get("school") or "").strip(),
        "degree": (body.get("degree") or "").strip(),
        "field": (body.get("field") or "").strip(),
        "startDate": (body.get("startDate") or "").strip(),
        "endDate": (body.get("endDate") or "").strip(),
    }
    updated = dbl.update_education(user["id"], index, entry)
    if updated is None:
        abort(404, description="User not found")
    if updated is False:
        abort(404, description="Index out of range")
    return jsonify(updated)


@app.route("/api/me/projects/<int:index>", methods=["PUT"])
def update_project(index):
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True) or {}
    if not (body.get("name") or "").strip():
        abort(400, description="name is required")
    entry = {
        "name": (body.get("name") or "").strip(),
        "description": (body.get("description") or "").strip(),
        "url": (body.get("url") or "").strip(),
        "startDate": (body.get("startDate") or "").strip(),
        "endDate": (body.get("endDate") or "").strip(),
        "skills": (body.get("skills") or "").strip(),
    }
    updated = dbl.update_project(user["id"], index, entry)
    if updated is None:
        abort(404, description="User not found")
    if updated is False:
        abort(404, description="Index out of range")
    return jsonify(updated)


@app.route("/api/me/volunteering/<int:index>", methods=["PUT"])
def update_volunteering(index):
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True) or {}
    if not (body.get("role") or "").strip() or not (body.get("organization") or "").strip():
        abort(400, description="role and organization are required")
    entry = {
        "role": (body.get("role") or "").strip(),
        "organization": (body.get("organization") or "").strip(),
        "cause": (body.get("cause") or "").strip(),
        "startDate": (body.get("startDate") or "").strip(),
        "endDate": (body.get("endDate") or "").strip(),
        "description": (body.get("description") or "").strip(),
    }
    updated = dbl.update_volunteering(user["id"], index, entry)
    if updated is None:
        abort(404, description="User not found")
    if updated is False:
        abort(404, description="Index out of range")
    return jsonify(updated)


@app.route("/api/me/honors/<int:index>", methods=["PUT"])
def update_honor(index):
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True) or {}
    if not (body.get("title") or "").strip():
        abort(400, description="title is required")
    entry = {
        "title": (body.get("title") or "").strip(),
        "issuer": (body.get("issuer") or "").strip(),
        "issueDate": (body.get("issueDate") or "").strip(),
        "description": (body.get("description") or "").strip(),
    }
    updated = dbl.update_honor(user["id"], index, entry)
    if updated is None:
        abort(404, description="User not found")
    if updated is False:
        abort(404, description="Index out of range")
    return jsonify(updated)


@app.route("/api/me/experience/<int:index>", methods=["DELETE"])
def delete_experience(index):
    """DELETE /api/me/experience/:index - remove an experience entry by index."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    updated = dbl.delete_experience(user["id"], index)
    if updated is None:
        abort(404, description="User not found")
    if updated is False:
        abort(404, description="Index out of range")
    return jsonify(updated)


@app.route("/api/me/education/<int:index>", methods=["DELETE"])
def delete_education(index):
    """DELETE /api/me/education/:index - remove an education entry by index."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    updated = dbl.delete_education(user["id"], index)
    if updated is None:
        abort(404, description="User not found")
    if updated is False:
        abort(404, description="Index out of range")
    return jsonify(updated)


@app.route("/api/me/projects/<int:index>", methods=["DELETE"])
def delete_project(index):
    """DELETE /api/me/projects/:index - remove a project entry by index."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    updated = dbl.delete_project(user["id"], index)
    if updated is None:
        abort(404, description="User not found")
    if updated is False:
        abort(404, description="Index out of range")
    return jsonify(updated)


@app.route("/api/me/volunteering/<int:index>", methods=["DELETE"])
def delete_volunteering(index):
    """DELETE /api/me/volunteering/:index - remove a volunteering entry by index."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    updated = dbl.delete_volunteering(user["id"], index)
    if updated is None:
        abort(404, description="User not found")
    if updated is False:
        abort(404, description="Index out of range")
    return jsonify(updated)


@app.route("/api/me/honors/<int:index>", methods=["DELETE"])
def delete_honor(index):
    """DELETE /api/me/honors/:index - remove a honor entry by index."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    updated = dbl.delete_honor(user["id"], index)
    if updated is None:
        abort(404, description="User not found")
    if updated is False:
        abort(404, description="Index out of range")
    return jsonify(updated)


@app.route("/api/me/skills/<int:index>", methods=["DELETE"])
def delete_skill(index):
    """DELETE /api/me/skills/:index - remove a skill by index."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    updated = dbl.delete_skill(user["id"], index)
    if updated is None:
        abort(404, description="User not found")
    if updated is False:
        abort(404, description="Index out of range")
    return jsonify(updated)


@app.route("/api/me/projects", methods=["POST"])
def add_project():
    """POST /api/me/projects - append a project entry to the current user."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        abort(400, description="name is required")
    entry = {
        "name": name,
        "description": (body.get("description") or "").strip(),
        "url": (body.get("url") or "").strip(),
        "startDate": (body.get("startDate") or "").strip(),
        "endDate": (body.get("endDate") or "").strip(),
        "skills": (body.get("skills") or "").strip(),
    }
    updated = dbl.add_project(user["id"], entry)
    if not updated:
        abort(404, description="User not found")
    return jsonify(updated)


@app.route("/api/me/volunteering", methods=["POST"])
def add_volunteering():
    """POST /api/me/volunteering - append a volunteering entry to the current user."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True) or {}
    role = (body.get("role") or "").strip()
    organization = (body.get("organization") or "").strip()
    if not role or not organization:
        abort(400, description="role and organization are required")
    entry = {
        "role": role,
        "organization": organization,
        "cause": (body.get("cause") or "").strip(),
        "startDate": (body.get("startDate") or "").strip(),
        "endDate": (body.get("endDate") or "").strip(),
        "description": (body.get("description") or "").strip(),
    }
    updated = dbl.add_volunteering(user["id"], entry)
    if not updated:
        abort(404, description="User not found")
    return jsonify(updated)


@app.route("/api/me/honors", methods=["POST"])
def add_honor():
    """POST /api/me/honors - append a honor/award entry to the current user."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    if not title:
        abort(400, description="title is required")
    entry = {
        "title": title,
        "issuer": (body.get("issuer") or "").strip(),
        "issueDate": (body.get("issueDate") or "").strip(),
        "description": (body.get("description") or "").strip(),
    }
    updated = dbl.add_honor(user["id"], entry)
    if not updated:
        abort(404, description="User not found")
    return jsonify(updated)


@app.route("/api/groups", methods=["POST"])
def create_group():
    """POST /api/groups - create a new group (persisted in memory for the session)."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = _get_body()
    name = (body.get("name") or "").strip()
    if not name:
        abort(400, description="name is required")
    new_id = max((g["id"] for g in static_data.GROUPS), default=0) + 1
    new_group = {
        "id": new_id,
        "name": name,
        "privacy": body.get("privacy", "Public"),
        "members": 1,
        "posts": 0,
        "description": (body.get("description") or "").strip(),
        "coverGradient": "linear-gradient(135deg, #0F5DBD 0%, #0A4A9E 100%)",
        "isJoined": True,
        "category": (body.get("category") or "Technology").strip(),
        "unread": 0,
        "logo": "",
    }
    static_data.GROUPS.append(new_group)
    return jsonify(new_group), 201


@app.route("/api/users")
def get_users():
    """GET /api/users - all users in the network (excludes current user)."""
    current = _auth_user()
    return jsonify(dbl.get_all_users(current["id"] if current else 1))


@app.route("/api/users/<int:user_id>")
def get_user(user_id):
    """GET /api/users/:id - single user by ID."""
    user = dbl.get_user_by_id(user_id)
    if not user:
        abort(404, description=f"User {user_id} not found")
    return jsonify(user)


@app.route("/api/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    """
    DELETE /api/users/:id - remove a user account and all their data.
    Cannot delete user id=1 (the primary demo account).
    Returns 204 on success, 404 if not found, 403 if protected.
    """
    try:
        deleted = dbl.delete_user(user_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 403

    if not deleted:
        abort(404, description=f"User {user_id} not found")
    return "", 204


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Feed Endpoints
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/feed")
def get_feed():
    """GET /api/feed - all posts, newest first, with userLiked flag."""
    current_user = _auth_user()
    posts = dbl.get_all_posts()
    liked_ids = dbl.get_post_likes_for_user(current_user["id"]) if current_user else set()
    for p in posts:
        p["userLiked"] = p["id"] in liked_ids
    return jsonify(posts)


@app.route("/api/feed", methods=["POST"])
def create_post():
    """POST /api/feed - create a new post. Body: {content?: str, imageUrl?: str, videoUrl?: str}"""
    body = _get_body()
    content = (body.get("content") or "").strip()
    image_url = (body.get("imageUrl") or "").strip() or None
    video_url = (body.get("videoUrl") or "").strip() or None
    if not content and not image_url and not video_url:
        abort(400, description="content, imageUrl, or videoUrl is required")

    current_user = _auth_user()
    if not current_user:
        abort(401, description="Authentication required")

    post = dbl.create_post(current_user["id"], content, image_url=image_url, video_url=video_url)
    return jsonify(post), 201


@app.route("/api/feed/<int:post_id>", methods=["DELETE"])
def delete_post(post_id):
    """DELETE /api/feed/:id - delete a post (owner only)."""
    current_user = _require_auth_user()
    result = dbl.delete_post(post_id, current_user["id"])
    if result == "not_found":
        abort(404, description=f"Post {post_id} not found")
    if result == "forbidden":
        abort(403, description="You do not own this post")
    return jsonify({"deleted": True})


@app.route("/api/feed/<int:post_id>/like", methods=["POST"])
def toggle_post_like(post_id):
    """POST /api/feed/:id/like - toggle like on a post."""
    current_user = _require_auth_user()
    result = dbl.toggle_post_like(post_id, current_user["id"])
    return jsonify(result)


@app.route("/api/feed/<int:post_id>/comments", methods=["POST"])
def add_post_comment(post_id):
    """POST /api/feed/:id/comments - add a comment. Body: {text: str}"""
    body = _get_body()
    text = (body.get("text") or "").strip()
    if not text:
        abort(400, description="text is required")
    current_user = _require_auth_user()
    comment = dbl.add_post_comment(post_id, current_user["id"], text)
    if comment is None:
        abort(404, description=f"Post {post_id} not found")
    return jsonify(comment), 201


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Conference Story Endpoints
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/conference-stories")
def get_conference_stories():
    """GET /api/conference-stories - all conference stories, newest first."""
    return jsonify(dbl.get_conference_stories())


@app.route("/api/conference-stories", methods=["POST"])
def create_conference_story():
    """POST /api/conference-stories - share a conference experience.
    Body: { conferenceName, tagline, description, photoUrl?, companyLogoUrl? }
    """
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = request.get_json(silent=True) or {}
    conference_name = (body.get("conferenceName") or "").strip()
    tagline         = (body.get("tagline") or "").strip()
    description     = (body.get("description") or "").strip()
    if not conference_name:
        abort(400, description="conferenceName is required")
    if not tagline:
        abort(400, description="tagline is required")
    if not description:
        abort(400, description="description is required")
    photo_url        = (body.get("photoUrl") or "").strip() or None
    company_logo_url = (body.get("companyLogoUrl") or "").strip() or None
    story = dbl.create_conference_story(
        user["id"], conference_name, tagline, description,
        photo_url, company_logo_url
    )
    if not story:
        abort(404, description="Author not found")
    return jsonify(story), 201


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Job Endpoints
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

def _coordinates_for_location(location: str):
    text = (location or "").lower()
    known = [
        ("new york", 40.7128, -74.0060),
        ("brooklyn", 40.6782, -73.9442),
        ("boston", 42.3601, -71.0589),
        ("san francisco", 37.7749, -122.4194),
        ("los angeles", 34.0522, -118.2437),
        ("chicago", 41.8781, -87.6298),
        ("austin", 30.2672, -97.7431),
        ("denver", 39.7392, -104.9903),
        ("seattle", 47.6062, -122.3321),
        ("washington", 38.9072, -77.0369),
        ("atlanta", 33.7490, -84.3880),
        ("miami", 25.7617, -80.1918),
        ("toronto", 43.6532, -79.3832),
        ("london", 51.5074, -0.1278),
        ("paris", 48.8566, 2.3522),
        ("tokyo", 35.6762, 139.6503),
    ]
    for needle, lat, lng in known:
        if needle in text:
            return lat, lng
    return 39.8283, -98.5795


def _fallback_conferences(location: str, field: str):
    base_location = location or "San Francisco, CA"
    base_field = field or "technology"
    lat, lng = _coordinates_for_location(base_location)
    offsets = [(0.010, 0.008), (-0.008, -0.012), (0.014, -0.006)]
    return [
        {
            "id": 1,
            "name": f"{base_field.title()} Leadership Forum",
            "category": base_field.title(),
            "date": "May 12 to May 13, 2026",
            "venue": "Downtown Conference Center",
            "address": base_location,
            "lat": round(lat + offsets[0][0], 6),
            "lng": round(lng + offsets[0][1], 6),
            "description": f"Professional sessions, networking, and practical workshops for people working in {base_field}.",
            "attendees": 4200,
            "price": "$499",
            "tags": [base_field.title(), "Networking", "Workshops"],
            "source": "fallback",
        },
        {
            "id": 2,
            "name": f"{base_field.title()} Builders Summit",
            "category": base_field.title(),
            "date": "June 4 to June 5, 2026",
            "venue": "Innovation Hall",
            "address": base_location,
            "lat": round(lat + offsets[1][0], 6),
            "lng": round(lng + offsets[1][1], 6),
            "description": f"A focused event for hands-on learning, product demos, and peer conversations in {base_field}.",
            "attendees": 1800,
            "price": "$299",
            "tags": [base_field.title(), "Product", "Career"],
            "source": "fallback",
        },
        {
            "id": 3,
            "name": f"{base_field.title()} Career Exchange",
            "category": base_field.title(),
            "date": "July 8, 2026",
            "venue": "Community Events Center",
            "address": base_location,
            "lat": round(lat + offsets[2][0], 6),
            "lng": round(lng + offsets[2][1], 6),
            "description": f"Recruiters, speakers, and practitioners share current hiring trends and career paths in {base_field}.",
            "attendees": 950,
            "price": "Free",
            "tags": [base_field.title(), "Hiring", "Community"],
            "source": "fallback",
        },
    ]


def _coerce_float(value, fallback):
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


@app.route("/api/jobs")
def get_jobs():
    """GET /api/jobs - live jobs from The Muse (4h cache), fallback to static seed."""
    now = time.time()
    if now - _muse_cache["fetched_at"] > _MUSE_TTL or not _muse_cache["jobs"]:
        try:
            fresh = _fetch_muse_jobs()
            if fresh:
                _muse_cache["jobs"]       = fresh
                _muse_cache["fetched_at"] = now
                _muse_detail_cache.clear()
        except Exception as exc:
            app.logger.warning("The Muse fetch failed: %s", exc)
    return jsonify(_muse_cache["jobs"] if _muse_cache["jobs"] else dbl.get_all_jobs())


@app.route("/api/jobs/<int:job_id>")
def get_job(job_id):
    """GET /api/jobs/:id - single job listing. For Muse jobs, fetches full description."""
    if job_id >= 10000:
        now = time.time()
        if now - _muse_cache["fetched_at"] > _MUSE_TTL or not _muse_cache["jobs"]:
            try:
                fresh = _fetch_muse_jobs()
                if fresh:
                    _muse_cache["jobs"]       = fresh
                    _muse_cache["fetched_at"] = now
                    _muse_detail_cache.clear()
            except Exception:
                pass

        muse_job = next((j for j in _muse_cache["jobs"] if j["id"] == job_id), None)
        if not muse_job:
            abort(404, description=f"Job {job_id} not found")

        muse_id = muse_job.get("museId")
        if muse_id:
            if muse_id in _muse_detail_cache:
                return jsonify(_muse_detail_cache[muse_id])
            try:
                import requests as req_lib
                r = req_lib.get(
                    f"https://www.themuse.com/api/public/jobs/{muse_id}",
                    timeout=8,
                )
                if r.ok:
                    detail   = r.json()
                    full_job = dict(muse_job)
                    full_job["description"] = detail.get("contents", "") or ""
                    _muse_detail_cache[muse_id] = full_job
                    return jsonify(full_job)
            except Exception:
                pass
        return jsonify(muse_job)

    job = dbl.get_job_by_id(job_id)
    if not job:
        abort(404, description=f"Job {job_id} not found")
    return jsonify(job)


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Company Endpoints
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/companies/<int:company_id>")
def get_company(company_id):
    """GET /api/companies/:id - company detail."""
    company = dbl.get_company_by_id(company_id)
    if not company:
        abort(404, description=f"Company {company_id} not found")
    return jsonify(company)


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Conversation Endpoints
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/conversations", methods=["POST"])
def create_conversation():
    """POST /api/conversations - start a new conversation with another user."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    body = _get_body()
    participant_id = body.get("participantId")
    if not participant_id:
        abort(400, description="participantId is required")
    try:
        participant_id = int(participant_id)
    except (ValueError, TypeError):
        abort(400, description="participantId must be a number")
    participant = dbl.get_user_by_id(participant_id)
    if not participant:
        abort(404, description="Participant not found")
    conv = dbl.create_conversation(user["id"], participant)
    return jsonify(conv), 201


@app.route("/api/conversations")
def get_conversations_list():
    """GET /api/conversations - message threads for the current user."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    return jsonify(dbl.get_conversations_for_user(user["id"]))


@app.route("/api/conversations/<int:conv_id>")
def get_conversation(conv_id):
    """GET /api/conversations/:id - single conversation with full messages."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    uid = user["id"]
    conv = dbl.get_conversation_by_id(conv_id)
    if not conv:
        abort(404, description=f"Conversation {conv_id} not found")
    participant_id = int(conv.get("participantId") or conv.get("participant", {}).get("id", 0) or 0)
    if int(conv.get("ownerId", 1)) != uid and participant_id != uid:
        abort(403, description="Access denied")
    return jsonify(conv)


@app.route("/api/conversations/<int:conv_id>/messages", methods=["POST"])
def post_message(conv_id):
    """POST /api/conversations/:id/messages - send a message. Body: {text: str}"""
    # Verify conversation exists
    conv = dbl.get_conversation_by_id(conv_id)
    if not conv:
        abort(404, description=f"Conversation {conv_id} not found")

    body = _get_body()
    text = (body.get("text") or "").strip()
    if not text:
        abort(400, description="text is required")

    current_user = _auth_user()
    if not current_user:
        abort(401, description="Authentication required")
    msg = dbl.send_message(conv_id, sender_id=current_user["id"], text=text)
    msg["isMe"] = True
    return jsonify(msg), 201


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Notification Endpoints
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/notifications")
def get_notifications():
    """GET /api/notifications - all notifications."""
    return jsonify(dbl.get_all_notifications())


@app.route("/api/notifications/<int:notif_id>/read", methods=["PATCH"])
def mark_notification_read(notif_id):
    """PATCH /api/notifications/:id/read - mark a notification as read."""
    notif = dbl.mark_notification_read(notif_id)
    if not notif:
        abort(404, description=f"Notification {notif_id} not found")
    return jsonify(notif)


@app.route("/api/notifications/read-all", methods=["PATCH"])
def mark_all_notifications_read():
    """PATCH /api/notifications/read-all - mark all notifications as read."""
    dbl.mark_all_notifications_read()
    return jsonify({"success": True})


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Static Reference Data (read-only, served from data/*.py)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/events")
def get_events():
    current_user = _auth_user()
    uid = current_user["id"] if current_user else None
    return jsonify(dbl.get_all_events_with_attendance(uid))


@app.route("/api/events", methods=["POST"])
def create_event():
    """POST /api/events - create a new event."""
    body = _get_body()
    if not body.get("name"):
        abort(400, description="name is required")
    current_user = _require_auth_user()
    event = dbl.create_event(current_user["id"], body)
    return jsonify(event), 201


@app.route("/api/events/<event_id>/attend", methods=["POST"])
def toggle_event_attend(event_id):
    """POST /api/events/:id/attend - toggle attendance."""
    current_user = _require_auth_user()
    src = "user" if str(event_id).startswith("u") else "static"
    result = dbl.toggle_event_attend(event_id, src, current_user["id"])
    return jsonify(result)


@app.route("/api/events/<event_id>/interest", methods=["POST"])
def toggle_event_interest(event_id):
    """POST /api/events/:id/interest - toggle interest."""
    current_user = _require_auth_user()
    src = "user" if str(event_id).startswith("u") else "static"
    result = dbl.toggle_event_interest(event_id, src, current_user["id"])
    return jsonify(result)


@app.route("/api/groups")
def get_groups():
    return jsonify(static_data.GROUPS)


@app.route("/api/groups/<int:group_id>")
def get_group(group_id):
    group = static_data.get_group_by_id(group_id)
    if not group:
        abort(404, description=f"Group {group_id} not found")
    return jsonify(group)


@app.route("/api/courses")
def get_courses():
    return jsonify(static_data.COURSES)


@app.route("/api/news")
def get_news():
    return jsonify(static_data.NEWS)


@app.route("/api/invitations")
def get_invitations():
    """Return pending invitations for the current user.
    Falls back to hardcoded seed data only for the demo account (id=1)."""
    user = _auth_user()
    if user and user.get("id") == 1:
        return jsonify(static_data.INVITATIONS)
    return jsonify([])


@app.route("/api/hashtags")
def get_hashtags():
    return jsonify(static_data.HASHTAGS)


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Search Endpoint
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/search")
def search():
    """GET /api/search?q=query - search across users, jobs, companies, posts."""
    q = (request.args.get("q") or "").strip()
    if not q:
        return jsonify({"users": [], "jobs": [], "companies": [], "posts": [], "query": ""})
    current = _auth_user()
    return jsonify(dbl.search(q, exclude_user_id=current["id"] if current else 1))


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Profile Readiness Endpoint
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/profile-readiness")
def get_profile_readiness():
    """GET /api/profile-readiness - compute profile completeness score."""
    u = _auth_user()
    if not u:
        abort(401, description="Authentication required")

    headline_len = len((u.get("headline") or "").strip())
    about_len    = len((u.get("about") or "").strip())
    skill_count  = len(u.get("skills") or [])
    exp_count    = len(u.get("experience") or [])
    edu_count    = len(u.get("education") or [])

    raw_sections = [
        ("photo",    "Photo",      100 if u.get("avatarColor") else 0),
        ("headline", "Headline",   min(100, int(headline_len / 60 * 100))),
        ("about",    "About",      min(100, int(about_len / 200 * 100))),
        ("exp",      "Experience", min(100, exp_count * 25)),
        ("edu",      "Education",  min(100, edu_count * 50)),
        ("skills",   "Skills",     min(100, int(skill_count / 10 * 100))),
    ]
    sections = [{"key": k, "label": l, "score": s} for k, l, s in raw_sections]
    score = round(sum(s for _, _, s in raw_sections) / len(raw_sections))

    def _status(section_score):
        if section_score >= 80:
            return "done"
        if section_score >= 40:
            return "warn"
        return "bad"

    fixes = [{"key": k, "label": l, "status": _status(s)} for k, l, s in raw_sections]
    return jsonify({"score": score, "sections": sections, "fixes": fixes})


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Outreach - Story #1 (Outreach Message Guidance)  (NX.API.3)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/profile-readiness/ai", methods=["POST"])
def ai_profile_readiness():
    """POST /api/profile-readiness/ai - AI quality evaluation; does not replace /api/profile-readiness."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")

    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        abort(503, description="AI service not configured - set GROQ_API_KEY in .env")

    headline = (user.get("headline") or "").strip()
    about    = (user.get("about") or "").strip()
    exp_list      = user.get("experience")    or []
    edu_list      = user.get("education")     or []
    skills_list   = user.get("skills")        or []
    projects_list = user.get("projects")      or []

    exp_lines = []
    for e in exp_list[:5]:
        desc = (e.get("description") or "").strip()
        exp_lines.append(
            f"- {e.get('title','?')} at {e.get('company','?')} "
            f"({e.get('startDate','')}-{e.get('endDate','Present')})"
            + (f"\n  Desc: {desc[:200]}" if desc else " (no description)")
        )

    edu_lines = []
    for e in edu_list[:3]:
        field = e.get("field") or e.get("fieldOfStudy") or "?"
        start = e.get("startDate") or e.get("startYear") or ""
        end   = e.get("endDate")   or e.get("endYear")   or ""
        edu_lines.append(f"- {e.get('degree','?')} in {field} at {e.get('school','?')} ({start}-{end})")

    skill_names = [(s["name"] if isinstance(s, dict) else s) for s in skills_list[:20]]

    proj_lines = []
    for p in projects_list[:4]:
        desc = (p.get("description") or "").strip()
        proj_lines.append(f"- {p.get('name','?')}" + (f": {desc[:150]}" if desc else " (no description)"))

    profile_text = (
        f"Name: {user.get('name','Unknown')}\n"
        f"Headline: {headline or '(empty)'}\n"
        f"About ({len(about)} chars): {about[:400] or '(empty)'}\n"
        f"Experience ({len(exp_list)} entries):\n" + ("\n".join(exp_lines) or "  (none)") + "\n"
        f"Education ({len(edu_list)} entries):\n"  + ("\n".join(edu_lines) or "  (none)") + "\n"
        f"Skills ({len(skill_names)}): {', '.join(skill_names) or '(none)'}\n"
        f"Projects ({len(projects_list)} entries):\n" + ("\n".join(proj_lines) or "  (none)")
    )

    system_prompt = (
        'You are a LinkedIn profile coach. Evaluate quality (not just presence). '
        'Return ONLY valid JSON - no markdown fences - with EXACTLY this shape:\n'
        '{"score":<int 0-100>,"level":<"Beginner"|"Developing"|"Strong"|"All-Star">,'
        '"summary":"<2 honest sentences>","sections":['
        '{"key":"headline","label":"Headline","score":<int>,"feedback":"<feedback>"},'
        '{"key":"about","label":"About","score":<int>,"feedback":"<feedback>"},'
        '{"key":"experience","label":"Experience","score":<int>,"feedback":"<feedback>"},'
        '{"key":"education","label":"Education","score":<int>,"feedback":"<feedback>"},'
        '{"key":"skills","label":"Skills","score":<int>,"feedback":"<feedback>"},'
        '{"key":"projects","label":"Projects","score":<int>,"feedback":"<feedback>"}],'
        '"suggestions":["<verb-first action>","<verb-first action>","<verb-first action>"]}\n\n'
        'Feedback rules (STRICT):\n'
        '- Every section with score < 100 MUST end with a specific "To reach 100%: ..." sentence.\n'
        '- Sections scoring 100 may simply say what is excellent about them.\n'
        '- Be concrete - name exactly what is missing or what to add/change.\n\n'
        'Scoring rules (strict):\n'
        '- Empty/missing field â†’ 0\n'
        '- Very short/vague (headline="hi", about="student") â†’ 5-20\n'
        '- Mediocre/generic â†’ 40-60\n'
        '- Good, specific, professional â†’ 70-85\n'
        '- Excellent, achievement-focused â†’ 86-100\n'
        'Overall score = weighted avg: headline 20%, about 20%, experience 30%, '
        'education 15%, skills 10%, projects 5%.'
    )

    try:
        import requests as req_lib
        resp = req_lib.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": profile_text},
                ],
                "max_tokens": 1024,
                "temperature": 0.2,
            },
            timeout=30,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        import json as _json
        result = _json.loads(raw)
        if not isinstance(result.get("score"), (int, float)):
            raise ValueError("Missing score in AI response")
        result["score"] = max(0, min(100, int(result["score"])))
        for sec in result.get("sections", []):
            sec["score"] = max(0, min(100, int(sec.get("score", 0))))
    except Exception as exc:
        app.logger.exception("AI profile readiness failed: %s", exc)
        abort(502, description="AI evaluation failed - try again")

    return jsonify(result), 200


@app.route("/api/outreach/generate", methods=["POST"])
def outreach_generate():
    """POST /api/outreach/generate - personalised outreach draft."""
    body = _get_body()

    raw_id = body.get("recipientId")
    if raw_id is None:
        abort(400, description="recipientId is required")
    if isinstance(raw_id, (float, bool)):
        abort(400, description="recipientId must be a positive integer")
    try:
        recipient_id = int(raw_id)
        if recipient_id <= 0:
            raise ValueError
    except (TypeError, ValueError):
        abort(400, description="recipientId must be a positive integer")

    recipient = dbl.get_user_by_id(recipient_id)
    if not recipient:
        abort(404, description=f"User {recipient_id} not found")

    tone = outreach_mod.sanitize_text(str(body.get("tone") or ""), 20).lower()
    if tone not in outreach_mod.VALID_TONES:
        tone = "professional"

    goal = outreach_mod.sanitize_text(str(body.get("goal") or ""), 20).lower()
    if goal not in outreach_mod.VALID_GOALS:
        goal = "networking"

    custom_note = outreach_mod.sanitize_text(
        body.get("custom_note") or "", outreach_mod.MAX_CUSTOM_NOTE
    )

    raw_details = body.get("details") or {}
    details = {k: outreach_mod.sanitize_text(str(v), 100) for k, v in raw_details.items() if isinstance(v, str) and k in {"recipient", "yourRole", "field", "company", "role", "context"}}
    context = {"tone": tone, "goal": goal, "custom_note": custom_note, "details": details}

    current_user = _auth_user()
    if not current_user:
        abort(401, description="Authentication required")
    result = outreach_mod.generate_outreach_message(
        current_user,
        recipient,
        context,
    )
    return jsonify(result), 200


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Outreach - Story #7 (Outreach Readiness Check)  (NX.API.4)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/outreach/readiness")
def outreach_readiness():
    """GET /api/outreach/readiness?userId=<int> - profile readiness score."""
    raw_id = (request.args.get("userId") or "").strip()

    if raw_id:
        try:
            user_id = int(raw_id)
            if user_id <= 0:
                raise ValueError
        except (TypeError, ValueError):
            abort(400, description="userId must be a positive integer")

        user = dbl.get_user_by_id(user_id)
        if not user:
            abort(404, description=f"User {user_id} not found")
    else:
        user = _auth_user()
        if not user:
            abort(401, description="Authentication required")

    return jsonify(outreach_mod.compute_outreach_readiness(user)), 200


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# AI Profile Improvement
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/profile/improve", methods=["POST"])
def profile_improve():
    """POST /api/profile/improve - ask an LLM for actionable profile tips."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")

    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        abort(503, description="AI service is not configured")

    # Build a concise profile summary for the prompt
    exp_lines = []
    for e in (user.get("experience") or [])[:4]:
        exp_lines.append(f"- {e.get('title','?')} at {e.get('company','?')} ({e.get('startDate','')}-{e.get('endDate','Present')})")

    edu_lines = []
    for e in (user.get("education") or [])[:3]:
        edu_lines.append(f"- {e.get('degree','?')} at {e.get('school','?')}")

    skills_sample = ", ".join(
        (s["name"] if isinstance(s, dict) else s)
        for s in (user.get("skills") or [])[:12]
    )

    cert_lines = [c.get("name", "") for c in (user.get("certifications") or [])[:4]]

    about_len = len(user.get("about") or "")
    headline = user.get("headline") or ""

    profile_text = f"""Name: {user.get('name', 'Unknown')}
Headline: {headline if headline else '(none)'}
Location: {user.get('location') or '(not set)'}
About section: {about_len} characters{'' if about_len == 0 else ' - present'}
Experience ({len(user.get('experience') or [])} entries):
{chr(10).join(exp_lines) or '  (none)'}
Education ({len(user.get('education') or [])} entries):
{chr(10).join(edu_lines) or '  (none)'}
Skills: {skills_sample or '(none)'}
Certifications: {', '.join(cert_lines) or '(none)'}
Open to Work: {user.get('openToWork', False)}"""

    system_prompt = (
        "You are a LinkedIn profile coach. Analyze the profile below and return "
        "EXACTLY 5 concise, actionable improvement tips as a JSON array of strings. "
        "Each tip should be one sentence and start with an action verb. "
        "Focus on gaps, weak sections, and LinkedIn best practices. "
        "Respond ONLY with valid JSON - no markdown, no explanation outside the array."
    )

    model = os.environ.get("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")

    try:
        import requests as req_lib
        resp = req_lib.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://linkedin-redesign-z364.onrender.com",
                "X-Title": "Nexus LinkedIn Redesign",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": profile_text},
                ],
                "max_tokens": 512,
                "temperature": 0,
            },
            timeout=20,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        # Strip markdown code fences if the model wrapped the JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        import json as _json
        tips = _json.loads(raw)
        if not isinstance(tips, list):
            raise ValueError("Expected a JSON array")
        tips = [str(t) for t in tips[:5]]
    except Exception as exc:
        app.logger.exception("AI service request failed: %s", exc)
        abort(502, description="AI service error")

    return jsonify({"tips": tips}), 200


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Social State Endpoints
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/me/social")
def get_social_state():
    """GET /api/me/social - all social state for the current user."""
    user = _require_auth_user()
    return jsonify(dbl.get_social_state(user["id"]))


@app.route("/api/me/saved-jobs/<int:job_id>", methods=["POST"])
def toggle_saved_job(job_id):
    """POST /api/me/saved-jobs/:id - toggle saved job."""
    user = _require_auth_user()
    return jsonify(dbl.toggle_saved_job(user["id"], job_id))


@app.route("/api/me/saved-jobs/<int:job_id>", methods=["PUT"])
def save_job(job_id):
    """PUT /api/me/saved-jobs/:id - explicitly save a job (idempotent)."""
    user = _require_auth_user()
    return jsonify(dbl.save_job(user["id"], job_id))


@app.route("/api/me/saved-jobs/<int:job_id>", methods=["DELETE"])
def unsave_job(job_id):
    """DELETE /api/me/saved-jobs/:id - explicitly unsave a job (idempotent)."""
    user = _require_auth_user()
    return jsonify(dbl.unsave_job(user["id"], job_id))


@app.route("/api/me/connection-requests")
def get_connection_requests():
    """GET /api/me/connection-requests - users who have sent the current user a pending request."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    return jsonify(dbl.get_incoming_connection_requests(user["id"]))


@app.route("/api/me/connection-requests/<int:requester_id>", methods=["DELETE"])
def decline_connection_request(requester_id):
    """DELETE /api/me/connection-requests/:id - decline a pending connection request."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")
    return jsonify(dbl.decline_connection_request(requester_id, user["id"]))


@app.route("/api/me/connections/<int:target_id>", methods=["POST"])
def connect_user(target_id):
    """POST /api/me/connections/:id - send a connection request."""
    user = _require_auth_user()
    return jsonify(dbl.connect_user(user["id"], target_id))


@app.route("/api/me/connections/<int:target_id>/accept", methods=["POST"])
def accept_connection(target_id):
    """POST /api/me/connections/:id/accept - confirm a connection."""
    user = _require_auth_user()
    return jsonify(dbl.accept_connection(target_id, user["id"]))


@app.route("/api/me/following/<int:target_id>", methods=["POST"])
def toggle_following(target_id):
    """POST /api/me/following/:id - toggle follow."""
    user = _require_auth_user()
    return jsonify(dbl.toggle_following(user["id"], target_id))


@app.route("/api/me/applied-jobs/<int:job_id>", methods=["POST"])
def apply_to_job(job_id):
    """POST /api/me/applied-jobs/:id - mark a job as applied."""
    user = _require_auth_user()
    return jsonify(dbl.apply_to_job(user["id"], job_id))


@app.route("/api/me/groups/<int:group_id>/toggle", methods=["POST"])
def toggle_group(group_id):
    """POST /api/me/groups/:id/toggle - join or leave a group."""
    user = _require_auth_user()
    return jsonify(dbl.toggle_group(user["id"], group_id))


@app.route("/api/me/invitations/dismiss", methods=["POST"])
def dismiss_invitation():
    """POST /api/me/invitations/dismiss - dismiss an invitation. Body: {key: str}"""
    body = _get_body()
    key = str(body.get("key") or "").strip()
    if not key:
        abort(400, description="key is required")
    user = _require_auth_user()
    return jsonify(dbl.dismiss_invitation(user["id"], key))


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Cover Letter Generation  (Groq)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.route("/api/cover-letter/generate", methods=["POST"])
def generate_cover_letter():
    """POST /api/cover-letter/generate - tailor a cover letter via Groq LLM."""
    user = _auth_user()
    if not user:
        abort(401, description="Authentication required")

    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        abort(503, description="AI service not configured - set GROQ_API_KEY in .env")

    body = request.get_json(silent=True) or {}
    prompt = (body.get("prompt") or "").strip()
    if not prompt:
        abort(400, description="prompt is required")
    MAX_PROMPT_LENGTH = 20000
    if len(prompt) > MAX_PROMPT_LENGTH:
        abort(400, description=f"prompt exceeds maximum length of {MAX_PROMPT_LENGTH} characters")

    try:
        import requests as req_lib
        resp = req_lib.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1024,
                "temperature": 0.7,
            },
            timeout=30,
        )
        resp.raise_for_status()
        letter = resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        app.logger.exception("Groq API request failed: %s", exc)
        abort(502, description="AI service error - check your GROQ_API_KEY")

    return jsonify({"letter": letter}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Nexus Backend on http://localhost:{port}")
    app.run(host="0.0.0.0", debug=False, port=port, threaded=True)
