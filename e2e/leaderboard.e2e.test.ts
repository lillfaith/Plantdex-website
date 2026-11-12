import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PRINTED_CARDS } from '@/lib/deck';
import { emptyState } from '@/lib/herbdex-state';
import { scoreFromRecords, LEADERBOARD_POINTS } from '@/lib/leaderboard';
import { launchedRegions } from '@/lib/regions';

/**
 * THE FIELD BOARD, ATTACKED FROM TWO ACCOUNTS.
 *
 * Runs only against the TEST Supabase project (`npm run verify:supabase`, credentials from
 * `.env.local`) and is skipped everywhere else, including `npm test` and CI without secrets. It
 * never touches production: it reads the same two variables the rest of the live suite reads,
 * and that file points at the test project.
 *
 * Two isolated users, Alice and Bob, each on their own client with no shared session. Every
 * assertion is about what ONE account can see or do to the OTHER, and none weakens a policy: the
 * suite only ever acts as an ordinary signed-in player or as nobody.
 *
 * Assertions about the board are RELATIVE. The test project may hold other participants, so
 * "Alice is listed" is found by `is_self`, and "Alice is not visible to Bob" is checked by the
 * run's unique display name and by the absence of any identifying field.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const configured = Boolean(URL && KEY);

/**
 * NEVER AGAINST PRODUCTION. This suite signs up users and writes rows. If the environment points
 * at a production project the whole file fails loudly instead of quietly skipping, so nobody can
 * mistake "skipped" for "passed" and nobody can run it by accident. The refs are listed in
 * `supabase/README.md` (test) and `docs/leaderboard-production-checklist.md` (production).
 */
const PRODUCTION_REFS = ['vygiamigomwlvnwkryyl'];
if (URL && PRODUCTION_REFS.some((ref) => URL.includes(ref))) {
  throw new Error('e2e/leaderboard.e2e.test.ts refuses to run against the production project.');
}

const STAMP = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
const ALICE_NAME = `E2E Alice ${STAMP}`;
const BOB_NAME = `E2E Bob ${STAMP}`;
const HERB_A = PRINTED_CARDS[0]!.id;
const HERB_B = PRINTED_CARDS[1]!.id;
const ALICE_AVATAR = PRINTED_CARDS[2]!.id;

/** The exact set of columns `leaderboard_standings()` may return. Anything else is a leak. */
const PUBLISHED = [
  'challenge_points', 'challenges', 'discoveries', 'discovery_points', 'display_name',
  'is_self', 'journal_entries', 'journal_points', 'photo_backed_entries', 'points',
  'region_id', 'standing',
].sort();

