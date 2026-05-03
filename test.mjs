import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(__dirname, 'index.html');

const routine = [
  { title: "Hip mobility",            hasLink: false, hasTimer: false },
  { title: "Hip rolling",             hasLink: false, hasTimer: false },
  { title: "Glute bridge single leg", hasLink: false, hasTimer: false },
  { title: "Single leg squat",        hasLink: true,  hasTimer: false },
  { title: "Copenhagen plank",        hasLink: true,  hasTimer: true, sets: 8 },
  { title: "Split stance hinge",      hasLink: true,  hasTimer: false },
  { title: "Drop jump",               hasLink: true,  hasTimer: false },
  { title: "Hip 90/90",               hasLink: true,  hasTimer: false },
  { title: "Pigeon pose",             hasLink: true,  hasTimer: false },
  { title: "Butterfly stretch",       hasLink: true,  hasTimer: false },
];

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url);

// ── 1. Initial render ────────────────────────────────────────────────────────
console.log('\n[1] Initial render');
const firstTitle = await page.textContent('#title');
assert(firstTitle === 'Hip mobility', `title is "Hip mobility" (got "${firstTitle}")`);

const firstMain = await page.textContent('#main');
assert(firstMain === '2–3 mins', `main is "2–3 mins" (got "${firstMain}")`);

const linkVisible = await page.isVisible('#link');
assert(!linkVisible, 'video link hidden for exercise without a link');

// ── 2. Navigate through all exercises, check title + link visibility ─────────
console.log('\n[2] Navigate through all exercises');
for (let idx = 0; idx < routine.length; idx++) {
  const ex = routine[idx];
  if (idx > 0) await page.click('button');

  const title = await page.textContent('#title');
  assert(title === ex.title, `exercise ${idx + 1}: title "${ex.title}"`);

  const visible = await page.isVisible('#link');
  assert(
    visible === ex.hasLink,
    `exercise ${idx + 1}: link ${ex.hasLink ? 'visible' : 'hidden'}`
  );
}

// ── 3. Copenhagen plank — timer and set counter ──────────────────────────────
console.log('\n[3] Copenhagen plank timer');
// Navigate to Copenhagen plank (index 4) — we're currently at index 9, so
// click once to wrap to 0, then navigate forward to index 4
await page.click('button'); // wraps to 0
for (let k = 0; k < 4; k++) await page.click('button'); // advance to index 4

const copenTitle = await page.textContent('#title');
assert(copenTitle === 'Copenhagen plank', `navigated to Copenhagen plank (got "${copenTitle}")`);

const subText = await page.textContent('#sub');
assert(subText === 'Set 1 of 8', `set counter shows "Set 1 of 8" (got "${subText}")`);

const initialMain = await page.textContent('#main');
assert(initialMain === '10s', `timer starts at "10s" (got "${initialMain}")`);

// Wait 2 seconds and confirm it has counted down
await page.waitForTimeout(2100);
const countedMain = await page.textContent('#main');
const countedSecs = parseInt(countedMain);
assert(countedSecs <= 8 && countedSecs >= 7, `timer counted down to ~8s (got "${countedMain}")`);

// ── 4. Navigating away from running timer stops it ───────────────────────────
console.log('\n[4] Timer cancellation on Next');
await page.click('button'); // navigate away from Copenhagen plank
const afterNavTitle = await page.textContent('#title');
assert(afterNavTitle === 'Split stance hinge', `moved to next exercise (got "${afterNavTitle}")`);

// Wait to confirm no stale interval is updating #main
const mainAfterNav = await page.textContent('#main');
await page.waitForTimeout(1500);
const mainAfterWait = await page.textContent('#main');
assert(mainAfterNav === mainAfterWait, `#main is static after leaving timer (was "${mainAfterNav}", now "${mainAfterWait}")`);

// ── 5. Wrap-around navigation ────────────────────────────────────────────────
console.log('\n[5] Wrap-around');
// Currently at index 5. Navigate to end (indices 6–9 = 4 more clicks) then one more
for (let k = 0; k < 4; k++) await page.click('button');
const lastTitle = await page.textContent('#title');
assert(lastTitle === 'Butterfly stretch', `reached last exercise (got "${lastTitle}")`);

await page.click('button');
const wrappedTitle = await page.textContent('#title');
assert(wrappedTitle === 'Hip mobility', `wraps back to first exercise (got "${wrappedTitle}")`);

// ── 6. Reps content spot-checks ──────────────────────────────────────────────
console.log('\n[6] Reps content');
// Navigate to Hip rolling (index 1)
await page.click('button');
const hipRollingMain = await page.textContent('#main');
assert(hipRollingMain === '10 reps x 3', `Hip rolling: "10 reps x 3" (got "${hipRollingMain}")`);

// Navigate forward to Drop jump (index 6)
for (let k = 0; k < 5; k++) await page.click('button');
const dropJumpTitle = await page.textContent('#title');
const dropJumpMain = await page.textContent('#main');
assert(dropJumpTitle === 'Drop jump', `on Drop jump (got "${dropJumpTitle}")`);
assert(dropJumpMain === '6–8 reps x 2 sets', `Drop jump: "6–8 reps x 2 sets" (got "${dropJumpMain}")`);

// ── Summary ──────────────────────────────────────────────────────────────────
await browser.close();

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
