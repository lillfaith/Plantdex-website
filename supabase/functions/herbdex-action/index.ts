import { createClient } from 'npm:@supabase/supabase-js@2';
import { emptyState } from '../_shared/herbdex/herbdex-state.ts';
import { reconcileMastery, reconcileResearch } from '../_shared/herbdex/herbdex-reducer.ts';
import { buildWorld, STANDING_TASKS, researchTaskById } from '../_shared/herbdex/research.ts';
import type { HerbdexState } from '../_shared/herbdex/types.ts';

/**
 * herbdex-action — the ONE place mastery and Field Research completion get recomputed
 * server-side, using the *exact* `reconcileMastery`/`reconcileResearch` from
 * `herbdex-reducer.ts` (synced verbatim by `scripts/sync-edge-shared.mjs` — see
 * `supabase/functions/_shared/herbdex/`, and CLAUDE.md's "When adding a backend" section).
 *
 * Everything else about V0.3 accounts — discoveries, learned, achievements earned directly
 * from a discovery, sightings — is a plain RLS-scoped insert made straight from the client
 * (see `src/lib/remote-herbdex-storage.ts` and `src/lib/remote-sightings.ts`). Those don't
 * need a function in front of them: the client already computed the transition with the
 * same pure reducer, and RLS plus each table's (user_id, entity_id) primary key are the
 * actual security boundary either way.
 *
 * Mastery and research completion are different: they depend on sighting counts and
 * cross-table totals a client could otherwise just assert ("I've seen this 3 times, master
 * me"). This function re-derives both from rows it reads under the CALLER'S OWN session —
 * never a service-role key, never a userId read from the request body — so RLS is what
 * actually stops one player from mutating another's rows, exactly as
 * `supabase/migrations/0001_accounts.sql` enforces at the database layer regardless of
 * what this function does or doesn't check.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface ReconcileRequest {
  /**
   * Ids of the player's currently-open daily board, as the client already computed them
   * (see `src/lib/research-board.ts`). Picking which dailies are "on offer today" is a
   * deterministic, low-stakes UI concern scoped to the viewer's own local date — there is
   * nothing to gain by forging it, because the thing that actually pays out XP is
   * `progressForTask(...).qualifies`, re-verified below from this function's own reads.
   * An id that doesn't resolve (stale, unknown) is silently dropped by `researchTaskById`.
   */
  dailyTaskIds?: string[];
}

function rowsToRecord(
  rows: Record<string, unknown>[] | null | undefined,
  idKey: string,
  atKey: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows ?? []) {
    const id = row[idKey];
    const at = row[atKey];
    if (typeof id === 'string' && typeof at === 'string') out[id] = at;
  }
  return out;
}

