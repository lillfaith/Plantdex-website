import { pixelRuns } from '@/lib/pixel-runs';

/**
 * A small pixel creature holding a magnifying glass, on the scan page.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT IS DRESSING, AND IT IS NOT A SPECIES. Same rule the Seed Shelf's potted plants keep:
 * the ban on invented botany does not stop at data, and a decorative creature shaped like a
 * recognisable plant would read as a claim about that plant — on the one page whose whole
 * job is telling somebody that a photograph is a SUGGESTION and not an identification. So it
 * is an archetype: a round leafy head, two leaves, a stem. Nothing you could look up.
 *
 * It is `aria-hidden` for the same reason the pots are. There is nothing here to tell a
 * screen reader, and "pixel creature with a magnifying glass" announced above the safety
 * caution would push the only words on this page that matter further down the list.
 *
 * WHY NOT A REAL SPRITE. `sprites.json` is keyed by herb id, every entry is a species with
 * an authored trademark gesture, and `audit_sprites.py` checks all 54 against the deck.
 * Putting a magnifying glass in that system would mean either giving one species a prop the
 * other 53 lack, or minting a 55th "species" that is not a plant. Drawn here instead, in the
 * idiom the shelf decor already established: a character grid, run-length `<rect>`s,
 * `crispEdges`, and every colour resolving to a deck token rather than a hex value.
 *
 * THE SWAY LOOPS, WHICH THE FOUR ONE-SHOT MOMENTS IN `globals.css` DO NOT. That rule is
 * about UI effects — a bar, a crossfade, a readiness pip — where repetition is ambient noise
 * dressed as feedback. This is a CREATURE IDLE, and every one of the 54 plant sprites loops
 * forever by the same logic: a living thing that freezes when you look at it is the strange
 * one. It is listed explicitly in the reduced-motion block rather than left to the global
 * 0.01ms collapse, same as everything else that moves here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/*
 * AUTHORED ON THE DECK'S OWN CELL: 34 x 28.
 *
 * That is exactly what `build_sprites.py` emits, at 170x140 with `SCALE = 5`. It was drawn
 * 26 x 22 first, which looks like an arbitrary choice and is not: at any given rendered
 * width a coarser grid makes each authored pixel BIGGER, so the one decorative creature in
 * the app was the one thing on screen at a different resolution from all 54 real ones —
 * ~30% chunkier pixels, beside a nav and a card grid full of the finer kind. Matching the
 * cell is what makes it read as the same hand. The extra rows also buy the face enough room
 * for 2x2 eyes, which a 22-row canvas could not carry without crowding the mouth.
 *
 * Every cell is COMPUTED rather than hand-placed — see `build_structures.py` for the same
 * argument. Four hand-drawn attempts produced a face that read as a skull and a lens that
 * read as a lollipop, because a circle typed one row at a time is a circle nobody measured.
 * The geometry is two discs, a swept blade pair, a line for the arm and a line for the
 * handle, with one automatic pass laying a dark cell against every drawn edge.
 *
 * THE LENS IS HELD AT BROW HEIGHT, NOT BESIDE THE FACE. At face height and near face size
 * it read as a second head — the same failure the coneflower's rays had, a composition
 * problem rather than a numbers one. Raised and shrunk, it is plainly an object being held
 * up to look through, which is the whole point of putting it on this page.
 *
 *   l/d  leaf, lit and shadowed      m  lens rim (metal)
 *   s    stem                        g  lens glass
 *   a    arm                         F  face, and the specular streak on the glass
 *   h    handle                      e  eye
 *                                    o  outline
 */
const SCOUT = [
  '..................................',
  '....................ooo...........',
  '................ooooodooooo.......',
  '...ooooooooo...oodddddddddoo......',
  '..oommmmmmmoooooddlllllllddooo....',
  '..omFFggggmmooddlllllllllllddo....',
  '.oomFggggggmoodllllllllllllldoo...',
  '.ommgggggggmmddlllllllllllllddo...',
  '.omgggggggggmdlllllFFFFFllllldo...',
  '.ommgggggggmmdlllFFFFFFFFFllldoo..',
  '.oomgggggggmddlllFFFFFFFFFlllddo..',
  '..ommgggggmmodllFFeeFFFeeFFlldoo..',
  '..oommmmmmmoodllFFeeFFFeeFFlldo...',
  '...ooooooohhoddlFFFFFFFFFFFlddo...',
  '.........ohhhodllFFFmmmFFFlldoo...',
  '.........oohhhddllFFFFFFFllddo....',
  '..........oohhhoddlFFFFFlddooo....',
  '...........oohhhodddddddddoo......',
  '............oohhaaaosdsoooo.......',
  '.............ooaaaaassso..........',
  '..............ooooaasssooooo......',
  '............oooollllssslllloooo...',
  '..........ooollllllosssollllllooo.',
  '..........ollllllloosssoolllllllo.',
  '..........ollllllooosssooollllllo.',
  '..........ooddddoooosssooooddddoo.',
  '...........oodddddddooodddddddoo..',
  '............ooooooooo.ooooooooo...',
];

const token = (name: string) => `var(--color-${name})`;

/*
 * Leaf and stem come from the same tokens the shelf decor and the packets draw from, so the
 * dressing across the app stays one world. The lens is gold-on-glass rather than a grey
 * metal: grey is the one family this palette does not own, and a grey prop beside a violet
 * page reads as clip art from somewhere else.
 */
const FILL: Record<string, string> = {
  l: token('band-leaf'),
  d: `color-mix(in srgb, ${token('band-leaf')} 62%, ${token('plum-950')})`,
  a: `color-mix(in srgb, ${token('band-leaf')} 55%, ${token('wood-700')})`,
  s: token('band-moss'),
  F: token('paper-cream'),
  e: token('plum-950'),
  m: token('gold-400'),
  h: `color-mix(in srgb, ${token('gold-400')} 60%, ${token('wood-600')})`,
  g: `color-mix(in srgb, ${token('mystery-violet')} 45%, ${token('paper-cream')})`,
  o: `color-mix(in srgb, ${token('plum-950')} 78%, ${token('violet-900')})`,
};

export function ScanScout({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${SCOUT[0]!.length} ${SCOUT.length}`}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
      /*
       * NO WIDTH OF ITS OWN. `w-full` here and `w-16` from the caller are both one-class
       * utilities, so neither wins on specificity and whichever Tailwind emits last decides
       * — which made this render 367px wide instead of 64. The caller sizes it; this only
       * keeps the aspect ratio.
       */
      className={`scan-scout h-auto ${className}`}
    >
      {SCOUT.map((row, y) =>
        pixelRuns(row).map(({ x, width, cell }) =>
          cell === '.' ? null : (
            <rect key={`${y}-${x}`} x={x} y={y} width={width} height={1} fill={FILL[cell]} />
          ),
        ),
      )}
    </svg>
  );
}
