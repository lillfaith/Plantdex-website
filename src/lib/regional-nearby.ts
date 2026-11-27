import { getPrintedCard } from './deck';
import { HABITATS, habitatsOf, type HabitatClass } from './habitat';
import { isFindable, type RegionalSpecies } from './quest-board';
import { speciesForRegion } from './region-species';

/**
 * A region's recorded species grouped by habitat.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A DISPLAY OVER DATA THAT ALREADY EXISTS. It records nothing, pays nothing and scores
 * nothing: the species come from the reviewed occurrence survey (`region-species.ts`), the
 * habitat classes from the confirmed classification (`habitat.ts`), and "in your collection"
 * is read off the discoveries a player already has. This module imports no reducer,
 * progression or store — `regional-nearby.test.ts` reads the source and fails if one appears.
 *
 * WHAT THE DATA IS: historical occurrence RECORDS for a whole region (GBIF counts, surveyed
 * on a date). It is not live sightings, not the player's position (nothing about it is read),
 * and not presence or season. `confirmed` means many records; `likely` is the internal name
 * for "recorded only occasionally" and is kept as its own count, never folded into
 * `confirmed`. The words a screen may use live in `RECORDED_COPY` below, so any layout
 * reuses the same accurate sentences.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface HabitatGroup {
  habitat: HabitatClass;
  /** Card ids, in card-number order. */
  confirmed: string[];
  /** Recorded only occasionally. Never counted as confirmed. */
  likely: string[];
  /** Confirmed species in this habitat whose card the player has already unlocked. */
  confirmedFound: number;
}

/**
 * What the occurrence data is. One constant per surveyed region so the page cannot describe
 * a survey that was not run for that region.
 */
export const OCCURRENCE_SOURCES: Readonly<
  Record<string, { source: string; surveyed: string; rule: string }>
> = {
  'us-ga': {
    source: 'GBIF preserved-specimen and human-observation counts inside Georgia',
    surveyed: '2026-11-04',
    rule: 'recorded often means at least 5 specimens or 100 observations; recorded only occasionally means at least 1 record but fewer',
  },
};

/**
 * The exact user-facing strings for this view. Any layout must take its words from here and
 * write none of its own; `regional-nearby.test.ts` bans location-implying wording
 * ("nearby", "near you", "right now", "live" ...) across this object and the component.
 */
export const RECORDED_COPY = {
  heading: (region: string) => `Recorded in ${region}`,
  subheading: (region: string) =>
    `These are plants with records in ${region}, grouped by the kind of habitat they are usually recorded in. A plant usually recorded in two habitats is listed under both, so the counts overlap.`,
  progress: (unlocked: number, total: number) =>
    `${unlocked} of ${total} in your collection`,
  unlockedBadge: 'unlocked',
  occasionalLabel: (region: string) => `Recorded only occasionally in ${region}`,
  /**
   * The short notice on a plant sheet. Accurate, not alarming: a record is a statement about the region. The full source, date, rule and
   * limits stay in `sourceNote`, one tap away under "About this data".
   */
  sheetNotice: 'Recorded somewhere in this region, which is not a guarantee it grows where you are.',
  /** Source, survey date, rule and limits; null for a region that was never surveyed. */
  sourceNote: (regionId: string | null | undefined): string | null => {
    const entry = regionId ? OCCURRENCE_SOURCES[regionId] : undefined;
    if (!entry) return null;
    return (
      `Source: ${entry.source}, surveyed ${entry.surveyed}; ${entry.rule}. ` +
      'Records show a plant has been recorded somewhere in the region, not where you are. ' +
      'No record is not proof a plant is absent, and this list is not an identification guide.'
    );
  },
} as const;

/** The plain-language statement of the data behind a region's list, or null if unsurveyed. */
export function occurrenceSourceNote(regionId: string | null | undefined): string | null {
  return RECORDED_COPY.sourceNote(regionId);
}

/**
 * Group a region's findable species by habitat. A species with a secondary habitat appears
 * under both, so per-habitat figures must not be summed. Habitats with nothing are omitted.
 */
export function nearbyByHabitat(
  regionId: string | null | undefined,
  discoveries: Readonly<Record<string, unknown>>,
  species: readonly RegionalSpecies[] = speciesForRegion(regionId),
): HabitatGroup[] {
  const findable = species
    .filter(isFindable)
    .map((entry) => ({ entry, card: getPrintedCard(entry.herbId) }))
    .filter((row) => row.card !== undefined)
    .sort((a, b) => a.card!.cardNumber - b.card!.cardNumber);

  return HABITATS.flatMap((habitat) => {
    const inHabitat = findable.filter((row) => habitatsOf(row.entry.herbId).includes(habitat));
    const confirmed = inHabitat
      .filter((row) => row.entry.occurrence === 'confirmed')
      .map((row) => row.entry.herbId);
    const likely = inHabitat
      .filter((row) => row.entry.occurrence === 'likely')
      .map((row) => row.entry.herbId);
    if (confirmed.length === 0 && likely.length === 0) return [];
    return [{
      habitat,
      confirmed,
      likely,
      confirmedFound: confirmed.filter((id) => Boolean(discoveries[id])).length,
    }];
  });
}
