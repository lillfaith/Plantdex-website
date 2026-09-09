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
 * This is also why none of them is drawn as a recognisable species. The rule against invented
 * botany does not stop at data: a decorative pot shaped like a real plant would read as a
 * claim about that plant, on the one page whose entire job is the difference between "a card"
 * and "something we have no card for". These are ARCHETYPES — a fern shape, a grass shape, a
 * berrying shape — the vocabulary a botanical illustrator uses before knowing the species.
 *
 * WHY PIXELS RATHER THAN AN IMAGE. The same reason `SeedPacket` is an SVG: the packets beside
 * these are drawn from a grid at render time, all 45 sprites are pixel art, and a smooth
 * vector pot standing among them would be the one object on the shelf from a different world.
 * Same idiom, same `crispEdges`, same run-length trick, and the same rule that every colour
 * resolves to a deck token rather than to a hex value.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/*
 * THE POT OCCUPIES THE SAME ROWS IN EVERY ARCHETYPE, and it has to: two pots side by side on
 * one board with their rims at different heights would read as a rendering bug rather than as
 * two plants. Foliage gets rows 0-12 and the pot rows 13-19, so a variant is authored by
 * writing thirteen rows and appending this. `seed-shelf-decor.test.ts` fails on a ragged one.
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

/** Bushy herb: a full round crown, the shape of something long established. */
const BUSHY = [
  '................',
  '................',
  '.....d....d.....',
  '....dll..lld....',
  '...dlllllllld...',
  '..dlllllllllld..',
  '.dlllllllllllld.',
  '..dlllllllllld..',
  '...dlllllllld...',
  '....dlllllld....',
  '......dsd.......',
  '.......s........',
  '.......s........',
  ...POT,
];

/** Flowering stalk: one upright stem carrying a head of bloom. */
const FLOWERING_STALK = [
  '.......f........',
  '......fff.......',
  '.....fffff......',
  '......fff.......',
  '.......f........',
  '.......s........',
  '....dlls........',
  '.....dls........',
  '.......slld.....',
  '.......sllld....',
  '...dllls........',
  '.......s........',
  '.......s........',
  ...POT,
];

/** Fern: paired pinnae stepping down a central rachis. */
const FERN = [
  '.......s........',
  '......lsl.......',
  '.....llsll......',
  '....l.ls.l......',
  '....ll.s.ll.....',
  '...lll.s.lll....',
  '..ll.l.s.l.ll...',
  '..lll..s..lll...',
  '.ll.l..s..l.ll..',
  '.lll...s...lll..',
  '.l.....s.....l..',
  '.......s........',
  '.......s........',
  ...POT,
];

/** Grass / reed: a tuft of blades leaning apart. */
const GRASS = [
  '.d...l....l...d.',
  '.d...l....l..d..',
  '.dl..l...l...d..',
  '..d..l...l..dl..',
  '..d.ll...l..d...',
  '..dl.l..ll.dl...',
  '...d.l..l..d....',
  '...dll..l.dl....',
  '....dl.ll.d.....',
  '....dl.l..d.....',
  '.....dllld......',
  '......sss.......',
  '.......s........',
  ...POT,
];

/** Rosette: a low flat whorl, leaves radiating from the centre. */
const ROSETTE = [
  '................',
  '................',
  '................',
  '......ddd.......',
  '....dllllld.....',
  '..ddlllllllldd..',
  '.dlllllllllllld.',
  '.dlllllllllllld.',
  '..ddlllllllldd..',
  '....dllllllld...',
  '......ddd.......',
  '.......s........',
  '.......s........',
  ...POT,
];

/** Vine: a trailer overhanging the rim on both sides. */
const VINE = [
  '................',
  '.....dllld......',
  '...dlllllllld...',
  '.dlllllllllllld.',
  '.dlllllllllllld.',
  '..dlllllllllld..',
  'l..ddlllllldd..l',
  'll.....ss.....ll',
  '.l.....ss.....l.',
  '.......ss.......',
  '.......ss.......',
  '.......ss.......',
  '.......ss.......',
  ...POT,
];

/** Broadleaf: two or three big paddle leaves, the boldest silhouette here. */
const BROADLEAF = [
  '................',
  '...dd......dd...',
  '..dlld....dlld..',
  '.dlllld..dlllld.',
  '.dllllld.dlllld.',
  '.dlllllldllllld.',
  '..dllllldlllld..',
  '...dlllldllld...',
  '.....dllsdd.....',
  '.......s........',
  '.......s........',
  '.......s........',
  '.......s........',
  ...POT,
];

