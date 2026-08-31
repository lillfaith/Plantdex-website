import { describe, expect, it } from 'vitest';

import { COMPOUND_LINKS, LINKABLE_HEALING, linksFor } from './compound-links';
import { compoundFor } from './compounds';
import { HERBS } from './deck';
import { getSource } from './sources';

/**
 * Connecting a compound to a card's own traits is the one feature on a plant page that
 * could turn "this plant contains salicin" into "salicin is why willow relieves pain".
 * These tests are the reason it cannot.
 */

const ALL_LINKS = Object.entries(COMPOUND_LINKS).flatMap(([compound, links]) =>
  links.map((link) => ({ compound, ...link })),
);

describe('the healing-trait allowlist', () => {
  it('never links a compound to a physiological claim', () => {
    // THE FAILURE THIS EXISTS FOR. Every entry in LINKABLE_HEALING names a physical or
    // compositional property — astringency is protein binding, "mineral-rich" is a
    // statement of what is in the plant. Diuretic, expectorant, pain relief and the rest
    // are claims about the body, and a compound may never be offered as the reason for one.
    const offenders = ALL_LINKS.filter(
      (link) =>
        link.field === 'healingTraits' &&
        !(LINKABLE_HEALING as readonly string[]).includes(link.term),
    );
    expect(
      offenders.map((o) => `${o.compound} -> ${o.term}`),
      'healing links outside the allowlist',
    ).toEqual([]);
  });

  it('keeps the allowlist itself to physical properties', () => {
    // Guards the guard: an edit that adds "Diuretic" to LINKABLE_HEALING would silently
    // reopen the hole the test above closes.
    expect([...LINKABLE_HEALING].sort()).toEqual([
      'Astringent',
      'Cooling',
      'Mineral-rich',
      'Nutrient-rich',
      'Vitamin-rich',
    ]);
  });

  it('never uses effect language in an explanation', () => {
    const forbidden =
      /\b(treats?|cures?|heals?|relieves?|prevents?|reduces?|remed(y|ies)|therapeutic)\b/i;
    for (const link of ALL_LINKS) {
      expect(forbidden.test(link.because), `${link.compound} -> ${link.term}: "${link.because}"`)
        .toBe(false);
    }
  });
});

describe('linksFor', () => {
  it('says nothing the card does not already say', () => {
    // The honesty mechanic: a link surfaces only where the card prints BOTH the compound
    // and the term, so the feature can only rearrange the card's own words.
    for (const herb of HERBS) {
      for (const printed of herb.back.compounds) {
        for (const link of linksFor(herb, printed)) {
          const list = herb.back[link.field];
          const has = list.some(
            (value) => value.trim().toLowerCase() === link.term.trim().toLowerCase(),
          );
          expect(has, `${herb.id}: ${printed} -> ${link.field} "${link.term}" is not on the card`)
            .toBe(true);
        }
      }
    }
  });

  it('returns nothing for a compound the card names but the term it does not', () => {
    const mint = HERBS.find((h) => h.back.compounds.includes('Menthol'))!;
    expect(mint, 'no card names Menthol').toBeDefined();
    const fake = { ...mint, back: { ...mint.back, taste: [], aromatic: [], healingTraits: [] } };
    expect(linksFor(fake, 'Menthol')).toEqual([]);
  });

  it('returns nothing for a compound with no links at all', () => {
    const anyHerb = HERBS[0]!;
    expect(linksFor(anyHerb, 'Not A Real Compound')).toEqual([]);
  });

  it('does not repeat the same term twice on one compound', () => {
    for (const herb of HERBS) {
      for (const printed of herb.back.compounds) {
        const keys = linksFor(herb, printed).map((l) => `${l.field}:${l.term.toLowerCase()}`);
        expect(new Set(keys).size, `${herb.id}: ${printed}`).toBe(keys.length);
      }
    }
  });

  it('actually connects something — the feature is not inert', () => {
    // A guard against the join silently matching nothing, which would look identical to
    // "this card has no connections" on every page.
    const connected = HERBS.filter((herb) =>
      herb.back.compounds.some((printed) => linksFor(herb, printed).length > 0),
    );
    expect(connected.length, 'no card in the deck produces a single link').toBeGreaterThan(8);
  });
});

describe('the link table', () => {
  it('only keys compounds the deck actually prints', () => {
    const printed = new Set(
      HERBS.flatMap((h) => h.back.compounds).map((c) => c.trim().toLowerCase().replace(/\s+/g, ' ')),
    );
    const unknown = Object.keys(COMPOUND_LINKS).filter((key) => !printed.has(key));
    expect(unknown, `links for compounds no card names: ${unknown.join(', ')}`).toEqual([]);
  });

  it('only links compounds the compound layer also knows', () => {
    for (const key of Object.keys(COMPOUND_LINKS)) {
      expect(compoundFor(key), `${key} has links but no classification`).not.toBeNull();
    }
  });

  it('only cites sources that exist in the registry', () => {
    for (const link of ALL_LINKS) {
      for (const id of link.sourceIds ?? []) {
        expect(getSource(id), `${link.compound} cites unknown source "${id}"`).toBeDefined();
      }
    }
  });
});
