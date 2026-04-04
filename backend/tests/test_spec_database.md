# Test Specification — `backend/database.py`

**CS485 · Nexus LinkedIn Redesign · Sprint P5**
**File under test:** `backend/database.py`
**Test framework:** pytest + pytest-cov
**Coverage target:** ≥ 80%

---

## Functions Under Test

| Function | Signature | Description |
|---|---|---|
| `_hash_pw` | `(pw: str) -> str` | SHA-256 hex digest of a password |
| `_ts` | `() -> int` | Current time in milliseconds |
| `verify_credentials` | `(email, password) -> dict\|None` | Auth check against stored pw_hash |
| `create_session` | `(user_id) -> str` | Generate + store Bearer token |
| `get_session_user_id` | `(token) -> int\|None` | Token → user_id (cache then DB) |
| `get_current_user` | `(user_id=1) -> dict\|None` | Thin wrapper around get_user_by_id |
| `update_current_user` | `(updates, user_id=1) -> dict\|None` | Merge allowed fields onto user |
| `get_all_users` | `(exclude_id=1) -> list` | All users except one |
| `get_user_by_id` | `(user_id) -> dict\|None` | Single user lookup |
| `create_user` | `(name, email, password) -> dict` | Register new account |
| `delete_user` | `(user_id) -> bool` | Remove account |
| `get_all_posts` | `() -> list` | All posts newest-first |
| `create_post` | `(author_id, content) -> dict` | Insert new post |
| `get_all_jobs` | `() -> list` | All jobs |
| `get_job_by_id` | `(job_id) -> dict\|None` | Single job |
| `get_company_by_id` | `(company_id) -> dict\|None` | Single company |
| `get_all_conversations` | `() -> list` | Conversation summaries |
| `get_conversation_by_id` | `(conv_id) -> dict\|None` | Full conversation + messages |
| `send_message` | `(conv_id, sender_id, text) -> dict\|None` | Append message |
| `get_all_notifications` | `() -> list` | All notifications |
| `mark_notification_read` | `(notif_id) -> dict\|None` | Mark one notification read |
| `mark_all_notifications_read` | `() -> None` | Mark all notifications read |
| `search` | `(q, exclude_user_id=1) -> dict` | Cross-entity full-text search |

---

## Test Table

