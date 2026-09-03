'use client';

import { useSyncExternalStore } from 'react';
import { supabase } from './supabase-client';
import {
  newFind,
  parseFind,
  type NewSeedShelfFind,
  type SeedShelfFind,
} from './seed-shelf';
import { ensureCanonicalPackets } from './species-packets';

/**
 * The signed-in Seed Shelf: Supabase instead of localStorage.
 *
 * Deliberately built to the same pattern as `remote-sightings.ts` — a single-user, single-tab
 * cache with `loadedForUser` guarding an account swap, a retry cooldown after a failure, and
 * a load that never caches an empty list for a request that failed.
 *
 * IT INHERITS THAT FILE'S FIX, NOT ITS BUG. A newly written row is folded in only when there
 * is a real, loaded list to fold it into; otherwise the cache is left unloaded and the next
 * render fetches, which now includes the row that was just inserted. The alternative — mark
 * the cache loaded with one entry in it — is how a shelf of forty packets renders as one.
 */

let cache: SeedShelfFind[] | null = null;
let loadedForUser: string | null = null;
let loadingForUser: string | null = null;
let failedAt = 0;
const RETRY_AFTER_MS = 5_000;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** A database row as a find. Column names are snake_case; everything else is the same shape. */
export function rowToFind(row: Record<string, unknown>): SeedShelfFind | null {
  return parseFind({
    id: row.id,
    speciesKey: row.species_key,
    scientificName: row.scientific_name,
    commonName: row.common_name ?? undefined,
    gbifId: row.gbif_id ?? undefined,
    powoId: row.powo_id ?? undefined,
    foundAt: row.found_at,
    confidence: typeof row.confidence === 'number' ? row.confidence : undefined,
    scanId: row.scan_id ?? undefined,
    photoPath: row.photo_path ?? undefined,
    // No packet: the artwork belongs to the species, not to this row. `species-packets.ts`
    // reads the canonical one. `parseFind` derives a preview so the shape stays complete
    // while the registry is still loading.
  });
}

export function findToRow(userId: string, find: SeedShelfFind): Record<string, unknown> {
  return {
    id: find.id,
    user_id: userId,
    species_key: find.speciesKey,
    scientific_name: find.scientificName,
    common_name: find.commonName ?? null,
    gbif_id: find.gbifId ?? null,
    powo_id: find.powoId ?? null,
    found_at: find.foundAt,
    confidence: find.confidence ?? null,
    scan_id: find.scanId ?? null,
    photo_path: find.photoPath ?? null,
    // Deliberately no `packet`: the column does not exist (migration 0004), because a packet
    // is a property of the species and lives once in `species_packets`.
  };
}

async function load(userId: string): Promise<void> {
  if (!supabase) {
    cache = [];
    loadedForUser = userId;
    emit();
    return;
  }
  const { data, error } = await supabase.from('seed_shelf').select('*').eq('user_id', userId);
  if (error || !data) {
    // Never cache an empty shelf for a failed request: "your shelf is empty" and "the request
    // failed" look identical on screen and only one of them is true.
    console.warn('[plantdex] could not load the seed shelf', error);
    failedAt = Date.now();
    return;
  }
  cache = (data as Record<string, unknown>[])
    .map(rowToFind)
    .filter((find): find is SeedShelfFind => find !== null);
  loadedForUser = userId;
  failedAt = 0;
  emit();
}

function ensureLoaded(userId: string): void {
  if (loadedForUser === userId) return;
  if (loadingForUser === userId) return;
  if (failedAt && Date.now() - failedAt < RETRY_AFTER_MS) return;
  if (loadedForUser !== null) cache = null; // a different account was cached in this tab
  loadingForUser = userId;
  void load(userId).finally(() => {
    loadingForUser = null;
  });
}

const EMPTY: SeedShelfFind[] = [];

export function useRemoteFinds(userId: string | undefined): SeedShelfFind[] {
  if (userId) ensureLoaded(userId);
  return useSyncExternalStore(
    subscribe,
    () => (userId && loadedForUser === userId && cache ? cache : EMPTY),
    () => EMPTY,
  );
}

/**
 * Save a find for a signed-in player.
 *
 * Throws on failure rather than warning, for the reason `addRemoteSighting` does: a save that
 * only ever reached a console leaves a packet on the shelf that vanishes on the next reload,
 * and the player has no way to know it never landed.
 */
export async function addRemoteFind(
  userId: string,
  input: NewSeedShelfFind,
): Promise<SeedShelfFind | null> {
  const find = newFind(input);
  if (!find) return null;

  if (supabase) {
    const { error } = await supabase.from('seed_shelf').insert(findToRow(userId, find));
    if (error) throw new Error(`Could not save this to your Seed Shelf: ${error.message}`);

    /*
     * Introduce the species to Plantdex if nobody has yet.
     *
     * AFTER the player's own row is safely written, and never blocking it: the canonical
     * packet is shared furniture, and failing to mint it must not cost somebody their find.
     * A miss simply means the shelf draws the locally derived preview until the next read,
     * and the registry is filled in by this player's next save or by anybody else's.
     */
    await ensureCanonicalPackets([
      {
        scientificName: find.scientificName,
        commonName: find.commonName,
        gbifId: find.gbifId,
        powoId: find.powoId,
      },
    ]);
  }

  if (loadedForUser === userId && cache) {
    cache = [...cache, find];
  } else {
    // See the header: one row must never stand in for a shelf that has not loaded.
    cache = null;
    loadedForUser = null;
    failedAt = 0;
  }
  emit();
  return find;
}

export async function removeRemoteSpecies(userId: string, speciesKey: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from('seed_shelf')
      .delete()
      .eq('user_id', userId)
      .eq('species_key', speciesKey);
    if (error) throw new Error(`Could not remove this from your Seed Shelf: ${error.message}`);
  }
  if (loadedForUser === userId && cache) {
    cache = cache.filter((find) => find.speciesKey !== speciesKey);
    emit();
  }
}