/** Shrub: a woody frame with foliage massed at the top. */
const SHRUB = [
  '................',
  '....dl..ld......',
  '...dlll.llld....',
  '..dllllllllld...',
  '..dllllllllld...',
  '...dlllllllld...',
  '....dl.s.lld....',
  '.....s.s.s......',
  '......sss.......',
  '.......s........',
  '.......s........',
  '.......s........',
  '.......s........',
  ...POT,
];

/** Berrying: an arching spray with fruit hanging under the leaves. */
const BERRYING = [
  '................',
  '....dll..lld....',
  '...dlllllllld...',
  '..dlllllllllld..',
  '...dlllllllld...',
  '....f.d.d.f.....',
  '...fff.s.fff....',
  '....f..s..f.....',
  '.......s........',
  '.....f.s.f......',
  '....fff.fff.....',
  '.....f.s.f......',
  '.......s........',
  ...POT,
];

/** Tall flower: the tallest thing on any board, a spike of florets. */
const TALL_FLOWER = [
  '.......f........',
  '......fff.......',
  '.......f........',
  '......fff.......',
  '.......f........',
  '......fff.......',
  '.......s........',
  '.....dls........',
  '......ds........',
  '.......sld......',
  '.......sd.......',
  '.......s........',
  '.......s........',
  ...POT,
];

/**
 * Every archetype, in a fixed order.
 *
 * The order is load-bearing: a variant index picks from here, so reordering would repaint
 * every shelf. Append rather than insert.
 */
export const SHELF_PLANTS = [
  BUSHY,
  FLOWERING_STALK,
  FERN,
  GRASS,
  ROSETTE,
  VINE,
  BROADLEAF,
  SHRUB,
  BERRYING,
  TALL_FLOWER,
];

const token = (name: string) => `var(--color-${name})`;

/**
 * FOLIAGE, BLOOM AND CLAY COME IN SETS, and a plant picks one set rather than three shades.
 *
 * The first version had one green, one gold and one clay for all three pots, which is how a
 * shelf of plants ends up looking like one plant stamped repeatedly. These are the packet
 * botanicals — the same tokens the packets beside them are drawn from, so the dressing and
 * the collection stay one world — and every shade is either a token or one mixed toward a
 * ground the deck already owns.
 */
export const FOLIAGE = [
  'habitat-woodland',
  'band-leaf',
  'band-moss',
  'band-teal',
  'paper-fern',
  'paper-moss',
] as const;

export const BLOOM = [
  'gold-400',
  'band-gold',
  'band-amber',
  'band-berry',
  'pink-accent',
  'mystery-violet',
  'paper-cream',
] as const;

export const CLAY = ['habitat-wayside', 'paper-clay', 'wood-400', 'band-bark'] as const;

function fillFor(leaf: string, bloom: string, clay: string): Record<string, string> {
  return {
    l: token(leaf),
    d: `color-mix(in srgb, ${token(leaf)} 62%, ${token('plum-950')})`,
    s: `color-mix(in srgb, ${token(leaf)} 55%, ${token('wood-700')})`,
    f: token(bloom),
    r: token(clay),
    p: `color-mix(in srgb, ${token(clay)} 80%, ${token('wood-600')})`,
    k: `color-mix(in srgb, ${token(clay)} 42%, ${token('plum-950')})`,
  };
}

/** Kept for the decor test, which checks every cell an archetype uses is paintable. */
export const FILL: Record<string, string> = fillFor(FOLIAGE[0], BLOOM[0], CLAY[0]);

/*
 * Three co-prime-ish strides so foliage, bloom and pot do not march in step. Walking the
 * variant index through all three with the same stride would give six recognisable
 * combinations forever; stepping them differently gives the shelf real variety without a
 * random number anywhere near it — these must stay deterministic, like everything else here.
 */
export function ShelfPlant({ variant, className = '' }: { variant: number; className?: string }) {
  /* Wraps rather than clamps, so a caller may pass a running index without doing the maths. */
  const wrap = (n: number, len: number) => ((n % len) + len) % len;
  const grid = SHELF_PLANTS[wrap(variant, SHELF_PLANTS.length)]!;
  const fill = fillFor(
    FOLIAGE[wrap(variant * 3 + 1, FOLIAGE.length)]!,
    BLOOM[wrap(variant * 5 + 2, BLOOM.length)]!,
    CLAY[wrap(variant * 7, CLAY.length)]!,
  );

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
            <rect key={`${y}-${x}`} x={x} y={y} width={width} height={1} fill={fill[cell]} />
          ),
        ),
      )}
    </svg>
  );
}
