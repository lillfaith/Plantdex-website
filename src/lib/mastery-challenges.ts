import { hash, seeded, shuffle } from './rng';
import {
  PASS_MARKS,
  TRIAL_MIX,
  hasRetry,
  isActivityId,
  isBossPilot,
  mayAttempt,
  type ActivityId,
  type Standing,
} from './boss-form';
import {
  CHALLENGE_BANK,
  type ChallengeCategory,
  type ChallengeItem,
  type ChallengeKind,
} from './challenge-bank';

/**
 * MASTERY CHALLENGES: the builder and the scorer, as pure code shared by client and server.
 *
 * THIS MODULE IS A SEPARATE SYSTEM FROM `knowledge-check.ts` AND MUST STAY ONE. That module
 * keeps the general rule untouched: its questions may never concern identification, edibility
 * or safety, and passing it only means the card was read. This one is permitted a single extra
 * class of question: comparing curated botanical traits, with immediate feedback. It may not
 * import, or be imported by, the card check; a test enforces both directions.
 *
 * SAFETY DOES NOT REST ON A WORD FILTER. A question is served only if a named reviewer and a
 * date sit against its id in `CHALLENGE_REVIEWS` and it cites at least one source. The filter
 * in the tests is a backstop, not the control. `CHALLENGE_REVIEWS` is empty today, so nothing
 * is served and nothing can be awarded.
 *
 * THE SERVER NEVER SERVES, OR ACCEPTS AN ANSWER TO, AN UNREVIEWED QUESTION. `includeUnreviewed`
 * exists only so the client can preview a draft in development; `evaluateSubmission` does not
 * take it, so an award cannot be earned from a draft by construction.
 */

export interface Review {
  readonly reviewer: string;
  /** ISO date, YYYY-MM-DD. */
  readonly reviewedOn: string;
}

/** Sign-offs by question id. Kept in this file on purpose: one visible place, empty by default. */
export const CHALLENGE_REVIEWS: Readonly<Record<string, Review>> = {};

/**
 * ASSETS THAT ARE READY TO SHIP. Empty for the two cat's-ear pieces: a licensed photograph of a
 * branched stem does not exist yet, and the cat's-ear wording has not been ruled on by a
 * reviewer. An item that `requires` anything not listed here is DISABLED, in preview as well
 * as in production, because there is nothing to show.
 */
export const READY_ASSETS: ReadonlySet<string> = new Set<string>();

export function isAvailable(item: ChallengeItem): boolean {
  return (item.requires ?? []).every((need) => READY_ASSETS.has(need));
}

export function isServable(item: ChallengeItem): boolean {
  const review = CHALLENGE_REVIEWS[item.id];
  return (
    isAvailable(item) &&
    review !== undefined &&
    review.reviewer.trim() !== '' &&
    /^\d{4}-\d{2}-\d{2}$/.test(review.reviewedOn) &&
    item.sources.length > 0
  );
}

export interface BuiltQuestion {
  readonly id: string;
  readonly kind: ChallengeKind;
  readonly category: ChallengeCategory;
  readonly media?: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly feedback: string;
  readonly sources: readonly string[];
}

/** One slot in a set. A missed slot may be answered once more by its replacement question. */
export interface Slot {
  readonly primary: BuiltQuestion;
  readonly replacement?: BuiltQuestion;
}

function build(item: ChallengeItem, seed: number): BuiltQuestion {
  const rand = seeded(hash(`${item.id}|${seed}`));
  const options = shuffle([item.correct, ...item.distractors], rand);
  return {
    id: item.id,
    kind: item.kind,
    category: item.category,
    media: item.media,
    prompt: item.prompt,
    options,
    correctIndex: options.indexOf(item.correct),
    feedback: item.feedback,
    sources: item.sources,
  };
}

export const MAX_ATTEMPT = 9999;

/**
 * The question set for `(herb, activity, attempt)`, or null when the pool cannot fill it.
 *
 * Deterministic: the same arguments always give the same set in the same order, on any
 * machine, so the server rebuilds exactly what the client showed. A new attempt number draws
 * a different set of equal weight; it is not a reroll toward an easier one, because every
 * item in a pool is of the same kind.
 */
