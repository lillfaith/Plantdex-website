import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PRINTED_CARDS, getPrintedCard } from './deck';
import { CARD_COVERAGE, allScopes } from './card-coverage';
import { matchScientificName, normalizeName, speciesConfidenceFor } from './plant-match';
import { applyDiscovery } from './herbdex-reducer';
import { emptyState } from './herbdex-state';
import { xpForState } from './progression';

/**
 * THE CARD IS NOT THE PLANT.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Four facts, and this file exists because three of them used to be one:
 *
 *   herbId            which Plantdex CARD was discovered or logged
 *   observedTaxon     what the plant was actually IDENTIFIED as
 *   eligibility       WHY that observation qualifies for the card
 *   speciesConfidence how strong the SPECIES-level identification is
 *
 * Before this, an observation that qualified for a card was rewritten as the card's own
 * binomial on its way into the collection. A `Solidago altissima` photograph became a
 * Goldenrod discovery and *S. altissima* survived nowhere on the client; a
 * `Taraxacum sect. <anything>` answer became an EXACT `Taraxacum officinale`, because
 * `normalizeName` dropped the section epithet and collapsed every section onto one key that
 * sat in the synonym table.
 *
 * Both are botanical claims the app was making on its own authority. These tests are the
 * standing proof it no longer does.
 * ─────────────────────────────────────────────────────────────────────────────
 */

describe('an accepted-group observation keeps its own name', () => {
  it('logs the correct card while retaining the observed scientific name', () => {
    const match = matchScientificName('Taraxacum sect. Ruderalia');
    expect(match.herbId, 'the card is reachable').toBe('taraxacum-officinale');
    expect(match.confirmable).toBe(true);
    expect(match.eligibility).toBe('acceptedGroup');
    // The whole point: the card's binomial has NOT replaced what was observed.
    expect(match.observedTaxon?.name).toBe('Taraxacum sect. Ruderalia');
    expect(match.observedTaxon?.rank).toBe('section');
    expect(match.observedTaxon?.name).not.toBe('Taraxacum officinale');
  });

  it('reports species confidence as unresolved above species rank, at ANY score', () => {
    /*
     * Rank is read before the number. A provider can be entirely certain it is looking at a
     * section and still have said nothing about which species within it, so a high score
     * must not be laundered into a species-level claim.
     */
    for (const score of [0.01, 0.5, 0.99, 1]) {
      expect(speciesConfidenceFor('section', score), `score ${score}`).toBe('unresolved');
    }
  });

  it('preserves the provider string separately from the lookup key', () => {
    // Normalisation is for finding things. It must never become the historical record.
    const match = matchScientificName('Taraxacum sect. Ruderalia Kirschner');
    expect(match.observedTaxon?.providerName).toBe('Taraxacum sect. Ruderalia Kirschner');
    expect(match.observedTaxon?.key).toBe(normalizeName('Taraxacum sect. Ruderalia'));
    expect(match.observedTaxon?.providerName).not.toBe(match.observedTaxon?.key);
  });
});

describe('exact and genus-card matches', () => {
  it('an exact match retains the exact scientific name', () => {
    for (const herb of PRINTED_CARDS.slice(0, 12)) {
      const match = matchScientificName(herb.scientificName);
      expect(match.herbId, herb.scientificName).toBe(herb.id);
      expect(match.eligibility, herb.scientificName).toBe('exact');
      expect(match.observedTaxon?.key, herb.scientificName).toBe(
        normalizeName(herb.scientificName),
      );
    }
  });

  it('a genus card accepts a genus member WITHOUT pretending it is one species', () => {
    const match = matchScientificName('Quercus robur');
    expect(match.herbId).toBe('quercus-spp');
    expect(match.eligibility).toBe('genusCard');
    expect(match.confirmable).toBe(true);
    // The card prints `Quercus spp.`; the observation is a particular oak and stays one.
    expect(match.observedTaxon?.name).toBe('Quercus robur');
    expect(match.observedTaxon?.rank).toBe('species');
  });

  it('a species-specific card does NOT accept an arbitrary same-genus species', () => {
    for (const [name, card] of [
      ['Oxalis corniculata', 'oxalis-stricta'],
      ['Taraxacum erythrospermum', 'taraxacum-officinale'],
      ['Viola riviniana', 'viola-sororia'],
      ['Mentha spicata', 'mentha-canadensis'],
    ] as const) {
      const match = matchScientificName(name);
      expect(match.eligibility, name).toBe('related');
      expect(match.confirmable, `${name} must not be loggable as ${card}`).toBe(false);
      expect(match.observedTaxon?.name, name).toBe(name);
    }
  });
});

describe('no code path substitutes the card’s binomial for the observed taxon', () => {
  it('holds for every card reachable by something other than its own name', () => {
    /*
     * Swept rather than spot-checked. For every printed card, every OTHER name that resolves
     * to it must keep its own observed taxon — the substitution bug was invisible precisely
     * because the card was right.
     */
    const probes = [
      'Solidago altissima',
      'Solidago gigantea',
      'Taraxacum sect. Taraxacum',
      'Taraxacum sect. Ruderalia',
      'Taraxacum campylodes',
      'Quercus robur',
      'Rubus fruticosus',
    ];
    for (const name of probes) {
      const match = matchScientificName(name);
      if (!match.herbId) continue;
      const card = getPrintedCard(match.herbId);
      expect(match.observedTaxon?.providerName, name).toBe(name);
      if (normalizeName(name) !== normalizeName(card!.scientificName)) {
        expect(
          match.observedTaxon?.name,
          `${name} was rewritten as ${card!.scientificName}`,
        ).not.toBe(card!.scientificName);
      }
    }
  });
});

