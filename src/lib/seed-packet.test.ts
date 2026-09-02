import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  PACKET_ACCENTS,
  PACKET_HEIGHT,
  PACKET_MOTIFS,
  PACKET_SHAPES,
  PACKET_WIDTH,
  packetGrid,
  packetRecipe,
  parseRecipe,
} from './seed-packet';
import { normalizeName } from './plant-match';

/**
 * THE PROCEDURAL PACKET.
 *
 * Two properties carry the whole design, and both are invisible until they break:
 *
 *   DETERMINISM   the same species must produce the same packet — on another device, for
 *                 another player, next year. That is what lets two shelves agree without a
 *                 shared registry, and it is the reason the generator may never touch
 *                 `Math.random()`, a clock, or anything but the name.
 *   CONFINEMENT   every colour is an existing deck token. A generator free to invent colours
 *                 is a generator that eventually renders a lime-green bag on a plum page.
 */

const CSS = readFileSync('src/app/globals.css', 'utf8');
const THEME_COLOURS = new Set([...CSS.matchAll(/--color-([a-z0-9-]+):/g)].map(([, name]) => name!));

const SPECIES = [
  'bellis perennis',
  'taraxacum erythrospermum',
  'poa annua',
  'dryopteris filix-mas',
  'rubus idaeus',
  'trifolium repens',
  'cirsium vulgare',
  'pinus sylvestris',
  'daucus carota',
  'plantago lanceolata',
  'rosa canina',
  'urtica urens',
];

describe('the same species always gets the same packet', () => {
  it('is stable across calls', () => {
    for (const speciesKey of SPECIES) {
      expect(packetRecipe({ speciesKey })).toEqual(packetRecipe({ speciesKey }));
    }
  });

  it('depends on the species key alone, not on how the name was spelt', () => {
    /*
     * The key is what the shelf stores, so the packet has to be a function of it: two
     * players whose identifier spelt the same plant differently — with authorship, with a
     * subspecies — must still see one packet, or "the same species always looks the same"
     * is only true for people who scanned it the same way.
     */
    const key = normalizeName('Bellis perennis L.');
    expect(normalizeName('Bellis perennis subsp. perennis')).toBe(key);
    expect(packetRecipe({ speciesKey: key, scientificName: 'Bellis perennis L.' })).toEqual(
      packetRecipe({ speciesKey: key, scientificName: 'Bellis perennis subsp. perennis' }),
    );
  });

  it('reads nothing but its inputs', () => {
    // A clock or a random source here would break every promise above, and would do it
    // silently — the packet would simply be different tomorrow.
    const source = readFileSync('src/lib/seed-packet.ts', 'utf8').replace(
      /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
      '',
    );
    expect(source, 'the packet generator must not use Math.random()').not.toMatch(/Math\.random/);
    expect(source, 'the packet generator must not read a clock').not.toMatch(/Date\.now|new Date/);
  });

  it('gives different species different packets, most of the time', () => {
    // Not all of the time: the kit is finite, so collisions exist and are fine. What would
    // not be fine is a generator whose draws barely move — a shelf of near-identical bags.
    const seen = new Set(SPECIES.map((speciesKey) => JSON.stringify(packetRecipe({ speciesKey }))));
    expect(seen.size).toBeGreaterThanOrEqual(SPECIES.length - 2);
  });
});

