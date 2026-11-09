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

/*
 * x%, y%, radius in px, opacity. Hand-placed: scattered, denser high, clear of centre.
 *
 * BRIGHTER THAN THE FIRST SKY AND CLEAR OF THE CONTENT COLUMN. Twenty-four stars at
 * 0.2-0.4 over a ground this dark is a sky you have to look for. But the brighter version
 * put specks THROUGH the headings — one sat inside "My Collection" and another inside the
 * back link — because the field ran edge to edge while the text sits in a centred column.
 * Every star is now outside 28-72%, which is the margin either side of that column, and
 * the sky is hidden below `sm` for the same reason the foliage is: at 390px the column IS
 * the page and there is no margin for a star to live in.
 */
const STARS: [number, number, number, number][] = [
  [3, 11, 2, 0.7], [7, 30, 1, 0.5], [12, 7, 1.5, 0.6], [16, 22, 1, 0.42],
  [20, 44, 2, 0.5], [24, 9, 1, 0.5], [9, 55, 1.5, 0.45], [26, 60, 1, 0.42],
  [5, 68, 1.5, 0.42], [14, 80, 1, 0.34], [22, 72, 1, 0.3], [18, 36, 1, 0.34],
  [27, 26, 1.5, 0.38], [11, 44, 1, 0.3], [2, 86, 1, 0.3], [24, 88, 1, 0.26],
  [76, 24, 1, 0.42], [80, 9, 2, 0.7], [84, 34, 1, 0.5], [88, 16, 1.5, 0.6],
  [93, 27, 1, 0.5], [97, 12, 1.5, 0.6], [90, 55, 1.5, 0.42], [95, 71, 1, 0.38],
  [74, 50, 1, 0.34], [82, 44, 1, 0.3], [78, 66, 1, 0.3], [86, 80, 1, 0.3],
  [98, 46, 1, 0.34], [73, 36, 1.5, 0.34], [92, 88, 1, 0.26], [79, 88, 1, 0.26],
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
 * ONE LEAF: a pointed lens with a midrib, not an ellipse.
 *
 * The ellipse is why three rounds of this looked like beans on a string. A real leaf comes
 * to a POINT at both ends and carries a vein down its middle, and those two details are
 * most of what makes a green shape read as foliage — at 24px, more than the colour does.
 * Drawn from the origin along +x so the caller places it with one rotation.
 */
function Leaf({ x, y, len, rot, tone, slim = 0.36 }: {
  x: number; y: number; len: number; rot: number; tone: 'dark' | 'light'; slim?: number;
}) {
  /*
   * `slim` IS WHAT KEEPS A RADIATING CLUMP FROM BECOMING A DISC, and it has to be a prop
   * because the two arrangements need different blades. Two leaves `d` degrees apart clear
   * each other only while the blade is narrower than the gap between them, and that gap
   * grows along the leaf while the blade does not: at 24 degrees and 36% width they touch
   * for most of their length, which is the cabbage that shipped twice. The vine's paired
   * leaves sit back to back and can afford to be round; the clump cannot.
   */
  const w = 32 * slim;
  const fill = tone === 'light' ? 'var(--color-band-moss)' : 'var(--color-band-leaf)';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${len / 32})`}>
      <path d={`M 0 0 C 9 ${-w} 23 ${-w} 32 0 C 23 ${w} 9 ${w} 0 0 Z`} fill={fill} />
      {/* The midrib, in the ground's own colour rather than a darker green: a vein is a
          shadow between two halves of a leaf, and borrowing the background keeps the
          palette closed. */}
      <path
        d="M 3 0 L 28 0"
        stroke="var(--color-plum-950)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.25"
      />
    </g>
  );
}

/** A five-petal blossom with a gold eye, the shape the deck's own art uses. */
function Bloom({ x, y, r, petal }: { x: number; y: number; r: number; petal: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx={0}
          cy={-r * 0.64}
          rx={r * 0.44}
          ry={r * 0.6}
          transform={`rotate(${a})`}
          fill={petal}
        />
      ))}
      <circle cx={0} cy={0} r={r * 0.32} fill="var(--color-gold-400)" />
    </g>
  );
}

/**
 * A TOP CORNER: an ivy run along the edge — PAIRED leaves on a thin stem.
 *
 * The mockup's top corners are a vine, and a vine's leaves come in opposite pairs off one
 * stem rather than scattered along it. Pairing them is what turns a line of green blobs
 * into a plant, and it costs nothing: one list of points on the stem, each drawn twice at
 * mirrored angles. They taper toward the tip, which is the direction growth runs.
 */
function VineCorner({ className }: { className: string }) {
  /** [x, y, length, angle of the pair] — walking the stem from the corner outward. */
  const pairs: [number, number, number, number][] = [
    [10, 20, 17, 18], [23, 26, 16, 10], [36, 28, 15, 2],
    [49, 28, 14, -4], [61, 26, 12, -10], [72, 25, 11, -14], [83, 26, 9, -16],
  ];
  return (
    <svg viewBox="0 0 100 56" className={className} aria-hidden="true" focusable="false">
      <path
        d="M -4 16 Q 20 30 50 29 Q 76 28 100 32"
        fill="none"
        stroke="var(--color-band-leaf)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {pairs.map(([x, y, len, a], i) => (
        <g key={i}>
          <Leaf x={x} y={y} len={len} rot={a - 52} tone={i % 2 ? 'light' : 'dark'} />
          <Leaf x={x} y={y} len={len} rot={a + 52} tone={i % 2 ? 'dark' : 'light'} />
        </g>
      ))}
      <Bloom x={6} y={9} r={5} petal="var(--color-violet-100)" />
      <Bloom x={40} y={16} r={4} petal="var(--color-pink-accent)" />
      <Bloom x={78} y={16} r={3.5} petal="var(--color-mystery-lilac)" />
    </svg>
  );
}

/**
 * A BOTTOM CORNER: a clump, every leaf radiating from ONE point.
 *
 * This is the correction that mattered. The leaves were scattered across the box at
 * assorted angles, so the clump had no base and read as leaves lying on the floor. A plant
 * grows from somewhere: every leaf here starts at the same root and its rotation IS the
 * direction it grows, which is also why the long ones go up and the short ones go out
 * rather than the reverse. Flowers rise from that same point on thin stems.
 */
function LeafCluster({ className }: { className: string }) {
  /* The root sits in from the edge, not on it: the outermost leaf and the first blossom
     both reach back past x=0 from a root at 20, and the clump shipped clipped against the
     left margin. 30 clears both. */
  const root: [number, number] = [30, 102];
  /*
   * [angle from the root, length, tone]. ELEVEN LEAVES AT 8-24 DEGREES APART FUSED INTO A
   * BALL. Each leaf is 46% as wide as it is long, so leaves closer together than about 25
   * degrees overlap along their whole length and the clump renders as one green disc —
   * which is what shipped and what this fixes. Seven leaves, ~24 degrees apart, and the
   * gaps between them are what makes it read as separate leaves at all.
   */
  const leaves: [number, number, 'dark' | 'light'][] = [
    [-132, 30, 'light'], [-100, 40, 'dark'], [-68, 46, 'light'],
    [-36, 40, 'dark'], [-6, 32, 'light'],
  ];
  /* [angle, stem length, blossom radius, petal colour]. The colour rides in the tuple
     rather than being looked up by index: `noUncheckedIndexedAccess` types a parallel
     array's element as possibly undefined, and a petal with no colour is a real bug the
     compiler is right to refuse. */
  const stems: [number, number, number, string][] = [
    [-112, 46, 5, 'var(--color-pink-accent)'],
    [-84, 54, 4.5, 'var(--color-violet-100)'],
    [-52, 48, 4, 'var(--color-mystery-lilac)'],
  ];
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      {leaves.map(([a, len, tone], i) => (
        <Leaf key={i} x={root[0]} y={root[1]} len={len} rot={a} tone={tone} slim={0.26} />
      ))}
      {stems.map(([a, len, r, petal], i) => {
        const rad = (a * Math.PI) / 180;
        const tx = root[0] + Math.cos(rad) * len;
        const ty = root[1] + Math.sin(rad) * len;
        return (
          <g key={i}>
            <path
              d={`M ${root[0]} ${root[1]} Q ${(root[0] + tx) / 2 - 3} ${(root[1] + ty) / 2} ${tx} ${ty}`}
              fill="none"
              stroke="var(--color-band-leaf)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <Bloom x={tx} y={ty} r={r} petal={petal} />
          </g>
        );
      })}
    </svg>
  );
}

export function SiteDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      {/* THE CLOUD BANKS. Soft mounds either side at mid height, LIGHTER than the ground
          rather than darker — they are the lit haze the warm bloom implies, and without
          them the glow has no shape and reads as a vignette somebody forgot to finish.
          4% and 3%: enough to see an edge, nowhere near enough to change what a panel's
          text is composited against. */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <ellipse cx="12" cy="62" rx="34" ry="26" fill="var(--color-mystery-violet)" opacity="0.04" />
        <ellipse cx="90" cy="56" rx="30" ry="24" fill="var(--color-mystery-violet)" opacity="0.035" />
        <ellipse cx="50" cy="82" rx="46" ry="22" fill="var(--color-mystery-violet)" opacity="0.03" />
      </svg>

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
          className="absolute hidden -translate-x-1/2 -translate-y-1/2 sm:block"
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
      <VineCorner className="absolute top-0 left-0 hidden h-20 w-40 sm:block lg:h-24 lg:w-52" />
      <VineCorner className="absolute top-0 right-0 hidden h-20 w-40 scale-x-[-1] sm:block lg:h-24 lg:w-52" />
      <LeafCluster className="absolute bottom-0 left-0 hidden h-28 w-32 sm:block lg:h-32 lg:w-36" />
      <LeafCluster className="absolute right-0 bottom-0 hidden h-28 w-32 scale-x-[-1] sm:block lg:h-32 lg:w-36" />
    </div>
  );
}
