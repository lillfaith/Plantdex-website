import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PRINTED_CARDS } from './deck';
import { habitatOf } from './habitat';
import {
  QUEST_TIERS, STARTER_HABITATS, boardProgress, inSeason, isFindable, questBoard,
  regionalCollection, type BoardSeason, type RegionalSpecies,
} from './quest-board';
import { REGIONS, launchedRegions, regionById, resolveRegion } from './regions';

/**
 * The regional board, and the four ways it could quietly become something it must not be:
 * a second progression system, a gate on the existing collection, a re-trial of the printed
 * deck, or a source of plants nobody can find.
 */

/** The 12 approved launch species, by herb id, from docs/georgia-occurrence.md. */
const LAUNCH = [
  'taraxacum-officinale', 'stellaria-media', 'plantago-major', 'chenopodium-album',
  'portulaca-oleracea', 'prunella-vulgaris', 'verbascum-thapsus', 'achillea-millefolium',
  'passiflora-incarnata', 'viola-sororia', 'galium-aparine', 'trifolium-pratense',
];

const georgia: RegionalSpecies[] = LAUNCH.map((herbId) => ({ herbId, occurrence: 'confirmed' }));

describe('regions', () => {
  it('offers only launched regions, and Georgia is the one', () => {
    expect(launchedRegions().map((r) => r.id)).toEqual(['us-ga']);
  });

  it('treats no region as a first-class state rather than an error', () => {
    // Plantdex works everywhere and always has. A region adds a lens, never a gate.
    expect(resolveRegion(null)).toBeNull();
    expect(resolveRegion('us-nowhere')).toBeNull();
    // An unlaunched region resolves to null rather than being quietly offered.
    expect(regionById('us')?.launched).toBe(false);
    expect(resolveRegion('us')).toBeNull();
  });

  it('is already national in shape, so a second state is data', () => {
    expect(REGIONS.find((r) => r.id === 'us-ga')?.parentId).toBe('us');
  });
});

describe('what may appear on a board', () => {
  it('keeps insufficient and unlikely species off it, without calling them absent', () => {
    expect(isFindable({ herbId: 'x', occurrence: 'confirmed' })).toBe(true);
    expect(isFindable({ herbId: 'x', occurrence: 'likely' })).toBe(true);
    expect(isFindable({ herbId: 'x', occurrence: 'insufficient' })).toBe(false);
    expect(isFindable({ herbId: 'x', occurrence: 'unlikely' })).toBe(false);
  });

  it('treats missing phenology as year-round, never as out of season', () => {
    /*
     * The collection is available all year; seasonal quests are a featured challenge over
     * it. Defaulting the other way would empty the board for every species whose phenology
     * nobody has written down — most of them — and would turn missing data into a claim.
     */
    const noData: RegionalSpecies = { herbId: 'x', occurrence: 'confirmed' };
    for (const season of ['spring', 'summer', 'autumn', 'winter'] as BoardSeason[]) {
      expect(inSeason(noData, season)).toBe(true);
    }
    const spring: RegionalSpecies = { herbId: 'x', occurrence: 'confirmed', seasons: ['spring'] };
    expect(inSeason(spring, 'spring')).toBe(true);
    expect(inSeason(spring, 'winter')).toBe(false);
  });

  it('exposes the whole regional collection, not only the board', () => {
    // "Users can discover eligible species even when they are not featured" has to be a
    // property of the code, not a promise: the board is a selection FROM this list.
    const all = regionalCollection(georgia);
    expect(all).toHaveLength(LAUNCH.length);
    const board = questBoard('us-ga', 'spring', 2026, georgia);
    expect(board.entries.length).toBeLessThanOrEqual(all.length);
  });

  it('silently drops a species with no printed card rather than inventing one', () => {
    const withGhost = [...georgia, { herbId: 'not-a-card', occurrence: 'confirmed' as const }];
    expect(regionalCollection(withGhost)).toHaveLength(LAUNCH.length);
    const board = questBoard('us-ga', 'spring', 2026, withGhost);
    expect(board.entries.some((e) => e.herbId === 'not-a-card')).toBe(false);
  });
});

