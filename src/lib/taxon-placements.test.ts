import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PRINTED_CARDS } from './deck';
import { allScopes, scopeFor } from './card-coverage';
import { applyDiscovery } from './herbdex-reducer';
import { emptyState } from './herbdex-state';
import type { HerbdexState } from './types';
import { genusOf, matchScientificName, normalizeName, outcomeFor } from './plant-match';
import { progressFromState } from './progression';
import { isShelfEligible } from './seed-shelf';
import {
  CONTENT_EXCLUSIONS,
  outOfGenusPlacements,
  VERIFIED_PLACEMENTS,
} from './taxon-placements';

const LIB = join(process.cwd(), 'src', 'lib');

describe('verified taxon placements', () => {
  /*
   * THE SYSTEMIC GUARD. Every row whose accepted genus sits outside the genus it would be
   * matched under MUST be excluded by that genus's card. This is the invariant that turns
   * "somebody noticed poison sumac" into "the next one fails CI instead of reaching a
   * player" — the exposure is invisible from the scope alone, because the hazard rides in
   * on a name the card never mentions.
   */
  it('excludes every verified out-of-genus name from the card it would reach', () => {
    const out = outOfGenusPlacements();
    expect(out.length).toBeGreaterThan(0);

    for (const placement of out) {
      const card = PRINTED_CARDS.find(
        (herb) =>
          genusOf(herb.scientificName) === placement.queriedGenus &&
          scopeFor(herb.id)?.type === 'genus',
      );
      expect(card, `no genus card for ${placement.queriedGenus}`).toBeDefined();

      const scope = scopeFor(card!.id);
      expect(scope?.type).toBe('genus');
      const excluded = (scope?.type === 'genus' ? (scope.excluded ?? []) : []).map(normalizeName);
      expect(
        excluded,
        `${placement.name} resolves to ${placement.acceptedName} (genus ` +
          `${placement.acceptedGenus}) but ${card!.id} does not exclude it`,
      ).toContain(normalizeName(placement.name));
    }
  });

  /*
   * NO EXCLUSION WITHOUT A RECORDED REASON. Every name in every scope's `excluded` list must
   * be accounted for by exactly one of the two evidence tables — taxonomic (its placement
   * left the genus) or content (the card's own claims fail for it). Exactly one, because the
   * two are different arguments and a name in both would mean nobody decided which applied.
   */
  it('accounts for every excluded name in exactly one evidence table', () => {
    const taxonomic = new Set(VERIFIED_PLACEMENTS.map((one) => normalizeName(one.name)));
    const content = new Set(CONTENT_EXCLUSIONS.map((one) => normalizeName(one.name)));

    let seen = 0;
    for (const { herbId, scope } of allScopes()) {
      if (scope.type !== 'genus') continue;
      for (const name of scope.excluded ?? []) {
        seen += 1;
        const key = normalizeName(name);
        const inTaxonomic = taxonomic.has(key);
        const inContent = content.has(key);
        expect(
          Number(inTaxonomic) + Number(inContent),
          `${herbId} excludes ${name} with ${inTaxonomic && inContent ? 'TWO reasons' : 'no recorded reason'}`,
        ).toBe(1);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('points every content exclusion at the card it actually narrows', () => {
    for (const one of CONTENT_EXCLUSIONS) {
      const scope = scopeFor(one.cardId);
      expect(scope?.type, one.cardId).toBe('genus');
      const excluded = (scope?.type === 'genus' ? (scope.excluded ?? []) : []).map(normalizeName);
      expect(excluded, `${one.cardId} does not exclude ${one.name}`).toContain(
        normalizeName(one.name),
      );
      expect(one.source).toMatch(/^https?:\/\//);
      expect(one.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(one.failingClaims.length, one.name).toBeGreaterThan(0);
      // An empty human-evidence field is a real answer and must be WRITTEN, never left blank:
      // "nothing is established in humans" is the sentence a reader needs most.
      expect(one.humanEvidence.length, one.name).toBeGreaterThan(20);
      expect(one.animalEvidence.length, one.name).toBeGreaterThan(10);
      expect(one.whyNotACaution.length, one.name).toBeGreaterThan(20);
    }
  });

  it('every row carries provenance that can be re-checked', () => {
    for (const placement of VERIFIED_PLACEMENTS) {
      expect(placement.source, placement.name).toMatch(/^https?:\/\//);
      // A backbone moves. A row with no date cannot be aged, and an undated claim is the
      // thing this file exists to replace.
      expect(placement.checkedOn, placement.name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(placement.means.length, placement.name).toBeGreaterThan(3);
      expect(placement.concern.length, placement.name).toBeGreaterThan(10);
      expect(placement.queriedGenus).toBe(placement.queriedGenus.toLowerCase());
      expect(placement.acceptedGenus).toBe(placement.acceptedGenus.toLowerCase());
    }
  });

  /*
   * EVIDENCE, NOT RUNTIME DATA. The exclusions are spelled out in `card-coverage.ts` where a
   * reader of the scope sees them; deriving them from this table would move the decision into
   * a file the matcher does not read, and make a deploy depend on a review artefact.
   */
  it('is imported by tests only, never by the app', () => {
    const importers = readdirSync(LIB)
      .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
      .filter((name) => readFileSync(join(LIB, name), 'utf8').includes("from './taxon-placements'"));
    expect(importers).toEqual([]);
  });
});

describe('excluded names, taxonomic and content alike', () => {
  // Both kinds must behave identically once excluded: the REASON differs, the consequence
  // must not. A content exclusion that still paid XP would be the worse bug of the two.
  const EXCLUDED = [
    ...outOfGenusPlacements().map((one) => ({ name: one.name })),
    ...CONTENT_EXCLUSIONS.map((one) => ({ name: one.name })),
  ];

  it('award no card: not confirmable, no herbId, outcome is noMatch', () => {
    for (const { name } of EXCLUDED) {
      const match = matchScientificName(name);
      expect(match.confirmable, name).toBe(false);
      expect(match.herbId, name).toBeUndefined();
      expect(match.kind, name).toBe('none');
      expect(match.eligibility, name).toBe('none');
      // There is nothing to offer, and `relatedOnly` would still put the card on screen.
      expect(
        outcomeFor([{ scientificName: name, score: 0.99, match }]),
        name,
      ).toBe('noMatch');
    }
  });

  it('award no XP, no mastery and no card achievement progress', () => {
    for (const { name } of EXCLUDED) {
      const match = matchScientificName(name);
      // A discovery cannot even be attempted without an id, which is the structural half.
      expect(match.herbId).toBeUndefined();

      // And the belt-and-braces half: feeding the raw name through the reducer as if some
      // future caller tried changes nothing, so no ledger this name touches can pay.
      const before: HerbdexState = emptyState();
      const { state, result } = applyDiscovery(before, name);
      expect(state.discoveries, name).toEqual({});
      expect(result.awarded, name).toBe(false);
      expect(result.xpAwarded, name).toBe(0);
      expect(result.newAchievementIds, name).toEqual([]);
      expect(progressFromState(state).xp, name).toBe(0);
      expect(Object.keys(state.mastered), name).toEqual([]);
      expect(state.achievements, name).toEqual(before.achievements);
      // Idempotent transitions return the SAME object when nothing was recorded, which is
      // the structural half of "this cannot pay" rather than a value that happens to be 0.
      expect(state, name).toBe(before);
    }
  });

  it('preserve the observed taxon exactly as the provider returned it', () => {
    for (const { name } of EXCLUDED) {
      const match = matchScientificName(name);
      expect(match.observedTaxon?.providerName, name).toBe(name);
      expect(match.observedTaxon?.name, name).toBe(name);
      expect(match.observedTaxon?.rank, name).toBe('species');
    }
  });

  it('remain ordinary off-card observations, eligible for the Seed Shelf', () => {
    // Excluding a name from a card must not delete the observation. The shelf is where a
    // real species with no card belongs, and it carries no card content — see
    // `seed-shelf-does-not-surface-card-content` below.
    for (const { name } of EXCLUDED) {
      expect(isShelfEligible(name), name).toBe(true);
    }
  });
});

describe('legitimate members of the same genera are unaffected', () => {
  const STILL_UNLOCKS: readonly [string, string][] = [
    ['Rhus typhina', 'rhus-spp'],
    ['Rhus glabra', 'rhus-spp'],
    ['Rhus aromatica', 'rhus-spp'],
    ['Rhus copallinum', 'rhus-spp'],
    ['Rhus coriaria', 'rhus-spp'],
    // Bare genus on a card that PRINTS `spp.` is the card's own declared scope.
    ['Rhus', 'rhus-spp'],
    ['Sambucus nigra', 'sambucus-spp'],
    ['Sambucus canadensis', 'sambucus-spp'],
    // Deliberately still unlocking: a real elderberry with a real food use. It carries the
    // raw-berry caution on card #31 instead of losing the card.
    ['Sambucus racemosa', 'sambucus-spp'],
    ['Sambucus', 'sambucus-spp'],
    ['Morus alba', 'morus-spp'],
    ['Morus rubra', 'morus-spp'],
    ['Morus', 'morus-spp'],
    ['Quercus alba', 'quercus-spp'],
    ['Quercus rubra', 'quercus-spp'],
    ['Quercus', 'quercus-spp'],
  ];

  it('still unlock their genus card with eligibility genusCard', () => {
    for (const [name, herbId] of STILL_UNLOCKS) {
      const match = matchScientificName(name);
      expect(match.confirmable, name).toBe(true);
      expect(match.herbId, name).toBe(herbId);
      expect(match.eligibility, name).toBe('genusCard');
    }
  });

  it('are not shelf-eligible, because Plantdex has a card for them', () => {
    for (const [name] of STILL_UNLOCKS) {
      // `isShelfEligible` takes the NAME, not a match — a bare genus is refused by its own
      // rule (a genus does not identify a species), so `Rhus` is ineligible for a second,
      // independent reason and is skipped rather than asserted on the wrong one.
      if (!name.includes(' ')) continue;
      expect(isShelfEligible(name), name).toBe(false);
    }
  });
});

describe('Oxalis europaea is a synonym of the Wood Sorrel anchor', () => {
  it('unlocks the card as `synonym`, not as a curated equivalent', () => {
    const match = matchScientificName('Oxalis europaea');
    expect(match.herbId).toBe('oxalis-stricta');
    expect(match.confirmable).toBe(true);
    /*
     * THE SPLIT HAS HAPPENED. This assertion read `exact` with a comment saying it was the row
     * that would become `synonym` once the two were separated — and it is. The important half
     * never moved: it must not be `acceptedGroup` or `curatedEquivalent`, either of which
     * would assert a SECOND SPECIES where there is one plant under two names.
     *
     * The card's scope is still `species`. A synonym reaches the anchor through the name
     * table and never widens the card, which is why Wood Sorrel appears in no scope audit.
     */
    expect(match.eligibility).toBe('synonym');
    expect(scopeFor('oxalis-stricta')?.type).toBe('species');
  });

  it('records the name the provider used, not the anchor', () => {
    expect(matchScientificName('Oxalis europaea').observedTaxon?.name).toBe('Oxalis europaea');
  });

  it('leaves the accepted Oxalis species it was proposed beside unconfirmable', () => {
    // Both are GBIF-ACCEPTED species in their own right, so neither is a synonym of anything
    // here. They stay candidates for the seven-criterion review, not consequences of this fix.
    for (const name of ['Oxalis dillenii', 'Oxalis corniculata']) {
      expect(matchScientificName(name).confirmable, name).toBe(false);
    }
  });
});
