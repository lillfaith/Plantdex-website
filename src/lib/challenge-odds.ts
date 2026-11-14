import { PASS_MARKS, type ActivityId } from './boss-form';
import { buildChallenge, type Slot } from './mastery-challenges';

/**
 * THE CHANCE THAT PURE RANDOM CLICKING PASSES, from the real answer counts and retry rules.
 *
 * For one set of slots, a slot is resolved by guessing with probability
 *   1/options(primary), or, when the slot has a second chance,
 *   1/n1 + (1 - 1/n1) * 1/n2     (n2 = options on the replacement),
 * and the set passes when at least `need` slots are resolved. Slots are independent, so the
 * exact answer is a small dynamic programme, not a simulation.
 *
 * The result for an activity is the average over many attempt numbers, because each attempt
 * draws a different set. It measures the questions as SPECIFIED, including ones that are
 * disabled today (`includeUnavailable`), so the report holds before the photographs arrive.
 */
export function guessPassProbability(slots: readonly Slot[], need: number): number {
  let distribution = [1]; // distribution[k] = P(k slots resolved so far)
  for (const slot of slots) {
    const first = 1 / slot.primary.options.length;
    const p = slot.replacement
      ? first + (1 - first) * (1 / slot.replacement.options.length)
      : first;
    const next = new Array<number>(distribution.length + 1).fill(0);
    distribution.forEach((mass, resolved) => {
      next[resolved]! += mass * (1 - p);
      next[resolved + 1]! += mass * p;
    });
    distribution = next;
  }
  return distribution.reduce((sum, mass, resolved) => (resolved >= need ? sum + mass : sum), 0);
}

export function activityGuessOdds(
  activity: ActivityId,
  attempts = 200,
): { average: number; min: number; max: number } | null {
  const results: number[] = [];
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const slots = buildChallenge('taraxacum-officinale', activity, attempt, {
      includeUnavailable: true,
    });
    if (!slots) return null;
    results.push(guessPassProbability(slots, PASS_MARKS[activity].need));
  }
  return {
    average: results.reduce((a, b) => a + b, 0) / results.length,
    min: Math.min(...results),
    max: Math.max(...results),
  };
}
