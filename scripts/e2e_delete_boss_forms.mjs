#!/usr/bin/env node
/**
 * LIVE ACCOUNT-DELETION CHECK FOR THE BOSS FORM TABLES. TEST PROJECT ONLY.
 *
 * The browser cannot write `challenge_completions` or `boss_forms` (that is the point of them), so
 * seeding rows needs a server-side path. This script uses the Supabase Management API's SQL
 * endpoint with the access token the migration workflow already uses, against ONE hard-coded
 * project: the test project. It refuses to start for any other ref, and every URL below is built
 * from that constant, never from an argument.
 *
 * What it does, with disposable accounts only:
 *   A  has rows in BOTH tables (and ordinary progression)      -> deleted through the REAL function
 *   B  has rows in challenge_completions ONLY                  -> deleted
 *   C  has a row in boss_forms ONLY                            -> deleted
 *   D  has rows in NEITHER                                     -> deleted
 *   E  a bystander with rows in both tables and progression    -> must be UNTOUCHED, then removed last
 * and then proves, by reading the database back, that nothing of A-D remains and nothing of E moved.
 *
 * Env: PROJECT_REF (must equal the test ref), SUPABASE_ACCESS_TOKEN (never printed).
 */

const TEST_REF = 'vgjehmwcpavflbfhbbrp';
const PRODUCTION_REF = 'vygiamigomwlvnwkryyl';
const REF = process.env.PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (REF !== TEST_REF || REF === PRODUCTION_REF) {
  console.error(`Refusing to run: PROJECT_REF must be the TEST project (${TEST_REF}), got '${REF}'.`);
  process.exit(2);
}
if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is not set.');
  process.exit(2);
}

const BASE = `https://${TEST_REF}.supabase.co`;
const MGMT = `https://api.supabase.com/v1/projects/${TEST_REF}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HERB = 'taraxacum-officinale';
const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  -> ${detail}`}`);
}

async function sql(query) {
  const res = await fetch(`${MGMT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const keys = await (await fetch(`${MGMT}/api-keys`, { headers: { Authorization: `Bearer ${TOKEN}` } })).json();
const ANON = keys.find((k) => k.name === 'anon')?.api_key;
if (!ANON) throw new Error('Could not read the anon key.');

async function post(path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html or empty */ }
  return { status: res.status, text, json };
}

async function newUser(tag) {
  const email = `plantdex-e2e-del-${tag}-${stamp}@mailinator.com`;
  const password = `Test-Passw0rd-${Math.random().toString(36).slice(2, 10)}`;
  const up = await post('/auth/v1/signup', { email, password });
  if (up.status >= 400) throw new Error(`signup ${tag} failed: HTTP ${up.status}`);
  const inn = await post('/auth/v1/token?grant_type=password', { email, password });
  if (inn.status !== 200) throw new Error(`signin ${tag} failed: HTTP ${inn.status}`);
  const id = inn.json.user.id;
  if (!UUID.test(id)) throw new Error('unexpected user id shape');
  return { tag, email, password, id, token: inn.json.access_token };
}

