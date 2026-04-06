# Test Specification — `backend/app.py`

## File Under Test
`backend/app.py` — Flask HTTP API layer for the Nexus LinkedIn-clone backend.

## Functions / Routes Under Test

| # | Name | Method & Path | Description |
|---|------|--------------|-------------|
| 1 | `_auth_user` | (helper) | Extracts Bearer token, returns user or fallback id=1 |
| 2 | `index` | GET / | Serves SPA HTML |
| 3 | `not_found` | error handler 404 | Returns JSON error for 404 |
| 4 | `bad_request` | error handler 400 | Returns JSON error for 400 |
| 5 | `unauthorized` | error handler 401 | Returns JSON error for 401 |
| 6 | `conflict` | error handler 409 | Returns JSON error for 409 |
| 7 | `login` | POST /api/auth/login | Authenticate user, return token |
| 8 | `register` | POST /api/auth/register | Create new user account |
| 9 | `get_me` | GET /api/me | Return current user profile |
| 10 | `update_me` | PATCH /api/me | Update current user profile |
| 11 | `get_users` | GET /api/users | Return all users (excluding current) |
| 12 | `get_user` | GET /api/users/<id> | Return single user by ID |
| 13 | `delete_user` | DELETE /api/users/<id> | Delete a user account |
| 14 | `get_feed` | GET /api/feed | Return all posts newest-first |
| 15 | `create_post` | POST /api/feed | Create a new post |
| 16 | `get_jobs` | GET /api/jobs | Return all job listings |
| 17 | `get_job` | GET /api/jobs/<id> | Return single job by ID |
| 18 | `get_company` | GET /api/companies/<id> | Return company by ID |
| 19 | `get_conversations_list` | GET /api/conversations | Return all conversation summaries |
| 20 | `get_conversation` | GET /api/conversations/<id> | Return single conversation with messages |
| 21 | `post_message` | POST /api/conversations/<id>/messages | Send a message |
| 22 | `get_notifications` | GET /api/notifications | Return all notifications |
| 23 | `mark_notification_read` | PATCH /api/notifications/<id>/read | Mark one notification read |
| 24 | `mark_all_notifications_read` | PATCH /api/notifications/read-all | Mark all notifications read |
| 25 | `get_events` | GET /api/events | Return static events list |
| 26 | `get_groups` | GET /api/groups | Return static groups list |
| 27 | `get_group` | GET /api/groups/<id> | Return single group by ID |
| 28 | `get_courses` | GET /api/courses | Return static courses list |
| 29 | `get_news` | GET /api/news | Return static news list |
| 30 | `get_invitations` | GET /api/invitations | Return static invitations list |
| 31 | `get_hashtags` | GET /api/hashtags | Return static hashtags list |
| 32 | `search` | GET /api/search?q= | Search users, jobs, companies, posts |
| 33 | `get_profile_readiness` | GET /api/profile-readiness | Compute profile completeness score |
| 34 | `outreach_generate` | POST /api/outreach/generate | Generate outreach message draft |
| 35 | `outreach_readiness` | GET /api/outreach/readiness | Compute outreach readiness score |

---

## Test Table

