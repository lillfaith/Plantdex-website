/**
 * One row of a pixel grid, collapsed into runs of identical cells.
 *
 * Shared rather than copied because two things on the Seed Shelf are drawn this way now —
 * the generated packets and the potted plants standing beside them — and a second
 * hand-written copy of a loop like this is how the two would eventually disagree about what
 * an empty cell is.
 *
 * WHY RUNS AT ALL: a packet is 252 cells and a shelf holds dozens of them, so emitting one
 * `<rect>` per cell puts tens of thousands of nodes on the page. Per run it is a few
 * hundred, and the drawing is identical because every cell in a run has the same fill.
 */
export type PixelRun = { x: number; width: number; cell: string };

export function pixelRuns(row: string): PixelRun[] {
  const out: PixelRun[] = [];
  let start = 0;
  for (let x = 1; x <= row.length; x += 1) {
    if (x === row.length || row[x] !== row[start]) {
      out.push({ x: start, width: x - start, cell: row[start]! });
      start = x;
    }
  }
  return out;
}
