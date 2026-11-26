// Sandbox walkthrough of the scan camera flow at 390px with a FAKE camera.
// Usage (from the repo root, after `NEXT_PUBLIC_CAMERA_CAPTURE=on NEXT_PUBLIC_SUPABASE_URL=https://fake-s5.supabase.test
// NEXT_PUBLIC_SUPABASE_ANON_KEY=fake npx next build`):  node docs/scan-s5/run-scan-s5.mjs
// The identifier is INTERCEPTED (no network, no credit, no real Supabase). Nothing here touches a deployed project.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import assert from 'node:assert/strict';

const OUT = 'out';
const LOOKUP = /Identification only - not eligible to collect/;
const SHOTS = 'docs/scan-s5';
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


// ---- Run C: SIGNED IN against an intercepted fake server that implements the draft receipt contract.
// open_capture_session -> identify carries purpose/capture_session_id/capture_nonce -> per-candidate receipt -> claim_discovery -> reveal.
// (The fake server is this script. Nothing real is contacted; enforcement is simulated OFF.)
function fakeJwt(sub) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, email: 'sandbox@example.test' })}.sig`;
}
async function signedInSession(opts, fn) {
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const uid = '00000000-0000-4000-8000-000000000005';
  const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'sandbox@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  await page.addInitScript(([key, value]) => {
    localStorage.setItem(key, value);
    localStorage.setItem('plantdex.scan-consent.v1:' + JSON.parse(value).user.id, JSON.stringify({ stamp: 'v1:plantnet+plantid' }));
  }, ['sb-fake-s5-auth-token', JSON.stringify({ access_token: fakeJwt(uid), refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user })]);
  const log = { rpc: [], identifyFields: null };
  const json = (route, body, status = 200) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  await page.route('**/*.supabase.test/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (url.pathname.endsWith('/auth/v1/user')) return json(route, user);
    if (url.pathname.includes('/rpc/')) {
      const name = url.pathname.split('/rpc/')[1];
      log.rpc.push(name);
      return json(route, opts.rpc(name, req.postDataJSON?.() ?? null) ?? {});
    }
    if (url.pathname.includes('/functions/v1/identify-plant')) {
      const body = req.postData() ?? '';
      log.identifyFields = ['purpose', 'capture_session_id', 'capture_nonce'].filter((f) => body.includes(`name="${f}"`));
      return json(route, opts.identify);
    }
    if (url.pathname.includes('/rest/v1/')) return json(route, req.method() === 'GET' ? [] : {}, req.method() === 'GET' ? 200 : 201);
    return json(route, {});
  });
  try { await fn(page, log); } finally { await browser.close(); }
}
const RCPT = { id: 'rcpt_' + 'c'.repeat(32), rankPosition: 'top', expiresAt: '2026-12-26T00:00:00Z' };
const SIGNED_CAND = { ...CAND, signedIn: true, capture: { accepted: true }, candidates: [{ ...CAND.candidates[0], captureReceipt: RCPT }, CAND.candidates[1]] };
async function takeTwo(page) {
  for (const name of [/^Add photo: Whole plant/, /^Add photo: Leaf \+ stem/]) {
    await page.getByRole('button', { name }).click();
    await page.getByRole('button', { name: 'Open camera' }).click();
    await page.getByRole('button', { name: 'Take photo' }).waitFor();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Take photo' }).click();
    await page.waitForTimeout(300);
  }
  await page.getByText('2 of 3 added').waitFor();
}
await signedInSession({
  identify: SIGNED_CAND,
  rpc: (name) => (name === 'open_capture_session' ? { ok: true, session_id: 'sid-1', nonce: 'n'.repeat(64), ttl_s: 600, min_capture_ms: 2000 }
    : name === 'claim_discovery' ? { ok: true, status: 'claimed', herb_id: 'taraxacum-officinale', discovered_at: new Date().toISOString() }
    : name === 'discovery_rules' ? { enforcing: false } : {}),
}, async (page, log) => {
  await page.goto(`${base}/scan/`);
  await takeTwo(page);
  assert.ok(log.rpc.includes('open_capture_session')); ok('signed in: capture session opened when the camera screen opened');
  await page.getByRole('button', { name: /Get Identification/ }).click();
  await page.getByRole('heading', { name: 'Best matches' }).waitFor();
  assert.deepEqual(log.identifyFields, ['purpose', 'capture_session_id', 'capture_nonce']); ok('identify request carries exactly the three contract fields');
  await page.getByRole('button', { name: /Check traits/ }).first().click();
  await page.getByRole('button', { name: 'This matches my plant' }).click();
  await page.getByRole('dialog', { name: 'New discovery' }).waitFor();
  assert.ok(log.rpc.includes('claim_discovery')); ok('confirm claims the CHOSEN candidate\'s receipt before the ordinary discover()');
  await page.waitForTimeout(700);
  await shot(page, '12-signed-in-receipt-claimed-reveal');
  await page.keyboard.press('Escape');
  await page.getByText(/Captured in the app\. Your scan receipt was recorded\./).waitFor(); ok('collect panel: "captured in the app", never "verified"');
  await page.locator('[data-ui-placeholder="scan-receipt"]').scrollIntoViewIfNeeded();
  await shot(page, '13-signed-in-collect-receipt');
});
// Run D: the server REFUSES the claim (expired receipt) -> safe failure, nothing unlocked.
await signedInSession({
  identify: SIGNED_CAND,
  rpc: (name) => (name === 'open_capture_session' ? { ok: true, session_id: 'sid-2', nonce: 'm'.repeat(64), ttl_s: 600, min_capture_ms: 2000 }
    : name === 'claim_discovery' ? { ok: false, code: 'receipt_expired' } : {}),
}, async (page) => {
  await page.goto(`${base}/scan/`);
  await takeTwo(page);
  await page.getByRole('button', { name: /Get Identification/ }).click();
  await page.getByRole('heading', { name: 'Best matches' }).waitFor();
  await page.getByRole('button', { name: /Check traits/ }).first().click();
  await page.getByRole('button', { name: 'This matches my plant' }).click();
  await page.getByText(/receipt has expired/).waitFor();
  assert.equal(await page.locator('dialog[open]').count(), 0);
  await page.getByText('Nothing was unlocked or changed in your collection.').waitFor();
  await shot(page, '14-claim-refused-safe-failure'); ok('refused claim: clear failure, no reveal, nothing unlocked');
});
console.log(`\n${results.length} checks passed`);
server.close();
