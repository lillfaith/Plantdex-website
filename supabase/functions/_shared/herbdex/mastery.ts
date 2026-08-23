import type { HerbdexState } from './types.ts';
import { getHerb } from './deck.ts';

/**
 * THE THREE-STAGE CARD MASTERY MODEL.
 *
 * A card is not a binary "have it / don't have it". It moves through three stages, each
 * earned by a different kind of real activity:
 *
 *   1. DISCOVERED — the player found the plant in the real world and logged it.
 *   2. LEARNED    — the player passed the card's knowledge check, which is generated
 *                   entirely from what is printed on that card.
 *   3. MASTERED   — the player learned the card AND went back out and found the plant
 *                   again, logging a repeat sighting.
 *
 * Two deliberate properties:
 *
 * • Stage 1 is never gated behind the others. AGENTS.md is explicit that finding a plant
 *   must unlock its digital card immediately — mastery is what comes *after* the reward,
 *   never a hurdle in front of it.
 *
 * • Mastery is *recorded*, not recomputed on the fly. It depends on sightings, which live
 *   in a separate store that the player can delete from; deleting last summer's sighting
 *   must not take a card's mastery away. Once the predicate has ever held, the timestamp
 *   stands. Discovery and learning behave the same way, so no stage can ever regress.
 */

export const MASTERY_STAGES = ['discovered', 'learned', 'mastered'] as const;
export type MasteryStage = (typeof MASTERY_STAGES)[number];

export const MASTERY_STAGE_LABEL: Record<MasteryStage, string> = {
  discovered: 'Discovered',
  learned: 'Learned',
  mastered: 'Mastered',
};

/** One-line description of what each stage means, shown on the card page. */
export const MASTERY_STAGE_BLURB: Record<MasteryStage, string> = {
  discovered: 'You found this plant outdoors.',
  learned: 'You know what its card says.',
  mastered: 'You found it again after learning it.',
};

/**
 * Repeat sightings required, after learning the card, before it is mastered.
 *
 * A single return visit. The point is to send the player back outside once more, not to
 * make mastery a grind — AGENTS.md forbids busywork that rewards repetition for its own
 * sake, and a high number here would be exactly that.
 */
export const SIGHTINGS_FOR_MASTERY = 1;

/** How far through the three stages a card is, 0-3. Undiscovered is 0. */
export function stageIndex(stage: MasteryStage | null): number {
  return stage === null ? 0 : MASTERY_STAGES.indexOf(stage) + 1;
}

/**
 * The stage a card currently sits at, or null if it has not been discovered.
 *
 * Reads only recorded timestamps, so it is stable: it does not depend on sightings and
 * cannot change because the player tidied up their journal.
 */
export function stageFor(state: HerbdexState, herbId: string): MasteryStage | null {
  if (state.mastered[herbId]) return 'mastered';
  if (state.learned[herbId]) return 'learned';
  if (state.discoveries[herbId]) return 'discovered';
  return null;
}

/**
 * Whether a card qualifies for mastery right now.
 *
 * Pure and re-evaluable from scratch — the same property that makes achievement unlocks
 * self-healing. Unknown herb ids never qualify, so a tampered id cannot mint a stage.
 */
export function qualifiesForMastery(
  state: HerbdexState,
  herbId: string,
  sightings: number,
): boolean {
  if (!getHerb(herbId)) return false;
  if (!state.discoveries[herbId]) return false;
  if (!state.learned[herbId]) return false;
  return sightings >= SIGHTINGS_FOR_MASTERY;
}

/** What the player does next to advance this card, or null once mastered. */
export function nextStepFor(stage: MasteryStage | null): string | null {
  switch (stage) {
    case null:
      return 'Find this plant outdoors to add it to your Herbdex.';
    case 'discovered':
      return 'Read the card, then pass its knowledge check to learn it.';
    case 'learned':
      return 'Find this plant again and log the sighting to master the card.';
    case 'mastered':
      return null;
  }
}

export interface MasteryTotals {
  discovered: number;
  learned: number;
  mastered: number;
}

/** Deck-wide counts. Ids that are not in the deck are not counted. */
export function masteryTotals(state: HerbdexState): MasteryTotals {
  const count = (record: Record<string, string>): number =>
    Object.keys(record).filter((id) => getHerb(id)).length;

  return {
    discovered: count(state.discoveries),
    learned: count(state.learned),
    mastered: count(state.mastered),
  };
}
