'use client';

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import type { DiscoveryResult, Herb, HerbdexState } from '@/lib/types';
import { createLocalStorageAdapter, type HerbdexStorage } from '@/lib/storage';
import { progressFromState, type Progress } from '@/lib/progression';
import { DECK_SIZE } from '@/lib/deck';
import { createHerbdexStore } from './herbdex-store';

interface HerbdexContextValue {
  state: HerbdexState;
  /** False until the browser's stored collection has been read. */
  ready: boolean;
  progress: Progress;
  discoveredCount: number;
  deckSize: number;
  isDiscovered: (herbId: string) => boolean;
  discover: (herb: Herb) => DiscoveryResult;
  reset: () => void;
}

const HerbdexContext = createContext<HerbdexContextValue | null>(null);

export function HerbdexProvider({
  children,
  storage,
}: {
  children: React.ReactNode;
  /** Injectable for tests; defaults to localStorage. */
  storage?: HerbdexStorage;
}) {
  // Lazy initializer so the store is built once and stays stable across renders.
  const [store] = useState(() => createHerbdexStore(storage ?? createLocalStorageAdapter()));

  const { state, ready } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const discover = useCallback((herb: Herb) => store.discover(herb), [store]);
  const reset = useCallback(() => store.reset(), [store]);

  const value = useMemo<HerbdexContextValue>(
    () => ({
      state,
      ready,
      progress: progressFromState(state),
      discoveredCount: Object.keys(state.discoveries).length,
      deckSize: DECK_SIZE,
      isDiscovered: (herbId: string) => Boolean(state.discoveries[herbId]),
      discover,
      reset,
    }),
    [state, ready, discover, reset],
  );

  return <HerbdexContext.Provider value={value}>{children}</HerbdexContext.Provider>;
}

export function useHerbdex(): HerbdexContextValue {
  const context = useContext(HerbdexContext);
  if (!context) throw new Error('useHerbdex must be used inside <HerbdexProvider>');
  return context;
}
