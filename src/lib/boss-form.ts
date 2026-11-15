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

/**
 * The plants that have a Boss Form. A plain list on purpose: this module is imported by code that
 * ships in every build (the Garden, the challenge page's route list), and it must never pull a
 * question bank into one. `challenge-bank.ts` registers each plant's CONTENT, and a test fails if
 * the two lists ever differ. Listing a plant approves nothing; every question still needs review.
 */
export const BOSS_PILOT: readonly string[] = ['taraxacum-officinale'];

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
 * THE TEMPLATE: how many questions each stage plays, how many the plant must supply, and the pass
 * mark. One rule set for every featured plant; a plant supplies content, never rules.
 *
 *   played  questions in one try
 *   pool    ACTIVE questions the plant must supply (always more than `played`)
 *   need    correct answers required to pass
 *
 * A RETRY REPLAYS THE WHOLE STAGE. There is no per-question second chance. Each new attempt number
 * leaves out a different question (`attempt mod pool`), so a retry always differs from the try
 * before it and never needs more questions than the pool holds. Passing a stage records it once and
 * keeps it: failing a later stage, or replaying this one, never takes it back.
 *
 * Owner-approved on 2026-11-15. The thresholds live only here, in code; no database row holds them.
 */
export const STAGE_RULES: Readonly<Record<ActivityId, { played: number; pool: number; need: number }>> = {
  'part-spotter': { played: 3, pool: 4, need: 2 },
  compare: { played: 2, pool: 3, need: 2 },
  'habitat-season': { played: 2, pool: 3, need: 2 },
  'boss-trial': { played: 5, pool: 6, need: 4 },
};

/** `need` of `of` questions, derived from the template so there is one source of truth. */
export const PASS_MARKS: Readonly<Record<ActivityId, { need: number; of: number }>> = {
  'part-spotter': { need: STAGE_RULES['part-spotter'].need, of: STAGE_RULES['part-spotter'].played },
  compare: { need: STAGE_RULES.compare.need, of: STAGE_RULES.compare.played },
  'habitat-season': { need: STAGE_RULES['habitat-season'].need, of: STAGE_RULES['habitat-season'].played },
  'boss-trial': { need: STAGE_RULES['boss-trial'].need, of: STAGE_RULES['boss-trial'].played },
};

/**
 * Which questions the Boss Trial shows its answers for, and when. The Trial reveals nothing until
 * the whole Trial is submitted; every other stage explains each answer as it is given. Presentation
 * only: the server's scoring does not depend on it.
 */
export function revealsAnswersAtEndOnly(activity: ActivityId): boolean {
  return activity === 'boss-trial';
}

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
 * DURABLE RATE LIMITS, enforced by the edge function, never by the browser. Every authenticated
 * submission, valid or not, spends one unit of a per-user, per-UTC-day allowance held in the
 * database (`claim_scan`, the same atomic counter scanning uses), so it survives isolate restarts
 * and cannot be bypassed by calling again. A Boss Trial submission spends a second, smaller
 * allowance as well.
 *
 * A RATE LIMIT IS NOT THE REWARD CONTROL. Rewards are safe because a stage records once per
 * (player, plant, stage) by primary key and the award function ignores a repeat; the limits only
 * make scripting the answers slow. Sized for honest play: a player who knows the material needs
 * one or two tries per stage.
 *
 * A limit of zero is a kill switch: it refuses everything, which the counter alone would not (its
 * first insert ignores the limit), so the function checks it first.
 */
export const CHALLENGE_DAILY_LIMIT = 20;
export const CHALLENGE_TRIAL_DAILY_LIMIT = 3;

/** The bucket a user's submissions are counted in. Never shared with scanning's buckets. */
export function challengeBucket(userId: string): string {
  return `challenge:${userId}`;
}

/** The smaller bucket the Boss Trial spends from, in addition to the general one. */
export function trialBucket(userId: string): string {
  return `challenge-trial:${userId}`;
}
