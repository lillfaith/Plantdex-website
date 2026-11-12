import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';

/**
 * A CLASS NAME GLUED TO A TEMPLATE INTERPOLATION IS NEVER GENERATED, AND NOTHING FAILS.
 *
 * Tailwind finds utilities by scanning source TEXT for candidates, so it reads
 * `w-44${cond ? …}` as the single token `w-44${cond` — not a utility, so `.w-44` is never
 * emitted. The markup still carries `class="… w-44 …"`, the element just has no width rule,
 * and every check passes: types, lint, the build, and a unit test asserting the class is in
 * the string. It is only visible by measuring the rendered element.
 *
 * This shipped. The discovery reveal's card lost `w-44` exactly this way and rendered at the
 * container's full width — 310px instead of 176px — which made the dialog scroll both
 * horizontally and vertically on a phone and pushed the XP and achievements off the screen.
 *
 * The fix is always a space before the interpolation. This guard reads the same source
 * Tailwind does and fails on the shape rather than on any one instance.
 */
function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) return tsxFiles(full);
    return /\.tsx$/.test(entry) ? [full] : [];
  });
}

describe('tailwind can see every class that is written', () => {
  it('never glues a class name directly to a template interpolation', () => {
    const offenders: string[] = [];

    for (const file of tsxFiles('src')) {
      const source = readFileSync(file, 'utf8');
      // Every className={`…`} template literal, including ones broken across lines.
      for (const match of source.matchAll(/className=\{`([^`]*)`\}/g)) {
        const literal = match[1] ?? '';
        /*
         * A COMPLETE UTILITY TRUNCATED BY AN INTERPOLATION IS THE HAZARD — not every
         * interpolation. Three forms are deliberate and safe, and the rule has to admit
         * them or it fails on correct code:
         *
         *   `${a} ${b}`      whitespace between: both tokens are whole.
         *   `…''}${cond…`    two adjacent interpolations, each yielding a leading space.
         *   `plant-sprite-${n}`  a trailing HYPHEN, which is a class being assembled on
         *                    purpose. `PlantSprite` does this for `plant-sprite-14`, and
         *                    those classes are hand-authored in globals.css rather than
         *                    generated, so Tailwind never needed to see them whole.
         *
         * What is left — a finished utility with `${` welded to its end, like `w-44${…}` —
         * is always a mistake, because the class Tailwind was meant to generate no longer
         * appears anywhere it can read.
         */
        if (/[^\s{}-]\$\{/.test(literal)) {
          offenders.push(`${file}: ${literal.replace(/\s+/g, ' ').slice(0, 80)}`);
        }
        if (/\}[A-Za-z0-9_-]/.test(literal)) {
          offenders.push(`${file}: (closing brace glued) ${literal.replace(/\s+/g, ' ').slice(0, 80)}`);
        }
      }
    }

    expect(offenders, `put a space before the interpolation:\n${offenders.join('\n')}`).toEqual([]);
  });

  // The class this actually cost us, asserted directly so the reveal cannot lose it again.
  it('keeps the reveal card at a fixed width', () => {
    const reveal = readFileSync('src/components/herbdex/DiscoveryCelebration.tsx', 'utf8');
    expect(reveal).toMatch(/className="flip-scene[^"]*\bw-44\b/);
  });
});
