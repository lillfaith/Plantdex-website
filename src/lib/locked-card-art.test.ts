import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * POKING A FACE-DOWN CARD.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A silhouette in the Herbdex grid plays its gesture once when pressed, and stops. The
 * feature is three lines of state; everything these tests guard is a way it could quietly
 * stop being those three lines and start being a second animation system, a spoiler, or a
 * hole in the discovery loop.
 *
 * THE FIRST ATTEMPT PUT THIS IN THE GRID AND THAT WAS THE WRONG PLACE. An undiscovered
 * tile is a <Link> to its locked card page, and that page is where `DiscoverPanel` renders
 * "Log a Discovery" — so the tile is the route into recording a find. Anything that made
 * the tile a control took that route away, or split it into two regions that behave
 * differently. The gesture belongs where a player has already arrived and asked the
 * question: the locked card page, where the card is not a link to anywhere.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

const CARD = strip(readFileSync('src/components/herbdex/HerbCard.tsx', 'utf8'));
const ART = strip(readFileSync('src/components/herbdex/LockedCardArt.tsx', 'utf8'));
const LOCKED = strip(readFileSync('src/components/herbdex/LockedHerb.tsx', 'utf8'));
const LOCKED_FIELD = strip(readFileSync('src/components/herbdex/LockedFieldCard.tsx', 'utf8'));
const MYSTERY = strip(readFileSync('src/components/herbdex/MysteryCard.tsx', 'utf8'));
const SPRITE = strip(readFileSync('src/components/PlantSprite.tsx', 'utf8'));
const CSS = readFileSync('src/app/globals.css', 'utf8');

describe('the one-shot reuses the idle rather than copying it', () => {
  it('is the same keyframes and the same steps() class, with the count set to one', () => {
    /*
     * `plant-sprite-once` declares NOTHING but the iteration count. The moment it grows an
     * `animation-name` of its own it has become a second walk through the sheet, free to
     * drift from the one every other surface plays.
     */
    const rule = CSS.match(/\.plant-sprite-once \{([^}]*)\}/);
    expect(rule, '.plant-sprite-once is gone').not.toBeNull();
    expect(rule![1]).toMatch(/animation-iteration-count:\s*1/);
    expect(rule![1], 'the one-shot grew its own keyframes').not.toMatch(/animation-name/);
    expect(rule![1], 'the one-shot grew its own duration').not.toMatch(/animation-duration/);
  });

  it('ends on the resting frame, which is what forbids a fill mode', () => {
    /*
     * `steps()` shows frames 0..n-1 and the keyframes overshoot so each step lands square.
     * With no fill mode the element reverts to its base background-position the instant the
     * animation ends — frame 0, which `build_sprites.py` authors as a complete resting
     * pose. `forwards` would strand it mid-gesture: a witch hazel frozen in recoil.
     */
    const rule = CSS.match(/\.plant-sprite-once \{([^}]*)\}/)![1];
    expect(rule, 'a fill mode would leave the sprite on the last frame').not.toMatch(
      /animation-fill-mode|forwards|both/,
    );
  });

  it('holds frame 0 when told both to freeze and to play once', () => {
    // Two contradictory orders; holding is the safer one to obey.
    expect(SPRITE).toMatch(/frozen \? ' plant-sprite-frozen' : once \? ' plant-sprite-once' : ''/);
  });
});

