/**
 * BOSS FORM: the constants and the one pure eligibility rule.
 *
 * A Boss Form is a fourth, cosmetic evolution beside the three mastery stages. It is NOT a
 * `MasteryStage`: `MASTERY_STAGES`, the garden's pinned inverse map, `progression.ts` and the
 * reducer are untouched, so no existing threshold, XP total or achievement can move.
 *
 * It is earned only through the server (`supabase/functions/challenge-submit`). Nothing in the
 * browser can write a completion, so this module holds no state and no storage.
 *
 * PASSING A CHALLENGE IS NOT EVIDENCE THAT ANYBODY CAN IDENTIFY A PLANT OUTDOORS, and no
 * surface may say it is. `CHALLENGE_DISCLAIMER` is the one sentence every result carries.
 */

/** The sole pilot species. Anything not listed here cannot be submitted for. */
export const BOSS_PILOT = ['taraxacum-officinale'] as const;

export const CHALLENGE_ACTIVITIES = [
  'part-spotter',
  'compare',
  'habitat-season',
  'boss-trial',
] as const;
export type ActivityId = (typeof CHALLENGE_ACTIVITIES)[number];

/** The three that must all be recorded before the Boss Trial may be attempted. */
export const PREREQUISITE_ACTIVITIES: readonly ActivityId[] = [
  'part-spotter',
  'compare',
  'habitat-season',
];

/** Owner-approved initial thresholds. `of` is also the number of questions in the set. */
export const PASS_MARKS: Readonly<Record<ActivityId, { need: number; of: number }>> = {
  'part-spotter': { need: 3, of: 4 },
  compare: { need: 3, of: 3 },
  'habitat-season': { need: 2, of: 3 },
  'boss-trial': { need: 9, of: 10 },
};

export const CHALLENGE_DISCLAIMER =
  'Passing this means you studied this guide. It does not mean you can identify or use this plant outdoors.';

export function isBossPilot(herbId: string): boolean {
  return (BOSS_PILOT as readonly string[]).includes(herbId);
}

export function isActivityId(value: unknown): value is ActivityId {
  return (CHALLENGE_ACTIVITIES as readonly unknown[]).includes(value);
}

export interface Standing {
  /** Mastered, read from the caller's own authoritative `mastered` record. */
  readonly mastered: boolean;
  /** Activities already recorded for this herb, from the database. */
  readonly completed: ReadonlySet<ActivityId>;
}

/** May this player submit this activity now? Mastery first, then the Trial after its three. */
export function mayAttempt(
  herbId: string,
  activity: ActivityId,
  standing: Standing,
): { ok: true } | { ok: false; reason: string } {
  if (!isBossPilot(herbId)) return { ok: false, reason: 'not-in-pilot' };
  if (!standing.mastered) return { ok: false, reason: 'not-mastered' };
  if (
    activity === 'boss-trial' &&
    !PREREQUISITE_ACTIVITIES.every((one) => standing.completed.has(one))
  ) {
    return { ok: false, reason: 'prerequisites-missing' };
  }
  return { ok: true };
}
