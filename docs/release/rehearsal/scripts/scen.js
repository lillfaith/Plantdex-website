const L = require('/tmp/rehearsal/lib'); const fs = require('fs');
const which = process.argv[2];
const cams = { repeat: 'spec003', library: 'spec003', blank: 'blank', offdeck: 'spec006', denied: 'spec003', offline: 'spec003', notnow: 'spec003', georgia: 'spec003' };
(async () => {
  const log = [], out = { scenario: which };
  const browser = which === 'denied' ? await require('playwright').chromium.launch({ args: ['--use-fake-device-for-media-stream'] }) : await L.launch(`/tmp/rehearsal/cam/${cams[which]}.y4m`);
  const { devices } = require('playwright');
  const ctx = await browser.newContext({ ...devices['iPhone 13'], permissions: which === 'denied' ? [] : ['camera'], storageState: process.env.STATE || '/tmp/rehearsal/state.json' });
  const page = await ctx.newPage();
  page.on('response', async (r) => { const u = r.url(); if (!u.includes('supabase.co')) return; const m = r.request().method(); const p = new URL(u).pathname; let note = '';
    if (/identify-plant|claim_discovery|confirm_scan|seed-packet|scans|sightings|discoveries/.test(p) && m === 'POST') { try { const t = await r.text(); note = t.slice(0, 260); } catch {} }
    log.push(`${m} ${p} ${r.status()} ${note}`); });
  page.on('pageerror', e => log.push('PAGE-ERR ' + e.message.slice(0, 160)));
  const shot = n => L.shot(page, `${which}-${n}`);
  const T = () => L.txt(page);
  const btns = async () => (await page.getByRole('button').allInnerTexts()).filter(Boolean).map(s => s.replace(/\n/g, ' '));
  const step = async (n, f) => { try { await f(); } catch (e) { out[n + '_ERROR'] = String(e.message).split('\n')[0].slice(0, 220); } };
  const openScan = async () => { await page.goto(L.BASE + '/scan/', { waitUntil: 'networkidle' }); await page.waitForTimeout(800); const s = page.getByRole('button', { name: /start collecting/i }); if (await s.count()) { await s.click(); await page.waitForTimeout(300); } };
  const xpLine = async () => { await page.goto(L.BASE + '/herbdex/', { waitUntil: 'networkidle' }); await page.waitForTimeout(1800); const t = await T(); return t.slice(t.indexOf('Lv.'), t.indexOf('Lv.') + 200); };
  const cameraPhoto = async () => { await page.getByRole('button', { name: '+' }).first().click(); await page.waitForTimeout(900); await page.getByRole('button', { name: /Open camera|Take photo/ }).first().click(); await page.waitForTimeout(2200); await page.getByRole('button', { name: 'Take photo' }).click(); await page.waitForTimeout(1200); };
  const consentGo = async () => { const s = page.getByRole('button', { name: 'Send photo(s)' }); if (await s.count()) { await s.click(); await page.waitForTimeout(400); } await page.getByRole('button', { name: /Get Identification/ }).click(); };
  const waitDone = async () => { await page.waitForTimeout(600); await page.waitForFunction(() => !/Identifying|Preparing/.test(document.body.innerText), null, { timeout: 70000 }).catch(() => {}); await page.waitForTimeout(1500); };

  if (which === 'repeat') {
    out.xpBefore = await xpLine();
    await openScan(); await cameraPhoto(); await consentGo(); await waitDone(); await shot('1-result');
    out.result = (await T()).slice(600, 1500);
    await step('confirm', async () => { await page.getByRole('button', { name: /Check traits/ }).first().click(); await page.waitForTimeout(1200); await page.getByRole('button', { name: /THIS MATCHES MY PLANT/i }).click(); await page.waitForTimeout(3500); });
    await shot('2-after-confirm'); out.dialog = await page.locator('dialog[open]').count(); out.dialogText = out.dialog ? (await page.locator('dialog[open]').innerText()).replace(/\n+/g, ' / ').slice(0, 500) : null;
    out.afterConfirm = (await T()).slice(-700);
    out.xpAfter = await xpLine();
  }
  if (which === 'library') {
    await openScan(); await page.getByRole('button', { name: '+' }).first().click(); await page.waitForTimeout(900);
    await page.getByRole('button', { name: /Use a library photo/ }).click(); await page.waitForTimeout(800);
    await page.locator('input[type=file]').first().setInputFiles('/home/user/Plantdex-website/field/spec-003/spec-003_1-habit.jpg'); await page.waitForTimeout(1500);
    await page.locator('input[type=file]').nth(1).setInputFiles('/home/user/Plantdex-website/field/spec-003/spec-003_2-leaf.jpg').catch(()=>{}); await page.waitForTimeout(1500);
    await shot('1-imported'); out.afterImport = (await T()).slice(500, 1300);
    out.goEnabledBeforeConsent = await page.getByRole('button', { name: /Get Identification/ }).isEnabled(); out.btnsAfterImport = await btns();
    await consentGo(); await waitDone(); await shot('2-result');
    out.result = (await T()).slice(600, 1800); out.buttons = await btns();
    out.collectOffered = (await page.getByRole('button', { name: /THIS MATCHES|Collect|Check traits/i }).count());
    out.xpAfter = await xpLine();
  }
  if (which === 'blank') {
    await openScan(); await cameraPhoto(); await consentGo(); await waitDone(); await shot('1-result');
    out.result = (await T()).slice(600, 1800); out.buttons = await btns();
    out.collectOffered = (await page.getByRole('button', { name: /THIS MATCHES|Check traits/i }).count());
    out.xpAfter = await xpLine();
  }
  if (which === 'offdeck') {
    await openScan(); await cameraPhoto(); await consentGo(); await waitDone(); await shot('1-result');
    out.result = (await T()).slice(600, 2000); out.buttons = await btns();
    await step('shelf', async () => { const b = page.getByRole('button', { name: /seed shelf|save/i }).first(); out.shelfButton = await b.count(); if (out.shelfButton) { await b.click(); await page.waitForTimeout(4000); await shot('2-after-shelf'); out.afterShelf = (await T()).slice(-800); } });
    out.xpAfter = await xpLine();
  }
  if (which === 'denied') {
    await openScan(); await page.getByRole('button', { name: '+' }).first().click(); await page.waitForTimeout(900);
    await step('cam', async () => { await page.getByRole('button', { name: /Open camera/ }).click(); await page.waitForTimeout(2500); });
    await shot('1-denied'); out.afterDeny = (await T()).slice(500, 1500); out.buttons = await btns();
  }
  if (which === 'notnow') {
    await page.goto(L.BASE + '/scan/', { waitUntil: 'networkidle' }); await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('plantdex.scan-consent')) localStorage.removeItem(k); });
    await openScan(); await cameraPhoto();
    const before = log.filter(l => /POST .*identify-plant/.test(l)).length;
    await page.getByRole('button', { name: 'Not now' }).click(); await page.waitForTimeout(1500); await shot('1-not-now');
    out.postsAfterNotNow = log.filter(l => /POST .*identify-plant/.test(l)).length - before; out.afterNotNow = (await T()).slice(500, 1300); out.buttons = await btns();
  }
  if (which === 'offline') {
    await openScan(); await cameraPhoto(); const s = page.getByRole('button', { name: 'Send photo(s)' }); if (await s.count()) { await s.click(); await page.waitForTimeout(400); }
    await ctx.setOffline(true); await page.getByRole('button', { name: /Get Identification/ }).click(); await page.waitForTimeout(6000); await shot('1-offline');
    out.offlineMsg = (await T()).slice(600, 1800); out.buttons = await btns();
    await ctx.setOffline(false); await page.waitForTimeout(800);
    await step('retry', async () => { await page.getByRole('button', { name: /Get Identification|Try again|Retry/ }).first().click(); await waitDone(); await shot('2-retry'); out.retryResult = (await T()).slice(600, 1500); });
  }
  if (which === 'georgia') {
    await page.goto(L.BASE + '/quests/', { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
    const w = page.getByRole('button', { name: /start collecting/i }); if (await w.count()) { await w.click(); }
    await page.locator('select').first().selectOption('us-ga'); await page.waitForTimeout(1500);
    await shot('1-georgia'); out.georgia = (await T()).slice(300, 2200);
    await page.evaluate(() => window.scrollTo(0, 900)); await page.waitForTimeout(500); await shot('2-georgia-scrolled');
  }
  out.log = log.filter(l => !/GET \/rest|herbdex-action|leaderboard/.test(l));
  fs.writeFileSync(`${L.EV}/${which}.json`, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 5000));
  await browser.close();
})();
