import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ambiguousCardNames, genusLabel } from './scan-ambiguity';
import { matchScientificName, type ScanCandidate } from './plant-match';
import { PRINTED_CARDS, getPrintedCard } from './deck';

const PANEL = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8');

/** A candidate as the scan list receives it: provider name and score, matched by the matcher. */
function candidate(scientificName: string, score: number): ScanCandidate {
  return { scientificName, score, match: matchScientificName(scientificName) };
}

const nameOf = (id: string | undefined) => (id ? getPrintedCard(id)?.commonName : undefined);

describe('same-common-name scan candidates', () => {
  /*
   * THE DECK IS WHY THIS EXISTS. Nine cards name a genus rather than a species, and
   * `matchScientificName` maps every species in such a genus onto that one card,
   * confirmably — so a provider returning several Sambucus species produces several rows
   * that all print "Elderberry". Asserted from the real deck rather than assumed, because
   * the day a `spp.` card becomes a species card this test should start explaining itself.
   */
  it('still has genus cards, which is the condition this handles', () => {
    const genusCards = PRINTED_CARDS.filter((herb) => /\bspp?\.?$/i.test(herb.scientificName));
    expect(genusCards.length).toBeGreaterThan(0);
    expect(genusCards.map((herb) => herb.commonName)).toContain('Elderberry');
  });

  it('1. flags two Elderberry candidates with different species', () => {
    const result = ambiguousCardNames([
      candidate('Sambucus canadensis', 0.82),
      candidate('Sambucus nigra', 0.61),
    ]);
    expect(result.has('Elderberry')).toBe(true);
  });

  it('2. flags three same-name candidates', () => {
    const three = [
      candidate('Quercus alba', 0.7),
      candidate('Quercus rubra', 0.5),
      candidate('Quercus palustris', 0.3),
    ];
    expect(three.every((one) => nameOf(one.match.herbId) === 'Oak')).toBe(true);
    expect(ambiguousCardNames(three).has('Oak')).toBe(true);
  });

  it('3. leaves a name alone when only one visible row prints it', () => {
    /*
     * One carded candidate and one with no card at all. The uncarded row is dropped by the
     * list's `!herb` guard, so "Dandelion" is printed once and must stay compact — counting
     * raw candidates instead of visible rows is the bug this pins.
     */
    const mixed = [candidate('Taraxacum officinale', 0.9), candidate('Zamia integrifolia', 0.4)];
    expect(mixed[1]!.match.herbId).toBeUndefined();
    expect(ambiguousCardNames(mixed).size).toBe(0);
  });

  it('4. flags synonym variants of one species, which the provider sends as separate rows', () => {
    /*
     * NOT DEDUPED, DELIBERATELY. Two spellings of the same plant are two rows the provider
     * ranked separately, and collapsing them would be editing its result set — out of scope
     * and not ours to do. What the treatment guarantees is that they stop being
     * INDISTINGUISHABLE: each row prints the name the provider actually returned.
     */
    const variants = [
      candidate('Sambucus canadensis', 0.8),
      candidate('Sambucus nigra subsp. canadensis', 0.4),
    ];
    expect(variants.every((one) => nameOf(one.match.herbId) === 'Elderberry')).toBe(true);
    expect(ambiguousCardNames(variants).has('Elderberry')).toBe(true);
    expect(new Set(variants.map((one) => one.scientificName)).size).toBe(2);
  });

  it('5. flags nothing when every common name is unique', () => {
    const unique = [
      candidate('Taraxacum officinale', 0.9),
      candidate('Urtica dioica', 0.6),
      candidate('Trifolium pratense', 0.3),
    ];
    expect(new Set(unique.map((one) => nameOf(one.match.herbId))).size).toBe(3);
    expect(ambiguousCardNames(unique).size).toBe(0);
  });

  it('6. never depends on the provider common name, which may be absent', () => {
    // The row prints the CARD's name, which always exists, so a candidate with no friendly
    // name cannot render blank — and cannot make a name ambiguous by being absent either.
    const anonymous = [candidate('Sambucus canadensis', 0.8), candidate('Sambucus nigra', 0.5)];
    expect(anonymous.every((one) => one.commonName === undefined)).toBe(true);
    expect(ambiguousCardNames(anonymous).has('Elderberry')).toBe(true);
    expect(PANEL).not.toContain('candidate.commonName');
  });

  it('flags a sameGenus pair, which collapses to one card without being confirmable', () => {
    // Two Rumex species both resolve to relatedHerbIds[0], so both rows head themselves with
    // the same card. No confirm button on either, so only the naming half applies.
    const rumex = [candidate('Rumex crispus', 0.6), candidate('Rumex sanguineus', 0.4)];
    expect(rumex.every((one) => one.match.kind === 'sameGenus')).toBe(true);
    expect(rumex.every((one) => one.match.confirmable)).toBe(false);
    expect(ambiguousCardNames(rumex).size).toBe(1);
  });

  it('capitalises the genus for prose', () => {
    expect(genusLabel('Sambucus spp.')).toBe('Sambucus');
    expect(genusLabel('Quercus spp.')).toBe('Quercus');
  });
});

describe('what the scan list does with an ambiguous name', () => {
  it('gives the two buttons different words', () => {
    expect(PANEL).toContain('`Confirm ${candidate.scientificName}`');
    expect(PANEL).toContain('`Yes, I found ${herb.commonName}`');
  });

  it('keeps the confidence score on every row, ambiguous or not', () => {
    // The score is rendered outside both branches; a treatment that hid it would be trading
    // one missing fact for another.
    expect(PANEL).toContain('{Math.round(candidate.score * 100)}% &middot; {band}');
  });

  it('never claims the card IS the species', () => {
    /*
     * "Matches the X card" is a statement about the mapping, which is deterministic.
     * "This is your X card" would be a statement about the photograph, which nothing here
     * can support — the score and the unconditional caution carry that uncertainty.
     */
    expect(PANEL).toContain('Matches the ${herb.commonName} card');
    expect(PANEL).not.toMatch(/This is your \$\{herb\.commonName\}/);
    expect(PANEL).not.toMatch(/You found \$\{candidate\.scientificName\}/);
  });

  it('computes the set once for the list rather than per row', () => {
    expect(PANEL).toContain('ambiguousCardNames(result.candidates)');
    expect(PANEL.match(/ambiguousCardNames\(/g)).toHaveLength(1);
  });
});
