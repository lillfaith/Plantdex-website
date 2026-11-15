import { describe, expect, it } from 'vitest';
import { BOSS_IMAGES } from './boss-images';
import { NEAR_TOLERANCE, resolveTap, type Rect } from './tap-select';

const regions: Record<string, Rect[]> = {
  head: [{ x: 30, y: 10, w: 40, h: 30 }],
  stalk: [{ x: 46, y: 60, w: 8, h: 35 }],
  leaves: [{ x: 0, y: 80, w: 30, h: 20 }, { x: 70, y: 80, w: 30, h: 20 }],
  wall: [{ x: 80, y: 0, w: 20, h: 50 }],
};
const choices = ['head', 'stalk', 'leaves'];

describe('a tap is forgiving but never guesses', () => {
  it('a tap inside a region selects it exactly', () => {
    expect(resolveTap(regions, choices, 50, 20)).toEqual({ kind: 'exact', region: 'head' });
    expect(resolveTap(regions, choices, 50, 70)).toEqual({ kind: 'exact', region: 'stalk' });
  });

  it('a tap just outside ONE region selects that region as a near tap', () => {
    // 3 points left of the stalk (x 46), well clear of the head (which ends at y 40).
    expect(resolveTap(regions, choices, 43, 75)).toEqual({ kind: 'near', region: 'stalk' });
  });

  it('a tap within reach of TWO regions selects nothing and says it is ambiguous', () => {
    // Between the head (ends y 40) and the stalk (starts y 60): 2 above the stalk's top edge is
    // too far from the head, so widen the gap test with a tap that touches both zones.
    const close: Record<string, Rect[]> = { a: [{ x: 10, y: 10, w: 20, h: 20 }], b: [{ x: 34, y: 10, w: 20, h: 20 }] };
    const outcome = resolveTap(close, ['a', 'b'], 32, 20); // 2 from a's right edge, 2 from b's left edge
    expect(outcome.kind).toBe('ambiguous');
    expect(outcome).toEqual({ kind: 'ambiguous', regions: ['a', 'b'] });
  });

  it('a tap nowhere near a region selects nothing', () => {
    expect(resolveTap(regions, choices, 15, 50)).toEqual({ kind: 'none' });
  });

  it('a tap inside a region that is not one of the choices is not snapped anywhere', () => {
    // Inside the wall, which is not a choice, and also within reach of the head: no snapping.
    expect(resolveTap(regions, choices, 78, 45)).toEqual({ kind: 'none' });
    expect(resolveTap(regions, choices, 90, 20)).toEqual({ kind: 'none' });
  });

  it('where regions overlap, the earlier one still wins, as the reviewed regions always decided it', () => {
    const overlap: Record<string, Rect[]> = { first: [{ x: 0, y: 0, w: 50, h: 50 }], second: [{ x: 25, y: 25, w: 50, h: 50 }] };
    expect(resolveTap(overlap, ['first', 'second'], 30, 30)).toEqual({ kind: 'exact', region: 'first' });
  });

  it('only reaches as far as the tolerance', () => {
    expect(resolveTap(regions, choices, 46 - NEAR_TOLERANCE, 75).kind).toBe('near');
    expect(resolveTap(regions, choices, 46 - NEAR_TOLERANCE - 0.5, 75).kind).toBe('none');
  });

  it('ignores a point that is not a number', () => {
    expect(resolveTap(regions, choices, Number.NaN, 20)).toEqual({ kind: 'none' });
  });

  it('NEVER changes a region: the input is read-only and comes back byte for byte', () => {
    const frozen = JSON.stringify(regions);
    for (const [x, y] of [[50, 20], [43, 75], [15, 50], [78, 45], [32, 20]]) resolveTap(regions, choices, x!, y!);
    expect(JSON.stringify(regions)).toBe(frozen);
  });

  it('works on every reviewed photograph without touching its regions', () => {
    for (const [id, image] of Object.entries(BOSS_IMAGES)) {
      if (!image.regions) continue;
      const before = JSON.stringify(image.regions);
      const selectable = Object.keys(image.regions);
      for (let x = 0; x <= 100; x += 7) for (let y = 0; y <= 100; y += 7) resolveTap(image.regions, selectable, x, y);
      expect(JSON.stringify(image.regions), id).toBe(before);
    }
  });
});
