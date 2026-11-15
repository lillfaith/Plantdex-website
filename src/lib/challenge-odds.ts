import { STAGE_RULES, CHALLENGE_ACTIVITIES, type ActivityId } from './boss-form';
import { buildChallenge, type BuiltQuestion } from './mastery-challenges';
import { speciesFor } from './challenge-bank';

/**
 * THE CHANCE THAT PURE RANDOM CLICKING PASSES, from the real answer counts and the real rules.
 *
 * A try asks `played` questions and passes with `need` right. Slots are independent and there is
 * no second chance on a question, so the exact answer is a small dynamic programme, not a
 * simulation: one question is guessed with probability 1 / (its option count).
 *
 * A stage's figure is the average over a full ROTATION, because each attempt number leaves out a
 * different question and the questions do not all have the same number of options.
 */
export function guessPassProbability(questions: readonly BuiltQuestion[], need: number): number {
  let distribution = [1]; // distribution[k] = P(k questions right so far)
  for (const question of questions) {
    const p = 1 / question.options.length;
    const next = new Array<number>(distribution.length + 1).fill(0);
    distribution.forEach((mass, right) => {
      next[right]! += mass * (1 - p);
      next[right + 1]! += mass * p;
    });
    distribution = next;
  }
  return distribution.reduce((sum, mass, right) => (right >= need ? sum + mass : sum), 0);
}

/**
 * `scope` 'specified' measures every ACTIVE question, gated or not; 'available' only the ones a
 * player could be given once reviewed. For a plant whose active pool has no gated question they
 * are the same.
 */
export function stageGuessOdds(
  herbId: string,
  activity: ActivityId,
  scope: 'specified' | 'available' = 'specified',
): { average: number; min: number; max: number } | null {
  const pool = speciesFor(herbId)?.active.filter((i) => i.activity === activity) ?? [];
  const results: number[] = [];
  for (let attempt = 0; attempt < Math.max(pool.length, 1); attempt += 1) {
    const questions = buildChallenge(herbId, activity, attempt, {
      ...(scope === 'specified' ? { includeUnavailable: true } : { includeUnreviewed: true }),
    });
    if (!questions) return null;
    results.push(guessPassProbability(questions, STAGE_RULES[activity].need));
  }
  return {
    average: results.reduce((a, b) => a + b, 0) / results.length,
    min: Math.min(...results),
    max: Math.max(...results),
  };
}

/** The four stages' average guess odds, in stage order. */
export function stageOdds(herbId: string, scope: 'specified' | 'available' = 'specified') {
  return Object.fromEntries(
    CHALLENGE_ACTIVITIES.map((a) => [a, stageGuessOdds(herbId, a, scope)?.average ?? NaN]),
  ) as Record<ActivityId, number>;
}

/**
 * REPEATED ATTEMPTS. A blind guesser who retries forever eventually passes, which is why the
 * daily limits exist. This is the exact chance that one who clears the stages IN ORDER passes all
 * of them within `totalLimit` submissions in a day, when a stage may be capped to `cap` submissions.
 * Each stage is geometric: pass on try j with probability (1 - p)^(j - 1) * p.
 */
export function blindClearProbability(
  stages: readonly { p: number; cap?: number }[],
  totalLimit: number,
): number {
  let dist = new Array<number>(totalLimit + 1).fill(0);
  dist[0] = 1;
  for (const { p, cap } of stages) {
    const next = new Array<number>(totalLimit + 1).fill(0);
    for (let used = 0; used <= totalLimit; used += 1) {
      const mass = dist[used]!;
      if (mass === 0) continue;
      const most = Math.min(cap ?? Infinity, totalLimit - used);
      for (let tries = 1; tries <= most; tries += 1) {
        next[used + tries]! += mass * (1 - p) ** (tries - 1) * p;
      }
    }
    dist = next;
  }
  return dist.reduce((a, b) => a + b, 0);
}
