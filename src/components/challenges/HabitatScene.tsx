import type { Ground, Light } from '@/lib/boss-presentation';

/**
 * A REUSABLE PICTURE OF A PLACE, drawn in inline SVG from two words: what the ground is and how
 * much light reaches it. Any plant picks a ground and a light from the same set, so adding a plant
 * never means drawing a scene.
 *
 * EACH GROUND HAS ITS OWN SILHOUETTE so it reads at a glance and at a small size, not by colour
 * alone:
 *   lawn       flat bright green with a white picket fence and daisies
 *   meadow     tall grass with scattered flowers
 *   woodland   brown trunks, a dense leafy canopy, ferns and a mushroom
 *   marsh      open water with reeds, lily pads and a far shore
 *   rock       pale mountains, large boulders and gravel
 *   bare       dark disturbed earth with wheel ruts, pebbles and seedlings
 * Light changes the sky and shading: full is a bright sky with a sun, part adds a shade tree and a
 * dim patch of ground, deep is a dark scene with one thin shaft of light.
 *
 * It is decoration for the words beside it: `aria-hidden`, no label of its own, no animation, and
 * nothing in it claims anything about a species. Rects use `crispEdges` so the pixel look holds at
 * any size, and the viewBox is cropped to fill whatever box it is given.
 */
type Item =
  | { t: 'r'; x: number; y: number; w: number; h: number; c: string }
  | { t: 'p'; pts: string; c: string };

const r = (x: number, y: number, w: number, h: number, c: string): Item => ({ t: 'r', x, y, w, h, c });
const p = (pts: string, c: string): Item => ({ t: 'p', pts, c });

