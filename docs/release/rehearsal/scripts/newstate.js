// creates a throwaway TEST account via the public signup endpoint and writes a Playwright storageState for it
const fs = require('fs'); const name = process.argv[2];
(async () => {
  const K = fs.readFileSync('/tmp/pv/.anon', 'utf8').trim(), B = 'https://vgjehmwcpavflbfhbbrp.supabase.co';
  const stamp = Date.now().toString(36); const email = `rehearsal-${stamp}@example.com`, pw = `Reh-${stamp}-Aa1!x`;
  const r = await fetch(B + '/auth/v1/signup', { method: 'POST', headers: { apikey: K, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) });
  const j = await r.json(); if (!j.access_token) { console.log('signup failed', JSON.stringify(j).slice(0, 200)); process.exit(1); }
  const session = { access_token: j.access_token, refresh_token: j.refresh_token, token_type: 'bearer', expires_in: j.expires_in, expires_at: j.expires_at, user: j.user };
  fs.writeFileSync(`/tmp/rehearsal/state-${name}.json`, JSON.stringify({ cookies: [], origins: [{ origin: 'http://localhost:4300', localStorage: [{ name: 'sb-vgjehmwcpavflbfhbbrp-auth-token', value: JSON.stringify(session) }, { name: 'plantdex.welcome.done', value: '1' }] }] }));
  const acc = JSON.parse(fs.existsSync('/tmp/rehearsal/accounts.json') ? fs.readFileSync('/tmp/rehearsal/accounts.json') : '[]'); acc.push({ name, email, pw, id: j.user.id }); fs.writeFileSync('/tmp/rehearsal/accounts.json', JSON.stringify(acc, null, 1));
  console.log('created', name, email);
})();
