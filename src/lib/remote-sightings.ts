'use client';

import { useSyncExternalStore } from 'react';
import { supabase } from './supabase-client';
import type { GrowthStage, NewSighting, Sighting } from './sightings';

/**
 * The signed-in counterpart to `sightings.ts`. Same shape (`Sighting`, `NewSighting`), a
 * Supabase table instead of localStorage, and a Storage bucket instead of IndexedDB for
 * photos — see `supabase/migrations/0001_accounts.sql`.
 *
 * A single-user, single-tab cache, same as `sightings.ts`'s own. `loadedForUser` guards
 * against serving one account's cached rows to another after a sign-out/sign-in swap in
 * the same tab.
 */

let cache: Sighting[] | null = null;
let loadedForUser: string | null = null;
/** Which user a load is currently in flight for, or null when none is. */
let loadingForUser: string | null = null;
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

function rowToSighting(row: Record<string, unknown>): Sighting | null {
  const id = row.id;
  const herbId = row.herb_id;
  const date = row.date;
  const createdAt = row.created_at;
  if (
    typeof id !== 'string' ||
    typeof herbId !== 'string' ||
    typeof date !== 'string' ||
    typeof createdAt !== 'string'
  ) {
    return null;
  }
  return {
    id,
    herbId,
    date,
    region: typeof row.region === 'string' ? row.region : undefined,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    growthStage: typeof row.growth_stage === 'string' ? (row.growth_stage as GrowthStage) : undefined,
    foundAgain: typeof row.found_again === 'boolean' ? row.found_again : undefined,
    // Storage object path, e.g. "{userId}/{sightingId}.jpg" — resolved to a signed URL by
    // <SightingPhoto> only when it actually needs to render one.
    photoId: typeof row.photo_path === 'string' ? row.photo_path : undefined,
    createdAt,
  };
}

async function load(userId: string): Promise<void> {
  if (!supabase) {
    cache = [];
    loadedForUser = userId;
    emit();
    return;
  }
  const { data, error } = await supabase.from('sightings').select('*').eq('user_id', userId);
  if (error || !data) {
    // Do NOT cache an empty list here. "The request failed" and "you have logged nothing"
    // look identical on screen, and the second one is a lie that makes a player think
    // their journal is gone. Leaving `loadedForUser` unset keeps the list in its loading
    // state and lets the next render retry, after the cooldown below.
    console.warn('[plantdex] could not load sightings', error);
    failedAt = Date.now();
    return;
  }
  cache = (data as Record<string, unknown>[])
    .map(rowToSighting)
    .filter((s): s is Sighting => s !== null);
  loadedForUser = userId;
  failedAt = 0;
  emit();
}

/** When the last load failed, so a retry does not fire on every single render. */
let failedAt = 0;
const RETRY_AFTER_MS = 5_000;

function ensureLoaded(userId: string): void {
  if (loadedForUser === userId) return;
  // A load already in flight for THIS user is enough. One in flight for a different user
  // is not — that used to leave the newly signed-in account with no sightings until
  // something else happened to trigger a reload.
  if (loadingForUser === userId) return;
  if (failedAt && Date.now() - failedAt < RETRY_AFTER_MS) return;
  if (loadedForUser !== null) cache = null; // a different account was cached in this tab
  loadingForUser = userId;
  void load(userId).finally(() => {
    loadingForUser = null;
  });
}

const EMPTY: Sighting[] = [];

let allCacheKey: Sighting[] | null = null;
let allCacheValue: Sighting[] = EMPTY;
function allSorted(userId: string): Sighting[] {
  if (loadedForUser !== userId || !cache) return EMPTY;
  if (allCacheKey !== cache) {
    allCacheKey = cache;
    allCacheValue = [...cache].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
  }
  return allCacheValue;
}

