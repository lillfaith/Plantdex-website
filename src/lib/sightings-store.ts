'use client';

import { useCallback } from 'react';
import { useAuth } from '@/state/AuthProvider';
import {
  addSighting as addLocalSighting,
  removeSighting as removeLocalSighting,
  useSightingCounts as useLocalSightingCounts,
  useSightings as useLocalSightings,
  type NewSighting,
  type Sighting,
} from './sightings';
import { addRemoteSighting, removeRemoteSighting, useRemoteSightingCounts, useRemoteSightings } from './remote-sightings';

/**
 * Picks local (localStorage/IndexedDB) or remote (Supabase) sightings based on auth state.
 * Both underlying hooks are called unconditionally — rules of hooks — and only one
 * result is used; the unused side is idle (no network calls, no work) when not selected.
 */

export function useSightingCounts(): Record<string, number> {
  const { user } = useAuth();
  const local = useLocalSightingCounts();
  const remote = useRemoteSightingCounts(user?.id);
  return user ? remote : local;
}

export interface LogSightingInput extends Omit<NewSighting, 'photoId'> {
  photo?: File | null;
}

export function useSightingsStore(herbId?: string): {
  sightings: Sighting[];
  addSighting: (input: LogSightingInput) => Promise<Sighting>;
  removeSighting: (id: string) => Promise<void>;
} {
  const { user } = useAuth();
  const local = useLocalSightings(herbId);
  const remote = useRemoteSightings(user?.id, herbId);

  const addSighting = useCallback(
    async (input: LogSightingInput): Promise<Sighting> => {
      const { photo, ...rest } = input;
      if (user) return addRemoteSighting(user.id, { ...rest, photoFile: photo });

      let photoId: string | undefined;
      if (photo) {
        try {
          const { savePhoto } = await import('./photo-store');
          photoId = await savePhoto(photo);
        } catch {
          // Losing the photo must not lose the note the player just wrote.
          photoId = undefined;
        }
      }
      return addLocalSighting({ ...rest, photoId });
    },
    [user],
  );

  const removeSighting = useCallback(
    (id: string) => (user ? removeRemoteSighting(user.id, id) : removeLocalSighting(id)),
    [user],
  );

  return { sightings: user ? remote : local, addSighting, removeSighting };
}
