import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SPRITE_ROOT_MARGIN, SPRITE_SELECTOR, spritePlayState } from './sprite-visibility';

const HOOK = readFileSync('src/lib/sprite-visibility.ts', 'utf8');
const GARDEN = readFileSync('src/components/garden/GardenView.tsx', 'utf8');

function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Two independent reasons to stop, and both must be false to play. A truth table is a test
 * rather than something to reproduce by scrolling with a tab in the background.
 */
describe('spritePlayState', () => {
  it('runs only when the sprite is on screen and the tab is visible', () => {
    expect(spritePlayState(true, true)).toBe('running');
  });

  it('pauses an offscreen sprite', () => {
    expect(spritePlayState(false, true)).toBe('paused');
  });

  // The browser tab in the background stops everything, however much is in view.
  it('pauses everything when the document is hidden', () => {
    expect(spritePlayState(true, false)).toBe('paused');
    expect(spritePlayState(false, false)).toBe('paused');
  });

  it('is exhaustive over both inputs', () => {
    const running: string[] = [];
    for (const onscreen of [true, false]) {
      for (const visible of [true, false]) {
        if (spritePlayState(onscreen, visible) === 'running') running.push(`${onscreen}/${visible}`);
      }
    }
    expect(running).toEqual(['true/true']);
  });
});

describe('how the pausing is implemented', () => {
  /*
   * `animation-play-state` FREEZES POSITION rather than resetting it, which is what satisfies
   * "resume without restarting" by construction. Anything that set `animation: none`, removed
   * a class carrying the animation, or swapped the background image would restart the gesture.
   */
  it('pauses with animation-play-state, never by removing the animation', () => {
    expect(code(HOOK)).toContain('animationPlayState');
    expect(code(HOOK)).not.toMatch(/animation\s*=\s*['"]none/);
    expect(code(HOOK)).not.toMatch(/classList\.(add|remove)/);
    expect(code(HOOK)).not.toMatch(/backgroundImage/);
  });

  // Setting React state per intersection is the obvious implementation and would make a page
  // of forty-five creatures slower than before the optimisation.
  it('uses no React state, no timers and no animation frames', () => {
    expect(code(HOOK)).not.toContain('useState');
    expect(code(HOOK)).not.toContain('setInterval');
    expect(code(HOOK)).not.toContain('setTimeout');
    expect(code(HOOK)).not.toContain('requestAnimationFrame');
  });

  it('reuses the existing sprite animation rather than defining another', () => {
    expect(SPRITE_SELECTOR).toBe('.plant-sprite');
    expect(code(HOOK)).not.toContain('@keyframes');
  });

  // Pausing must not unload or re-request the sheet.
  it('fetches nothing', () => {
    expect(code(HOOK)).not.toContain('fetch(');
    expect(code(HOOK)).not.toMatch(/new Image\(/);
    expect(code(HOOK)).not.toContain('.src =');
  });

  it('watches the tab as well as the viewport', () => {
    expect(code(HOOK)).toContain('IntersectionObserver');
    expect(code(HOOK)).toContain("'visibilitychange'");
    expect(code(HOOK)).toContain('document.hidden');
  });

  // Leaving the Garden must not strand a paused sprite: the element can be reused elsewhere.
  it('disconnects and clears its inline styles on cleanup', () => {
    expect(code(HOOK)).toContain('observer.disconnect()');
    expect(code(HOOK)).toContain("removeEventListener('visibilitychange'");
    expect(code(HOOK)).toMatch(/animationPlayState = ''/);
  });

  /*
   * Starting running would have every sprite animating for the frame or two before the
   * observer's first callback — the exact cost this exists to avoid, at the moment the page
   * can least afford it. The observer reports every target on its first run, so nothing
   * visible stays frozen.
   */
  it('starts paused and lets the observer switch on what is in view', () => {
    expect(code(HOOK)).toMatch(/animationPlayState = 'paused';\s*\n\s*observer\.observe/);
  });

  it('starts sprites slightly before they reach the fold', () => {
    expect(Number.parseInt(SPRITE_ROOT_MARGIN, 10)).toBeGreaterThan(0);
  });

  /*
   * The stylesheet owns reduced motion with `animation: none !important`, which an inline
   * play-state cannot override. The query is read here only to skip writes that would have no
   * effect — an optimisation, not a second guard.
   */
  it('defers reduced motion to the stylesheet', () => {
    const CSS = readFileSync('src/app/globals.css', 'utf8');
    const reduced = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/\.plant-sprite\s*\{[^}]*animation:\s*none\s*!important/);
    /*
     * Reading the query to skip work is fine; branching BEHAVIOUR on it is not. The precise
     * property is that the check bails out entirely — it never selects between two play
     * states, so it cannot become a second, divergent definition of "reduced motion".
     * (An earlier version of this assertion measured how close `matchMedia` sat to
     * `animationPlayState` in the file, which is proximity rather than meaning.)
     */
    expect(code(HOOK)).toMatch(/matchMedia[^\n]*\)[^\n]*\)\s*return;/);
    expect(code(HOOK).match(/matchMedia/g) ?? []).toHaveLength(1);
  });
});

describe('the garden uses it', () => {
  it('observes the bed and re-observes when a plant grows', () => {
    expect(GARDEN).toContain('usePauseOffscreenSprites');
    expect(code(GARDEN)).toMatch(/usePauseOffscreenSprites\(bed, stageSignature\)/);
    expect(code(GARDEN)).toMatch(/<ul ref=\{bed\}/);
  });

  // Scoped to the bed so a sprite elsewhere on the page is not paused by the Garden's rules.
  it('scopes the observer to the bed rather than the document', () => {
    expect(code(HOOK)).toContain('root.querySelectorAll');
    expect(code(HOOK)).not.toContain('document.querySelectorAll');
  });
});
