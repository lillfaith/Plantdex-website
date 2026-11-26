import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

/*
 * WHAT THE FIVE PILOT CARDS ACTUALLY DO IN THE REAL CODE, with the preview catalogue swapped in.
 *
 * `vi.mock` replaces the (always empty) `expansion-entries` seam with the preview module, which is
 * exactly what `scripts/build-pilot-preview.mjs` does in its staged copy. Everything else here is the
 * real reducer, matcher, ledger, garden and scoring code. Each `it` is evidence for a row in
 * `docs/expansion/pilot/preview-status.md`; a failing one is a finding, not a flake.
 */
vi.mock('./expansion-entries', async () => await import('./expansion-entries.preview'));

import { DIGITAL_ONLY_ENTRIES, getCatalogueEntry } from './catalogue';
import { COLLECTIONS, PRINTED_COLLECTIONS, collectionOf, cardLabel } from './collection';
import { PRINTED_CARDS, PRINTED_DECK_SIZE } from './deck';
import { EXPANSION_ENTRIES, PREVIEW_LABEL } from './expansion-entries.preview';
import { emptyState } from './herbdex-state';
import { applyDiscovery, applyLearned, reconcileMastery, reconcileResearch } from './herbdex-reducer';
import { progressFromState, xpForState } from './progression';
import { masteryTotals, tracksMastery } from './mastery';
import { buildGarden, stageForState } from './garden';
import { hasSprite } from './plant-sprites';
import { matchScientificName } from './plant-match';
import { isShelfEligible, cardFor } from './seed-shelf';
import { scoreFromRecords } from './leaderboard';
import { STANDING_TASKS, buildWorld } from './research';

const IDS = ['eupatorium-perfoliatum', 'rudbeckia-hirta', 'rumex-crispus', 'plantago-lanceolata', 'trifolium-repens'];
const NUMBERS = [57, 60, 67, 68, 80];
const at = '2026-11-26T00:00:00.000Z';
const allFive = () => IDS.reduce((s, id) => applyDiscovery(s, id, at).state, emptyState());

describe('catalogue and collection', () => {
  it('serves exactly the five, numbered 57/60/67/68/80, as digital-only entries', () => {
    expect(EXPANSION_ENTRIES.map((h) => h.id)).toEqual(IDS);
    expect(EXPANSION_ENTRIES.map((h) => h.cardNumber)).toEqual(NUMBERS);
    for (const id of IDS) expect(DIGITAL_ONLY_ENTRIES.some((h) => h.id === id)).toBe(true);
    expect(getCatalogueEntry('rumex-crispus')?.commonName).toBe('Curly Dock');
  });
  it('keeps the printed deck at 45 and the printed collections at one', () => {
    expect(PRINTED_DECK_SIZE).toBe(45);
    expect(PRINTED_CARDS).toHaveLength(45);
    expect(PRINTED_COLLECTIONS.map((c) => c.id)).toEqual(['collection-01']);
    expect(COLLECTIONS.map((c) => c.id)).toEqual(['collection-01', 'field-cards', 'herbdex-expansion']);
  });
  it('declares its own collection, never Collection 01, and labels it "Expansion"', () => {
    for (const h of EXPANSION_ENTRIES) {
      expect(collectionOf(h).id).toBe('herbdex-expansion');
      expect(collectionOf(h).medium).toBe('digital');
    }
    expect(cardLabel(EXPANSION_ENTRIES[0]!)).toBe('Expansion · Card #57');
  });
  it('labels every card PREVIEW - UNREVIEWED in the card\'s own warning and carries no reviewed caution', () => {
    for (const h of EXPANSION_ENTRIES) {
      expect(h.warning).toContain(PREVIEW_LABEL);
      expect(h.warning).toMatch(/Held by the publication gate/);
      expect(h.identification).toBeUndefined();
      expect(h.habitat).toBeUndefined();
      expect(h.sources).toBeUndefined();
    }
  });
});