async function callDelete(token, opts = {}) {
  for (let i = 0; i < 10; i += 1) {
    const res = await fetch(`${BASE}/functions/v1/delete-account`, {
      method: opts.method ?? 'POST',
      headers: { apikey: ANON, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const text = await res.text();
    // "JWT issued at future": two clocks disagreeing by a moment. Retried only for that message.
    if (res.status === 401 && /issued at future/i.test(text)) { await new Promise((r) => setTimeout(r, 2000)); continue; }
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, text, json };
  }
  throw new Error('token still refused as issued in the future');
}

const count = async (table, id) =>
  Number((await sql(`select count(*)::int as n from public.${table} where user_id = '${id}'`))[0].n);
const userExists = async (id) =>
  Number((await sql(`select count(*)::int as n from auth.users where id = '${id}'`))[0].n) === 1;

async function seed(u, { completions = 0, boss = false, progression = false }) {
  if (!UUID.test(u.id)) throw new Error('bad id');
  const acts = ['part-spotter', 'compare', 'habitat-season'].slice(0, completions);
  if (acts.length) {
    await sql(`insert into public.challenge_completions (user_id, herb_id, activity_id) values ${acts.map((a) => `('${u.id}','${HERB}','${a}')`).join(',')}`);
  }
  if (boss) await sql(`insert into public.boss_forms (user_id, herb_id) values ('${u.id}','${HERB}')`);
  if (progression) {
    await sql(`insert into public.discoveries (user_id, herb_id, discovered_at) values ('${u.id}','${HERB}', now())`);
    await sql(`insert into public.learned (user_id, herb_id, learned_at) values ('${u.id}','${HERB}', now())`);
    await sql(`insert into public.mastered (user_id, herb_id, mastered_at) values ('${u.id}','${HERB}', now())`);
  }
}

console.log(`Target: TEST project ${TEST_REF} (production ${PRODUCTION_REF} is never contacted)`);

// ── Disposable accounts ─────────────────────────────────────────────────────────
const A = await newUser('both');
const B = await newUser('completions-only');
const C = await newUser('bossform-only');
const D = await newUser('neither');
const E = await newUser('bystander');
await new Promise((r) => setTimeout(r, 3000));

await seed(A, { completions: 3, boss: true, progression: true });
await seed(B, { completions: 2 });
await seed(C, { boss: true });
// D has nothing in either table.
await seed(E, { completions: 3, boss: true, progression: true });

check('seed: A has rows in both tables', (await count('challenge_completions', A.id)) === 3 && (await count('boss_forms', A.id)) === 1);
check('seed: B has completions only', (await count('challenge_completions', B.id)) === 2 && (await count('boss_forms', B.id)) === 0);
check('seed: C has a Boss Form only', (await count('challenge_completions', C.id)) === 0 && (await count('boss_forms', C.id)) === 1);
check('seed: D has neither', (await count('challenge_completions', D.id)) === 0 && (await count('boss_forms', D.id)) === 0);

const bystanderBefore = {
  completions: await count('challenge_completions', E.id),
  boss: await count('boss_forms', E.id),
  discoveries: await count('discoveries', E.id),
  learned: await count('learned', E.id),
  mastered: await count('mastered', E.id),
};

// ── The REAL deletion flow ──────────────────────────────────────────────────────
const deleted = [A, B, C, D];
for (const u of deleted) {
  const r = await callDelete(u.token);
  check(`delete-account answers ok for ${u.tag}`, r.status === 200 && r.json?.ok === true, `HTTP ${r.status} ${r.text.slice(0, 160)}`);
}

for (const u of deleted) {
  const gone = !(await userExists(u.id));
  const tables = {};
  for (const t of ['challenge_completions', 'boss_forms', 'discoveries', 'learned', 'mastered']) tables[t] = await count(t, u.id);
  check(`${u.tag}: auth user is gone`, gone);
  check(`${u.tag}: no rows remain in challenge_completions, boss_forms or progression`, Object.values(tables).every((n) => n === 0), JSON.stringify(tables));
  const signIn = await post('/auth/v1/token?grant_type=password', { email: u.email, password: u.password });
  check(`${u.tag}: cannot sign in any more`, signIn.status >= 400);
}

// ── The bystander ───────────────────────────────────────────────────────────────
const bystanderAfter = {
  completions: await count('challenge_completions', E.id),
  boss: await count('boss_forms', E.id),
  discoveries: await count('discoveries', E.id),
  learned: await count('learned', E.id),
  mastered: await count('mastered', E.id),
};
check('bystander E: account still exists', await userExists(E.id));
check('bystander E: every record unchanged', JSON.stringify(bystanderAfter) === JSON.stringify(bystanderBefore), `${JSON.stringify(bystanderBefore)} -> ${JSON.stringify(bystanderAfter)}`);
const stillIn = await post('/auth/v1/token?grant_type=password', { email: E.email, password: E.password });
check('bystander E: can still sign in', stillIn.status === 200);

// ── Orphans: a row whose user no longer exists, in any user-owned table ─────────────
const USER_TABLES = ['sightings', 'scans', 'discoveries', 'learned', 'mastered', 'research_completions',
  'unlocked_achievements', 'profiles', 'seed_shelf', 'identification_comparisons', 'entitlements',
  'challenge_completions', 'boss_forms', 'leaderboard_participants'];
const orphans = {};
for (const t of USER_TABLES) {
  orphans[t] = Number((await sql(`select count(*)::int as n from public.${t} x left join auth.users u on u.id = x.user_id where u.id is null`))[0].n);
}
check('no orphaned rows in any user-owned table', Object.values(orphans).every((n) => n === 0), JSON.stringify(orphans));

// ── Failure handling ────────────────────────────────────────────────────────────
const secretsShape = [/service[_-]?role/i, /SUPABASE_[A-Z_]+/, /eyJ[A-Za-z0-9_-]{20,}/, /\bat\s+\S+\s+\(.*:\d+:\d+\)/, /postgres|SQLSTATE|relation "|violates/i];
const probes = [
  ['no credentials', await callDelete(null)],
  ['a made-up token', await callDelete('not-a-real-token')],
  ['the anon key used as a user', await callDelete(ANON)],
  ['an already-deleted account token', await callDelete(A.token)],
  ['a GET', await callDelete(E.token, { method: 'GET' })],
];
for (const [name, r] of probes) {
  check(`${name}: refused (4xx), never a 5xx`, r.status >= 400 && r.status < 500, `HTTP ${r.status}`);
  check(`${name}: body leaks nothing sensitive`, !secretsShape.some((p) => p.test(r.text)), r.text.slice(0, 120));
}
check('a refused request deleted nobody', await userExists(E.id));

// ── Clean up the bystander through the same real flow ───────────────────────────────
const last = await callDelete(E.token);
check('cleanup: bystander removed through the real flow', last.status === 200 && !(await userExists(E.id)) && (await count('boss_forms', E.id)) === 0);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed, of ${results.length}`);
process.exit(failed.length ? 1 : 0);
