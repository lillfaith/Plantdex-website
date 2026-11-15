/**
 * WHAT A TAP ON A PHOTOGRAPH MEANS, with some forgiveness for a thumb and none for guessing.
 *
 * A tap at a point (percent of the picture) resolves to ONE of four outcomes:
 *
 *   exact      the point is inside a reviewed region. If regions overlap, the earlier one in the
 *              image's own list wins, exactly as `regionAt` has always decided it.
 *   near       the point is outside every region but within `NEAR_TOLERANCE` of exactly one
 *              selectable region, so that region is selected. The player sees it highlighted and
 *              can change it before checking.
 *   ambiguous  the point is within reach of two or more selectable regions. NOTHING is selected:
 *              guessing which one was meant could turn a near miss into a wrong answer, so the
 *              player is asked to tap closer to one, or to use the list.
 *   none       nothing is near enough, or the point is inside a region that is not one of this
 *              question's choices.
 *
 * THE REVIEWED REGIONS ARE NEVER CHANGED. The tolerance is applied to the TAP, as a distance from
 * a region's own rectangle. No rectangle is grown, moved or stored, the highlight a player sees
 * and the answer that is scored both use the reviewed rectangle, and a region that was correct
 * stays exactly as correct. A tap that lands inside a different region, one that is not a choice
 * here, is not snapped anywhere: they pointed at something and it is not an answer.
 */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** How far outside a region, in percent of the picture, a tap may land and still be understood. */
export const NEAR_TOLERANCE = 5;

export type TapOutcome =
  | { readonly kind: 'exact'; readonly region: string }
  | { readonly kind: 'near'; readonly region: string }
  | { readonly kind: 'ambiguous'; readonly regions: readonly string[] }
  | { readonly kind: 'none' };

const NONE: TapOutcome = { kind: 'none' };

function contains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** Straight-line distance from a point to a rectangle, 0 inside it. */
function distance(r: Rect, x: number, y: number): number {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

export function resolveTap(
  regions: Readonly<Record<string, readonly Rect[]>>,
  selectable: readonly string[],
  x: number,
  y: number,
  tolerance: number = NEAR_TOLERANCE,
): TapOutcome {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return NONE;

  // 1. Inside a reviewed region: the earlier region wins, as before.
  for (const [id, rects] of Object.entries(regions)) {
    if (rects.some((r) => contains(r, x, y))) {
      return selectable.includes(id) ? { kind: 'exact', region: id } : NONE;
    }
  }

  // 2. Outside all of them: which selectable regions are within reach?
  const close: string[] = [];
  for (const id of selectable) {
    const rects = regions[id];
    if (!rects) continue;
    if (rects.some((r) => distance(r, x, y) <= tolerance)) close.push(id);
  }
  if (close.length === 1) return { kind: 'near', region: close[0]! };
  if (close.length > 1) return { kind: 'ambiguous', regions: close };
  return NONE;
}
