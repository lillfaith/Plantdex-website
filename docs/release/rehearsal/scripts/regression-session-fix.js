// Regression for the capture-session lifecycle fix (blockers 1 and 2) against REAL TEST. Build under test: agent/scan/session-lifecycle.
const L = require('./lib2'); const fs = require('fs'); const { devices } = require('playwright');
(async () => {
  const log = [], out = {};
  const browser = await L.launch('/tmp/rehearsal/cam/spec003.y4m');
  const ctx = await browser.newContext({ ...devices['iPhone 13'], permissions: ['camera'], storageState: '/tmp/rehearsal/state-reg3.json' });
  const page = await ctx.newPage();
  page.on('response', async (r) => { const u = r.url(); if (!u.includes('supabase.co')) return; const p = new URL(u).pathname; const m = r.request().method(); let note = '';
    if (/open_capture_session|claim_discovery|identify-plant/.test(p) && m === 'POST') { try { note = (await r.text()).slice(0, 110); } catch {} } log.push(`${m} ${p} ${r.status()} ${note}`); });
  const cnt = (re) => log.filter(l => re.test(l)).length;
  const T = async () => (await page.locator('main').first().innerText({ timeout: 5000 }).catch(() => '')).split('\n').filter(Boolean).join(' / ');
  const sh = n => L.shot(page, 'reg-' + n);
  const nav = async (name) => { const w = page.getByRole('button', { name: /start collecting/i }); if (await w.count()) { await w.click(); await page.waitForTimeout(300); } await page.locator('nav a', { hasText: new RegExp('^' + name + '$') }).first().click(); await page.waitForTimeout(900); };
  await page.goto(L.BASE + '/scan/', { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
  const st = page.getByRole('button', { name: /start collecting/i }); if (await st.count()) await st.click();
  // 1. open the camera and cancel, five times
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: '+' }).first().click(); await page.waitForTimeout(700);
    await page.getByRole('button', { name: /Open camera|Take photo/ }).first().click().catch(() => {}); await page.waitForTimeout(900);
    await page.getByRole('button', { name: 'Cancel' }).first().click().catch(() => {}); await page.waitForTimeout(400);
  }
  out.opensAfter5CameraOpens = cnt(/POST .*open_capture_session/);
  // 2. navigate away and back WITHOUT reloading, then open again
  await nav('Collection'); await nav('Scan');
  await page.getByRole('button', { name: '+' }).first().click(); await page.waitForTimeout(700);
  await page.getByRole('button', { name: /Open camera|Take photo/ }).first().click().catch(() => {}); await page.waitForTimeout(1500);
  out.opensAfterNavigatingAwayAndBack = cnt(/POST .*open_capture_session/);
  // 3. take the photo, decline consent, then accept
  await page.getByRole('button', { name: 'Take photo' }).click(); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Not now' }).click().catch(() => {}); await page.waitForTimeout(600);
  out.identifyPostsAfterDecline = cnt(/POST .*identify-plant/);
  await page.getByRole('button', { name: 'Send photo(s)' }).click(); await page.waitForTimeout(500);
  // 4. network drops during identify
  await ctx.setOffline(true); await page.getByRole('button', { name: /Get Identification/ }).click(); await page.waitForTimeout(5000); await sh('1-offline');
  out.offlineMessage = (await T()).match(/The identification service could not be reached[^/]*/)?.[0] || (await T()).slice(-400);
  out.misleadingMessageShown = /camera session could not be started/i.test(await T());
  await ctx.setOffline(false); await page.waitForTimeout(600);
  const opensBeforeRetry = cnt(/POST .*open_capture_session/);
  // 5. retry WITHOUT retaking the photo
  await page.getByRole('button', { name: /Get Identification/ }).click(); await page.waitForFunction(() => !/Identifying|Preparing/.test(document.body.innerText), null, { timeout: 70000 }).catch(() => {}); await page.waitForTimeout(1500); await sh('2-retry-success');
  out.retryIdentifyPosts = cnt(/POST .*identify-plant/); out.opensDuringRetry = cnt(/POST .*open_capture_session/) - opensBeforeRetry;
  out.retryShowsResult = /Looks like Annual ragweed/.test(await T()); out.retryOffersConfirm = await page.getByRole('button', { name: /Check traits/ }).count() > 0;
  // 6. confirm
  await page.getByRole('button', { name: /Check traits/ }).first().click(); await page.waitForTimeout(1200); await page.getByRole('button', { name: /THIS MATCHES MY PLANT/i }).click(); await page.waitForTimeout(3500); await sh('3-confirmed');
  out.celebration = (await page.locator('dialog[open]').count()) ? (await page.locator('dialog[open]').innerText()).replace(/\n+/g, ' / ').slice(0, 220) : null;
  out.claimCalls = cnt(/POST .*claim_discovery/);
  await page.locator('dialog[open] button').first().click().catch(() => {}); await page.waitForTimeout(400);
  // 7. same plant again: no second reward
  const opensBeforeRepeat = cnt(/POST .*open_capture_session/);
  await nav('Scan'); await page.getByRole('button', { name: '+' }).first().click({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(700);
  await page.getByRole('button', { name: /Open camera|Take photo/ }).first().click().catch(() => {}); await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Take photo' }).click().catch(() => {}); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Get Identification/ }).click(); await page.waitForFunction(() => !/Identifying|Preparing/.test(document.body.innerText), null, { timeout: 70000 }).catch(() => {}); await page.waitForTimeout(1500); await sh('4-repeat');
  const t = await T();
  out.repeatSessionOpensForNewPhoto = cnt(/POST .*open_capture_session/) - opensBeforeRepeat;
  out.repeatAlreadyInCollection = /Already in your collection/.test(t); out.repeatOffersConfirm = await page.getByRole('button', { name: /THIS MATCHES MY PLANT/i }).count();
  out.claimCallsTotal = cnt(/POST .*claim_discovery/);
  await page.goto(L.BASE + '/herbdex/', { waitUntil: 'networkidle' }); await page.waitForTimeout(1800);
  const h = await T(); out.xpLine = h.slice(h.indexOf('Lv.'), h.indexOf('Lv.') + 60); await sh('5-collection');
  out.openSessionResults = log.filter(l => /open_capture_session/.test(l)).map(l => l.replace(/^POST \S+ /, '').slice(0, 60));
  fs.writeFileSync(L.EV + '/reg.json', JSON.stringify({ out, log: log.filter(l => /POST/.test(l) && !/herbdex-action|leaderboard/.test(l)) }, null, 1));
  console.log(JSON.stringify(out, null, 1)); await browser.close();
})();
