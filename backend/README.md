# Nexus Backend

Flask + SQLite REST API powering the Nexus professional-network SPA.
Implements **User Story #1** (Outreach Message Guidance) and **User Story #2** (Outreach Readiness Check).

---

## Dependencies

| Library | Version | Purpose |
|---|---|---|
| `flask` | ≥ 3.0 | HTTP server, routing, JSON responses |
| `flask-cors` | ≥ 4.0 | Cross-Origin Resource Sharing (frontend on file:// or different port) |
| Python stdlib | 3.10+ | `sqlite3`, `hashlib`, `secrets`, `json`, `re`, `time`, `os` |

No other external libraries are required. No paid external services are called in P4 — the outreach module uses a template-based mock (see `outreach.py`). In P5 the mock can be swapped for an AWS Bedrock call by replacing the body of `_call_ai()` in `outreach.py`.

---

## Database

The backend uses a single **SQLite** database file at `backend/nexus.db`.

### Tables

| Table | Description |
|---|---|
| `users` | All user accounts — seeded from `data/users.py` on startup; new accounts appended via `/api/auth/register` |
| `posts` | Feed posts — seeded once from `data/posts.py`; new posts appended via `POST /api/feed` |
| `jobs` | Job listings — re-seeded on every startup from `data/jobs.py` |
| `companies` | Company records — re-seeded on every startup from `data/companies.py` |
| `conversations` | Message thread metadata — seeded once from `data/conversations.py` |
| `messages` | Individual chat messages — seeded once; new messages appended via `POST /api/conversations/:id/messages` |
| `notifications` | Activity notifications — seeded once from `data/notifications.py`; read-state mutated via PATCH |
| `sessions` | Auth session tokens — written on login/register; read to identify current user |

**WAL mode** is enabled (`PRAGMA journal_mode=WAL`) so multiple concurrent readers never block each other — supports the required 10 simultaneous frontend users.

---

## Install

```bash
# From the repo root
pip3 install -r backend/requirements.txt
```

> On macOS with Homebrew Python you may need: `pip3 install --break-system-packages -r backend/requirements.txt`

Python 3.10 or later is required. Dependencies: `flask>=3.0`, `flask-cors>=4.0`.

---

## Start

```bash
# From the repo root
python3 backend/app.py
```

The server starts on **http://localhost:5000** with threading enabled (handles 10+ simultaneous requests).

Output:
```
Starting Nexus Backend on http://localhost:5000
App:  http://localhost:5000/
API:  http://localhost:5000/api/
```

Visit **http://localhost:5000** in a browser to reach the login/signup page, or **http://localhost:5000/app.html** directly if you already have a session token stored.

---

## Login

Use the demo account to log in immediately:

| Field | Value |
|---|---|
| Email | `alex.johnson@gmail.com` |
| Password | `password123` |

Or register a new account via the "Join now" link on the landing page.

---

## Stop

Press `Ctrl-C` in the terminal running `app.py`.

---

## Reset (wipe all data and re-seed)

```bash
rm backend/nexus.db
python3 backend/app.py   # re-creates and re-seeds the database on startup
```

This resets all posts, messages, notifications, sessions, and user accounts (including any registered test users) back to the seed data.

---

## API Overview

All routes are prefixed with `/api`.

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account — body: `{name, email, password}` → `{user, token}` |
| `POST` | `/api/auth/login` | Sign in — body: `{email, password}` → `{user, token}` |

Authenticated requests must include `Authorization: Bearer <token>` header. Unauthenticated requests fall back to the demo user (id=1).

### Users / Profile
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/me` | Current user profile |
| `PUT/PATCH` | `/api/me` | Update profile fields (`name`, `headline`, `location`, `about`, `pronouns`, `industry`) |
| `GET` | `/api/users` | All users except current user |
| `GET` | `/api/users/:id` | Single user by id |
| `DELETE` | `/api/users/:id` | Delete user (cannot delete id=1) |

### Feed
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/feed` | All posts, newest first |
| `POST` | `/api/feed` | Create post — body: `{content}` |

### Jobs & Companies
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/jobs` | All job listings |
| `GET` | `/api/jobs/:id` | Single job |
| `GET` | `/api/companies/:id` | Company detail |

### Messaging
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/conversations` | All conversation summaries |
| `GET` | `/api/conversations/:id` | Full conversation with messages |
| `POST` | `/api/conversations/:id/messages` | Send message — body: `{text}` |

### Notifications
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/notifications` | All notifications |
| `PATCH` | `/api/notifications/:id/read` | Mark one as read |
| `PATCH` | `/api/notifications/read-all` | Mark all as read |

### User Story #1 — Outreach Message Guidance
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/outreach/generate` | Generate personalised outreach draft. Body: `{recipientId, tone?, goal?, custom_note?, details?}` → `{draft, char_count, tone, tips, alternatives}` |

`tone` ∈ `{professional, friendly, formal}` (default: `professional`)
`goal` ∈ `{job_inquiry, networking, advice, collaboration}` (default: `networking`)
`details` object keys: `recipient`, `yourRole`, `field`, `company`, `role`, `context`

### User Story #2 — Outreach Readiness Check
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/outreach/readiness` | Profile readiness for current user |
| `GET` | `/api/outreach/readiness?userId=<id>` | Profile readiness for any user |

Returns `{score, max_score, level, can_message, breakdown, top_tips}`.
`level` ∈ `{ready, almost_ready, not_ready}`
`can_message` is `true` when `score >= 60`.

### Misc (read-only reference data)
`GET /api/events`, `/api/groups`, `/api/groups/:id`, `/api/courses`, `/api/news`, `/api/invitations`, `/api/hashtags`, `/api/search?q=`

---

## Running Tests

### Unit tests — `database.py` (pytest)

No running backend required. Tests use a temporary in-memory SQLite DB per test.

```bash
# From the repo root
pip3 install -r backend/requirements.txt

# Run all unit tests
cd backend
pytest tests/test_database.py -v

# Run with coverage report (target: ≥ 80%)
pytest tests/test_database.py --cov=database --cov-report=term-missing
```

**86 tests** covering all 23 functions in `database.py` with 6 test types:
BB (Black Box), WB (White Box), GB (Gray Box), EP (Equivalence Partitioning), RG (Regression), EC (Edge Case).

Coverage: **83%** as of last run.

The test spec is documented in [`tests/test_spec_database.md`](tests/test_spec_database.md).

A GitHub Actions workflow (`.github/workflows/run-backend-tests.yml`) runs these tests automatically on every push and pull request.

---

### Integration tests (backend must be running)

```bash
# Terminal 1 — start backend
python3 backend/app.py

# Terminal 2 — run unit + user story tests (89 tests)
python3 backend/test_api.py

# Terminal 2 — run frontend contract tests (verifies API shapes match UI expectations)
python3 backend/test_frontend_contract.py
```

Tests use only Python stdlib (`urllib`, `json`) — no pytest or requests needed.

### Test coverage (`backend/test_api.py`)
- All GET/POST/PATCH endpoints
- User Story #1 — T1.1–T1.6 (outreach generate)
- User Story #2 — T7.1–T7.7 (outreach readiness)
- Auth — register, login, token-authenticated requests
- Account CRUD — create, find, delete
- Input validation and security edge cases (XSS, SQL injection strings, control characters)
- Persistence — data survives across multiple requests

### Frontend contract tests (`backend/test_frontend_contract.py`)
- Verifies every `window.API.*` call in `js/api.js` receives the exact response shape the React components expect
- Covers: getMe, getFeed, createPost, getJobs, getConversations, sendMessage, getNotifications, search, getOutreachReadiness, generateOutreachMessage, register, deleteUser, and all static endpoints
