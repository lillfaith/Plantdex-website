import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import spriteManifest from '@/data/sprites.json';

/**
 * THE SCOUT IS DRAWN AT THE DECK'S RESOLUTION, AND THAT IS NOT A STYLE PREFERENCE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `ScanScout` is hand-authored pixel art in an SVG, not a sprite sheet — it is not a
 * species, `sprites.json` is keyed by herb id, and `audit_sprites.py` checks all 54 entries
 * against the deck (see the component's own header for why it cannot live there).
 *
 * But it sits on a page beside the nav and above a grid full of real sprites, and a grid is
 * what makes resolution visible: at a given rendered width a COARSER cell makes each
 * authored pixel bigger. Drawn 26x22, its pixels came out ~30% larger than a plant's at the
 * same size, and the one decorative creature in the app was the one thing on screen from a
 * different drawing. Nothing about that fails a build, and nothing about it is obvious in
 * the ASCII preview the geometry is authored through.
 *
 * So this reads the deck's own cell out of the generated manifest rather than repeating the
 * number: `build_sprites.py` emits 170x140 at `SCALE = 5`, and if that ever changes the
 * scout has to move with it or this fails.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const SOURCE = readFileSync('src/components/scan/ScanScout.tsx', 'utf8');

/** The grid rows, read back out of the component exactly as it renders them. */
const ROWS = (() => {
  const block = SOURCE.slice(SOURCE.indexOf('const SCOUT'), SOURCE.indexOf('];', SOURCE.indexOf('const SCOUT')));
  return [...block.matchAll(/'([.a-zA-Z]+)'/g)].map((m) => m[1]!);
})();

/**
 * The authored cell every plant sprite is drawn on, divided back out of the shipped PNG.
 *
 * `SCALE` is not in the manifest, so it is recovered from the one thing that is: every
 * sheet shares one frame size, and 5 is the factor that makes both dimensions whole and
 * lands on the 34x28 the sprite sources are written against.
 */
const SPRITE_SCALE = 5;
const deckCell = (() => {
  const counts = new Map<string, number>();
  for (const sheet of Object.values(
    spriteManifest as Record<string, { frameWidth: number; frameHeight: number }>,
  )) {
    const key = `${sheet.frameWidth}x${sheet.frameHeight}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  // THE MODE, not the first entry. One sheet is 230x160 — the home hero's wider canvas —
  // and reading whichever happened to sort first would pin the scout to it.
  const [commonest] = [...counts].sort((a, b) => b[1] - a[1]);
  const [width, height] = commonest![0].split('x').map(Number);
  return { width: width! / SPRITE_SCALE, height: height! / SPRITE_SCALE };
})();

describe('the scan scout is drawn at the deck’s resolution', () => {
  it('uses the same authored cell every plant sprite uses', () => {
    expect(deckCell).toEqual({ width: 34, height: 28 });
    expect(ROWS[0]!.length).toBe(deckCell.width);
    expect(ROWS.length).toBe(deckCell.height);
  });

  it('is not ragged, which a viewBox would silently stretch', () => {
    expect(new Set(ROWS.map((row) => row.length)).size).toBe(1);
  });

  it('paints every cell it uses', () => {
    /*
     * A cell with no entry in FILL renders `fill={undefined}`, which SVG paints BLACK — not
     * missing, not a build error, just a black rectangle in the middle of a creature. Two
     * Cyrillic homoglyphs were typed into an earlier grid and reached a render this way.
     */
    const fill = SOURCE.slice(SOURCE.indexOf('const FILL'), SOURCE.indexOf('};', SOURCE.indexOf('const FILL')));
    const painted = new Set([...fill.matchAll(/^\s*([a-zA-Z]):/gm)].map((m) => m[1]!));
    const used = new Set([...ROWS.join('')].filter((cell) => cell !== '.'));
    expect([...used].filter((cell) => !painted.has(cell))).toEqual([]);
  });

  it('takes its width from the caller, never from itself', () => {
    /*
     * `w-full` here and `w-16` from the caller are both one-class utilities, so neither wins
     * on specificity and whichever Tailwind emits last decides — which rendered this 367px
     * wide instead of 64. Only `h-auto`, so the viewBox keeps the aspect ratio.
     */
    const svgClass = SOURCE.slice(SOURCE.indexOf('scan-scout'), SOURCE.indexOf('>', SOURCE.indexOf('scan-scout')));
    expect(svgClass).not.toMatch(/\bw-full\b/);
  });

  it('says nothing to a screen reader', () => {
    // Same rule as the Seed Shelf's pots: it is furniture, and the words under it are the
    // ones this page exists for.
    expect(SOURCE).toMatch(/aria-hidden="true"/);
  });
});
