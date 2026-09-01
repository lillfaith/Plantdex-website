/**
 * Drive the REAL scan screen in a REAL browser against the REAL function.
 *
 * WHY THIS EXISTS. Everything checking Plant ID so far used curl: the matcher is unit
 * tested, the function is called with `curl -F`, and the served bundle is read as text.
 * Curl sends no preflight, runs no JavaScript, and renders nothing — so the entire path a
 * player actually takes (pick a photo -> prepareImage -> functions.invoke -> parse -> render)
 * had never once been executed end to end. A bug living anywhere in that path is invisible
 * to every check that exists, which is exactly where "it says Identifying… and then nothing
 * happens" was reported from.
 *
 * THE ASSERTION IS THE REPORTED BUG. After a scan settles the panel must say something —
 * and the player must be able to SEE it. The first version of this file checked only the
 * first half, and passed on the very bug it was written to catch: the answer rendered
 * perfectly, below the fold and behind the fixed bottom nav, on every phone-sized viewport.
 * "Present in the DOM" is not the claim worth making about a screen. So it is measured
 * against the nav's top edge, not against innerHeight — a region can end inside the viewport
 * and still be completely hidden.
 *
 * Usage: node scripts/live_scan_browser.mjs <site base url> <path to a jpeg>
 */

import { createRequire } from 'node:module';

const require = createRequire(process.env.NODE_MODULES_ROOT ?? `${process.cwd()}/`);
const { chromium } = require('playwright');

const [, , baseArg, photo] = process.argv;
if (!baseArg || !photo) {
  console.log('usage: node scripts/live_scan_browser.mjs <site base url> <photo.jpg>');
  process.exit(2);
}
const base = baseArg.replace(/\/$/, '');
const scanUrl = `${base}/scan/`;

// The sentence that ends the unconditional caution. Everything after it is the panel's
// answer to the player, which is the thing that must not be empty.
const CAUTION_TAIL = 'including a certain-looking one from a phone.';

const browser = await chromium.launch({
  args: ['--no-sandbox'],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
/*
 * 390x720, not the 844 a headless iPhone preset gives you. A real Safari viewport is
 * roughly 120px shorter than the device once the URL bar and home indicator are subtracted,
 * and that missing 120px is the entire difference between this bug being caught and being
 * shipped: at 844 the answer clears the fold, at 720 it does not.
 */
const page = await browser.newPage({ viewport: { width: 390, height: 720 } });

const notes = [];
page.on('pageerror', (error) => notes.push(`PAGE ERROR  ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') notes.push(`console.error  ${message.text()}`);
});
page.on('requestfailed', (request) =>
  notes.push(`REQUEST FAILED  ${request.method()} ${request.url()} :: ${request.failure()?.errorText}`),
);
page.on('response', async (response) => {
  const url = response.url();
  if (!url.includes('/functions/v1/')) return;
  let body = '';
  try {
    body = (await response.text()).slice(0, 600);
  } catch {
    body = '<body unreadable>';
  }
  notes.push(`FUNCTION RESPONSE  ${response.status()} ${url}\n    ${body}`);
});

console.log(`opening ${scanUrl}`);
await page.goto(scanUrl, { waitUntil: 'networkidle', timeout: 60_000 });

const input = page.locator('#scan-photo');
if ((await input.count()) === 0) {
  console.log('::error::No file input on the scan page — the screen did not render.');
  await browser.close();
  process.exit(1);
}

await input.setInputFiles(photo);
console.log('photo submitted; waiting for the panel to settle');

// Long enough for a real provider round trip on a cold function.
await page.waitForTimeout(45_000);

const label = (await page.locator('label[for="scan-photo"]').innerText()).trim();
const main = await page.locator('main').innerText();
const after = main.includes(CAUTION_TAIL) ? main.split(CAUTION_TAIL)[1] : '';
// The account note is static and always present, so it does not count as an answer.
const answer = after.split('You can scan without an account')[0].trim();

console.log(`\nbutton label after settling: "${label}"`);
console.log(`\n--- notes ---\n${notes.length ? notes.join('\n') : '(none)'}`);
console.log(`\n--- what the panel says ---\n${answer || '(NOTHING)'}`);

await page.screenshot({ path: 'live-scan.png', fullPage: true });

let failed = false;

if (!answer) {
  console.log(
    '::error::The scan produced no answer at all — neither a result nor a stated problem.',
  );
  failed = true;
}
if (label.toLowerCase().includes('identifying')) {
  console.log('::error::The button never came out of its busy state.');
  failed = true;
}

/*
 * Is the answer where the player is looking? The bottom nav is `fixed` on phones, so the
 * usable floor is its top edge, not innerHeight. Measured inside the page, because a
 * bounding box read from the driver and corrected for scroll is exactly the sort of
 * arithmetic that reports -105px and sends you chasing a bug that is not there.
 */
if (!failed) {
  const seen = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Primary"]');
    const navBox = nav?.getBoundingClientRect();
    const floor =
      nav && getComputedStyle(nav).position === 'fixed' ? navBox.top : window.innerHeight;
    const caution = document.querySelector('aside[role="note"]');
    const panels = [...document.querySelectorAll('section.panel, aside[role="note"]')];
    // The answer is whatever panel follows the caution.
    const index = panels.indexOf(caution);
    const answerPanel = index === -1 ? null : panels[index + 1];
    const visible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.top < floor;
    };
    return {
      floor: Math.round(floor),
      cautionVisible: visible(caution),
      cautionTop: caution ? Math.round(caution.getBoundingClientRect().top) : null,
      answerVisible: visible(answerPanel),
      answerTop: answerPanel ? Math.round(answerPanel.getBoundingClientRect().top) : null,
    };
  });

  console.log(
    `\nvisibility: usable floor y=${seen.floor}; caution top y=${seen.cautionTop} ` +
      `(${seen.cautionVisible ? 'visible' : 'HIDDEN'}); answer top y=${seen.answerTop} ` +
      `(${seen.answerVisible ? 'visible' : 'HIDDEN'})`,
  );

  if (!seen.answerVisible) {
    console.log(
      '::error::The answer rendered but is off screen or behind the bottom nav. To the ' +
        'player this looks exactly like nothing happening.',
    );
    failed = true;
  }
  if (!seen.cautionVisible) {
    // The caution is placed above the answer so it is read WITH it. An answer on screen
    // without it is a safety regression, not a scrolling detail.
    console.log('::error::The answer is visible but the safety caution is not.');
    failed = true;
  }
}

await browser.close();

if (failed) process.exit(1);
console.log('\nThe scan answered the player, where the player could see it.');