function freshClient(): SupabaseClient {
  return createClient(URL!, KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signUpAndIn(client: SupabaseClient, tag: string): Promise<User> {
  const email = `plantdex-e2e-${tag}-${STAMP}@mailinator.com`;
  const password = `Test-Passw0rd-${Math.random().toString(36).slice(2, 10)}`;
  const { error: signUpError } = await client.auth.signUp({ email, password });
  if (signUpError) throw new Error(`signUp failed: ${signUpError.message}`);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(
      `signIn failed: ${error?.message}. If this says "Email not confirmed", turn off "Confirm email" ` +
        `for this TEST project in the Supabase dashboard.`,
    );
  }
  return data.user;
}

type Row = Record<string, unknown>;

async function standings(client: SupabaseClient, region: string | null = null, limit = 200) {
  const { data, error } = await client.rpc('leaderboard_standings', {
    p_region: region,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

const named = (rows: Row[], name: string) => rows.find((row) => row.display_name === name);
const mine = (rows: Row[]) => rows.find((row) => row.is_self === true);

describe.skipIf(!configured)('Field Board — live cross-account privacy and security', () => {
  let alice: User;
  let bob: User;
  let aliceClient: SupabaseClient;
  let bobClient: SupabaseClient;
  let anonClient: SupabaseClient;
  const region = launchedRegions()[0]?.id ?? null;
  const at = new Date().toISOString();

  beforeAll(async () => {
    anonClient = freshClient();
    aliceClient = freshClient();
    bobClient = freshClient();
    alice = await signUpAndIn(aliceClient, 'lb-alice');
    bob = await signUpAndIn(bobClient, 'lb-bob');

    // Alice: two finds and one completed collection challenge. A daily task is recorded too, and
    // must pay nothing. Bob: one find, and he never joins until a later test asks him to.
    const inserts = await Promise.all([
      aliceClient.from('discoveries').insert([
        { user_id: alice.id, herb_id: HERB_A, discovered_at: at },
        { user_id: alice.id, herb_id: HERB_B, discovered_at: at },
      ]),
      aliceClient.from('research_completions').insert([
        { user_id: alice.id, task_id: 'collection:backyard', completed_at: at },
        { user_id: alice.id, task_id: 'daily:e2e-leaderboard', completed_at: at },
      ]),
      bobClient.from('discoveries').insert({ user_id: bob.id, herb_id: HERB_A, discovered_at: at }),
      aliceClient.from('profiles').upsert({
        user_id: alice.id,
        display_name: ALICE_NAME,
        avatar_herb_id: ALICE_AVATAR,
        title_id: 'e2e-private-title',
      }),
      bobClient.from('profiles').upsert({ user_id: bob.id, display_name: BOB_NAME }),
    ]);
    for (const result of inserts) expect(result.error, JSON.stringify(result.error)).toBeNull();
  }, 90_000);

  afterAll(async () => {
    // Leave no rows behind. Users themselves need a service-role key to remove, which this suite
    // deliberately never holds.
    for (const [client, user] of [[aliceClient, alice], [bobClient, bob]] as const) {
      if (!client || !user) continue;
      for (const table of ['leaderboard_participants', 'discoveries', 'research_completions', 'profiles']) {
        await client.from(table).delete().eq('user_id', user.id);
      }
      await client.auth.signOut();
    }
  }, 60_000);

  it('opt-in: nobody is listed, or readable, until they join', async () => {
    for (const client of [aliceClient, bobClient]) {
      const rows = await standings(client);
      expect(mine(rows), 'a player who never joined must have no row').toBeUndefined();
      expect(named(rows, ALICE_NAME)).toBeUndefined();
      expect(named(rows, BOB_NAME)).toBeUndefined();
    }
  });

  it('joining lists only you, scored by the server with the same rule the client uses', async () => {
    const { error } = await aliceClient
      .from('leaderboard_participants')
      .insert({ user_id: alice.id, region_id: null });
    expect(error).toBeNull();

    const own = mine(await standings(aliceClient))!;
    expect(own.display_name).toBe(ALICE_NAME);
    expect(own.discoveries).toBe(2);
    expect(own.challenges).toBe(1);
    expect(own.points).toBe(2 * LEADERBOARD_POINTS.discovery + LEADERBOARD_POINTS.challenge);

    // "Your points" on the page and the board's points are one metric: the client rule, run over
    // the same records, must equal the server's number.
    const state = emptyState();
    state.discoveries = { [HERB_A]: at, [HERB_B]: at };
    state.research = { 'collection:backyard': at, 'daily:e2e-leaderboard': at };
    expect(scoreFromRecords(state, []).points).toBe(own.points);

    // Bob never joined, so he sees Alice, and Alice's row is not his.
    const bobsView = await standings(bobClient);
    expect(mine(bobsView)).toBeUndefined();
    expect(named(bobsView, ALICE_NAME)?.points).toBe(own.points);
    expect(named(bobsView, BOB_NAME)).toBeUndefined();
  });

  it('a duplicate discovery cannot add points', async () => {
    const duplicate = await aliceClient
      .from('discoveries')
      .insert({ user_id: alice.id, herb_id: HERB_A, discovered_at: at });
    expect(duplicate.error, 'one row per (user, species) by primary key').not.toBeNull();
    expect(mine(await standings(aliceClient))!.discoveries).toBe(2);
  });

  it('publishes exactly the documented fields and nothing identifying', async () => {
    const view = await standings(bobClient);
    const row = named(view, ALICE_NAME)!;
    expect(Object.keys(row).sort()).toEqual(PUBLISHED);

    const text = JSON.stringify(view);
    for (const secret of [alice.id, alice.email ?? 'no-email', ALICE_AVATAR, 'e2e-private-title']) {
      expect(text, `the board must not carry ${secret}`).not.toContain(secret);
    }
  });

  it('restricted profile fields stay private to their owner', async () => {
    const theirProfile = await bobClient.from('profiles').select('*').eq('user_id', alice.id);
    expect(theirProfile.data ?? []).toHaveLength(0);
    const theirListing = await bobClient.from('leaderboard_participants').select('*').eq('user_id', alice.id);
    expect(theirListing.data ?? []).toHaveLength(0);
    const theirFinds = await bobClient.from('discoveries').select('*').eq('user_id', alice.id);
    expect(theirFinds.data ?? []).toHaveLength(0);
  });

  it('refuses writes to somebody else’s listing, and a malformed region', async () => {
    const forged = await bobClient
      .from('leaderboard_participants')
      .insert({ user_id: alice.id, region_id: null });
    expect(forged.error, 'Bob must not be able to list Alice').not.toBeNull();

    const badRegion = await bobClient
      .from('leaderboard_participants')
      .insert({ user_id: bob.id, region_id: 'Atlanta, my back garden' });
    expect(badRegion.error, 'a sentence is not a region').not.toBeNull();

    // No delete or update reaches Alice's row from Bob's session.
    await bobClient.from('leaderboard_participants').delete().eq('user_id', alice.id);
    await bobClient.from('leaderboard_participants').update({ region_id: 'us-zz' }).eq('user_id', alice.id);
    const stillThere = await aliceClient.from('leaderboard_participants').select('region_id').eq('user_id', alice.id);
    expect(stillThere.data).toEqual([{ region_id: null }]);
    expect(mine(await standings(aliceClient))).toBeDefined();
  });

  it('regional filtering shows only that region, and the global board shows everyone', async () => {
    if (!region) return;
    const { error } = await bobClient
      .from('leaderboard_participants')
      .insert({ user_id: bob.id, region_id: region });
    expect(error).toBeNull();

    const regional = await standings(aliceClient, region);
    expect(named(regional, BOB_NAME)?.region_id).toBe(region);
    expect(named(regional, ALICE_NAME), 'Alice listed globally only').toBeUndefined();

    const everyone = await standings(aliceClient, null);
    expect(named(everyone, ALICE_NAME)).toBeDefined();
    expect(named(everyone, BOB_NAME)).toBeDefined();
  });

  it('opt-out removes the listing immediately', async () => {
    const { error } = await aliceClient.from('leaderboard_participants').delete().eq('user_id', alice.id);
    expect(error).toBeNull();
    expect(named(await standings(bobClient), ALICE_NAME)).toBeUndefined();
    expect(mine(await standings(aliceClient))).toBeUndefined();
  });

  it('is unavailable to a signed-out caller and capped in size', async () => {
    const out = await anonClient.rpc('leaderboard_standings', { p_region: null, p_limit: 50 });
    expect(out.error, 'standings are for signed-in players only').not.toBeNull();
    const direct = await anonClient.from('leaderboard_participants').select('*');
    expect(direct.error !== null || (direct.data ?? []).length === 0).toBe(true);

    expect((await standings(bobClient, null, 100_000)).length).toBeLessThanOrEqual(200);
  });
});
