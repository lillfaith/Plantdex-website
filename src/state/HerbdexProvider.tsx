'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { DiscoveryResult, Herb, HerbdexState } from '@/lib/types';
import { applyDiscovery, reconcileAchievements } from '@/lib/herbdex-reducer';
import { createLocalStorageAdapter, emptyState, type HerbdexStorage } from '@/lib/storage';
import { progressFromState, type Progress } from '@/lib/progression';
import { DECK_SIZE } from '@/lib/deck';

interface HerbdexContextValue {
  state: HerbdexState;
  /** False until localStorage has been read, so SSR and first paint agree. */
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
  const adapterRef = useRef<HerbdexStorage | null>(storage ?? null);
  if (adapterRef.current === null) adapterRef.current = createLocalStorageAdapter();
  const adapter = adapterRef.current;

  // Start from empty so the server render and the first client render match; the real
  // state is loaded in the effect below. Rendering stored progress during SSR is
  // impossible anyway (the server cannot see the browser's storage).
  const [state, setState] = useState<HerbdexState>(emptyState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = reconcileAchievements(adapter.load());
    setState(loaded);
    setReady(true);
    // Persist immediately if reconciliation unlocked anything retroactively.
    adapter.save(loaded);
  }, [adapter]);

  const discover = useCallback(
    (herb: Herb): DiscoveryResult => {
      // Compute against the latest state inside the updater so two rapid taps cannot
      // both read a stale "not yet discovered" snapshot and double-award.
      let result: DiscoveryResult = { awarded: false, xpAwarded: 0, newAchievementIds: [] };
      setState((current) => {
        const outcome = applyDiscovery(current, herb.id);
        result = outcome.result;
        if (!outcome.result.awarded) return current;
        adapter.save(outcome.state);
        return outcome.state;
      });
      return result;
    },
    [adapter],
  );

  const reset = useCallback(() => {
    const fresh = emptyState();
    setState(fresh);
    adapter.save(fresh);
  }, [adapter]);

  const value = useMemo<HerbdexContextValue>(() => {
    const discoveredCount = Object.keys(state.discoveries).length;
    return {
      state,
      ready,
      progress: progressFromState(state),
      discoveredCount,
      deckSize: DECK_SIZE,
      isDiscovered: (herbId: string) => Boolean(state.discoveries[herbId]),
      discover,
      reset,
    };
  }, [state, ready, discover, reset]);

  return <HerbdexContext.Provider value={value}>{children}</HerbdexContext.Provider>;
}

export function useHerbdex(): HerbdexContextValue {
  const context = useContext(HerbdexContext);
  if (!context) throw new Error('useHerbdex must be used inside <HerbdexProvider>');
  return context;
}
