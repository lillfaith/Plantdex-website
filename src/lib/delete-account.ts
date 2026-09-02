import { supabase } from './supabase-client';
import { STORAGE_KEY } from './storage';
import { REVEALS_STORAGE_KEY } from './reveals';
import { PLAYER_PROFILE_STORAGE_KEY } from './player-profile';
import { SEED_SHELF_STORAGE_KEY } from './seed-shelf';

/**
 * CLOSING AN ACCOUNT, from the browser's side.
 *
 * The erasure itself happens in `supabase/functions/delete-account`, because two of its
 * steps are impossible from a client: deleting the `auth.users` row, and removing Storage
 * objects that do not cascade from it. See that file for the ordering argument.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS FUNCTION SENDS NO USER ID. The function derives the account to delete from the JWT
 * the SDK attaches, and reads no request body at all — so there is no field here that could
 * be pointed at somebody else's account, by this code or by anything tampering with it.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LOCAL STATE IS CLEARED ONLY AFTER THE SERVER CONFIRMS. This is the same rule the
 * local-progress import follows in the opposite direction: never destroy the copy you have
 * until the operation that was supposed to replace it has actually succeeded. If the
 * function fails halfway, the player still has this device's collection and can retry.
 *
 * And it clears local state at all because the alternative is worse than it sounds: the
 * signed-out adapter reads the same browser keys, so someone who deletes their account and
 * stays on the page would watch an identical-looking collection reappear the moment the
 * session ends — and reasonably conclude the deletion did nothing.
 */

export interface DeleteAccountResult {
  ok: boolean;
  /** Present on failure, phrased for the person reading it. */
  error?: string;
  photosDeleted?: number;
}

/** Browser keys that hold play data. Photos live in IndexedDB and are cleared separately. */
const LOCAL_KEYS = [
  STORAGE_KEY,
  REVEALS_STORAGE_KEY,
  PLAYER_PROFILE_STORAGE_KEY,
  SEED_SHELF_STORAGE_KEY,
  'plantdex.sightings.v1',
  'plantdex.research-board.v1',
];

export async function deleteAccount(): Promise<DeleteAccountResult> {
  if (!supabase) return { ok: false, error: 'Accounts are not configured on this deployment.' };

  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });

  if (error) {
    /*
     * `FunctionsHttpError` carries the function's own JSON body, which holds the sentence
     * written for this exact failure ("3 photos could not be deleted…"). Without reading it
     * back the player sees a generic "Edge Function returned a non-2xx status code", which
     * tells them nothing about whether their data is gone.
     */
    let message = error.message;
    const response = (error as { context?: Response }).context;
    try {
      const body: unknown = await response?.clone().json();
      if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') {
        message = (body as { error: string }).error;
      } else if (response?.status === 404) {
        // Not the function failing — the function not being there. The gateway's own 404 is
        // not JSON, so without this the player is told "Edge Function returned a non-2xx
        // status code", which reads like their data might be half-deleted. It is not: a 404
        // means nothing ran at all.
        message =
          'Account deletion is not available on this deployment yet. Nothing was deleted. Please contact us to have your account removed.';
      }
    } catch {
      // Not JSON, or no response attached — keep the SDK's message.
    }
    return { ok: false, error: message };
  }

  const result = data as { ok?: boolean; error?: string; photosDeleted?: number } | null;
  if (!result?.ok) return { ok: false, error: result?.error ?? 'Deletion failed.' };

  await clearLocalData();
  // Signing out last: the session is what proved who this was, and there is nothing left to
  // authorise once the account is gone.
  await supabase.auth.signOut();
  return { ok: true, photosDeleted: result.photosDeleted };
}

/**
 * Wipes this browser's own copy.
 *
 * Exported rather than inlined so the erasure a signed-out player performs (clearing site
 * data) and the one an account deletion performs are demonstrably the same set of keys —
 * a key added to one and forgotten in the other is how a "deleted" collection reappears.
 */
export async function clearLocalData(): Promise<void> {
  try {
    for (const key of LOCAL_KEYS) window.localStorage.removeItem(key);
    // The import-offered flags are keyed by user id, so they are found by prefix.
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith('plantdex.')) window.localStorage.removeItem(key);
    }
  } catch {
    // Blocked storage: nothing was written there either.
  }

  try {
    const { clearAllPhotos } = await import('./photo-store');
    await clearAllPhotos();
  } catch {
    // Photos are a convenience store; a failure here must not make the deletion look failed.
  }
}
