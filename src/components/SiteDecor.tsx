/**
 * The page's scenery: hills, a star field and leafy sprigs in the corners.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PURELY DECORATIVE AND STRUCTURALLY UNABLE TO BE ANYTHING ELSE. One `aria-hidden` div,
 * `pointer-events-none`, `fixed` behind every layer the app draws. It carries no text, no
 * link and no state, so there is nothing here a reader can miss or a keyboard can reach.
 *
 * IT MAY NOT BRIGHTEN ANYTHING TEXT SITS ON, which is the one real constraint. This repo
 * measures contrast from the COMPOSITED background of the rendered page, not from the
 * stylesheet, and `.panel` surfaces are translucent — so a decoration behind them is a
 * decoration *inside* their contrast calculation. Everything here is therefore drawn from
 * the plum end of the ramp at low alpha, the hills sit below where body copy runs, and the
 * sprigs live in the page margins. The gold specks are 1–3px and the largest is 45% opaque.
 *
 * THE STARS ARE A FIXED LIST, NOT A RANDOM DRAW. `Math.random()` during render gives the
 * server and the client different skies and React replaces the markup on hydration; a seeded
 * generator would cost a module to avoid writing out twenty pairs of numbers. They are
 * written out.
 *
 * NO ANIMATION. The deck's motion rule is that nothing repeats forever, and a twinkling
 * background is the definition of ambient motion — on every page, behind everything anyone
 * is trying to read.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** x%, y%, radius in px, opacity. Hand-placed: scattered, denser high, clear of centre. */
const STARS: [number, number, number, number][] = [
  [4, 12, 2, 0.4], [9, 31, 1, 0.3], [14, 7, 1.5, 0.35], [19, 22, 1, 0.25],
  [23, 44, 2, 0.3], [28, 9, 1, 0.3], [33, 27, 1.5, 0.25], [38, 5, 1, 0.3],
  [44, 17, 1, 0.22], [52, 8, 1.5, 0.3], [58, 20, 1, 0.25], [63, 6, 2, 0.35],
  [68, 29, 1, 0.3], [73, 13, 1.5, 0.3], [79, 24, 1, 0.25], [84, 9, 2, 0.4],
  [88, 34, 1, 0.3], [92, 16, 1.5, 0.35], [96, 27, 1, 0.3], [6, 52, 1, 0.22],
  [11, 68, 1.5, 0.25], [90, 55, 1.5, 0.25], [95, 71, 1, 0.22], [3, 83, 1, 0.2],
];

/** A four-point sparkle, the shape the deck already uses for its gold accents. */
function Sparkle({ x, y, r, o }: { x: number; y: number; r: number; o: number }) {
  return (
    <path
      d={`M ${x} ${y - r} Q ${x + r * 0.22} ${y - r * 0.22} ${x + r} ${y}
          Q ${x + r * 0.22} ${y + r * 0.22} ${x} ${y + r}
          Q ${x - r * 0.22} ${y + r * 0.22} ${x - r} ${y}
          Q ${x - r * 0.22} ${y - r * 0.22} ${x} ${y - r} Z`}
      fill="var(--color-gold-400)"
      opacity={o}
    />
  );
}

/**
 * One leafy sprig, drawn once and placed four times.
 *
 * Leaves alternate along a curved stem and shrink toward the tip, which is what makes a
 * drawn plant read as growing rather than as a row of shapes. Each corner gets the same
 * sprig under a different rotation, so there is one shape to get right instead of four.
 */
function Sprig({ className }: { className: string }) {
  /*
   * SMALL LEAVES, MANY OF THEM, SET ACROSS THE STEM. The first version was six ellipses at
   * a seventh of the sprig's width each, laid nearly ALONG the stem — at 160px in a corner
   * they read as pods on a rope rather than as a vine. A leaf's long axis runs out from the
   * stem, not down it, and a vine is dense: ten leaves tapering toward the tip, each about
   * a tenth of the frame, is the difference between foliage and a diagram of it.
   *
   * [x, y, length, rotation]. Paired down the stem, alternating sides, shrinking to the tip.
   */
  const leaves: [number, number, number, number][] = [
    [20, 76, 11, 52], [26, 80, 10, -14],
    [31, 64, 10, 48], [37, 69, 9, -18],
    [42, 53, 9, 44], [48, 57, 8, -22],
    [53, 42, 8, 40], [59, 45, 7, -26],
    [65, 31, 7, 36], [71, 33, 6, -30],
    [78, 21, 5, 32],
  ];
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <path
        d="M 12 88 Q 38 72 56 52 Q 72 34 86 18"
        fill="none"
        stroke="var(--color-band-leaf)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      {leaves.map(([cx, cy, len, rot], i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={len}
          ry={len * 0.42}
          transform={`rotate(${rot} ${cx} ${cy})`}
          fill={i % 2 ? 'var(--color-band-moss)' : 'var(--color-band-leaf)'}
          opacity="0.7"
        />
      ))}
    </svg>
  );
}

export function SiteDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      {/* THE HILLS. Two soft mounds in plum, darker than the ground they sit on, so the
          foot of the page reads as a horizon rather than as a lighter panel behind text. */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[38vh] w-full"
      >
        <ellipse cx="16" cy="108" rx="58" ry="40" fill="var(--color-plum-700)" opacity="0.9" />
        <ellipse cx="86" cy="112" rx="54" ry="38" fill="var(--color-plum-700)" opacity="0.75" />
        <ellipse cx="50" cy="124" rx="78" ry="38" fill="var(--color-plum-600)" opacity="0.6" />
      </svg>

      {/* THE SKY. */}
      {/*
        THE SKY IS POSITIONED IN PER CENT AND DRAWN IN PIXELS. The first version put the
        stars in a `preserveAspectRatio="none"` viewBox, which stretches the UNITS as well as
        the positions: a radius of 0.22 units over a 1280px viewport is a third of a pixel,
        and the sky rendered empty. Each star is its own tiny absolutely-positioned svg, so
        the placement scales with the page and the shape does not.
      */}
      {STARS.map(([x, y, r, o], i) => (
        <svg
          key={i}
          viewBox="-10 -10 20 20"
          style={{ left: `${x}%`, top: `${y}%`, width: r * 7, height: r * 7, opacity: o }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
        >
          {r >= 2 ? (
            <Sparkle x={0} y={0} r={9} o={1} />
          ) : (
            <circle cx={0} cy={0} r={4} fill="var(--color-gold-300)" />
          )}
        </svg>
      ))}

      {/* THE CORNERS. Hidden below `sm`: on a 390px phone the margins these sit in do not
          exist, and a sprig would be underneath the text rather than beside it. */}
      <Sprig className="absolute top-0 left-0 hidden h-24 w-24 -scale-y-100 opacity-70 sm:block lg:h-28 lg:w-28" />
      <Sprig className="absolute top-0 right-0 hidden h-24 w-24 -scale-100 opacity-70 sm:block lg:h-28 lg:w-28" />
      <Sprig className="absolute bottom-0 left-0 hidden h-28 w-28 opacity-75 sm:block lg:h-32 lg:w-32" />
      <Sprig className="absolute right-0 bottom-0 hidden h-28 w-28 scale-x-[-1] opacity-75 sm:block lg:h-32 lg:w-32" />
    </div>
  );
}
