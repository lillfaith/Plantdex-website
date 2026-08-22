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
 * Nothing here reads a clock. A plant cannot grow while the app is closed, there is
 * nothing to farm by idling, and no timer to wait out — AGENTS.md rules out watering
 * meters, energy systems and artificial waiting, and the way to guarantee that is to have
 * no time input at all. Growth follows what the player actually did.
 */

export const GROWTH_STAGES = ['sprout', 'growing', 'flowering'] as const;
export type GardenStage = (typeof GROWTH_STAGES)[number];

/** Each mastery stage renders as exactly one growth stage. */
const STAGE_BY_MASTERY: Record<MasteryStage, GardenStage> = {
  discovered: 'sprout',
  learned: 'growing',
  mastered: 'flowering',
};

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

/** What the player can do next to grow this plant. Drives the hint under each sprite. */
export function nextStageHint(stage: GardenStage): string | null {
  switch (stage) {
    case 'sprout':
      return 'Learn its card to grow this plant';
    case 'growing':
      return 'Find it again and log the sighting to make it flower';
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
