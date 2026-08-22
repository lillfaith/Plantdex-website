import type { HerbdexState } from './types';

/**
 * My Garden growth stages.
 *
 * Growth rewards *engagement*, never waiting — nothing here reads a clock, so a plant
 * cannot grow while the app is closed and there is nothing to farm by idling. Stages are
 * derived from what the player has actually done, which means the garden is always a
 * truthful picture of their collection and can never drift out of sync with it.
 *
 * V1 deliberately uses only signals that already exist (discovery, sightings). The ladder
 * has room for reading an entry and passing a future quiz; adding those means adding a
 * signal to `GrowthSignals` and a rule here, and nothing else changes.
 */

export const GROWTH_STAGES = ['seed', 'sprout', 'young', 'mature', 'flowering'] as const;
export type GardenStage = (typeof GROWTH_STAGES)[number];

export const STAGE_LABEL: Record<GardenStage, string> = {
  seed: 'Seed',
  sprout: 'Sprout',
  young: 'Young plant',
  mature: 'Mature plant',
  flowering: 'Flowering',
};

/** How much of the sprite is revealed at each stage — the visual reward. */
export const STAGE_SCALE: Record<GardenStage, number> = {
  seed: 0.4,
  sprout: 0.55,
  young: 0.7,
  mature: 0.85,
  flowering: 1,
};

export interface GrowthSignals {
  discovered: boolean;
  /** Number of field-journal sightings logged for this species. */
  sightings: number;
}

/**
 * A species that has not been discovered is not in the garden at all — `null` rather than
 * a seed, so undiscovered plants never appear.
 */
export function stageFor(signals: GrowthSignals): GardenStage | null {
  if (!signals.discovered) return null;
  if (signals.sightings >= 4) return 'flowering';
  if (signals.sightings >= 2) return 'mature';
  if (signals.sightings >= 1) return 'young';
  return 'sprout';
}

/** What the player can do next to grow this plant. Drives the hint under each sprite. */
export function nextStageHint(stage: GardenStage): string | null {
  switch (stage) {
    case 'sprout':
      return 'Log a sighting to grow this plant';
    case 'young':
      return 'Log another sighting to grow it further';
    case 'mature':
      return 'Two more sightings to reach flowering';
    case 'flowering':
      return null;
    default:
      return null;
  }
}

export interface GardenEntry {
  herbId: string;
  stage: GardenStage;
}

export function buildGarden(
  state: HerbdexState,
  sightingCounts: Record<string, number>,
  herbIds: string[],
): GardenEntry[] {
  const entries: GardenEntry[] = [];
  for (const herbId of herbIds) {
    const stage = stageFor({
      discovered: Boolean(state.discoveries[herbId]),
      sightings: sightingCounts[herbId] ?? 0,
    });
    if (stage) entries.push({ herbId, stage });
  }
  return entries;
}
