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
      // `printed <Name> card` as well as a bare `printed card`.
      expect(correction.message, number).toMatch(/printed\s+(\w+\s+)?card/i);
      /*
       * IT MUST SAY THE CARD IS WRONG, and MUST NOT frame that as a revised recommendation.
       * Two drafts failed the second half: "Plantdex no longer recommends those parts", then
       * the same clause appended to a correct opening. Both imply the printed text was once
       * valid advice. Leaf and Shoot were never valid — listing them was a printing mistake
       * from the moment it was printed — so the assertion is pinned in both directions.
       */
      expect(correction.message, number).toMatch(/incorrectly lists/i);
      expect(correction.message, number).toMatch(/do not eat or use/i);
      expect(correction.message, number).not.toMatch(/no longer recommends?/i);
      expect(correction.message, number).not.toMatch(/we (now )?(advise|suggest|prefer)/i);
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

  it('states the mistake ONCE, and keeps the caution for a different question', () => {
    /*
     * THIS TEST USED TO REQUIRE ALL THREE BLOCKS TO FIRE, on the reasoning that "your card is
     * misprinted", "this is withdrawn" and "here is the risk" are three questions a reader
     * needs all of. Two of those turned out to be one: a correction that names the printing
     * error, forbids the use and records the recommendation leaves the `KNOWN_CARD_ISSUES`
     * note nothing to add, and the caution was repeating the leaf-and-shoot half on top.
     *
     * So the DATA keeps all three — the card is still misprinted and the entry must say so,
     * which `knownIssueFor` below asserts — and the PAGE shows the correction plus a caution
     * that is now only about preparation.
     */
    const elder = BY_NUMBER.get(31)!;
    expect(cardCorrectionFor(elder)).toBeDefined();
    expect(cardCorrectionFor(elder)?.supersedesCardIssue).toBe(true);
    expect(siteCautionFor(elder)).toBeDefined();
    // Never removed: CLAUDE.md allows a KNOWN_CARD_ISSUES entry to go only when a reprint
    // genuinely fixes the card. Suppressing it on screen is a presentation decision.
    expect(knownIssueFor(elder)).toBeDefined();
  });

  it('suppresses the duplicate note only where a correction declares it', () => {
    const detail = readFileSync('src/components/herbdex/HerbDetail.tsx', 'utf8');
    expect(detail).toContain('!correction?.supersedesCardIssue');
    // A card with an unrelated misprint and no correction must still show its note.
    for (const [number, correction] of Object.entries(CARD_CORRECTIONS)) {
      if (correction.supersedesCardIssue) continue;
      expect(knownIssueFor(BY_NUMBER.get(Number(number))!), number).toBeDefined();
    }
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
