'use client';

import { useEffect, type RefObject } from 'react';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ONLY THE SPRITES SOMEBODY CAN SEE SHOULD BE MOVING.
 *
 * The Garden animates every discovered plant, which is the point of the page and also, at a
 * full collection, forty-five sheets stepping through frames at once. Most of them are below
 * the fold, and a sprite stepping through a 3,680px background nobody is looking at costs the
 * same as one in view.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * `animation-play-state` IS THE WHOLE MECHANISM, AND IT IS WHY THIS NEEDS NO TIMER, NO STATE
 * AND NO RE-RENDER.
 *
 * Pausing a CSS animation FREEZES ITS POSITION rather than resetting it, so a sprite
 * scrolled out of view and back resumes mid-gesture instead of snapping to frame 0 and
 * starting again. That is the "without restarting" requirement satisfied by the primitive
 * itself, not by bookkeeping — there is no elapsed time to store and nothing to recompute.
 *
 * It also means this hook does NOT re-render anything. The observer writes one inline style
 * on one element; React is not involved after mount, so a page of forty-five creatures costs
 * zero renders per frame rather than one per tile. Setting React state here would be the
 * obvious implementation and would make the page slower than it was before the optimisation.
 *
 * AND IT REUSES THE EXISTING ANIMATION. `plant-sprite-play` / `plant-sprite-play-fit` and
 * their `steps()` classes are untouched; this only decides when they run. A second animation
 * system for the Garden would be free to drift from the one the card page uses.
 * ───────────────────────────────────────────────────────────────────────────────
 *
 * NO EXTRA ASSET IS FETCHED. The sheet is a background image on an element that already
 * exists; pausing does not unload it and resuming does not re-request it. Swapping offscreen
 * tiles to the single-frame `still` would save decoded memory and is deliberately NOT done
 * here: it would restart the gesture on every scroll, which is the one thing this is
 * specified not to do.
 *
 * REDUCED MOTION IS NOT HANDLED HERE, AND MUST NOT BE. The stylesheet already stops
 * `.plant-sprite` and `.plant-sprite-fit` with `animation: none !important`, which an inline
 * play-state cannot and should not override. The query is read below only to skip work that
 * would have no effect — an optimisation, never the guard. One rule, in one place.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** Every element carrying the sprite animation. Both walks share this class. */
export const SPRITE_SELECTOR = '.plant-sprite';

/**
 * Should this sprite be running?
 *
 * Two independent reasons to stop, and both have to be false to play: the tile is off screen,
 * or the browser tab is in the background. Kept pure so the truth table is a test rather than
 * something to reproduce by scrolling.
 */
export function spritePlayState(onscreen: boolean, documentVisible: boolean): 'running' | 'paused' {
  return onscreen && documentVisible ? 'running' : 'paused';
}

/**
 * How far outside the viewport a sprite starts moving.
 *
 * A tile that begins animating only as its top edge crosses the fold is visibly still for the
 * first instant somebody sees it. A margin starts it just before it arrives, which costs a
 * row or so of extra work and removes the hitch.
 */
export const SPRITE_ROOT_MARGIN = '96px';

/**
 * Pause every sprite inside `container` that nobody is looking at.
 *
 * `key` re-runs the effect when the set of tiles changes — the Garden passes its stage
 * signature, so a plant that grows is re-observed rather than left behind with a stale
 * inline style. Without it the observer would watch elements React has already replaced.
 */
export function usePauseOffscreenSprites(
  container: RefObject<HTMLElement | null>,
  key: string,
): void {
  useEffect(() => {
    const root = container.current;
    if (!root) return;

    // Server render and very old browsers: leave every sprite running, which is exactly the
    // behaviour before this hook existed. An optimisation that breaks without it would be a
    // dependency rather than an optimisation.
    if (typeof IntersectionObserver === 'undefined') return;

    // Not the reduced-motion GUARD — the stylesheet owns that. Skipping here only avoids
    // writing inline styles that `animation: none !important` would ignore anyway.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const sprites = Array.from(root.querySelectorAll<HTMLElement>(SPRITE_SELECTOR));
    if (sprites.length === 0) return;

    const onscreen = new Set<HTMLElement>();
    const apply = (sprite: HTMLElement) => {
      sprite.style.animationPlayState = spritePlayState(onscreen.has(sprite), !document.hidden);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const sprite = entry.target as HTMLElement;
          if (entry.isIntersecting) onscreen.add(sprite);
          else onscreen.delete(sprite);
          apply(sprite);
        }
      },
      { rootMargin: SPRITE_ROOT_MARGIN },
    );

    /*
     * Start paused, then let the observer switch on whatever is actually in view — it
     * delivers an entry for every target on its first run, so nothing visible stays frozen.
     * Starting the other way round would have all forty-five animating for the frame or two
     * before that callback, which is the exact cost this hook exists to avoid and the moment
     * the page can least afford it.
     */
    for (const sprite of sprites) {
      sprite.style.animationPlayState = 'paused';
      observer.observe(sprite);
    }

    // The browser tab going to the background stops everything; coming back restores each
    // sprite to whatever the observer last said about it, rather than starting them all.
    const onVisibilityChange = () => {
      for (const sprite of sprites) apply(sprite);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // Leaving the Garden must not leave a paused sprite behind: the same element can be
      // reused by another route, and an inline style outlives the observer that set it.
      for (const sprite of sprites) sprite.style.animationPlayState = '';
    };
  }, [container, key]);
}
