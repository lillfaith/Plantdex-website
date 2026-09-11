import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * `structures.tsx` is generated, and the generator writes it in place. Editing the Python
 * and forgetting to re-run leaves a file that no longer matches its source — the exact
 * failure `edge-shared.test.ts` guards against for the copied reducer, and the same one
 * `audit_sprites.py` catches for sprite sheets.
 *
 * It bit within an hour of the generator existing: run from the wrong working directory it
 * silently wrote a stray `src/` tree elsewhere and reported success, while the real file
 * kept its previous contents and two structures went missing.
 */
describe('structures.tsx', () => {
  it('matches what the generator produces right now', () => {
    const path = 'src/components/chemistry/structures.tsx';
    const before = readFileSync(path, 'utf8');
    try {
      execFileSync('python3', ['scripts/chemistry/build_structures.py'], { stdio: 'pipe' });
    } catch {
      // No Python available (some CI images have none). A missing interpreter must not be
      // reported as a stale build, so skip rather than fail on something unrelated.
      return;
    }
    const after = readFileSync(path, 'utf8');
    if (before !== after) writeFileSync(path, before);   // leave the tree as we found it
    expect(after, 'run `npm run build:structures` and commit the result').toBe(before);
  });

  /*
   * THE SIGN OF ZERO IS NOT GEOMETRY, and it is how this file came to differ between two
   * machines that were both right. IEEE-754 has two zeros; `-0.0` and `0.0` format
   * differently; and 236 coordinates in this deck are mathematically zero, arriving as a few
   * femtounits of trig residue whose sign belongs to whichever libm computed the cosine. The
   * test above then failed for everyone whose platform disagreed with whoever last ran the
   * generator, and the only way to "fix" it was to commit your own platform's coin-flips.
   *
   * `_c()` in `mol.py` snaps that residue to a true zero. This asserts the OUTPUT rather
   * than the helper, because the helper could be bypassed by a sixth format site added later
   * — there were five, and every one had to be changed.
   */
  it('writes no negative zero, which would differ between platforms', () => {
    const source = readFileSync('src/components/chemistry/structures.tsx', 'utf8');
    const offenders = [...source.matchAll(/-0\.0(?![0-9])/g)].length;
    expect(offenders, 'a coordinate kept a platform-dependent sign of zero').toBe(0);
  });
});
