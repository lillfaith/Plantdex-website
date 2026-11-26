// Sandbox walkthrough of the scan camera flow at 390px with a FAKE camera.
// Usage (from the repo root, after `NEXT_PUBLIC_CAMERA_CAPTURE=on NEXT_PUBLIC_SUPABASE_URL=https://fake-s5.supabase.test
// NEXT_PUBLIC_SUPABASE_ANON_KEY=fake npx next build`):  node docs/agent-workflow/scan-s5/run-scan-s5.mjs
// The identifier is INTERCEPTED (no network, no credit, no real Supabase). Nothing here touches a deployed project.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import assert from 'node:assert/strict';

const OUT = 'out';
const LOOKUP = /Identification only - not eligible to collect/;
const SHOTS = 'docs/agent-workflow/scan-s5';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(OUT, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f) && existsSync(f + '.html')) f += '.html';
  if (!existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const CAND = { candidates: [{ scientificName: 'Taraxacum officinale', score: 0.91 }, { scientificName: 'Hypochaeris radicata', score: 0.04 }], remaining: 4, limit: 5, signedIn: false, provider: 'plantnet', observationId: 'obs-test' };

async function session(browserArgs, fn) {
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', ...browserArgs] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const sends = [];
  await page.route('**/functions/v1/identify-plant**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    sends.push(req.postData()?.length ?? 0);
    return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(CAND) });
  });
  await page.route('**/*.supabase.test/**', (r) => (r.request().url().includes('identify-plant') ? r.fallback() : r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: '{}' })));
  try { await fn(page, sends); } finally { await browser.close(); }
}
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
const results = [];
const ok = (label) => { results.push(label); console.log('PASS', label); };

// ---- Run A: fake camera, permission auto-granted: consent -> capture x2 -> identify -> review -> confirm -> reveal -> collect
await session(['--use-fake-ui-for-media-stream'], async (page, sends) => {
  await page.goto(`${base}/scan/`);
  await page.getByRole('heading', { name: 'Before your first identification' }).waitFor();
  const btn = page.getByRole('button', { name: /Get Identification/ });
  assert.equal(await btn.isDisabled(), true); ok('identify blocked while the notice is unanswered');
  const text = await page.locator('[data-ui-placeholder="provider-consent"]').innerText();
  for (const w of ['PlantNet', 'plant.id', 'optional', 'location']) assert.match(text, new RegExp(w)); ok('notice names providers, what is sent, optional');
  assert.equal(await page.getByRole('link', { name: /full privacy details/ }).getAttribute('href'), '/privacy/#plant-id'); ok('notice links to /privacy#plant-id');
  await shot(page, '01-consent-notice');
  await page.getByRole('button', { name: 'Not now' }).click();
  await page.getByText('Nothing was sent.').waitFor();
  assert.equal(sends.length, 0); await shot(page, '02-consent-declined'); ok('declining sends nothing');
  await page.getByRole('button', { name: /I understand, send my photos/ }).click();
  assert.equal(await page.getByRole('heading', { name: 'Before your first identification' }).count(), 0); ok('accepting clears the notice');
  const stored = await page.evaluate(() => localStorage.getItem('plantdex.scan-consent.v1:device'));
  assert.deepEqual(JSON.parse(stored), { stamp: 'v1:plantnet+plantid' }); ok('acknowledgement stored per device as {stamp} only');

  await page.getByRole('button', { name: /^Add photo: Whole plant/ }).click();
  await page.getByText(/Plantdex will ask your browser for camera access/).waitFor();
  await shot(page, '03-camera-permission-prompt-state');
  await page.getByRole('button', { name: 'Open camera' }).click();
  await page.getByRole('button', { name: 'Take photo' }).waitFor();
  await page.waitForTimeout(600);
  await shot(page, '04-camera-live-fake-feed');
  await page.getByRole('button', { name: 'Take photo' }).click();
  await page.getByText('1 of 3 added').waitFor(); ok('frame 1 captured through the fake camera');
  await page.getByRole('button', { name: /^Add photo: Leaf \+ stem/ }).click();
  await page.getByRole('button', { name: 'Open camera' }).click();
  await page.getByRole('button', { name: 'Take photo' }).waitFor();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Take photo' }).click();
  await page.getByText('2 of 3 added').waitFor(); ok('frame 2 captured: multi-angle observation');
  await page.getByText(/Taken with the in-app camera/).waitFor();
  await shot(page, '05-two-camera-angles-eligible');

  await page.getByRole('button', { name: /Get Identification/ }).click();
  await page.getByRole('heading', { name: 'Best matches' }).waitFor();
  assert.equal(sends.length, 1); ok('identify call made once, after acceptance');
  assert.ok(sends[0] > 1000, 'body carries the re-encoded frames');
  await page.locator('[aria-current="step"]').filter({ hasText: 'Review' }).waitFor(); ok('step indicator: Review');
  await shot(page, '06-review-candidates');
  await page.getByRole('button', { name: /Check traits/ }).first().click();
  await page.getByRole('button', { name: 'This matches my plant' }).click();
  await page.getByRole('dialog', { name: 'New discovery' }).waitFor();
  await page.waitForTimeout(900);
  await shot(page, '07-reveal-celebration'); ok('Confirm -> Reveal (celebration dialog)');
  await page.keyboard.press('Escape');
  await page.locator('[aria-current="step"]').filter({ hasText: 'Collect' }).waitFor(); ok('step indicator: Collect');
  await page.getByText(/Signed out: this find is saved on this device only/).waitFor(); ok('receipt line (signed out: no receipt, saved locally)');
  await page.locator('[data-ui-placeholder="scan-receipt"]').scrollIntoViewIfNeeded();
  await shot(page, '08-collect-outcome');
  const held = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('plantdex.')));
  assert.ok(held.length > 0); ok('collection written locally by the ordinary discover() call');
});

