import type { SeedShelfEntry } from './seed-shelf';

/**
 * HOW PACKETS AND DECORATIVE POTS ARE ARRANGED ON THE SHELF.
 *
 * Pure, and separate from the view, because there is one invariant here that a component
 * cannot be trusted to keep by eye: a pot must never take a place a packet needed. The
 * shelf is somebody's collection; furniture that pushed a saved species onto another row —
 * or worse, off the end — would be a decorative feature quietly losing data.
 *
 * What that means precisely, because a first attempt here got it wrong and a test caught it:
 * a pot standing BETWEEN packets does occupy a slot, so a dressed shelf uses more rows than
 * a bare one. There is no arrangement where both are true. What must never happen — and what
 * `shelf-layout.test.ts` pins — is a packet going undisplayed, duplicated, reordered, or
 * pushed off the end, and the row cost being unbounded. A pot is furniture; it can take a
 * place on the plank, never a place in the collection.
 *
 * WHY A PATTERN AT ALL. A wall of packets three across reads as a spreadsheet of paper. The
 * rhythms below break that up the way a real shelf does — a plant standing between two
 * groups — and they cycle rather than repeating, so a long shelf does not look stamped.
 */

export type ShelfSlot =
  | { kind: 'packet'; entry: SeedShelfEntry }
  | { kind: 'plant'; variant: number };

export type ShelfRow = readonly ShelfSlot[];

/**
 * Where the pots go, per row shape, as slot indices.
 *
 * Read them as the compositions they are:
 *   A — packet packet POT packet packet   (a plant breaking the middle)
 *   B — packet POT packet POT packet      (an airier row, for variety)
 *   C — packet packet packet packet packet (no dressing; the collection carries it)
 *
 * A row never uses a pattern that would leave it holding fewer packets than it has to.
 */
const POT_PATTERNS: Record<number, readonly (readonly number[])[]> = {
  // Five across: the desktop rhythm the shelf is designed around.
  5: [[2], [1, 3], [], [2], []],
  // Three across: the same idea at phone width, where two pots in a row of three would be
  // more furniture than collection.
  3: [[2], [], [1], []],
};

/** How many packets a row can hold once its pattern has claimed slots. */
function packetCapacity(columns: number, pattern: readonly number[]): number {
  return columns - pattern.length;
}

/**
 * Lay entries out into rows of `columns` slots, dressing the gaps with pots.
 *
 * `entries` keeps its given order — the caller decides sorting, and a layout function that
 * reordered a collection would be making a product decision in the wrong place.
 */
export function planShelfRows(
  entries: readonly SeedShelfEntry[],
  columns: number,
): ShelfRow[] {
  const patterns = POT_PATTERNS[columns] ?? [[]];
  const rows: ShelfRow[] = [];
  let index = 0;
  let rowNumber = 0;

  // An empty shelf is still a shelf: one row of pure furniture, so the page shows a piece of
  // the world rather than a notice floating in space.
  if (entries.length === 0) {
    return [Array.from({ length: columns }, (_, slot) => ({ kind: 'plant', variant: slot }))];
  }

  while (index < entries.length) {
    const pattern = patterns[rowNumber % patterns.length] ?? [];
    const capacity = packetCapacity(columns, pattern);
    const remaining = entries.length - index;

    // THE CAPACITY RULE. If this row's pattern cannot hold what is left, and a plainer
    // pattern could, the packets win and the dressing is dropped. Pots fill gaps; they never
    // create them.
    const potSlots = remaining > capacity && remaining <= columns ? [] : pattern;
    const usable = columns - potSlots.length;
    const take = Math.min(usable, remaining);

    const slots: ShelfSlot[] = [];
    let taken = 0;
    for (let slot = 0; slot < columns; slot++) {
      if (potSlots.includes(slot)) {
        slots.push({ kind: 'plant', variant: rowNumber * columns + slot });
        continue;
      }
      if (taken < take) {
        slots.push({ kind: 'packet', entry: entries[index + taken] as SeedShelfEntry });
        taken += 1;
        continue;
      }
      // Trailing gap on the final row — dress it rather than leaving a plank half bare.
      slots.push({ kind: 'plant', variant: rowNumber * columns + slot });
    }

    rows.push(slots);
    index += take;
    rowNumber += 1;
  }

  return rows;
}

/** Every packet on the shelf, in row order. Used by tests and by nothing else. */
export function packetsIn(rows: readonly ShelfRow[]): SeedShelfEntry[] {
  return rows.flatMap((row) =>
    row.filter((slot): slot is Extract<ShelfSlot, { kind: 'packet' }> => slot.kind === 'packet')
      .map((slot) => slot.entry),
  );
}

/** How many decorative pots a layout drew. Never a count of anything a player owns. */
export function potCount(rows: readonly ShelfRow[]): number {
  return rows.reduce(
    (total, row) => total + row.filter((slot) => slot.kind === 'plant').length,
    0,
  );
}
