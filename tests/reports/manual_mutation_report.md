# Manual Mutation Testing Report — FeedPage.js
**Date:** 2026-04-05  
**Tester:** Saanvi Elaty  
**File Under Test:** `js/components/pages/FeedPage.js`  
**Test Suite:** `tests/tests/test-files/FeedPage.test.js`  
**Method:** Manual mutation (equivalent to Stryker, performed by hand)

---

## What Is This?

Mutation testing evaluates **oracle quality** — whether your test assertions actually catch bugs,
not just whether the code runs. For each mutation we:
1. Introduce one small deliberate bug into `FeedPage.js`
2. Run the test suite
3. Record **Killed** (a test failed = oracle caught it) or **Survived** (all passed = weak oracle)
4. Revert the change

A high kill rate means your assertions are strong. Survivors reveal tests that execute the code
but don't verify the right output.

---

## Baseline

All tests must pass before mutations begin.

| Metric | Result |
|--------|--------|
| Total tests | 61 |
| Passing | 61 |
| Failing | 0 |
| Status | PASSED — ready for mutations |

---

## Mutation Results

| # | Function | Line | Original Code | Mutated Code | Expected Killer | Result | Notes |
|---|----------|------|---------------|--------------|-----------------|--------|-------|
| M1 | Feed Sort (Recent) | 30 | `(b.timestamp\|\|0) - (a.timestamp\|\|0)` | `(a.timestamp\|\|0) - (b.timestamp\|\|0)` | Test 8 | KILLED | Test 8 failed as expected |
| M2 | Feed Sort (Top) | 34 | `return rb - ra` | `return ra - rb` | Test 9 | KILLED | Tests 9 AND 10 both failed |
| M3 | toggleCommentsFor | 65 | `else next.add(postId)` | *(line removed)* | Test 5 | KILLED | Tests 5, 6, AND 7 all failed |
| M4 | selectReaction | 379 | `showToast(..., 'success')` | `showToast(..., 'info')` | Test 20 | KILLED | Test 20 failed as expected |
| M5 | postComment | 385 | `u.name \|\| 'You'` | `u.name \|\| 'Anonymous'` | Test 24 | KILLED | Test 24 failed as expected |
| M6 | handleNewPost rollback | 57 | `p.id !== newPost.id` | `p.id === newPost.id` | Test 3 | KILLED | Test 3 failed as expected |
| M7 | handleNewPost | 41 | `author: u.name` | `author: u.headline` | Test 1 | KILLED | Test 1 failed: received "Dev" instead of "Alex" |
| M8 | handleNewPost | 42 | `authorId: u.id` | `authorId: 0` | Test 1 | KILLED | Test 1 failed: received 0 instead of 1 |
| M9 | PostCreator.submit | 213 | `onPost(draft.trim())` | `onPost(draft)` | Test 14 | KILLED | Test 14 failed: called with untrimmed string |
| M10 | PostCreator.submit | 215 | `setExpanded(false)` | *(line removed)* | Test 14 | KILLED | Test 14 failed: "Start a post" button did not reappear |
| M11 | SponsoredPost | 307 | `showToast('Ad hidden')` | `showToast('Ad dismissed')` | Test 18 | KILLED | Test 18 failed as expected |
| M12 | selectReaction | 378 | `onLike()` present | `onLike()` removed | Test 20 | KILLED | Test 20 failed: onLike not called |
| M13 | postComment | 391 | `setCommentDraft('')` | *(line removed)* | Test 21 | KILLED | Test 21 failed: textarea value not cleared |
| M14 | FeedPage render | 149 | `allPosts.length === 0` | `allPosts.length > 0` | Test 13 | KILLED | Test 13 failed: empty-state message shown when posts exist |
| M15 | Sidebar follow | 181 | `follow(su.id)` | `follow(0)` | Test 38 | KILLED | Test 38 failed: called with 0 instead of 5 |
| M16 | Options menu | 438 | `post.authorId === currentUser.id` | `post.authorId !== currentUser.id` | Tests 34/35 | KILLED | 3 tests failed: Delete post shown for wrong user |
| M17 | Options menu delete | 445 | `onDelete(post.id)` | `onDelete(0)` | Test 36 | KILLED | Test 36 failed: called with 0 instead of 1 |
| M18 | Options menu delete | 445 | `showToast('Post deleted')` | `showToast('Post removed')` | Test 36 | KILLED | Test 36 failed: wrong toast message |
| M19 | FeedPage onLike | 132 | `toggleLike(String(post.id))` | `toggleLike(post.id)` | Test 39 | KILLED | Test 39 failed: received number 7 instead of string '7' |
| M20 | FeedPage onDelete | 140 | `p.id !== id` | `p.id === id` | Test 40 | KILLED | Test 40 failed: wrong post removed from list |
| M21 | TruncatedText | 627 | `text.length <= limit` | `text.length < limit` | Test 32 | KILLED | Test 32 failed: text at exact limit incorrectly truncated |
| M22 | FeedPost navigate | 403 | `navigate('profile?id=\${authorId}')` | `navigate('profile')` | Test 53 | KILLED | Test 53 failed: navigate called without id |
| M23 | handleLikeHover | 368 | `setTimeout(..., 500)` | `setTimeout(..., 1000)` | Test 25 | KILLED | 3 tests failed: reaction panel never appeared in fake-timer window |
| M24 | handleNewPost | 52 | `[newPost, ...(prev\|\|[])]` | `[...(prev\|\|[]), newPost]` | — | **SURVIVED** | No test verifies new post appears at top of feed |
| M25 | handleNewPost | 53 | `setFeedSort('Recent')` | *(line removed)* | — | **SURVIVED** | No test checks that sort resets to Recent after posting |
| M26 | handleNewPost | 47 | `likeCount: 0` | `likeCount: 5` | — | **SURVIVED** | No test checks initial likeCount on newly created post |
| M27 | PostCreator.submit | 214 | `setDraft('')` | *(line removed)* | — | **SURVIVED** | Textarea is hidden after collapse; draft value is never verified |
| M28 | postComment guard | 382 | `if (!commentDraft.trim()) return` | *(line removed)* | Tests 22/23 | KILLED | Tests 22 AND 23 failed: empty and whitespace-only comments not blocked |
| M29 | postComment | 387 | `text: commentDraft.trim()` | `text: commentDraft` | — | **SURVIVED** | Test input has no whitespace so trim() produces same result |
| M30 | postComment | 388 | `timestamp: 'Just now'` | `timestamp: 'Right now'` | — | **SURVIVED** | No test checks the timestamp value on a newly posted comment |
| M31 | postComment | 389 | `likes: 0` | `likes: 5` | — | **SURVIVED** | No test checks initial like count on a newly posted comment |
| M32 | postComment | 384 | `[{...}, ...prev]` | `[...prev, {...}]` | — | **SURVIVED** | No test checks that new comment appears at top of comment list |
| M33 | FeedPost comments | 586 | `localComments.slice(0, 3)` | `slice(0, 2)` | — | **SURVIVED** | No test verifies exactly 3 comments are rendered |
| M34 | FeedPost comments | 612 | `commentCount > 3` | `commentCount > 5` | Test 61 | KILLED | Test 61 failed: "View all" button did not appear for commentCount=5 |
| M35 | FeedPost Send btn | 557 | `showToast('Link copied!')` | `showToast('Link sent!')` | Test 52 | KILLED | Test 52 failed as expected |
| M36 | Comment Like btn | 604 | `showToast('Liked comment!')` | `showToast('Comment liked!')` | Test 59 | KILLED | Test 59 failed as expected |
| M37 | Comment Reply btn | 606 | `showToast('Reply — coming soon')` | `showToast('Reply coming soon')` | Test 60 | KILLED | Test 60 failed: em-dash removed |
| M38 | Post image click | 476 | `showToast('Image viewer — coming soon')` | `showToast('Image viewer coming soon')` | Test 57 | KILLED | Test 57 failed: em-dash removed |
| M39 | Reactions bar click | 482 | `showToast('Reactions — coming soon')` | `showToast('Reactions coming soon')` | Test 58 | KILLED | Test 58 failed: em-dash removed |
| M40 | View all comments | 614 | `showToast('Loading all comments...')` | `showToast('Loading comments...')` | Test 61 | KILLED | Test 61 failed: word "all" removed |

