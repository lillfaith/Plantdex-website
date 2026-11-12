import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { matchScientificName } from './plant-match';
import {
  SURVEY_SIZE,
  SURVEY_TOP_FOUR,
  SURVEY_TOP_THREE,
  topThreeStatement,
} from './identification-reliability';

/**
 * THE CLAIM IS RECOMPUTED FROM THE EVIDENCE, EVERY RUN.
 *
 * A reliability figure that drifts from its data is worse than none, and a hand-written
 * number has no way of noticing. This walks the same 45 real provider responses the survey
 * holds, finds where the correct card actually sits in each ranking, and fails if any
 * constant stops matching. Re-photograph the deck and the claim either updates or breaks.
 */
function rankOfCorrectCard(): number[] {
  const source = readFileSync('src/lib/plant-match.live.test.ts', 'utf8');
  const rows = [...source.matchAll(/'([a-z0-9-]+)':\[(\[.*?\])\],?\n/gs)];
  const ranks: number[] = [];
  for (const [, herbId, body] of rows) {
    const names = [...(body ?? '').matchAll(/\['([^']+)',/g)].map((m) => m[1] ?? '');
    if (names.length === 0) continue;
    const index = names.findIndex((name) => {
      const match = matchScientificName(name);
      return match.herbId === herbId && match.confirmable;
    });
    // 0 means "never offered at all", which would be a far larger failure than a bad rank.
    ranks.push(index === -1 ? 0 : index + 1);
  }
  return ranks;
}

describe('the reliability claim matches the survey', () => {
  const ranks = rankOfCorrectCard();

  it('surveys every printed card', () => {
    expect(ranks).toHaveLength(SURVEY_SIZE);
  });

  // If this breaks, the correct card stopped being offered somewhere — not a wording problem.
  it('offers the correct card in every single response', () => {
    expect(ranks.filter((rank) => rank === 0)).toEqual([]);
  });

  it('counts the top-three hits the claim reports', () => {
    expect(ranks.filter((rank) => rank >= 1 && rank <= 3)).toHaveLength(SURVEY_TOP_THREE);
  });

  it('counts the top-four hits the claim reports', () => {
    expect(ranks.filter((rank) => rank >= 1 && rank <= 4)).toHaveLength(SURVEY_TOP_FOUR);
  });

  // The claim may never overstate: top-three can only be fewer than the total surveyed.
  it('never claims more hits than photographs', () => {
    expect(SURVEY_TOP_THREE).toBeLessThanOrEqual(SURVEY_SIZE);
    expect(SURVEY_TOP_FOUR).toBeLessThanOrEqual(SURVEY_SIZE);
    expect(SURVEY_TOP_THREE).toBeLessThanOrEqual(SURVEY_TOP_FOUR);
  });
});

describe('what the sentence is allowed to say', () => {
  const sentence = topThreeStatement();

  it('states the count and the sample, not a bare percentage', () => {
    expect(sentence).toContain('45');
    expect(sentence).toContain('44');
    expect(sentence).not.toMatch(/\d+%/);
  });

  /*
   * The survey is photographs of THIS deck's species. It is not a claim about every plant,
   * a bad photograph, or a species with no card, and the wording has to carry that.
   */
  it('scopes the claim to the deck', () => {
    expect(sentence).toMatch(/deck/);
    expect(sentence).toMatch(/test photographs/);
  });

  // It says the right card is NEAR the top, never which of the three it is.
  it('does not claim which suggestion is correct', () => {
    expect(sentence).not.toMatch(/\bthis\b|\bthe first\b|\btop suggestion is\b/);
  });
});
