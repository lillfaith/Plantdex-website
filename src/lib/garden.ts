import type { HerbdexState } from './types';
import { stageFor, type MasteryStage } from './mastery';

/**
 * My Garden growth stages.
 *
 * The garden is a *visualisation of card mastery*, not a second progression system. Each
 * plant's growth stage is exactly its card's mastery stage — so the garden can never drift
 * out of sync with the Herbdex, and there is no separate ladder to grind:
 *
 *   discovered → sprout      (you found it)
 *   learned    → growing     (you know its card)
 *   mastered   → flowering   (you found it again after learning it)
 *
 * Nothing here reads a clock. A plant cannot grow while the app is closed, there is nothing
 * to farm by idling, and no timer to wait out. Growth follows what the player actually did.
 *
 * THAT IS A PLANTDEX PRODUCT DECISION, NOT AN AGENTS.md REQUIREMENT. This comment used to
 * say "AGENTS.md rules out watering meters, energy systems and artificial waiting", and it
 * does not: the spec contains the word "garden" zero times, and "watering", "idle" and
 * "energy system" zero times each. The only nearby thing it really says is "no misleading
 * countdown timers", which sits under CUSTOMER TRUST and is about the storefront.
 *
 * The rule is kept, deliberately and on its own merits — a plant that grows while you are
 * asleep is measuring your patience rather than your walking, and this is a field guide. But
 * it is OURS, so it is ours to revisit, and dressing a preference up as an inherited
 * prohibition is how a design decision stops being re-examined. The structural guarantee is
 * the same either way: no time input at all, so there is nothing to wait out.
 */

export const GROWTH_STAGES = ['sprout', 'growing', 'flowering'] as const;
export type GardenStage = (typeof GROWTH_STAGES)[number];

/**
 * Each mastery stage renders as exactly one growth stage.
 *
 * Exported because the herb page shows the same creature at the same stage, and two copies
 * of this mapping is how the Garden and the card page end up disagreeing about what a
 * player has grown.
 */
export const GARDEN_STAGE_BY_MASTERY: Record<MasteryStage, GardenStage> = {
  discovered: 'sprout',
  learned: 'growing',
  mastered: 'flowering',
};

const STAGE_BY_MASTERY = GARDEN_STAGE_BY_MASTERY;

/**
 * The same mapping read backwards, so a growth stage can name the mastery that caused it.
 *
 * The Garden tile says "Discovered" rather than "Sprout": the DRAWING already shows a sprout,
 * so printing the word beside it restates the picture, while the mastery word answers the
 * question the tile is actually being asked — why is this plant here. `MASTERY_STAGE_LABEL`
 * in mastery.ts already supplies the words, so nothing new is written down.
 *
 * Spelled out rather than computed from `Object.entries` because a derived inverse silently
 * survives the forward map gaining a fourth stage that nothing maps back from. `garden.test.ts`
 * asserts the two are exact inverses in both directions.
 */
export const MASTERY_BY_GARDEN_STAGE: Record<GardenStage, MasteryStage> = {
  sprout: 'discovered',
  growing: 'learned',
  flowering: 'mastered',
};

/**
 * How far up the ladder a stage sits, so a change can be told apart from a swap.
 *
 * Mastery only ever goes forward, so a plant moving BACKWARDS is not a plant shrinking — it is
 * the collection underneath changing identity, which is what signing out mid-session does. The
 * Garden's reward moment must not fire for that.
 */
export function gardenStageIndex(stage: GardenStage): number {
  return GROWTH_STAGES.indexOf(stage);
}

export const STAGE_LABEL: Record<GardenStage, string> = {
  sprout: 'Sprout',
  growing: 'Growing',
  flowering: 'Flowering',
};

/** How much of the sprite is revealed at each stage — the visual reward. */
export const STAGE_SCALE: Record<GardenStage, number> = {
  sprout: 0.45,
  growing: 0.72,
  flowering: 1,
};

/**
 * A species that has not been discovered is not in the garden at all — `null` rather than
 * a seed, so undiscovered plants never appear and the garden never hints at what is left.
 */
export function stageForState(state: HerbdexState, herbId: string): GardenStage | null {
  const mastery = stageFor(state, herbId);
  return mastery ? STAGE_BY_MASTERY[mastery] : null;
}

/**
 * What the player does next to grow this plant. `null` once there is nothing left to do.
 *
 * SHORT ON PURPOSE. This was a full sentence, and it was rendered `sr-only` — so the one line
 * that answers "what do I do about this plant" existed, was computed for all 45, and had never
 * been seen by anybody. Made visible, it has to fit a Garden tile: at 390px the grid is three
 * across, which leaves about 85px of text width, and "Find it again and log the sighting to
 * make it flower" wraps to five lines on every tile.
 *
 * The phrase is exact rather than merely brief. `SIGHTINGS_FOR_MASTERY` is 1, so "Find it
 * again" is the whole requirement — `garden.test.ts` fails if this copy starts describing a
 * different rule from the one `qualifiesForMastery` enforces.
 */
export function nextStageHint(stage: GardenStage): string | null {
  switch (stage) {
    case 'sprout':
      return 'Learn its card';
    case 'growing':
      return 'Find it again';
    case 'flowering':
      return null;
  }
}

export interface GardenEntry {
  herbId: string;
  stage: GardenStage;
}

export function buildGarden(state: HerbdexState, herbIds: string[]): GardenEntry[] {
  const entries: GardenEntry[] = [];
  for (const herbId of herbIds) {
    const stage = stageForState(state, herbId);
    if (stage) entries.push({ herbId, stage });
  }
  return entries;
}
