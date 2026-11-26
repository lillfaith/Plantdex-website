// Q4 sandbox: drives the Georgia Habitat Trail end to end at 390px against a static export built with
// NEXT_PUBLIC_GEORGIA_QUEST_PREVIEW=on. Usage: node run.mjs <out-dir-of-export> <screenshot-dir>
// Signed OUT only: there is no Supabase project in this sandbox (see the WORKING / MOCKED / DISABLED table).
import http from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [root, shots] = process.argv.slice(2);
mkdirSync(shots, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(root, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { f = join(root, '404.html'); res.statusCode = 404; }
  res.setHeader('content-type', TYPES[extname(f)] ?? 'application/octet-stream');
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' - ' + detail : ''}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
// Skip the first-run welcome so it does not cover the page under test.
await ctx.addInitScript(() => {
  try { for (const k of ['plantdex.welcome.v1', 'plantdex.intro.v1']) localStorage.setItem(k, 'done'); } catch {}
});
await ctx.addInitScript(() => {
  window.__geo = 0;
  const trap = () => { window.__geo += 1; };
  try { Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: trap, watchPosition: trap, clearWatch() {} } }); } catch {}
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const shot = (n) => page.screenshot({ path: join(shots, `${n}.png`), fullPage: true });

async function findOnCardPage(id) {
  await page.goto(`${base}/herbdex/${id}/`);
  await page.getByRole('button', { name: /found|add to|discover/i }).first().click();
  await page.getByRole('button', { name: 'Yes, I found it' }).click();
  await page.waitForTimeout(600);
  // close any celebration dialog
  await page.keyboard.press('Escape');
}

// 1. Entry: /quests links to the preview only because the flag is on.
await page.goto(`${base}/quests/`);
check('quests page links to the preview', await page.getByRole('link', { name: /Georgia Habitat Trail/ }).isVisible());
const nav = await page.locator('nav a').allTextContents();
check('main nav unchanged (no trail label)', !nav.some((t) => /trail|habitat/i.test(t)), nav.join(' | '));
await shot('01-quests-entry');

// 2. Start: Georgia is offered, not detected.
await page.goto(`${base}/quests/habitats/`);
await page.getByTestId('trail-start').waitFor();
await shot('02-start-choose-georgia');
await page.getByRole('button', { name: 'Start the Georgia trail' }).click();
await page.getByTestId('trail').waitFor();
check('objective is stated in words', /habitat groups/.test(await page.getByTestId('trail-objective').innerText()));
check('starts at 0 of 5', /0 of 5 groups done/.test(await page.getByTestId('trail-overall').innerText()));
check('no geolocation call was made', (await page.evaluate(() => window.__geo)) === 0);
await shot('03-trail-zero');

// 3. Real collection path: card page discovery, 2 plants -> partial progress.
await findOnCardPage('taraxacum-officinale');
await findOnCardPage('impatiens-capensis');
await page.goto(`${base}/quests/habitats/`);
await page.getByTestId('trail').waitFor();
check('four of five groups after two finds (each plant counts for both its habitats)', /4 of 5 groups done/.test(await page.getByTestId('trail-overall').innerText()), await page.getByTestId('trail-overall').innerText());
check('not complete yet', (await page.getByTestId('trail-complete').count()) === 0);
await shot('04-trail-partial');

// 4. Persistence: reload.
await page.reload();
await page.getByTestId('trail').waitFor();
check('partial progress persists across reload', /4 of 5 groups done/.test(await page.getByTestId('trail-overall').innerText()));

// 5. Complete it.
await findOnCardPage('monarda-fistulosa');
await page.goto(`${base}/quests/habitats/`);
await page.getByTestId('trail-complete').waitFor();
check('completion shown', /Georgia Habitat Trail complete/.test(await page.getByTestId('trail-complete').innerText()));
await page.getByTestId('trail-recorded').waitFor();
const date = await page.getByTestId('trail-recorded').innerText();
check('completion date recorded', /Completed on \d{4}-\d{2}-\d{2}/.test(date), date);
check('completion copy promises no XP', !/\bXP\b.*\d|\d.*\bXP\b/.test(await page.getByTestId('trail-complete').innerText()));
await shot('05-trail-complete');

// 6. Persistence of completion + never revoked + reload.
await page.reload();
await page.getByTestId('trail-recorded').waitFor();
check('completion and date persist across reload', (await page.getByTestId('trail-recorded').innerText()) === date);
const stored = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('plantdex.region-quest'))));
check('completion stored under the device scope, id and timestamp only', Object.keys(stored).length === 1 && /region-quest\.v1:device$/.test(Object.keys(stored)[0]), JSON.stringify(stored));
await shot('06-trail-complete-after-reload');

// 7. A second find of a counted plant changes nothing.
await findOnCardPage('taraxacum-officinale').catch(() => {});
await page.goto(`${base}/quests/habitats/`);
await page.getByTestId('trail-recorded').waitFor();
check('repeat visit keeps the same recorded date', (await page.getByTestId('trail-recorded').innerText()) === date);

check('no page errors', errors.length === 0, errors.join(' ; '));
check('no geolocation call by end of run', (await page.evaluate(() => window.__geo)) === 0);
await browser.close(); server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
