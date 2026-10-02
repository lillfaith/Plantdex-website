import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { scopeFor } from './card-coverage';
import { applyDiscovery } from './herbdex-reducer';
import { emptyState } from './herbdex-state';
import { matchScientificName, outcomeFor } from './plant-match';
import { progressFromState } from './progression';
import { isShelfEligible } from './seed-shelf';

const CARD = 'solidago-canadensis';

describe('the Goldenrod card concept', () => {
  it('is a curated equivalent group, no longer a pending genus override', () => {
    const scope = scopeFor(CARD);
    expect(scope?.type).toBe('acceptedGroup');
    if (scope?.type !== 'acceptedGroup') return;
    expect(scope.accepted).toHaveLength(1);
    const [member] = scope.accepted;
    expect(member!.scientificName).toBe('Solidago gigantea');
    expect(member!.basis).toBe('curatedEquivalent');
  });

  it('carries all seven evidence criteria, each with something in it', () => {
    const scope = scopeFor(CARD);
    if (scope?.type !== 'acceptedGroup') throw new Error('scope changed');
    const member = scope.accepted[0]!;
    if (member.basis !== 'curatedEquivalent') throw new Error('basis changed');
    expect(member.source).toMatch(/^https?:\/\//);
    for (const [key, value] of Object.entries(member.evidence)) {
      // Long enough to be an argument rather than a word. The type makes the FIELD
      // unskippable; this makes the ANSWER unskippable.
      expect(value.length, key).toBeGreaterThan(40);
    }
    /*
     * THE PRECEDENT IS PHARMACOPOEIAL, AND THE RECORD MUST SAY SO. If this ever reduced to
     * "they look alike" or "the provider confuses them", the entry would have become the
     * thing the whole architecture refuses — so the reason is pinned, not just its length.
     */
    expect(member.evidence.traditionalUse).toMatch(/Solidaginis herba/i);
    expect(member.note).toMatch(/pharmacopoeia/i);
  });

  it('unlocks the card for S. gigantea as a curated equivalent', () => {
    const match = matchScientificName('Solidago gigantea');
    expect(match.herbId).toBe(CARD);
    expect(match.confirmable).toBe(true);
    expect(match.eligibility).toBe('curatedEquivalent');
    // NOT rewritten to the anchor. This is the original bug, asserted directly.
    expect(match.observedTaxon?.name).toBe('Solidago gigantea');
    expect(match.observedTaxon?.providerName).toBe('Solidago gigantea');
    expect(outcomeFor([{ scientificName: 'Solidago gigantea', score: 0.35, match }])).toBe(
      'matched',
    );
  });

  it('keeps the anchor exact, and the equivalent distinct from it', () => {
    const anchor = matchScientificName('Solidago canadensis');
    expect(anchor.eligibility).toBe('exact');
    expect(anchor.observedTaxon?.name).toBe('Solidago canadensis');
  });

  it('makes every former legacyGenus Solidago non-confirmable', () => {
    for (const name of [
      'Solidago altissima', // insufficient evidence
      'Solidago virgaurea', // a separate herbal drug
      'Solidago rugosa', // subsect. Venosae
      'Solidago juncea', // subsect. Junceae
      'Solidago caesia', // the original false unlock
      'Solidago nemoralis',
      'Solidago', // bare genus resolves no species
    ]) {
      const match = matchScientificName(name);
      expect(match.confirmable, name).toBe(false);
      expect(match.eligibility, name).not.toBe('curatedEquivalent');
      expect(match.eligibility, name).not.toBe('legacyGenus');
      expect(match.observedTaxon?.name, name).toBe(name);
    }
  });

  it('issues legacyGenus nowhere, on any name, for any card', () => {
    /*
     * Goldenrod was the only card that could produce it, so with its override gone the value
     * is unreachable. It stays in `ELIGIBILITIES` and in the CHECK because STORED SIGHTINGS
     * CARRY IT — readable forever, never newly issued.
     */
    for (const name of [
      'Solidago gigantea',
      'Solidago altissima',
      'Rhus typhina',
      'Taraxacum sect. Taraxacum',
      'Quercus alba',
    ]) {
      expect(matchScientificName(name).eligibility, name).not.toBe('legacyGenus');
    }
  });

  it('pays nothing for a non-confirmable Solidago, and shelves it instead', () => {
    for (const name of ['Solidago altissima', 'Solidago rugosa']) {
      const before = emptyState();
      const { state, result } = applyDiscovery(before, name);
      expect(state, name).toBe(before);
      expect(result.awarded, name).toBe(false);
      expect(progressFromState(state).xp, name).toBe(0);
      // A real species with no card is exactly what the shelf is for.
      expect(isShelfEligible(name), name).toBe(true);
    }
  });

  it('is not shelf-eligible for the species that DO unlock it', () => {
    for (const name of ['Solidago canadensis', 'Solidago gigantea']) {
      expect(isShelfEligible(name), name).toBe(false);
    }
  });

  /*
   * THE DOCUMENTED SPECIMEN, REPLAYED. These are the exact candidate lists PlantNet returned
   * for iNaturalist observation 132077681 — a research-grade *Solidago canadensis* — recorded
   * in `docs/field-validation-internet-set.md` and reproduced here as data rather than re-run
   * as a request. It costs nothing and it answers the one question that matters after a
   * narrowing: does the real specimen still unlock the card, and for the RIGHT reason?
   *
   * Note the provider never led with the card's own species. Under the old genus override the
   * card opened via `legacyGenus` from whichever Solidago came first; now it opens because
   * *S. gigantea* is a researched equivalent, and the three species below it stop opening it
   * at all. The outcome is identical and the REASON is not, which is the whole change.
   */
  it('still unlocks for the benchmark specimen, now via curatedEquivalent', () => {
    const RECORDED: Record<string, readonly [string, number][]> = {
      p1: [
        ['Solidago gigantea', 0.318],
        ['Solidago canadensis', 0.203],
        ['Solidago rugosa', 0.184],
        ['Solidago juncea', 0.1],
        ['Solidago altissima', 0.016],
      ],
      p2: [
        ['Solidago gigantea', 0.236],
        ['Solidago canadensis', 0.15],
        ['Solidago rugosa', 0.136],
        ['Solidago juncea', 0.074],
        ['Euthamia graminifolia', 0.053],
      ],
      p3auto: [
        ['Solidago gigantea', 0.354],
        ['Solidago canadensis', 0.167],
        ['Solidago rugosa', 0.115],
        ['Solidago juncea', 0.062],
        ['Euthamia graminifolia', 0.045],
      ],
    };

    for (const [condition, rows] of Object.entries(RECORDED)) {
      const candidates = rows.map(([scientificName, score]) => ({
        scientificName,
        score,
        match: matchScientificName(scientificName),
      }));

      // The card still opens, from the provider's own leading answer.
      expect(outcomeFor(candidates), condition).toBe('matched');
      const leader = candidates[0]!;
      expect(leader.match.herbId, condition).toBe(CARD);
      expect(leader.match.eligibility, condition).toBe('curatedEquivalent');
      expect(leader.match.observedTaxon?.name, condition).toBe('Solidago gigantea');

      // And the species that used to ride in on the override no longer do.
      for (const one of candidates.slice(2)) {
        expect(one.match.confirmable, `${condition}: ${one.scientificName}`).toBe(false);
      }
    }
  });

  it('shows the equivalent-species notice, and only for this basis', () => {
    const notice = readFileSync('src/components/EquivalentSpeciesNotice.tsx', 'utf8');
    expect(notice).toMatch(/these are different species/i);

    const panel = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8');
    // Gated on the basis itself, so no other unlock can surface it.
    expect(panel).toContain("eligibility === 'curatedEquivalent'");
    const outcome = readFileSync('src/components/scan/ScanOutcome.tsx', 'utf8');
    expect(outcome).toContain('EquivalentSpeciesNotice');
  });
});
