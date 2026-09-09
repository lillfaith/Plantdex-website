import { describe, expect, it } from 'vitest';

import { packetsIn, planShelfRows, potCount } from './shelf-layout';
import type { SeedShelfEntry } from './seed-shelf';

/**
 * The decorative pots are the only thing on the Seed Shelf that is not a player's data, and
 * these tests exist to keep it that way. A pot that displaced a packet would be a visual
 * flourish losing somebody's collection, which is exactly the class of bug a screenshot
 * cannot catch: the shelf would look better and hold less.
 */

const entry = (n: number): SeedShelfEntry =>
  ({
    speciesKey: `species-${n}`,
    scientificName: `Testus numero${n}`,
    commonName: `Test ${n}`,
    firstFoundAt: '2026-01-01T00:00:00.000Z',
  }) as unknown as SeedShelfEntry;

const many = (n: number) => Array.from({ length: n }, (_, i) => entry(i));

describe('every packet survives the layout', () => {
  for (const columns of [3, 5]) {
    it(`keeps every entry exactly once, in order, at ${columns} across`, () => {
      for (let count = 1; count <= 40; count++) {
        const rows = planShelfRows(many(count), columns);
        const laid = packetsIn(rows);
        expect(laid, `${count} entries at ${columns} across`).toHaveLength(count);
        // Order preserved: the layout dresses a shelf, it does not re-sort a collection.
        expect(laid.map((e) => e.speciesKey)).toEqual(many(count).map((e) => e.speciesKey));
      }
    });

    it(`costs rows for its dressing, but a bounded number at ${columns} across`, () => {
      // THE HONEST INVARIANT, and it took a failing test to find it. A pot standing BETWEEN
      // packets necessarily occupies a slot, so a dressed shelf uses more rows than a bare
      // one — there is no arrangement where both are true. What must never happen is a
      // packet going undisplayed or out of order, which the test above pins exactly.
      //
      // What is bounded here is the cost. The thinnest pattern still seats `columns - 2`
      // packets, so dressing can never do worse than that, and a shelf cannot quietly grow
      // to twice the scrolling for decoration.
      const thinnest = columns - 2;
      for (let count = 1; count <= 40; count++) {
        const rows = planShelfRows(many(count), columns);
        expect(rows.length, `${count} entries at ${columns} across`).toBeLessThanOrEqual(
          Math.ceil(count / thinnest),
        );
        // And never fewer than physically possible.
        expect(rows.length).toBeGreaterThanOrEqual(Math.ceil(count / columns));
      }
    });

    it(`never overflows a row at ${columns} across`, () => {
      for (let count = 0; count <= 40; count++) {
        for (const row of planShelfRows(many(count), columns)) {
          expect(row).toHaveLength(columns);
        }
      }
    });
  }
});

describe('pots are furniture', () => {
  it('never counts toward anything a player owns', () => {
    const rows = planShelfRows(many(7), 5);
    // Seven saved species stay seven, whatever the shelf drew around them.
    expect(packetsIn(rows)).toHaveLength(7);
    expect(potCount(rows)).toBeGreaterThan(0);
    expect(packetsIn(rows).length + potCount(rows)).toBe(rows.length * 5);
  });

  it('dresses an empty shelf rather than leaving a bare plank', () => {
    const rows = planShelfRows([], 5);
    expect(rows).toHaveLength(1);
    expect(packetsIn(rows)).toHaveLength(0);
    expect(potCount(rows)).toBe(5);
  });

  it('drops its dressing rather than spill a nearly-full row', () => {
    // Five entries at five across must occupy ONE row. Pattern A would only hold four, so
    // the pattern gives way — packets first, always.
    const rows = planShelfRows(many(5), 5);
    expect(rows).toHaveLength(1);
    expect(potCount(rows)).toBe(0);
  });

  it('varies the composition instead of stamping one row shape', () => {
    // A long shelf should not look mechanical: across its rows more than one pot
    // arrangement should appear.
    const rows = planShelfRows(many(60), 5);
    const shapes = new Set(
      rows.map((row) =>
        row.map((slot) => (slot.kind === 'plant' ? 'o' : '.')).join(''),
      ),
    );
    expect(shapes.size).toBeGreaterThan(1);
  });
});
