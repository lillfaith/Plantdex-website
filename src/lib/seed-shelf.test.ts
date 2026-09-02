import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  cardFor,
  isShelfEligible,
  mergeFinds,
  newFind,
  parseFind,
  shelfCounts,
  shelfOrder,
  shelfStatus,
  type SeedShelfFind,
} from './seed-shelf';
import { emptyState } from './herbdex-state';
import { HERBS } from './deck';
import { normalizeName } from './plant-match';
import type { HerbdexState } from './types';

/**
 * THE SEED SHELF.
 *
 * The rules worth pinning are the ones that keep it from becoming a second, sloppier
 * collection: what may go on it, what identity means, that nothing on it pays XP, and that a
 * packet only ever sprouts into a card for its own species.
 */

const DANDELION = 'taraxacum-officinale';

function find(overrides: Partial<SeedShelfFind> & { scientificName: string }): SeedShelfFind {
  const made = newFind({ scientificName: overrides.scientificName }, overrides.foundAt);
  if (!made) throw new Error(`${overrides.scientificName} was refused by the shelf`);
  return { ...made, ...overrides };
}

describe('what may go on the shelf', () => {
  it('refuses a species the deck already has a card for', () => {
    // The whole point of the shelf is plants with no card. Offering one that HAS a card
    // would invite somebody to file a discovery in the wrong place.
    for (const herb of HERBS.slice(0, 8)) {
      expect(isShelfEligible(herb.scientificName), `${herb.scientificName} is a card`).toBe(false);
    }
  });

  it('refuses a species a genus card already covers', () => {
    // "Quercus robur" against the deck's "Quercus spp." is `genusCard` — confirmable, so it
    // is a discovery rather than a shelf entry.
    const genusCard = HERBS.find((herb) => /\bspp?\.?$/i.test(herb.scientificName));
    expect(genusCard, 'the deck no longer has a genus card to test with').toBeDefined();
    const genus = genusCard!.scientificName.split(' ')[0]!;
    expect(isShelfEligible(`${genus} robur`)).toBe(false);
  });

  it('accepts a different species in a genus the deck covers', () => {
    // `sameGenus`: related to a card, and NOT that card. Exactly what the shelf is for.
    expect(isShelfEligible('Taraxacum erythrospermum')).toBe(true);
  });

  it('accepts an ordinary species the deck knows nothing about', () => {
    expect(isShelfEligible('Bellis perennis')).toBe(true);
  });

  it('refuses a bare genus, which names no species', () => {
    // A shelf of genera would collide with future cards in ways nothing could resolve.
    expect(isShelfEligible('Bellis')).toBe(false);
    expect(isShelfEligible('')).toBe(false);
  });

  it('creates nothing for a name it refuses', () => {
    expect(newFind({ scientificName: HERBS[0]!.scientificName })).toBeNull();
    expect(newFind({ scientificName: 'Bellis' })).toBeNull();
  });
});

describe('identity is taxonomic', () => {
  it('folds authorship and infraspecific rank onto one species', () => {
    const finds = [
      find({ scientificName: 'Bellis perennis L.', foundAt: '2026-04-01T09:00:00.000Z' }),
      find({ scientificName: 'Bellis perennis', foundAt: '2026-05-01T09:00:00.000Z' }),
      find({ scientificName: 'Bellis perennis subsp. perennis', foundAt: '2026-06-01T09:00:00.000Z' }),
    ];
    const entries = mergeFinds(finds);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.encounters).toBe(3);
    expect(entries[0]!.speciesKey).toBe('bellis perennis');
  });

  it('keeps two different species apart', () => {
    const entries = mergeFinds([
      find({ scientificName: 'Bellis perennis' }),
      find({ scientificName: 'Bellis sylvestris' }),
    ]);
    expect(entries).toHaveLength(2);
  });
});

