import { describe, expect, it } from 'vitest';
import { buildKnowledgeCheck, MIN_QUESTIONS } from './knowledge-check';
import { HERBS, RARITY_LABEL, SEASON_LABEL } from './deck';

/**
 * The point of these tests is not that the quiz works — it is that the quiz cannot invent
 * botany. AGENTS.md forbids generating plant information, so every option a player is ever
 * shown has to be traceable to text printed on a real card.
 */

const ALL_SEASON_LABELS = new Set(Object.values(SEASON_LABEL));
const ALL_RARITY_LABELS = new Set(Object.values(RARITY_LABEL));
const ALL_PARTS = new Set(HERBS.flatMap((herb) => herb.back.usableParts));
const ALL_COMPOUNDS = new Set(HERBS.flatMap((herb) => herb.back.compounds));

describe('buildKnowledgeCheck', () => {
  it('produces a real check for every card in the deck', () => {
    for (const herb of HERBS) {
      expect(buildKnowledgeCheck(herb).length).toBeGreaterThanOrEqual(MIN_QUESTIONS);
    }
  });

  it('never shows an option that is not printed on some card in the deck', () => {
    for (const herb of HERBS) {
      for (const question of buildKnowledgeCheck(herb)) {
        for (const option of question.options) {
          const printed =
            ALL_SEASON_LABELS.has(option) ||
            ALL_RARITY_LABELS.has(option) ||
            ALL_PARTS.has(option) ||
            ALL_COMPOUNDS.has(option);
          expect(printed, `"${option}" is not printed on any card`).toBe(true);
        }
      }
    }
  });

  it('marks the answer that this card actually carries', () => {
    for (const herb of HERBS) {
      for (const question of buildKnowledgeCheck(herb)) {
        const answer = question.options[question.answerIndex]!;
        switch (question.id) {
          case 'season':
            expect(answer).toBe(SEASON_LABEL[herb.season]);
            break;
          case 'rarity':
            expect(answer).toBe(RARITY_LABEL[herb.rarity]);
            break;
          case 'usable-part':
            expect(herb.back.usableParts).toContain(answer);
            break;
          case 'compound':
            expect(herb.back.compounds).toContain(answer);
            break;
          default:
            throw new Error(`unexpected question id ${question.id}`);
        }
      }
    }
  });

  /** A distractor that is also true of this card would make the check unfair and wrong. */
  it('never uses a distractor that is itself printed on this card', () => {
    for (const herb of HERBS) {
      const lower = (values: readonly string[]) => values.map((value) => value.toLowerCase());
      for (const question of buildKnowledgeCheck(herb)) {
        const wrong = question.options.filter((_, index) => index !== question.answerIndex);
        for (const option of wrong) {
          if (question.id === 'usable-part') {
            expect(lower(herb.back.usableParts)).not.toContain(option.toLowerCase());
          }
          if (question.id === 'compound') {
            expect(lower(herb.back.compounds)).not.toContain(option.toLowerCase());
          }
          if (question.id === 'season') expect(option).not.toBe(SEASON_LABEL[herb.season]);
          if (question.id === 'rarity') expect(option).not.toBe(RARITY_LABEL[herb.rarity]);
        }
      }
    }
  });

  it('gives four distinct options per question, with a findable answer', () => {
    for (const herb of HERBS) {
      for (const question of buildKnowledgeCheck(herb)) {
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options).size).toBe(4);
        expect(question.answerIndex).toBeGreaterThanOrEqual(0);
        expect(question.answerIndex).toBeLessThan(4);
        expect(question.where.length).toBeGreaterThan(0);
      }
    }
  });

  /**
   * The check must never ask anything a wrong answer could make dangerous, so it stays
   * away from the card's traditional-use section entirely.
   */
  it('asks only about card facts, never about use, safety or identification', () => {
    const forbidden = /heal|treat|cure|remed|safe|edible|eat|dose|medic|identif|poison/i;
    for (const herb of HERBS) {
      for (const question of buildKnowledgeCheck(herb)) {
        // The plant's own name is not the question's wording — Self-Heal is a card, not a
        // claim — so it is removed before checking how the question is phrased.
        const wording = question.prompt.replaceAll(herb.commonName, '');
        expect(wording).not.toMatch(forbidden);
        for (const option of question.options) {
          expect(herb.back.healingTraits).not.toContain(option);
        }
      }
    }
  });

  it('is deterministic — the same card always produces the same check', () => {
    for (const herb of HERBS.slice(0, 5)) {
      expect(buildKnowledgeCheck(herb)).toEqual(buildKnowledgeCheck(herb));
    }
  });

  it('does not put the answer in the same slot every time', () => {
    const slots = new Set(
      HERBS.flatMap((herb) => buildKnowledgeCheck(herb).map((q) => q.answerIndex)),
    );
    expect(slots.size).toBeGreaterThan(1);
  });
});