describe('progress: discovery is recorded, and pays and counts nothing', () => {
  it('records a discovery for each (the reducer resolves through the catalogue)', () => {
    const { state, result } = applyDiscovery(emptyState(), 'rudbeckia-hirta', at);
    expect(state.discoveries['rudbeckia-hirta']).toBe(at);
    expect(result.awarded).toBe(true);
  });
  it('pays 0 XP, and 0 XP in total for all five', () => {
    for (const id of IDS) expect(applyDiscovery(emptyState(), id, at).result.xpAwarded, id).toBe(0);
    expect(xpForState(allFive())).toBe(0);
    expect(progressFromState(allFive()).level).toBe(progressFromState(emptyState()).level);
  });
  it('is idempotent: a repeat returns the same state object', () => {
    const once = applyDiscovery(emptyState(), 'rumex-crispus', at).state;
    expect(applyDiscovery(once, 'rumex-crispus', at).state).toBe(once);
  });
  it('does not move the 45-card collection counts', () => {
    expect(masteryTotals(allFive())).toEqual({ discovered: 0, learned: 0, mastered: 0 });
  });
  it('has no mastery track, no learning stage, and mastery cannot be reconciled', () => {
    for (const id of IDS) expect(tracksMastery(id), id).toBe(false);
    const s = allFive();
    expect(applyLearned(s, 'rudbeckia-hirta', at).state).toBe(s);
    const r = reconcileMastery(s, { 'rudbeckia-hirta': 9 }, at);
    expect(r.state.mastered).toEqual({});
  });
  it('does not complete or fund any Field Research task', () => {
    const s = allFive();
    const world = buildWorld(s, Object.fromEntries(IDS.map((id) => [id, 5])));
    const r = reconcileResearch(s, world, STANDING_TASKS, at);
    expect(r.xpAwarded).toBe(0);
    expect(Object.keys(r.state.research)).toEqual([]);
  });
});

describe('garden', () => {
  it('the Garden page lists the printed deck only, so none of the five can appear there', () => {
    const page = readFileSync('src/components/garden/GardenView.tsx', 'utf8');
    expect(page).toMatch(/printedCardsInDeckOrder\(\)/);
    expect(page).not.toMatch(/CATALOGUE|DIGITAL_ONLY/);
    const entries = buildGarden(allFive(), PRINTED_CARDS.map((h) => h.id));
    expect(entries.map((e) => e.herbId).filter((id) => IDS.includes(id))).toEqual([]);
  });
  it('LATENT: stageForState alone answers "sprout" for a discovered expansion id (nothing renders it today)', () => {
    expect(stageForState(allFive(), 'rudbeckia-hirta')).toBe('sprout');
  });
  it('has no sprite for any of them, so the missing-sprite state applies', () => {
    for (const id of IDS) expect(hasSprite(id), id).toBe(false);
  });
});

describe('identify: the matcher resolves exact binomials onto the new cards', () => {
  const expected: Record<string, string> = {
    'Eupatorium perfoliatum': 'eupatorium-perfoliatum',
    'Rudbeckia hirta': 'rudbeckia-hirta',
    'Rumex crispus': 'rumex-crispus',
    'Plantago lanceolata': 'plantago-lanceolata',
    'Trifolium repens': 'trifolium-repens',
  };
  for (const [name, id] of Object.entries(expected)) {
    it(`${name} resolves to its own card, confirmably`, () => {
      const m = matchScientificName(name);
      expect(m.herbId, JSON.stringify(m)).toBe(id);
      expect(m.confirmable).toBe(true);
    });
  }
  it('no longer offers these species to the Seed Shelf, and promotes a shelved one to its card', () => {
    for (const name of Object.keys(expected)) expect(isShelfEligible(name), name).toBe(false);
    expect(cardFor({ scientificName: 'Trifolium repens' })).toBe('trifolium-repens');
  });
  it('does not let a sibling species claim a pilot card, and the pilot cards do not claim siblings', () => {
    for (const name of ['Rudbeckia laciniata', 'Rudbeckia fulgida', 'Plantago rugelii']) {
      const m = matchScientificName(name);
      expect(m.confirmable, `${name} -> ${m.kind}`).toBe(false);
      expect(m.kind).toBe('sameGenus');
    }
    expect(matchScientificName('Plantago major').herbId).toBe('plantago-major');
    expect(matchScientificName('Trifolium pratense').herbId).toBe('trifolium-pratense');
    expect(matchScientificName('Rumex obtusifolius').herbId).toBe('rumex-obtusifolius');
  });
  it('never confirms a hybrid or genus-level answer (pilot plan section 4): Rumex x acutus is only "related"', () => {
    for (const name of ['Rumex x acutus', 'Rumex', 'Rumex sp.']) {
      expect(matchScientificName(name).confirmable, name).toBe(false);
    }
  });
});

describe('Field Board', () => {
  it('scores expansion discoveries at 0 (they must contribute nothing)', () => {
    expect(scoreFromRecords(allFive(), []).points).toBe(0);
    expect(scoreFromRecords(allFive(), []).discoveries).toBe(0);
  });
});
