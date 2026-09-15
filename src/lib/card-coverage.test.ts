import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRINTED_CARDS } from './deck';
import { CARD_COVERAGE, allScopes, broadenedCards } from './card-coverage';
import { genusOf, matchScientificName } from './plant-match';

/**
 * TAXONOMIC COVERAGE, PER CARD.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A real goldenrod photograph returned S. altissima at 56% and S. canadensis at 12%, and
 * the app offered the 12% one while refusing the 56%. Card #3 prints `Solidago canadensis`,
 * so the matcher was right and the data was narrower than the card means.
 *
 * The fix is per-card scope, not a global "same genus is fine" rule — which would be
 * actively worse, because two printed cards share the genus *Rumex* and a blanket rule
 * would make every dock claimable as either. Most of this file exists to keep broadening
 * from leaking past the one card the owner widened.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe('every printed card has exactly one declared scope', () => {
  it('classifies all 45, with no card left undefined', () => {
    const scopes = allScopes();
    expect(scopes).toHaveLength(PRINTED_CARDS.length);
    expect(PRINTED_CARDS).toHaveLength(45);
    for (const { herbId, scope } of scopes) {
      expect(scope, herbId).toBeDefined();
      expect(['species', 'genus', 'custom']).toContain(scope.type);
    }
  });

  it('defaults to species, so a forgotten card cannot be silently widened', () => {
    /*
     * The safety property of the whole design. An unlisted card is `species` — its own
     * binomial and the checked synonyms, nothing else — so broadening is always a
     * deliberate, reviewable edit rather than something that happens by omission.
     */
    const broad = broadenedCards().map((one) => one.herbId);
    const printedSpp = PRINTED_CARDS.filter((herb) => /\bspp?\.?$/i.test(herb.scientificName));
    // Exactly the nine cards that say `Genus spp.` on their face, plus the explicit overrides.
    expect(new Set(broad)).toEqual(
      new Set([...printedSpp.map((h) => h.id), ...Object.keys(CARD_COVERAGE)]),
    );
  });

  it('keeps the `spp.` cards out of the override table', () => {
    // Their scope is printed on the card. Repeating it here would be two sources for one
    // fact, free to disagree the day somebody edits one of them.
    for (const herb of PRINTED_CARDS.filter((h) => /\bspp?\.?$/i.test(h.scientificName))) {
      expect(CARD_COVERAGE[herb.id], `${herb.id} restates its printed scope`).toBeUndefined();
    }
  });

  it('names only real printed cards in the override table', () => {
    const ids = new Set(PRINTED_CARDS.map((herb) => herb.id));
    for (const id of Object.keys(CARD_COVERAGE)) expect(ids.has(id), id).toBe(true);
  });
});

describe('no species may be claimed by two cards', () => {
  it('has no two broadened cards overlapping on a genus', () => {
    /*
     * THE COLLISION GUARD, AND IT IS A BUILD FAILURE RATHER THAN A RUNTIME TIE-BREAK.
     *
     * If two cards ever declare overlapping scope, `matchScientificName` returns `ambiguous`
     * and refuses — correct behaviour, and a state no player should ever reach, because it
     * means the classification is wrong. Catching it here is what keeps that branch
     * unreachable in practice.
     */
    const byGenus = new Map<string, string[]>();
    for (const { herbId, scientificName, scope } of broadenedCards()) {
      if (scope.type !== 'genus') continue;
      const genus = genusOf(scientificName);
      byGenus.set(genus, [...(byGenus.get(genus) ?? []), herbId]);
    }
    for (const [genus, ids] of byGenus) {
      expect(ids, `genus "${genus}" is claimed by ${ids.length} cards`).toHaveLength(1);
    }
  });

  it('never lets broad coverage swallow a card that names the species outright', () => {
    /*
     * Specificity wins, always. An exact binomial resolves before scope is consulted, so a
     * card printing a species can never be outranked by a broader card containing it. This
     * is what would keep #2 Broadleaf Dock and #19 Sheep's Sorrel intact if either were
     * widened, and it is why widening is safe to consider card by card.
     */
    for (const herb of PRINTED_CARDS) {
      const match = matchScientificName(herb.scientificName);
      expect(match.herbId, herb.scientificName).toBe(herb.id);
      expect(match.confirmable, herb.scientificName).toBe(true);
    }
  });

  it('keeps the two Rumex cards separate and refuses a third dock', () => {
    // The deck's only shared genus, and the standing proof that genus cannot be global.
    expect(matchScientificName('Rumex obtusifolius').herbId).toBe('rumex-obtusifolius');
    expect(matchScientificName('Rumex acetosella').herbId).toBe('rumex-acetosella');
    const crispus = matchScientificName('Rumex crispus');
    expect(crispus.kind).toBe('sameGenus');
    expect(crispus.confirmable).toBe(false);
  });
});

