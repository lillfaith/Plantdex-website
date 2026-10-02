import { describe, expect, it } from 'vitest';

import { ELIGIBILITIES, type Eligibility, matchScientificName } from './plant-match';

/**
 * THE SIX BASES, ONE REPRESENTATIVE EACH, ASSERTED TOGETHER.
 *
 * Scattered across the files that own each card, these were six assertions nobody could read
 * as a matrix — and a matrix is what they are: six different answers to "why did this card
 * open", which must stay distinguishable from each other or the record collapses back into
 * the thing it was built to replace.
 */
const MATRIX: readonly {
  name: string;
  basis: Eligibility;
  card: string | undefined;
  confirmable: boolean;
  why: string;
}[] = [
  {
    name: 'Oxalis stricta',
    basis: 'exact',
    card: 'oxalis-stricta',
    confirmable: true,
    why: 'the anchor returned directly',
  },
  {
    name: 'Oxalis europaea',
    basis: 'synonym',
    card: 'oxalis-stricta',
    confirmable: true,
    why: 'GBIF-checked nomenclatural synonym of the anchor — the same plant',
  },
  {
    name: 'Taraxacum sect. Taraxacum',
    basis: 'acceptedGroup',
    card: 'taraxacum-officinale',
    confirmable: true,
    why: 'a supra-specific concept the card represents; nothing is equated',
  },
  {
    name: 'Solidago gigantea',
    basis: 'curatedEquivalent',
    card: 'solidago-canadensis',
    confirmable: true,
    why: 'a distinct accepted species, researched to share the card',
  },
  {
    name: 'Rhus typhina',
    basis: 'genusCard',
    card: 'rhus-spp',
    confirmable: true,
    why: 'the card prints `Genus spp.` — its own stated scope',
  },
  {
    name: 'Solidago altissima',
    basis: 'related',
    card: 'solidago-canadensis',
    confirmable: false,
    why: 'same genus, no evidence; names a related card but unlocks nothing',
  },
];

describe('the unlock-basis matrix', () => {
  it('produces one distinct basis per way of qualifying', () => {
    for (const row of MATRIX) {
      const match = matchScientificName(row.name);
      expect(match.eligibility, `${row.name} (${row.why})`).toBe(row.basis);
      expect(match.herbId, row.name).toBe(row.card);
      expect(match.confirmable, row.name).toBe(row.confirmable);
    }
  });

  it('keeps the observed taxon the provider’s, on every basis', () => {
    // Including the two where the card's name differs from the plant's — which is the whole
    // reason `observedTaxon` is stored beside `herbId` rather than derived from it.
    for (const row of MATRIX) {
      const match = matchScientificName(row.name);
      expect(match.observedTaxon?.name, row.name).toBe(row.name);
      expect(match.observedTaxon?.providerName, row.name).toBe(row.name);
    }
  });

  it('never issues legacyGenus, while keeping it readable', () => {
    for (const row of MATRIX) {
      expect(matchScientificName(row.name).eligibility, row.name).not.toBe('legacyGenus');
    }
    // Readable: stored sightings carry it, so the vocabulary and the CHECK both keep it.
    expect(ELIGIBILITIES).toContain('legacyGenus');
  });

  it('exercises every unlocking basis the vocabulary defines', () => {
    /*
     * The guard that stops this matrix going stale. `ambiguous`, `related` and `none` do not
     * unlock anything and are covered where they arise; every basis that CAN open a card must
     * appear above, so adding a seventh without a representative fails here.
     */
    const UNLOCKING: readonly Eligibility[] = [
      'exact',
      'synonym',
      'acceptedGroup',
      'curatedEquivalent',
      'genusCard',
    ];
    const covered = new Set(MATRIX.filter((one) => one.confirmable).map((one) => one.basis));
    expect([...covered].sort()).toEqual([...UNLOCKING].sort());
    for (const basis of ELIGIBILITIES) {
      if (['ambiguous', 'related', 'none', 'legacyGenus'].includes(basis)) continue;
      expect(UNLOCKING, `${basis} unlocks a card but has no representative`).toContain(basis);
    }
  });
});

describe('Oxalis europaea, traced end to end', () => {
  it('unlocks Oxalis stricta as `synonym`, with the provider name intact', () => {
    const match = matchScientificName('Oxalis europaea');
    expect(match.herbId).toBe('oxalis-stricta');
    expect(match.eligibility).toBe('synonym');
    expect(match.confirmable).toBe(true);
    // The card is the anchor; the record is what the provider said. Both, separately.
    expect(match.observedTaxon?.name).toBe('Oxalis europaea');
    expect(match.observedTaxon?.providerName).toBe('Oxalis europaea');
    expect(match.observedTaxon?.rank).toBe('species');
    /*
     * `kind` STAYS `exact` AND THAT IS NOT THE BUG BEING FIXED. It drives what the UI says,
     * and for a synonym "this is the card's species" is true — they are the same plant. What
     * was wrong was the RECORD, which could not tell the two apart after the fact.
     */
    expect(match.kind).toBe('exact');
  });

  it('does the same for every other checked synonym', () => {
    for (const [name, card] of [
      ['Taraxacum campylodes', 'taraxacum-officinale'],
      ['Leontodon taraxacum', 'taraxacum-officinale'],
      ['Taraxacum vulgare', 'taraxacum-officinale'],
      ['Viola papilionacea', 'viola-sororia'],
    ] as const) {
      const match = matchScientificName(name);
      expect(match.eligibility, name).toBe('synonym');
      expect(match.herbId, name).toBe(card);
      expect(match.observedTaxon?.name, name).toBe(name);
    }
  });
});
