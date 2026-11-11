import { describe, expect, it } from 'vitest';

import {
  DEPTH_DROP,
  SCALE_STEP,
  STEP_DEGREES,
  ringPlacement,
  ringTransform,
  signedOffset,
} from './card-ring';

/**
 * THE DECK HAS TO TURN THE SHORT WAY ROUND.
 *
 * The homepage showcase is a ring of five cards, and the only thing in it that can be wrong
 * rather than merely ugly is which DIRECTION a card travels when the deck rotates. Step
 * forward from the last card and the first one has to arrive from the right, one place away —
 * not sail across the whole stage from the left having taken the long way round. That is the
 * difference between a deck turning and five cards scattering, and it is invisible in a
 * screenshot because every still frame of both looks identical.
 */

/** The five cards the landing page actually shows. */
const FIVE = 5;

describe('a card knows the short way round', () => {
  it('puts the selected card at the front', () => {
    for (let i = 0; i < FIVE; i += 1) {
      expect(signedOffset(i, i, FIVE)).toBe(0);
    }
  });

  it('spreads the rest evenly either side', () => {
    // Selected 0, so: 1 and 2 to the right, 3 and 4 to the LEFT by the short way.
    expect([0, 1, 2, 3, 4].map((i) => signedOffset(i, 0, FIVE))).toEqual([0, 1, 2, -2, -1]);
  });

  it('wraps rather than unrolling, from every starting card', () => {
    /*
     * THE REGRESSION THIS EXISTS FOR. Without the wrap, selecting card 4 would place card 0
     * at +4 — four places to the right of a five-card ring, which is off the stage and in the
     * wrong direction. Swept over every selection so the property holds at the seam as well
     * as in the middle, which is the only place it ever breaks.
     */
    for (let selected = 0; selected < FIVE; selected += 1) {
      const offsets = [0, 1, 2, 3, 4].map((i) => signedOffset(i, selected, FIVE));
      expect(offsets.every((offset) => Math.abs(offset) <= 2), `selected ${selected}`).toBe(true);
      // Every seat is filled exactly once: a ring, not a pile.
      expect([...offsets].sort((a, b) => a - b)).toEqual([-2, -1, 0, 1, 2]);
    }
  });

  it('breaks the even-count tie the same way every time', () => {
    /*
     * Six cards: the one directly behind is three steps either way. `forward > count / 2` is
     * false at exactly half, so it keeps +3 — the RIGHT side. Which side is arbitrary; that
     * it is always the same side is not, because a tie resolved differently between renders
     * would make that card flick from one side of the deck to the other as its neighbours
     * moved. Pinned to the value the code really produces, after this test was first written
     * asserting the opposite out of habit.
     */
    expect(signedOffset(3, 0, 6)).toBe(3);
    expect([0, 1, 2, 3, 4, 5].map((i) => signedOffset(i, 0, 6))).toEqual([0, 1, 2, 3, -2, -1]);
  });

  it('survives a count of one, and of none', () => {
    // A one-card deck is a legitimate state — `SHOWCASE_CARDS` is a hand-written list, and a
    // future edit could leave it short. It must render, not divide by zero.
    expect(signedOffset(0, 0, 1)).toBe(0);
    expect(signedOffset(0, 0, 0)).toBe(0);
  });
});

describe('where that offset puts the card', () => {
  it('centres the front card and leaves it at full size', () => {
    const front = ringPlacement(0);
    expect(front.across).toBeCloseTo(0, 10);
    expect(front.back).toBeCloseTo(0, 10);
    expect(front.tilt).toBe(0);
    expect(front.scale).toBe(1);
  });

  it('is symmetric about the front', () => {
    // A ring that leaned one way would read as a fan with a bent spine.
    const left = ringPlacement(-2);
    const right = ringPlacement(2);
    expect(left.across).toBeCloseTo(-right.across, 10);
    expect(left.back).toBeCloseTo(right.back, 10);
    expect(left.tilt).toBeCloseTo(-right.tilt, 10);
    expect(left.scale).toBeCloseTo(right.scale, 10);
  });

  it('moves every card further out, further back and smaller as it recedes', () => {
    const steps = [0, 1, 2].map(ringPlacement);
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]!.across, `step ${i} is not further across`).toBeGreaterThan(
        steps[i - 1]!.across,
      );
      expect(steps[i]!.back, `step ${i} does not sink further`).toBeGreaterThan(steps[i - 1]!.back);
      expect(steps[i]!.scale, `step ${i} is not smaller`).toBeLessThan(steps[i - 1]!.scale);
    }
  });

  it('keeps the furthest card recognisable rather than edge-on', () => {
    // The two constants that decide whether the back of the ring reads as cards or as
    // slivers. Past ~60 degrees the artwork is gone; below ~0.6 scale it is a chip.
    expect(Math.abs(2 * STEP_DEGREES)).toBeLessThanOrEqual(60);
    expect(ringPlacement(2).scale).toBeGreaterThan(0.6);
    expect(SCALE_STEP).toBeGreaterThan(0);
    expect(DEPTH_DROP).toBeGreaterThan(0);
  });
});

describe('the transform it produces', () => {
  it('centres before it rotates, or the deck drifts off its own axis', () => {
    /*
     * Transforms apply right to left, so `translate(-50%, -50%)` has to be FIRST in the
     * string to be applied LAST. Written after the rotation it would be rotated and scaled
     * along with everything else, and each card would be centred by a different amount.
     */
    expect(ringTransform(1).indexOf('translate(-50%, -50%)')).toBe(0);
  });

  it('leaves the radius to CSS so one set of positions serves both breakpoints', () => {
    const transform = ringTransform(2);
    expect(transform).toContain('var(--ring-r)');
    // And no raw pixels anywhere: a hard-coded radius here is a ring that cannot narrow on a
    // phone, which is how the outermost card ends up past the page gutter.
    expect(transform).not.toMatch(/\d+px/);
  });

  it('emits finite numbers for every seat on the ring', () => {
    for (let offset = -2; offset <= 2; offset += 1) {
      const transform = ringTransform(offset);
      expect(transform, `offset ${offset}`).not.toContain('NaN');
      expect(transform, `offset ${offset}`).not.toContain('Infinity');
    }
  });
});