describe('the goldenrod case, which is what this was built for', () => {
  const GOLDENROD = 'solidago-canadensis';

  it('accepts every Solidago the real scan returned', () => {
    for (const name of [
      'Solidago altissima',
      'Solidago canadensis',
      'Solidago rugosa',
      'Solidago juncea',
    ]) {
      const match = matchScientificName(name);
      expect(match.herbId, name).toBe(GOLDENROD);
      expect(match.confirmable, name).toBe(true);
    }
  });

  it('still calls the printed binomial `exact`, and the others `acceptedScope`', () => {
    // Two different reasons a name is accepted, and the UI says different things about them.
    expect(matchScientificName('Solidago canadensis').kind).toBe('exact');
    expect(matchScientificName('Solidago altissima').kind).toBe('acceptedScope');
  });

  it('does not reorder candidates, so 56% still beats 12%', () => {
    /*
     * The reported symptom was a 12% canonical species offered over a 56% one. Nothing in
     * the matcher or the panel sorts — provider order is preserved end to end — so this
     * asserts the property by construction: both are confirmable, and the caller's order is
     * the provider's.
     */
    const ranked = ['Solidago altissima', 'Solidago canadensis'].map(matchScientificName);
    expect(ranked.every((m) => m.confirmable)).toBe(true);
    expect(ranked[0]!.herbId).toBe(GOLDENROD);
  });
});

describe('broadening one card changed nothing else', () => {
  it('leaves the exact-species cards exact', () => {
    // Five representative species cards, each with a genus-level English name that a
    // "common name looks like a genus" heuristic would have widened.
    for (const [name, id] of [
      ['Taraxacum officinale', 'taraxacum-officinale'],
      ['Viola sororia', 'viola-sororia'],
      ['Arctium lappa', 'arctium-lappa'],
      ['Achillea millefolium', 'achillea-millefolium'],
      ['Verbascum thapsus', 'verbascum-thapsus'],
    ] as const) {
      expect(matchScientificName(name).kind, name).toBe('exact');
      expect(matchScientificName(name).herbId, name).toBe(id);
    }
  });

  it('still refuses the relatives those cards deliberately exclude', () => {
    /*
     * #12 Wild Violet is the recorded precedent AGAINST widening on a genus-level common
     * name: a GBIF run accepted V. papilionacea as a synonym and refused V. riviniana,
     * V. odorata, V. canina and V. septentrionalis as accepted species in their own right.
     */
    for (const name of [
      'Taraxacum erythrospermum',
      'Viola riviniana',
      'Viola odorata',
      'Arctium minus',
    ]) {
      const match = matchScientificName(name);
      expect(match.kind, name).toBe('sameGenus');
      expect(match.confirmable, name).toBe(false);
    }
  });

  it('leaves the nine genus cards reporting `genusCard`, not `acceptedScope`', () => {
    for (const [name, id] of [
      ['Quercus robur', 'quercus-spp'],
      ['Acer saccharum', 'acer-spp'],
      ['Pinus strobus', 'pinus-spp'],
      ['Rubus fruticosus', 'rubus-spp'],
      ['Sambucus nigra', 'sambucus-spp'],
    ] as const) {
      const match = matchScientificName(name);
      expect(match.kind, name).toBe('genusCard');
      expect(match.herbId, name).toBe(id);
      expect(match.confirmable, name).toBe(true);
    }
  });

  it('keeps the verified synonyms working', () => {
    expect(matchScientificName('Taraxacum campylodes').herbId).toBe('taraxacum-officinale');
    expect(matchScientificName('Viola papilionacea').herbId).toBe('viola-sororia');
    expect(matchScientificName('Taraxacum campylodes').kind).toBe('exact');
  });

  it('matches nothing outside the deck', () => {
    for (const name of ['Zea mays', 'Ginkgo biloba', 'Panthera leo']) {
      expect(matchScientificName(name).kind, name).toBe('none');
      expect(matchScientificName(name).confirmable, name).toBe(false);
    }
  });
});

describe('scope is a claim about identity, never about reward', () => {
  it('exposes no reward concept at all', () => {
    /*
     * IDENTIFICATION MATCH != VALID REAL-WORLD DISCOVERY. Widening what a card ACCEPTS must
     * not touch what a find PAYS: discovery still goes through the same idempotent
     * `discover()` every entry point calls, mastery and research are still recomputed
     * server-side, and a photograph of a printed card still identifies correctly and still
     * must not be logged. Read from source, because the absence of a dependency is the
     * assertion — nothing at runtime can show a coupling that is not there.
     */
    const source = readFileSync('src/lib/card-coverage.ts', 'utf8');
    for (const forbidden of ['xp', 'discover', 'award', 'reward', 'mastery']) {
      expect(
        new RegExp(`\\b${forbidden}`, 'i').test(source.replace(/\/\*[\s\S]*?\*\//g, '')),
        `card-coverage.ts references "${forbidden}"`,
      ).toBe(false);
    }
  });
});
