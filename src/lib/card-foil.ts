import type { Rarity } from "./types";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOLOGRAPHIC FOIL — the geometry and the tier table, with no DOM in sight.
 *
 * A premium collectible card catches the light as you move it. This module decides HOW
 * MUCH light each tier catches and WHERE the highlight sits for a given pointer position;
 * `CardFoil.tsx` does nothing but paint what these functions return.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * COMMON HAS NO FOIL, FOR THE REASON COMMON HAS NO AURA.
 *
 * `rarity-aura.ts` already settled this argument once and the note there is worth not
 * re-learning: every tier used to glow, so the grid was a field of lit rectangles and
 * rarity read as "some are slightly brighter". Common is 21 of the 45 cards — it is the
 * baseline the other tiers are measured against, and a baseline that shimmers is not a
 * baseline.
 *
 * So `CARD_FOIL.Common` is `null`, and that is the whole reason the other three are
 * legible as special. A card with no tier mounts no foil layer at all, which is also the
 * performance story below.
 *
 * THIS IS NOT A SECOND RARITY SYSTEM. Every value here is keyed off the `rarity` already
 * printed on the card in `herbs.json` — the same field the aura and the badge read. No
 * card gains a property, nothing random is rolled, and no "cosmetic tier" exists parallel
 * to the botanical one. The brief that asked for foil asked for six invented tiers
 * (Legendary, Mythic); the deck prints four, so four is what this has.
 * ───────────────────────────────────────────────────────────────────────────────
 *
 * LEGIBILITY IS THE CEILING ON EVERY NUMBER IN THIS FILE. The art under the foil is a
 * photographic card front carrying a common name, a binomial and stat pips, and the whole
 * point of the card is reading it. Alphas are therefore in single digits to low teens, and
 * `soft-light` was chosen over `screen` for the broad layer precisely because it lifts
 * luminance without washing mid-tones toward white. A foil that costs a player the ability
 * to read the species name has traded the product's purpose for a sparkle.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface FoilTier {
  /**
   * Peak alpha of the broad reflection that follows the pointer, as a `color-mix`
   * percentage. This is the layer that reads as "the card is catching the light".
   */
  readonly glare: number;
  /**
   * Peak alpha of the narrow diagonal band that sweeps across as the pointer moves
   * sideways — the hard-edged streak a real foil card shows. `0` means one layer only.
   */
  readonly band: number;
  /**
   * Which deck token tints the foil. `gold` is deliberately reserved for the top tier:
   * gold is the frame colour on EVERY card (`--color-gold-frame`), so spending it on the
   * foil of a common card would put the deck's accent everywhere and distinguish nothing.
   */
  readonly tint: "violet" | "gold";
}

/**
 * Rising, and rising on two axes rather than one.
 *
 * Uncommon gets a single soft reflection. Rare adds the band, which is the step that reads
 * as "this is a foil card" rather than "this card is slightly shiny". Epic keeps the band
 * and takes the gold.
 *
 * Measured against the aura's own ladder so the two reinforce rather than compete: a Rare
 * card has two aura layers and two foil layers, an Uncommon one of each.
 */
export const CARD_FOIL: Readonly<Record<Rarity, FoilTier | null>> = {
  Common: null,
  Uncommon: { glare: 9, band: 0, tint: "violet" },
  Rare: { glare: 12, band: 7, tint: "violet" },
  Epic: { glare: 15, band: 9, tint: "gold" },
};

/** Whether this tier paints anything at all. The guard every call site mounts behind. */
export function hasFoil(rarity: Rarity): boolean {
  return CARD_FOIL[rarity] !== null;
}

/** Normalised light position: `0..1` across and down the card. */
export interface FoilPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * THE RESTING LIGHT IS DEAD CENTRE, AND IT IS A REAL STATE RATHER THAN AN ABSENCE.
 *
 * A card nobody is touching still has to decide where its highlight sits, because the foil
 * fades out over 400ms and has to fade out from SOMEWHERE. Resetting to the centre means a
 * card released at its left edge settles symmetrically instead of fading with a highlight
 * stuck in the corner, which reads as a stain rather than a reflection.
 */
export const FOIL_REST: FoilPoint = { x: 0.5, y: 0.5 };

/** The box a pointer position is measured against — the fields of a `DOMRect` we use. */
export interface FoilRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Where the light should sit for a pointer at `(clientX, clientY)` over `rect`.
 *
 * CLAMPED, AND THAT IS NOT BELT-AND-BRACES. A `pointermove` can legitimately arrive with
 * coordinates outside the element: the pointer is captured during a drag, and on touch the
 * reported point drifts past the edge before `pointercancel` lands. Unclamped, the gradient
 * centre walks off the card and the reflection inverts — a dark smear travelling the wrong
 * way, which is both ugly and the kind of bug that only ever reproduces on a phone.
 *
 * A ZERO-SIZED RECT RESOLVES TO THE CENTRE rather than dividing by zero. That is a real
 * measurement: `getBoundingClientRect()` returns all zeros for an element that is
 * `display: none` or not yet laid out, and a `NaN` written into a CSS custom property makes
 * the whole declaration invalid, so the foil silently stops painting with nothing in the
 * console to say why.
 */
export function foilPoint(
  clientX: number,
  clientY: number,
  rect: FoilRect,
): FoilPoint {
  if (rect.width <= 0 || rect.height <= 0) return FOIL_REST;
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  };
}

/**
 * The band's travel, as a percentage along the card's diagonal.
 *
 * It sweeps FURTHER than the pointer does — `-20%` to `120%` — because a band that stops
 * exactly at the edges is a band that is always on screen, and the thing that makes a foil
 * streak convincing is that it arrives and leaves. Derived from `x` alone: a real foil
 * streak is a fixed diagonal in the card's own surface and moves with the horizontal tilt,
 * so coupling it to `y` as well would make it wander like a spotlight.
 */
export function bandOffset(point: FoilPoint): number {
  return -20 + point.x * 140;
}
