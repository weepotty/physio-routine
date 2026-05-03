import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(__dirname, 'index.html');

const routine = [
  { title: "Hip mobility",            hasLink: false, hasTimer: false, countReps: false },
  { title: "Hip rolling",             hasLink: false, hasTimer: false, countReps: true  },
  { title: "Glute bridge single leg", hasLink: false, hasTimer: false, countReps: true  },
  { title: "Single leg squat",        hasLink: true,  hasTimer: false, countReps: true  },
  { title: "Copenhagen plank",        hasLink: true,  hasTimer: true,  countReps: false, sets: 8 },
  { title: "Split stance hinge",      hasLink: true,  hasTimer: false, countReps: true  },
  { title: "Drop jump",               hasLink: true,  hasTimer: false, countReps: true  },
  { title: "Hip 90/90",               hasLink: true,  hasTimer: false, countReps: false },
  { title: "Pigeon pose",             hasLink: true,  hasTimer: false, countReps: false },
  { title: "Butterfly stretch",       hasLink: true,  hasTimer: false, countReps: false },
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

// Navigate to a specific exercise via the home screen list.
async function jumpTo(index) {
  if (!await page.isVisible('#home-screen')) {
    await page.click('button.btn-home');
    await page.waitForSelector('#home-screen', { state: 'visible' });
  }
  await page.click(`[data-index="${index}"]`);
  await page.waitForFunction(
    (t) => document.getElementById('title')?.innerText === t,
    routine[index].title
  );
}

// ── 1. Home screen loads by default ─────────────────────────────────────────
console.log('\n[1] Home screen');
assert(await page.isVisible('#home-screen'), 'home screen visible on load');
assert(!await page.isVisible('#exercise-screen'), 'exercise screen hidden on load');

const items = await page.$$('.exercise-item');
assert(items.length === 10, `10 exercise items in home list (got ${items.length})`);

for (let idx = 0; idx < routine.length; idx++) {
  const itemTitle = await page.textContent(`[data-index="${idx}"] .exercise-item-title`);
  assert(itemTitle === routine[idx].title, `home item ${idx + 1}: "${routine[idx].title}"`);
}

// ── 2. Jump to exercise from home ────────────────────────────────────────────
console.log('\n[2] Jump to exercise from home');
await jumpTo(0);
assert(await page.isVisible('#exercise-screen'), 'exercise screen visible after jump');
assert(!await page.isVisible('#home-screen'), 'home screen hidden after jump');

const pt1 = await page.textContent('#progress-text');
assert(pt1 === '1 of 10', `progress text "1 of 10" (got "${pt1}")`);

await jumpTo(5);
const jumpedTitle = await page.textContent('#title');
assert(jumpedTitle === 'Split stance hinge', `jumped directly to exercise 6`);
const pt6 = await page.textContent('#progress-text');
assert(pt6 === '6 of 10', `progress text "6 of 10" (got "${pt6}")`);

// ── 3. Navigate through all exercises, verify title + link + rep counter ─────
console.log('\n[3] Navigate through all exercises');
await jumpTo(0);
for (let idx = 0; idx < routine.length; idx++) {
  const ex = routine[idx];
  if (idx > 0) await page.click('button.btn-primary');

  const title = await page.textContent('#title');
  assert(title === ex.title, `[${idx + 1}] title "${ex.title}"`);

  const linkVisible = await page.isVisible('#link');
  assert(linkVisible === ex.hasLink, `[${idx + 1}] link ${ex.hasLink ? 'visible' : 'hidden'}`);

  const repVisible = await page.isVisible('#rep-section');
  assert(repVisible === ex.countReps, `[${idx + 1}] rep counter ${ex.countReps ? 'visible' : 'hidden'}`);
}

// ── 4. Rep counter ───────────────────────────────────────────────────────────
console.log('\n[4] Rep counter');
await jumpTo(1); // Hip rolling

const initialCount = await page.textContent('#rep-btn');
assert(initialCount === '0', `counter starts at 0`);

await page.click('#rep-btn');
await page.click('#rep-btn');
await page.click('#rep-btn');
const afterTaps = await page.textContent('#rep-btn');
assert(afterTaps === '3', `counter shows 3 after 3 taps`);

await page.click('button.rep-reset');
const afterReset = await page.textContent('#rep-btn');
assert(afterReset === '0', `counter resets to 0 via reset button`);

// resets on Next
await page.click('#rep-btn');
await page.click('#rep-btn');
await page.click('button.btn-primary'); // → Glute bridge
const repAfterNext = await page.textContent('#rep-btn');
assert(repAfterNext === '0', `counter resets on Next`);

// resets on Back
await page.click('#rep-btn');
await page.click('button.btn-secondary'); // back → Hip rolling
const repAfterBack = await page.textContent('#rep-btn');
assert(repAfterBack === '0', `counter resets on Back`);

// resets on jumpTo
await page.click('#rep-btn');
await page.click('#rep-btn');
await jumpTo(1); // same exercise, re-entered via home
const repAfterJump = await page.textContent('#rep-btn');
assert(repAfterJump === '0', `counter resets when re-entering via home`);

// ── 5. Back button ───────────────────────────────────────────────────────────
console.log('\n[5] Back button');
// currently at index 1 (Hip rolling), go to index 2
await page.click('button.btn-primary'); // → Glute bridge (2)
await page.click('button.btn-secondary'); // back → Hip rolling (1)
const afterBack1 = await page.textContent('#title');
assert(afterBack1 === 'Hip rolling', `Back: 2→1`);

await page.click('button.btn-secondary'); // back → Hip mobility (0)
const afterBack0 = await page.textContent('#title');
assert(afterBack0 === 'Hip mobility', `Back: 1→0`);

// Back from first exercise → home screen
await page.click('button.btn-secondary');
assert(await page.isVisible('#home-screen'), 'Back from first exercise shows home screen');
assert(!await page.isVisible('#exercise-screen'), 'exercise screen hidden after Back from first');

// ── 6. Home button ────────────────────────────────────────────────────────────
console.log('\n[6] Home button');
await jumpTo(3);
assert(await page.isVisible('#exercise-screen'), 'on exercise screen');
await page.click('button.btn-home');
assert(await page.isVisible('#home-screen'), 'home button shows home screen');
assert(!await page.isVisible('#exercise-screen'), 'exercise screen hidden after home button');

// ── 7. Copenhagen plank timer ─────────────────────────────────────────────────
console.log('\n[7] Copenhagen plank timer');
await jumpTo(4);
const subText = await page.textContent('#sub');
assert(subText === 'Set 1 of 8', `set counter shows "Set 1 of 8" (got "${subText}")`);

const initialMain = await page.textContent('#main');
assert(initialMain === '10s', `timer starts at "10s" (got "${initialMain}")`);

assert(!await page.isVisible('#rep-section'), 'rep counter hidden on timer exercise');

await page.waitForTimeout(2100);
const countedMain = await page.textContent('#main');
const countedSecs = parseInt(countedMain);
assert(countedSecs <= 8 && countedSecs >= 7, `timer counted down to ~8s (got "${countedMain}")`);

// ── 8. Timer cancellation on Next ────────────────────────────────────────────
console.log('\n[8] Timer cancellation on Next');
await page.click('button.btn-primary'); // → Split stance hinge (5)
const afterNavTitle = await page.textContent('#title');
assert(afterNavTitle === 'Split stance hinge', `moved to Split stance hinge`);

const mainSnapshot = await page.textContent('#main');
await page.waitForTimeout(1500);
const mainAfterWait = await page.textContent('#main');
assert(mainSnapshot === mainAfterWait, `#main is static — no stale timer`);

// ── 9. Restart button ─────────────────────────────────────────────────────────
console.log('\n[9] Restart button');
await page.click('button.btn-restart');
const restartTitle = await page.textContent('#title');
assert(restartTitle === 'Hip mobility', `restart goes to exercise 1`);
assert(await page.isVisible('#exercise-screen'), 'stays on exercise screen after restart');

// restart from mid-routine
for (let k = 0; k < 5; k++) await page.click('button.btn-primary'); // → index 5
const midTitle = await page.textContent('#title');
assert(midTitle === 'Split stance hinge', `at Split stance hinge mid-routine`);
await page.click('button.btn-restart');
const afterMidRestart = await page.textContent('#title');
assert(afterMidRestart === 'Hip mobility', `restart from mid-routine → exercise 1`);

// ── 10. Restart cancels running timer ────────────────────────────────────────
console.log('\n[10] Restart cancels running timer');
for (let k = 0; k < 4; k++) await page.click('button.btn-primary'); // → Copenhagen (4)
assert(await page.textContent('#title') === 'Copenhagen plank', `on Copenhagen plank`);

await page.waitForTimeout(1500);
await page.click('button.btn-restart');
assert(await page.textContent('#title') === 'Hip mobility', `restart → Hip mobility`);

const snapAfterRestart = await page.textContent('#main');
await page.waitForTimeout(1500);
const snapAfterWait = await page.textContent('#main');
assert(snapAfterRestart === snapAfterWait, `no stale timer after restart`);

// ── 11. Next from last exercise wraps to first ────────────────────────────────
console.log('\n[11] Wrap-around');
await jumpTo(9);
assert(await page.textContent('#title') === 'Butterfly stretch', `at last exercise`);

await page.click('button.btn-primary');
const afterWrap = await page.textContent('#title');
assert(afterWrap === 'Hip mobility', `Next from last wraps to first (got "${afterWrap}")`);
assert(await page.isVisible('#exercise-screen'), 'stays on exercise screen after wrap');

// ── 12. Reps content ─────────────────────────────────────────────────────────
console.log('\n[12] Reps content');
await jumpTo(1);
assert(await page.textContent('#main') === '10 reps x 3', `Hip rolling: "10 reps x 3"`);

await jumpTo(6);
assert(await page.textContent('#title') === 'Drop jump', `on Drop jump`);
assert(await page.textContent('#main') === '6–8 reps x 2 sets', `Drop jump: "6–8 reps x 2 sets"`);

// ── Summary ──────────────────────────────────────────────────────────────────
await browser.close();

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
