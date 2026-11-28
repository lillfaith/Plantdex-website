import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * QUIET WHILE BROWSING.
 *
 * An `infinite` animation is ambient motion: it runs for as long as the page is open, whether
 * or not anyone is looking, and on a phone it is battery. This app keeps exactly the loops
 * below on purpose, and a new one has to be ADDED TO THIS LIST WITH A REASON to ship, which is
 * what makes it a decision somebody made rather than something that crept in.
 *
 * The stylesheet is parsed as source (the same way `plant-sprites.test.ts` reads it), so a loop
 * declared in `animation` or `animation-iteration-count`, under any selector, `@utility` or
 * media query, is found.
 */

const CSS = readFileSync('src/app/globals.css', 'utf8');
const SHELF = readFileSync('src/components/herbdex/AchievementShelf.tsx', 'utf8');

/** Selector (or `@utility` name) -> why it is allowed to loop forever. */
const INFINITE_ALLOW_LIST: ReadonlyArray<{ match: RegExp; reason: string }> = [
  {
    match: /^\.plant-sprite(-[\w-]+)?$/,
    reason: 'Species portraits are the game\'s identity; they pause offscreen and while the tab is hidden (sprite-visibility.ts).',
  },
  {
    match: /^\.growth-loader \.growth-(stem|leaf)$/,
    reason: 'GrowthLoader is a loading indicator: real work is in progress and it unmounts when it ends.',
  },
  {
    match: /^\.scan-scout/,
    reason: 'ScanScout creature on /scan; the scan lane restricts it to identification waiting.',
  },
  {
    match: /^\.cf-(scene|flash|brackets|card|stack-top|plus|arrow)$/,
    reason: 'TRANSITIONAL: /scan explainer loop until CollectFlow adopts `.cf-once` (scan lane); then delete this entry.',
  },
];

interface Declaration {
  selector: string;
  property: string;
  value: string;
}

/** Every declaration in the stylesheet, with the innermost non-@media/@supports header it sits in. */
function declarations(source: string): Declaration[] {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: Declaration[] = [];
  const stack: string[] = [];
  let buffer = '';
  for (const ch of css) {
    if (ch === '{') {
      stack.push(buffer.trim());
      buffer = '';
    } else if (ch === '}') {
      flush();
      stack.pop();
    } else if (ch === ';') {
      flush();
    } else {
      buffer += ch;
    }
  }
  function flush() {
    const text = buffer.trim();
    buffer = '';
    const colon = text.indexOf(':');
    if (!text || colon < 0 || stack.length === 0) return;
    const header = [...stack].reverse().find((h) => !/^@(media|supports|layer)\b/.test(h) && !/^@keyframes\b/.test(h));
    if (!header || stack.some((h) => /^@keyframes\b/.test(h))) return;
    out.push({
      selector: header.replace(/^@utility\s+/, '.').replace(/\s+/g, ' '),
      property: text.slice(0, colon).trim(),
      value: text.slice(colon + 1).trim(),
    });
  }
  return out;
}

const loops = declarations(CSS).filter(
  (d) => (d.property === 'animation' || d.property === 'animation-iteration-count') && /\binfinite\b/.test(d.value),
);

describe('ambient motion', () => {
  it('finds the loops it is meant to police', () => {
    // If the parser stopped seeing the sprite loop it would pass vacuously.
    expect(loops.some((d) => d.selector === '.plant-sprite')).toBe(true);
    expect(loops.length).toBeGreaterThan(3);
  });

  it('allows an infinite animation only for an explicitly listed reason', () => {
    const unlisted = loops.filter((d) => !INFINITE_ALLOW_LIST.some((entry) => entry.match.test(d.selector)));
    expect(
      unlisted.map((d) => `${d.selector} { ${d.property}: ${d.value} }`),
      'new infinite animation: finish it after a few passes, or add it to INFINITE_ALLOW_LIST with a reason',
    ).toEqual([]);
  });

  it('gives every allow-list entry a real reason', () => {
    for (const entry of INFINITE_ALLOW_LIST) expect(entry.reason.length).toBeGreaterThan(20);
  });

  it('keeps no allow-list entry that nothing uses', () => {
    for (const entry of INFINITE_ALLOW_LIST) {
      expect(
        loops.some((d) => entry.match.test(d.selector)),
        `stale entry: ${entry.match}`,
      ).toBe(true);
    }
  });

  it('has removed the loops the owner asked to be quiet', () => {
    for (const name of ['achievement-rail', 'showcase-drift', 'showcase-halo', 'node-pulse', 'welcome-drift', 'welcome-scan', 'sparkle-drift']) {
      expect(
        loops.filter((d) => d.value.includes(name)),
        `${name} loops again`,
      ).toEqual([]);
    }
  });

  it('lets the Collect Flow explainer play once and hold its end state', () => {
    expect(CSS).toMatch(/\.cf-once \.cf-card \{[^}]*animation-iteration-count: 1[^}]*fill-mode: both/);
    expect(CSS).toMatch(/\.cf-once \.cf-scene \{[^}]*animation-iteration-count: 1[^}]*fill-mode: forwards/);
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*\.cf-once \.cf-card[^}]*animation: none !important/);
  });

  it('pauses sprites while the page is hidden with one rule', () => {
    expect(CSS).toMatch(/html\[data-page-hidden\] \.plant-sprite \{\s*animation-play-state: paused !important/);
  });
});

describe('AchievementShelf', () => {
  it('uses no animation class and does not duplicate its content', () => {
    expect(SHELF.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/animate-|achievement-rail|marquee|animation/);
    expect(SHELF).not.toMatch(/\[0, 1\]\.map/);
  });

  it('is a stationary row the player can scroll by hand and by keyboard', () => {
    expect(SHELF).toContain('overflow-x-auto');
    expect(SHELF).toContain('snap-x');
    expect(SHELF).toContain('tabIndex={0}');
  });
});
