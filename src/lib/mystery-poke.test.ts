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
 * THE ONE THAT WOULD HURT MOST IS NAVIGATION. An undiscovered tile is a <Link> to its
 * locked card page, and that page is where `DiscoverPanel` renders "Log a Discovery" — so
 * the grid tile is the route into recording a find. A press target that swallowed the
 * whole tile would take that route away without failing anything.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

const CARD = strip(readFileSync('src/components/herbdex/HerbCard.tsx', 'utf8'));
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
    expect(CARD).toMatch(/if \(playing\) return;/);
    expect(CARD).toMatch(/setPlaying\(true\)/);
  });

  it('clears only on the animation ending, plus a ceiling that cannot strand it', () => {
    expect(MYSTERY).toContain('onAnimationEnd={playOnce ? onPlayEnd : undefined}');
    expect(CARD).toMatch(/onPlayEnd=\{stopSprite\}/);
    // A dropped animationend must not leave the control dead for the session.
    expect(CARD).toMatch(/setTimeout\(\(\) => setPlaying\(false\), \d+\)/);
  });

  it('writes nothing: no discovery, no XP, no mastery, no unlock', () => {
    /*
     * Stated as an absence rather than trusted to review. The press handler is pure UI
     * state, and this card component has never been a writer — if it acquires one of these
     * the feature has stopped being a toy and started being a shortcut into the collection.
     */
    for (const forbidden of ['discover(', 'useHerbdex', 'recordUnlocks', 'applyDiscovery', 'track(']) {
      expect(CARD, `the grid tile now calls ${forbidden}`).not.toContain(forbidden);
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

describe('the press target does not eat the route into discovery', () => {
  it('keeps the control OUTSIDE the link, which is also the only valid HTML', () => {
    /*
     * Interactive content inside an <a> is invalid and browsers disagree about which of the
     * two owns a press. Asserted positionally: the button must appear after the link closes.
     */
    const linkClose = CARD.lastIndexOf('</Link>');
    const button = CARD.indexOf('aria-label="Animate mystery plant"');
    expect(button, 'the poke button is gone').toBeGreaterThan(-1);
    expect(button, 'the poke button is nested inside the card link').toBeGreaterThan(linkClose);
  });

  it('covers the sprite only, never the whole tile', () => {
    // Inset on all four sides: a target at `inset-0` would swallow the tile's own link.
    const target = CARD.match(/className="pointer-events-auto absolute ([^"]*)"/);
    expect(target, 'the poke target lost its bounds').not.toBeNull();
    expect(target![1]).toMatch(/inset-x-\[\d+%\]/);
    expect(target![1]).toMatch(/top-\[\d+%\]/);
    expect(target![1]).toMatch(/bottom-\[\d+%\]/);
    expect(target![1], 'the target covers the entire card').not.toMatch(/inset-0/);
  });

  it('renders only on a face-down card that actually has a sheet', () => {
    // A discovered card keeps its old behaviour exactly; a card with no sprite shows the
    // keyhole, and a press on nothing is a control that lies about being one.
    expect(CARD).toMatch(/const pokeable = !showFace && hasSprite\(herb\.id\)/);
    expect(CARD).toMatch(/\{pokeable && \(/);
  });

  it('is a real control with a label and a visible focus ring', () => {
    expect(CARD).toMatch(/<button\s/);
    expect(CARD).toContain('type="button"');
    expect(CARD).toContain('aria-label="Animate mystery plant"');
    expect(CARD, 'a control a keyboard can reach and not see').toMatch(/focus-visible:outline/);
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
    expect(CARD).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    const check = CARD.indexOf('prefers-reduced-motion');
    const set = CARD.indexOf('setPlaying(true)');
    expect(check, 'the reduced-motion check runs after the flag is set').toBeLessThan(set);
  });

  it('still pins the sprite in the stylesheet, so both halves hold', () => {
    const block = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/\.plant-sprite \{[^}]*animation: none !important/);
  });
});
