import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DECK, PRINTED_DECK_SIZE, PRINTED_CARDS, MAX_PRINTED_DECK_XP, USE_LABEL, getPrintedCard } from './deck';
import { KNOWN_CARD_ISSUES, knownIssueFor } from './card-issues';
import { RARITIES, SEASONS, USE_KEYS } from './types';

const PUBLIC_DIR = join(process.cwd(), 'public');

/**
 * Integrity checks on the generated deck data. These catch a bad regeneration of
 * src/data/herbs.json at test time rather than in the browser.
 */
describe('deck data', () => {
  it('contains the full deck', () => {
    expect(PRINTED_CARDS.length).toBeGreaterThan(0);
    expect(PRINTED_DECK_SIZE).toBe(PRINTED_CARDS.length);
    expect(DECK.deckSize).toBe(PRINTED_CARDS.length);
  });

  it('has unique ids', () => {
    const ids = PRINTED_CARDS.map((herb) => herb.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique, contiguous card numbers starting at 1', () => {
    const numbers = PRINTED_CARDS.map((herb) => herb.cardNumber).sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers[0]).toBe(1);
    expect(numbers[numbers.length - 1]).toBe(numbers.length);
  });

  it('never uses the common name as the identifier', () => {
    // AGENTS.md: "Do not use the visible common name as the primary database identifier."
    for (const herb of PRINTED_CARDS) {
      const commonSlug = herb.commonName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      expect(herb.id).not.toBe(commonSlug);
    }
  });

  it('uses only known rarities, seasons and use keys', () => {
    for (const herb of PRINTED_CARDS) {
      expect(RARITIES).toContain(herb.rarity);
      expect(SEASONS).toContain(herb.season);
      expect(herb.uses.length).toBeGreaterThan(0);
      for (const use of herb.uses) {
        expect(USE_KEYS).toContain(use);
        expect(USE_LABEL[use]).toBeTruthy();
      }
    }
  });

  it('has required text fields on every herb', () => {
    for (const herb of PRINTED_CARDS) {
      expect(herb.commonName.trim().length).toBeGreaterThan(0);
      expect(herb.scientificName.trim().length).toBeGreaterThan(0);
      expect(herb.xp).toBeGreaterThan(0);
    }
  });

  it('has stats within the 1-5 range printed on the cards', () => {
    for (const herb of PRINTED_CARDS) {
      for (const value of Object.values(herb.stats)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(5);
      }
    }
  });

  it('points at card art that actually exists, front and back', () => {
    for (const herb of PRINTED_CARDS) {
      expect(existsSync(join(PUBLIC_DIR, herb.image))).toBe(true);
      expect(existsSync(join(PUBLIC_DIR, herb.thumb))).toBe(true);
      expect(existsSync(join(PUBLIC_DIR, herb.backImage))).toBe(true);
    }
  });

  it('carries the back-of-card content for every herb', () => {
    for (const herb of PRINTED_CARDS) {
      // Every card back has at least these three sections filled in.
      expect(herb.back.healingTraits.length).toBeGreaterThan(0);
      expect(herb.back.compounds.length).toBeGreaterThan(0);
      expect(herb.back.usableParts.length).toBeGreaterThan(0);
      for (const section of Object.values(herb.back)) {
        for (const entry of section) {
          expect(entry.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('exposes the deck disclaimer and the icon legend', () => {
    expect(DECK.disclaimer.main).toContain('educational purposes only');
    expect(DECK.disclaimer.availability.length).toBeGreaterThan(0);
    expect(DECK.disclaimer.encounterRate.length).toBeGreaterThan(0);
    for (const key of USE_KEYS) {
      expect(DECK.useLabels[key]).toBeTruthy();
    }
    for (const season of SEASONS) {
      expect(DECK.seasonLabels[season]).toBeTruthy();
    }
  });

  it('surfaces the printed lookalike warning on Yarrow only', () => {
    const warned = PRINTED_CARDS.filter((herb) => herb.warning);
    expect(warned).toHaveLength(1);
    expect(warned[0]!.commonName).toBe('Yarrow');
    expect(warned[0]!.warning).toContain('poisonous lookalike');
  });

  it('resolves every herb by id', () => {
    for (const herb of PRINTED_CARDS) {
      expect(getPrintedCard(herb.id)).toBe(herb);
    }
    expect(getPrintedCard('nope')).toBeUndefined();
  });

  it('reports a max XP equal to the sum of the deck', () => {
    expect(MAX_PRINTED_DECK_XP).toBe(PRINTED_CARDS.reduce((sum, herb) => sum + herb.xp, 0));
  });
});

describe('knownIssueFor', () => {
  /**
   * Transcription is faithful by rule, so a printing error reaches the site intact and this
   * note is the only place that can say so. What is left after the August reprint is two
   * typos; the three cards that carried ANOTHER plant's profile — 11 was Dandelion's, 24 and
   * 31 were both Sumac's — were corrected on the card itself and their entries went with the
   * new transcription. An entry may only be removed when the printed card is genuinely
   * fixed, never to tidy the list, or the app denies an error still in a buyer's hands.
   */
  it('reports the recorded printing error for an affected card', () => {
    const willow = getPrintedCard('salix-spp')!;
    expect(willow.cardNumber).toBe(38);
    expect(knownIssueFor(willow)).toMatch(/sallicin/i);
  });

  it('covers every card the build script recorded, and only those', () => {
    const flagged = PRINTED_CARDS.filter((herb) => knownIssueFor(herb)).map((herb) => herb.cardNumber);
    expect(flagged.sort((a, b) => a - b)).toEqual(
      Object.keys(KNOWN_CARD_ISSUES)
        .map(Number)
        .sort((a, b) => a - b),
    );
  });

  it('returns nothing for a card with no recorded error', () => {
    // Dandelion is card #01, and card 11 used to print its back verbatim.
    expect(knownIssueFor(getPrintedCard('taraxacum-officinale')!)).toBeUndefined();
  });

  /**
   * THE BUG THE REPRINT FIXED, PINNED SO A REBUILD CANNOT BRING IT BACK.
   *
   * Three cards shipped carrying another card's back, and nothing in the data could notice:
   * every field was individually well-formed, and the duplication was only visible by
   * reading two cards side by side. A regeneration from a stale PDF, or a copy-paste while
   * editing the BACKS table, would reintroduce it exactly as silently.
   *
   * WHY FOUR OF SIX AND NOT AN EXACT MATCH. Only card 31 was a whole-back copy; 11 and 24
   * each differed in one field, so an equality check would have caught one of the three and
   * called the deck clean. The threshold is measured rather than guessed — against the
   * pre-reprint data all four bad pairings share 4+ fields (20/31 share six, 20/24, 24/31
   * and 1/11 share five), and against the corrected deck NO pair shares four. There is
   * therefore no legitimate pair anywhere near this line to false-positive on.
   *
   * A compounds-only check was the other candidate and is rejected: Ground Ivy and Self-Heal
   * genuinely print the same four compounds, so that guard cries wolf on a real card.
   */
  it('gives every card its own back, which is what the reprint corrected', () => {
    const FIELDS = [
      'healingTraits',
      'compounds',
      'taste',
      'aromatic',
      'preparations',
      'usableParts',
    ] as const;

    const suspicious: string[] = [];
    for (let i = 0; i < PRINTED_CARDS.length; i += 1) {
      for (let j = i + 1; j < PRINTED_CARDS.length; j += 1) {
        const a = PRINTED_CARDS[i]!;
        const b = PRINTED_CARDS[j]!;
        const shared = FIELDS.filter(
          (field) => JSON.stringify(a.back?.[field]) === JSON.stringify(b.back?.[field]),
        );
        if (shared.length >= 4) {
          suspicious.push(
            `#${a.cardNumber} ${a.commonName} and #${b.cardNumber} ${b.commonName} ` +
              `share ${shared.length}/6 back fields (${shared.join(', ')})`,
          );
        }
      }
    }
    expect(suspicious).toEqual([]);
  });
});
