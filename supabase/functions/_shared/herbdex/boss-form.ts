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

/**
 * Owner-approved thresholds. `of` is also the number of questions in the set.
 *
 * Compare moved from 3 of 3 to 2 of 3 on the owner's instruction. The threshold lives only
 * here, in code: no database row or SQL function holds it, and `challenge-submit` has never
 * been deployed, so no recorded completion can be affected. Completions are write-once.
 */
export const PASS_MARKS: Readonly<Record<ActivityId, { need: number; of: number }>> = {
  'part-spotter': { need: 3, of: 4 },
  compare: { need: 2, of: 3 },
  'habitat-season': { need: 2, of: 3 },
  'boss-trial': { need: 9, of: 10 },
};

/**
 * WHICH ACTIVITIES ALLOW ONE SECOND CHANCE ON A MISSED QUESTION.
 *
 * Part Spotter and Habitat do: a missed slot may be answered once more by a DIFFERENT question
 * on the same fact (never the same question again, because the feedback has just shown its
 * answer). Compare does not, because its comparisons have only two choices each: with a
 * retry, pure guessing passed 84% of the time. The Boss Trial never does.
 */
export const RETRY_ACTIVITIES: readonly ActivityId[] = ['part-spotter', 'habitat-season'];

export function hasRetry(activity: ActivityId): boolean {
  return RETRY_ACTIVITIES.includes(activity);
}

/** The Boss Trial's makeup: six picture questions, three applied, one recall (60/30/10). */
export const TRIAL_MIX = { visual: 6, applied: 3, recall: 1 } as const;

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

/**
 * DURABLE RATE LIMIT. Every authenticated submission, valid or not, spends one unit of a
 * per-user, per-UTC-day allowance held in the database (`claim_scan`, the same atomic counter
 * scanning uses), so it survives isolate restarts and cannot be bypassed by calling again.
 *
 * Sized generously for honest play (three prerequisites plus retries and several Trials) and
 * low enough to make scripting the answer key across attempts noisy. A limit of zero is a
 * kill switch: it refuses everything, which the counter alone would not (its first insert
 * ignores the limit), so the function checks it first.
 */
export const CHALLENGE_DAILY_LIMIT = 60;

/** The bucket a user's submissions are counted in. Never shared with scanning's buckets. */
export function challengeBucket(userId: string): string {
  return `challenge:${userId}`;
}