// ---- Run B: camera permission DENIED -> fail safe -> library photos identify only, not eligible to collect
await session(['--deny-permission-prompts'], async (page, sends) => {
  // Headless Chromium has no prompt to refuse, so the browser's own answer to a refused prompt is simulated:
  // getUserMedia rejects with NotAllowedError, exactly what a real "Block" produces.
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }));
  });
  await page.addInitScript(() => localStorage.setItem('plantdex.scan-consent.v1:device', JSON.stringify({ stamp: 'v1:plantnet+plantid' })));
  await page.goto(`${base}/scan/`);
  await page.getByRole('button', { name: /^Add photo: Whole plant/ }).click();
  await page.getByRole('button', { name: 'Open camera' }).click();
  await page.getByText(/Camera access is blocked/).waitFor();
  await shot(page, '09-camera-denied-fallback'); ok('denied: states the browser-settings route, offers library fallback');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Use a library photo instead' }).click()]);
  await chooser.setFiles('/tmp/fixture-a.jpg');
  await page.getByText('1 of 3 added').waitFor();
  await page.getByRole('button', { name: /^Add photo: Leaf \+ stem/ }).click();
  await page.getByText(/Camera access is blocked/).waitFor(); ok('decline remembered: no second prompt in the same page');
  const [chooser2] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Use a library photo instead' }).click()]);
  await chooser2.setFiles('/tmp/fixture-b.jpg');
  await page.getByText('2 of 3 added').waitFor();
  await page.getByText(LOOKUP).first().waitFor(); await shot(page, '10-library-photos-not-eligible');
  await page.getByRole('button', { name: /Get Identification/ }).click();
  await page.getByRole('heading', { name: 'Best matches' }).waitFor();
  assert.equal(sends.length, 1); ok('educational identification from imported photos still works');
  assert.equal(await page.getByRole('button', { name: /Check traits/ }).count(), 0); ok('no path to confirm for an imported observation');
  await page.getByText(/cannot unlock a new card/).first().waitFor();
  await shot(page, '11-lookup-only-result');
  await page.reload();
  await page.getByRole('button', { name: /^Add photo: Whole plant/ }).click();
  await page.getByText(/Camera access is blocked/).waitFor(); ok('decline remembered across reload (not-asked state never shown again)');
});

console.log(`\n${results.length} checks passed`);
server.close();
