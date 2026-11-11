/**
 * WHERE A CARD SITS ON THE HOMEPAGE'S ROTATING DECK.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure geometry, kept out of `CardShowcase` for the same reason `shelf-layout.ts` is kept
 * out of `SeedShelfView`: it is the only part of that component with a right answer, and the
 * wrap-around is subtle enough to be worth pinning. Everything else there is markup.
 *
 * THE RING IS NOT A ROW, AND THAT IS THE WHOLE OF IT. Five cards sit on one circle; the card
 * at the front is the one being looked at, and the other four fall away round the sides.
 * Choosing a card rotates the ring until that card is at the front — so every card's position
 * is a function of ONE number, the distance from it to the selected card, measured the short
 * way round.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The angle between one card and the next, in degrees.
 *
 * 26 is measured rather than chosen: at five cards it puts the outermost pair at 52 degrees,
 * far enough round the circle that they read as edge-on and near enough that their artwork is
 * still recognisable. Past about 60 the back cards become slivers and the ring stops looking
 * like a deck.
 */
export const STEP_DEGREES = 26;

/**
 * How much of its angular position a card expresses as TILT.
 *
 * At 1.0 each card faces along the circle and the ring reads as a cylinder seen from above —
 * technically correct and, at this size, like a fan somebody dropped. At 0.55 the cards stay
 * nearly upright and the circle shows up in their SPACING instead, which is what a hand of
 * cards actually looks like.
 */
export const TILT = 0.55;

/** How much smaller each step back is. Five cards, so the furthest sits at 0.74. */
export const SCALE_STEP = 0.13;

/**
 * How far a card sinks as it goes round the back, as a share of the ring's radius.
 *
 * This is the whole of the perspective. Without it the ring is a flat arc and the back cards
 * look like small cards BESIDE the front one rather than cards further away; the drop is what
 * makes the circle read as lying in a plane the viewer is above.
 */
export const DEPTH_DROP = 0.22;

/**
 * Where a card sits relative to the one at the front.
 *
 * THE MODULO IS THE POINT, and it is why this is a ring rather than a row. Card 0 with card 4
 * selected is not four steps to the right — it is one step to the LEFT, because the deck
 * wraps. Without the short way round, stepping past the last card would send four cards
 * sailing across the stage in the opposite direction to the one the player asked for.
 *
 * Returns a value in [-floor(n/2), floor(n/2)]: 0 is the front, negative is to the left. The
 * double modulo is not superstition — `%` keeps the sign of its left operand in JavaScript,
 * so a selected index above the card's own index would otherwise give a negative remainder
 * and put the card on the wrong side of the deck.
 *
 * AT AN EVEN COUNT THE OPPOSITE CARD GOES RIGHT. With six cards the one directly behind is
 * three steps either way, and the tie has to break somewhere: `forward > count / 2` is FALSE
 * at exactly half, so it keeps +3 rather than taking -3. Arbitrary, deterministic, and the
 * same on every render — which is the property that matters, because a tie resolved
 * differently between renders would make that one card flick from side to side as its
 * neighbours moved. (Strictly academic today: the landing page shows five.)
 */
export function signedOffset(index: number, selected: number, count: number): number {
  if (count <= 0) return 0;
  const forward = (((index - selected) % count) + count) % count;
  return forward > count / 2 ? forward - count : forward;
}

/** How far across and how far back a card at this offset sits, as shares of the radius. */
export function ringPlacement(offset: number): {
  across: number;
  back: number;
  tilt: number;
  scale: number;
} {
  const radians = (offset * STEP_DEGREES * Math.PI) / 180;
  return {
    across: Math.sin(radians),
    back: (1 - Math.cos(radians)) * DEPTH_DROP,
    tilt: offset * STEP_DEGREES * TILT,
    scale: 1 - Math.abs(offset) * SCALE_STEP,
  };
}

/**
 * The CSS transform for a card at a given offset.
 *
 * THE TRIGONOMETRY IS IN JAVASCRIPT AND THE RADIUS IS IN CSS, deliberately. The angle depends
 * only on the offset, which is known here; the radius has to shrink on a phone, which is a
 * breakpoint decision and belongs in a class. So the sine and cosine resolve to plain numbers
 * and `--ring-r` carries the size — one set of positions serving both widths, with no media
 * query in the component and no `sin()` in the stylesheet.
 *
 * `translate(-50%, -50%)` comes FIRST because every card is pinned to the centre of the
 * stage: it is what makes the offsets measure from the middle rather than from a corner.
 * Transforms apply right to left, so moving it later would rotate and scale the centring
 * itself and the deck would drift off-axis as it turned.
 */
export function ringTransform(offset: number): string {
  const { across, back, tilt, scale } = ringPlacement(offset);
  return [
    'translate(-50%, -50%)',
    `translateX(calc(var(--ring-r) * ${across.toFixed(4)}))`,
    `translateY(calc(var(--ring-r) * ${back.toFixed(4)}))`,
    `rotate(${tilt.toFixed(2)}deg)`,
    `scale(${scale.toFixed(3)})`,
  ].join(' ');
}
