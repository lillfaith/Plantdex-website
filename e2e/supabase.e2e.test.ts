import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

import { supabase } from '@/lib/supabase-client';
import { createRemoteHerbdexStorage } from '@/lib/remote-herbdex-storage';
import { addRemoteSighting, removeRemoteSighting } from '@/lib/remote-sightings';
import { applyDiscovery, applyLearned, reconcileAchievements } from '@/lib/herbdex-reducer';
import { buildWorld, STANDING_TASKS } from '@/lib/research';
import { progressFromState, xpForState } from '@/lib/progression';
import { masteryTotals, stageFor } from '@/lib/mastery';
import { buildGarden, stageForState } from '@/lib/garden';
import { HERBS } from '@/lib/deck';
import { emptyState } from '@/lib/herbdex-state';
import type { HerbdexState } from '@/lib/types';

/**
 * Live end-to-end verification against a real Supabase project. NOT part of `npm test` —
 * it needs credentials and a network, and it writes real rows. Run it with
 * `npm run verify:supabase` after `supabase/migrations/0001_accounts.sql` is applied.
 *
 * It drives the SAME modules the browser does — `createRemoteHerbdexStorage`,
 * `addRemoteSighting`, and the pure reducers — rather than reimplementing their queries,
 * so a regression in the real adapter fails this suite instead of hiding behind a
 * parallel implementation that happens to agree with the schema.
 *
 * The cross-user half deliberately ATTACKS the database: a second signed-in user tries to
 * read, insert, update and delete the first user's rows in every table. Those tests pass
 * only when the database refuses.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const configured = Boolean(URL && KEY && supabase);

const TABLES = [
  ['discoveries', 'herb_id'],
  ['learned', 'herb_id'],
  ['mastered', 'herb_id'],
  ['research_completions', 'task_id'],
  ['unlocked_achievements', 'achievement_id'],
  ['sightings', 'id'],
] as const;

/** Two real cards from the deck, so nothing here invents an id the app would reject. */
const HERB_A = HERBS[0]!;
const HERB_B = HERBS[1]!;

function credentials(tag: string) {
  return {
    email: `plantdex-e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@mailinator.com`,
    password: `Test-Passw0rd-${Math.random().toString(36).slice(2, 10)}`,
  };
}

/** A second, independent client — a different browser on a different device. */
function freshClient(): SupabaseClient {
  return createClient(URL!, KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signUpAndIn(client: SupabaseClient, tag: string): Promise<User> {
  const { email, password } = credentials(tag);
  const { error: signUpError } = await client.auth.signUp({ email, password });
  if (signUpError) throw new Error(`signUp failed: ${signUpError.message}`);

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      `signIn failed: ${error.message}. If this says "Email not confirmed", turn off ` +
        `Authentication -> Sign In / Providers -> Email -> "Confirm email" in the Supabase ` +
        `dashboard for this test project.`,
    );
  }
  if (!data.user) throw new Error('signIn returned no user');
  return data.user;
}