const perHerbCache = new Map<string, { key: Sighting[]; value: Sighting[] }>();
function herbSorted(userId: string, herbId: string): Sighting[] {
  if (loadedForUser !== userId || !cache) return EMPTY;
  const hit = perHerbCache.get(herbId);
  if (hit && hit.key === cache) return hit.value;
  const value = cache
    .filter((s) => s.herbId === herbId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  perHerbCache.set(herbId, { key: cache, value });
  return value;
}

/** `userId` undefined means signed out — returns an empty list without touching the network. */
export function useRemoteSightings(userId: string | undefined, herbId?: string): Sighting[] {
  if (userId) ensureLoaded(userId);
  return useSyncExternalStore(
    subscribe,
    () => (userId ? (herbId ? herbSorted(userId, herbId) : allSorted(userId)) : EMPTY),
    () => EMPTY,
  );
}

export function useRemoteSightingCounts(userId: string | undefined): Record<string, number> {
  const all = useRemoteSightings(userId);
  const counts: Record<string, number> = {};
  for (const sighting of all) counts[sighting.herbId] = (counts[sighting.herbId] ?? 0) + 1;
  return counts;
}

function newSightingId(): string {
  return `sighting_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Log a sighting, uploading its photo (if any) to the private `sighting-photos` bucket
 * first. The upload path is `{userId}/{sightingId}.<ext>` — Row Level Security on
 * `storage.objects` restricts access to files under the caller's own uid folder, mirroring
 * the table policies.
 */
export type NewRemoteSighting = Omit<NewSighting, 'photoId'> & { photoFile?: File | null };

export async function addRemoteSighting(
  userId: string,
  input: NewRemoteSighting,
): Promise<Sighting> {
  const id = newSightingId();
  const createdAt = new Date().toISOString();
  let photoPath: string | undefined;

  if (supabase && input.photoFile) {
    const ext = input.photoFile.name.split('.').pop() || 'jpg';
    const path = `${userId}/${id}.${ext}`;
    const { error } = await supabase.storage
      .from('sighting-photos')
      .upload(path, input.photoFile, { contentType: input.photoFile.type || 'image/jpeg' });
    // Losing the photo must not lose the note the player just wrote — log a sighting
    // without it rather than fail the whole submission.
    if (!error) photoPath = path;
  }

  const sighting: Sighting = {
    id,
    herbId: input.herbId,
    date: input.date,
    region: input.region,
    notes: input.notes,
    growthStage: input.growthStage,
    foundAgain: input.foundAgain,
    photoId: photoPath,
    createdAt,
  };

  if (supabase) {
    const { error } = await supabase.from('sightings').insert({
      id,
      user_id: userId,
      herb_id: sighting.herbId,
      date: sighting.date,
      region: sighting.region ?? null,
      notes: sighting.notes ?? null,
      growth_stage: sighting.growthStage ?? null,
      found_again: sighting.foundAgain ?? null,
      photo_path: photoPath ?? null,
      created_at: createdAt,
    });
    // THROW rather than warn. This used to log to a console nobody has open and then add
    // the sighting to the local cache anyway, so the journal showed an entry the server
    // never received: it survived until the next reload and then vanished. Worse, mastery
    // is re-derived server-side from these rows, so the player could watch a sighting
    // count toward a card that would never actually master. A visible failure they can
    // retry is the only honest option.
    if (error) {
      throw new Error(`Could not save this sighting: ${error.message}`);
    }
  }

  cache = [...(loadedForUser === userId && cache ? cache : []), sighting];
  loadedForUser = userId;
  emit();
  return sighting;
}

export async function removeRemoteSighting(userId: string, id: string): Promise<void> {
  if (!supabase) {
    cache = (cache ?? []).filter((s) => s.id !== id);
    emit();
    return;
  }

  // Delete first, then update the cache: an optimistic removal that failed put the row
  // back on the next load with no explanation, which reads as the app undoing the player's
  // action by itself.
  const existing = cache?.find((s) => s.id === id);
  const { error } = await supabase.from('sightings').delete().eq('user_id', userId).eq('id', id);
  if (error) {
    throw new Error(`Could not delete this sighting: ${error.message}`);
  }

  cache = (cache ?? []).filter((s) => s.id !== id);
  emit();

  // The row is gone either way; a stranded photo is a tidiness problem, not a correctness
  // one, so this stays a warning rather than an error thrown after a successful delete.
  if (existing?.photoId) {
    const { error: storageError } = await supabase.storage
      .from('sighting-photos')
      .remove([existing.photoId]);
    if (storageError) console.warn('[plantdex] failed to delete sighting photo', storageError);
  }
}