describe('folding finds into an entry', () => {
  const finds = [
    {
      ...find({ scientificName: 'Bellis perennis', foundAt: '2026-04-01T09:00:00.000Z' }),
      confidence: 0.4,
    },
    {
      ...find({ scientificName: 'Bellis perennis', foundAt: '2026-06-01T09:00:00.000Z' }),
      confidence: 0.8,
      commonName: 'Common daisy',
    },
    {
      ...find({ scientificName: 'Bellis perennis', foundAt: '2026-05-01T09:00:00.000Z' }),
      confidence: 0.6,
    },
  ];

  it('takes the first-found date from the earliest find, whatever order they arrive in', () => {
    // The date is the thing a player earns. A later save must never move it — which is also
    // why the row is write-once and the entry is derived rather than updated.
    const entry = mergeFinds(finds)[0]!;
    expect(entry.firstFoundAt).toBe('2026-04-01T09:00:00.000Z');
    expect(entry.lastFoundAt).toBe('2026-06-01T09:00:00.000Z');
  });

  it('counts encounters and keeps the best confidence', () => {
    const entry = mergeFinds(finds)[0]!;
    expect(entry.encounters).toBe(3);
    expect(entry.bestConfidence).toBe(0.8);
  });

  it('fills a missing name from a later find without overwriting an earlier one', () => {
    const entry = mergeFinds(finds)[0]!;
    expect(entry.commonName).toBe('Common daisy');
  });

  it('is stable when two finds share a timestamp', () => {
    // Sorting by date alone would leave the order to whichever the map happened to hold
    // first, and "first found" would then differ between a device and a reload.
    const same = '2026-04-01T09:00:00.000Z';
    const a: SeedShelfFind = { ...find({ scientificName: 'Bellis perennis', foundAt: same }), id: 'seed_a' };
    const b: SeedShelfFind = { ...find({ scientificName: 'Bellis perennis', foundAt: same }), id: 'seed_b' };
    expect(mergeFinds([a, b])[0]!.packet).toEqual(mergeFinds([b, a])[0]!.packet);
  });
});

describe('sprouting into a card', () => {
  const shelved = find({ scientificName: 'Bellis perennis' });

  it('stays waiting while the deck has no card for it', () => {
    const entry = mergeFinds([shelved])[0]!;
    expect(cardFor(entry)).toBeNull();
    expect(shelfStatus(entry, emptyState())).toBe('waiting');
  });

  it('sprouts the moment its species IS a card, with no migration', () => {
    /*
     * The future-collection mechanism, tested the only way it can be before a second
     * collection exists: an entry naming a species that is already a card matches
     * immediately. A card printed tomorrow does exactly this to a shelf saved today.
     */
    const asIfCarded = { ...mergeFinds([shelved])[0]!, scientificName: HERBS[0]!.scientificName };
    expect(cardFor(asIfCarded)).toBe(HERBS[0]!.id);
    expect(shelfStatus(asIfCarded, emptyState())).toBe('sprouted');
  });

  it('reads as grown once the card is in the collection', () => {
    const state: HerbdexState = {
      ...emptyState(),
      discoveries: { [HERBS[0]!.id]: '2026-04-01T09:00:00.000Z' },
    };
    const asIfCarded = { ...mergeFinds([shelved])[0]!, scientificName: HERBS[0]!.scientificName };
    expect(shelfStatus(asIfCarded, state)).toBe('grown');
  });

  it('never sprouts into a card for a different species', () => {
    /*
     * `sameGenus` is a relative, not this plant. A packet that sprouted into it would write
     * something untrue into somebody's collection — the exact failure the matcher's four
     * outcomes exist to prevent, and the reason this reads `confirmable` rather than
     * "did we find a herbId".
     */
    const related = mergeFinds([find({ scientificName: 'Taraxacum erythrospermum' })])[0]!;
    expect(cardFor(related)).toBeNull();
    expect(shelfStatus(related, emptyState())).toBe('waiting');
  });

  it('sprouts a checked synonym, because that is the same plant', () => {
    // `plant-match.ts` holds this one with its POWO citation. The shelf inherits every such
    // fact and invents none of its own.
    const entry = mergeFinds([
      { ...find({ scientificName: 'Bellis perennis' }), scientificName: 'Taraxacum campylodes' },
    ])[0]!;
    expect(cardFor(entry)).toBe(DANDELION);
  });
});

describe('the shelf as a whole', () => {
  const state: HerbdexState = {
    ...emptyState(),
    discoveries: { [HERBS[1]!.id]: '2026-04-01T09:00:00.000Z' },
  };
  const entries = [
    { ...mergeFinds([find({ scientificName: 'Bellis perennis', foundAt: '2026-01-01T00:00:00.000Z' })])[0]! },
    { ...mergeFinds([find({ scientificName: 'Bellis sylvestris', foundAt: '2026-03-01T00:00:00.000Z' })])[0]! },
    // One sprouted and one grown, faked the same way the tests above do.
    { ...mergeFinds([find({ scientificName: 'Bellis annua', foundAt: '2026-02-01T00:00:00.000Z' })])[0]!, scientificName: HERBS[0]!.scientificName },
    { ...mergeFinds([find({ scientificName: 'Bellis rotundifolia', foundAt: '2026-04-01T00:00:00.000Z' })])[0]!, scientificName: HERBS[1]!.scientificName },
  ];

  it('puts what needs claiming first, then the newest, then what has grown', () => {
    const order = shelfOrder(entries, state).map((entry) => shelfStatus(entry, state));
    expect(order).toEqual(['sprouted', 'waiting', 'waiting', 'grown']);
  });

  it('counts species, not saves, and separates the three states', () => {
    const counts = shelfCounts(entries, state);
    expect(counts).toEqual({ species: 4, waiting: 2, sprouted: 1, grown: 1, encounters: 4 });
  });
});

