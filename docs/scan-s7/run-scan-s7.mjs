// Screenshots of the compact consent notice (wording v2) at 320, 375 and 390px, plus the declined state.
// Usage: NEXT_PUBLIC_CAMERA_CAPTURE=on NEXT_PUBLIC_SUPABASE_URL=https://fake-s7.supabase.test NEXT_PUBLIC_SUPABASE_ANON_KEY=fake npx next build
//        node docs/scan-s7/run-scan-s7.mjs
// The identifier is INTERCEPTED; nothing here touches a deployed project.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import assert from 'node:assert/strict';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let f = join('out', decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f) && existsSync(f + '.html')) f += '.html';
  if (!existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
for (const width of [320, 375, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  let sends = 0;
  await page.route('**/functions/v1/identify-plant**', (r) => { if (r.request().method() !== 'OPTIONS') sends++; return r.fulfill({ status: 204 }); });
  await page.route('**/*.supabase.test/**', (r) => r.request().url().includes('identify-plant') ? r.fallback() : r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.goto(`${base}/scan/`);
  const notice = page.locator('[data-ui-placeholder="provider-consent"]');
  await notice.waitFor();
  assert.equal(await page.getByText('Nothing was sent.').count(), 0, 'no "Nothing was sent" before a decision');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'no horizontal scroll');
  const h = await notice.getByRole('heading').boundingBox();
  const box = await notice.boundingBox();
  assert.ok(h.x + h.width <= box.x + box.width, 'heading inside the panel');
  await notice.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `docs/scan-s7/consent-${width}.png`, fullPage: false });
  await page.getByRole('button', { name: 'Not now' }).click();
  await page.getByText('Nothing was sent.').waitFor();
  assert.equal(sends, 0);
  await notice.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `docs/scan-s7/consent-declined-${width}.png`, fullPage: false });
  console.log('PASS', width);
  await ctx.close();
}
await browser.close(); server.close();
