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
 * THE ASSERTION IS THE REPORTED BUG. After a scan settles, the panel must SAY something —
 * a result or a stated problem. Silence is the failure, whatever caused it. Anything else
 * this prints (console errors, the response body, the network status) is diagnosis; the
 * silence check is the test.
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
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

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

await browser.close();

if (!answer) {
  console.log(
    '::error::The scan produced no visible answer — neither a result nor a stated problem. ' +
      'This is the reported bug reproduced.',
  );
  process.exit(1);
}
if (label.toLowerCase().includes('identifying')) {
  console.log('::error::The button never came out of its busy state.');
  process.exit(1);
}
console.log('\nThe scan answered the player.');