describe('the board is deterministic', () => {
  it('gives the same board for the same inputs, every time', () => {
    const a = questBoard('us-ga', 'spring', 2026, georgia);
    const b = questBoard('us-ga', 'spring', 2026, georgia);
    expect(a).toEqual(b);
  });

  it('does not depend on the order the caller supplies species in', () => {
    // Otherwise two devices holding the same data in a different order show different
    // boards, and "one board per region" is false in the one way nobody would check.
    const shuffled = [...georgia].reverse();
    expect(questBoard('us-ga', 'spring', 2026, shuffled))
      .toEqual(questBoard('us-ga', 'spring', 2026, georgia));
  });

  it('changes with the season and the year, and not otherwise', () => {
    const spring = questBoard('us-ga', 'spring', 2026, georgia);
    const summer = questBoard('us-ga', 'summer', 2026, georgia);
    const next = questBoard('us-ga', 'spring', 2027, georgia);
    expect(spring.entries).not.toEqual(summer.entries);
    expect(spring.entries).not.toEqual(next.entries);
  });

  it('reads no clock and no global randomness', () => {
    /*
     * The same rule `seed-packet.test.ts` holds the packet generator to, and for the same
     * reason: a board that consulted the clock would differ between two players standing
     * next to each other, and could not be recomputed offline.
     */
    const source = readFileSync('src/lib/quest-board.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    expect(source).not.toMatch(/Math\.random|Date\.now|new Date/);
  });
});

describe('the tiers', () => {
  const board = questBoard('us-ga', 'spring', 2026, georgia);

  it('never repeats a plant across tiers', () => {
    const ids = board.entries.map((e) => e.herbId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only offers reachable habitats in the starter tier', () => {
    // A quest is an invitation to go somewhere. The first one somebody accepts should not
    // be into a bog or off a path.
    for (const entry of board.entries.filter((e) => e.tier === 'starter')) {
      expect(STARTER_HABITATS as readonly string[])
        .toContain(habitatOf(entry.herbId)?.primary);
    }
  });

  it('keeps the stretch tier to genuinely scarce cards', () => {
    for (const entry of board.entries.filter((e) => e.tier === 'stretch')) {
      const card = PRINTED_CARDS.find((c) => c.id === entry.herbId);
      expect(['Rare', 'Epic']).toContain(card?.rarity);
    }
  });

  it('produces a board for every season of the year', () => {
    // Year-round availability is the product decision; a season that produced an empty
    // board would quietly break it.
    for (const season of ['spring', 'summer', 'autumn', 'winter'] as BoardSeason[]) {
      expect(questBoard('us-ga', season, 2026, georgia).entries.length).toBeGreaterThan(0);
    }
  });
});

describe('progress is derived, never stored', () => {
  const board = questBoard('us-ga', 'spring', 2026, georgia);

  it('counts the discoveries a player already has', () => {
    const none = boardProgress(board, {});
    expect(QUEST_TIERS.every((tier) => none[tier].found === 0)).toBe(true);

    const first = board.entries[0]!;
    const some = boardProgress(board, { [first.herbId]: '2026-01-01' });
    expect(some[first.tier].found).toBe(1);
  });

  it('credits finds made before the board existed', () => {
    // Progress is derived from `discoveries`, so a player who found these last year opens
    // the board with the tier already complete. There is nothing to migrate.
    const all = Object.fromEntries(board.entries.map((e) => [e.herbId, '2025-06-01']));
    const progress = boardProgress(board, all);
    for (const tier of QUEST_TIERS) {
      expect(progress[tier].found).toBe(progress[tier].total);
    }
  });

  it('cannot be double-counted by a repeated discovery', () => {
    // `discoveries` is a record keyed by herb id, so a second find of the same plant is the
    // same key. There is no counter here to increment twice.
    const first = board.entries[0]!;
    const once = boardProgress(board, { [first.herbId]: '2026-01-01' });
    const again = boardProgress(board, { [first.herbId]: '2026-02-02' });
    expect(again).toEqual(once);
  });
});

describe('the board is a lens, not a second collection', () => {
  it('awards nothing and stores nothing', () => {
    /*
     * The single most important constraint. XP tiers are 25 and 250/500, both sized for the
     * existing Field Research; a new award would devalue the tier `Backyard Collection`
     * sits in AND hand every existing player a retroactive total. A quest therefore pays
     * exactly what the find already paid.
     */
    const source = readFileSync('src/lib/quest-board.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    // MATCHED AS IDENTIFIERS, NOT SUBSTRINGS. `export` contains "xp", so a bare
    // `toContain('xp')` fails on correct code — the same naive-substring mistake that made
    // `eligibility` match the tail of `medicinal_eligibility` in identification-schema.
    for (const forbidden of ['xp', 'award', 'localStorage', 'supabase', 'progression']) {
      expect(source, `quest-board must not reference ${forbidden}`)
        .not.toMatch(new RegExp(`\\b${forbidden}\\b`, 'i'));
    }
  });

  it('does not re-litigate the printed deck', () => {
    /*
     * THE CORRECTION THIS TEST EXISTS FOR. An earlier draft filtered the board on
     * `medicinal_eligibility = 'eligible'`, which empties it: every printed card is
     * `pending` until its documentation audit is done. Eligibility gates whether a NEW
     * species may BECOME a published card; it is not a re-trial of cards that are already
     * printed and in people's hands. The board asks whether a card is published and whether
     * its plant occurs here — nothing else.
     */
    const source = readFileSync('src/lib/quest-board.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    expect(source).not.toContain('eligib');
  });
});
