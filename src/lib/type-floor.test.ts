import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EYEBROW, MICRO_LABEL } from '@/components/ui/accents';

/**
 * NOTHING RENDERS BELOW 11.5px ON A PHONE.
 *
 * An earlier pass raised the type floor and reported it fixed — but it only ever touched the
 * plant profile. The rest of the site kept shipping 9.28–10.4px labels: card numbers in the
 * grid, "Not discovered", the seasons list, glossary tags, garden stage labels. Measured in a
 * browser at 390px, 15 nodes across 6 routes were under the floor.
 *
 * This is the source-level guard. It cannot measure a rendered page, but it can forbid the
 * shades that produce one — which is where every violation actually came from.
 */

const FLOOR_REM = 0.72;
const ROOTS = ['src/components', 'src/app'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = ROOTS.flatMap(walk).filter((path) => path.endsWith('.tsx'));

describe('mobile type floor', () => {
  it('uses no arbitrary text size below 0.72rem', () => {
    const offenders: string[] = [];
    for (const path of files) {
      const source = readFileSync(path, 'utf8');
      for (const match of source.matchAll(/text-\[(\d*\.?\d+)rem\]/g)) {
        const rem = Number(match[1]);
        if (rem < FLOOR_REM) offenders.push(`${path}: text-[${match[1]}rem]`);
      }
      // Pixel and 2xs forms would slip past the rem check.
      for (const match of source.matchAll(/text-\[(\d+)px\]/g)) {
        if (Number(match[1]) < 11.5) offenders.push(`${path}: text-[${match[1]}px]`);
      }
      expect(source, `${path}: text-2xs is below the floor`).not.toContain('text-2xs');
    }
    expect(offenders, 'raise these to text-[0.72rem] or text-xs').toEqual([]);
  });

  it('keeps the shared label constants at the floor', () => {
    // Components are meant to reach for these rather than inventing a size.
    for (const constant of [EYEBROW, MICRO_LABEL]) {
      const rem = Number(/text-\[(\d*\.?\d+)rem\]/.exec(constant)?.[1]);
      expect(rem).toBeGreaterThanOrEqual(FLOOR_REM);
    }
  });
});