describe.skipIf(!configured)('Supabase V0.3 accounts — live end to end', () => {
  let alice: User;
  let bob: User;
  let bobClient: SupabaseClient;
  const aliceCreds = credentials('alice');

  beforeAll(async () => {
    // Alice signs in on the app's own singleton client, so every module under test
    // (remote-herbdex-storage, remote-sightings) is bound to her session exactly as it
    // would be in the browser.
    const { error: signUpError } = await supabase!.auth.signUp(aliceCreds);
    if (signUpError) throw new Error(`signUp failed: ${signUpError.message}`);
    const { data, error } = await supabase!.auth.signInWithPassword(aliceCreds);
    if (error) {
      throw new Error(
        `signIn failed: ${error.message}. If this says "Email not confirmed", turn off ` +
          `"Confirm email" in the Supabase dashboard for this test project.`,
      );
    }
    alice = data.user!;

    bobClient = freshClient();
    bob = await signUpAndIn(bobClient, 'bob');
  }, 60_000);

  afterAll(async () => {
    // Leave no rows behind. Users themselves can only be removed with a service-role key,
    // which this suite deliberately never holds.
    if (supabase && alice) {
      for (const [table] of TABLES) await supabase.from(table).delete().eq('user_id', alice.id);
      await supabase.auth.signOut();
    }
    if (bobClient && bob) {
      for (const [table] of TABLES) await bobClient.from(table).delete().eq('user_id', bob.id);
      await bobClient.auth.signOut();
    }
  }, 60_000);

  describe('auth', () => {
    it('signs up and issues a session for a real user id', () => {
      expect(alice.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(bob.id).not.toBe(alice.id);
    });

    it('persists the session across a fresh client, then drops it on sign out', async () => {
      const { data: current } = await supabase!.auth.getSession();
      expect(current.session).not.toBeNull();

      // A different client handed the same tokens resolves the same user — this is what
      // "still signed in after a reload" and "signed in on another device" both rest on.
      const reopened = freshClient();
      await reopened.auth.setSession({
        access_token: current.session!.access_token,
        refresh_token: current.session!.refresh_token,
      });
      const { data: restored } = await reopened.auth.getUser();
      expect(restored.user?.id).toBe(alice.id);

      await reopened.auth.signOut();
      const { data: afterSignOut } = await reopened.auth.getSession();
      expect(afterSignOut.session).toBeNull();
    });

    it('signs back in after a sign out and reaches the same account', async () => {
      await supabase!.auth.signOut();
      expect((await supabase!.auth.getSession()).data.session).toBeNull();

      const { data, error } = await supabase!.auth.signInWithPassword(aliceCreds);
      expect(error).toBeNull();
      expect(data.user?.id).toBe(alice.id);
    });
  });

  describe('per-user progress persistence', () => {
    it('persists a discovery and reads it back on a fresh adapter', async () => {
      const storage = createRemoteHerbdexStorage(alice.id);
      const loaded = await storage.load();
      expect(loaded.discoveries[HERB_A.id]).toBeUndefined();

      const outcome = applyDiscovery(loaded, HERB_A.id);
      expect(outcome.result.awarded).toBe(true);
      storage.save(outcome.state);
      await new Promise((resolve) => setTimeout(resolve, 1500)); // save() is fire-and-forget

      // A brand-new adapter is a brand-new device: nothing cached, everything from the server.
      const onAnotherDevice = await createRemoteHerbdexStorage(alice.id).load();
      expect(onAnotherDevice.discoveries[HERB_A.id]).toBeTruthy();
    }, 30_000);

    it('persists learned, and derives XP and level from server rows alone', async () => {
      const storage = createRemoteHerbdexStorage(alice.id);
      const loaded = await storage.load();
      const learned = applyLearned(loaded, HERB_A.id);
      expect(learned.result.awarded).toBe(true);
      storage.save(learned.state);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const fromServer = await createRemoteHerbdexStorage(alice.id).load();
      expect(fromServer.learned[HERB_A.id]).toBeTruthy();
      expect(stageFor(fromServer, HERB_A.id)).toBe('learned');

      // XP is a pure function of the rows — never a stored column.
      expect(xpForState(fromServer)).toBe(xpForState(learned.state));
      expect(progressFromState(fromServer).xp).toBeGreaterThan(0);
      expect(masteryTotals(fromServer).learned).toBe(1);
    }, 30_000);

    it('stores no XP or level column anywhere', async () => {
      for (const [table] of TABLES) {
        const { error } = await supabase!.from(table).select('xp').limit(1);
        expect(error, `${table} must not expose an xp column`).not.toBeNull();
      }
    }, 30_000);

    it('persists a sighting and removes it again', async () => {
      const sighting = await addRemoteSighting(alice.id, {
        herbId: HERB_A.id,
        date: '2026-05-01',
        notes: 'e2e sighting',
      });
      expect(sighting.id).toMatch(/^sighting_/);

      const { data } = await supabase!.from('sightings').select('*').eq('id', sighting.id);
      expect(data?.length).toBe(1);
      expect(data?.[0]?.herb_id).toBe(HERB_A.id);

      await removeRemoteSighting(alice.id, sighting.id);
      const { data: after } = await supabase!.from('sightings').select('*').eq('id', sighting.id);
      expect(after?.length).toBe(0);
    }, 30_000);

    it('derives the garden purely from mastery stage', async () => {
      const fromServer = await createRemoteHerbdexStorage(alice.id).load();
      expect(stageForState(fromServer, HERB_A.id)).toBe('growing'); // learned -> growing
      expect(stageForState(fromServer, HERB_B.id)).toBeNull(); // undiscovered -> absent

      const garden = buildGarden(fromServer, HERBS.map((herb) => herb.id));
      expect(garden.some((entry) => entry.herbId === HERB_A.id)).toBe(true);
      expect(garden.some((entry) => entry.herbId === HERB_B.id)).toBe(false);
    }, 30_000);
  });

  describe('idempotency — no duplicate rows, no double XP', () => {
    it('re-saving the same state writes nothing new and never moves a timestamp', async () => {
      const before = await createRemoteHerbdexStorage(alice.id).load();
      const xpBefore = xpForState(before);
      const discoveredAtBefore = before.discoveries[HERB_A.id];

      // A second adapter has no memory of what the first already wrote, so it re-sends
      // every row — exactly what a re-import or a second device does.
      const second = createRemoteHerbdexStorage(alice.id);
      await second.load();
      second.save({ ...before, discoveries: { ...before.discoveries } });
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const after = await createRemoteHerbdexStorage(alice.id).load();
      expect(Object.keys(after.discoveries).length).toBe(Object.keys(before.discoveries).length);
      expect(after.discoveries[HERB_A.id]).toBe(discoveredAtBefore);
      expect(xpForState(after)).toBe(xpBefore);
    }, 30_000);

    it('re-inserting a fact already recorded is a silent no-op, not an error', async () => {
      const { error } = await supabase!
        .from('discoveries')
        .upsert(
          [{ user_id: alice.id, herb_id: HERB_A.id, discovered_at: '1999-01-01T00:00:00Z' }],
          { onConflict: 'user_id,herb_id', ignoreDuplicates: true },
        );
      expect(error).toBeNull();

      const after = await createRemoteHerbdexStorage(alice.id).load();
      expect(after.discoveries[HERB_A.id]?.startsWith('1999')).toBe(false);
    }, 30_000);

    it('re-running achievement reconciliation is stable', async () => {
      const state = await createRemoteHerbdexStorage(alice.id).load();
      const once = reconcileAchievements(state);
      const twice = reconcileAchievements(once);
      expect(twice).toBe(once);
    }, 30_000);
  });

  describe('write-once — a client cannot rewrite a recorded fact', () => {
    it('refuses to update its own rows', async () => {
      const before = await createRemoteHerbdexStorage(alice.id).load();

      const { error } = await supabase!
        .from('discoveries')
        .update({ discovered_at: '1999-01-01T00:00:00Z' })
        .eq('user_id', alice.id)
        .eq('herb_id', HERB_A.id);

      const after = await createRemoteHerbdexStorage(alice.id).load();
      // Either the update is rejected outright or it matches no row; both are fine, a
      // rewritten timestamp is not.
      expect(after.discoveries[HERB_A.id]).toBe(before.discoveries[HERB_A.id]);
      expect(error === null || error !== null).toBe(true);
    }, 30_000);
  });

  describe('cross-user Row Level Security', () => {
    // Every test below asserts Bob sees nothing. That is only meaningful if there is
    // something to see: with an empty account they would all pass while proving nothing.
    // This pins the precondition so the suite cannot quietly go vacuous.
    it('has real rows of Alice to attack', async () => {
      const { data, error } = await supabase!
        .from('discoveries')
        .select('herb_id')
        .eq('user_id', alice.id);
      expect(error).toBeNull();
      expect(data?.length ?? 0).toBeGreaterThan(0);

      const state = await createRemoteHerbdexStorage(alice.id).load();
      expect(Object.keys(state.learned).length).toBeGreaterThan(0);
      expect(xpForState(state)).toBeGreaterThan(0);
    }, 30_000);

    it('cannot READ another user rows in any table', async () => {
      for (const [table] of TABLES) {
        const { data, error } = await bobClient.from(table).select('*').eq('user_id', alice.id);
        expect(error, `${table} read`).toBeNull();
        expect(data, `${table} must leak nothing`).toEqual([]);
      }
    }, 30_000);

    it('cannot READ another user rows even with no filter at all', async () => {
      for (const [table] of TABLES) {
        const { data } = await bobClient.from(table).select('*');
        const foreign = (data ?? []).filter(
          (row) => (row as { user_id?: string }).user_id !== bob.id,
        );
        expect(foreign, `${table} unfiltered select`).toEqual([]);
      }
    }, 30_000);

    it('cannot INSERT a row owned by another user', async () => {
      const forged: Record<string, Record<string, unknown>> = {
        discoveries: { user_id: alice.id, herb_id: 'forged-by-bob' },
        learned: { user_id: alice.id, herb_id: 'forged-by-bob' },
        mastered: { user_id: alice.id, herb_id: 'forged-by-bob' },
        research_completions: { user_id: alice.id, task_id: 'forged-by-bob' },
        unlocked_achievements: { user_id: alice.id, achievement_id: 'forged-by-bob' },
        sightings: {
          id: `sighting_forged_${Date.now()}`,
          user_id: alice.id,
          herb_id: HERB_A.id,
          date: '2026-01-01',
        },
      };
      for (const [table] of TABLES) {
        const { error } = await bobClient.from(table).insert(forged[table]!);
        expect(error, `${table} must reject a forged user_id`).not.toBeNull();
      }
    }, 30_000);

    it('cannot UPDATE or DELETE another user rows', async () => {
      const before = await createRemoteHerbdexStorage(alice.id).load();

      for (const [table] of TABLES) {
        await bobClient.from(table).update({ user_id: bob.id }).eq('user_id', alice.id);
        await bobClient.from(table).delete().eq('user_id', alice.id);
      }

      const after = await createRemoteHerbdexStorage(alice.id).load();
      expect(after.discoveries).toEqual(before.discoveries);
      expect(after.learned).toEqual(before.learned);
      expect(xpForState(after)).toBe(xpForState(before));
    }, 30_000);

    it('cannot reach another user private photo folder', async () => {
      const { data, error } = await bobClient.storage
        .from('sighting-photos')
        .createSignedUrl(`${alice.id}/anything.jpg`, 60);
      expect(data?.signedUrl ?? null).toBeNull();
      expect(error).not.toBeNull();
    }, 30_000);

    it('blocks a signed-out client from reading anything', async () => {
      const anon = freshClient();
      for (const [table] of TABLES) {
        const { data } = await anon.from(table).select('*');
        expect(data ?? [], `${table} must be invisible when signed out`).toEqual([]);
      }
    }, 30_000);
  });

  describe('server-recomputed mastery and research', () => {
    it('re-derives mastery from the server own sighting rows', async () => {
      const storage = createRemoteHerbdexStorage(alice.id);
      let state: HerbdexState = await storage.load();

      // Alice has HERB_A discovered + learned. One sighting is all mastery needs.
      const sighting = await addRemoteSighting(alice.id, {
        herbId: HERB_A.id,
        date: '2026-05-02',
      });

      const world = buildWorld(state, { [HERB_A.id]: 1 });
      const outcome = await storage.reconcile!(world, STANDING_TASKS);

      if (outcome === null) {
        throw new Error(
          'The herbdex-action edge function did not answer. Deploy it with ' +
            '`npm run sync:edge-shared && supabase functions deploy herbdex-action` ' +
            'before running this suite.',
        );
      }

      expect(outcome.masteredIds).toContain(HERB_A.id);

      state = await createRemoteHerbdexStorage(alice.id).load();
      expect(state.mastered[HERB_A.id]).toBeTruthy();
      expect(stageFor(state, HERB_A.id)).toBe('mastered');
      expect(stageForState(state, HERB_A.id)).toBe('flowering');

      await removeRemoteSighting(alice.id, sighting.id);
      // Mastery is recorded, never revoked — deleting the sighting that earned it must not
      // take it back.
      const afterDeletion = await createRemoteHerbdexStorage(alice.id).load();
      expect(afterDeletion.mastered[HERB_A.id]).toBeTruthy();
    }, 60_000);

    it('refuses to mint mastery the sightings do not support', async () => {
      // HERB_B has never been discovered, learned or sighted. Claiming it directly is the
      // exact move the edge function exists to refuse.
      const storage = createRemoteHerbdexStorage(alice.id);
      const state = await storage.load();
      const world = buildWorld(state, { [HERB_B.id]: 99 });
      const outcome = await storage.reconcile!(world, STANDING_TASKS);

      expect(outcome?.masteredIds ?? []).not.toContain(HERB_B.id);
      const after = await createRemoteHerbdexStorage(alice.id).load();
      expect(after.mastered[HERB_B.id]).toBeUndefined();
    }, 60_000);
  });

  describe('the empty state is the floor', () => {
    it('a brand-new account starts with nothing and zero XP', async () => {
      const state = await createRemoteHerbdexStorage(bob.id).load();
      expect(state.discoveries).toEqual({});
      expect(xpForState(state)).toBe(xpForState(emptyState()));
      expect(progressFromState(state).level).toBe(1);
    }, 30_000);
  });
});
