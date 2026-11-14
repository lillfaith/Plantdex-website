#!/usr/bin/env node
/**
 * LIVE ACCOUNT-DELETION CHECK FOR THE BOSS FORM TABLES. TEST PROJECT ONLY.
 *
 * The browser cannot write `challenge_completions` or `boss_forms` (that is the point of them), so
 * seeding rows needs a server-side path. This script uses the Supabase Management API's SQL
 * endpoint with the access token the migration workflow already uses, against ONE hard-coded
 * project: the test project. It refuses to start for any other ref, and every URL below is built
 * from that constant, never from an argument or an input.
 *
 * With disposable accounts only:
 *   A  rows in BOTH tables (and ordinary progression)    -> deleted through the REAL function
 *   B  rows in challenge_completions ONLY                -> deleted
 *   C  a row in boss_forms ONLY                          -> deleted
 *   D  rows in NEITHER                                   -> deleted
 *   E  a bystander with rows in both tables, progression -> its EXACT rows (every column, every
 *      value, timestamps included) must be identical afterwards, then it is removed last
 * and then proves, by reading the database back, that nothing of A-D remains.
 *
 * CLEANUP DOES NOT DEPEND ON THE TESTS PASSING. Every account created is tracked and removed in a
 * `finally`: first through the real function, and if that fails by deleting the auth user directly
 * (the rows cascade). A cleanup that cannot finish is reported and fails the run. `--sweep` removes
 * any account with this script's email prefix and is run as the last, always-on workflow step.
 *
 * THE TOKEN IS NEVER PRINTED. Every console line passes through a redactor that replaces it, and a
 * check at the end scans the whole captured output for it.
 *
 * Env: PROJECT_REF (must equal the test ref), SUPABASE_ACCESS_TOKEN.
 */

const TEST_REF = 'vgjehmwcpavflbfhbbrp';
const PRODUCTION_REF = 'vygiamigomwlvnwkryyl';
const REF = process.env.PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SWEEP = process.argv.includes('--sweep');

if (REF !== TEST_REF || REF === PRODUCTION_REF) {
  console.error(`Refusing to run: PROJECT_REF must be the TEST project (${TEST_REF}), got '${REF}'.`);
  process.exit(2);
}
if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is not set.');
  process.exit(2);
}

// ── Output, redacted and captured ────────────────────────────────────────────────
const captured = [];
const redact = (s) => String(s).split(TOKEN).join('***');
const out = (line) => { const safe = redact(line); captured.push(safe); console.log(safe); };

