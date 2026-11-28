import type { HerbdexState } from './types';
import { progressFromState } from './progression';
import { researchTaskById } from './research';

/**
 * EARNED MOMENTS: a level-up, a mastery, a Field Research completion, derived from the
 * TRANSITION between two authoritative snapshots and never from a render or a click.
 *
 * Pure: no clock, no randomness, no storage. Awards nothing and changes no threshold; it only
 * observes what the existing reducers already recorded. Forward only: a lower level or an id
 * already present in `prev` is not news, so an account switch, a stale response or a reload
 * cannot read as a reward.
 */
export type EarnedMoment =
  | { id: string; kind: 'level-up'; fromLevel: number; toLevel: number }
  | { id: string; kind: 'mastery'; herbId: string }
  | { id: string; kind: 'research'; taskId: string };

export interface EarnedSnapshot {
  level: number;
  masteredIds: readonly string[];
  researchIds: readonly string[];
}

export const levelUpId = (toLevel: number): string => `level-up:${toLevel}`;
export const masteryId = (herbId: string): string => `mastery:${herbId}`;
export const researchId = (taskId: string): string => `research:${taskId}`;

export function snapshotOf(state: HerbdexState): EarnedSnapshot {
  return {
    level: progressFromState(state).level,
    masteredIds: Object.keys(state.mastered).sort(),
    // Same guard XP applies: an id that resolves to no task is not a completion.
    researchIds: Object.keys(state.research)
      .filter((id) => researchTaskById(id) !== undefined)
      .sort(),
  };
}

export function deriveEarnedMoments(
  prev: EarnedSnapshot,
  next: EarnedSnapshot,
  announced: ReadonlySet<string>,
): EarnedMoment[] {
  const moments: EarnedMoment[] = [];

  // Two levels at once is ONE moment, to the final level.
  if (next.level > prev.level) {
    moments.push({
      id: levelUpId(next.level),
      kind: 'level-up',
      fromLevel: prev.level,
      toLevel: next.level,
    });
  }

  const hadMastered = new Set(prev.masteredIds);
  for (const herbId of next.masteredIds) {
    if (!hadMastered.has(herbId)) {
      moments.push({ id: masteryId(herbId), kind: 'mastery', herbId });
    }
  }

  const hadResearch = new Set(prev.researchIds);
  for (const taskId of next.researchIds) {
    if (!hadResearch.has(taskId)) {
      moments.push({ id: researchId(taskId), kind: 'research', taskId });
    }
  }

  return moments.filter((moment) => !announced.has(moment.id));
}

/** The furthest-forward union of two snapshots: a baseline never moves backwards. */
export function mergeForward(a: EarnedSnapshot, b: EarnedSnapshot): EarnedSnapshot {
  return {
    level: Math.max(a.level, b.level),
    masteredIds: [...new Set([...a.masteredIds, ...b.masteredIds])],
    researchIds: [...new Set([...a.researchIds, ...b.researchIds])],
  };
}