---

## Summary

| Metric | Count |
|--------|-------|
| Total mutants | 40 |
| Killed | 31 |
| Survived | 9 |
| Mutation Score | 77.5% (31/40) |

---

## Findings & Recommendations

31 of 40 mutants were killed. The 9 survivors cluster into two clear categories:

### Killed — Strengths

- **Exact argument assertions**: M4, M11, M15, M17, M18, M19, M35–M40 all killed because tests
  assert exact string values and argument types — not just that a function was called.

- **Empty-input guards verified**: M28 killed by Tests 22 and 23, which explicitly check that
  `postComment` does nothing when the draft is empty or whitespace-only.

- **Boundary condition covered**: M21 killed by Test 32, which tests the exact-limit edge case
  (`text.length === limit`). Off-by-one bugs here would go undetected without that test.

- **Timer precision tested**: M23 killed by 3 tests using Jest fake timers advanced by exactly
  500 ms — changing the delay to 1000 ms was immediately observable.

- **Threshold logic guarded**: M34 killed because Test 61 uses `commentCount: 5` and asserts the
  "View all" button appears. Raising the threshold to `> 5` removed the button.

### Survived — Weak Oracles

**Post-creation state (handleNewPost / PostCreator.submit):**
- **M24** — insert order not verified: new post appended instead of prepended passes all tests
- **M25** — sort reset not verified: removing `setFeedSort('Recent')` passes all tests
- **M26** — initial counters not verified: `likeCount: 5` on new post passes all tests
- **M27** — draft clear not verified: `setDraft('')` removed but textarea is hidden so tests never read it

**New comment state (postComment):**
- **M29** — trim on comment text not verified: test input has no surrounding whitespace
- **M30** — comment timestamp not verified: no test checks `'Just now'` value
- **M31** — comment initial likes not verified: no test checks `likes: 0` on a new comment
- **M32** — comment insert order not verified: new comment appended instead of prepended passes all tests

**Comment list rendering:**
- **M33** — comment cap not verified: reducing visible comments from 3 to 2 passes all tests

> **Recommendations:**
> - Add `expect(firstPostProps.post.likeCount).toBe(0)` to Test 1 (fixes M26)
> - Add assertion that new post is at index 0 in rendered feed (fixes M24)
> - Add a test that sets feedSort to 'Top', calls `handleNewPost`, and checks it resets to 'Recent' (fixes M25)
> - Add `expect(commentInDom.timestamp).toBe('Just now')` or similar after posting a comment (fixes M30/M31)
> - Add assertion on comment insert position (fixes M32)
> - Render 3 comments and assert all 3 appear (fixes M33)

---

## Conclusion

**Mutation score: 31/40 = 77.5%**

The test suite is strong on interaction logic, event argument precision, guard clauses, and
string values for toasts and navigation. The 9 survivors all cluster around *state that gets set
but never read back* — insert order, initial counters, and timestamp values on newly created
objects. These are meaningful gaps that represent real regressions that could ship undetected.
The killed-to-survived ratio demonstrates that the core logic of FeedPage.js is well-guarded,
and the survivors provide a clear, targeted improvement roadmap.
