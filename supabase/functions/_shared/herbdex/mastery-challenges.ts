import { hash, seeded, shuffle } from './rng.ts';
import {
  STAGE_RULES,
  isActivityId,
  isBossPilot,
  mayAttempt,
  type ActivityId,
  type Standing,
} from './boss-form.ts';
import { ACTIVE_CHALLENGES, type ChallengeCategory, type ChallengeItem, type ChallengeKind } from './challenge-bank.ts';

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
 * WHICH QUESTIONS A TRY PLAYS: `played` consecutive questions from the pool, starting at
 * `attempt mod pool`, wrapping round. Each attempt therefore leaves out a different question, so a
 * retry always differs from the try before it, and no attempt can ask for more questions than the
 * pool holds. Pure, so the server and the browser pick the same ones.
 */
export function selectForAttempt<T>(pool: readonly T[], played: number, attempt: number): T[] {
  const n = pool.length;
  if (n === 0 || played > n) return [];
  const start = attempt % n;
  return Array.from({ length: played }, (_, i) => pool[(start + i) % n]!);
}

/**
 * The question set for `(herb, activity, attempt)`, or null when the pool cannot fill it.
 *
 * Deterministic: the same arguments always give the same set in the same order, on any machine, so
 * the server rebuilds exactly what the client showed. Only ACTIVE questions are ever drawn; an
 * archived question is not in `ACTIVE_CHALLENGES` and so cannot be served or scored, whatever its
 * review state. Rules come from `STAGE_RULES`; nothing here names a plant.
 */
export function buildChallenge(
  herbId: string,
  activity: ActivityId,
  attempt: number,
  options: { includeUnreviewed?: boolean; includeUnavailable?: boolean } = {},
): BuiltQuestion[] | null {
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

  const pool = ACTIVE_CHALLENGES.filter(wanted);
  const { played } = STAGE_RULES[activity];
  if (pool.length < played) return null;

  const seed = hash(`${herbId}|${activity}|${attempt}`);
  const chosen = shuffle(selectForAttempt(pool, played, attempt), seeded(hash(`${seed}|order`)));
  return chosen.map((item) => build(item, seed));
}

export interface Score {
  readonly resolved: number;
  readonly total: number;
  readonly passed: boolean;
}

/**
 * Score a submission: one chosen option index per question, in the order the set was built.
 * Anything malformed (wrong length, a non-integer, an index out of range, the old nested shape) is
 * rejected outright rather than scored generously.
 */
export function scoreSubmission(
  questions: readonly BuiltQuestion[],
  activity: ActivityId,
  answers: unknown,
): Score | null {
  if (!Array.isArray(answers) || answers.length !== questions.length) return null;
  let resolved = 0;
  for (let index = 0; index < questions.length; index += 1) {
    const given: unknown = answers[index];
    const question = questions[index]!;
    if (!Number.isInteger(given) || (given as number) < 0 || (given as number) >= question.options.length) {
      return null;
    }
    if (given === question.correctIndex) resolved += 1;
  }
  return { resolved, total: questions.length, passed: resolved >= STAGE_RULES[activity].need };
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
 *
 * A FAIL RECORDS NOTHING AND TAKES NOTHING BACK. `recordActivity` is true only on a pass, and the
 * caller never deletes a completion, so failing a stage, or a later stage, cannot undo earlier
 * progress.
 */
export function evaluateSubmission(submission: Submission, standing: Standing): Decision {
  const { herbId, activity, attempt, answers } = submission;
  if (!isActivityId(activity)) return { ok: false, reason: 'unknown-activity' };
  if (typeof attempt !== 'number') return { ok: false, reason: 'bad-attempt' };

  const gate = mayAttempt(herbId, activity, standing);
  if (!gate.ok) return gate;

  // Never `includeUnreviewed`: a draft question cannot earn anything.
  const questions = buildChallenge(herbId, activity, attempt);
  if (!questions) return { ok: false, reason: 'unavailable' };

  const score = scoreSubmission(questions, activity, answers);
  if (!score) return { ok: false, reason: 'malformed-answers' };

  return {
    ok: true,
    score,
    recordActivity: score.passed,
    recordBossForm: score.passed && activity === 'boss-trial',
  };
}
