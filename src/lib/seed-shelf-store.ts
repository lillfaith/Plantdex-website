'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/state/AuthProvider';
import { addLocalFind, removeLocalSpecies, useLocalFinds } from './local-seed-shelf';
import { addRemoteFind, removeRemoteSpecies, useRemoteFinds } from './remote-seed-shelf';
import { mergeFinds, type NewSeedShelfFind, type SeedShelfEntry } from './seed-shelf';
import {
  canonicalPacketFor,
  loadCanonicalPackets,
  useCanonicalPackets,
} from './species-packets';

/**
 * Picks the local or the Supabase-backed shelf based on auth state, so no component learns
 * which backend it is bound to.
 *
 * Exactly the arrangement `sightings-store.ts` uses, including the rule that made it worth
 * having: both hooks are called unconditionally — rules of hooks — and only one result is
 * used. `sightings-store.test.ts` exists because a page once reached past that facade and
 * showed a signed-in player the wrong journal; this facade is guarded the same way.
 */
export interface SeedShelfStore {
  /** One entry per species, merged from every find. */
  entries: SeedShelfEntry[];
  save: (input: NewSeedShelfFind) => Promise<SeedShelfEntry | null>;
  remove: (speciesKey: string) => Promise<void>;
  /** True when the shelf is the account's rather than this device's. */
  signedIn: boolean;
}

export function useSeedShelf(): SeedShelfStore {
  const { user } = useAuth();
  const local = useLocalFinds();
  const remote = useRemoteFinds(user?.id);
  const finds = user ? remote : local;

  /*
   * THE CANONICAL PACKETS FOR WHATEVER IS ON THIS SHELF.
   *
   * Read in one query for the whole shelf rather than one per packet, and only for species
   * this tab has not already read. `registryVersion` is what re-renders the shelf when they
   * arrive: until then every entry draws the preview derived from its own name, which is the
   * same artwork unless the generator has moved on since the species was first minted.
   */
  const speciesKeys = useMemo(() => finds.map((find) => find.speciesKey), [finds]);
  const registryVersion = useCanonicalPackets();
  useEffect(() => {
    void loadCanonicalPackets(speciesKeys);
  }, [speciesKeys]);

  const entries = useMemo(
    () => mergeFinds(finds, canonicalPacketFor),
    // `registryVersion` is not read inside — it is the signal that `canonicalPacketFor` now
    // answers differently, which a Map cannot express as a changed reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finds, registryVersion],
  );

  const save = useCallback(
    async (input: NewSeedShelfFind): Promise<SeedShelfEntry | null> => {
      const find = user ? await addRemoteFind(user.id, input) : addLocalFind(input);
      if (!find) return null;
      // The entry as it now stands, folded from the finds this call knows about. The store's
      // own re-render is what the page renders from; this is for the caller that wants to
      // say something about what it just saved.
      return (
        mergeFinds([...finds, find], canonicalPacketFor).find(
          (entry) => entry.speciesKey === find.speciesKey,
        ) ?? null
      );
    },
    [user, finds],
  );

  const remove = useCallback(
    async (speciesKey: string) => {
      if (user) await removeRemoteSpecies(user.id, speciesKey);
      else removeLocalSpecies(speciesKey);
    },
    [user],
  );

  return { entries, save, remove, signedIn: Boolean(user) };
}
