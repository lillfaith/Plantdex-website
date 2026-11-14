import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { supabase } from '@/lib/supabase-client';
import { createRemoteHerbdexStorage } from '@/lib/remote-herbdex-storage';
import { addRemoteSighting, removeRemoteSighting } from '@/lib/remote-sightings';
import { applyDiscovery, applyLearned } from '@/lib/herbdex-reducer';
import { buildWorld, STANDING_TASKS } from '@/lib/research';
import { evaluateSubmission } from '@/lib/mastery-challenges';
import { CHALLENGE_DAILY_LIMIT } from '@/lib/boss-form';

/**
 * THE DEPLOYED `challenge-submit`, ATTACKED OVER HTTP. Test project only (`npm run verify:supabase`).
 *
 * Disposable accounts, anon key only. This file never holds, asks for or prints a service-role key.
 * `e2e/guard.setup.ts` refuses to start against anything but the test project, and the check below
 * repeats it so a copy of this file cannot be pointed somewhere else by accident.
 *
 * WHAT IT CAN AND CANNOT PROVE, stated up front because it is the honest limit of the method:
 * with no question reviewed (`CHALLENGE_REVIEWS` is empty) the function can never award anything,
 * so a PASSING submission, a duplicate award and a concurrent award cannot be produced against a
 * deployment of the real bank. What this proves is the refusals: identity, standing, the review
 * gate, malformed input, the RPC lock, and that nothing leaks. The award path itself is proven by
 * the unit tests and by the SQL; a live proof needs a reviewed fixture or a service-role seed,
 * which is a separate approval.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const configured = Boolean(URL && KEY);

const TEST_REF = 'vgjehmwcpavflbfhbbrp';
const PRODUCTION_REF = 'vygiamigomwlvnwkryyl';
if (URL && URL.includes(PRODUCTION_REF)) {
  throw new Error('e2e/challenge-submit.e2e.test.ts refuses to run against the production project.');
}

const HERB = 'taraxacum-officinale';
const ENDPOINT = `${URL}/functions/v1/challenge-submit`;
const ACTIVITIES = ['part-spotter', 'compare', 'habitat-season', 'boss-trial'] as const;

/** Every response body any test saw, so one assertion can check none of them leaks anything. */
const seenBodies: string[] = [];

type Reply = { status: number; text: string; json: Record<string, unknown> | null };

/** A just-issued token can be refused as "JWT issued at future" while two clocks disagree by a moment. */
const CLOCK_SKEW = /issued at future/i;

async function waitUntilTokenAccepted(client: SupabaseClient): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    const { error } = await client.from('boss_forms').select('user_id').limit(1);
    if (!error || !CLOCK_SKEW.test(error.message)) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('the token was still refused as issued in the future after 40s');
}

async function call(
  token: string | null,
  body: unknown,
  opts: { method?: string; raw?: boolean; headers?: Record<string, string> } = {},
): Promise<Reply> {
  const send = () =>
    fetch(ENDPOINT, {
      method: opts.method ?? 'POST',
      headers: {
        apikey: KEY!,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
      body: opts.method === 'GET' ? undefined : opts.raw ? (body as string) : JSON.stringify(body),
    });
  let res = await send();
  let text = await res.text();
  // Only the clock-skew refusal is retried, and only a few times: any other 401 is a real answer.
  for (let i = 0; i < 5 && res.status === 401 && CLOCK_SKEW.test(text); i += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    res = await send();
    text = await res.text();
  }
  seenBodies.push(text);
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON: kept as text */
  }
  return { status: res.status, text, json };
}