| ID | Type | Function | Purpose | Inputs | Expected Output |
|---|---|---|---|---|---|
| T01 | WB | `_hash_pw` | Same input always yields same hash (line 197: deterministic SHA-256) | `"password123"` called twice | Both return same 64-char hex string |
| T02 | WB | `_hash_pw` | Different inputs produce different hashes (line 197) | `"abc"` vs `"ABC"` | Hashes are not equal |
| T03 | EC | `_hash_pw` | Empty string is hashable (structural extreme: empty input) | `""` | Returns a 64-char hex string without error |
| T04 | BB | `_ts` | Returns a positive integer representing current epoch-ms | no args | `result > 0` and `isinstance(result, int)` |
| T05 | GB | `_ts` | Value is within 2 seconds of `time.time()*1000` (threshold: ±2000 ms) | no args | `abs(result - time.time()*1000) < 2000` |
| T06 | BB | `verify_credentials` | Correct email+password returns user dict | valid email + `"password123"` | dict with `"id"` key |
| T07 | WB | `verify_credentials` | Unknown email returns None (line 221: `if not row`) | `"no@one.com"`, any password | `None` |
| T08 | WB | `verify_credentials` | Wrong password returns None (line 223-224: hash mismatch) | valid email + `"wrong"` | `None` |
| T09 | EP | `verify_credentials` | Email lookup is case-insensitive (bucket: mixed-case email) | `"USER@EXAMPLE.COM"` same as `"user@example.com"` | Returns user dict |
| T10 | EC | `verify_credentials` | Empty email returns None (structural extreme) | `""`, `"password123"` | `None` |
| T11 | BB | `create_session` | Returns a non-empty hex token string | `user_id=1` | `len(token) == 64` |
| T12 | WB | `create_session` | Token stored in `_sessions` dict (line 231) | `user_id=2` | `database._sessions[token] == 2` |
| T13 | WB | `create_session` | Token persisted to `sessions` table (lines 233-235) | `user_id=1` | Row found in DB via raw SQL |
| T14 | BB | `create_session` | Two calls produce different tokens | `user_id=1` twice | `token1 != token2` |
| T15 | WB | `get_session_user_id` | Empty string returns None immediately (line 244-245) | `""` | `None` |
| T16 | EC | `get_session_user_id` | None token returns None (structural extreme) | `None` | `None` |
| T17 | WB | `get_session_user_id` | Token in `_sessions` cache returns user_id without DB (line 247-248) | token in cache | correct `user_id` |
| T18 | WB | `get_session_user_id` | Token not in cache falls back to DB (lines 250-257) | valid token, cleared cache | correct `user_id` |
| T19 | WB | `get_session_user_id` | Unknown token returns None (line 258) | `"deadbeef"*8` | `None` |
| T20 | RG | `get_session_user_id` | After server restart simulation (cache cleared), DB fallback still works | create token, clear `_sessions`, look up | correct `user_id` |
| T21 | BB | `get_current_user` | Valid id returns user dict | `user_id=1` (seeded) | dict with `"id": 1` |
| T22 | BB | `get_current_user` | Non-existent id returns None | `user_id=9999` | `None` |
| T23 | BB | `update_current_user` | Updates allowed field `headline` | `{"headline": "Engineer"}`, `user_id=1` | returned dict has `"headline": "Engineer"` |
| T24 | WB | `update_current_user` | Non-existent user returns None (line 271-272) | `{}`, `user_id=9999` | `None` |
| T25 | EP | `update_current_user` | Unknown keys are silently ignored (bucket: invalid field) | `{"foo": "bar"}`, `user_id=1` | dict returned, `"foo"` key absent |
| T26 | EC | `update_current_user` | Empty updates dict returns user unchanged | `{}`, `user_id=1` | dict with original values |
| T27 | BB | `get_all_users` | Returns list excluding the specified user | 2 users seeded, exclude `id=1` | list of length 1, no user with `id=1` |
| T28 | EP | `get_all_users` | Exclude non-existent id returns all users (bucket: exclude id not in DB) | exclude `id=9999` | all seeded users returned |
| T29 | EC | `get_all_users` | Only one user in DB, exclude it → empty list | 1 user seeded, exclude its id | `[]` |
| T30 | BB | `get_user_by_id` | Valid id returns dict with expected fields | seeded user id | dict with `"id"`, `"name"` |
| T31 | BB | `get_user_by_id` | Non-existent id returns None | `9999` | `None` |
| T32 | WB | `get_user_by_id` | `int()` cast applied — string id works (line 297) | `"1"` as string | dict returned |
| T33 | BB | `create_user` | Returns new user dict with all expected fields | `"Alice"`, `"alice@test.com"`, `"pass1234"` | dict with `id`, `name`, `email`, `headline`, `connections`, `skills` |
| T34 | WB | `create_user` | Duplicate email raises ValueError (line 312) | email already in DB | `ValueError("email_taken")` |
| T35 | EP | `create_user` | Email normalized to lowercase (bucket: mixed-case email) | `"ALICE@TEST.COM"` | returned dict has lowercase email |
| T36 | WB | `create_user` | New user dict has `connections=0`, `isPremium=False` (lines 329-332) | any valid inputs | `connections == 0`, `isPremium == False` |
| T37 | BB | `delete_user` | Returns True on successful deletion | seeded user id ≠ 1 | `True` |
| T38 | BB | `delete_user` | Returns False if user not found | `user_id=9999` | `False` |
| T39 | WB | `delete_user` | Raises ValueError for id=1 (line 349-350) | `user_id=1` | `ValueError("cannot_delete_primary_user")` |
| T40 | GB | `delete_user` | Threshold: exactly id=1 raises, id=2 does not raise | id=1 vs id=2 | id=1 → exception; id=2 → True |
| T41 | WB | `delete_user` | User is removed from DB after delete (line 357) | seeded user id | `get_user_by_id` returns None afterward |
| T42 | BB | `get_all_posts` | Returns list with expected fields per post | posts seeded | each post has `id`, `authorId`, `content`, `likeCount` |
| T43 | RG | `get_all_posts` | Posts ordered newest-first (regression: sort order must be DESC) | 2 posts with different timestamps | first post has higher `createdAt` |
| T44 | WB | `get_all_posts` | `likeCount` computed from `totalReactions` when present (line 376) | post blob with `totalReactions=5` | `likeCount == 5` |
| T45 | EC | `get_all_posts` | Empty posts table returns empty list | no posts | `[]` |
| T46 | BB | `create_post` | Returns post dict with `id`, `authorId`, `content`, `likeCount=0` | seeded user + content | all fields present |
| T47 | WB | `create_post` | Author blob embedded in post (lines 397-402) | seeded user | post has `author.name` == user name |
| T48 | EC | `create_post` | Very long content (1000 chars) stored without error | `"x"*1000` | post returned with full content |
| T49 | BB | `get_all_jobs` | Returns list of jobs | 2 jobs seeded | list of length 2 |
| T50 | EC | `get_all_jobs` | Empty jobs table returns empty list | no jobs | `[]` |
| T51 | BB | `get_job_by_id` | Valid id returns job dict | seeded job id | dict returned |
| T52 | BB | `get_job_by_id` | Non-existent id returns None | `9999` | `None` |
| T53 | BB | `get_company_by_id` | Valid id returns company dict | seeded company id | dict returned |
| T54 | BB | `get_company_by_id` | Non-existent id returns None | `9999` | `None` |
| T55 | BB | `get_all_conversations` | Returns list with `id` and `participantName` fields | conv seeded | each item has `id` and `participantName` |
| T56 | WB | `get_all_conversations` | `participantName` flattened from `participant.name` (lines 482-484) | conv with `participant: {name: "Bob"}` | `participantName == "Bob"` |
| T57 | EC | `get_all_conversations` | Empty conversations table returns empty list | no convs | `[]` |
| T58 | BB | `get_conversation_by_id` | Returns conversation with `messages` list | conv + messages seeded | `"messages"` key present, is list |
| T59 | BB | `get_conversation_by_id` | Non-existent conv_id returns None | `9999` | `None` |
| T60 | WB | `get_conversation_by_id` | `isRead` is Python bool not int (line 512: `bool(m["is_read"])`) | message with `is_read=1` | `isRead is True` (not just truthy) |
| T61 | WB | `get_conversation_by_id` | Messages ordered by timestamp ASC (line 502) | 2 messages with different timestamps | first message has lower timestamp |
| T62 | BB | `send_message` | Returns message dict with `id`, `senderId`, `text`, `isRead=False` | valid conv_id + text | all fields present, `isRead == False` |
| T63 | WB | `send_message` | Non-existent conv_id returns None (lines 527-529) | conv_id=9999 | `None` |
| T64 | WB | `send_message` | Conversation `lastMessage` updated in DB (lines 539-543) | send text to conv | conv data in DB has `lastMessage == text` |
| T65 | EC | `send_message` | Very long text (500 chars) stored without error | `"x"*500` | message returned with full text |
| T66 | BB | `get_all_notifications` | Returns list with `isRead` field on each item | 2 notifs seeded | each has `isRead` key |
| T67 | WB | `get_all_notifications` | `isRead` is Python bool (line 568: `bool(r["is_read"])`) | notif with `is_read=0` | `isRead is False` |
| T68 | EC | `get_all_notifications` | Empty notifications table returns empty list | no notifs | `[]` |
| T69 | BB | `mark_notification_read` | Returns notification dict with `isRead=True` | seeded notif id | `isRead == True` |
| T70 | BB | `mark_notification_read` | Non-existent notif_id returns None | `9999` | `None` |
| T71 | WB | `mark_notification_read` | `is_read` set to 1 in DB after call (lines 580-581) | seeded notif | raw DB query shows `is_read=1` |
| T72 | RG | `mark_notification_read` | Returns `True` as bool not integer 1 (regression: type correctness) | seeded notif | `result["isRead"] is True` |
| T73 | BB | `mark_all_notifications_read` | All notifications have `isRead=True` after call | 3 notifs seeded | all return `isRead=True` via `get_all_notifications` |
| T74 | EC | `mark_all_notifications_read` | Empty notifications table — no error | no notifs | completes without exception |
| T75 | WB | `search` | Empty query short-circuits (line 603: `if not q_lower`) | `""` | `{"users": [], "jobs": [], "companies": [], "posts": []}` |
| T76 | WB | `search` | Whitespace-only query treated as empty (line 601: `.strip()`) | `"   "` | empty result sets |
| T77 | BB | `search` | Query matches user by name | user named "Alice" seeded, query `"alice"` | `users` list contains Alice |
| T78 | EP | `search` | Query matches user by headline (bucket: headline field) | user with headline "Engineer", query `"engineer"` | `users` list non-empty |
| T79 | BB | `search` | Query matches job by title | job with title "SWE", query `"swe"` | `jobs` list non-empty |
| T80 | BB | `search` | Query matches company by name | company named "Acme", query `"acme"` | `companies` list non-empty |
| T81 | BB | `search` | Query matches post by content | post with "hello world", query `"hello"` | `posts` list non-empty |
| T82 | GB | `search` | Case-insensitive match at exact case boundary | user named "Alice", query `"Alice"` vs `"alice"` | both return same result |
| T83 | EP | `search` | No match returns empty lists (bucket: no results) | query `"zzzzzz"` | all lists empty, `query` key equals input |