describe('the palette stays the deck palette', () => {
  it('names only colours that exist in globals.css', () => {
    expect(THEME_COLOURS.size).toBeGreaterThan(25); // the guard is reading a real file
    for (const speciesKey of SPECIES) {
      const recipe = packetRecipe({ speciesKey });
      for (const token of [recipe.paper, recipe.band, recipe.ink]) {
        expect(THEME_COLOURS, `${speciesKey} uses an undefined colour: ${token}`).toContain(token);
      }
    }
  });

  it('holds no hex value of its own', () => {
    const source = readFileSync('src/lib/seed-packet.ts', 'utf8');
    expect(source, 'a colour was hard-coded instead of named').not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('a name that describes the plant is used', () => {
  /*
   * The only part of the artwork that is not arbitrary. Reading a form out of the plant's own
   * name is honest — a Trifolium does have trifoliate leaves — while inventing one from a
   * photograph the app never saw would not be.
   */
  it('takes the motif from a form word in the name', () => {
    expect(packetRecipe({ speciesKey: 'poa annua', commonName: 'Annual meadow grass' }).motif).toBe(
      'grass',
    );
    expect(packetRecipe({ speciesKey: 'trifolium repens' }).motif).toBe('clover');
    expect(packetRecipe({ speciesKey: 'rubus idaeus' }).motif).toBe('berry');
    expect(packetRecipe({ speciesKey: 'pinus sylvestris' }).motif).toBe('cone');
    expect(packetRecipe({ speciesKey: 'cirsium vulgare' }).motif).toBe('thistle');
  });

  it('takes the band colour from a colour word in the name', () => {
    expect(
      packetRecipe({ speciesKey: 'oxalis stricta', commonName: 'Yellow woodsorrel' }).band,
    ).toBe('gold-500');
    expect(packetRecipe({ speciesKey: 'nymphaea alba', commonName: 'White water lily' }).band).toBe(
      'violet-200',
    );
  });

  it('falls back to a deterministic draw for a name that describes nothing', () => {
    const recipe = packetRecipe({ speciesKey: 'silene vulgaris' });
    expect(PACKET_MOTIFS).toContain(recipe.motif);
  });
});

describe('the assembled artwork', () => {
  it('is the declared size, whatever the shape', () => {
    for (const shape of PACKET_SHAPES) {
      const grid = packetGrid({
        version: 1,
        shape,
        motif: 'bloom',
        accent: 'none',
        paper: 'mystery-lilac',
        band: 'gold-500',
        ink: 'violet-800',
      });
      expect(grid).toHaveLength(PACKET_HEIGHT);
      for (const row of grid) expect(row).toHaveLength(PACKET_WIDTH);
    }
  });

  it('never lets a motif or an accent punch through the bag', () => {
    /*
     * Motifs are stamped at a fixed origin, so a motif drawn one pixel too wide would land on
     * the outline and open a hole in the paper — the pixel-art equivalent of the misplaced
     * features `audit_sprites.py` exists to catch. Painting only ever happens over paper, and
     * this is what proves it for every combination in the kit.
     */
    for (const shape of PACKET_SHAPES) {
      const blank = packetGrid({
        version: 1,
        shape,
        motif: 'bloom',
        accent: 'none',
        paper: 'mystery-lilac',
        band: 'gold-500',
        ink: 'violet-800',
      });
      const outline = blank.map((row) => [...row].map((cell) => cell === 'o'));

      for (const motif of PACKET_MOTIFS) {
        for (const accent of PACKET_ACCENTS) {
          const grid = packetGrid({
            version: 1,
            shape,
            motif,
            accent,
            paper: 'mystery-lilac',
            band: 'gold-500',
            ink: 'violet-800',
          });
          for (let y = 0; y < grid.length; y += 1) {
            for (let x = 0; x < grid[y]!.length; x += 1) {
              if (outline[y]![x]) {
                expect(
                  grid[y]![x],
                  `${shape}/${motif}/${accent} overwrote the outline at ${x},${y}`,
                ).toBe('o');
              }
            }
          }
        }
      }
    }
  });

  it('actually draws the motif somewhere', () => {
    // A guard against the opposite failure of the one above: a motif placed off the paper
    // would be clipped away entirely and every packet would look the same.
    for (const motif of PACKET_MOTIFS) {
      const grid = packetGrid({
        version: 1,
        shape: 'flat',
        motif,
        accent: 'none',
        paper: 'mystery-lilac',
        band: 'gold-500',
        ink: 'violet-800',
      });
      expect(grid.join('').includes('i'), `${motif} drew nothing`).toBe(true);
    }
  });
});

describe('stored recipes', () => {
  it('round-trips one it wrote itself', () => {
    const recipe = packetRecipe({ speciesKey: 'bellis perennis' });
    expect(parseRecipe(JSON.parse(JSON.stringify(recipe)))).toEqual(recipe);
  });

  it('refuses anything it does not recognise', () => {
    expect(parseRecipe(null)).toBeNull();
    expect(parseRecipe({ shape: 'origami' })).toBeNull();
    expect(parseRecipe({ ...packetRecipe({ speciesKey: 'bellis perennis' }), paper: '#ff00ff' })).toBeNull();
  });
});