/**
 * CORS, without which this function cannot be called from a browser at all.
 *
 * `supabase.functions.invoke` sends `Authorization`, `apikey` and a JSON content type, so
 * the request is never "simple" — the browser sends an OPTIONS preflight first and refuses
 * to make the real call unless that preflight answers with these headers. Without them the
 * preflight fell through to the 401 below, the POST was never sent, and every signed-in
 * player silently stopped earning mastery and Field Research: `reconcile()` returns null on
 * error, and a signed-in client has no local fallback path to award them instead.
 *
 * It is invisible to `npm run verify:supabase`, which calls the function from Node, where
 * nothing enforces CORS. Only a browser sees this.
 *
 * `*` rather than the Pages origin: the credentials here are the JWT and anon key carried
 * in headers, never a cookie, so there is nothing for an origin allow-list to protect —
 * a forged origin still has to present someone's token, and RLS still scopes every read to
 * whoever that token belongs to. Pinning the origin would also break local development
 * against the same project.
 */
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
  // Answered before the auth check on purpose: a preflight never carries credentials, so
  // rejecting it for having no Authorization header rejects every browser call there is.
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  // Scoped to the caller's own JWT: every query below runs under THEIR identity and is
  // bound by the RLS policies in supabase/migrations/0001_accounts.sql. This client is
  // never given the service-role key, so there is no privileged bypass to misuse.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Not authenticated' }, 401);
  const userId = userData.user.id;

  let body: ReconcileRequest = {};
  try {
    body = await req.json();
  } catch {
    // No body, or not JSON: treat as "no daily tasks currently offered".
  }

  const [discoveries, learned, mastered, research, achievements, sightings] =
    await Promise.all([
      supabase.from('discoveries').select('herb_id, discovered_at').eq('user_id', userId),
      supabase.from('learned').select('herb_id, learned_at').eq('user_id', userId),
      supabase.from('mastered').select('herb_id, mastered_at').eq('user_id', userId),
      supabase
        .from('research_completions')
        .select('task_id, completed_at')
        .eq('user_id', userId),
      supabase
        .from('unlocked_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId),
      supabase.from('sightings').select('herb_id').eq('user_id', userId),
    ]);

  for (const [name, result] of Object.entries({
    discoveries,
    learned,
    mastered,
    research,
    achievements,
    sightings,
  })) {
    if (result.error) {
      return json({ error: `Failed to load ${name}: ${result.error.message}` }, 500);
    }
  }

  const state: HerbdexState = {
    ...emptyState(),
    discoveries: rowsToRecord(discoveries.data, 'herb_id', 'discovered_at'),
    learned: rowsToRecord(learned.data, 'herb_id', 'learned_at'),
    mastered: rowsToRecord(mastered.data, 'herb_id', 'mastered_at'),
    research: rowsToRecord(research.data, 'task_id', 'completed_at'),
    achievements: rowsToRecord(achievements.data, 'achievement_id', 'unlocked_at'),
  };

  const sightingCounts: Record<string, number> = {};
  for (const row of sightings.data ?? []) {
    const herbId = (row as { herb_id?: unknown }).herb_id;
    if (typeof herbId === 'string') {
      sightingCounts[herbId] = (sightingCounts[herbId] ?? 0) + 1;
    }
  }

  const world = buildWorld(state, sightingCounts);
  const activeDailyTasks = (body.dailyTaskIds ?? [])
    .map((id) => researchTaskById(id))
    .filter((task): task is NonNullable<typeof task> => task !== undefined);
  const activeTasks = [...STANDING_TASKS, ...activeDailyTasks];

  const masteryOutcome = reconcileMastery(state, sightingCounts);
  const researchOutcome = reconcileResearch(masteryOutcome.state, world, activeTasks);

  const at = new Date().toISOString();
  const newAchievementIds = [
    ...masteryOutcome.newAchievementIds,
    ...researchOutcome.newAchievementIds,
  ];

  // Every write below is a no-op on conflict — the same (user_id, entity_id) uniqueness
  // that already governs discoveries — so a retried request (a flaky connection, a
  // duplicate click) can never double-write a row or double-pay XP for it.
  // `PromiseLike`, not `Promise`: a PostgREST builder is a thenable that only issues its
  // request when awaited. `Promise.all` takes thenables happily; typing this as `Promise`
  // is what `deno check` rejects, and `deno check` is how this function is validated
  // (the project's tsconfig excludes supabase/**, so nothing else would catch it).
  const writes: PromiseLike<unknown>[] = [];
  for (const herbId of masteryOutcome.masteredIds) {
    writes.push(
      supabase
        .from('mastered')
        .upsert(
          { user_id: userId, herb_id: herbId, mastered_at: at },
          { onConflict: 'user_id,herb_id', ignoreDuplicates: true },
        ),
    );
  }
  for (const taskId of researchOutcome.completedIds) {
    writes.push(
      supabase
        .from('research_completions')
        .upsert(
          { user_id: userId, task_id: taskId, completed_at: at },
          { onConflict: 'user_id,task_id', ignoreDuplicates: true },
        ),
    );
  }
  for (const achievementId of newAchievementIds) {
    writes.push(
      supabase
        .from('unlocked_achievements')
        .upsert(
          { user_id: userId, achievement_id: achievementId, unlocked_at: at },
          { onConflict: 'user_id,achievement_id', ignoreDuplicates: true },
        ),
    );
  }
  await Promise.all(writes);

  return json({
    masteredIds: masteryOutcome.masteredIds,
    completedResearchIds: researchOutcome.completedIds,
    newAchievementIds,
  });
});
