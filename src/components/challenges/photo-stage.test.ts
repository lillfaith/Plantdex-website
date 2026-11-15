import { describe, expect, it } from 'vitest';
import { framedWidth } from './PhotoStage';

// The stage is 342 wide and 410 tall (a 390x844 phone), minus a 4px frame.
describe('the photo stage fits any photograph, never cropping', () => {
  it('a tall photograph is limited by the stage height and stays centred', () => {
    expect(framedWidth(342, 410, 0.5)).toBeCloseTo(207, 0); // (410-4)*0.5+4
  });
  it('a square photograph uses the full width when the stage is tall enough', () => {
    expect(framedWidth(342, 410, 1)).toBe(342);
  });
  it('a wide photograph uses the full width and leaves height to spare', () => {
    expect(framedWidth(342, 410, 2.2)).toBe(342);
  });
  it('a short stage still gets a correctly proportioned picture, not a squashed one', () => {
    const w = framedWidth(342, 240, 0.75);
    const imageHeight = (w - 6) / 0.75;
    expect(imageHeight + 4).toBeLessThanOrEqual(240 + 0.001);
  });
  it('never exceeds the stage width, whatever the ratio', () => {
    for (const ratio of [0.4, 0.56, 0.75, 1, 1.6, 2.33]) expect(framedWidth(300, 600, ratio)).toBeLessThanOrEqual(300);
  });
  it('degrades to the stage width before it has been measured', () => {
    expect(framedWidth(0, 0, 0.75)).toBe(0);
    expect(framedWidth(342, 0, 0.75)).toBe(342);
    expect(framedWidth(342, 410, 0)).toBe(342);
  });
});
