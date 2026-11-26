import { habitatsViewModel, type HabitatSection } from './habitat-view-model';
import { EMPTY_PREFERENCE } from './region-preference';
import { regionById } from './regions';

/**
 * The Georgia Habitat Trail: ONE complete regional quest over the ORIGINAL 45 cards.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT IS A LENS OVER DISCOVERIES, AND NOTHING ELSE.
 *
 * Progress is measured from the player's `discoveries` on every call, through the Habitats
 * view-model, so there is no counter to increment and no second way to earn a card. A find
 * is recorded by the ordinary discovery path (the scanner or the card page) and this module
 * only READS the result. It imports no reducer, no progression module and no store — the
 * test reads the source and fails if one appears — so it structurally cannot award XP, a
 * discovery or a mastery stage, and it adds no route into any of them.
 *
 * WHAT COUNTS. A habitat group is a STEP when Georgia's survey confirms at least one card
 * in it (recorded often, never merely "recorded only occasionally"). A step is done when
 * any confirmed card in that group is collected. A card whose habitats are two counts in
 * both, which the page says in words. Steps are built from supply, never from a round
 * number, so the quest cannot be impossible: `region-quest.test.ts` collects every
 * confirmed Georgia card and asserts the trail then reports itself complete.
 *
 * NO NEW XP VALUE. Finishing it shows the same completion mark the board's tiers use. If a
 * reward beyond that is wanted it is an owner decision, filed as a Shared Change Request
 * (see `agents/requests/quests-q4-georgia-completion-record.md`).
 *
 * NO CLOCK, NO LOCATION. Georgia is CHOSEN (or offered) and never detected.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const GEORGIA_TRAIL_ID = 'region-quest:us-ga:habitat-trail';
const GEORGIA = 'us-ga';

/** Preview flag. Anything but the exact string `on` is off, so a typo cannot enable it. */
export function georgiaQuestPreviewEnabled(
  value: string | undefined = process.env.NEXT_PUBLIC_GEORGIA_QUEST_PREVIEW,
): boolean {
  return value === 'on';
}

export interface TrailTile {
  herbId: string;
  commonName: string;
  cardNumber: number;
  collected: boolean;
  cardHref: string;
}

export interface TrailStep {
  habitat: HabitatSection['habitat'];
  label: string;
  /** Confirmed Georgia cards in this group, collected or not. */
  tiles: readonly TrailTile[];
  collected: number;
  done: boolean;
}

export interface TrailProgress {
  questId: string;
  regionId: string;
  regionName: string;
  steps: readonly TrailStep[];
  done: number;
  total: number;
  complete: boolean;
  /** Unique confirmed cards across all steps, counted once. */
  uniqueCollected: number;
  uniqueTotal: number;
  /** Habitat groups with only occasional records, shown for honesty but never required. */
  occasionalOnly: readonly string[];
}

/** The words the screen uses. Kept here so a layout writes none of its own. */
export const TRAIL_COPY = {
  title: 'Georgia Habitat Trail',
  objective: (total: number) =>
    `Collect at least one plant from each of Georgia's ${total} habitat groups.`,
  howItCounts:
    'A find counts once it is recorded on its card, by scanning the plant or opening its card. A plant listed in two groups counts for both.',
  stepProgress: (collected: number, total: number) => `${collected} of ${total} collected`,
  stepDone: 'Done',
  stepOpen: 'Still open',
  overall: (done: number, total: number) => `${done} of ${total} groups done`,
  complete: 'Georgia Habitat Trail complete',
  completeNote:
    'Every group has a plant in your collection. Your collection and XP are unchanged by this: the quest records what you have already found.',
  completedOn: (isoDay: string) => `Completed on ${isoDay}`,
  collected: 'Collected',
  notFound: 'Not found yet',
  scan: 'Scan a plant',
  chooseGeorgia: 'Start the Georgia trail',
  chooseNote:
    'Georgia is the only region available. Choosing it is remembered on this device only; Plantdex never asks for your location.',
  noRegion: 'Choose Georgia to begin the trail.',
  preview: 'Preview for owner review. Layout and wording are not final.',
  safety:
    'Look and photograph; do not pick, eat or disturb anything, and stay off private land. A card is not an identification.',
} as const;

/**
 * Measure the trail. Pure: same discoveries, same answer; reads no clock and no storage.
 * `regionId` other than Georgia returns null — this is the Georgia quest, and no other
 * region has a survey to build one from.
 */
export function trailProgress(
  discoveries: Readonly<Record<string, unknown>>,
  regionId: string = GEORGIA,
): TrailProgress | null {
  if (regionId !== GEORGIA) return null;
  const region = regionById(regionId);
  if (!region?.launched) return null;

  // Flag off, no lens: the view-model reproduces today's single-region grouping exactly.
  const view = habitatsViewModel({
    discoveries,
    enabled: false,
    preference: EMPTY_PREFERENCE,
    membership: {},
    stateId: null,
    legacyRegionId: regionId,
  });
  if (view.state !== 'ready') return null;

  const steps: TrailStep[] = [];
  const occasionalOnly: string[] = [];
  for (const section of view.habitats) {
    const required = section.tiles.filter((t) => t.recorded && !t.recordedOccasionally);
    if (required.length === 0) {
      if (section.tiles.length > 0) occasionalOnly.push(section.label);
      continue;
    }
    const tiles: TrailTile[] = required.map((t) => ({
      herbId: t.herbId,
      commonName: t.commonName,
      cardNumber: t.cardNumber,
      collected: t.status === 'collected',
      cardHref: t.info.cardHref,
    }));
    const collected = tiles.filter((t) => t.collected).length;
    steps.push({ habitat: section.habitat, label: section.label, tiles, collected, done: collected > 0 });
  }

  const unique = new Map<string, boolean>();
  for (const step of steps) for (const t of step.tiles) unique.set(t.herbId, t.collected);
  const done = steps.filter((s) => s.done).length;
  return {
    questId: GEORGIA_TRAIL_ID,
    regionId,
    regionName: region.name,
    steps,
    done,
    total: steps.length,
    complete: steps.length > 0 && done === steps.length,
    uniqueCollected: [...unique.values()].filter(Boolean).length,
    uniqueTotal: unique.size,
    occasionalOnly,
  };
}
