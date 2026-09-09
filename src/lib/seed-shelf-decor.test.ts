import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BLOOM,
  CLAY,
  FILL,
  FOLIAGE,
  SHELF_PLANTS,
} from '../components/seedshelf/ShelfPlant';

/**
 * THE SEED SHELF'S ROOM — the wall behind it, and the plants standing on it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Two things here can break silently, which is the only reason either is a test.
 *
 * The wall is the one surface in the app that body text is printed straight onto, so its
 * lightest shade decides whether the page passes AA. Nothing about a lighter brown LOOKS
 * wrong while you are choosing it — that is precisely the failure mode.
 *
 * And the pots are authored as strings. A character dropped from one row shifts every pixel
 * after it left by one and shortens the plant, which renders as a slightly odd leaf rather
 * than as an error, on a page nobody re-reads once it ships.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const CSS = readFileSync(join(import.meta.dirname, '..', 'app', 'globals.css'), 'utf8');

/** Every component source, concatenated — what Tailwind itself scans for class names. */
const SOURCES = (function walk(dir: string): string {
  return readdirSync(dir, { withFileTypes: true })
    .map((entry) =>
      entry.isDirectory()
        ? walk(join(dir, entry.name))
        : /\.tsx?$/.test(entry.name)
          ? readFileSync(join(dir, entry.name), 'utf8')
          : '',
    )
    .join('\n');
})(join(import.meta.dirname, '..', 'components'));

const shelfWall = () => {
  const block = CSS.match(/@utility shelf-wall \{([\s\S]*?)\n\}/);
  expect(block, 'the shelf-wall utility is gone').not.toBeNull();
  return block![1]!;
};

describe('the wall never gets lighter than the text can survive', () => {
  /*
   * Measured, not asserted from memory. These are the page's own shades against the wood
   * ramp, and they are why the ceiling is wood-700 rather than a matter of taste:
   *
   *            wood-700   wood-600   wood-500   wood-400
   *   violet-400   5.35      4.31       3.21       2.28     ← the safety note at the foot
   *   violet-300   7.10      5.71       4.25       3.03     ← the subtitle
   *
   * At wood-500 the safety note is 3.21:1. It is the sentence saying a packet is not a
   * confirmed identification, so it is the last text on this page that may quietly go dim.
   */
  const TOO_LIGHT = ['wood-400', 'wood-500', 'wood-600'];

  it('paints only with wood-700 and shades mixed down from it', () => {
    const block = shelfWall();
    for (const shade of TOO_LIGHT) {
      expect(block, `shelf-wall uses ${shade}, which drops body text below AA`).not.toContain(
        shade,
      );
    }
    expect(block).toContain('--color-wood-700');
  });

  /**
   * Every `color-mix(...)` in the block, with its own nested `var(...)` intact.
   *
   * A regex cannot do this: `color-mix\(in srgb,([^)]*)\)` stops at the first `)`, which
   * belongs to the `var(--color-wood-700)` INSIDE the mix — so it returns half an expression
   * and the assertion built on it fails for a reason that has nothing to do with the CSS.
   * That is exactly what the first draft of this test did.
   */
  const colorMixes = (block: string) => {
    const found: string[] = [];
    for (let i = block.indexOf('color-mix('); i !== -1; i = block.indexOf('color-mix(', i + 1)) {
      let depth = 0;
      for (let j = i + 'color-mix'.length; j < block.length; j += 1) {
        if (block[j] === '(') depth += 1;
        if (block[j] === ')') {
          depth -= 1;
          if (depth === 0) {
            found.push(block.slice(i, j + 1));
            break;
          }
        }
      }
    }
    return found;
  };

  it('mixes toward the dark ground rather than toward transparency', () => {
    // A mix toward `transparent` composites against whatever is behind the wall, so the wall
    // would end up lighter than it reads here by an amount nobody measured. Mixing toward an
    // opaque token keeps the result computable, which is what the ceiling above depends on.
    const mixes = colorMixes(shelfWall());
    expect(mixes.length, 'the wall stopped mixing its shades').toBeGreaterThan(0);
    for (const mix of mixes) {
      expect(mix, 'a wall shade mixes toward transparent').not.toContain('transparent');
      expect(mix).toContain('--color-plum-950');
    }
  });

  it('snaps every gradient stop to a whole pixel, which is what makes it read as pixel art', () => {
    /*
     * The mix RATIOS are percentages and legitimately so — `wood-700 84%` is a proportion of
     * a colour, not a position on the page. They are removed before the stops are counted,
     * because the rule being enforced is about geometry.
     */
    let block = shelfWall();
    for (const mix of colorMixes(block)) block = block.replace(mix, 'COLOUR');

    const stops = [...block.matchAll(/(\d*\.?\d+)(px|%)/g)];
    expect(stops.length, 'the wall has no stops at all').toBeGreaterThan(4);
    for (const [text, value, unit] of stops) {
      expect(unit, `${text} is a percentage, which will not land on a pixel`).toBe('px');
      expect(Number(value) % 1, `${text} is a fractional pixel`).toBe(0);
    }
  });

  it('is used by the shelf, and by nothing else', () => {
    // A wall behind the nav or the footer would be a sitewide theme change made by one page.
    const view = readFileSync(
      join(import.meta.dirname, '..', 'components', 'seedshelf', 'SeedShelfView.tsx'),
      'utf8',
    );
    expect(view).toContain('shelf-wall');
  });
});

