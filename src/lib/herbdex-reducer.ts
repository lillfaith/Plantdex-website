import type { DiscoveryResult, HerbdexState } from './types';
import { getHerb } from './deck';
import { newlyUnlocked } from './achievements';
import { emptyState } from './storage';

/**
 * Pure state transitions for the Herbdex.
 *
 * Kept free of React so the rules can be unit-tested directly and reused unchanged by a
 * server implementation in V0.3.
 */

export type HerbdexAction =
  | { type: 'hydrate'; state: HerbdexState }
  | { type: 'discover'; herbId: string; at?: string }
  | { type: 'reset' };

export function herbdexReducer(state: HerbdexState, action: HerbdexAction): HerbdexState {
  switch (action.type) {
    case 'hydrate':
      return action.state;
    case 'discover':
      return applyDiscovery(state, action.herbId, action.at).state;
    case 'reset':
      return emptyState();
    default:
      return state;
  }
}

/**
 * Record a discovery.
 *
 * Idempotent by construction: if the herb already has a discovery timestamp the state
 * object is returned unchanged and `awarded` is false. Because XP is *derived* by
 * summing over `discoveries` (see progression.ts) rather than accumulated into a stored
 * counter, replaying this call can never inflate a total — there is no counter to
 * increment twice. That satisfies AGENTS.md's "discovery must be idempotent" and
 * "never award XP repeatedly for the same discovery".
 *
 * Unknown herb ids are rejected rather than recorded, so a tampered id cannot create a
 * phantom entry.
 */
export function applyDiscovery(
  state: HerbdexState,
  herbId: string,
  at: string = new Date().toISOString(),
): { state: HerbdexState; result: DiscoveryResult } {
  const noop: DiscoveryResult = { awarded: false, xpAwarded: 0, newAchievementIds: [] };

  const herb = getHerb(herbId);
  if (!herb) return { state, result: noop };
  if (state.discoveries[herbId]) return { state, result: noop };

  const withDiscovery: HerbdexState = {
    ...state,
    discoveries: { ...state.discoveries, [herbId]: at },
  };

  // Re-evaluate the whole registry rather than toggling incrementally, so unlocks stay
  // correct if achievements are added later.
  const unlockedIds = newlyUnlocked(withDiscovery);
  const achievements = { ...withDiscovery.achievements };
  for (const id of unlockedIds) achievements[id] = at;

  return {
    state: { ...withDiscovery, achievements },
    result: { awarded: true, xpAwarded: herb.xp, newAchievementIds: unlockedIds },
  };
}

/**
 * Bring a loaded state up to date with the current achievement registry.
 *
 * Run on hydrate so that achievements added after a player last visited unlock
 * retroactively instead of requiring a new discovery to trigger evaluation.
 */
export function reconcileAchievements(state: HerbdexState, at?: string): HerbdexState {
  const unlockedIds = newlyUnlocked(state);
  if (unlockedIds.length === 0) return state;

  const stamp = at ?? new Date().toISOString();
  const achievements = { ...state.achievements };
  for (const id of unlockedIds) achievements[id] = stamp;
  return { ...state, achievements };
}
