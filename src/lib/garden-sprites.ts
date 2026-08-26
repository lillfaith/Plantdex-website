import manifest from '@/data/garden-sprites.json';
import type { GardenStage } from './garden';
import { GROWTH_STAGES } from './garden';

/**
 * Species-specific Garden growth art: which plants have it, and where their sheet is.
 *
 * WHAT THIS IS FOR. The Garden used to draw every species as its creature portrait at three
 * sizes — one plant pretending to grow. A dandelion and a pine deserve different sequences,
 * because a dandelion spreads sideways and stays low while a pine gains a trunk, and the
 * Garden is the one screen where that difference is the whole point.
 *
 * WHAT IT DELIBERATELY IS NOT. It is not a lookup of hard-coded paths in a component. A
 * component asks for `herbId` and a stage; this module answers, or says it has nothing —
 * so adding art for the next species is dropping one authored module into
 * `scripts/garden_sources/` and re-running the builder. No UI file changes, and an
 * expansion pack's plants work the day their art exists.
 *
 * PARTIAL BY DESIGN, AND HONEST ABOUT IT. Growth art is authored by hand, one species at a
 * time. A species with no sequence yet falls back to what the Garden already showed — its
 * own portrait, scaled by stage — rather than to a generic sprout that would be the same
 * for everyone. That fallback is the previous behaviour, not a new placeholder, which is
 * why it is safe to ship half-finished: nothing looks worse than it did yesterday, and
 * `docs/garden-sprites.md` names exactly which species are still waiting.
 */

export interface GardenSprite {
  herbId: string;
  /** Sheet of the three stages, side by side, in `GROWTH_STAGES` order. */
  src: string;
  /** One stage's box, in device pixels as shipped (authored 24px at 5x). */
  frameWidth: number;
  frameHeight: number;
  stages: string[];
  /** The author's own note on the sequence. Internal; never rendered. */
  note?: string;
}

const SPRITES = manifest as unknown as Record<string, GardenSprite>;

/** The growth sheet for a species, or `undefined` when its art is not authored yet. */
export function gardenSpriteFor(herbId: string): GardenSprite | undefined {
  return SPRITES[herbId];
}

/** Which frame of the sheet a stage is. Mirrors `GROWTH_STAGES`, and is pinned by a test. */
export function stageFrame(stage: GardenStage): number {
  return GROWTH_STAGES.indexOf(stage);
}

/** Every species with authored growth art, in id order. Drives the coverage note in docs. */
export function speciesWithGrowthArt(): string[] {
  return Object.keys(SPRITES).sort();
}
