import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { evolutionScale } from '@/components/challenges/BossEvolution';

const css = readFileSync('src/app/globals.css', 'utf8');

describe('evolution sprite scale', () => {
  it('is always a multiple of 0.2, so the 5px art grid stays whole pixels', () => {
    for (const [w, h] of [[320, 568], [360, 640], [390, 844], [430, 932], [768, 1024], [1440, 900]]) {
      const s = evolutionScale(w!, h!);
      expect(Math.abs(s / 0.2 - Math.round(s / 0.2))).toBeLessThan(1e-9);
      expect(s).toBeGreaterThanOrEqual(1);
    }
  });
  it('is larger than the old fixed 1x on ordinary phones and never overflows a short one', () => {
    expect(evolutionScale(390, 844)).toBeGreaterThan(1);
    expect(evolutionScale(320, 568)).toBeLessThanOrEqual(1.4);
    expect(evolutionScale(320, 568) * 160).toBeLessThanOrEqual(568 * 0.38 + 32);
  });
});

describe('evolution motion', () => {
  it('the second ring and both bursts are finite and covered by skip and reduced motion', () => {
    expect(css).toMatch(/@utility evolve-ring-late \{\s*animation: [^;]*1400ms both;/);
    const skip = css.slice(css.indexOf(".boss-scene[data-skip='true'] .challenge-pop"));
    expect(skip.match(/evolve-ring-late/g)!.length).toBeGreaterThanOrEqual(3);
    expect(css).not.toMatch(/evolve-[a-z-]+ [^;]*infinite/);
  });
});
