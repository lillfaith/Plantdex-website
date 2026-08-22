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
let loading: Promise<void> | null = null;
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
  cache =
    error || !data
      ? []
      : (data as Record<string, unknown>[])
          .map(rowToSighting)
          .filter((s): s is Sighting => s !== null);
  loadedForUser = userId;
  emit();
}

function ensureLoaded(userId: string): void {
  if (loadedForUser === userId) return;
  if (loadedForUser !== null) cache = null; // a different account was cached in this tab
  if (!loading) {
    loading = load(userId).finally(() => {
      loading = null;
    });
  }
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
    if (error) console.warn('[plantdex] failed to save sighting', error);
  }

  cache = [...(loadedForUser === userId && cache ? cache : []), sighting];
  loadedForUser = userId;
  emit();
  return sighting;
}

export async function removeRemoteSighting(userId: string, id: string): Promise<void> {
  const existing = cache?.find((s) => s.id === id);
  cache = (cache ?? []).filter((s) => s.id !== id);
  emit();

  if (!supabase) return;
  const { error } = await supabase.from('sightings').delete().eq('user_id', userId).eq('id', id);
  if (error) console.warn('[plantdex] failed to delete sighting', error);
  if (existing?.photoId) {
    const { error: storageError } = await supabase.storage
      .from('sighting-photos')
      .remove([existing.photoId]);
    if (storageError) console.warn('[plantdex] failed to delete sighting photo', storageError);
  }
}
