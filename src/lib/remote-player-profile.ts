'use client';

import { useSyncExternalStore } from 'react';
import { supabase } from './supabase-client';
import { emptyProfile, parseProfile, type StoredProfile } from './player-profile';

/**
 * The signed-in counterpart to the local store in `player-profile.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS THE ONE TABLE IN THE SCHEMA THAT IS MEANT TO BE EDITED, and the only one with an
 * `update` policy — see `supabase/migrations/0003_profiles.sql` for the argument. Every
 * other table holds a record of something that happened and is written once.
 *
 * The upsert below sends no `user_id` the caller could choose: it sends their own, from
 * their own session, and Postgres checks it against `auth.uid()` in BOTH the `using` and
 * `with check` halves of the policy. Passing somebody else's id here would be refused by the
 * database, not by this file.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Cache shape copied from `remote-sightings.ts`: one user, one tab, and `loadedForUser`
 * so a sign-out/sign-in swap in the same tab can never serve one account's profile to
 * another.
 */

const EMPTY: StoredProfile = Object.freeze({
  ...emptyProfile(),
  pinnedAchievementIds: Object.freeze([]) as unknown as string[],
});

let cache: StoredProfile | null = null;
let loadedForUser: string | null = null;
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

/** Column names are the row's, not the app's; one place converts between them. */
export function rowToProfile(row: Record<string, unknown> | null): StoredProfile {
  if (!row) return emptyProfile();
  return parseProfile({
    displayName: row.display_name,
    avatarHerbId: row.avatar_herb_id,
    avatarFrameId: row.avatar_frame_id,
    titleId: row.title_id,
    sidekickHerbId: row.sidekick_herb_id,
    featuredHerbId: row.featured_herb_id,
    pinnedAchievementIds: row.pinned_achievement_ids,
  });
}

export function profileToRow(userId: string, profile: StoredProfile): Record<string, unknown> {
  const clean = parseProfile(profile);
  return {
    user_id: userId,
    display_name: clean.displayName,
    avatar_herb_id: clean.avatarHerbId,
    avatar_frame_id: clean.avatarFrameId,
    title_id: clean.titleId,
    sidekick_herb_id: clean.sidekickHerbId,
    featured_herb_id: clean.featuredHerbId,
    pinned_achievement_ids: clean.pinnedAchievementIds,
    updated_at: new Date().toISOString(),
  };
}

/** After a failed load, wait this long before trying again rather than retrying per render. */
const RETRY_AFTER_MS = 5_000;
let failedAt: number | null = null;

async function load(userId: string): Promise<void> {
  if (!supabase) {
    cache = emptyProfile();
    loadedForUser = userId;
    emit();
    return;
  }
  // `maybeSingle`, not `single`: a player who has never opened their profile has no row, and
  // that is the ordinary case rather than an error.
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    // Don't cache a failure as "this player has chosen nothing" — that would be saved back
    // over their real row the moment they pressed Save. `ready` stays false instead.
    failedAt = Date.now();
    emit();
    return;
  }
  failedAt = null;
  cache = rowToProfile(data as Record<string, unknown> | null);
  loadedForUser = userId;
  emit();
}

/**
 * Kicks off a load if one is needed. A plain function, called during render the same way
 * `remote-sightings.ts` calls its own — the module cache is not React state, and the hook
 * itself must stay free of assignments to it.
 */
function ensureLoaded(userId: string): void {
  if (loadedForUser === userId) return;
  // A load already in flight for THIS user is enough. One for a different user is not:
  // that would leave a newly signed-in account showing the previous one's profile.
  if (loadingForUser === userId) return;
  if (failedAt !== null && Date.now() - failedAt < RETRY_AFTER_MS) return;
  if (loadedForUser !== null) cache = null; // a different account was cached in this tab
  loadingForUser = userId;
  void load(userId).finally(() => {
    loadingForUser = null;
  });
}

/**
 * Writes the whole profile. Returns what was stored, or throws with a readable message.
 *
 * It throws rather than failing quietly because the caller is a form somebody just pressed
 * Save on: a silent failure would leave the old profile on screen looking saved.
 */
export async function saveRemoteProfile(
  userId: string,
  profile: StoredProfile,
): Promise<StoredProfile> {
  if (!supabase) throw new Error('Accounts are not configured on this deployment.');
  const clean = parseProfile(profile);
  const { error } = await supabase
    .from('profiles')
    .upsert(profileToRow(userId, clean), { onConflict: 'user_id' });
  if (error) throw new Error(`Could not save your profile: ${error.message}`);
  cache = clean;
  loadedForUser = userId;
  emit();
  return clean;
}

export interface RemoteProfileState {
  profile: StoredProfile;
  ready: boolean;
}

/**
 * The account's profile. Empty and not ready until the first load resolves — a placeholder
 * must never be mistaken for "this player has chosen nothing" and then saved back over
 * their real row.
 */
export function useRemoteProfile(userId: string | undefined): RemoteProfileState {
  if (userId) ensureLoaded(userId);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => (userId && loadedForUser === userId ? cache : null),
    () => null,
  );
  return { profile: snapshot ?? EMPTY, ready: Boolean(userId) && snapshot !== null };
}

/** Test seam, and what a sign-out uses so no profile survives into the next session. */
export function resetRemoteProfileCache(): void {
  cache = null;
  loadedForUser = null;
  loadingForUser = null;
  failedAt = null;
}
