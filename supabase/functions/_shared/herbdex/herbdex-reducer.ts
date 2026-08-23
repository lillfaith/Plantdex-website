import type { DiscoveryResult, HerbdexState } from './types.ts';
import { getHerb } from './deck.ts';
import { newlyUnlocked } from './achievements.ts';
import { qualifiesForMastery } from './mastery.ts';
import { progressForTask, xpForTask, type ResearchTask, type ResearchWorld } from './research.ts';
import { XP_FOR_LEARNING, XP_FOR_MASTERY } from './progression.ts';
import { emptyState } from './herbdex-state.ts';

/**
 * Pure state transitions for the Herbdex.
 *
 * Kept free of React so the rules can be unit-tested directly and reused unchanged by a
 * server implementation in V0.3.
 */

export type HerbdexAction =
  | { type: 'hydrate'; state: HerbdexState }
  | { type: 'discover'; herbId: string; at?: string }
  | { type: 'learn'; herbId: string; at?: string }
  | { type: 'syncMastery'; sightingCounts: Record<string, number>; at?: string }
  | {
      type: 'syncResearch';
      world: ResearchWorld;
      activeTasks: readonly ResearchTask[];
      at?: string;
    }
  | { type: 'reset' };

export function herbdexReducer(state: HerbdexState, action: HerbdexAction): HerbdexState {
  switch (action.type) {
    case 'hydrate':
      return action.state;
    case 'discover':
      return applyDiscovery(state, action.herbId, action.at).state;
    case 'learn':
      return applyLearned(state, action.herbId, action.at).state;
    case 'syncMastery':
      return reconcileMastery(state, action.sightingCounts, action.at).state;
    case 'syncResearch':
      return reconcileResearch(state, action.world, action.activeTasks, action.at).state;
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

  const { state: next, newAchievementIds } = stampAchievements(withDiscovery, at);

  return {
    state: next,
    result: { awarded: true, xpAwarded: herb.xp, newAchievementIds },
  };
}

/**
 * Record that the player passed a card's knowledge check — stage 2 of mastery.
 *
 * Idempotent on exactly the same terms as discovery: an already-learned card returns the
 * same state object and awards nothing. Learning requires the card to have been
 * discovered first; a card the player has not found is not theirs to study, and allowing
 * it would let someone skip straight past the part of the product that happens outdoors.
 */
export function applyLearned(
  state: HerbdexState,
  herbId: string,
  at: string = new Date().toISOString(),
): { state: HerbdexState; result: DiscoveryResult } {
  const noop: DiscoveryResult = { awarded: false, xpAwarded: 0, newAchievementIds: [] };

  if (!getHerb(herbId)) return { state, result: noop };
  if (!state.discoveries[herbId]) return { state, result: noop };
  if (state.learned[herbId]) return { state, result: noop };

  const withLearned: HerbdexState = {
    ...state,
    learned: { ...state.learned, [herbId]: at },
  };

  const { state: next, newAchievementIds } = stampAchievements(withLearned, at);

  return {
    state: next,
    result: { awarded: true, xpAwarded: XP_FOR_LEARNING, newAchievementIds },
  };
}

export interface MasteryReconciliation {
  state: HerbdexState;
  /** Cards that reached mastery on this pass. Empty when nothing changed. */
  masteredIds: string[];
  xpAwarded: number;
  newAchievementIds: string[];
}

/**
 * Award mastery to every card that now qualifies — stage 3.
 *
 * Written as a reconciliation rather than an event handler on purpose. Mastery depends on
 * sightings, which live in their own store and can be added from several places (and, in
 * V0.3, by another device). Recomputing the whole set from current facts means the answer
 * is the same however the player got there, and re-running it is free: cards already
 * mastered are skipped, so no timestamp is ever rewritten and no XP is ever awarded twice.
 * Returns the *same state object* when nothing qualifies, so callers can skip the write.
 */
export function reconcileMastery(
  state: HerbdexState,
  sightingCounts: Record<string, number>,
  at: string = new Date().toISOString(),
): MasteryReconciliation {
  const masteredIds: string[] = [];
  for (const herbId of Object.keys(state.learned)) {
    if (state.mastered[herbId]) continue;
    if (qualifiesForMastery(state, herbId, sightingCounts[herbId] ?? 0)) masteredIds.push(herbId);
  }

  if (masteredIds.length === 0) {
    return { state, masteredIds, xpAwarded: 0, newAchievementIds: [] };
  }

  const mastered = { ...state.mastered };
  for (const herbId of masteredIds) mastered[herbId] = at;

  const { state: next, newAchievementIds } = stampAchievements({ ...state, mastered }, at);

  return {
    state: next,
    masteredIds,
    xpAwarded: masteredIds.length * XP_FOR_MASTERY,
    newAchievementIds,
  };
}

export interface ResearchReconciliation {
  state: HerbdexState;
  /** Tasks that completed on this pass. Empty when nothing changed. */
  completedIds: string[];
  xpAwarded: number;
  newAchievementIds: string[];
}

/**
 * Record every active research task whose steps are now all met.
 *
 * Takes the ACTIVE tasks rather than the whole registry, because a daily is only earnable
 * once it has been offered — otherwise every eligible daily in the deck would pay out the
 * moment its condition happened to be true. Standing tasks (seasonal, collection) are
 * always active; dailies are active only while on the board.
 *
 * Written as a reconciliation for the same reasons as `reconcileMastery`: progress depends
 * on sightings, which live in another store and can change from several places, so the
 * answer must be recomputable from current facts. Re-running is free — a task already
 * recorded is skipped, so no timestamp is rewritten and no XP is paid twice — and the
 * *same state object* comes back when nothing qualifies, so callers can skip the write.
 */
export function reconcileResearch(
  state: HerbdexState,
  world: ResearchWorld,
  activeTasks: readonly ResearchTask[],
  at: string = new Date().toISOString(),
): ResearchReconciliation {
  const completedIds: string[] = [];
  let xpAwarded = 0;

  for (const task of activeTasks) {
    if (state.research[task.id]) continue;
    if (!progressForTask(task, world).qualifies) continue;
    completedIds.push(task.id);
    xpAwarded += xpForTask(task);
  }

  if (completedIds.length === 0) {
    return { state, completedIds, xpAwarded: 0, newAchievementIds: [] };
  }

  const research = { ...state.research };
  for (const id of completedIds) research[id] = at;

  const { state: next, newAchievementIds } = stampAchievements({ ...state, research }, at);

  return { state: next, completedIds, xpAwarded, newAchievementIds };
}

/**
 * Re-evaluate the whole achievement registry against a state and stamp anything newly
 * earned. Evaluating everything rather than toggling incrementally is what keeps unlocks
 * correct when achievements are added later.
 */
function stampAchievements(
  state: HerbdexState,
  at: string,
): { state: HerbdexState; newAchievementIds: string[] } {
  const newAchievementIds = newlyUnlocked(state);
  if (newAchievementIds.length === 0) return { state, newAchievementIds };

  const achievements = { ...state.achievements };
  for (const id of newAchievementIds) achievements[id] = at;
  return { state: { ...state, achievements }, newAchievementIds };
}

/**
 * Bring a loaded state up to date with the current achievement registry.
 *
 * Run on hydrate so that achievements added after a player last visited unlock
 * retroactively instead of requiring a new discovery to trigger evaluation.
 */
export function reconcileAchievements(state: HerbdexState, at?: string): HerbdexState {
  return stampAchievements(state, at ?? new Date().toISOString()).state;
}
