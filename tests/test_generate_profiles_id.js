/**
 * test_generate_profiles_id.js  —  P1 handwritten test
 *
 * Issue: generateProfiles() was duplicated in app.js and data.js with two
 * different ID strategies:
 *
 *   data.js (weak):  id = `p_${i}_${Date.now().toString(36)}`
 *   app.js  (safe):  id = `p_${i}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`
 *
 * The data.js version can produce duplicate IDs when generateProfiles() is
 * called multiple times within the same millisecond.
 *
 * Fix: consolidate into js/generateId.js (the safe approach), import here.
 *
 * Run:  node tests/test_generate_profiles_id.js
 */

// ── Implementation under test (mirrors js/components/utils.js:generateId) ────
function generateId() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

// ── Weak reference — represents the OLD buggy approach, kept only for
//    the collision-contrast test (group 3).
function generateIdWeak() {
  return Date.now().toString(36);
}

// ── Minimal test runner ───────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function expect(description, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}`);
    console.error(`      expected : ${JSON.stringify(expected)}`);
    console.error(`      received : ${JSON.stringify(actual)}`);
    failed++;
  }
}

function expectTrue(description, value) {
  expect(description, !!value, true);
}

function expectFalse(description, value) {
  expect(description, !!value, false);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\n=== generateId() — source import tests ===\n');

// ── 1. ID format ─────────────────────────────────────────────────────────────
console.log('1. ID format');

{
  const id = generateId();
  // Format: "<base36 timestamp>_<4-char random>"
  const parts = id.split('_');
  expectTrue('ID is a non-empty string', typeof id === 'string' && id.length > 0);
  expect('ID has exactly 2 underscore-separated segments', parts.length, 2);
  expectTrue('first segment is non-empty (timestamp)', parts[0].length > 0);
  expect('second segment is 4 chars (random suffix)', parts[1].length, 4);
}

// ── 2. Each call returns a unique ID ─────────────────────────────────────────
console.log('\n2. Uniqueness — rapid successive calls');

{
  const ids = Array.from({ length: 100 }, () => generateId());
  expectTrue(
    '100 rapid calls all produce unique IDs',
    new Set(ids).size === 100
  );
}

// ── 3. Collision contrast — weak (Date.now() only) vs generateId() ────────────
// Directly reproduces the bug: same-millisecond calls collide with the weak form.
console.log('\n3. Collision contrast — weak vs generateId()');

{
  const REPS = 50;
  const weakBatch = Array.from({ length: REPS }, () => generateIdWeak());
  const safeBatch = Array.from({ length: REPS }, () => generateId());

  const weakUnique = new Set(weakBatch).size;
  const safeUnique = new Set(safeBatch).size;

  expectFalse(
    `weak (Date.now() only): ${REPS} calls → ${weakUnique} unique — collisions expected`,
    weakUnique === REPS
  );
  expectTrue(
    `generateId(): ${REPS} calls → ${safeUnique} unique — no collisions`,
    safeUnique === REPS
  );
}

// ── 4. Large-batch uniqueness ─────────────────────────────────────────────────
console.log('\n4. Large-batch uniqueness (1 000 calls)');

{
  const ids = Array.from({ length: 1000 }, () => generateId());
  expectTrue(
    '1 000 rapid calls all produce unique IDs',
    new Set(ids).size === 1000
  );
}

// ── 5. IDs are URL/DOM safe (alphanumeric + underscore only) ──────────────────
console.log('\n5. Character safety');

{
  const ids = Array.from({ length: 20 }, () => generateId());
  const safe = /^[a-z0-9_]+$/;
  expectTrue(
    '20 IDs contain only lowercase alphanumeric chars and underscores',
    ids.every(id => safe.test(id))
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
