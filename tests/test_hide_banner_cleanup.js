/**
 * test_hide_banner_cleanup.js  —  handwritten test for Issue #7
 *
 * Issue: hideBanner() never removes the item that showMatchBanner() appended
 * to matchList. Every time the banner is shown and hidden, one more child
 * element accumulates in matchList — a DOM memory leak.
 *
 * Root cause: showMatchBanner() calls matchList.appendChild(item) but
 * hideBanner() only toggles the CSS class; it never calls
 * matchList.firstElementChild.remove().
 *
 * Fix: add the following inside hideBanner(), before the setTimeout:
 *
 *   const firstItem = matchList.firstElementChild;
 *   if (firstItem) firstItem.remove();
 *
 * Run:  node tests/test_hide_banner_cleanup.js
 *
 * ── Input / Output / Oracle ──────────────────────────────────────────────────
 *
 *  Test 1 — single show + hide
 *    Input  : showMatchBanner() called once → hideBanner() called once
 *    Oracle : matchList.children.length === 0 (item removed on hide)
 *    Output (buggy)  : matchList.children.length === 1  ← FAILS
 *    Output (fixed)  : matchList.children.length === 0  ← PASSES
 *
 *  Test 2 — three cycles, no accumulation
 *    Input  : showMatchBanner() / hideBanner() called 3 times in sequence
 *    Oracle : matchList.children.length === 0 after all hides
 *    Output (buggy)  : matchList.children.length === 3  ← FAILS
 *    Output (fixed)  : matchList.children.length === 0  ← PASSES
 *
 *  Test 3 — item visible while banner is open
 *    Input  : showMatchBanner() called, hideBanner() NOT yet called
 *    Oracle : matchList.children.length === 1 (item present while shown)
 *    Output : 1 in both buggy and fixed  ← PASSES both
 *
 *  Test 4 — banner class toggled on hide
 *    Input  : showMatchBanner() then hideBanner()
 *    Oracle : matchBanner does NOT have class "match-banner--visible" after hide
 *    Output : passes in both versions (visibility logic was never broken)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Minimal DOM shim (no external deps) ──────────────────────────────────────

function makeDOM() {
  // A tiny element stand-in that tracks children and classList
  function el(tag) {
    const node = {
      tag,
      children: [],
      classList: {
        _classes: new Set(),
        add(c)    { node.classList._classes.add(c); },
        remove(c) { node.classList._classes.delete(c); },
        contains(c) { return node.classList._classes.has(c); },
      },
      get firstElementChild() {
        return node.children[0] ?? null;
      },
      appendChild(child) {
        node.children.push(child);
      },
      remove() {
        // called on a child — removes itself from its parent
        if (node._parent) {
          node._parent.children = node._parent.children.filter(c => c !== node);
        }
      },
      _setParent(p) { node._parent = p; },
    };
    // Wrap appendChild so children know their parent
    const _orig = node.appendChild.bind(node);
    node.appendChild = function(child) {
      child._setParent && child._setParent(node);
      _orig(child);
    };
    return node;
  }

  const matchBanner = el('div');
  const matchList   = el('ul');
  return { matchBanner, matchList, el };
}

// ── Implementations under test ────────────────────────────────────────────────

// BUGGY version — reflects what the issue describes: hideBanner does NOT clean up
function makeBuggyBanner({ matchBanner, matchList, el }) {
  function showMatchBanner() {
    const item = el('li');
    matchList.appendChild(item);
    matchBanner.classList.add('match-banner--visible');
  }

  function hideBanner(callback) {
    matchBanner.classList.remove('match-banner--visible');
    // BUG: never removes the appended item from matchList
    if (callback) callback();
  }

  return { showMatchBanner, hideBanner };
}

// FIXED version — hideBanner removes the first child before draining
function makeFixedBanner({ matchBanner, matchList, el }) {
  function showMatchBanner() {
    const item = el('li');
    matchList.appendChild(item);
    matchBanner.classList.add('match-banner--visible');
  }

  function hideBanner(callback) {
    matchBanner.classList.remove('match-banner--visible');
    const firstItem = matchList.firstElementChild;
    if (firstItem) firstItem.remove();
    if (callback) callback();
  }

  return { showMatchBanner, hideBanner };
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

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\n=== hideBanner() DOM cleanup — Issue #7 ===\n');

// ── 1. Single show + hide — item must be gone after hide ─────────────────────
console.log('1. Single show then hide');

const dom1b = makeDOM();
const buggy1 = makeBuggyBanner(dom1b);
buggy1.showMatchBanner();
buggy1.hideBanner();
expect(
  '[BUGGY]  matchList is empty after one show+hide   ← expects FAIL',
  dom1b.matchList.children.length, 0
);

const dom1f = makeDOM();
const fixed1 = makeFixedBanner(dom1f);
fixed1.showMatchBanner();
fixed1.hideBanner();
expect(
  '[FIXED]  matchList is empty after one show+hide',
  dom1f.matchList.children.length, 0
);

// ── 2. Three cycles — items must not accumulate ───────────────────────────────
console.log('\n2. Three show/hide cycles — no accumulation');

const dom2b = makeDOM();
const buggy2 = makeBuggyBanner(dom2b);
for (let i = 0; i < 3; i++) { buggy2.showMatchBanner(); buggy2.hideBanner(); }
expect(
  '[BUGGY]  matchList is empty after 3 cycles       ← expects FAIL',
  dom2b.matchList.children.length, 0
);

const dom2f = makeDOM();
const fixed2 = makeFixedBanner(dom2f);
for (let i = 0; i < 3; i++) { fixed2.showMatchBanner(); fixed2.hideBanner(); }
expect(
  '[FIXED]  matchList is empty after 3 cycles',
  dom2f.matchList.children.length, 0
);

// ── 3. Item present while banner is open (both versions) ─────────────────────
console.log('\n3. Item present while banner is open (before any hide)');

const dom3b = makeDOM();
const buggy3 = makeBuggyBanner(dom3b);
buggy3.showMatchBanner();
expect(
  '[BUGGY]  matchList has 1 child after show (before hide)',
  dom3b.matchList.children.length, 1
);

const dom3f = makeDOM();
const fixed3 = makeFixedBanner(dom3f);
fixed3.showMatchBanner();
expect(
  '[FIXED]  matchList has 1 child after show (before hide)',
  dom3f.matchList.children.length, 1
);

// ── 4. Banner visibility class removed on hide ────────────────────────────────
console.log('\n4. Banner visibility class removed on hide');

const dom4b = makeDOM();
const buggy4 = makeBuggyBanner(dom4b);
buggy4.showMatchBanner();
buggy4.hideBanner();
expect(
  '[BUGGY]  matchBanner loses match-banner--visible after hide',
  dom4b.matchBanner.classList.contains('match-banner--visible'), false
);

const dom4f = makeDOM();
const fixed4 = makeFixedBanner(dom4f);
fixed4.showMatchBanner();
fixed4.hideBanner();
expect(
  '[FIXED]  matchBanner loses match-banner--visible after hide',
  dom4f.matchBanner.classList.contains('match-banner--visible'), false
);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
