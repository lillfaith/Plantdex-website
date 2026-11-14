/**
 * THE SMALL ARTWORK OF THE CHALLENGE SCREENS, drawn as pixel grids in inline SVG.
 *
 * Every icon is a few rows of characters: `#` paints in the surrounding text colour and `o` in
 * the dark accent, so one grid serves every state by changing a class. No image file, no
 * script, no animation of its own, and `aria-hidden` throughout: the word beside each icon
 * carries the meaning. Rects use `crispEdges`, which keeps the pixel look at any size.
 */
const GRIDS = {
  leaf: [
    '......##',
    '....####',
    '..###o##',
    '.###o###',
    '###o###.',
    '##o###..',
    '#o##....',
    '#.......',
  ],
  pair: [
    '.###...###.',
    '##o##.##o##',
    '.###...###.',
    '..#.....#..',
    '..#.....#..',
  ],
  tree: [
    '...#...',
    '..###..',
    '.#####.',
    '..###..',
    '.#####.',
    '#######',
    '...#...',
    '...#...',
  ],
  crown: [
    '#...#...#',
    '##.###.##',
    '#########',
    '#########',
    '#########',
  ],
  lock: [
    '..###..',
    '.#...#.',
    '.#...#.',
    '#######',
    '#######',
    '###o###',
    '#######',
    '#######',
  ],
  check: [
    '......#',
    '.....##',
    '#...##.',
    '##.##..',
    '.###...',
    '..#....',
  ],
  bloom: [
    '..###..',
    '.#####.',
    '###o###',
    '#######',
    '.#####.',
    '..###..',
  ],
  bud: [
    '.......',
    '..###..',
    '.#####.',
    '.#####.',
    '..###..',
    '...#...',
    '...#...',
  ],
  sprout: [
    '.......',
    '.##.##.',
    '#######',
    '.#####.',
    '...#...',
    '...#...',
  ],
  star: [
    '...#...',
    '...#...',
    '#######',
    '.#####.',
    '..###..',
    '.##.##.',
    '.#...#.',
  ],
} as const;

export type ArtName = keyof typeof GRIDS;

export function Art({
  name,
  className = 'h-6 w-6',
  accent = 'fill-plum-900',
}: {
  name: ArtName;
  className?: string;
  /** Fill class for the `o` cells. */
  accent?: string;
}) {
  const rows: readonly string[] = GRIDS[name];
  const width = Math.max(...rows.map((row) => row.length));
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${rows.length}`}
      className={className}
      shapeRendering="crispEdges"
    >
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === '.' ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1.02"
              height="1.02"
              className={cell === 'o' ? accent : 'fill-current'}
            />
          ),
        ),
      )}
    </svg>
  );
}
