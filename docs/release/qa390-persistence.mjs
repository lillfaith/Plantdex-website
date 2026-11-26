// V1 QA, coord/v1-qa: signed-out persistence walkthrough at 390px against a built export. Usage: npm run build && node docs/release/qa390-persistence.mjs
// Serves ./out on localhost:4399 (no base path: only valid when SITE_DOMAIN is unset and not on GitHub Pages) and drives Chromium. Writes screenshots to /tmp/claude-0/shots (create it first).
import { createRequire } from 'node:module';
// Playwright is preinstalled globally in the QA sandbox and is not a dependency of this repo.
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = '' + process.cwd() + '/out';
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.txt':'text/plain','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv = http.createServer((req,res)=>{ let p = decodeURIComponent(req.url.split('?')[0]); let f = path.join(ROOT,p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f,'index.html');
  else if (!fs.existsSync(f) && fs.existsSync(f+'.html')) f += '.html';
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(res); });
(async()=>{
  await new Promise(r=>srv.listen(4399,r));
  const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:390,height:844}, deviceScaleFactor:1});
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  const base='http://localhost:4399';
  // skip the welcome intro/walkthrough noise by dismissing if present
  await page.goto(base+'/herbdex/taraxacum-officinale/'); await page.waitForTimeout(1500);
  const state = async()=> page.evaluate(()=>{ const out={}; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); if(k.startsWith('plantdex.herbdex')) out[k]=localStorage.getItem(k);} return out; });
  console.log('before:', JSON.stringify(await state()).slice(0,200));
  await page.screenshot({path:'/tmp/claude-0/shots/1-locked.png'});
  const btns = await page.locator('button').allInnerTexts(); console.log('buttons:', btns.slice(0,12).join(' | '));
  const found = page.getByRole('button',{name:/found|discover/i}).first();
  await found.click({timeout:5000}).catch(e=>console.log('click1 fail',String(e).slice(0,100)));
  await page.getByRole('button',{name:/Yes, I found it/i}).click({timeout:5000}).catch(e=>console.log('click2 fail',String(e).slice(0,100)));
  await page.waitForTimeout(1200);
  await page.screenshot({path:'/tmp/claude-0/shots/2-after-discover.png'});
  const s1 = await state(); const parsed = JSON.parse(Object.values(s1)[0]||'{}');
  console.log('after discover keys:', Object.keys(s1), 'discoveries:', Object.keys(parsed.discoveries||{}), 'achievements:', Object.keys(parsed.achievements||{}));
  await page.reload(); await page.waitForTimeout(1500);
  const s2 = JSON.parse(Object.values(await state())[0]||'{}');
  console.log('after reload discoveries:', Object.keys(s2.discoveries||{}), 'first-find:', !!(s2.achievements||{})['first-find']);
  await page.goto(base+'/herbdex/'); await page.waitForTimeout(1500);
  console.log('herbdex text has XP:', /XP/.test(await page.locator('body').innerText()), 'overflowX:', await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth));
  await page.screenshot({path:'/tmp/claude-0/shots/3-herbdex.png'});
  await page.goto(base+'/garden/'); await page.waitForTimeout(1500);
  console.log('garden overflowX:', await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth), 'sprout label:', /sprout/i.test(await page.locator('body').innerText()));
  await page.screenshot({path:'/tmp/claude-0/shots/4-garden.png'});
  await page.goto(base+'/profile/'); await page.waitForTimeout(1500);
  const pt=await page.locator('body').innerText(); console.log('profile: Amber|Laurel|Field Notes|Frame ->', ['Amber Ring','Laurel','Field Notes','Frame'].map(w=>w+':'+pt.includes(w)).join(' ')); await page.getByText('Edit profile').first().click().catch(()=>{}); await page.waitForTimeout(800); const et=await page.locator('body').innerText(); console.log('editor: Amber Ring present:', et.includes('Amber Ring'), '| Laurel present:', et.includes('Laurel'), '| locked hint:', /Discover 10 plants/.test(et)); await page.screenshot({path:'/tmp/claude-0/shots/6-editor.png'});
  console.log('page errors:', errs.length, errs.slice(0,2));
  await b.close(); srv.close();
})();
