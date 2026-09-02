'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/state/AuthProvider';
import {
  isEmptyProfile,
  useLocalProfile,
  writeLocalProfile,
  type StoredProfile,
} from './player-profile';
import { saveRemoteProfile, useRemoteProfile } from './remote-player-profile';

/**
 * Picks the local or the Supabase-backed profile store based on auth state, so call sites
 * never learn which backend they are bound to. Same arrangement as `sightings-store.ts`:
 * both hooks are called unconditionally — rules of hooks — and the unused side is idle.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SIGNING IN SEEDS. IT NEVER OVERWRITES, AND IT NEVER CLEARS.
 *
 * The first time an account with no profile row is used on a device that has one, this
 * copies the device's choices up. That is a single additive insert of things the player
 * already picked, so unlike the collection import there is nothing to weigh up and no dialog
 * to show — and nothing is lost in either direction if it fails, because the local copy is
 * still there and the seed simply runs again next time.
 *
 * It is deliberately one-directional. A signed-in save writes the ACCOUNT only, leaving the
 * device's own signed-out profile alone: on a shared device, signing in must not repaint the
 * identity the next person sees. Same reason the account import is offered per user id.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface ProfileStore {
  profile: StoredProfile;
  /** False until real stored data has arrived. Never save a placeholder over a real row. */
  ready: boolean;
  save: (profile: StoredProfile) => Promise<void>;
  /** The last save failure, phrased for the person reading it. Null when all is well. */
  error: string | null;
}

export function useProfileStore(): ProfileStore {
  const { user } = useAuth();
  const local = useLocalProfile();
  const remote = useRemoteProfile(user?.id);
  const [error, setError] = useState<string | null>(null);

  /*
   * One seed attempt per account per mount. Without the ref, a failed seed would retry on
   * every render for as long as the page was open.
   */
  const seeded = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !remote.ready) return;
    if (seeded.current === user.id) return;
    if (!isEmptyProfile(remote.profile) || isEmptyProfile(local)) return;
    seeded.current = user.id;
    void saveRemoteProfile(user.id, local).catch(() => {
      // Silent: the player did not ask for this, their local copy is untouched, and the
      // attempt repeats on the next visit.
      seeded.current = null;
    });
  }, [user, remote.ready, remote.profile, local]);

  const save = useCallback(
    async (next: StoredProfile) => {
      setError(null);
      if (!user) {
        writeLocalProfile(next);
        return;
      }
      try {
        await saveRemoteProfile(user.id, next);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Could not save your profile.';
        setError(message);
        throw cause;
      }
    },
    [user],
  );

  return {
    profile: user ? remote.profile : local,
    // Signed out there is nothing to wait for: localStorage resolves on the first read.
    ready: user ? remote.ready : true,
    save,
    error,
  };
}