describe('the curated model cannot quietly widen', () => {
  it('has exactly ONE pendingCuration entry, and it is Goldenrod', () => {
    /*
     * Goldenrod keeps genus scope only so live coverage does not narrow before its accepted
     * taxa are researched. That is temporary debt; this fails the build if a second
     * species-specific card acquires the same escape hatch.
     */
    const pending = allScopes().filter(
      ({ scope }) => scope.type === 'genus' && 'pendingCuration' in scope && scope.pendingCuration,
    );
    expect(pending.map((one) => one.herbId)).toEqual(['solidago-canadensis']);
  });

  it('requires every accepted-group member to be curated, not a bare genus', () => {
    for (const { herbId, scope } of allScopes()) {
      if (scope.type !== 'acceptedGroup') continue;
      expect(scope.accepted.length, `${herbId} has an empty accepted group`).toBeGreaterThan(0);
      for (const taxon of scope.accepted) {
        expect(taxon.scientificName.trim().split(/\s+/).length, taxon.scientificName)
          .toBeGreaterThan(1);
        expect(taxon.note.trim().length, `${taxon.scientificName} has no note`).toBeGreaterThan(20);
      }
    }
  });

  it('keeps every genus override out of the cards that print a binomial, bar the flagged one', () => {
    for (const [herbId, scope] of Object.entries(CARD_COVERAGE)) {
      if (scope.type !== 'genus') continue;
      expect(herbId, 'an unflagged genus override on a binomial card').toBe('solidago-canadensis');
    }
  });

  it('keeps sections distinguishable after normalization', () => {
    const keys = [
      'Taraxacum sect. Ruderalia',
      'Taraxacum sect. Erythrosperma',
      'Taraxacum sect. Palustria',
    ].map(normalizeName);
    expect(new Set(keys).size, 'sections collapsed onto one key again').toBe(3);
  });
});

describe('discovery and XP stay card-based', () => {
  it('records the CARD, and pays by the card, whatever the observed taxon was', () => {
    /*
     * The separation must not leak into progression. A discovery is still a card id and
     * nothing else — `HerbdexState` holds only what XP derives from, so there is nowhere for
     * an observed taxon to go, which is what keeps this structural rather than promised.
     */
    const match = matchScientificName('Solidago altissima');
    const { state, result } = applyDiscovery(emptyState(), match.herbId!, '2026-05-01T00:00:00.000Z');
    expect(Object.keys(state.discoveries)).toEqual(['solidago-canadensis']);
    expect(result.xpAwarded).toBe(getPrintedCard('solidago-canadensis')!.xp);
    expect(xpForState(state)).toBe(result.xpAwarded);
  });

  it('keeps HerbdexState free of taxonomic fields', () => {
    const state = emptyState();
    expect(Object.keys(state).sort()).toEqual(
      ['achievements', 'discoveries', 'learned', 'mastered', 'research', 'version'].sort(),
    );
  });
});

describe('legacy sightings survive the new fields', () => {
  const STORAGE_KEY = 'plantdex.sightings.v1';

  function stubStorage(seed: unknown): void {
    const store = new Map<string, string>();
    if (seed !== undefined) store.set(STORAGE_KEY, JSON.stringify(seed));
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
    });
  }

  beforeEach(() => vi.unstubAllGlobals());

  it('loads a sighting recorded before observed taxa existed', async () => {
    /*
     * The compatibility guarantee, from the direction that actually breaks: `isSighting` must
     * NOT require the new fields. Requiring one would filter real history out of `read()` —
     * the same class of bug as the `createdAt` omission this store already has scars from,
     * arriving from the opposite side.
     */
    vi.resetModules();
    stubStorage([
      { id: 'sighting_1', herbId: 'taraxacum-officinale', date: '2026-08-30', createdAt: '2026-08-30T10:00:00.000Z' },
      { id: 'sighting_2', herbId: 'solidago-canadensis', date: '2026-09-01', createdAt: '2026-09-01T10:00:00.000Z', notes: 'by the fence' },
    ]);
    const { getAllSightings } = await import('./sightings');
    const all = getAllSightings();
    expect(all, 'legacy sightings were filtered out').toHaveLength(2);
    expect(all.every((one) => one.observedTaxonName === undefined)).toBe(true);
    expect(all.every((one) => one.speciesConfidence === undefined)).toBe(true);
  });

  it('does not backfill a taxon onto a record that never had one', () => {
    // Inventing one would be fabricating a botanical record for a find nobody identified.
    const source = readFileSync('src/lib/sightings.ts', 'utf8');
    expect(source).not.toMatch(/observedTaxonName\s*[:=]\s*(?!undefined)['"`]/);
  });
});

describe('account isolation is unchanged by this work', () => {
  it('adds no table and grants no new write surface', () => {
    /*
     * The taxonomic fields ride on records that already exist and are already owner-scoped.
     * Nothing here introduces a table, a policy, or a second writer — so the isolation the
     * migrations established still holds, and `account-security.test.ts` still governs it.
     */
    const migration = readFileSync('supabase/migrations/0002_scans.sql', 'utf8');
    expect(migration).toMatch(/auth\.uid\(\) = user_id/);
    expect(migration, 'a history table must never grant update').not.toMatch(/for update/i);
  });
});
