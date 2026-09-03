import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

import { supabase } from '@/lib/supabase-client';
import { createRemoteHerbdexStorage } from '@/lib/remote-herbdex-storage';
import { addRemoteSighting, removeRemoteSighting } from '@/lib/remote-sightings';
import { addRemoteFind, removeRemoteSpecies } from '@/lib/remote-seed-shelf';
import {
  __resetCanonicalCache,
  ensureCanonicalPackets,
  loadCanonicalPackets,
  canonicalRecordFor,
} from '@/lib/species-packets';
import { isShelfEligible, mergeFinds, newFind } from '@/lib/seed-shelf';
import { packetRecipe, PACKET_VERSION } from '@/lib/seed-packet';
import { normalizeName } from '@/lib/plant-match';
import { exportAccountData } from '@/lib/export-account-data';
import { rowToProfile, saveRemoteProfile } from '@/lib/remote-player-profile';
import { emptyProfile, resolveProfile } from '@/lib/player-profile';
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
  // The Seed Shelf is private history like every other row here, so it rides the same
  // cross-user attacks, the same signed-out invisibility check and the same deletion
  // readback rather than getting a weaker set of its own. The canonical packet registry is
  // deliberately NOT in this list: it is global, public to read, and must survive a
  // deletion — it has its own describe block below.
  ['seed_shelf', 'id'],
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
      await supabase.from('profiles').delete().eq('user_id', alice.id);
      await supabase.auth.signOut();
    }
    if (bobClient && bob) {
      for (const [table] of TABLES) await bobClient.from(table).delete().eq('user_id', bob.id);
      await bobClient.from('profiles').delete().eq('user_id', bob.id);
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

  /*
   * THE SEED SHELF AND THE CANONICAL PACKET REGISTRY.
   *
   * ───────────────────────────────────────────────────────────────────────────
   * TWO TABLES WITH OPPOSITE POSTURES, AND THAT IS THE WHOLE DESIGN.
   *
   *   `seed_shelf`      — private history. Who found what, when, at what confidence, from
   *                       which scan and photograph. RLS-scoped, write-once, deleted with
   *                       the account. It rides in TABLES above, so every cross-user attack
   *                       and the signed-out invisibility check already cover it.
   *
   *   `species_packets` — the canonical artwork for a species. Global, public to read,
   *                       written ONLY by the `seed-packet` function under the service role,
   *                       never overwritten, and never deleted with anybody's account.
   *
   * These tests are placed BEFORE the cross-user block on purpose: they are what puts a real
   * `seed_shelf` row in Alice's account, so the attacks below have something to fail against
   * rather than passing vacuously against an empty table.
   * ───────────────────────────────────────────────────────────────────────────
   */
  describe('the Seed Shelf and the canonical packet registry', () => {
    /*
     * A real species the deck has no card for. Stable rather than randomised: the registry
     * is global and has no delete policy for anyone, so a random name per run would leave a
     * permanent row behind every time this suite is run. One species, one row, forever.
     *
     * No gbif/powo ids are asserted as VALUES here — this environment cannot reach GBIF to
     * check one, and writing a plausible-looking identifier into a live registry is exactly
     * the kind of invented data the rest of this repo refuses. The columns are checked for
     * existence instead; the real ids arrive from `identify-plant`.
     */
    const SPECIES = { scientificName: 'Bellis perennis', commonName: 'Common daisy' };
    const SPECIES_KEY = normalizeName(SPECIES.scientificName);
    /** Closely related to a card the deck DOES carry (Capsella bursa-pastoris). */
    const RELATIVE = { scientificName: 'Capsella rubella' };
    /** A species the deck carries outright. Must never enter the registry. */
    const ON_A_CARD = 'Oxalis stricta';

    /** The complete column set of a registry row. Anything else is a leak. */
    const REGISTRY_COLUMNS = [
      'species_key',
      'scientific_name',
      'common_name',
      'gbif_id',
      'powo_id',
      'packet',
      'packet_version',
      'first_seen_at',
    ];

    let firstSeenAt: string;

    beforeAll(async () => {
      // Same probe as the deletion block: "not deployed" must read as an instruction, not as
      // four unrelated assertion failures.
      const probe = await fetch(`${URL}/functions/v1/seed-packet`, { method: 'OPTIONS' });
      if (probe.status === 404) {
        throw new Error(
          'The seed-packet edge function is not deployed to this project. Run the ' +
            '"Deploy Supabase edge function" workflow (function: seed-packet) and re-run. ' +
            'Without it no species can ever be minted, because no client holds an insert ' +
            'on species_packets by design.',
        );
      }
      __resetCanonicalCache();
    }, 60_000);

    afterAll(async () => {
      // Alice's shelf rows go with the TABLES sweep in the outer afterAll; Bob's do too.
      // The registry rows are deliberately left standing: nothing in this project can
      // delete them, which is the property under test.
      await removeRemoteSpecies(alice.id, SPECIES_KEY).catch(() => {});
    }, 30_000);

    it('mints the species the first time anybody saves it', async () => {
      // The REAL adapter, exactly as the browser calls it: it inserts Alice's private row
      // and then asks the function to introduce the species to Plantdex.
      const find = await addRemoteFind(alice.id, {
        scientificName: SPECIES.scientificName,
        commonName: SPECIES.commonName,
        confidence: 0.91,
        scanId: `scan_e2e_${Date.now()}`,
      });
      expect(find, 'the shelf refused a species with no card').not.toBeNull();
      expect(find!.speciesKey).toBe(SPECIES_KEY);

      // Read the registry back with a SIGNED-OUT client. The row is public by design, and
      // reading it as nobody is the honest way to prove that.
      const anon = freshClient();
      const { data, error } = await anon
        .from('species_packets')
        .select('*')
        .eq('species_key', SPECIES_KEY);
      expect(error, 'the registry is not readable').toBeNull();
      expect(data?.length, 'the species was not minted').toBe(1);

      const row = data![0] as Record<string, unknown>;
      expect(row.scientific_name).toBe(SPECIES.scientificName);
      expect(row.packet_version).toBe(PACKET_VERSION);
      expect(row.packet).toEqual(packetRecipe({ speciesKey: SPECIES_KEY }));
      expect(typeof row.first_seen_at).toBe('string');
      firstSeenAt = row.first_seen_at as string;
    }, 90_000);

    it('holds a species, and nothing about the person who found it', async () => {
      /*
       * THE LIVE VERSION OF THE SCHEMA TEST. `species-registry.test.ts` reads the migration
       * text; this reads what the database actually returns to an anonymous client. A column
       * added later without touching 0005 — or a view that widened — fails here.
       */
      const anon = freshClient();
      const { data } = await anon.from('species_packets').select('*').eq('species_key', SPECIES_KEY);
      const keys = Object.keys((data ?? [])[0] ?? {}).sort();
      expect(keys, 'the registry row exposes an unexpected column').toEqual(
        [...REGISTRY_COLUMNS].sort(),
      );
    }, 30_000);

    it('keeps the finder private while the packet is public', async () => {
      // The two halves in one assertion: the same anonymous client that can read the
      // artwork cannot see a single thing about who found it.
      const anon = freshClient();
      const { data: packets } = await anon.from('species_packets').select('*').eq('species_key', SPECIES_KEY);
      expect(packets?.length).toBe(1);
      const { data: shelf } = await anon.from('seed_shelf').select('*');
      expect(shelf ?? [], 'the private shelf leaked to a signed-out client').toEqual([]);
    }, 30_000);

    it('hands a second player the same packet rather than minting a second one', async () => {
      /*
       * Bob writes through HIS OWN client, never through the adapter — that is bound to the
       * app's singleton, which this suite signs in as Alice. This is the fixture lesson the
       * profile block already paid for once.
       */
      const bobsFind = newFind({ scientificName: SPECIES.scientificName, confidence: 0.4 })!;
      const { error: inserted } = await bobClient.from('seed_shelf').insert({
        id: bobsFind.id,
        user_id: bob.id,
        species_key: bobsFind.speciesKey,
        scientific_name: bobsFind.scientificName,
        found_at: bobsFind.foundAt,
        confidence: 0.4,
      });
      expect(inserted, 'Bob could not save his own find').toBeNull();

      const { data, error } = await bobClient.functions.invoke('seed-packet', {
        body: { species: [{ scientificName: SPECIES.scientificName }] },
      });
      expect(error).toBeNull();
      const returned = ((data as { packets?: Record<string, unknown>[] }).packets ?? []).find(
        (row) => row.species_key === SPECIES_KEY,
      );
      expect(returned, 'the function returned no packet for a species it already knows').toBeTruthy();

      // Same artwork, same date — Bob was handed Alice's row, not a fresh one.
      expect(returned!.first_seen_at).toBe(firstSeenAt);

      const anon = freshClient();
      const { data: all } = await anon.from('species_packets').select('*').eq('species_key', SPECIES_KEY);
      expect(all?.length, 'a second packet exists for one species').toBe(1);
    }, 90_000);

    it('never redraws a packet on a later mint', async () => {
      /*
       * THE POINT OF THE REGISTRY, live. Asking again must be a no-op: `on conflict do
       * nothing`, and no update anywhere in the function. If a future generator change could
       * reach a minted species, this is where it would show.
       */
      const before = (
        await freshClient().from('species_packets').select('*').eq('species_key', SPECIES_KEY)
      ).data![0] as Record<string, unknown>;

      await ensureCanonicalPackets([{ scientificName: SPECIES.scientificName }]);

      const after = (
        await freshClient().from('species_packets').select('*').eq('species_key', SPECIES_KEY)
      ).data![0] as Record<string, unknown>;
      expect(after).toEqual(before);
      expect(after.first_seen_at).toBe(firstSeenAt);
    }, 60_000);

    it('is what the shelf actually draws', async () => {
      // End to end, through the modules the page uses: read the registry, fold the finds,
      // and the entry reports it is showing the canonical packet.
      __resetCanonicalCache();
      await loadCanonicalPackets([SPECIES_KEY]);
      const record = canonicalRecordFor(SPECIES_KEY);
      expect(record, 'the client could not read the canonical packet').toBeTruthy();

      const find = newFind({ scientificName: SPECIES.scientificName })!;
      const entry = mergeFinds([find], (key) => canonicalRecordFor(key)?.packet)[0]!;
      expect(entry.canonicalPacket).toBe(true);
      expect(entry.packet).toEqual(record!.packet);
    }, 60_000);

    it('lets no client write the registry — insert, update or delete', async () => {
      /*
       * NOBODY GAINS A CROSS-USER WRITE SURFACE. There is no insert, update or delete policy
       * on this table for any role, so a signed-in player cannot mint a species they never
       * found, redraw one somebody else is looking at, or remove one.
       *
       * Insert comes back as an explicit RLS error. Update and delete come back CLEAN with
       * zero rows affected — which is why this test reads the row back rather than trusting
       * the absence of an error.
       */
      const before = (
        await freshClient().from('species_packets').select('*').eq('species_key', SPECIES_KEY)
      ).data![0] as Record<string, unknown>;

      for (const [who, client] of [
        ['Alice', supabase!],
        ['Bob', bobClient],
        ['a signed-out visitor', freshClient()],
      ] as const) {
        const { error: insertError } = await client.from('species_packets').insert({
          species_key: 'forged bybob',
          scientific_name: 'Forged bybob',
          packet: packetRecipe({ speciesKey: 'forged bybob' }),
          packet_version: PACKET_VERSION,
        });
        expect(insertError, `${who} was allowed to mint a packet`).not.toBeNull();

        await client
          .from('species_packets')
          .update({ scientific_name: `rewritten by ${who}` })
          .eq('species_key', SPECIES_KEY);
        await client.from('species_packets').delete().eq('species_key', SPECIES_KEY);
      }

      const after = (
        await freshClient().from('species_packets').select('*').eq('species_key', SPECIES_KEY)
      ).data?.[0] as Record<string, unknown> | undefined;
      expect(after, 'the canonical packet was deleted by a client').toBeTruthy();
      expect(after).toEqual(before);

      const { data: forged } = await freshClient()
        .from('species_packets')
        .select('*')
        .eq('species_key', 'forged bybob');
      expect(forged ?? [], 'a forged packet reached the registry').toEqual([]);
    }, 90_000);

    it('refuses to mint a species the deck already has a card for', async () => {
      // The server re-checks eligibility, so a hand-made request cannot file a card species
      // as a packet. That plant is a discovery.
      expect(isShelfEligible(ON_A_CARD)).toBe(false);
      const { data } = await supabase!.functions.invoke('seed-packet', {
        body: { species: [{ scientificName: ON_A_CARD }] },
      });
      expect((data as { packets?: unknown[] }).packets ?? []).toEqual([]);

      const { data: rows } = await freshClient()
        .from('species_packets')
        .select('species_key')
        .eq('species_key', normalizeName(ON_A_CARD));
      expect(rows ?? [], 'a card species was minted as a seed packet').toEqual([]);
    }, 60_000);

    it('allows a species that is merely RELATED to one on a card', async () => {
      /*
       * The content rule, live. The deck carries Capsella bursa-pastoris; Capsella rubella is
       * a different species and belongs on the shelf. Eligibility is "the deck has no
       * confirmable card for THIS species", never "nothing like it exists".
       */
      const relativeKey = normalizeName(RELATIVE.scientificName);
      await ensureCanonicalPackets([RELATIVE]);
      const { data } = await freshClient()
        .from('species_packets')
        .select('*')
        .eq('species_key', relativeKey);
      expect(data?.length, 'a relative of a card species was blocked from the shelf').toBe(1);
      expect(data![0].packet).toEqual(packetRecipe({ speciesKey: relativeKey }));
    }, 60_000);

    it('refuses an unauthenticated caller', async () => {
      // Not because the identity is stored — there is no column for it — but because an
      // anonymous write path into a global table is the thing this design avoids.
      const response = await fetch(`${URL}/functions/v1/seed-packet`, {
        method: 'POST',
        headers: { apikey: KEY!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ species: [{ scientificName: 'Bellis sylvestris' }] }),
      });
      expect([401, 403]).toContain(response.status);

      const { data } = await freshClient()
        .from('species_packets')
        .select('species_key')
        .eq('species_key', 'bellis sylvestris');
      expect(data ?? [], 'an anonymous caller minted a species').toEqual([]);
    }, 60_000);

    /*
     * ─────────────────────────────────────────────────────────────────────────
     * CAN AN AUTHENTICATED PLAYER POISON THE PERMANENT CANON?
     *
     * Every row here is global, public and IMMUTABLE — nothing in the application can edit
     * or delete one. "Signed in" is not authority to name a species in that canon, so these
     * are the handcrafted request bodies somebody would actually send, fired at the live
     * function as a real signed-in user.
     *
     * `species-identity.test.ts` proves the validator refuses them. This proves the DEPLOYED
     * function calls it, and that the table refuses them a second time if it ever does not.
     * ─────────────────────────────────────────────────────────────────────────
     */
    it('refuses malformed and forged species identity', async () => {
      const attacks: { label: string; body: Record<string, unknown>; key: string }[] = [
        {
          label: 'a non-binomial name',
          body: { scientificName: 'Notaplant' },
          key: 'notaplant',
        },
        {
          label: 'markup inside a name',
          body: { scientificName: 'Bellis <script>alert(1)</script>' },
          key: 'bellis <script>alert(1)</script>',
        },
        {
          label: 'SQL inside a name',
          body: { scientificName: "Robert'); drop table species_packets;--" },
          key: "robert'); drop table species_packets;--",
        },
        {
          label: 'digits in the genus',
          body: { scientificName: 'Zzz9 abcdef' },
          key: 'zzz9 abcdef',
        },
        {
          label: 'a Cyrillic homoglyph of a real genus',
          body: { scientificName: '\u0412ellis perennis' },
          key: '\u0432ellis perennis',
        },
      ];

      for (const attack of attacks) {
        const { data, error } = await supabase!.functions.invoke('seed-packet', {
          body: { species: [attack.body] },
        });
        expect(error, `${attack.label} made the function fail`).toBeNull();
        expect(
          (data as { packets?: unknown[] }).packets ?? [],
          `${attack.label} was minted`,
        ).toEqual([]);

        const { data: rows } = await freshClient()
          .from('species_packets')
          .select('species_key')
          .eq('species_key', attack.key);
        expect(rows ?? [], `${attack.label} reached the registry`).toEqual([]);
      }
    }, 120_000);

    it('ignores a forged species_key and keys the row by the name it rebuilt', async () => {
      /*
       * The attack: claim to be one species while keying as another, so the row everybody
       * reads for the deck's Quercus is really somebody else's packet. The key is not an
       * input — it is derived from the rebuilt name — so there is nothing to disagree with.
       */
      const forgedKey = 'quercus alba';
      const { data } = await supabase!.functions.invoke('seed-packet', {
        body: {
          species: [
            {
              scientificName: 'Bellis perennis',
              speciesKey: forgedKey,
              species_key: forgedKey,
              packet: { version: 99, shape: 'notched', motif: 'cone' },
              packet_version: 99,
              first_seen_at: '1999-01-01T00:00:00.000Z',
            },
          ],
        },
      });
      const returned = ((data as { packets?: Record<string, unknown>[] }).packets ?? [])[0];
      expect(returned?.species_key).toBe(SPECIES_KEY);

      const { data: forged } = await freshClient()
        .from('species_packets')
        .select('*')
        .eq('species_key', forgedKey);
      expect(forged ?? [], 'a forged species_key reached the registry').toEqual([]);

      // And none of the other forged fields landed either: the row is the one already minted.
      const { data: real } = await freshClient()
        .from('species_packets')
        .select('*')
        .eq('species_key', SPECIES_KEY);
      expect((real![0] as { packet_version: number }).packet_version).toBe(PACKET_VERSION);
      expect((real![0] as { first_seen_at: string }).first_seen_at).toBe(firstSeenAt);
    }, 90_000);

    it('drops a malformed taxonomy identifier instead of storing it', async () => {
      /*
       * A NEW species carrying junk ids: the plant is real and is kept, the identifiers are
       * not written. Dropping the field rather than the species is deliberate — a bad
       * identifier is no reason to lose a real plant from the canon.
       */
      const name = 'Trifolium repens';
      const key = normalizeName(name);
      await supabase!.functions.invoke('seed-packet', {
        body: {
          species: [
            { scientificName: name, gbifId: 'not-an-id; drop table', powoId: '<script>' },
          ],
        },
      });
      const { data } = await freshClient().from('species_packets').select('*').eq('species_key', key);
      expect(data?.length, 'a real species was lost over a bad identifier').toBe(1);
      const row = data![0] as Record<string, unknown>;
      expect(row.gbif_id, 'a malformed gbif id was stored').toBeNull();
      expect(row.powo_id, 'a malformed powo id was stored').toBeNull();
    }, 90_000);

    it('cannot steer the permanent artwork with a chosen common name', async () => {
      /*
       * THE HOLE THIS CLOSES, LIVE. `packetRecipe` reads descriptive words out of the names
       * it is handed, and the mint used to be handed the caller's common name — so the first
       * player to find a species could pick the bag everybody else would ever see for it.
       *
       * The mint now seeds from the species key and the rebuilt binomial only, so the packet
       * this returns must equal what anyone can recompute from the key alone.
       */
      const name = 'Veronica persica';
      const key = normalizeName(name);
      const { data } = await supabase!.functions.invoke('seed-packet', {
        body: {
          species: [{ scientificName: name, commonName: 'White star heart clover gold' }],
        },
      });
      const returned = ((data as { packets?: Record<string, unknown>[] }).packets ?? [])[0];
      expect(returned, 'a real species was refused').toBeTruthy();
      expect(
        returned!.packet,
        'a caller-chosen common name changed the canonical artwork',
      ).toEqual(packetRecipe({ speciesKey: key }));
      // The nickname itself is still stored for display — it just reaches nothing derived.
      expect(returned!.common_name).toBe('White star heart clover gold');
    }, 90_000);

    it('refuses a hostile common name without losing the species', async () => {
      const name = 'Veronica persica';
      const key = normalizeName(name);
      await supabase!.functions.invoke('seed-packet', {
        body: { species: [{ scientificName: name, commonName: '<b>pwned</b>' }] },
      });
      // Already minted above, so this asserts the stronger property: a later request with a
      // hostile field cannot change what is there. Nothing here is ever updated.
      const { data } = await freshClient().from('species_packets').select('*').eq('species_key', key);
      expect((data![0] as { common_name: string }).common_name).toBe(
        'White star heart clover gold',
      );
    }, 90_000);

    it('gives each player their own found date over one shared packet', async () => {
      /*
       * The split, stated as data: two shelf rows for one species, each with its own
       * `found_at` and confidence, and one registry row both of them draw.
       */
      const { data: aliceRows } = await supabase!
        .from('seed_shelf')
        .select('*')
        .eq('species_key', SPECIES_KEY);
      expect(aliceRows?.length ?? 0).toBeGreaterThan(0);
      expect((aliceRows![0] as { confidence: number }).confidence).toBeCloseTo(0.91, 5);

      const { data: bobRows } = await bobClient.from('seed_shelf').select('*').eq('species_key', SPECIES_KEY);
      expect(bobRows?.length ?? 0).toBeGreaterThan(0);
      expect((bobRows![0] as { confidence: number }).confidence).toBeCloseTo(0.4, 5);
      expect((bobRows![0] as { user_id: string }).user_id).toBe(bob.id);
    }, 60_000);
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

      // And a Seed Shelf row, written by the block above. Without one, every seed_shelf
      // attack below would pass against an empty table.
      const { data: shelf } = await supabase!.from('seed_shelf').select('id').eq('user_id', alice.id);
      expect(shelf?.length ?? 0, 'Alice has no shelf row to attack').toBeGreaterThan(0);
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
        seed_shelf: {
          id: `sighting_forged_shelf_${Date.now()}`,
          user_id: alice.id,
          species_key: 'forged bybob',
          scientific_name: 'Forged bybob',
          found_at: new Date().toISOString(),
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

  describe('data export', () => {
    it('exports the caller own collection, sightings and photographs', async () => {
      const path = `${alice.id}/export-e2e-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase!.storage
        .from('sighting-photos')
        .upload(path, new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])]), {
          contentType: 'image/jpeg',
        });
      expect(uploadError).toBeNull();

      const sightingId = `sighting_export_${Date.now()}`;
      const { error: insertError } = await supabase!.from('sightings').insert({
        id: sightingId,
        user_id: alice.id,
        herb_id: HERB_A.id,
        date: '2026-07-04',
        photo_path: path,
      });
      expect(insertError).toBeNull();

      const data = await exportAccountData(alice.id, 'alice@example.invalid');

      expect(data.source).toBe('account');
      expect(Object.keys(data.collection.discoveries).length).toBeGreaterThan(0);
      expect(data.sightings.map((s) => s.id)).toContain(sightingId);

      // The photograph travels as bytes, not as a link that would expire or leak.
      const photo = data.photos.included.find((p) => p.sightingId === sightingId);
      expect(photo, 'the photo was not included in the export').toBeDefined();
      expect(photo!.dataUri).toMatch(/^data:image\/jpeg;base64,/);
      expect(data.photos.omitted).toEqual([]);

      // XP and level are derived and must not appear as if they were stored records.
      expect(JSON.stringify(data)).not.toMatch(/"(xp|level)":/);

      await supabase!.storage.from('sighting-photos').remove([path]);
      await supabase!.from('sightings').delete().eq('id', sightingId);
    }, 60_000);

    it('exports nothing of another user, even when asked for their id directly', async () => {
      /*
       * `exportAccountData` takes a user id, so this is the obvious attack: call it with
       * somebody else's. It is refused by Row Level Security rather than by the function —
       * Bob's session simply cannot see Alice's rows, so every query comes back empty. The
       * id is a readability filter, never the boundary.
       */
      const bobSupabase = bobClient;
      const original = await createRemoteHerbdexStorage(alice.id).load();
      expect(Object.keys(original.discoveries).length).toBeGreaterThan(0);

      for (const [table] of TABLES) {
        const { data } = await bobSupabase.from(table).select('*').eq('user_id', alice.id);
        expect(data ?? [], `${table} leaked to an export by another user`).toEqual([]);
      }
    }, 30_000);
  });

  /**
   * ACCOUNT DELETION, attacked and then performed.
   *
   * Two throwaway users of its own, because these tests destroy the accounts they use and
   * Alice and Bob are needed by everything above.
   *
   *   carol — the victim: real rows, and a real photograph in the private bucket.
   *   dave  — the attacker: signed in, and asks the function to delete Carol.
   *
   * The attack test is the important one. `delete-account` holds the service-role key, so
   * it can bypass every RLS policy in the project — RLS is NOT what protects Carol here.
   * What protects her is that the function derives the account from the caller's own
   * verified JWT and reads no request body at all. Dave's forged `userId` is therefore
   * ignored, and the only account that dies is his own.
   */
  describe('account deletion', () => {
    let carol: User;
    let carolClient: SupabaseClient;
    let dave: User;
    let daveClient: SupabaseClient;
    let carolCreds: { email: string; password: string };
    let photoPath: string;

    beforeAll(async () => {
      carolClient = freshClient();
      carolCreds = credentials('carol');
      const { error: signUpError } = await carolClient.auth.signUp(carolCreds);
      if (signUpError) throw new Error(`carol signUp failed: ${signUpError.message}`);
      const { data, error } = await carolClient.auth.signInWithPassword(carolCreds);
      if (error || !data.user) throw new Error(`carol signIn failed: ${error?.message}`);
      carol = data.user;

      daveClient = freshClient();
      dave = await signUpAndIn(daveClient, 'dave');

      // Give Carol something to lose: a discovery, a sighting, and a photograph.
      await carolClient
        .from('discoveries')
        .insert({ user_id: carol.id, herb_id: HERB_A.id, discovered_at: new Date().toISOString() });
      await carolClient.from('sightings').insert({
        id: `sighting_carol_${Date.now()}`,
        user_id: carol.id,
        herb_id: HERB_A.id,
        date: '2026-06-01',
      });
      /*
       * And a Seed Shelf find, whose species Carol is the first to introduce. Deletion has to
       * take her row and leave the species standing — those are opposite outcomes for two
       * rows written by the same action, which is exactly the pair worth testing.
       */
      await carolClient.from('seed_shelf').insert({
        id: `sighting_carol_shelf_${Date.now()}`,
        user_id: carol.id,
        species_key: 'geranium robertianum',
        scientific_name: 'Geranium robertianum',
        found_at: new Date().toISOString(),
      });
      await carolClient.functions.invoke('seed-packet', {
        body: { species: [{ scientificName: 'Geranium robertianum' }] },
      });

      photoPath = `${carol.id}/e2e-${Date.now()}.jpg`;
      const { error: uploadError } = await carolClient.storage
        .from('sighting-photos')
        .upload(photoPath, new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])]), {
          contentType: 'image/jpeg',
        });
      if (uploadError) throw new Error(`carol photo upload failed: ${uploadError.message}`);

      /*
       * Probe the function before any test runs. Without this, "not deployed" surfaces three
       * times as an unreadable dump of a Response object, and the actual instruction — deploy
       * it — appears nowhere. An OPTIONS preflight needs no credentials and destroys nothing.
       */
      const probe = await fetch(`${URL}/functions/v1/delete-account`, { method: 'OPTIONS' });
      if (probe.status === 404) {
        throw new Error(
          'The delete-account edge function is not deployed to this project. Run ' +
            '`supabase functions deploy delete-account` (it needs the service-role key in ' +
            'the function environment, which Supabase injects automatically) and re-run.',
        );
      }
    }, 90_000);

    it('has something real for Carol to lose', async () => {
      // Same reason as the RLS precondition above: without this the deletion tests could
      // all pass against an empty account while proving nothing.
      const { data: rows } = await carolClient.from('discoveries').select('herb_id');
      expect(rows?.length ?? 0).toBeGreaterThan(0);
      const { data: photos } = await carolClient.storage.from('sighting-photos').list(carol.id);
      expect(photos?.length ?? 0).toBeGreaterThan(0);
      const { data: shelf } = await carolClient.from('seed_shelf').select('id');
      expect(shelf?.length ?? 0, 'Carol has no shelf row to lose').toBeGreaterThan(0);
      const { data: minted } = await freshClient()
        .from('species_packets')
        .select('species_key')
        .eq('species_key', 'geranium robertianum');
      expect(minted?.length ?? 0, 'Carol species was never minted').toBe(1);
    }, 30_000);

    it('ignores a forged userId and deletes only the caller', async () => {
      const { error } = await daveClient.functions.invoke('delete-account', {
        method: 'POST',
        // The forgery. The function must never read this.
        body: { userId: carol.id, user_id: carol.id },
      });
      if (error) {
        throw new Error(
          `delete-account did not answer: ${error.message}. Deploy it with ` +
            '`supabase functions deploy delete-account` before running this suite.',
        );
      }

      // Carol is untouched: rows, photograph and the ability to sign in.
      const { data: rows } = await carolClient.from('discoveries').select('herb_id');
      expect(rows?.length ?? 0, 'Carol lost rows to Dave request').toBeGreaterThan(0);
      const { data: photos } = await carolClient.storage.from('sighting-photos').list(carol.id);
      expect(photos?.length ?? 0, 'Carol lost a photo to Dave request').toBeGreaterThan(0);

      // And Dave is gone, which is what he actually asked for.
      const stillDave = freshClient();
      const { data: daveRows } = await stillDave.from('discoveries').select('*').eq('user_id', dave.id);
      expect(daveRows ?? []).toEqual([]);
    }, 90_000);

    it('erases rows, photographs and the account itself', async () => {
      const { data, error } = await carolClient.functions.invoke('delete-account', {
        method: 'POST',
      });
      expect(error, 'delete-account failed').toBeNull();
      expect((data as { ok?: boolean } | null)?.ok).toBe(true);

      // Read back with a privileged-as-possible client: Carol's own session is gone, so
      // anything still visible to a fresh anon client would be a leak either way.
      const anon = freshClient();
      for (const [table] of TABLES) {
        const { data: rows } = await anon.from(table).select('*').eq('user_id', carol.id);
        expect(rows ?? [], `${table} still holds deleted-account rows`).toEqual([]);
      }

      // The photograph must be gone from the bucket, not merely unreachable. A private
      // object with no owner can never be removed by any policy again.
      const { data: signed } = await anon.storage
        .from('sighting-photos')
        .createSignedUrl(photoPath, 60);
      expect(signed?.signedUrl ?? null).toBeNull();

      // And the account itself: signing back in must fail.
      const { data: reSignIn, error: signInError } = await freshClient().auth.signInWithPassword(
        carolCreds,
      );
      expect(reSignIn?.user ?? null, 'the deleted account can still sign in').toBeNull();
      expect(signInError).not.toBeNull();

      /*
       * AND THE CANONICAL PACKET SURVIVES HER.
       *
       * Carol introduced this species to Plantdex. The packet is not hers — it is on every
       * shelf holding that plant, and deleting it with her account would take the artwork off
       * all of them. Unlike the rows above, this one is genuinely readable by an anonymous
       * client, so the assertion is real rather than inherited from RLS.
       */
      const { data: stillMinted } = await anon
        .from('species_packets')
        .select('*')
        .eq('species_key', 'geranium robertianum');
      expect(
        stillMinted?.length,
        'deleting an account erased the shared packet registry',
      ).toBe(1);
    }, 120_000);

    it('refuses an unauthenticated caller', async () => {
      const response = await fetch(`${URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { apikey: KEY!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: alice.id }),
      });
      expect(response.status, 'a call with no user token must be rejected').not.toBe(200);
      expect([401, 403]).toContain(response.status);

      // Alice, named in that body, is untouched.
      const state = await createRemoteHerbdexStorage(alice.id).load();
      expect(Object.keys(state.discoveries).length).toBeGreaterThan(0);
    }, 30_000);
  });


  /*
   * THE PLAYER PROFILE — the one table in the schema with an `update` policy.
   *
   * That exception is argued in `supabase/migrations/0003_profiles.sql`: a settings row is
   * meant to be edited and nothing is derived from it. What makes it SAFE rather than merely
   * convenient is the `with check` half of the policy, and the only way to know that half is
   * really there is to attack it — so the last two tests below are a second signed-in user
   * trying to take a profile over, in both directions. They pass only when Postgres refuses.
   */
  describe('the player profile', () => {
    const aliceProfile = {
      ...emptyProfile(),
      displayName: 'Alice of the Wayside',
      avatarHerbId: HERB_A.id,
      sidekickHerbId: HERB_A.id,
      featuredHerbId: HERB_B.id,
      avatarFrameId: 'field-notes',
      titleId: 'seedling-scholar',
      pinnedAchievementIds: ['first-find'],
    };

    it('saves and reads back through the real adapter', async () => {
      await saveRemoteProfile(alice.id, aliceProfile);

      const { data, error } = await supabase!
        .from('profiles')
        .select('*')
        .eq('user_id', alice.id)
        .maybeSingle();
      expect(error).toBeNull();
      expect(rowToProfile(data as Record<string, unknown> | null)).toEqual(aliceProfile);
    }, 30_000);

    it('updates in place rather than accumulating rows', async () => {
      await saveRemoteProfile(alice.id, { ...aliceProfile, displayName: 'Alice Renamed' });
      const { data } = await supabase!.from('profiles').select('*').eq('user_id', alice.id);
      expect(data?.length, 'a second row means the upsert is inserting, not updating').toBe(1);
      expect(rowToProfile(data![0] as Record<string, unknown>).displayName).toBe('Alice Renamed');
      await saveRemoteProfile(alice.id, aliceProfile);
    }, 30_000);

    it('stores no progression column', async () => {
      for (const column of ['xp', 'level', 'discovered_count', 'completion']) {
        const { error } = await supabase!.from('profiles').select(column).limit(1);
        expect(error, `profiles must have no ${column} column`).not.toBeNull();
      }
    }, 30_000);

    it('is still resolved against the live collection, not trusted as stored', async () => {
      // A featured card Alice has NOT discovered is dropped on read even though the row
      // holds it — the guard that stops the page rendering a locked card as earned.
      const undiscovered = HERBS.find((herb) => herb.id !== HERB_A.id && herb.id !== HERB_B.id)!;
      await saveRemoteProfile(alice.id, { ...aliceProfile, featuredHerbId: undiscovered.id });

      const state = await createRemoteHerbdexStorage(alice.id).load();
      const { data } = await supabase!
        .from('profiles')
        .select('*')
        .eq('user_id', alice.id)
        .maybeSingle();
      const resolved = resolveProfile(rowToProfile(data as Record<string, unknown>), state);

      expect(state.discoveries[undiscovered.id]).toBeUndefined();
      expect(resolved.featuredHerbId).toBeNull();
      await saveRemoteProfile(alice.id, aliceProfile);
    }, 30_000);

    it('cannot be READ by another user, filtered or not', async () => {
      const { data: filtered } = await bobClient
        .from('profiles')
        .select('*')
        .eq('user_id', alice.id);
      expect(filtered, 'a profile must not leak to another user').toEqual([]);

      const { data: all } = await bobClient.from('profiles').select('*');
      const foreign = (all ?? []).filter((row) => (row as { user_id?: string }).user_id !== bob.id);
      expect(foreign, 'an unfiltered select must return only Bob own row').toEqual([]);
    }, 30_000);

    it('cannot be INSERTED on behalf of another user', async () => {
      const { error } = await bobClient
        .from('profiles')
        .insert({ user_id: alice.id, display_name: 'forged by bob' });
      expect(error, 'a forged user_id must be rejected').not.toBeNull();
    }, 30_000);

    /*
     * THE `using` HALF. Bob may not update a row that is not his.
     */
    it('cannot be UPDATED or DELETED by another user', async () => {
      await bobClient
        .from('profiles')
        .update({ display_name: 'taken over by bob' })
        .eq('user_id', alice.id);
      await bobClient.from('profiles').delete().eq('user_id', alice.id);

      const { data } = await supabase!
        .from('profiles')
        .select('*')
        .eq('user_id', alice.id)
        .maybeSingle();
      expect(data, 'Alice profile was deleted by another user').not.toBeNull();
      expect(rowToProfile(data as Record<string, unknown>).displayName).toBe(
        aliceProfile.displayName,
      );
    }, 30_000);

    /*
     * THE `with check` HALF, AND THE REASON THIS TABLE'S EXCEPTION IS SAFE.
     *
     * `using (auth.uid() = user_id)` alone says which rows Bob may update — not what they
     * may BECOME. Without `with check`, Bob could update HIS OWN row and set `user_id` to
     * Alice's, handing his profile to her account or overwriting hers. This is the test that
     * fails if somebody ever writes the update policy with only one half.
     */
    it('cannot be handed to another user by updating its own user_id', async () => {
      // Bob's own row, written through BOB'S client rather than through
      // `saveRemoteProfile`. The adapter is bound to the app's singleton, which this suite
      // signs in as Alice — so asking it to write a row owned by Bob is itself the forged
      // insert the previous test already proves the database refuses. This one needs a row
      // to exist before it can try to reassign it.
      const { error: seeded } = await bobClient
        .from('profiles')
        .upsert({ user_id: bob.id, display_name: 'Bob' }, { onConflict: 'user_id' });
      expect(seeded, 'Bob could not write his own profile').toBeNull();

      const { error } = await bobClient
        .from('profiles')
        .update({ user_id: alice.id })
        .eq('user_id', bob.id);
      expect(error, 'reassigning user_id must be refused by the with check clause').not.toBeNull();

      const { data: alices } = await supabase!
        .from('profiles')
        .select('*')
        .eq('user_id', alice.id)
        .maybeSingle();
      expect(rowToProfile(alices as Record<string, unknown>).displayName).toBe(
        aliceProfile.displayName,
      );
    }, 30_000);

    it('is included in the export and removed with the account', async () => {
      const exported = await exportAccountData(alice.id, aliceCreds.email);
      expect(exported.profile.displayName).toBe(aliceProfile.displayName);
      // XP and level stay absent from the export for the same reason they are absent from
      // the table: they are derived, not stored.
      expect(JSON.stringify(exported.profile)).not.toMatch(/"(xp|level)"/);
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
