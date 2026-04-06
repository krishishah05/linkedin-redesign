"""
Simple mutation testing script for backend/database.py and backend/app.py
Introduces targeted mutations and checks if tests catch them (kill the mutant).

Usage:
    cd backend
    python run_mutation_tests.py
"""

import glob
import os
import shutil
import subprocess
import sys

PYTHON = sys.executable
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TESTS_DIR = os.path.join(BASE_DIR, "..", "tests", "tests", "test-files")

def run_tests(test_file, cov_module):
    result = subprocess.run(
        [PYTHON, "-m", "pytest", test_file, f"--cov={cov_module}", "-q", "--tb=no"],
        cwd=BASE_DIR,
        capture_output=True,
        text=True,
    )
    return result.returncode == 0  # True = tests pass (mutant SURVIVED), False = killed

def apply_mutation(source_path, old, new):
    with open(source_path, "r") as f:
        original = f.read()
    mutated = original.replace(old, new, 1)
    if mutated == original:
        return None, original  # mutation not applicable
    with open(source_path, "w") as f:
        f.write(mutated)
    return mutated, original

def restore(source_path, original):
    with open(source_path, "w") as f:
        f.write(original)
    # Clear bytecode cache so pytest uses fresh source, not stale .pyc
    pycache = os.path.join(os.path.dirname(source_path), "__pycache__")
    if os.path.isdir(pycache):
        shutil.rmtree(pycache)

def run_mutation_suite(source_file, test_file, cov_module, mutations):
    source_path = os.path.join(BASE_DIR, source_file)
    test_path = os.path.join(TESTS_DIR, test_file)

    print(f"\n{'='*60}")
    print(f"Mutation Testing: {source_file}")
    print(f"Test file:        {test_file}")
    print(f"{'='*60}")

    total = 0
    killed = 0
    survived = 0
    skipped = 0
    results = []

    for label, old, new in mutations:
        mutated, original = apply_mutation(source_path, old, new)
        if mutated is None:
            results.append((label, "SKIPPED", old, new))
            skipped += 1
            continue

        total += 1
        tests_passed = run_tests(test_path, cov_module)

        restore(source_path, original)

        if tests_passed:
            status = "SURVIVED"
            survived += 1
        else:
            status = "KILLED"
            killed += 1

        results.append((label, status, old, new))
        print(f"  [{status:8s}] {label}")

    print(f"\nResults: {killed} killed / {survived} survived / {skipped} skipped / {total} total")
    if total > 0:
        score = (killed / total) * 100
        print(f"Mutation score: {score:.1f}%")

    return results, killed, survived, skipped, total


# ── database.py mutations ─────────────────────────────────────────────────────
DB_MUTATIONS = [
    # (label, original_code, mutated_code)
    ("hash_pw: sha256 -> sha512",              "hashlib.sha256",                "hashlib.sha512"),
    ("ts: return 0 instead of real timestamp", "return int(time.time() * 1000)","return 0"),
    ("verify: return None on valid match",     "return json.loads(row[\"data\"])", "return None"),
    ("get_session: return None from cache",    "return _sessions[token]",        "return None"),
    ("get_session: return None from db",       'return row["user_id"]',          "return None"),
    ("create_user: skip password hash",        "hash_pw(password)",              "password"),
    ("delete_user: wrong protected id guard",  "if int(user_id) == 1:",          "if int(user_id) == 999:"),
    ("posts: ascending instead of descending", "ORDER BY created_at DESC",       "ORDER BY created_at ASC"),
    ("mark_read: set is_read=0",               "SET is_read=1 WHERE id=?",       "SET is_read=0 WHERE id=?"),
    ("mark_all_read: only mark one row",       'UPDATE notifications SET is_read=1"',
                                               'UPDATE notifications SET is_read=0"'),
]

# ── app.py mutations ──────────────────────────────────────────────────────────
APP_MUTATIONS = [
    ("login: skip email required check",       "if not email or not password:",  "if not password:"),
    ("register: allow short passwords",        "len(password) < 8",              "len(password) < 0"),
    ("register: return 200 on duplicate",      "return jsonify({}), 409",        "return jsonify({}), 200"),
    ("update_me: invert empty-update guard",   "if not updates:",                "if updates:"),
    ("create_post: allow blank content",       "if not content:",                "if False:"),
    ("send_message: allow blank text",         "if not text:",                   "if False:"),
    ("outreach: allow non-positive id",        "if recipient_id <= 0:",          "if recipient_id <= -999:"),
    ("profile_readiness: break score sum",     "score = round(sum(",             "score = round(max("),
    ("404 handler: return 200 status",         "return jsonify({\"error\": str(e)}), 404",
                                               "return jsonify({\"error\": str(e)}), 200"),
    ("get_user: wrong 404 response",           "return jsonify({\"error\": \"User not found\"}), 404",
                                               "return jsonify({\"error\": \"User not found\"}), 200"),
]


if __name__ == "__main__":
    all_killed = 0
    all_total = 0

    db_results, k, s, sk, t = run_mutation_suite(
        "database.py",
        "test_database.py",
        "database",
        DB_MUTATIONS,
    )
    all_killed += k
    all_total += t

    app_results, k, s, sk, t = run_mutation_suite(
        "app.py",
        "test_app.py",
        "app",
        APP_MUTATIONS,
    )
    all_killed += k
    all_total += t

    print(f"\n{'='*60}")
    print("OVERALL MUTATION SUMMARY")
    print(f"{'='*60}")
    print(f"Total mutants tested: {all_total}")
    print(f"Killed:   {all_killed}")
    print(f"Survived: {all_total - all_killed}")
    if all_total > 0:
        print(f"Overall mutation score: {(all_killed / all_total) * 100:.1f}%")
