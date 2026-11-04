import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PRINTED_CARDS, getPrintedCard } from './deck';
import { FINDABILITY_TIERS, boardTierFor, findabilityIn } from './findability';
import { habitatOf } from './habitat';
import { GEORGIA, featuredForRegion, speciesForRegion } from './region-species';
import { RARITIES } from './types';

/**
 * The rarity rules, which are a gameplay classification and must stay one.
 *
 * The failure these exist for is quiet: a plausible-looking change that starts deriving
 * difficulty from observation counts, or that lets a regional tier overwrite the Encounter
 * Rate printed on a physical card somebody is holding.
 */

const confirmed = { occurrence: 'confirmed' as const };
const likely = { occurrence: 'likely' as const };

describe('the rarity tiers', () => {
  it('are the same four the cards print', () => {
    expect(FINDABILITY_TIERS).toEqual(RARITIES);
    expect([...FINDABILITY_TIERS]).toEqual(['Common', 'Uncommon', 'Rare', 'Epic']);
  });

  it('never move a card more than one step from what it prints', () => {
    /*
     * THE CONSTRAINT THAT PROTECTS THE ARTWORK. A rule that could take a printed Epic to
     * Common would contradict the object in somebody's hand. Swept over every deck species
     * under every occurrence class rather than argued.
     */
    for (const card of PRINTED_CARDS) {
      for (const regional of [confirmed, likely]) {
        const tier = findabilityIn(card.id, regional);
        if (!tier) continue;
        const moved = Math.abs(RARITIES.indexOf(tier) - RARITIES.indexOf(card.rarity));
        expect(moved, `${card.commonName} moved ${moved} steps`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('do not change Herb.rarity itself', () => {
    // The printed value is read, never written. A regression here would mean the site and
    // the card disagree about the same plant.
    const before = PRINTED_CARDS.map((c) => c.rarity);
    PRINTED_CARDS.forEach((c) => findabilityIn(c.id, confirmed));
    expect(PRINTED_CARDS.map((c) => c.rarity)).toEqual(before);
  });
});

describe('what the assignment is allowed to read', () => {
  const source = readFileSync('src/lib/findability.ts', 'utf8')
    .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

  it('reads no observation or specimen counts', () => {
    // Counts measure recording effort — where people with phones go — not abundance.
    for (const forbidden of ['observations', 'specimens', 'record_count', 'recordCount', 'gbif']) {
      expect(source, `findability must not read ${forbidden}`)
        .not.toMatch(new RegExp(forbidden, 'i'));
    }
  });

  it('reads no conservation status', () => {
    // Extinction risk is not difficulty, and a listed plant must never become a prize
    // because the game called it one.
    for (const forbidden of ['iucn', 'endangered', 'threatened', 'conservation']) {
      expect(source).not.toMatch(new RegExp(forbidden, 'i'));
    }
  });

  it('reads the printed rate, the occurrence class and the habitat, and nothing else', () => {
    expect(source).toMatch(/card\.rarity/);
    expect(source).toMatch(/regional\.occurrence/);
    expect(source).toMatch(/habitatOf/);
  });
});

describe('the rule, case by case', () => {
  it('makes a confirmed wayside or garden plant one step commoner', () => {
    // Dandelion is a printed Common on a wayside: already the floor, so it stays.
    expect(findabilityIn('taraxacum-officinale', confirmed)).toBe('Common');
    // Mullein is a printed Uncommon on a wayside, confirmed here: met without trying.
    expect(getPrintedCard('verbascum-thapsus')?.rarity).toBe('Uncommon');
    expect(findabilityIn('verbascum-thapsus', confirmed)).toBe('Common');
  });

  it('makes a merely likely species one step rarer', () => {
    // Stinging nettle is a printed Common at the edge of its range in Georgia.
    expect(getPrintedCard('urtica-dioica')?.rarity).toBe('Common');
    expect(findabilityIn('urtica-dioica', likely)).toBe('Uncommon');
  });

  it('treats a wetland plant as a destination', () => {
    const wetland = PRINTED_CARDS.find((c) => habitatOf(c.id)?.primary === 'wetland');
    expect(wetland, 'the deck should contain a wetland species').toBeDefined();
    const tier = findabilityIn(wetland!.id, confirmed);
    expect(RARITIES.indexOf(tier!)).toBeGreaterThanOrEqual(RARITIES.indexOf(wetland!.rarity));
  });

  it('refuses to classify a species that is not findable here', () => {
    expect(findabilityIn('taraxacum-officinale', { occurrence: 'insufficient' })).toBeNull();
    expect(findabilityIn('taraxacum-officinale', { occurrence: 'unlikely' })).toBeNull();
    expect(findabilityIn('taraxacum-officinale', undefined)).toBeNull();
    expect(findabilityIn('not-a-card', confirmed)).toBeNull();
  });

  it('is total: every findable Georgia species gets a tier', () => {
    for (const entry of GEORGIA) {
      const tier = findabilityIn(entry.herbId, entry);
      if (entry.occurrence === 'confirmed' || entry.occurrence === 'likely') {
        expect(tier, `${entry.herbId} has no tier`).not.toBeNull();
      } else {
        expect(tier).toBeNull();
      }
    }
  });

  it('puts every tier somewhere sensible on a board', () => {
    expect(boardTierFor('Common')).toBe('starter');
    expect(boardTierFor('Uncommon')).toBe('main');
    expect(boardTierFor('Rare')).toBe('stretch');
    expect(boardTierFor('Epic')).toBe('stretch');
  });
});

describe('the Georgia data', () => {
  it('covers every binomial card in the deck', () => {
    // 36 species carry a binomial; the nine `Genus spp.` cards name none and cannot have an
    // occurrence record. A card missing from this file would silently vanish from the region.
    const binomials = PRINTED_CARDS.filter((c) => !c.scientificName.includes(' spp.'));
    expect(GEORGIA).toHaveLength(binomials.length);
    for (const card of binomials) {
      expect(GEORGIA.some((e) => e.herbId === card.id), `${card.commonName} is missing`).toBe(true);
    }
  });

  it('names only real cards', () => {
    for (const entry of GEORGIA) {
      expect(getPrintedCard(entry.herbId), `${entry.herbId} is not a card`).toBeDefined();
    }
  });

  it('features the thirteen approved plants, and no others', () => {
    const featured = featuredForRegion('us-ga').map((e) => e.herbId).sort();
    expect(featured).toHaveLength(13);
    expect(featured).toContain('lamium-purpureum');   // the existing card, not a new one
    expect(featured).toContain('passiflora-incarnata');
    for (const entry of featuredForRegion('us-ga')) {
      expect(entry.occurrence, `${entry.herbId} is featured but not confirmed`).toBe('confirmed');
    }
  });

  it('keeps the species with no Georgia records out of the collection', () => {
    // Wild Mint: the card names Mentha canadensis, a largely northern species, and the
    // survey found ZERO Georgia records. It stays a card; it is not offered here.
    const mint = GEORGIA.find((e) => e.herbId === 'mentha-canadensis');
    expect(mint?.occurrence).toBe('insufficient');
    expect(mint?.featured).toBeUndefined();
  });

  it('claims no seasons, because the survey measured recording effort', () => {
    /*
     * The month histogram counts WHEN RECORDS WERE MADE. 22 of the 24 best candidates read
     * "spring" because spring is when people in Georgia go out and record. Writing that in
     * here would dress recording effort up as phenology and would hide most of the
     * collection for most of the year.
     */
    for (const entry of GEORGIA) {
      expect(entry.seasons, `${entry.herbId} claims a season`).toBeUndefined();
    }
  });

  it('returns nothing for a region it has no data for', () => {
    expect(speciesForRegion('us-nowhere')).toEqual([]);
    expect(speciesForRegion(null)).toEqual([]);
  });
});
