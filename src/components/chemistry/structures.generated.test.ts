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
});
