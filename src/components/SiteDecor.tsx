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

/** A small five-petal blossom with a gold eye, the shape the deck's own art uses. */
function Bloom({ x, y, r, petal }: { x: number; y: number; r: number; petal: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx={0}
          cy={-r * 0.62}
          rx={r * 0.42}
          ry={r * 0.58}
          transform={`rotate(${a})`}
          fill={petal}
        />
      ))}
      <circle cx={0} cy={0} r={r * 0.3} fill="var(--color-gold-400)" />
    </g>
  );
}

/**
 * A TOP CORNER: a vine that runs along the edge, not a frond that dives into the page.
 *
 * The mockup's top corners are horizontal — a stem hugging the top edge with rounded leaves
 * set either side of it and a blossom or two along its length. That is a different plant
 * from the diagonal fern that was here, and the difference is structural rather than a
 * matter of size: a frond angled at 45° points AT the content and the eye follows it
 * inward, while a vine along the edge frames the page and stays out of the way. The leaves
 * are round rather than lance-shaped for the same reason the sprites are blunt: this world
 * is drawn soft.
 */
function VineCorner({ className }: { className: string }) {
  /** [x, y, radius, rotation] — alternating above and below a stem that sags gently. */
  const leaves: [number, number, number, number][] = [
    [14, 24, 9, -28], [22, 34, 8, 34], [31, 22, 9, -24], [40, 33, 8, 30],
    [49, 24, 8, -22], [58, 34, 7, 28], [67, 27, 7, -20], [76, 35, 6, 24],
    [85, 30, 5, -18],
  ];
  return (
    <svg viewBox="0 0 100 60" className={className} aria-hidden="true" focusable="false">
      <path
        d="M -2 20 Q 24 34 52 28 Q 76 23 96 32"
        fill="none"
        stroke="var(--color-band-leaf)"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.8"
      />
      {leaves.map(([cx, cy, r, rot], i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={r}
          ry={r * 0.74}
          transform={`rotate(${rot} ${cx} ${cy})`}
          fill={i % 2 ? 'var(--color-band-moss)' : 'var(--color-band-leaf)'}
          opacity="0.85"
        />
      ))}
      <Bloom x={9} y={13} r={5} petal="var(--color-violet-100)" />
      <Bloom x={44} y={18} r={4} petal="var(--color-pink-accent)" />
    </svg>
  );
}

/**
 * A BOTTOM CORNER: a clump growing up off the hills, with flowers in it.
 *
 * The foot of the mockup is not a vine — it is undergrowth: broad leaves fanning upward out
 * of the corner, pink and white blossoms sitting among them. It reads as the ground the
 * hills already imply, which is why it belongs at the bottom and the vine does not.
 */
function LeafCluster({ className }: { className: string }) {
  /*
   * [x, y, radius, rotation]. UPRIGHT, NOT SPLAYED. The first draw ran from -70° to +62°,
   * which fans the leaves out near-horizontal at the edges and reads as a crab rather than
   * a plant. Undergrowth grows UP: the spread is now ±42°, the clump is narrower than it is
   * tall, and the back row sits higher than the front so it reads as depth.
   */
  const leaves: [number, number, number, number][] = [
    [16, 70, 14, -42], [27, 56, 15, -28], [39, 46, 15, -12], [51, 44, 14, 4],
    [62, 50, 14, 20], [73, 60, 12, 34], [83, 72, 10, 42],
    [23, 82, 12, -34], [48, 76, 12, 2], [70, 80, 11, 28],
  ];
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      {leaves.map(([cx, cy, r, rot], i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={r}
          ry={r * 0.52}
          transform={`rotate(${rot} ${cx} ${cy})`}
          fill={i % 3 === 0 ? 'var(--color-band-moss)' : 'var(--color-band-leaf)'}
          opacity={i >= 7 ? 0.65 : 0.85}
        />
      ))}
      {/* Short stems, so a blossom is attached to the clump rather than floating over it. */}
      <path
        d="M 31 68 L 28 44 M 60 62 L 64 40 M 46 70 L 46 52"
        stroke="var(--color-band-leaf)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.8"
      />
      <Bloom x={28} y={42} r={6} petal="var(--color-pink-accent)" />
      <Bloom x={64} y={38} r={5} petal="var(--color-violet-100)" />
      <Bloom x={46} y={50} r={4.5} petal="var(--color-mystery-lilac)" />
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
      <VineCorner className="absolute top-0 left-0 hidden h-20 w-36 opacity-80 sm:block lg:h-24 lg:w-44" />
      <VineCorner className="absolute top-0 right-0 hidden h-20 w-36 scale-x-[-1] opacity-80 sm:block lg:h-24 lg:w-44" />
      <LeafCluster className="absolute bottom-0 left-0 hidden h-28 w-32 opacity-85 sm:block lg:h-32 lg:w-40" />
      <LeafCluster className="absolute right-0 bottom-0 hidden h-28 w-32 scale-x-[-1] opacity-85 sm:block lg:h-32 lg:w-40" />
    </div>
  );
}