| Test ID | Type | Function | Purpose | Inputs | Expected Output |
|---------|------|----------|---------|--------|-----------------|
| T01 | BB | `login` | Valid credentials return user and token | `{email: "alex@example.com", password: "password123"}` | HTTP 200, JSON with `user` and `token` keys |
| T02 | BB | `login` | Wrong password returns 401 | `{email: "alex@example.com", password: "wrong"}` with `verify_credentials` → None | HTTP 401 |
| T03 | WB | `login` | Missing email field returns 400 | `{password: "password123"}` (no email) | HTTP 400 |
| T04 | WB | `login` | Missing password field returns 400 | `{email: "alex@example.com"}` (no password) | HTTP 400 |
| T05 | EC | `login` | Empty body returns 400 | `{}` | HTTP 400 |
| T06 | EP | `login` | Email normalized to lowercase | `{email: "ALEX@EXAMPLE.COM", password: "password123"}` | calls `verify_credentials` with lowercase email |
| T07 | BB | `register` | Valid registration returns 201 with token | `{name: "Alice", email: "alice@test.com", password: "password123"}` | HTTP 201, JSON with `user` and `token` |
| T08 | WB | `register` | Missing name returns 400 | `{email: "alice@test.com", password: "password123"}` | HTTP 400 |
| T09 | WB | `register` | Invalid email format returns 400 | `{name: "Alice", email: "notanemail", password: "password123"}` | HTTP 400 |
| T10 | GB | `register` | Password shorter than 8 chars returns 400 | `{name: "Alice", email: "alice@test.com", password: "short"}` | HTTP 400 |
| T11 | GB | `register` | Password exactly 8 chars is accepted | `{name: "Alice", email: "alice@test.com", password: "12345678"}` | HTTP 201 |
| T12 | RG | `register` | Duplicate email returns 409 | `create_user` raises `ValueError` | HTTP 409 |
| T13 | EC | `register` | Empty JSON body returns 400 | `{}` | HTTP 400 |
| T14 | BB | `get_me` | Returns current user JSON | GET /api/me, `get_current_user` → user dict | HTTP 200, JSON with `id` key |
| T15 | WB | `get_me` | No auth header uses fallback user id=1 | GET /api/me, no Authorization header | HTTP 200 |
| T16 | BB | `update_me` | Valid fields update and return updated user | PATCH /api/me `{headline: "Engineer"}` | HTTP 200, JSON with updated `headline` |
| T17 | WB | `update_me` | No valid fields returns 400 | PATCH /api/me `{unknownKey: "value"}` | HTTP 400 |
| T18 | EC | `update_me` | Empty body returns 400 | PATCH /api/me `{}` | HTTP 400 |
| T19 | WB | `update_me` | Non-string values filtered out | PATCH /api/me `{headline: 123}` | HTTP 400 (no valid string fields) |
| T20 | BB | `get_users` | Returns list of users | GET /api/users | HTTP 200, JSON array |
| T21 | BB | `get_user` | Existing user returned by ID | GET /api/users/2, `get_user_by_id` → user | HTTP 200, JSON with `id: 2` |
| T22 | BB | `get_user` | Non-existent user returns 404 | GET /api/users/999, `get_user_by_id` → None | HTTP 404 |
| T23 | BB | `delete_user` | Successful delete returns 204 | DELETE /api/users/2, `delete_user` → True | HTTP 204, empty body |
| T24 | BB | `delete_user` | User not found returns 404 | DELETE /api/users/999, `delete_user` → False | HTTP 404 |
| T25 | WB | `delete_user` | Protected id=1 returns 403 | DELETE /api/users/1, `delete_user` raises ValueError | HTTP 403 |
| T26 | BB | `get_feed` | Returns list of posts | GET /api/feed | HTTP 200, JSON array |
| T27 | EC | `get_feed` | Empty post table returns empty array | GET /api/feed, `get_all_posts` → [] | HTTP 200, `[]` |
| T28 | BB | `create_post` | Valid content creates post | POST /api/feed `{content: "Hello"}` | HTTP 201, JSON post object |
| T29 | WB | `create_post` | Empty content returns 400 | POST /api/feed `{content: ""}` | HTTP 400 |
| T30 | EC | `create_post` | Whitespace-only content returns 400 | POST /api/feed `{content: "   "}` | HTTP 400 |
| T31 | BB | `get_jobs` | Returns list of jobs | GET /api/jobs | HTTP 200, JSON array |
| T32 | BB | `get_job` | Existing job returned | GET /api/jobs/1 | HTTP 200, JSON with `id` |
| T33 | BB | `get_job` | Non-existent job returns 404 | GET /api/jobs/999, `get_job_by_id` → None | HTTP 404 |
| T34 | BB | `get_company` | Existing company returned | GET /api/companies/1 | HTTP 200, JSON with `id` |
| T35 | BB | `get_company` | Non-existent company returns 404 | GET /api/companies/999, `get_company_by_id` → None | HTTP 404 |
| T36 | BB | `get_conversations_list` | Returns list of conversations | GET /api/conversations | HTTP 200, JSON array |
| T37 | BB | `get_conversation` | Existing conversation returned | GET /api/conversations/1 | HTTP 200, JSON with `id` |
| T38 | BB | `get_conversation` | Non-existent conversation returns 404 | GET /api/conversations/999, `get_conversation_by_id` → None | HTTP 404 |
| T39 | BB | `post_message` | Valid text creates message | POST /api/conversations/1/messages `{text: "Hi"}` | HTTP 201, JSON with `isMe: true` |
| T40 | WB | `post_message` | Empty text returns 400 | POST /api/conversations/1/messages `{text: ""}` | HTTP 400 |
| T41 | WB | `post_message` | Non-existent conversation returns 404 | POST /api/conversations/999/messages, `get_conversation_by_id` → None | HTTP 404 |
| T42 | WB | `post_message` | Response includes `isMe: true` | Valid POST | JSON body has `isMe` set to `true` |
| T43 | BB | `get_notifications` | Returns list of notifications | GET /api/notifications | HTTP 200, JSON array |
| T44 | BB | `mark_notification_read` | Marks notification and returns it | PATCH /api/notifications/1/read | HTTP 200, JSON with `isRead: true` |
| T45 | BB | `mark_notification_read` | Non-existent notification returns 404 | PATCH /api/notifications/999/read, `mark_notification_read` → None | HTTP 404 |
| T46 | BB | `mark_all_notifications_read` | Returns success JSON | PATCH /api/notifications/read-all | HTTP 200, `{"success": true}` |
| T47 | BB | `get_events` | Returns events list | GET /api/events | HTTP 200, JSON array |
| T48 | BB | `get_groups` | Returns groups list | GET /api/groups | HTTP 200, JSON array |
| T49 | BB | `get_group` | Existing group returned | GET /api/groups/1 | HTTP 200, JSON |
| T50 | BB | `get_group` | Non-existent group returns 404 | GET /api/groups/999, `get_group_by_id` → None | HTTP 404 |
| T51 | BB | `get_courses` | Returns courses list | GET /api/courses | HTTP 200, JSON array |
| T52 | BB | `get_news` | Returns news list | GET /api/news | HTTP 200, JSON array |
| T53 | BB | `get_invitations` | Returns invitations list | GET /api/invitations | HTTP 200, JSON array |
| T54 | BB | `get_hashtags` | Returns hashtags list | GET /api/hashtags | HTTP 200, JSON array |
| T55 | BB | `search` | Query returns categorised results | GET /api/search?q=Alex | HTTP 200, JSON with `users`, `jobs`, `companies`, `posts` keys |
| T56 | WB | `search` | Empty query returns empty result sets | GET /api/search?q= | HTTP 200, all lists empty, `query: ""` |
| T57 | EC | `search` | No `q` param returns empty result | GET /api/search | HTTP 200, all lists empty |
| T58 | BB | `get_profile_readiness` | Returns score, sections, fixes | GET /api/profile-readiness | HTTP 200, JSON with `score`, `sections`, `fixes` |
| T59 | WB | `get_profile_readiness` | Score ≥80 section has status `done` | User with long headline | `fixes` entry for `headline` has `status: "done"` |
| T60 | GB | `get_profile_readiness` | Score 40–79 section has status `warn` | User with partial headline (40–79% fill) | `fixes` entry has `status: "warn"` |
| T61 | GB | `get_profile_readiness` | Score <40 section has status `bad` | User with empty headline | `fixes` entry for `headline` has `status: "bad"` |
| T62 | WB | `get_profile_readiness` | Photo section full when `avatarColor` set | User with `avatarColor` set | photo section `score: 100` |
| T63 | EC | `get_profile_readiness` | All sections empty → score near 0 | User with no profile data filled | `score` is low (≤17) |
| T64 | BB | `outreach_generate` | Valid recipientId returns draft | POST `{recipientId: 2}`, recipient found | HTTP 200, JSON with `draft` and `tips` |
| T65 | WB | `outreach_generate` | Missing recipientId returns 400 | POST `{}` | HTTP 400 |
| T66 | WB | `outreach_generate` | Non-integer recipientId returns 400 | POST `{recipientId: "abc"}` | HTTP 400 |
| T67 | WB | `outreach_generate` | Float recipientId returns 400 | POST `{recipientId: 1.5}` | HTTP 400 |
| T68 | WB | `outreach_generate` | Zero recipientId returns 400 | POST `{recipientId: 0}` | HTTP 400 |
| T69 | BB | `outreach_generate` | Unknown recipient returns 404 | POST `{recipientId: 999}`, `get_user_by_id` → None | HTTP 404 |
| T70 | EP | `outreach_generate` | Invalid tone defaults to "professional" | POST `{recipientId: 2, tone: "rude"}` | HTTP 200, `tone` in response is `"professional"` |
| T71 | EP | `outreach_generate` | Invalid goal defaults to "networking" | POST `{recipientId: 2, goal: "spam"}` | HTTP 200, response contains networking-related draft |
| T72 | BB | `outreach_readiness` | No userId uses current user | GET /api/outreach/readiness | HTTP 200, JSON with `score` and `level` |
| T73 | BB | `outreach_readiness` | Valid userId returns that user's readiness | GET /api/outreach/readiness?userId=2 | HTTP 200, JSON with `score` |
| T74 | WB | `outreach_readiness` | Invalid userId returns 400 | GET /api/outreach/readiness?userId=abc | HTTP 400 |
| T75 | WB | `outreach_readiness` | Zero userId returns 400 | GET /api/outreach/readiness?userId=0 | HTTP 400 |
| T76 | BB | `outreach_readiness` | Non-existent userId returns 404 | GET /api/outreach/readiness?userId=999, `get_user_by_id` → None | HTTP 404 |
| T77 | RG | `not_found` | Unknown route returns JSON 404, not HTML | GET /api/does-not-exist | HTTP 404, Content-Type is application/json |
| T78 | WB | `_auth_user` | Bearer token resolves to user | GET /api/me with `Authorization: Bearer validtoken` | Uses `get_session_user_id(token)` to find user |
| T79 | WB | `_auth_user` | Missing Authorization header uses id=1 fallback | GET /api/me, no header | Still returns HTTP 200 |
| T80 | EC | `update_me` | Multiple valid fields updated at once | PATCH /api/me `{headline: "X", location: "NY"}` | HTTP 200, both fields updated |
| T81 | RG | `create_post` | Missing body falls back to empty content → 400 | POST /api/feed with no body | HTTP 400 |
| T82 | EC | `post_message` | Whitespace-only text returns 400 | POST /api/conversations/1/messages `{text: "   "}` | HTTP 400 |
| T83 | GB | `outreach_generate` | Negative recipientId returns 400 | POST `{recipientId: -1}` | HTTP 400 |
