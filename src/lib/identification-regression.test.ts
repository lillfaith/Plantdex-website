import { describe, expect, it } from 'vitest';
import { CATALOGUE } from './catalogue';
import { matchScientificName, speciesConfidenceFor, taxonRank, type ScanCandidate } from './plant-match';

/**
 * THE CASES A UI PASS COULD QUIETLY UNDO.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `plant-match.test.ts`, `card-coverage.test.ts` and `observed-taxon.test.ts` already pin the
 * MATCHER. This file pins the property the PRESENTATION depends on, because that is where the
 * regression would come from: a row that keys on `match.herbId` rather than
 * `match.confirmable` looks correct in every screenshot and re-opens the exact hole the
 * Taraxacum work closed.
 *
 * The trap is specific and is asserted below: a refused section still CARRIES a herbId — it
 * resolves to the Dandelion card as the deck's nearest relative — so "has a card" and "may be
 * logged as that card" are two different questions, and only one of them is `confirmable`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const candidate = (scientificName: string, score = 0.4): ScanCandidate => ({
  scientificName,
  score,
  match: matchScientificName(scientificName),
});

describe('a card-bearing candidate is not the same as a loggable one', () => {
  it('gives the refused Taraxacum section a card id and refuses it anyway', () => {
    /*
     * THE REGRESSION IN ONE ASSERTION. `herbId` is truthy here. Any surface that offers a
     * confirm because a card resolved — rather than because the MATCH is confirmable — hands
     * `Taraxacum sect. Erythrosperma` the Dandelion card, which is what the live site does
     * today and what this branch exists to stop.
     */
    const refused = candidate('Taraxacum sect. Erythrosperma');
    expect(refused.match.herbId, 'the nearest card still resolves').toBe('taraxacum-officinale');
    expect(refused.match.confirmable, 'a refused section became loggable').toBe(false);
    expect(refused.match.kind).toBe('sameGenus');
    expect(refused.match.eligibility).not.toBe('exact');
  });

  it('holds across every catalogue card: a relative is loggable only through a DECLARED scope', () => {
    /*
     * Swept rather than sampled. The first draft of this asserted that no invented relative
     * is ever confirmable, and it failed on `Solidago plantdexia` — correctly. Two scopes
     * legitimately accept a relative: a `spp.` GENUS CARD, whose stated scope is the genus,
     * and Goldenrod's `pendingCuration`, which holds genus-wide behaviour TEMPORARILY while
     * the accepted list is researched and is tagged `legacyGenus` precisely so those rows
     * stay findable.
     *
     * So the invariant is not "never confirmable" — it is that a relative is confirmable ONLY
     * through a scope somebody declared, and never as `exact`. That is the property a UI pass
     * could undo, and it is stronger than the sweep I first wrote.
     */
    const declared = new Set(['genusCard', 'legacyGenus']);
    let carded = 0;
    let accepted = 0;
    for (const herb of CATALOGUE) {
      const genus = herb.scientificName.split(' ')[0]!;
      const invented = `${genus} plantdexia`; // a relative the deck does not carry
      const m = matchScientificName(invented);
      if (!m.herbId) continue;
      carded += 1;
      expect(m.eligibility, `${invented} was accepted as an exact match`).not.toBe('exact');
      if (m.confirmable) {
        accepted += 1;
        expect(declared.has(m.eligibility), `${invented} is loggable with no declared scope`).toBe(true);
      }
    }
    expect(carded, 'the sweep found no card-bearing relatives to test').toBeGreaterThan(20);
    // The declared scopes are a small, deliberate set — not most of the deck.
    expect(accepted).toBeLessThan(carded / 2);
  });

});

describe('rank decides before the score does', () => {
  it('reports the rank a name claims rather than assuming species', () => {
    expect(taxonRank('Taraxacum sect. Erythrosperma')).toBe('section');
    expect(taxonRank('Plantago major subsp. intermedia')).toBe('subspecies');
    expect(taxonRank('Taraxacum officinale')).toBe('species');
  });

  it('refuses a species-level confidence above species, at any score', () => {
    for (const score of [0.01, 0.35, 0.7, 0.99]) {
      expect(speciesConfidenceFor('section', score), `section at ${score}`).toBe('unresolved');
      expect(speciesConfidenceFor('genus', score), `genus at ${score}`).toBe('unresolved');
    }
    // At or below species the rank resolves, so the band is the score's to decide.
    expect(speciesConfidenceFor('species', 0.99)).toBe('high');
    expect(speciesConfidenceFor('species', 0.01)).toBe('low');
  });

  it('keeps a subspecies loggable, which is the mirror bug', () => {
    /*
     * Refusing everything unusual would throw away a MORE precise identification for being
     * unusual. Below species still resolves which species it is.
     */
    const sub = candidate('Plantago major subsp. intermedia');
    expect(sub.match.confirmable).toBe(true);
    expect(sub.match.herbId).toBe('plantago-major');
  });
});

describe('the curated Taraxacum scope still works', () => {
  it('accepts the two names for the card’s own section and nothing else', () => {
    for (const name of ['Taraxacum sect. Taraxacum', 'Taraxacum sect. Ruderalia']) {
      const m = matchScientificName(name);
      expect(m.confirmable, `${name} stopped being accepted`).toBe(true);
      expect(m.herbId).toBe('taraxacum-officinale');
      expect(m.kind).toBe('acceptedScope');
    }
    expect(matchScientificName('Taraxacum officinale').kind).toBe('exact');
  });

  it('keeps each section a distinct key, which is what the collapse broke', () => {
    const keys = new Set(
      ['Taraxacum sect. Taraxacum', 'Taraxacum sect. Ruderalia', 'Taraxacum sect. Erythrosperma']
        .map((n) => matchScientificName(n).observedTaxon?.key),
    );
    expect(keys.size, 'two sections collapsed onto one key again').toBe(3);
  });

  it('never rewrites the observation to the card’s own binomial', () => {
    // The card is recorded in `herbId`; what the provider said stays in `observedTaxon`.
    const m = matchScientificName('Taraxacum sect. Taraxacum');
    expect(m.observedTaxon?.name).toContain('sect.');
    expect(m.observedTaxon?.name).not.toBe('Taraxacum officinale');
    expect(m.observedTaxon?.rank).toBe('section');
  });
});

describe('sameGenus stays a relative', () => {
  it('is never confirmable and never exact, across a realistic spread', () => {
    for (const name of [
      'Oxalis grandis',
      'Oxalis dillenii',
      'Rumex crispus',
      'Sambucus racemosa',
      'Hamamelis mollis',
    ]) {
      const m = matchScientificName(name);
      if (m.kind !== 'sameGenus') continue;
      expect(m.confirmable, `${name} became loggable`).toBe(false);
      expect(m.eligibility).toBe('related');
    }
  });
});