function build(ground: Ground, light: Light): Item[] {
  const o: Item[] = [];
  const skies: Record<Light, readonly [string, string]> = { full: ['#5db8ff', '#9fd8ff'], part: ['#7fb2d4', '#a3cde4'], deep: ['#0c141a', '#12202a'] };
  const [skyTop, skyLow] = skies[light];
  o.push(r(0, 0, 120, 26, skyTop), r(0, 14, 120, 12, skyLow));
  if (light === 'full' && ground !== 'woodland') o.push(r(96, 2, 14, 14, '#fff0a0'), r(98, 4, 10, 10, '#ffd35a'));

  if (ground === 'lawn') {
    o.push(r(0, 24, 120, 20, '#58a82c'), r(0, 34, 120, 10, '#6cc03a'));
    for (let i = 0; i < 11; i += 1) {
      const x = i * 11 + 2;
      o.push(r(x, 14, 7, 16, '#f6f0dc'), p(`${x},14 ${x + 3.5},10 ${x + 7},14`, '#f6f0dc'));
    }
    o.push(r(0, 19, 120, 3, '#d9d0b4'), r(0, 26, 120, 2, '#d9d0b4'));
    ([[10, 38], [34, 40], [60, 37], [86, 40], [108, 36]] as const).forEach(([x, y], i) => {
      o.push(r(x, y, 5, 5, i % 2 ? '#ffffff' : '#fff0a0'), r(x + 2, y + 2, 1, 1, '#e8a317'));
    });
  } else if (ground === 'meadow') {
    o.push(r(0, 22, 120, 22, '#7aa832'), r(0, 34, 120, 10, '#6b9a2a'));
    for (let i = 0; i < 30; i += 1) o.push(r(i * 4, 14 + ((i * 7) % 9), 2, 22 - ((i * 7) % 9), i % 3 ? '#a9c64a' : '#8fb43a'));
    [[8, 16, '#c45cff'], [26, 12, '#ff7aa6'], [44, 17, '#ffd35a'], [62, 13, '#ffffff'], [80, 16, '#c45cff'], [98, 12, '#ff7aa6'], [112, 17, '#ffd35a']].forEach(
      ([x, y, c]) => o.push(r(x as number, y as number, 5, 5, c as string)),
    );
  } else if (ground === 'woodland') {
    o.push(r(0, 0, 120, 44, light === 'deep' ? '#0a1a14' : '#1d3a26'), r(0, 28, 120, 16, '#3a2a14'));
    [4, 26, 52, 76, 100].forEach((x, i) => o.push(r(x, 0, 9, 36, i % 2 ? '#5a3a1e' : '#6a4524'), r(x + 2, 0, 2, 36, '#7a5230')));
    o.push(r(0, 0, 120, 9, '#1f6b2c'), r(0, 6, 120, 5, '#2a8a38'));
    for (let k = 0; k < 8; k += 1) o.push(r(k * 16 + 3, 9 + (k % 2) * 3, 10, 4, '#1f6b2c'));
    [14, 40, 66, 92].forEach((x) => o.push(p(`${x},38 ${x + 4},28 ${x + 8},38`, '#4aa23a')));
    o.push(r(110, 35, 8, 3, '#d0463c'), r(111, 34, 2, 1, '#ffffff'), r(113, 38, 3, 4, '#f0e6d0'));
  } else if (ground === 'marsh') {
    o.push(r(0, 22, 120, 2, '#6f9a4a'), r(0, 24, 120, 20, '#3f86c6'), r(0, 28, 120, 2, '#8cc4ec'), r(0, 35, 120, 2, '#8cc4ec'), r(20, 40, 40, 2, '#8cc4ec'));
    [10, 24, 40, 78, 92, 106].forEach((x, i) => {
      o.push(r(x, 6 + (i % 3) * 3, 2, 26, '#4f7a2a'), r(x + 3, 10 + (i % 2) * 3, 2, 22, '#5f8f35'), r(x - 3, 16 + (i % 2) * 2, 3, 12, '#6aa03a'));
    });
    [[52, 32], [66, 38]].forEach(([x, y]) => o.push(r(x!, y!, 10, 3, '#58a82c'), r(x! + 3, y! - 1, 3, 2, '#ff9fbd')));
  } else if (ground === 'rock') {
    o.push(p('0,26 22,6 44,26', '#8f8ca6'), p('30,26 60,2 92,26', '#a29fb8'), p('80,26 104,10 120,26', '#8f8ca6'), p('22,6 26,10 18,10', '#ffffff'), p('60,2 66,10 54,10', '#ffffff'));
    o.push(r(0, 26, 120, 18, '#6c697a'), r(0, 36, 120, 8, '#5a5766'));
    [[6, 24, 34, 16], [54, 28, 30, 14], [92, 22, 28, 18]].forEach(([x, y, w, h]) => {
      o.push(p(`${x},${y! + h!} ${x! + 4},${y} ${x! + w! - 4},${y} ${x! + w!},${y! + h!}`, '#9a97ad'), r(x! + 5, y! + 2, w! - 12, 2, '#c0bdd0'));
    });
    for (let q = 0; q < 10; q += 1) o.push(r(q * 12 + 3, 40 + (q % 2) * 2, 3, 2, '#807d92'));
  } else {
    o.push(r(0, 24, 120, 20, '#8a5f36'), r(0, 34, 120, 10, '#9a6c3f'), r(0, 30, 120, 3, '#6a4524'), r(0, 38, 120, 3, '#6a4524'));
    [[12, 28], [44, 35], [72, 27], [100, 36], [26, 41]].forEach(([x, y]) => o.push(r(x!, y!, 4, 3, '#c4a574')));
    [[20, 22], [84, 22]].forEach(([x, y]) => o.push(r(x!, y!, 2, 6, '#58a82c'), r(x! - 2, y! + 1, 2, 2, '#58a82c'), r(x! + 2, y! + 2, 2, 2, '#58a82c')));
  }

  if (light === 'part') {
    o.push(r(0, 0, 34, 30, '#2f6d2a'), r(0, 26, 34, 8, '#2a5c25'), r(12, 28, 8, 16, '#4a331c'), r(0, 34, 50, 10, 'rgba(0,0,0,0.18)'));
  }
  if (light === 'deep' && ground !== 'woodland') o.push(r(0, 0, 120, 44, 'rgba(0,0,0,0.5)'));
  if (light === 'deep') o.push(r(58, 0, 5, 40, 'rgba(255,215,122,0.16)'));
  return o;
}

export function HabitatScene({ ground, light, className = '' }: { ground: Ground; light: Light; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 44"
      preserveAspectRatio="xMidYMid slice"
      shapeRendering="crispEdges"
      className={className}
    >
      {build(ground, light).map((item, i) =>
        item.t === 'r' ? (
          <rect key={i} x={item.x} y={item.y} width={item.w} height={item.h} fill={item.c} />
        ) : (
          <polygon key={i} points={item.pts} fill={item.c} />
        ),
      )}
    </svg>
  );
}
