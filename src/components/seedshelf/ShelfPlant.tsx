import { pixelRuns } from '@/lib/pixel-runs';

/**
 * A potted plant standing on the shelf.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT IS FURNITURE DRESSING, AND IT SAYS NOTHING. These pots are not species, are not
 * findable, are not a card, and carry no name — a shelf in a room has plants on it, and that
 * is the whole claim. They are `aria-hidden` for exactly that reason: there is nothing here
 * for a screen reader to be told, and announcing "potted plant" twice before the packets
 * would bury the only content on the page that means anything.
 *
 * This is also why none of the three is drawn as a recognisable species. The rule against
 * invented botany does not stop at data: a decorative pot shaped like a real plant would read
 * as a claim about that plant, on the one page whose entire job is the difference between "a
 * card" and "something we have no card for". A bush, a sprig and a trailer are shapes.
 *
 * WHY PIXELS RATHER THAN AN IMAGE. The same reason `SeedPacket` is an SVG: the packets beside
 * these are drawn from a grid at render time, all 45 sprites are pixel art, and a smooth
 * vector pot standing among them would be the one object on the shelf from a different world.
 * Same idiom, same `crispEdges`, same run-length trick, and the same rule that every colour
 * resolves to a deck token rather than to a hex value.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/*
 * THE POT OCCUPIES THE SAME ROWS IN ALL THREE, and it has to: two pots side by side on one
 * board with their rims at different heights would read as a rendering bug rather than as two
 * plants. Foliage gets rows 0-10 and the pot rows 11-17, so a variant is authored by writing
 * eleven rows and appending this. `seed-shelf-decor.test.ts` fails on a ragged or short one.
 */
const POT = [
  '..rrrrrrrrrrrr..',
  '..rrrrrrrrrrrr..',
  '...pppppppppp...',
  '...pppppppppp...',
  '....pppppppp....',
  '....pppppppp....',
  '.....kkkkkk.....',
];

/** Bushy: a full round crown, the shape of something that has been on the shelf a while. */
const BUSHY = [
  '................',
  '.....d....d.....',
  '....dll..lld....',
  '...dlllllllld...',
  '..dlllllllllld..',
  '..dlllllllllld..',
  '...dlllllllld...',
  '....dllllld.....',
  '......dsd.......',
  '.......s........',
  '.......s........',
  ...POT,
];

/** Sprig: upright and sparse, with a bud — the tallest thing on any board. */
const SPRIG = [
  '.......f........',
  '......fff.......',
  '.......s........',
  '....dlls........',
  '.....dls........',
  '.......slld.....',
  '.......sllld....',
  '...dllls........',
  '....dlls........',
  '.......s........',
  '.......s........',
  ...POT,
];

/** Trailer: a low mound that overhangs the rim on both sides. */
const TRAILER = [
  '................',
  '.....dllld......',
  '...dlllllllld...',
  '.dlllllllllllld.',
  '.dlllllllllllld.',
  '..dlllllllllld..',
  '...ddlllllldd...',
  '.......ss.......',
  '.......ss.......',
  '.......ss.......',
  '.......ss.......',
  ...POT,
];

export const SHELF_PLANTS = [BUSHY, SPRIG, TRAILER];

const token = (name: string) => `var(--color-${name})`;

/*
 * Leaves are the woodland habitat green and the pot is the wayside clay — both already in the
 * palette — and every other shade is one of those two mixed toward a ground the deck also
 * owns, exactly as a packet's second paper tone is. So a palette change moves the pots with
 * the rest of the site, and no shade exists on this page only for the pots.
 */
const FILL: Record<string, string> = {
  l: token('habitat-woodland'),
  d: `color-mix(in srgb, ${token('habitat-woodland')} 62%, ${token('plum-950')})`,
  s: `color-mix(in srgb, ${token('habitat-woodland')} 55%, ${token('wood-700')})`,
  f: token('gold-400'),
  r: token('habitat-wayside'),
  p: `color-mix(in srgb, ${token('habitat-wayside')} 80%, ${token('wood-600')})`,
  k: `color-mix(in srgb, ${token('habitat-wayside')} 42%, ${token('plum-950')})`,
};

export function ShelfPlant({ variant, className = '' }: { variant: number; className?: string }) {
  /* Wraps rather than clamps, so a caller may pass a running index without doing the maths. */
  const count = SHELF_PLANTS.length;
  const grid = SHELF_PLANTS[((variant % count) + count) % count]!;

  return (
    <svg
      viewBox={`0 0 ${grid[0]!.length} ${grid.length}`}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
      className={`h-auto w-full ${className}`}
    >
      {grid.map((row, y) =>
        pixelRuns(row).map(({ x, width, cell }) =>
          cell === '.' ? null : (
            <rect key={`${y}-${x}`} x={x} y={y} width={width} height={1} fill={FILL[cell]} />
          ),
        ),
      )}
    </svg>
  );
}