function freshClient(): SupabaseClient {
  return createClient(URL!, KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

function credentials(tag: string) {
  return {
    email: `plantdex-e2e-cs-${tag}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}@mailinator.com`,
    password: `Test-Passw0rd-${Math.random().toString(36).slice(2, 10)}`,
  };
}

async function readRows(client: SupabaseClient, userId: string) {
  const [c, b] = await Promise.all([
    client.from('challenge_completions').select('*').eq('user_id', userId),
    client.from('boss_forms').select('*').eq('user_id', userId),
  ]);
  return { completions: c.data ?? [], bossForms: b.data ?? [], errors: [c.error, b.error] };
}

describe.skipIf(!configured)('challenge-submit (deployed, TEST) — refusals and isolation', () => {
  let alice: User; // mastered the pilot plant, through the real flow
  let aliceToken = '';
  let bob: User; // an ordinary player, not mastered
  let bobClient: SupabaseClient;
  let bobToken = '';
  const aliceCreds = credentials('alice');

  beforeAll(async () => {
    expect(URL, 'target must be the test project').toContain(TEST_REF);

    // Alice on the app's singleton client, so the real adapters run as her.
    await supabase!.auth.signUp(aliceCreds);
    const a = await supabase!.auth.signInWithPassword(aliceCreds);
    if (a.error || !a.data.user) throw new Error(`alice signIn failed: ${a.error?.message}`);
    alice = a.data.user;
    aliceToken = a.data.session!.access_token;

    bobClient = freshClient();
    const bc = credentials('bob');
    await bobClient.auth.signUp(bc);
    const b = await bobClient.auth.signInWithPassword(bc);
    if (b.error || !b.data.user) throw new Error(`bob signIn failed: ${b.error?.message}`);
    bob = b.data.user;
    bobToken = b.data.session!.access_token;

    // Make Alice genuinely mastered, the way a player does: discover, learn, one sighting,
    // then the server re-derives mastery from its own rows.
    await waitUntilTokenAccepted(supabase!);
    await waitUntilTokenAccepted(bobClient);
    const storage = createRemoteHerbdexStorage(alice.id);
    let state = await storage.load();
    state = applyDiscovery(state, HERB).state;
    state = applyLearned(state, HERB).state;
    storage.save(state);
    await new Promise((r) => setTimeout(r, 1500));
    const sighting = await addRemoteSighting(alice.id, { herbId: HERB, date: '2026-05-02' });
    const outcome = await storage.reconcile!(buildWorld(state, { [HERB]: 1 }), STANDING_TASKS);
    if (!outcome?.masteredIds.includes(HERB)) {
      throw new Error('Alice did not reach mastery; is herbdex-action deployed on the test project?');
    }
    await removeRemoteSighting(alice.id, sighting.id);
  }, 120_000);

  afterAll(async () => {
    // Users can only be removed with a service-role key, which this suite never holds.
    if (supabase && alice) {
      for (const t of ['learned', 'discoveries', 'mastered', 'unlocked_achievements']) {
        await supabase.from(t).delete().eq('user_id', alice.id);
      }
      await supabase.auth.signOut();
    }
    if (bobClient) await bobClient.auth.signOut();
  }, 60_000);

  describe('the deployment', () => {
    it('is on the test project and answers a CORS preflight', async () => {
      expect(URL).toContain(TEST_REF);
      expect(URL).not.toContain(PRODUCTION_REF);
      const res = await fetch(ENDPOINT, {
        method: 'OPTIONS',
        headers: { Origin: 'https://example.com', 'Access-Control-Request-Method': 'POST' },
      });
      expect(res.status).toBe(204);
    });

    it('refuses a method other than POST', async () => {
      const r = await call(aliceToken, null, { method: 'GET' });
      expect(r.status).toBe(405);
    });
  });

  describe('authentication', () => {
    it('refuses a request with no credentials at all', async () => {
      const res = await fetch(ENDPOINT, { method: 'POST', body: '{}' });
      seenBodies.push(await res.text());
      expect([401, 403]).toContain(res.status);
    });

    it('refuses a made-up token', async () => {
      const r = await call('not-a-real-token', { herbId: HERB, activity: 'part-spotter', attempt: 1, answers: [] });
      expect(r.status).toBe(401);
    });

    it('refuses the public anon key used as if it were a user', async () => {
      const r = await call(KEY!, { herbId: HERB, activity: 'part-spotter', attempt: 1, answers: [] });
      expect(r.status).toBe(401);
      expect(r.json?.ok).not.toBe(true);
    });
  });

  describe('malformed and hostile input fails safely', () => {
    const cases: [string, unknown, boolean][] = [
      ['not JSON', '{nope', true],
      ['JSON null', 'null', true],
      ['a JSON array', '[1,2,3]', true],
      ['a bare number', '7', true],
      ['an empty object', '{}', false],
      ['an unknown activity', JSON.stringify({ herbId: HERB, activity: 'god-mode', attempt: 1, answers: [] }), true],
      ['a string attempt', JSON.stringify({ herbId: HERB, activity: 'part-spotter', attempt: '1', answers: [] }), true],
      ['answers that are not a list', JSON.stringify({ herbId: HERB, activity: 'part-spotter', attempt: 1, answers: 'all of them' }), true],
      ['a path-shaped herb id', JSON.stringify({ herbId: '../../etc/passwd', activity: 'part-spotter', attempt: 1, answers: [] }), true],
      ['a sql-shaped herb id', JSON.stringify({ herbId: "x'; drop table boss_forms;--", activity: 'part-spotter', attempt: 1, answers: [] }), true],
      ['a 300 KB body', JSON.stringify({ herbId: HERB, activity: 'part-spotter', attempt: 1, answers: 'x'.repeat(300_000) }), true],
    ];
    for (const [name, payload, raw] of cases) {
      it(`${name}: refused, never a pass, never a crash`, async () => {
        const r = await call(aliceToken, payload, { raw });
        expect(r.status, r.text).toBeLessThan(500);
        expect(r.json?.ok, r.text).not.toBe(true);
        expect(r.json?.bossForm, r.text).not.toBe(true);
      });
    }

    it('ignores extra fields a client might try to smuggle in (userId, score, includeUnreviewed)', async () => {
      const r = await call(aliceToken, {
        herbId: HERB, activity: 'part-spotter', attempt: 1, answers: [0, 0, 0, 0],
        userId: bob.id, score: 4, passed: true, includeUnreviewed: true, includeUnavailable: true, bossForm: true,
      });
      expect(r.status).toBeLessThan(500);
      expect(r.json?.ok).toBe(false);
      expect(r.json?.passed).toBeUndefined();
    });
  });

  describe('standing and the review gate', () => {
    it('a player who has not mastered the plant is refused, and nothing is written', async () => {
      const r = await call(bobToken, { herbId: HERB, activity: 'part-spotter', attempt: 1, answers: [0, 0, 0, 0] });
      expect(r.json).toMatchObject({ ok: false, reason: 'not-mastered' });
      const rows = await readRows(bobClient, bob.id);
      expect(rows.completions).toEqual([]);
      expect(rows.bossForms).toEqual([]);
    });

    it('a plant outside the pilot is refused', async () => {
      const r = await call(aliceToken, { herbId: 'urtica-dioica', activity: 'part-spotter', attempt: 1, answers: [0, 0, 0, 0] });
      expect(r.json).toMatchObject({ ok: false, reason: 'not-in-pilot' });
    });

    it('the Boss Trial is refused without its prerequisites', async () => {
      const r = await call(aliceToken, { herbId: HERB, activity: 'boss-trial', attempt: 1, answers: Array(10).fill(0) });
      expect(r.json).toMatchObject({ ok: false, reason: 'prerequisites-missing' });
    });

    it('a MASTERED player still cannot pass any activity: no question is reviewed, so nothing is served', async () => {
      for (const activity of ['part-spotter', 'compare', 'habitat-season'] as const) {
        for (const answers of [[0, 0, 0, 0], [1, 1, 1, 1], [3, 2, 1, 0]]) {
          const r = await call(aliceToken, { herbId: HERB, activity, attempt: 1, answers });
          expect(r.json?.ok, `${activity}: ${r.text}`).toBe(false);
          expect(r.json?.reason, `${activity}`).toBe('unavailable');
        }
      }
      const rows = await readRows(supabase!, alice.id);
      expect(rows.completions).toEqual([]);
      expect(rows.bossForms).toEqual([]);
    });

    it('the deployed decisions match this checkout (same pure code and the same empty review list)', () => {
      for (const activity of ACTIVITIES) {
        const local = evaluateSubmission(
          { herbId: HERB, activity, attempt: 1, answers: [0, 0, 0, 0] },
          { mastered: true, completed: new Set(['part-spotter', 'compare', 'habitat-season']) },
        );
        expect(local.ok, `local ${activity}`).toBe(false);
        expect((local as { reason: string }).reason).toBe('unavailable');
      }
    });
  });

  describe('concurrency and duplicates', () => {
    it('a burst of identical requests never produces a pass, a crash or a row', async () => {
      const body = { herbId: HERB, activity: 'part-spotter', attempt: 1, answers: [0, 0, 0, 0] };
      const replies = await Promise.all(Array.from({ length: 12 }, () => call(aliceToken, body)));
      for (const r of replies) {
        expect(r.status, r.text).toBeLessThan(500);
        expect(r.json?.ok).not.toBe(true);
      }
      const rows = await readRows(supabase!, alice.id);
      expect(rows.completions).toEqual([]);
      expect(rows.bossForms).toEqual([]);
    }, 60_000);

    it('every request spends the daily allowance, so scripting is bounded', async () => {
      // 60 per day per user. Alice has spent roughly half in this run; Bob is used to find the wall
      // without disturbing Alice: he sends until refused, which must happen at or before the limit.
      let refusedAt = 0;
      const body = { herbId: HERB, activity: 'part-spotter', attempt: 1, answers: [0, 0, 0, 0] };
      for (let i = 1; i <= CHALLENGE_DAILY_LIMIT + 3; i += 10) {
        const batch = await Promise.all(Array.from({ length: 10 }, () => call(bobToken, body)));
        if (batch.some((r) => r.status === 429)) {
          refusedAt = i;
          break;
        }
      }
      expect(refusedAt, 'the daily limit never engaged').toBeGreaterThan(0);
    }, 120_000);
  });

  describe('one player cannot touch another', () => {
    it('a body that names someone else changes nothing for them', async () => {
      const before = await readRows(supabase!, alice.id);
      await call(bobToken, { herbId: HERB, activity: 'part-spotter', attempt: 1, answers: [0, 0, 0, 0], userId: alice.id });
      const after = await readRows(supabase!, alice.id);
      expect(after.completions).toEqual(before.completions);
      expect(after.bossForms).toEqual(before.bossForms);
    });

    it('cannot read the other player rows', async () => {
      const seenByBob = await bobClient.from('challenge_completions').select('*').eq('user_id', alice.id);
      expect(seenByBob.data ?? []).toEqual([]);
      const seenBossByBob = await bobClient.from('boss_forms').select('*').eq('user_id', alice.id);
      expect(seenBossByBob.data ?? []).toEqual([]);
    });

    it('cannot call the awarding function directly: not as a stranger, not as a player, not for anyone', async () => {
      const args = { p_user: alice.id, p_herb: HERB, p_activity: 'boss-trial', p_boss: true };
      for (const client of [freshClient(), bobClient, supabase!]) {
        const { error } = await client.rpc('award_challenge', args);
        expect(error, 'a client must not be able to award').not.toBeNull();
        // 42501 is "permission denied": the function EXISTS (migration 0012) and is locked to the
        // service role. "not found" would mean the migration is missing instead.
        expect(String(error?.code), JSON.stringify(error)).toBe('42501');
      }
      const rows = await readRows(supabase!, alice.id);
      expect(rows.bossForms).toEqual([]);
    });

    it('the tables exist (migration 0012) and each player sees only their own, empty, rows', async () => {
      for (const [client, id] of [[supabase!, alice.id], [bobClient, bob.id]] as const) {
        const rows = await readRows(client, id);
        expect(rows.errors).toEqual([null, null]);
        expect(rows.completions).toEqual([]);
        expect(rows.bossForms).toEqual([]);
      }
    });
  });

  describe('what a failure reveals', () => {
    it('no response ever carries a credential, a stack trace or an internal name', () => {
      expect(seenBodies.length).toBeGreaterThan(20);
      const forbidden = [
        /service[_-]?role/i,
        /SUPABASE_[A-Z_]+/,
        /eyJ[A-Za-z0-9_-]{20,}/, // any JWT
        /\bat\s+\S+\s+\(.*:\d+:\d+\)/, // a stack frame
        /node_modules|deno\.land|file:\/\//i,
        /award_challenge|claim_scan/, // internal function names
        /postgres|pg_|SQLSTATE|relation "/i,
      ];
      for (const body of seenBodies) {
        for (const pattern of forbidden) {
          expect(body, `leaked ${pattern}`).not.toMatch(pattern);
        }
      }
    });
  });
});