describe('reading stored rows back', () => {
  it('rejects a row with no name or no date rather than inventing one', () => {
    expect(parseFind({ scientificName: 'Bellis perennis' })).toBeNull();
    expect(parseFind({ foundAt: '2026-04-01T09:00:00.000Z' })).toBeNull();
    expect(parseFind(null)).toBeNull();
  });

  it('derives the species key when a stored row lacks one', () => {
    const parsed = parseFind({
      scientificName: 'Bellis perennis L.',
      foundAt: '2026-04-01T09:00:00.000Z',
    });
    expect(parsed?.speciesKey).toBe(normalizeName('Bellis perennis L.'));
  });

  it('regenerates a packet whose stored recipe is unreadable', () => {
    // A stored recipe is a pin, never the only copy: the name is the seed, so a corrupted
    // or future-shaped recipe costs nothing.
    const parsed = parseFind({
      scientificName: 'Bellis perennis',
      foundAt: '2026-04-01T09:00:00.000Z',
      packet: { shape: 'not-a-shape' },
    });
    expect(parsed?.packet.shape).toBeTruthy();
  });

  it('drops a confidence outside 0–1', () => {
    const parsed = parseFind({
      scientificName: 'Bellis perennis',
      foundAt: '2026-04-01T09:00:00.000Z',
      confidence: 4,
    });
    expect(parsed?.confidence).toBeUndefined();
  });
});

describe('the shelf cannot pay', () => {
  /*
   * THE STRUCTURAL VERSION OF "SAVING AWARDS NOTHING".
   *
   * A rule in the copy is a rule somebody can break in a later change without noticing. XP is
   * derived by summing over `HerbdexState` (see `progression.ts`), so a shelf that cannot
   * reach the reducer cannot award anything no matter what a future component does with it.
   * These modules may READ the collection — that is how a packet knows it has sprouted — and
   * may never write to it.
   */
  const shelfModules = [
    'src/lib/seed-shelf.ts',
    'src/lib/seed-packet.ts',
    'src/lib/local-seed-shelf.ts',
    'src/lib/remote-seed-shelf.ts',
    'src/lib/seed-shelf-store.ts',
  ];

  it('imports nothing that can write the collection or price it', () => {
    for (const path of shelfModules) {
      const source = readFileSync(path, 'utf8');
      for (const forbidden of ['herbdex-reducer', 'progression', './storage', 'herbdex-store']) {
        expect(source, `${path} imports ${forbidden}`).not.toMatch(
          new RegExp(`from '[^']*${forbidden.replace('.', '\\.')}'`),
        );
      }
    }
  });

  it('writes to its own storage key, never the collection’s', () => {
    const source = readFileSync('src/lib/local-seed-shelf.ts', 'utf8');
    expect(source).toContain('SEED_SHELF_STORAGE_KEY');
    expect(source, 'the shelf writes the collection key').not.toContain('plantdex.herbdex');
  });
});

describe('one facade decides which shelf is being read', () => {
  // The same rule `sightings-store.test.ts` enforces, and for the same reason: the local and
  // remote stores have identical shapes, so reaching past the facade type-checks, renders,
  // and quietly shows a signed-in player their device's shelf instead of their account's.
  it('is the only shelf store a component imports', () => {
    const offenders: string[] = [];
    for (const root of ['src/components', 'src/app']) {
      for (const file of readdirSync(root, { recursive: true, encoding: 'utf8' })) {
        const path = join(root, file);
        if (!/\.tsx?$/.test(path) || !statSync(path).isFile()) continue;
        const source = readFileSync(path, 'utf8');
        if (/from '@\/lib\/(local|remote)-seed-shelf'/.test(source)) offenders.push(path);
      }
    }
    expect(
      offenders,
      `these bypass seed-shelf-store: ${offenders.join(', ')}`,
    ).toEqual([]);
  });
});
