// Journey part 1: onboarding -> sign up -> consent -> camera -> identify -> review -> confirm -> celebration (REAL TEST backend, real provider)
const L = require('./lib'); const fs = require('fs');
(async () => {
  const log = []; const out = {};
  const browser = await L.launch('/tmp/rehearsal/cam/spec003.y4m');
  const { ctx, page } = await L.newCtx(browser, log);
  const stamp = Date.now().toString(36);
  const email = `rehearsal-${stamp}@example.com`, pw = `Reh-${stamp}-Aa1!x`;
  fs.writeFileSync('/tmp/rehearsal/account.json', JSON.stringify({ email, pw }));
  // 1 onboarding
  await page.goto(L.BASE + '/', { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
  await L.shot(page, '01-onboarding');
  const start = page.getByRole('button', { name: /start collecting/i });
  out.onboardingShown = await start.count() > 0;
  await L.shot(page, '02-onboarding-last');
  if (await start.count()) { await start.click(); await page.waitForTimeout(500); }
  out.afterOnboarding = (await L.txt(page)).slice(0, 160);
  // 2 sign up
  await page.goto(L.BASE + '/account/', { waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  await L.shot(page, '03-account');
  const emails = page.getByLabel('Email'), pws = page.getByLabel('Password');
  const n = await emails.count(); out.authForms = n;
  await emails.nth(n - 1).fill(email); await pws.nth(n - 1).fill(pw);
  await page.getByRole('button', { name: /create account/i }).click(); await page.waitForTimeout(3500);
  await L.shot(page, '04-after-signup');
  out.afterSignup = (await L.txt(page)).slice(0, 300);
  // 3 scan, camera
  await page.goto(L.BASE + '/scan/', { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
  const s2 = page.getByRole('button', { name: /start collecting/i }); if (await s2.count()) { await s2.click(); await page.waitForTimeout(300); }
  await L.shot(page, '05-scan');
  out.scanText = (await L.txt(page)).slice(0, 500);
  await page.getByRole('button', { name: '+' }).first().click(); await page.waitForTimeout(1200);
  await L.shot(page, '06-chooser');
  out.chooser = await page.getByRole('button').allInnerTexts();
  await page.getByRole('button', { name: /Open camera|Take photo/ }).first().click(); await page.waitForTimeout(2500);
  await L.shot(page, '07-camera');
  await page.getByRole('button', { name: 'Take photo' }).click(); await page.waitForTimeout(1500);
  await L.shot(page, '08-photo-taken');
  out.afterPhoto = (await L.txt(page)).slice(0, 500);
  // consent
  const send = page.getByRole('button', { name: 'Send photo(s)' });
  out.consentShown = await send.count() > 0;
  const preIdentifyCalls = log.filter(l => l.includes('identify-plant')).length;
  out.callsBeforeConsent = preIdentifyCalls;
  await L.shot(page, '09-consent');
  if (await send.count()) { await send.click(); await page.waitForTimeout(500); }
  const go = page.getByRole('button', { name: /Get Identification/ });
  out.goEnabled = await go.isEnabled();
  await go.click();
  await page.waitForTimeout(500); await L.shot(page, '10-identifying');
  await page.waitForFunction(() => !/Identifying|Preparing/.test(document.body.innerText) , null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await L.shot(page, '11-result');
  out.result = (await L.txt(page)).slice(0, 1800);
  out.resultButtons = (await page.getByRole('button').allInnerTexts()).filter(Boolean);

  const bt = async () => (await page.getByRole('button').allInnerTexts()).filter(Boolean);
  const step = async (name, fn) => { try { await fn(); } catch (e) { out[name + '_ERROR'] = String(e.message).split('\n')[0].slice(0, 200); } };
  // 4 candidate review + confirm
  await step('review', async () => {
    await page.getByRole('button', { name: /Check traits/ }).first().click(); await page.waitForTimeout(1500);
    await L.shot(page, '12-review-traits'); out.reviewText = (await L.txt(page)).slice(-900);
    await page.getByRole('button', { name: /THIS MATCHES MY PLANT/i }).click(); await page.waitForTimeout(3500);
  });
  await L.shot(page, '13-confirmed');
  const dlg = await page.locator('dialog[open]').count(); out.celebrationDialog = dlg;
  if (dlg) { out.celebrationText = (await page.locator('dialog[open]').innerText()).replace(/\n+/g, ' / ').slice(0, 700); await L.shot(page, '14-card-unlock-celebration'); }
  out.afterConfirmText = (await L.txt(page)).slice(-900);
  // dismiss dialog
  await step('dismiss', async () => { const c = page.locator('dialog[open]').getByRole('button').first(); if (await c.count()) { await c.click(); await page.waitForTimeout(500); } });
  // 5 collection / xp / achievements / garden / quests
  for (const [u, n] of [['/herbdex/', '15-collection'], ['/profile/', '16-profile'], ['/garden/', '17-garden'], ['/quests/', '18-quests']]) {
    await page.goto(L.BASE + u, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
    const w = page.getByRole('button', { name: /start collecting/i }); if (await w.count()) { await w.click(); await page.waitForTimeout(300); }
    await L.shot(page, n); out[n] = (await L.txt(page)).slice(0, 700);
  }
  await page.goto(L.BASE + '/quests/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200); await L.shot(page, '19-georgia'); out.georgia = (await L.txt(page)).slice(0, 600);
  await step('georgiaPick', async () => { const g = page.getByText(/georgia/i).first(); out.georgiaVisible = await g.count() > 0; });
  // 6 sign out / sign in persistence
  await page.goto(L.BASE + '/profile/', { waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
  await step('signout', async () => { await page.getByRole('button', { name: /sign out/i }).first().click(); await page.waitForTimeout(2500); });
  await page.goto(L.BASE + '/herbdex/', { waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
  await L.shot(page, '20-signed-out-collection'); out.signedOutCollection = (await L.txt(page)).slice(0, 300);
  await page.goto(L.BASE + '/account/', { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
  await page.getByLabel('Email').first().fill(email); await page.getByLabel('Password').first().fill(pw);
  await page.getByRole('button', { name: /^sign in$/i }).click(); await page.waitForTimeout(3500);
  await L.shot(page, '21-signed-back-in'); 
  await page.goto(L.BASE + '/herbdex/', { waitUntil: 'networkidle' }); await page.waitForTimeout(2500);
  await L.shot(page, '22-collection-after-signin'); out.afterSigninCollection = (await L.txt(page)).slice(0, 700);
  await page.goto(L.BASE + '/profile/', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000);
  await L.shot(page, '23-profile-after-signin'); out.afterSigninProfile = (await L.txt(page)).slice(0, 700);
  await page.goto(L.BASE + '/garden/', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000);
  await L.shot(page, '24-garden-after-signin'); out.afterSigninGarden = (await L.txt(page)).slice(0, 400);
  await ctx.storageState({ path: '/tmp/rehearsal/state.json' });
  fs.writeFileSync(L.EV + '/journey-result.json', JSON.stringify({ out, log }, null, 1));
  console.log(JSON.stringify(out, null, 1)); console.log(log.filter(l=>!/GET \/rest/.test(l)).join('\n'));
  await browser.close();
})();