const BASE = `https://${TEST_REF}.supabase.co`;
const MGMT = `https://api.supabase.com/v1/projects/${TEST_REF}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HERB = 'taraxacum-officinale';
const EMAIL_PREFIX = 'plantdex-e2e-del-';
const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

async function sql(query) {
  const res = await fetch(`${MGMT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed (HTTP ${res.status}): ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

const num = async (query) => Number((await sql(query))[0].n);
const userExists = async (id) => (await num(`select count(*)::int as n from auth.users where id = '${id}'`)) === 1;

// ── --sweep: remove any leftover disposable accounts of this script, then report ─────
if (SWEEP) {
  const before = await num(`select count(*)::int as n from auth.users where email like '${EMAIL_PREFIX}%@mailinator.com'`);
  await sql(`delete from auth.users where email like '${EMAIL_PREFIX}%@mailinator.com'`);
  const after = await num(`select count(*)::int as n from auth.users where email like '${EMAIL_PREFIX}%@mailinator.com'`);
  out(`sweep: ${before} leftover disposable account(s) found, ${after} remain`);
  process.exit(after === 0 ? 0 : 1);
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  out(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  -> ${detail}`}`);
}

const created = []; // every account this run made, for cleanup
let ANON = '';

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
  const email = `${EMAIL_PREFIX}${tag}-${stamp}@mailinator.com`;
  const password = `Test-Passw0rd-${Math.random().toString(36).slice(2, 10)}`;
  const up = await post('/auth/v1/signup', { email, password });
  if (up.status >= 400) throw new Error(`signup ${tag} failed: HTTP ${up.status}`);
  const inn = await post('/auth/v1/token?grant_type=password', { email, password });
  if (inn.status !== 200) throw new Error(`signin ${tag} failed: HTTP ${inn.status}`);
  const id = inn.json.user.id;
  if (!UUID.test(id)) throw new Error('unexpected user id shape');
  const user = { tag, email, password, id, token: inn.json.access_token };
  created.push(user);
  return user;
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

const count = (table, id) => num(`select count(*)::int as n from public.${table} where user_id = '${id}'`);

/** Every column of every row, in a fixed order: what "exactly unchanged" means. */
async function snapshot(id) {
  const snap = {};
  const spec = {
    challenge_completions: 'activity_id',
    boss_forms: 'herb_id',
    discoveries: 'herb_id',
    learned: 'herb_id',
    mastered: 'herb_id',
  };
  for (const [table, order] of Object.entries(spec)) {
    snap[table] = await sql(`select * from public.${table} where user_id = '${id}' order by ${order}, herb_id`);
  }
  return snap;
}

const FIXED = { completed: '2026-03-04T05:06:07.000Z', earned: '2026-03-05T06:07:08.000Z', found: '2026-01-02T03:04:05.000Z', learned: '2026-01-09T10:11:12.000Z', mastered: '2026-02-14T15:16:17.000Z' };

async function seed(u, { completions = 0, boss = false, progression = false }) {
  if (!UUID.test(u.id)) throw new Error('bad id');
  const acts = ['part-spotter', 'compare', 'habitat-season'].slice(0, completions);
  if (acts.length) {
    await sql(`insert into public.challenge_completions (user_id, herb_id, activity_id, completed_at) values ${acts.map((a) => `('${u.id}','${HERB}','${a}','${FIXED.completed}')`).join(',')}`);
  }
  if (boss) await sql(`insert into public.boss_forms (user_id, herb_id, earned_at) values ('${u.id}','${HERB}','${FIXED.earned}')`);
  if (progression) {
    await sql(`insert into public.discoveries (user_id, herb_id, discovered_at) values ('${u.id}','${HERB}','${FIXED.found}')`);
    await sql(`insert into public.learned (user_id, herb_id, learned_at) values ('${u.id}','${HERB}','${FIXED.learned}')`);
    await sql(`insert into public.mastered (user_id, herb_id, mastered_at) values ('${u.id}','${HERB}','${FIXED.mastered}')`);
  }
}

/** Remove every account this run created, whatever happened above. Reports what it could not. */
async function cleanup() {
  const failures = [];
  for (const u of created) {
    try {
      if (!(await userExists(u.id))) continue;
      try { await callDelete(u.token); } catch { /* fall through to the direct delete */ }
      if (await userExists(u.id)) {
        await sql(`delete from auth.users where id = '${u.id}'`); // rows cascade
      }
      if (await userExists(u.id)) failures.push(`${u.tag} (${u.id}) still exists`);
    } catch (e) {
      failures.push(`${u.tag}: ${redact(e instanceof Error ? e.message : e)}`);
    }
  }
  return failures;
}

let exitCode = 0;
try {
  out(`Target: TEST project ${TEST_REF} (production ${PRODUCTION_REF} is never contacted)`);

  // ── The token: what it can see, and that it is masked ───────────────────────────
  const projRes = await fetch('https://api.supabase.com/v1/projects', { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!projRes.ok) throw new Error(`token rejected by the Management API (HTTP ${projRes.status})`);
  const projects = await projRes.json();
  const ids = projects.map((p) => p.id);
  check('token reaches the TEST project', ids.includes(TEST_REF));
  out(`info: this token is account-scoped: it can see ${ids.length} project(s), including production: ${ids.includes(PRODUCTION_REF) ? 'YES' : 'no'}. The safeguard is that no URL here is built from anything but the TEST ref constant.`);

  const keys = await (await fetch(`${MGMT}/api-keys`, { headers: { Authorization: `Bearer ${TOKEN}` } })).json();
  ANON = keys.find((k) => k.name === 'anon')?.api_key ?? '';
  if (!ANON) throw new Error('Could not read the anon key.');

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

  const bystanderBefore = await snapshot(E.id);
  const rowTotal = Object.values(bystanderBefore).reduce((n, rows) => n + rows.length, 0);
  check('seed: bystander E holds exactly 7 rows (3 completions, 1 Boss Form, 3 progression) with fixed values', rowTotal === 7, `rows=${rowTotal}`);

  // ── The REAL deletion flow ──────────────────────────────────────────────────────
  const deleted = [A, B, C, D];
  for (const u of deleted) {
    const r = await callDelete(u.token);
    check(`delete-account answers ok for ${u.tag}`, r.status === 200 && r.json?.ok === true, `HTTP ${r.status} ${r.text.slice(0, 160)}`);
  }

  for (const u of deleted) {
    const tables = {};
    for (const t of ['challenge_completions', 'boss_forms', 'discoveries', 'learned', 'mastered']) tables[t] = await count(t, u.id);
    check(`${u.tag}: auth user is gone`, !(await userExists(u.id)));
    check(`${u.tag}: no rows remain in challenge_completions, boss_forms or progression`, Object.values(tables).every((n) => n === 0), JSON.stringify(tables));
    const signIn = await post('/auth/v1/token?grant_type=password', { email: u.email, password: u.password });
    check(`${u.tag}: cannot sign in any more`, signIn.status >= 400);
  }

  // ── The bystander: EXACT rows, every column ─────────────────────────────────────────
  const bystanderAfter = await snapshot(E.id);
  check('bystander E: account still exists', await userExists(E.id));
  check('bystander E: every row identical, column by column and value by value (timestamps included)',
    JSON.stringify(bystanderAfter) === JSON.stringify(bystanderBefore),
    `before=${JSON.stringify(bystanderBefore).slice(0, 200)} after=${JSON.stringify(bystanderAfter).slice(0, 200)}`);
  check('bystander E: the seeded values are the values read back (not just "some rows")',
    bystanderAfter.boss_forms[0]?.earned_at?.startsWith('2026-03-05T06:07:08') &&
    bystanderAfter.mastered[0]?.mastered_at?.startsWith('2026-02-14T15:16:17') &&
    bystanderAfter.challenge_completions.length === 3);
  const stillIn = await post('/auth/v1/token?grant_type=password', { email: E.email, password: E.password });
  check('bystander E: can still sign in', stillIn.status === 200);

  // ── Orphans: a row whose user no longer exists, in any user-owned table ───────────────
  const USER_TABLES = ['sightings', 'scans', 'discoveries', 'learned', 'mastered', 'research_completions',
    'unlocked_achievements', 'profiles', 'seed_shelf', 'identification_comparisons', 'entitlements',
    'challenge_completions', 'boss_forms', 'leaderboard_participants'];
  const orphans = {};
  for (const t of USER_TABLES) {
    orphans[t] = await num(`select count(*)::int as n from public.${t} x left join auth.users u on u.id = x.user_id where u.id is null`);
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
} catch (e) {
  exitCode = 1;
  out(`ERROR  the run stopped early: ${redact(e instanceof Error ? e.message : e)}`);
} finally {
  const failures = await cleanup().catch((e) => [`cleanup itself failed: ${redact(e instanceof Error ? e.message : e)}`]);
  const left = created.length ? await num(`select count(*)::int as n from auth.users where id in (${created.map((u) => `'${u.id}'`).join(',')})`).catch(() => -1) : 0;
  const ok = failures.length === 0 && left === 0;
  results.push({ name: 'cleanup: every disposable account removed', ok });
  out(`${ok ? 'PASS' : 'FAIL'}  cleanup: every disposable account removed (${created.length} created, ${left} remaining)${failures.length ? `  -> ${failures.join('; ')}` : ''}`);

  const leaked = captured.some((l) => l.includes(TOKEN));
  results.push({ name: 'the access token never appeared in the output', ok: !leaked });
  out(`${leaked ? 'FAIL' : 'PASS'}  the access token never appeared in the output`);

  const failed = results.filter((r) => !r.ok);
  out(`\n${results.length - failed.length} passed, ${failed.length} failed, of ${results.length}`);
  process.exit(exitCode || (failed.length ? 1 : 0));
}
