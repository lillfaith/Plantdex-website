import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import spriteManifest from '@/data/sprites.json';

/**
 * THE SCOUT BORROWS THE SPRITE SYSTEM'S RENDERING AND STAYS OUT OF ITS DATA.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `ScanScout` is a generated sheet — `scripts/build_scan_scout.py` → `public/scan/scout.png`
 * — walked by the same `background-position` + `steps()` + `pixelated` combination every
 * plant portrait uses. It is deliberately NOT in `sprites.json`: that manifest is keyed by
 * herb id, every entry is a species with an authored trademark gesture, and
 * `audit_sprites.py` checks all 54 against the deck. A magnifying glass in there means
 * either handing one species a prop the other 53 lack, or minting a 55th "species" that is
 * not a plant.
 *
 * Two things follow, and both are load-bearing rather than tidy:
 *
 * FIRST, NOTHING ELSE CHECKS THIS SHEET. `audit_sprites.py` walks the manifest, so it never
 * sees the scout; `npm run verify` cannot run Python at all. These are the only assertions
 * standing between a regenerated sheet and a creature that slides instead of snapping.
 *
 * SECOND, RESOLUTION IS INVISIBLE UNTIL IT IS ON SCREEN. The scout sits beside the nav and
 * above a grid full of real sprites, and a grid is what makes cell size visible: at a given
 * rendered width a COARSER cell makes each authored pixel bigger. Drawn 26x22 once, its
 * pixels came out ~30% larger than a plant's at the same size, and the one decorative
 * creature in the app was the one thing on screen from a different drawing. Nothing about
 * that fails a build and nothing about it shows in an ASCII preview.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const GENERATOR = readFileSync('scripts/build_scan_scout.py', 'utf8');
const COMPONENT = readFileSync('src/components/scan/ScanScout.tsx', 'utf8');
const CSS = readFileSync('src/app/globals.css', 'utf8');
const SHEET = readFileSync('public/scan/scout.png');

/**
 * The sheet's real dimensions, read from the PNG's own IHDR rather than from anything that
 * merely describes it. A number in a manifest can name a file nobody rendered; these two are
 * the file.
 */
const sheetSize = (() => {
  expect(SHEET.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect(SHEET.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return { width: SHEET.readUInt32BE(16), height: SHEET.readUInt32BE(20) };
})();

/** The frame count the generator authored, and the `steps()` the stylesheet actually walks. */
const authoredFrames = (() => {
  const block = GENERATOR.slice(GENERATOR.indexOf('FRAMES = ('), GENERATOR.indexOf('\n)', GENERATOR.indexOf('FRAMES = (')));
  return [...block.matchAll(/\(\(-?\d+, -?\d+\), \(-?\d+, -?\d+\)\)/g)].length;
})();
const cssSteps = Number(/animation:\s*scan-scout-look[^;]*steps\((\d+)\)/.exec(CSS)![1]);

/**
 * The authored cell every plant sprite is drawn on, divided back out of the shipped PNGs.
 *
 * `SCALE` is not in the manifest, so it is recovered from the one thing that is: every sheet
 * shares one frame size, and 5 is the factor that makes both dimensions whole and lands on
 * the 34x28 the sprite sources are written against.
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
  it('uses the same authored cell, and the same scale, every plant sprite uses', () => {
    expect(deckCell).toEqual({ width: 34, height: 28 });
    expect(sheetSize.height).toBe(deckCell.height * SPRITE_SCALE);
    expect(sheetSize.width).toBe(deckCell.width * SPRITE_SCALE * authoredFrames);
  });

  it('declares the cell it was drawn on, so a regenerated sheet cannot silently resize', () => {
    expect(GENERATOR).toMatch(/CELL_W, CELL_H = 34, 28/);
    expect(GENERATOR).toMatch(/^SCALE = 5$/m);
  });
});

describe('the scout snaps rather than sliding', () => {
  it('walks exactly as many steps as the sheet has frames', () => {
    /*
     * `steps()` cannot read a custom property, so the count is a literal in the stylesheet
     * and a literal in the generator, and nothing but this makes them agree. One frame out
     * and every step lands between two frames — the creature slides, which is the single
     * thing this whole change was made to stop. `build_sprites.py` refuses to emit a sheet
     * whose frame count has no class in `globals.css` for the same reason.
     */
    expect(cssSteps).toBe(authoredFrames);
  });

  it('carries the off-by-one-frame correction the percentage walk needs', () => {
    /*
     * A percentage background-position is measured against (container - image), so with the
     * sheet at frames × 100% wide, 0% is the first frame and 100% is the LAST — not one past
     * it. `--scout-travel` is 100 × frames / (frames - 1) so the final step lands square.
     * Identical to `--sprite-travel`; wrong, and every frame is a smear of two.
     */
    const travel = Number(/--scout-travel:\s*([\d.]+)%/.exec(CSS)![1]);
    expect(travel).toBeCloseTo((100 * authoredFrames) / (authoredFrames - 1), 3);
    expect(/--scout-frames:\s*(\d+)/.exec(CSS)![1]).toBe(String(authoredFrames));
  });

  it('holds the resting pose under reduced motion, and never the last frame', () => {
    const block = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
    const rule = block.slice(block.indexOf('.scan-scout {'), block.indexOf('}', block.indexOf('.scan-scout {')));
    expect(rule).toMatch(/animation:\s*none\s*!important/);
    // `forwards` would strand it on frame 13 — the trap `.plant-sprite-once` documents.
    expect(rule).not.toMatch(/animation-fill-mode/);
  });
});

describe('the scout stays out of the deck’s data', () => {
  it('is not a species', () => {
    const ids = Object.keys(spriteManifest as Record<string, unknown>);
    expect(ids).not.toContain('scout');
    expect(ids.filter((id) => id.includes('scout'))).toEqual([]);
  });

  it('is generated, and says so where somebody would otherwise hand-edit it', () => {
    // Same contract as `herbs.json` and the 54 plant sheets: the PNG is output, not source.
    expect(COMPONENT).toMatch(/build_scan_scout\.py/);
    expect(COMPONENT).toMatch(/never hand-edit the PNG/i);
  });
});

describe('the scout renders where it is asked to', () => {
  it('resolves its sheet through assetPath, not a root-absolute CSS url', () => {
    /*
     * A `url('/scan/scout.png')` written in the stylesheet is the one asset reference
     * `basePath` does not rewrite, so the `/Plantdex-website` build would 404 it and the
     * creature would simply not be there — on a page that still looked fine otherwise.
     */
    expect(COMPONENT).toMatch(/assetPath\('\/scan\/scout\.png'\)/);
    expect(CSS).not.toMatch(/url\(['"]?\/scan\/scout\.png/);
  });

  it('takes its width from the caller, never from itself', () => {
    /*
     * `w-full` here and `w-16` from the caller are both one-class utilities, so neither wins
     * on specificity and whichever Tailwind emits last decides — which rendered this 367px
     * wide instead of 64.
     */
    const rendered = COMPONENT.slice(COMPONENT.indexOf('className={`scan-scout'));
    expect(rendered).not.toMatch(/\bw-full\b/);
    // The viewBox used to hold the proportion; nothing else does now.
    expect(CSS).toMatch(/aspect-ratio:\s*34\s*\/\s*28/);
  });

  it('says nothing to a screen reader', () => {
    // Same rule as the Seed Shelf's pots: it is furniture, and the words under it are the
    // ones this page exists for.
    expect(COMPONENT).toMatch(/aria-hidden="true"/);
  });
});
