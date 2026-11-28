/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ONLY THE SPRITES SOMEBODY CAN SEE SHOULD BE MOVING.
 *
 * Every `PlantSprite` registers here (see its `ref`), so the pausing is no longer a Garden-only
 * rule: Home, Profile, the species hero and the showcase get it too. The Garden animates every
 * discovered plant, which is the point of the page and also, at a full collection,
 * forty-five sheets stepping through frames at once. Most of them are below
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

/** Set on <html> while the page is in the background; one CSS rule pauses every sprite under it. */
export const PAGE_HIDDEN_ATTRIBUTE = 'data-page-hidden';

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

/*
 * ONE observer and ONE set of listeners for the whole page, created on the first sprite and
 * shared by every later one. A page of forty-five creatures costs one IntersectionObserver,
 * not forty-five, and the hidden-tab rule is a single attribute rather than a loop over
 * sprites. Module state, not React state: nothing here ever causes a render.
 */
let observer: IntersectionObserver | null = null;
let hiddenWatcherInstalled = false;

function syncHiddenAttribute(): void {
  document.documentElement.toggleAttribute(PAGE_HIDDEN_ATTRIBUTE, document.visibilityState === 'hidden');
}

/**
 * The tab going to the background pauses every sprite through `html[data-page-hidden]` (see
 * globals.css). Pausing freezes position, so coming back continues mid-gesture. `pagehide` /
 * `pageshow` cover Safari's back-forward cache, which does not always fire `visibilitychange`.
 */
function ensureHiddenWatcher(): void {
  if (hiddenWatcherInstalled) return;
  hiddenWatcherInstalled = true;
  syncHiddenAttribute();
  document.addEventListener('visibilitychange', syncHiddenAttribute);
  window.addEventListener('pagehide', () => document.documentElement.setAttribute(PAGE_HIDDEN_ATTRIBUTE, ''));
  window.addEventListener('pageshow', syncHiddenAttribute);
}

function sharedObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        (entry.target as HTMLElement).style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
      }
    },
    { rootMargin: SPRITE_ROOT_MARGIN },
  );
  return observer;
}

/**
 * A ref callback for an ANIMATING sprite. `PlantSprite` passes it as `ref` unless `frozen`, so a
 * frozen sprite is never observed. React 19 runs the returned function when the element goes
 * away, which is what keeps the observer from holding detached nodes.
 *
 * Starts paused and lets the observer switch on whatever is in view; it reports every target
 * on its first run, so nothing visible stays frozen, and nothing offscreen ever runs.
 */
export function observeSprite(sprite: HTMLElement | null): (() => void) | void {
  if (!sprite) return;

  // Server render and very old browsers: leave every sprite running, which is exactly the
  // behaviour before this existed. An optimisation that breaks without it would be a dependency.
  if (typeof IntersectionObserver === 'undefined') return;

  // Not the reduced-motion GUARD — the stylesheet owns that. Skipping here only avoids
  // writing inline styles that `animation: none !important` would ignore anyway.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  ensureHiddenWatcher();
  const watcher = sharedObserver();
  sprite.style.animationPlayState = 'paused';
  watcher.observe(sprite);

  return () => {
    watcher.unobserve(sprite);
    // An inline style outlives the observer that set it, and the element may be reused.
    sprite.style.animationPlayState = '';
  };
}
