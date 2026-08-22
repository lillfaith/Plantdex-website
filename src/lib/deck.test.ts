import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DECK, DECK_SIZE, HERBS, MAX_DECK_XP, USE_LABEL, getHerb } from './deck';
import { RARITIES, SEASONS, USE_KEYS } from './types';

const PUBLIC_DIR = join(process.cwd(), 'public');

/**
 * Integrity checks on the generated deck data. These catch a bad regeneration of
 * src/data/herbs.json at test time rather than in the browser.
 */
describe('deck data', () => {
  it('contains the full deck', () => {
    expect(HERBS.length).toBeGreaterThan(0);
    expect(DECK_SIZE).toBe(HERBS.length);
    expect(DECK.deckSize).toBe(HERBS.length);
  });

  it('has unique ids', () => {
    const ids = HERBS.map((herb) => herb.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique, contiguous card numbers starting at 1', () => {
    const numbers = HERBS.map((herb) => herb.cardNumber).sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers[0]).toBe(1);
    expect(numbers[numbers.length - 1]).toBe(numbers.length);
  });

  it('never uses the common name as the identifier', () => {
    // AGENTS.md: "Do not use the visible common name as the primary database identifier."
    for (const herb of HERBS) {
      const commonSlug = herb.commonName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      expect(herb.id).not.toBe(commonSlug);
    }
  });

  it('uses only known rarities, seasons and use keys', () => {
    for (const herb of HERBS) {
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
    for (const herb of HERBS) {
      expect(herb.commonName.trim().length).toBeGreaterThan(0);
      expect(herb.scientificName.trim().length).toBeGreaterThan(0);
      expect(herb.xp).toBeGreaterThan(0);
    }
  });

  it('has stats within the 1-5 range printed on the cards', () => {
    for (const herb of HERBS) {
      for (const value of Object.values(herb.stats)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(5);
      }
    }
  });

  it('points at card art that actually exists, front and back', () => {
    for (const herb of HERBS) {
      expect(existsSync(join(PUBLIC_DIR, herb.image))).toBe(true);
      expect(existsSync(join(PUBLIC_DIR, herb.thumb))).toBe(true);
      expect(existsSync(join(PUBLIC_DIR, herb.backImage))).toBe(true);
    }
  });

  it('carries the back-of-card content for every herb', () => {
    for (const herb of HERBS) {
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
    const warned = HERBS.filter((herb) => herb.warning);
    expect(warned).toHaveLength(1);
    expect(warned[0]!.commonName).toBe('Yarrow');
    expect(warned[0]!.warning).toContain('poisonous lookalike');
  });

  it('resolves every herb by id', () => {
    for (const herb of HERBS) {
      expect(getHerb(herb.id)).toBe(herb);
    }
    expect(getHerb('nope')).toBeUndefined();
  });

  it('reports a max XP equal to the sum of the deck', () => {
    expect(MAX_DECK_XP).toBe(HERBS.reduce((sum, herb) => sum + herb.xp, 0));
  });
});
