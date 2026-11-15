import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PRINTED_CARDS } from '@/lib/deck';
import { emptyState } from '@/lib/herbdex-state';
import { scoreFromRecords, LEADERBOARD_POINTS } from '@/lib/leaderboard';
import { launchedRegions } from '@/lib/regions';
import { researchTaskById } from '@/lib/research';

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

// Short on purpose: "E2E Alice " + this must fit profiles.display_name (24).
const STAMP = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const ALICE_NAME = `E2E Alice ${STAMP}`;
const BOB_NAME = `E2E Bob ${STAMP}`;
/**
 * THE FIVE CARDS OF `collection:backyard`, READ FROM THE TASK ITSELF. Migration 0013 removed the
 * client insert policy on `research_completions`, so a completion can only come from
 * `herbdex-action` after the account genuinely meets the task. Alice therefore finds exactly
 * these five and asks the function to reconcile; nothing here asserts a completion directly.
 */
const BACKYARD = researchTaskById('collection:backyard')!;
const BACKYARD_HERBS = [...BACKYARD.herbIds];
const HERB_A = BACKYARD_HERBS[0]!;
/** A real daily, offered to the function and genuinely satisfied. It must be recorded and pay nothing. */
const DAILY_ID = `daily:revisit:${HERB_A}`;
const JOURNAL_NOTE = 'Rosette by the path edge, three flower heads open.';
// Not one of Alice's finds, so its absence from the board is a real check.
const ALICE_AVATAR = PRINTED_CARDS.find((card) => !BACKYARD_HERBS.includes(card.id))!.id;

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
  const SIGHTING_ID = `sighting_e2e_lb_${STAMP}`;
  let reconciledIds: string[] = [];

  beforeAll(async () => {
    anonClient = freshClient();
    aliceClient = freshClient();
    bobClient = freshClient();
    alice = await signUpAndIn(aliceClient, 'lb-alice');
    bob = await signUpAndIn(bobClient, 'lb-bob');

    // Alice: the five backyard finds and one journal entry with a real note. Bob: one find, and
    // he never joins until a later test asks him to. No research row is written here.
    const inserts = await Promise.all([
      aliceClient.from('discoveries').insert(
        BACKYARD_HERBS.map((herb_id) => ({ user_id: alice.id, herb_id, discovered_at: at })),
      ),
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

    // After the discovery exists: the journal entry is a RETURN to a species already found.
    const entry = await aliceClient.from('sightings').insert({
      id: SIGHTING_ID,
      user_id: alice.id,
      herb_id: HERB_A,
      date: at.slice(0, 10),
      notes: JOURNAL_NOTE,
    });
    expect(entry.error, JSON.stringify(entry.error)).toBeNull();

    // THE ONLY ROUTE TO A COMPLETION. The function recomputes from its own reads and writes the
    // row with the service role; the daily is offered so that it is recorded as well.
    const reconciled = await aliceClient.functions.invoke('herbdex-action', {
      body: { dailyTaskIds: [DAILY_ID] },
    });
    expect(reconciled.error, String(reconciled.error?.message)).toBeNull();
    reconciledIds = [...((reconciled.data as { completedResearchIds?: string[] }).completedResearchIds ?? [])].sort();
  }, 90_000);

  afterAll(async () => {
    // Leave no rows behind. Users themselves need a service-role key to remove, which this suite
    // deliberately never holds.
    for (const [client, user] of [[aliceClient, alice], [bobClient, bob]] as const) {
      if (!client || !user) continue;
      for (const table of ['leaderboard_participants', 'sightings', 'discoveries', 'research_completions', 'unlocked_achievements', 'profiles']) {
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

  it('research completions come only from the server, and only for work really done', async () => {
    // Exactly the challenge Alice met and the daily she was offered: no other standing task is
    // satisfied by five finds and one sighting, so anything more is the function over-paying.
    expect(reconciledIds).toEqual(['collection:backyard', DAILY_ID].sort());
    const stored = await aliceClient.from('research_completions').select('task_id').eq('user_id', alice.id);
    expect((stored.data ?? []).map((row) => row.task_id).sort()).toEqual(reconciledIds);

    // The direct route 0013 closed: a real task id, the caller's own row, and still refused.
    for (const task_id of ['collection:hard-to-find', 'collection:backyard']) {
      const forged = await aliceClient.from('research_completions').insert({ user_id: alice.id, task_id });
      expect(forged.error, `a client must not insert ${task_id}`).not.toBeNull();
    }
    // Bob has one find. Reconciling must give him nothing.
    const bobs = await bobClient.functions.invoke('herbdex-action', { body: { dailyTaskIds: [DAILY_ID] } });
    expect(bobs.error).toBeNull();
    expect((bobs.data as { completedResearchIds: string[] }).completedResearchIds).toEqual([]);
    const bobStored = await bobClient.from('research_completions').select('task_id').eq('user_id', bob.id);
    expect(bobStored.data ?? []).toHaveLength(0);
  });

  it('joining lists only you, scored by the server with the same rule the client uses', async () => {
    const { error } = await aliceClient
      .from('leaderboard_participants')
      .insert({ user_id: alice.id, region_id: null });
    expect(error).toBeNull();

    const own = mine(await standings(aliceClient))!;
    expect(own.display_name).toBe(ALICE_NAME);
    expect(own.discoveries).toBe(5);
    expect(own.journal_entries).toBe(1);
    expect(own.photo_backed_entries).toBe(0);
    // One, although two completions are stored: the daily is recorded and pays nothing.
    expect(own.challenges).toBe(1);
    expect(own.discovery_points).toBe(5 * LEADERBOARD_POINTS.discovery);
    expect(own.journal_points).toBe(LEADERBOARD_POINTS.journalEntry);
    expect(own.challenge_points).toBe(LEADERBOARD_POINTS.challenge);
    expect(own.points).toBe(
      5 * LEADERBOARD_POINTS.discovery + LEADERBOARD_POINTS.journalEntry + LEADERBOARD_POINTS.challenge,
    );

    // "Your points" on the page and the board's points are one metric: the client rule, run over
    // the same records, must equal the server's number.
    const state = emptyState();
    state.discoveries = Object.fromEntries(BACKYARD_HERBS.map((id) => [id, at]));
    state.research = { 'collection:backyard': at, [DAILY_ID]: at };
    const journal = [{ herbId: HERB_A, notes: JOURNAL_NOTE, createdAt: at }];
    expect(scoreFromRecords(state, journal).points).toBe(own.points);

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
    expect(mine(await standings(aliceClient))!.discoveries).toBe(5);
  });

  it('publishes exactly the documented fields and nothing identifying', async () => {
    const view = await standings(bobClient);
    const row = named(view, ALICE_NAME)!;
    expect(Object.keys(row).sort()).toEqual(PUBLISHED);

    const text = JSON.stringify(view);
    for (const secret of [alice.id, alice.email ?? 'no-email', ALICE_AVATAR, 'e2e-private-title', JOURNAL_NOTE, SIGHTING_ID]) {
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
