import { createClient } from 'npm:@supabase/supabase-js@2';
import { evaluateSubmission } from '../_shared/herbdex/mastery-challenges.ts';
import {
  CHALLENGE_ACTIVITIES,
  CHALLENGE_DAILY_LIMIT,
  challengeBucket,
  type ActivityId,
} from '../_shared/herbdex/boss-form.ts';

/**
 * challenge-submit — the ONLY writer of `challenge_completions` and `boss_forms`.   NOT DEPLOYED.
 *
 * The client sends `{ herbId, activity, attempt, answers }` and nothing else. It cannot send a
 * score or a completion flag, because this function has nowhere to read one from:
 *
 *   1. Identity comes from `auth.getUser()` on the caller's JWT. A user id in the body is never read.
 *   1b. A durable per-user daily allowance is claimed in the database before anything else is
 *      read, so a refused or invalid request still costs the caller one unit.
 *   2. Standing (mastered, prerequisites) is read from the database under the CALLER'S OWN
 *      session, so RLS scopes every read to them.
 *   3. `evaluateSubmission` — the same pure code vitest tests — rebuilds the question set from
 *      (herb, activity, attempt), refuses unreviewed questions, scores the answers and applies
 *      the thresholds.
 *   4. Only on a pass does the SERVICE-ROLE client call `award_challenge`, which writes
 *      atomically and idempotently and re-checks mastery and prerequisites itself.
 *
 * The service-role key is used for that one RPC and for nothing else.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // Answered before the auth check: a browser preflight never carries credentials.
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Not authenticated' }, 401);
  const userId = userData.user.id;

  // DURABLE RATE LIMIT, claimed before any work. `claim_scan` is the atomic counter scanning
  // uses; it returns null once the caller is over their limit. A limit of zero is a kill
  // switch and is refused here because the counter's first insert ignores the limit.
  const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const limit = Number(Deno.env.get('CHALLENGE_DAILY_LIMIT') ?? CHALLENGE_DAILY_LIMIT);
  if (!(limit > 0)) return json({ error: 'Challenges are paused' }, 429);
  const { data: claimed, error: quotaError } = await service.rpc('claim_scan', {
    p_bucket: challengeBucket(userId),
    p_day: new Date().toISOString().slice(0, 10),
    p_limit: limit,
  });
  if (quotaError) return json({ error: 'Could not check the daily limit' }, 500);
  if (typeof claimed !== 'number') return json({ error: 'Daily limit reached' }, 429);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }
  // `JSON.parse('null')` and a bare number are valid JSON and not objects: reading a field off them
  // threw, and the platform answered 500. A malformed request is the caller's error, so say so.
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return json({ error: 'Body must be a JSON object' }, 400);
  }
  const herbId = typeof body.herbId === 'string' ? body.herbId : '';
  // A plant id is a lowercase slug. Anything else never reaches the database, so a hostile string
  // cannot make a query fail and surface as a server error. An empty id still flows through to the
  // ordinary refusal ('not-in-pilot'), exactly as before.
  if (herbId !== '' && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(herbId)) {
    return json({ error: 'Unknown plant' }, 400);
  }

  // Standing, from the database, under the caller's own session.
  const [mastered, completions] = await Promise.all([
    caller.from('mastered').select('herb_id').eq('user_id', userId).eq('herb_id', herbId),
    caller
      .from('challenge_completions')
      .select('activity_id')
      .eq('user_id', userId)
      .eq('herb_id', herbId),
  ]);
  if (mastered.error || completions.error) return json({ error: 'Could not read progress' }, 500);

  const completed = new Set<ActivityId>();
  for (const row of completions.data ?? []) {
    const id = row.activity_id as ActivityId;
    if ((CHALLENGE_ACTIVITIES as readonly string[]).includes(id)) completed.add(id);
  }

  const decision = evaluateSubmission(
    { herbId, activity: body.activity, attempt: body.attempt, answers: body.answers },
    { mastered: (mastered.data ?? []).length > 0, completed },
  );
  if (!decision.ok) return json({ ok: false, reason: decision.reason }, 200);

  if (decision.recordActivity) {
    const { error } = await service.rpc('award_challenge', {
      p_user: userId,
      p_herb: herbId,
      p_activity: body.activity as string,
      p_boss: decision.recordBossForm,
    });
    if (error) return json({ error: 'Could not record the result' }, 500);
  }

  return json({
    ok: true,
    passed: decision.score.passed,
    resolved: decision.score.resolved,
    total: decision.score.total,
    bossForm: decision.recordBossForm,
  });
});
