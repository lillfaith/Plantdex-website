import { readFileSync } from 'node:fs';
import { vi } from 'vitest';
import { describe, expect, it } from 'vitest';

import { applyDiscovery } from './herbdex-reducer';
import { emptyState } from './herbdex-state';
import { isShelfEligible } from './seed-shelf';
import { matchScientificName } from './plant-match';
import { boardProgress, questBoard, regionalCollection } from './quest-board';
import { featuredForRegion, speciesForRegion } from './region-species';
import { REGION_STORAGE_KEY, readRegion, writeRegion } from './region-store';

/**
 * The seams between the regional board and everything that already existed.
 *
 * Each of these is a way the board could break a system it is supposed to sit on top of,
 * and none of them is visible from inside the board's own unit tests.
 */

const board = () => questBoard('us-ga', 'spring', 2026, featuredForRegion('us-ga'));

describe('unlocks go through the existing discovery path', () => {
  it('a board find is an ordinary discovery, worth the ordinary XP', () => {
    const first = board().entries[0]!.herbId;
    const after = applyDiscovery(emptyState(), first);
    expect(after.state.discoveries[first]).toBeDefined();
    // The award is whatever the ledger already pays for that card — the board adds nothing.
    expect(after.result.awarded).toBe(true);
  });

  it('a repeated find awards nothing and changes nothing', () => {
    /*
     * The duplicate-scan case. `applyDiscovery` returns the SAME STATE OBJECT when there is
     * nothing new, which is what makes repeat XP structurally impossible rather than
     * guarded — and the board inherits that for free because it stores no counter.
     */
    const first = board().entries[0]!.herbId;
    const once = applyDiscovery(emptyState(), first);
    const twice = applyDiscovery(once.state, first);
    expect(twice.state).toBe(once.state);
    expect(twice.result.awarded).toBe(false);
    expect(boardProgress(board(), twice.state.discoveries))
      .toEqual(boardProgress(board(), once.state.discoveries));
  });

  it('credits discoveries made before the board existed', () => {
    const live = board();
    const old = Object.fromEntries(live.entries.map((e) => [e.herbId, '2024-05-01']));
    const progress = boardProgress(live, old);
    expect(progress.starter.found).toBe(progress.starter.total);
  });
});

describe('changing region', () => {
  it('changes the lens and never the collection', () => {
    /*
     * THE REGRESSION THAT WOULD MATTER MOST. A region is a filter over which cards are
     * SUGGESTED. If it ever filtered what a player HOLDS, switching region would appear to
     * delete their collection.
     */
    const discoveries = { 'mentha-canadensis': '2024-01-01', 'taraxacum-officinale': '2024-01-02' };
    const georgia = regionalCollection(speciesForRegion('us-ga'));
    // Wild Mint is not offered in Georgia — zero records — but it is still held.
    expect(georgia.some((c) => c.id === 'mentha-canadensis')).toBe(false);
    expect(discoveries['mentha-canadensis']).toBeDefined();
    // And the board counts only what is on it, without touching the rest.
    const progress = boardProgress(board(), discoveries);
    expect(progress.starter.total).toBeGreaterThan(0);
  });

  it('an unknown or cleared region yields no collection, not an error', () => {
    expect(regionalCollection(speciesForRegion('us-nowhere'))).toEqual([]);
    expect(regionalCollection(speciesForRegion(null))).toEqual([]);
  });

  it('is stored per scope, so a shared device does not leak one player’s region', () => {
    /*
     * This repository has shipped the global-key version of this bug three times — the
     * import offer and the Field Card unlocks both handed the first account's state to
     * every account after it.
     */
    const store = new Map<string, string>();
    const fake = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    vi.stubGlobal('window', { localStorage: fake, addEventListener() {}, removeEventListener() {} });

    writeRegion('user-a', 'us-ga');
    expect(readRegion('user-a')?.id).toBe('us-ga');
    expect(readRegion('user-b')).toBeNull();
    expect([...store.keys()].every((k) => k.startsWith(REGION_STORAGE_KEY))).toBe(true);

    writeRegion('user-a', null);
    expect(readRegion('user-a')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('is swept by account deletion', () => {
    // The key must sit under `plantdex.`, which is the prefix delete-account.ts clears.
    expect(REGION_STORAGE_KEY.startsWith('plantdex.')).toBe(true);
    expect(readFileSync('src/lib/delete-account.ts', 'utf8')).toContain("startsWith('plantdex.')");
  });
});

describe('non-medicinal finds still go to the Seed Shelf', () => {
  it('a species with no card is shelf-eligible, region or no region', () => {
    /*
     * The board must not become a gate on identification. A plant Plantdex has no card for
     * is a Seed Shelf find exactly as it was before regions existed — and a species being
     * absent from the Georgia list is NOT the same as having no card.
     */
    const match = matchScientificName('Quercus robur');
    expect(isShelfEligible('Quercus robur')).toBe(!match.confirmable);
  });

  it('a Georgia card is not shelf-eligible just because it is off the board', () => {
    // Wild Mint has a card. It is not offered in Georgia, and it must still resolve to its
    // card rather than being shelved as an unknown species.
    const match = matchScientificName('Mentha canadensis');
    expect(match.confirmable).toBe(true);
    expect(isShelfEligible('Mentha canadensis')).toBe(false);
  });
});

describe('the board does not touch identification', () => {
  it('imports no matcher, provider or confidence logic', () => {
    /*
     * Region may never promote a candidate. The matcher already refuses to let card
     * membership outrank the provider — "a 0.09 deck species below a 0.41 non-deck one
     * leaves the outcome uncertain" — and regional data must get identical treatment. The
     * cheapest way to guarantee that is for the board to be unable to reach it.
     */
    const source = readFileSync('src/lib/quest-board.ts', 'utf8');
    for (const forbidden of ['plant-match', 'identify', 'confidence', 'speciesConfidence']) {
      expect(source, `quest-board must not reach into ${forbidden}`).not.toContain(forbidden);
    }
  });
});