export function buildChallenge(
  herbId: string,
  activity: ActivityId,
  attempt: number,
  options: { includeUnreviewed?: boolean; includeUnavailable?: boolean } = {},
): Slot[] | null {
  if (!isBossPilot(herbId)) return null;
  if (!Number.isInteger(attempt) || attempt < 0 || attempt > MAX_ATTEMPT) return null;

  // An item whose photograph or ruling is missing is never built, unless a TEST asks for it
  // (the odds report measures the questions as specified, not only the ones available today).
  // `includeUnavailable` is for tests; `evaluateSubmission` passes neither option.
  const wanted = (item: ChallengeItem) =>
    item.herbId === herbId &&
    item.activity === activity &&
    (options.includeUnavailable === true || isAvailable(item)) &&
    (options.includeUnreviewed === true || options.includeUnavailable === true || isServable(item));

  const pool = CHALLENGE_BANK.filter(wanted);
  const size = PASS_MARKS[activity].of;
  const seed = hash(`${herbId}|${activity}|${attempt}`);
  const shuffled = shuffle(pool, seeded(seed));

  let primaries: ChallengeItem[];
  if (activity === 'boss-trial') {
    // Six picture questions, three applied, one recall. Each group is drawn on its own so the
    // 60/30/10 makeup holds on every attempt, then the ten are shuffled together.
    primaries = [];
    for (const category of ['visual', 'applied', 'recall'] as const) {
      const group = shuffled.filter((item) => item.category === category);
      if (group.length < TRIAL_MIX[category]) return null;
      primaries.push(...group.slice(0, TRIAL_MIX[category]));
    }
    primaries = shuffle(primaries, seeded(hash(`${seed}|order`)));
  } else {
    if (pool.length < size) return null;
    primaries = shuffled.slice(0, size);
  }

  // Second chances exist only where `RETRY_ACTIVITIES` says so. The Boss Trial and Compare
  // never have one, so the same set is first-try only.
  const spares = hasRetry(activity) ? shuffled.filter((item) => !primaries.includes(item)) : [];

  return primaries.map((item, index) => {
    const spare = spares[index];
    return spare
      ? { primary: build(item, seed), replacement: build(spare, seed) }
      : { primary: build(item, seed) };
  });
}

export interface Score {
  readonly resolved: number;
  readonly total: number;
  readonly passed: boolean;
}

/**
 * Score a submission. `answers[i]` holds the choice for slot i's primary question and, only if
 * that was wrong, its replacement. Anything malformed (wrong length, a non-integer, an index
 * out of range, a replacement answered when the primary was right) is rejected outright rather
 * than scored generously.
 */
export function scoreSubmission(
  slots: readonly Slot[],
  activity: ActivityId,
  answers: unknown,
): Score | null {
  if (!Array.isArray(answers) || answers.length !== slots.length) return null;
  let resolved = 0;

  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index]!;
    const given: unknown = answers[index];
    if (!Array.isArray(given) || given.length < 1 || given.length > 2) return null;
    const [first, second] = given as unknown[];
    const inRange = (value: unknown, question: BuiltQuestion) =>
      Number.isInteger(value) &&
      (value as number) >= 0 &&
      (value as number) < question.options.length;

    if (!inRange(first, slot.primary)) return null;
    if (first === slot.primary.correctIndex) {
      if (given.length !== 1) return null;
      resolved += 1;
      continue;
    }
    if (given.length === 2) {
      // Defence in depth: an activity without a retry refuses a second answer outright.
      if (!hasRetry(activity)) return null;
      if (!slot.replacement || !inRange(second, slot.replacement)) return null;
      if (second === slot.replacement.correctIndex) resolved += 1;
    }
  }

  const { need, of } = PASS_MARKS[activity];
  return { resolved, total: of, passed: resolved >= need };
}

export interface Submission {
  readonly herbId: string;
  readonly activity: unknown;
  readonly attempt: unknown;
  readonly answers: unknown;
}

export type Decision =
  | { ok: false; reason: string }
  | { ok: true; score: Score; recordActivity: boolean; recordBossForm: boolean };

/**
 * THE WHOLE SERVER DECISION, AS A PURE FUNCTION. The edge function reads `standing` from the
 * database, calls this, and writes whatever it returns; vitest exercises the same code. The
 * client's claim is only `answers`: a score or a completion flag has nowhere to go.
 */
export function evaluateSubmission(submission: Submission, standing: Standing): Decision {
  const { herbId, activity, attempt, answers } = submission;
  if (!isActivityId(activity)) return { ok: false, reason: 'unknown-activity' };
  if (typeof attempt !== 'number') return { ok: false, reason: 'bad-attempt' };

  const gate = mayAttempt(herbId, activity, standing);
  if (!gate.ok) return gate;

  // Never `includeUnreviewed`: a draft question cannot earn anything.
  const slots = buildChallenge(herbId, activity, attempt);
  if (!slots) return { ok: false, reason: 'unavailable' };

  const score = scoreSubmission(slots, activity, answers);
  if (!score) return { ok: false, reason: 'malformed-answers' };

  return {
    ok: true,
    score,
    recordActivity: score.passed,
    recordBossForm: score.passed && activity === 'boss-trial',
  };
}
