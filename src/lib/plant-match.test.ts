import { describe, expect, it } from 'vitest';
import { HERBS, getHerb } from './deck';
import {
  confidenceBand,
  genusOf,
  matchScientificName,
  normalizeName,
  outcomeFor,
  type ScanCandidate,
} from './plant-match';

const candidate = (scientificName: string, score: number): ScanCandidate => ({
  scientificName,
  score,
  match: matchScientificName(scientificName),
});

describe('normalizeName', () => {
  it('strips authorship, ranks and hybrid markers down to a binomial', () => {
    /*
     * Every one of these is a real shape a provider returns. If any of them failed to
     * collapse onto the plain binomial the scanner would report "not in the deck" for a
     * plant that IS in the deck — a parsing bug wearing the costume of an honest answer.
     */
    expect(normalizeName('Taraxacum officinale F.H.Wigg.')).toBe('taraxacum officinale');
    expect(normalizeName('Achillea millefolium subsp. millefolium')).toBe('achillea millefolium');
    expect(normalizeName('Achillea millefolium var. occidentalis')).toBe('achillea millefolium');
    expect(normalizeName('Mentha × piperita')).toBe('mentha piperita');
    expect(normalizeName('  Urtica   dioica  ')).toBe('urtica dioica');
    expect(normalizeName('Urtica dioica L.')).toBe('urtica dioica');
  });

  it('reduces a bare genus to the genus', () => {
    expect(normalizeName('Quercus spp.')).toBe('quercus');
    expect(normalizeName('Quercus')).toBe('quercus');
    expect(genusOf('Quercus robur L.')).toBe('quercus');
  });

  it('returns nothing useful for nothing useful', () => {
    expect(normalizeName('')).toBe('');
    expect(matchScientificName('').kind).toBe('none');
    expect(matchScientificName('   ').kind).toBe('none');
  });
});

describe('matchScientificName', () => {
  it('matches every card in the deck to itself', () => {
    /*
     * The strongest guarantee available: whatever the provider returns, if it names a species
     * this deck prints, it resolves to that card. Run across all 45 so a future card with an
     * unusual name cannot quietly become unmatchable.
     */
    for (const herb of HERBS) {
      const match = matchScientificName(herb.scientificName);
      expect(match.herbId, `${herb.scientificName} did not match its own card`).toBe(herb.id);
      expect(match.confirmable, `${herb.id} should be confirmable`).toBe(true);
    }
  });

  it('treats a species inside a genus card as a real match', () => {
    // The "Quercus spp." card is ABOUT the genus, so an English oak is that card — not a
    // weaker approximation of it.
    const match = matchScientificName('Quercus robur');
    expect(match.kind).toBe('genusCard');
    expect(match.herbId).toBe('quercus-spp');
    expect(match.confirmable).toBe(true);
  });

  it('refuses to confirm a different species in a genus the deck covers by species', () => {
    /*
     * THE TEST THAT MATTERS FOR HONESTY.
     *
     * The Dandelion card is Taraxacum officinale. A red-seeded dandelion is a different
     * species, and letting a player log it as a Dandelion discovery would write something
     * untrue into their own collection — quietly, and permanently, since discoveries are
     * never revoked.
     */
    const match = matchScientificName('Taraxacum erythrospermum');
    expect(match.kind).toBe('sameGenus');
    expect(match.herbId).toBe('taraxacum-officinale');
    expect(match.confirmable, 'a related species must never be confirmable').toBe(false);
  });

  it('returns no match for a plant the deck does not cover', () => {
    // The common case: 45 cards out of a world of species.
    for (const name of ['Monstera deliciosa', 'Ginkgo biloba', 'Zea mays', 'Not A Plant']) {
      expect(matchScientificName(name).kind, name).toBe('none');
      expect(matchScientificName(name).herbId).toBeUndefined();
    }
  });

  it('never returns a herbId that is not in the deck', () => {
    for (const name of ['Quercus robur', 'Taraxacum erythrospermum', 'Urtica dioica L.']) {
      const { herbId } = matchScientificName(name);
      if (herbId) expect(getHerb(herbId), `${name} -> unknown id ${herbId}`).toBeDefined();
    }
  });
});

describe('outcomeFor', () => {
  it('reports a match when something confirmable clears the bar', () => {
    expect(outcomeFor([candidate('Urtica dioica', 0.91)])).toBe('matched');
  });

  it('reports uncertain rather than pretending, when scores are low', () => {
    /*
     * Uncertain is a first-class state, not a degraded match. A ranked list with nothing
     * highlighted is the honest rendering of "the provider is guessing".
     */
    expect(outcomeFor([candidate('Urtica dioica', 0.12), candidate('Quercus robur', 0.08)])).toBe(
      'uncertain',
    );
  });

  it('reports no match when nothing maps to a confirmable card', () => {
    // Including when a same-genus relative scores highly — related is not the same plant.
    expect(outcomeFor([candidate('Monstera deliciosa', 0.99)])).toBe('noMatch');
    expect(outcomeFor([candidate('Taraxacum erythrospermum', 0.97)])).toBe('noMatch');
    expect(outcomeFor([])).toBe('noMatch');
  });
});

describe('confidenceBand', () => {
  it('bands scores without ever reaching certainty', () => {
    expect(confidenceBand(0.95)).toBe('strong');
    expect(confidenceBand(0.5)).toBe('moderate');
    expect(confidenceBand(0.05)).toBe('weak');
    // There is no 'certain' band, and there must not be one: the provider is guessing from
    // pixels, and a label that says otherwise would be the single most dangerous word here.
    expect(['strong', 'moderate', 'weak']).toContain(confidenceBand(1));
  });
});
