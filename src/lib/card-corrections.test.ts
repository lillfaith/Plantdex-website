import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CARD_CORRECTIONS, cardCorrectionFor } from './card-corrections';
import { PRINTED_CARDS } from './deck';
import { siteCautionFor } from './card-cautions';
import { knownIssueFor } from './card-issues';

const BY_NUMBER = new Map(PRINTED_CARDS.map((herb) => [herb.cardNumber, herb]));

describe('digital corrections', () => {
  it('are attached to real cards and say both halves', () => {
    for (const [number, correction] of Object.entries(CARD_CORRECTIONS)) {
      expect(BY_NUMBER.has(Number(number)), `card #${number} is not in the deck`).toBe(true);
      expect(correction.supersededParts.length, number).toBeGreaterThan(0);
      // "what the card says" AND "what Plantdex now recommends" — a message with only the
      // second half leaves a reader holding the deck unsure which text to follow.
      expect(correction.message, number).toMatch(/printed card/i);
      expect(correction.message, number).toMatch(/no longer recommends/i);
    }
  });

  it('names parts the card actually prints, spelled as the card spells them', () => {
    /*
     * THE CORRECTION HAS TO MATCH THE TRANSCRIPTION IT CORRECTS. If a future reprint fixed
     * card #31 and `usableParts` lost "Leaf", this correction would be describing text that
     * is no longer on the card — and it would say so to somebody holding the corrected deck.
     * Failing here is the signal to remove the entry, the same contract `KNOWN_CARD_ISSUES`
     * has.
     */
    for (const [number, correction] of Object.entries(CARD_CORRECTIONS)) {
      const herb = BY_NUMBER.get(Number(number))!;
      for (const part of correction.supersededParts) {
        expect(
          herb.back?.usableParts ?? [],
          `card #${number} no longer prints ${part} — remove the correction`,
        ).toContain(part);
      }
    }
  });

  it('leaves the transcription untouched', () => {
    // The whole guarantee: the printed list still reads exactly as printed. The correction
    // sits beside it and never edits it.
    const elder = BY_NUMBER.get(31)!;
    expect(elder.back?.usableParts).toEqual(['Berry', 'Flower', 'Leaf', 'Shoot']);
  });

  it('covers Elderberry and nothing else', () => {
    expect(Object.keys(CARD_CORRECTIONS)).toEqual(['31']);
    const elder = BY_NUMBER.get(31)!;
    expect(cardCorrectionFor(elder)?.supersededParts).toEqual(['Leaf', 'Shoot']);
  });

  it('is paired with the caution rather than replacing it', () => {
    /*
     * Four layers, four questions, and none substitutes for another: the card's own warning,
     * "this instruction is withdrawn", "here is the risk", "your card is misprinted". #31
     * carries three of them, and a reader needs all three — which is why this test asserts
     * the OTHERS still fire, not just that this one does.
     */
    const elder = BY_NUMBER.get(31)!;
    expect(cardCorrectionFor(elder)).toBeDefined();
    expect(siteCautionFor(elder)).toBeDefined();
    expect(knownIssueFor(elder)).toBeDefined();
  });

  it('renders above its caution, and only where a transcription exists', () => {
    const detail = readFileSync('src/components/herbdex/HerbDetail.tsx', 'utf8');
    expect(detail).toContain('DigitalCorrection');
    // Ordering: the withdrawal is read before the risk it explains.
    expect(detail.indexOf('<DigitalCorrection')).toBeLessThan(detail.indexOf('<SiteCaution'));

    /*
     * NOT ON `LockedHerb`, for the same reason `CardIssueNote` is not: a locked page shows no
     * transcription, so there is nothing on screen for "the card says Leaf and Shoot" to be
     * about. The caution still appears there, because a risk does not depend on having read
     * the card.
     */
    const locked = readFileSync('src/components/herbdex/LockedHerb.tsx', 'utf8');
    expect(locked).not.toContain('DigitalCorrection');
    expect(locked).toContain('SiteCaution');
  });
});