describe('every potted plant is a whole rectangle', () => {
  it('has a whole archetype library, so a shelf is never one plant repeated', () => {
    // Ten shapes rather than three. The point is not the number: it is that a long shelf
    // shows leafy, fern, grass, rosette, vine, broadleaf, shrub, berrying and flowering
    // forms, which is the vocabulary a botanical plate uses before it knows the species.
    expect(SHELF_PLANTS.length).toBeGreaterThanOrEqual(10);
  });

  it('is rectangular, and every archetype is the same size', () => {
    const sizes = new Set<string>();
    for (const [index, grid] of SHELF_PLANTS.entries()) {
      const widths = new Set(grid.map((row) => row.length));
      expect(widths.size, `plant ${index} has ragged rows: ${[...widths].join(', ')}`).toBe(1);
      sizes.add(`${grid[0]!.length}x${grid.length}`);
    }
    expect(sizes.size, `plants are different sizes: ${[...sizes].join(', ')}`).toBe(1);
  });

  it('stands its pot on the same rows in every one, so rims line up on a board', () => {
    const pots = SHELF_PLANTS.map((grid) => grid.slice(-7).join('|'));
    expect(new Set(pots).size, 'the pots differ between variants').toBe(1);
    // And the pot is actually a pot, not eleven rows of foliage that happen to match.
    expect(pots[0]).toContain('r');
    expect(pots[0]).toContain('k');
  });

  it('draws a different plant for every archetype rather than copies', () => {
    const foliage = SHELF_PLANTS.map((grid) => grid.slice(0, -7).join('|'));
    expect(new Set(foliage).size).toBe(SHELF_PLANTS.length);
  });

  it('uses only cells the fill table knows, so nothing renders as undefined', () => {
    /*
     * `fill={fill[cell]}` on an unknown character yields `undefined`, and SVG then paints the
     * rect BLACK rather than dropping it — a typo would show as a black block on the shelf.
     *
     * Reads the exported table rather than parsing the source for an object literal, which is
     * what it used to do: the fills are now built by a function so each plant can take its own
     * foliage, bloom and clay, and a regex over the file stopped finding anything at all.
     */
    const known = new Set([...Object.keys(FILL), '.']);
    const used = new Set(SHELF_PLANTS.flatMap((grid) => grid.flatMap((row) => [...row])));
    for (const cell of used) {
      expect(known.has(cell), `no fill for ${JSON.stringify(cell)}`).toBe(true);
    }
  });

  it('paints every archetype from deck tokens that really exist', () => {
    // The pots stand among the packets and are bound by the same rule: no hex anywhere, and
    // no token invented here that globals.css does not define — a missing token paints the
    // rect black rather than failing, so it has to be caught here.
    for (const name of [...FOLIAGE, ...BLOOM, ...CLAY]) {
      expect(CSS, `--color-${name} is used by a pot but not defined`).toContain(`--color-${name}:`);
    }
    // AND IT HAS TO SURVIVE THE BUILD, which being in the file does not guarantee. Tailwind v4
    // tree-shakes theme variables no utility class mentions, and every art token is used only
    // from an inline `fill="var(--color-...)"` that it cannot see. They were dropped from the
    // built stylesheet, SVG painted the undefined fills BLACK, and the build reported success —
    // caught by a screenshot, not by this file, because this file was reading the source.
    // `@theme static` is what keeps them; asserting it here is what stops the next one being
    // added to the wrong block.
    const staticBlock = CSS.match(/@theme static \{([\s\S]*?)\n\}/);
    expect(staticBlock, 'the static art-token block is gone').not.toBeNull();
    for (const name of [...FOLIAGE, ...BLOOM, ...CLAY]) {
      const declaredStatic = staticBlock![1]!.includes(`--color-${name}:`);
      // A token referenced anywhere else in the stylesheet — inside a `@utility`, say — is
      // seen by Tailwind and kept. `habitat-woodland` survives exactly that way. So the rule
      // is: reachable from the stylesheet, or declared static. Nothing else is safe.
      const referenced = CSS.split(`--color-${name}`).length - 1 > 1;
      // ...or named by a utility class in the components, which is how `gold-400` survives:
      // Tailwind scans the TSX, not just the stylesheet.
      const usedAsClass = new RegExp(`-${name}\\b`).test(SOURCES);
      expect(
        declaredStatic || referenced || usedAsClass,
        `--color-${name} is art-only and neither static nor referenced, so the build will drop it`,
      ).toBe(true);
    }
    for (const value of Object.values(FILL)) {
      expect(value, 'a pot fill holds a raw hex value').not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(value).toContain('var(--color-');
    }
  });

  it('varies foliage, bloom and clay so a shelf is not one plant recoloured once', () => {
    // Three separate ramps stepped at different rates. If they marched together there would
    // be only as many looks as the shortest list, however many archetypes existed.
    expect(FOLIAGE.length).toBeGreaterThanOrEqual(4);
    expect(BLOOM.length).toBeGreaterThanOrEqual(4);
    expect(CLAY.length).toBeGreaterThanOrEqual(3);
  });

  it('names no species anywhere, because a pot is not an identification', () => {
    const source = readFileSync(
      join(import.meta.dirname, '..', 'components', 'seedshelf', 'ShelfPlant.tsx'),
      'utf8',
    );
    // A binomial in this file would mean somebody drew a specific plant, which is the one
    // claim decoration on THIS page must never make.
    expect(source.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/\b[A-Z][a-z]+ [a-z]{3,}\b/);
  });
});
