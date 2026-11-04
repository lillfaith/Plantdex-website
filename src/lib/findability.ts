import { getPrintedCard } from './deck';
import { habitatOf } from './habitat';
import type { RegionalSpecies } from './quest-board';
import { RARITIES, type Rarity } from './types';

/**
 * How hard a plant is to find AROUND HERE — a gameplay tier, assigned by rule.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS NOT `Herb.rarity`, AND IT NEVER OVERWRITES IT.
 *
 * `Herb.rarity` is the Encounter Rate PRINTED ON THE CARD. It is in buyers' hands and in
 * the artwork; nothing in software may change it, and this module does not. What it adds is
 * a REGIONAL tier used to decide which part of a quest board a plant belongs in — a plant
 * can be a genuinely uncommon card nationally and the commonest thing on a Georgia verge.
 *
 * The card keeps printing what it prints. This is never displayed as a second rarity,
 * because two different rarities on one plant is a UI that contradicts a physical object.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT IS ASSIGNED FROM, AND WHAT IT IS DELIBERATELY NOT.
 *
 * NOT from GBIF counts. An observation count measures recording effort — where people with
 * phones go — and reading it as abundance would make every roadside weed near Atlanta
 * "Common" and every plant in a quiet county "Rare". Passion Flower has 2,117 Georgia
 * observations and is a printed Epic; neither number is a difficulty.
 *
 * NOT from conservation status. IUCN and state rankings are about extinction risk. A
 * globally secure plant can be locally unfindable, and a listed one must never become a
 * collectible target because the game called it a prize.
 *
 * FROM three things a player actually experiences:
 *   1. the card's own printed Encounter Rate — already a designer's gameplay judgement,
 *      and the right baseline;
 *   2. whether the plant is reliably recorded here at all;
 *   3. how specific its habitat is — a wayside plant is met by accident, a wetland plant
 *      is met by going to a wetland.
 */

/** The four tiers, shared with the printed cards so the vocabulary stays one vocabulary. */
export const FINDABILITY_TIERS = RARITIES;
export type Findability = Rarity;

/**
 * How much reaching the habitat asks of a player.
 *
 * `wayside` and `garden` are passed on an ordinary walk; `meadow` needs somewhere open;
 * `woodland` needs a walk into trees; `wetland` needs a specific place and a reason to go.
 * This is about ACCESS, not about ecology — the five classes come from `habitat.ts`, which
 * defines them as "where to look" rather than ecologically, for the same reason.
 */
const HABITAT_EFFORT: Record<string, number> = {
  wayside: -1, garden: -1, meadow: 0, woodland: 0, wetland: 1,
};

const ORDER: readonly Rarity[] = RARITIES;

function shift(tier: Rarity, steps: number): Rarity {
  const index = ORDER.indexOf(tier);
  const moved = Math.min(ORDER.length - 1, Math.max(0, index + steps));
  return ORDER[moved]!;
}

/**
 * THE RULE, STATED ONCE.
 *
 * Start from the printed Encounter Rate, then move AT MOST ONE STEP for regional reality:
 *
 *   +1 rarer    the species is only `likely` here — recorded, but not reliably met
 *   +1 rarer    its habitat is a destination rather than a route (wetland)
 *   -1 commoner its habitat is passed on an ordinary walk (wayside, garden) AND it is
 *               confirmed here
 *
 * The adjustments are summed and then CLAMPED TO ONE STEP in either direction. A rule that
 * could move a printed Epic to Common would be a rule that contradicts the card, and the
 * card is the thing somebody is holding.
 */
export function findabilityIn(
  herbId: string,
  regional: Pick<RegionalSpecies, 'occurrence'> | undefined,
): Findability | null {
  const card = getPrintedCard(herbId);
  if (!card || !regional) return null;
  if (regional.occurrence !== 'confirmed' && regional.occurrence !== 'likely') return null;

  const primary = habitatOf(herbId)?.primary;
  // An unclassified habitat asks for no adjustment rather than a guessed one.
  const effort = primary ? (HABITAT_EFFORT[primary] ?? 0) : 0;

  let steps = 0;
  if (regional.occurrence === 'likely') steps += 1;
  if (effort > 0) steps += 1;
  if (effort < 0 && regional.occurrence === 'confirmed') steps -= 1;

  return shift(card.rarity, Math.max(-1, Math.min(1, steps)));
}

/**
 * Which board tier a plant belongs in.
 *
 * The starter tier is for plants somebody meets without trying; the stretch tier is for the
 * ones worth going out for. Derived from findability so the two cannot disagree.
 */
export function boardTierFor(findability: Findability): 'starter' | 'main' | 'stretch' {
  if (findability === 'Common') return 'starter';
  if (findability === 'Rare' || findability === 'Epic') return 'stretch';
  return 'main';
}
