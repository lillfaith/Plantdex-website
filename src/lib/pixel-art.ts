/**
 * HAND-AUTHORED PIXEL ART, AS DATA URIs.
 *
 * Small sprites drawn on a grid with a character palette and rendered as crisp-edged SVG, so
 * a decorative island or icon costs a few hundred bytes and no image file. Nothing here is a
 * plant sprite: those stay the authentic sheets in `public/cards/animated`. This module holds
 * scenery and objects only (islands, books, tools), authored by hand and deterministic.
 */

type Grid = (string | null)[][];

export function gridToUri(grid: Grid): string {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  // One path per colour, run-length encoded along each row, so the string stays small.
  const paths = new Map<string, string[]>();
  for (let y = 0; y < height; y += 1) {
    let x = 0;
    while (x < width) {
      const colour = grid[y]![x] ?? null;
      if (!colour) {
        x += 1;
        continue;
      }
      let end = x;
      while (end < width && grid[y]![end] === colour) end += 1;
      const list = paths.get(colour) ?? [];
      list.push(`M${x} ${y}h${end - x}v1h-${end - x}z`);
      paths.set(colour, list);
      x = end;
    }
  }
  const body = [...paths.entries()]
    .map(([colour, d]) => `<path fill="${colour}" d="${d.join('')}"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;
}

/** Draw rows of characters against a palette; a space is transparent. */
export function fromRows(rows: readonly string[], palette: Record<string, string>): Grid {
  return rows.map((row) => [...row].map((char) => (char === ' ' ? null : (palette[char] ?? null))));
}

// ── The island ───────────────────────────────────────────────────────────────────────────

const ISLAND_W = 44;
const ISLAND_H = 22;

function buildIsland(): Grid {
  const grid: Grid = Array.from({ length: ISLAND_H }, () => Array<string | null>(ISLAND_W).fill(null));
  const put = (x: number, y: number, colour: string) => {
    if (x >= 0 && x < ISLAND_W && y >= 0 && y < ISLAND_H) grid[y]![x] = colour;
  };
  const grassTop = (x: number) => Math.round(3 + (Math.abs(x - ISLAND_W / 2) / (ISLAND_W / 2)) * 5);
  const dirt = ['#8a5a3c', '#6e4528', '#553419'];

  for (let x = 2; x < ISLAND_W - 2; x += 1) {
    const edge = Math.abs(x - ISLAND_W / 2) / (ISLAND_W / 2);
    const top = grassTop(x);
    for (let y = top; y < top + 3; y += 1) put(x, y, y === top ? '#9bdc66' : y === top + 1 ? '#6fcf7e' : '#4a9a48');
    const bottom = Math.round(15 - edge ** 1.4 * 11);
    for (let y = top + 3; y < bottom + 4; y += 1) {
      const depth = y - (top + 3);
      put(x, y, depth < 2 ? dirt[0]! : depth < 6 ? dirt[1]! : dirt[2]!);
      if (y > top + 3 && (x + y) % 7 === 0) put(x, y, dirt[2]!);
    }
  }
  for (let x = 3; x < ISLAND_W - 3; x += 2) {
    put(x, grassTop(x) + 3, '#357f45');
    put(x, grassTop(x) + 4, '#357f45');
  }
  const flower = (x: number, y: number, petal: string, centre: string) => {
    put(x, y, centre);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) put(x + dx, y + dy, petal);
  };
  flower(9, grassTop(9) - 3, '#ff9fcf', '#fff3a0');
  flower(33, grassTop(33) - 3, '#ffffff', '#ffd45c');
  flower(14, grassTop(14) - 2, '#c9a4ff', '#fff3a0');
  flower(28, grassTop(28) - 4, '#ff9fcf', '#fff3a0');
  for (const x of [6, 11, 19, 25, 31, 37]) {
    const y = grassTop(x);
    put(x, y - 1, '#9bdc66');
    put(x, y - 2, '#6fcf7e');
    put(x + 1, y - 1, '#6fcf7e');
  }
  return grid;
}

let islandUri: string | null = null;
/** The floating grass island with flowers and soil. Built once, shared everywhere. */
export function pixelIsland(): string {
  islandUri ??= gridToUri(buildIsland());
  return islandUri;
}
export const ISLAND_ASPECT = `${ISLAND_W} / ${ISLAND_H}`;

// ── A leaf, for the Traditional Uses tiles ───────────────────────────────────────────────

const LEAF_ROWS = [
  '    gg   ',
  '   gGGg  ',
  '  gGGGGg ',
  ' gGGdGGGg',
  ' gGGdGGg ',
  '  gGdGg  ',
  '   gdg   ',
  '    d    ',
];
let leafUri: string | null = null;
export function pixelLeaf(): string {
  leafUri ??= gridToUri(fromRows(LEAF_ROWS, { g: '#2f7a45', G: '#9bdc66', d: '#1f5a37' }));
  return leafUri;
}
export const LEAF_ASPECT = '9 / 8';

// ── Objects for the Learn menu: a botanical book, a magnifier, a mortar and an emblem ────
//
// Drawn with small helpers on a 24x24 grid, then rendered crisp. Hand-authored objects, not
// plants: no sprite is redrawn here.

const N = 24;
function blank(): Grid {
  return Array.from({ length: N }, () => Array<string | null>(N).fill(null));
}
function dot(grid: Grid, x: number, y: number, colour: string) {
  if (x >= 0 && x < N && y >= 0 && y < N) grid[y]![x] = colour;
}
function rect(grid: Grid, x0: number, y0: number, x1: number, y1: number, colour: string) {
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) dot(grid, x, y, colour);
}
function line(grid: Grid, x0: number, y0: number, x1: number, y1: number, colour: string, thick = 1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i += 1) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    for (let dx = 0; dx < thick; dx += 1) for (let dy = 0; dy < thick; dy += 1) dot(grid, x + dx, y + dy, colour);
  }
}
function leaf(grid: Grid, cx: number, cy: number, light: string, dark: string) {
  const rows = ['  ll  ', ' lLLl ', 'lLLLLl', 'lLdLLl', ' lLdl ', '  ld  ', '   d  '];
  rows.forEach((row, ry) =>
    [...row].forEach((char, rx) => {
      if (char === 'l') dot(grid, cx + rx, cy + ry, dark);
      if (char === 'L') dot(grid, cx + rx, cy + ry, light);
      if (char === 'd') dot(grid, cx + rx, cy + ry, dark);
    }),
  );
}
const INK = '#2a1745';

function bookGrid(): Grid {
  const g = blank();
  rect(g, 4, 2, 19, 21, INK); // outline
  rect(g, 5, 3, 18, 20, '#3f9a55'); // cover
  rect(g, 5, 3, 7, 20, '#2f7a45'); // spine
  rect(g, 17, 3, 18, 20, '#357f45'); // right shade
  rect(g, 4, 21, 19, 22, '#f6ecd0'); // pages along the bottom
  rect(g, 5, 22, 18, 22, '#d9c795');
  rect(g, 4, 21, 4, 21, INK);
  rect(g, 19, 21, 19, 21, INK);
  line(g, 4, 23, 19, 23, INK);
  rect(g, 9, 4, 16, 5, '#f0c15a'); // gold title band
  rect(g, 9, 19, 16, 19, '#f0c15a');
  leaf(g, 10, 8, '#bff09a', '#1f5a37');
  rect(g, 17, 11, 18, 13, '#f0c15a'); // clasp
  dot(g, 8, 4, '#f0c15a');
  return g;
}
function magnifierGrid(): Grid {
  const g = blank();
  const cx = 9.5;
  const cy = 9.5;
  for (let y = 0; y < N; y += 1)
    for (let x = 0; x < N; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= 8.2 && d > 6.2) dot(g, x, y, '#f0c15a');
      if (d <= 6.2) dot(g, x, y, '#cfe9f7');
      if ((d <= 8.7 && d > 8.2) || (d <= 6.2 && d > 5.7)) dot(g, x, y, INK);
    }
  line(g, 4, 6, 6, 4, '#ffffff', 1); // glint
  leaf(g, 6, 6, '#6fcf7e', '#1f5a37');
  line(g, 15, 15, 21, 21, INK, 4); // handle
  line(g, 16, 16, 21, 21, '#8a5a3c', 2);
  line(g, 14, 14, 16, 16, '#f0c15a', 3);
  return g;
}
function mortarGrid(): Grid {
  const g = blank();
  // herbs heaped in the bowl
  for (const [x, y] of [[8, 9], [10, 8], [12, 9], [14, 8], [9, 10], [11, 9], [13, 10], [15, 10], [10, 10], [12, 10]] as const)
    dot(g, x, y, y < 10 ? '#9bdc66' : '#4a9a48');
  rect(g, 8, 11, 16, 11, INK); // rim
  rect(g, 7, 11, 17, 12, '#d9c8a8');
  rect(g, 7, 11, 17, 11, '#f1e4c8');
  for (let y = 13; y <= 19; y += 1) {
    const half = 8 - Math.max(0, y - 14);
    rect(g, 12 - half, y, 11 + half, y, y < 17 ? '#c9b79c' : '#a8977c');
  }
  for (let y = 13; y <= 19; y += 1) {
    const half = 8 - Math.max(0, y - 14);
    dot(g, 12 - half - 1, y, INK);
    dot(g, 11 + half + 1, y, INK);
  }
  rect(g, 8, 20, 15, 20, INK);
  rect(g, 6, 12, 6, 12, INK);
  line(g, 15, 9, 20, 2, INK, 3); // pestle
  line(g, 16, 8, 20, 2, '#8a5a3c', 1);
  rect(g, 20, 1, 22, 3, '#8a5a3c');
  rect(g, 19, 0, 23, 0, INK);
  return g;
}
function emblemGrid(): Grid {
  const g = blank();
  for (let y = 1; y <= 22; y += 1) {
    const half = y < 13 ? 9 : Math.max(0, 9 - Math.round((y - 12) * 0.9));
    rect(g, 12 - half - 1, y, 11 + half + 1, y, INK);
  }
  for (let y = 2; y <= 21; y += 1) {
    const half = y < 13 ? 8 : Math.max(0, 8 - Math.round((y - 12) * 0.9));
    if (half > 0) rect(g, 12 - half, y, 11 + half, y, y < 4 ? '#f0c15a' : '#6d3fc4');
  }
  for (let y = 4; y <= 20; y += 1) {
    const half = y < 13 ? 6 : Math.max(0, 6 - Math.round((y - 12) * 0.9));
    if (half > 0) rect(g, 12 - half, y, 11 + half, y, '#3d1f7a');
  }
  rect(g, 11, 6, 12, 13, '#ffe58a'); // exclamation
  rect(g, 11, 15, 12, 16, '#ffe58a');
  leaf(g, 5, 14, '#9bdc66', '#1f5a37');
  return g;
}

const OBJECTS: Record<'book' | 'magnifier' | 'mortar' | 'emblem', () => Grid> = {
  book: bookGrid,
  magnifier: magnifierGrid,
  mortar: mortarGrid,
  emblem: emblemGrid,
};
const objectCache = new Map<string, string>();
/** A 24x24 hand-drawn object for the Learn menu. Built once per object. */
export function pixelObject(name: keyof typeof OBJECTS): string {
  let uri = objectCache.get(name);
  if (!uri) {
    uri = gridToUri(OBJECTS[name]());
    objectCache.set(name, uri);
  }
  return uri;
}
