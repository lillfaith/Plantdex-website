import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * THE TWO CONSTRAINTS THE PROFILE'S VISUAL PASS WAS BUILT UNDER, AS TESTS.
 *
 *  1. NO NEW COLOUR. The profile is meant to look like a different PAGE, not a different
 *     product, so every shade it paints has to be one the deck already owns. This is not a
 *     hypothetical: `text-violet-100` was once used in 32 places while being undefined, and
 *     silently fell through to Tailwind's stock violet — a colour from outside the palette,
 *     shipped, invisible to review because the class name looked exactly right.
 *
 *  2. ONE BLOOM. `game-panel` is the only surface family in globals.css that glows, and its
 *     own comment caps the budget: "the printed card must stay the brightest object on the
 *     page". The profile spends it on the hero. A second glowing container is how a page
 *     stops having a hierarchy at all — which is the exact problem this pass fixed, in the
 *     other direction, by giving eight sections eight identical surfaces.
 *
 * Source-level, so it runs in `npm test` with no browser and no credentials. The rendered
 * side — composited contrast, type floor, hit areas — is measured separately in a browser
 * against the production build.
 */

const PROFILE_DIR = 'src/components/profile';
const CSS = readFileSync('src/app/globals.css', 'utf8');

/*
 * Comments are stripped before anything is counted. These files DISCUSS their surfaces at
 * length — the hero's header explains why it is the only `game-panel` on the page — and a
 * naive count found three mentions in prose plus one in `ProfileView`'s own explanation of
 * the ramp. A guard that fires on its own documentation gets deleted, not fixed.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

const files = readdirSync(PROFILE_DIR)
  .filter((name) => name.endsWith('.tsx'))
  .map((name) => ({
    name,
    source: stripComments(readFileSync(join(PROFILE_DIR, name), 'utf8')),
  }));

/** Colour tokens declared in the `@theme` block — `--color-plum-950` → `plum-950`. */
const THEME_COLOURS = new Set(
  [...CSS.matchAll(/--color-([a-z0-9-]+):/g)].map(([, name]) => name!),
);

/** Custom utilities, so `text-gold-plate` and friends are recognised rather than flagged. */
const UTILITIES = new Set([...CSS.matchAll(/@utility\s+([a-z0-9-]+)\s*\{/g)].map(([, n]) => n!));

/** Prefixes whose argument is a colour when it is anything at all. */
const COLOUR_PREFIXES =
  'text|bg|border|ring|from|via|to|stroke|fill|outline|divide|decoration|accent|caret|shadow';

/**
 * Anything shaped like `<word>-<word>-…-<number>` is a colour token by convention in this
 * palette (`violet-700`, `mystery-lilac` is not, `habitat-woodland` is not). Names without a
 * numeric shade are only checked when they are already known, because `border-t`,
 * `text-2xl`, `bg-gradient-to-r` and `ring-1` all share the same prefix grammar.
 */
const LOOKS_NUMERIC = /^[a-z]+(?:-[a-z]+)*-\d{2,4}$/;

function colourTokens(source: string): string[] {
  // The whole match, not a capture group: this pattern has none, and reading `match[1]`
  // gave `undefined` for every token — which threw rather than passing, but a check that
  // throws is no more use than one that passes vacuously.
  return [...source.matchAll(new RegExp(`\\b(?:${COLOUR_PREFIXES})-[a-z0-9[\\]./%_-]+`, 'g'))].map(
    (match) => match[0],
  );
}

function offendersIn(source: string): string[] {
  const bad: string[] = [];
  for (const raw of colourTokens(source)) {
    // `bg-gold-500/[0.07]` and `border-violet-700/50` → the token before the opacity.
    const token = raw.replace(/\/(?:\[[^\]]*\]|[\d.]+)$/, '');
    const rest = token.slice(token.indexOf('-') + 1);
    if (THEME_COLOURS.has(rest) || UTILITIES.has(token) || UTILITIES.has(rest)) continue;
    // Arbitrary values are the author's own business; the palette rule is about named shades.
    if (rest.startsWith('[')) continue;
    if (LOOKS_NUMERIC.test(rest)) bad.push(token);
  }
  return [...new Set(bad)];
}

describe('the palette', () => {
  it('parsed globals.css — an empty token set would pass every check below', () => {
    expect(THEME_COLOURS.size).toBeGreaterThan(25);
    expect(THEME_COLOURS.has('violet-700')).toBe(true);
    expect(THEME_COLOURS.has('plum-950')).toBe(true);
    expect(UTILITIES.has('game-panel')).toBe(true);
  });

  it('found real colour classes to check', () => {
    const all = files.flatMap((file) => colourTokens(file.source));
    expect(all.length).toBeGreaterThan(80);
  });

  it('is the only source of colour on the profile', () => {
    for (const file of files) {
      expect(offendersIn(file.source), `${file.name} paints a shade the deck does not define`).toEqual(
        [],
      );
    }
  });

  /* Proves the check above can actually fail — the guard that stops it going vacuous. */
  it('would catch a shade that is not in the theme', () => {
    expect(offendersIn('<p className="text-rose-400" />')).toEqual(['text-rose-400']);
    expect(offendersIn('<p className="bg-violet-900/40" />')).toEqual([]);
    expect(offendersIn('<p className="text-2xl border-t ring-1 bg-gradient-to-r" />')).toEqual([]);
  });
});

describe('the surface ramp', () => {
  const all = files.map((file) => file.source).join('\n');

  it('spends the page neon budget exactly once', () => {
    const blooms = files.flatMap((file) =>
      [...file.source.matchAll(/\bgame-panel\b/g)].map(() => file.name),
    );
    expect(blooms, 'game-panel must appear on the hero and nowhere else').toEqual([
      'ProfileHero.tsx',
    ]);
  });

  it('uses a real ramp rather than one surface repeated', () => {
    // The failure this pass existed to fix: nine consecutive `.panel` rectangles.
    for (const surface of ['game-panel', 'panel', 'field-panel', 'science-panel', 'sunken']) {
      expect(all, `the profile never uses ${surface}`).toContain(surface);
    }
  });

  it('keeps the trophies off any surface at all', () => {
    const trophies = files.find((file) => file.name === 'PinnedAchievements.tsx')!.source;
    // A `<section>` with no panel class is the whole point — medals float on the page ground.
    expect(trophies).not.toMatch(/className="[^"]*\b(game-panel|field-panel|science-panel)\b/);
    expect(trophies).toMatch(/<section[^>]*className="[^"]*px-1/);
  });
});