describe('a press cannot stack, reveal, or cost anything', () => {
  it('refuses a second pass while one is running', () => {
    /*
     * The guard is the state that also drives the class, so "already playing" and "class
     * already applied" cannot disagree. Nothing here restarts an animation mid-flight.
     */
    expect(ART).toMatch(/if \(playing\) return;/);
    expect(ART).toMatch(/setPlaying\(true\)/);
  });

  it('clears only on the animation ending, plus a ceiling that cannot strand it', () => {
    expect(MYSTERY).toContain('onAnimationEnd={playOnce ? onPlayEnd : undefined}');
    expect(ART).toMatch(/onPlayEnd=\{stop\}/);
    // A dropped animationend must not leave the card unable to play again.
    expect(ART).toMatch(/setTimeout\(\(\) => setPlaying\(false\), \d+\)/);
  });

  it('writes nothing: no discovery, no XP, no mastery, no unlock', () => {
    /*
     * Stated as an absence rather than trusted to review. The press handler is pure UI
     * state, and this card component has never been a writer — if it acquires one of these
     * the feature has stopped being a toy and started being a shortcut into the collection.
     */
    for (const forbidden of ['discover(', 'useHerbdex', 'recordUnlocks', 'applyDiscovery']) {
      expect(ART, `the locked card art now calls ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('shades the sprite element itself, so no frame of a pass can show colour', () => {
    /*
     * THE REASON THIS IS SAFE IS STRUCTURAL, NOT A RULE SOMEBODY HAS TO REMEMBER. The
     * filter sits on the sprite element, so it flattens whatever frame is showing. Moved to
     * a wrapper or a pseudo-element it would still LOOK right at rest and could be composed
     * away mid-animation.
     */
    expect(MYSTERY).toMatch(/className="plant-silhouette"/);
    expect(CSS).toMatch(/\.plant-silhouette \{[^}]*filter:/);
  });
});

describe('the grid tile is left alone, and stays the route into discovery', () => {
  it('has no control of its own — the whole tile is still just a link', () => {
    /*
     * THE REGRESSION THIS EXISTS TO PREVENT, because it is one somebody would re-introduce
     * in good faith. Making the tile play its sprite means either swallowing the press that
     * opens the card — and with it the only route from the grid to "Log a Discovery" — or
     * carving one tile into two regions that do different things on a tap.
     */
    expect(CARD, 'the grid tile grew its own press target again').not.toContain('<button');
    expect(CARD, 'the grid tile is animating a sprite').not.toContain('playOnce');
    expect(CARD, 'the grid tile is holding animation state').not.toContain('useState');
  });

  it('still draws its silhouette at rest', () => {
    expect(CARD).toContain('<MysteryCard herb={herb} />');
  });
});

describe('the locked card page is where the silhouette performs', () => {
  it('is reached by both locked states, from one component rather than two copies', () => {
    // A printed card not yet found, and a Field Card below its threshold. Same wrapper, same
    // behaviour; two copies of this state would be two places for it to drift.
    expect(LOCKED).toContain('<LockedCardArt herb={herb} />');
    expect(LOCKED_FIELD).toContain('<LockedCardArt herb={herb} />');
  });

  it('plays on arrival, once, with no dependency that could restart it', () => {
    /*
     * `play` changes identity with `playing`, so listing it as a dependency would fire the
     * effect again the moment the first pass ended — a loop assembled out of one-shots,
     * which is the exact thing the iteration count is there to prevent.
     */
    expect(ART).toMatch(/useEffect\(\(\) => \{\s*const frame = requestAnimationFrame\(play\);/);
    expect(ART).toMatch(/\}, \[\]\);/);
    // And it is cancelled on unmount, so a page left before the frame runs starts nothing.
    expect(ART).toMatch(/cancelAnimationFrame\(frame\)/);
  });

  it('makes the whole card the control, because here it is not a link', () => {
    expect(ART).toMatch(/<button\s/);
    expect(ART).toContain('type="button"');
    expect(ART).toContain('aria-label=');
    expect(ART, 'a control a keyboard can reach and not see').toMatch(/focus-visible:outline/);
  });

  it('draws a plain frame where there is no sheet to play', () => {
    // MysteryCard shows a keyhole for a card with no sprite, and a button over a keyhole is
    // a control that lies about having something to do.
    expect(ART).toMatch(/if \(!hasSprite\(herb\.id\)\) \{/);
  });

  it('writes nothing: no discovery, no XP, no mastery, no unlock', () => {
    for (const forbidden of ['discover(', 'useHerbdex', 'recordUnlocks', 'applyDiscovery', 'track(']) {
      expect(ART, `the locked card art now calls ${forbidden}`).not.toContain(forbidden);
    }
  });
});

describe('reduced motion is refused in JS, not collapsed in CSS', () => {
  it('never sets the class, because the collapsed animation would fire no end event', () => {
    /*
     * THE HALF THAT IS EASY TO GET WRONG. The global rule pins `.plant-sprite` to
     * `animation: none`, so applying the class under reduced motion would paint nothing AND
     * emit no `animationend` — leaving the flag stuck true and the control dead for the rest
     * of the session. Read at press time, the same way the discovery celebration reads it.
     */
    expect(ART).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    const check = ART.indexOf('prefers-reduced-motion');
    const set = ART.indexOf('setPlaying(true)');
    expect(check, 'the reduced-motion check runs after the flag is set').toBeLessThan(set);
  });

  it('still pins the sprite in the stylesheet, so both halves hold', () => {
    const block = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/\.plant-sprite \{[^}]*animation: none !important/);
  });
});
