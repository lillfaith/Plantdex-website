import { supabase } from './supabase-client';
import { createLocalStorageAdapter } from './storage';
import { getAllSightings } from './sightings';
import type { HerbdexState } from './types';

/**
 * One-time merge of this browser's local progress into a freshly signed-in account.
 *
 * Additive only, and safe to run more than once: every table has a uniqueness constraint
 * on its own key, so re-importing an id already present server-side is a no-op rather than
 * a duplicate or an overwritten timestamp — the same idempotency guarantee every other
 * write in this app already relies on.
 *
 * `mastered` and `research_completions` are imported directly from their local timestamps
 * here, unlike ordinary play where the edge function re-derives them from synced sightings
 * (see `remote-herbdex-storage.ts`). That's deliberate: CLAUDE.md's mastery rule is that a
 * card mastered locally stays mastered even after the sighting that earned it is deleted.
 * If import only re-derived from currently-importable sightings, exactly that history would
 * be lost the moment someone had tidied up their journal before ever making an account.
 * This is a one-time, explicitly user-consented migration of a player's own past — the same
 * trust already extended to local play before any account existed — not an ongoing runtime
 * boundary, so it does not weaken the "never trust a live client claim" rule that governs
 * every other write in this file.
 */

const IMPORT_OFFERED_KEY = 'plantdex.local-import-offered.v1';

/** Whether the import dialog has already been shown (accepted, declined, or nothing to import). */
export function hasImportBeenOffered(): boolean {
  try {
    return window.localStorage.getItem(IMPORT_OFFERED_KEY) === 'true';
  } catch {
    return true; // Fail closed: never nag if storage is blocked.
  }
}

export function markImportOffered(): void {
  try {
    window.localStorage.setItem(IMPORT_OFFERED_KEY, 'true');
  } catch {
    // Non-fatal — worst case the dialog is offered again next sign-in.
  }
}

export async function hasLocalProgressToImport(): Promise<boolean> {
  const state = await createLocalStorageAdapter().load();
  if (Object.keys(state.discoveries).length > 0) return true;
  return getAllSightings().length > 0;
}

async function upsertTimestampRows(
  table: string,
  idColumn: string,
  atColumn: string,
  userId: string,
  record: Record<string, string>,
): Promise<void> {
  if (!supabase) return;
  const rows = Object.entries(record).map(([id, at]) => ({
    user_id: userId,
    [idColumn]: id,
    [atColumn]: at,
  }));
  if (rows.length === 0) return;
  const { error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: `user_id,${idColumn}`, ignoreDuplicates: true });
  if (error) console.warn(`[plantdex] import failed for ${table}`, error);
}

async function importSightingPhoto(userId: string, sightingId: string, photoId: string): Promise<string | undefined> {
  if (!supabase) return undefined;
  try {
    const { getPhotoUrl } = await import('./photo-store');
    const objectUrl = await getPhotoUrl(photoId);
    if (!objectUrl) return undefined;
    const blob = await (await fetch(objectUrl)).blob();
    URL.revokeObjectURL(objectUrl);
    const path = `${userId}/${sightingId}.jpg`;
    const { error } = await supabase.storage
      .from('sighting-photos')
      .upload(path, blob, { contentType: blob.type || 'image/jpeg' });
    return error ? undefined : path;
  } catch {
    // Losing a photo on import must not lose the sighting's date and notes.
    return undefined;
  }
}

async function importSightings(userId: string): Promise<void> {
  if (!supabase) return;
  // Sequential, not parallel: each may move a photo out of IndexedDB, and a personal
  // journal is small enough that there is no real benefit to racing N uploads at once.
  for (const sighting of getAllSightings()) {
    const photoPath = sighting.photoId
      ? await importSightingPhoto(userId, sighting.id, sighting.photoId)
      : undefined;

    const { error } = await supabase.from('sightings').upsert(
      {
        id: sighting.id,
        user_id: userId,
        herb_id: sighting.herbId,
        date: sighting.date,
        region: sighting.region ?? null,
        notes: sighting.notes ?? null,
        growth_stage: sighting.growthStage ?? null,
        found_again: sighting.foundAgain ?? null,
        photo_path: photoPath ?? null,
        created_at: sighting.createdAt,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (error) console.warn('[plantdex] import failed for a sighting', error);
  }
}

export async function importLocalProgress(userId: string): Promise<void> {
  if (!supabase) return;
  const state: HerbdexState = await createLocalStorageAdapter().load();

  await Promise.all([
    upsertTimestampRows('discoveries', 'herb_id', 'discovered_at', userId, state.discoveries),
    upsertTimestampRows('learned', 'herb_id', 'learned_at', userId, state.learned),
    upsertTimestampRows('mastered', 'herb_id', 'mastered_at', userId, state.mastered),
    upsertTimestampRows('research_completions', 'task_id', 'completed_at', userId, state.research),
    upsertTimestampRows(
      'unlocked_achievements',
      'achievement_id',
      'unlocked_at',
      userId,
      state.achievements,
    ),
    importSightings(userId),
  ]);
}
