const { chromium, devices } = require('playwright');
const fs = require('fs');
const BASE = 'http://localhost:4301';
const EV = '/tmp/rehearsal/ev';
exports.BASE = BASE; exports.EV = EV;
exports.launch = async (y4m) => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + y4m] });
  return browser;
};
exports.newCtx = async (browser, log) => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], permissions: ['camera'] });
  ctx.on('request', () => {});
  const page = await ctx.newPage();
  page.on('response', async (r) => {
    const u = r.url();
    if (!u.includes('supabase.co')) return;
    const p = new URL(u).pathname + (u.includes('?') ? '?…' : '');
    let note = '';
    if (u.includes('identify-plant') && r.request().method() === 'POST') {
      try { const j = await r.json(); note = JSON.stringify({ cands: (j.candidates || []).map(c => [c.scientificName, c.score, !!(c.captureReceipt || c.receipt)]).slice(0, 5), keys: Object.keys(j) }); } catch {}
    }
    log.push(`${r.request().method()} ${p} ${r.status()} ${note}`);
  });
  page.on('console', m => { if (m.type() === 'error') log.push('CONSOLE-ERR ' + m.text().slice(0, 200)); });
  page.on('pageerror', e => log.push('PAGE-ERR ' + e.message.slice(0, 200)));
  return { ctx, page };
};
exports.shot = (page, name) => page.screenshot({ path: `${EV}/${name}.png` });
exports.txt = async (page) => (await page.locator('main').first().innerText({ timeout: 5000 }).catch(() => page.locator('body').innerText())).split('\n').filter(Boolean).join(' / ');
