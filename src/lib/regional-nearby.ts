import { getPrintedCard } from './deck';
import { HABITATS, habitatsOf, type HabitatClass } from './habitat';
import { isFindable, type RegionalSpecies } from './quest-board';
import { speciesForRegion } from './region-species';

/**
 * "Where to look": the chosen region's recorded species grouped by habitat.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A DISPLAY OVER DATA THAT ALREADY EXISTS. It records nothing, pays nothing and scores
 * nothing: the species come from the reviewed occurrence survey (`region-species.ts`), the
 * habitat classes from the confirmed classification (`habitat.ts`), and "found" is read off
 * the discoveries a player already has. This module imports no reducer, progression or
 * store — `regional-nearby.test.ts` reads the source and fails if one appears.
 *
 * LIKELIHOOD, NOT PRESENCE. `confirmed` means the state has specimens or many observations
 * of the plant; it does not mean the plant is at the player's location, in season, or
 * identifiable by sight. `likely` is kept as its own count and never folded into
 * `confirmed`, for the same reason `occurrenceCounts` keeps them apart.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface HabitatGroup {
  habitat: HabitatClass;
  /** Card ids, in card-number order. */
  confirmed: string[];
  /** Recorded occasionally; at the edge of the range. Never counted as confirmed. */
  likely: string[];
  /** Confirmed species in this habitat the player has discovered. */
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
    rule: 'confirmed means at least 5 specimens or 100 observations; likely means at least 1 record but fewer',
  },
};

/** The plain-language statement of the data behind a region's list, or null if unsurveyed. */
export function occurrenceSourceNote(regionId: string | null | undefined): string | null {
  const entry = regionId ? OCCURRENCE_SOURCES[regionId] : undefined;
  if (!entry) return null;
  return (
    `Source: ${entry.source}, surveyed ${entry.surveyed}; ${entry.rule}. ` +
    'Records show a plant has been seen somewhere in the state, not where you are standing. ' +
    'No records is not proof a plant is absent, and this list is not an identification guide.'
  );
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
