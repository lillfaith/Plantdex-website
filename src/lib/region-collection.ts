import { habitatsOf, HABITATS, type HabitatClass } from './habitat';
import { speciesForRegion } from './region-species';
import { selectedRegions, type RegionPreference } from './region-preference';

/**
 * What a region selection means for a collection (contract section 4). Pure and injectable:
 * membership is a parameter, because ecoregion membership has not been reviewed or published and
 * nothing here may invent it. Absence from a region's list means "no record", not "unlikely".
 */

/** Region id -> species keys recorded there. */
export type RegionMembership = Readonly<Record<string, readonly string[]>>;

/** Rule 1: the union of the selected regions' species, each counted once, in first-seen order. */
export function unionSpecies(regionIds: readonly string[], membership: RegionMembership): string[] {
  const seen = new Set<string>();
  for (const id of regionIds) for (const species of membership[id] ?? []) seen.add(species);
  return [...seen];
}

export interface CollectionCounts {
  /** Unique species. This, never the sum of `byHabitat`, is the total. */
  readonly total: number;
  /** Per-habitat counts. A species in two habitats is in both, so these may overlap. */
  readonly byHabitat: Readonly<Record<HabitatClass, number>>;
}

/** Rule 2: habitat membership is kept separate from region membership and is injectable. */
export function countCollection(
  species: readonly string[],
  habitats: (id: string) => readonly HabitatClass[] = habitatsOf,
): CollectionCounts {
  const unique = [...new Set(species)];
  const byHabitat = Object.fromEntries(HABITATS.map((h) => [h, 0])) as Record<HabitatClass, number>;
  for (const id of unique) for (const h of new Set(habitats(id))) byHabitat[h] += 1;
  return { total: unique.length, byHabitat };
}

/**
 * Rule 4: the state filter is an intersection applied LAST. Null leaves the list untouched (the
 * same array). A state with no list yields nothing: it records no species, and says nothing about
 * absence. It never reads or changes which regions are selected.
 */
export function applyStateFilter(
  species: readonly string[],
  stateId: string | null,
  stateSpecies: (stateId: string) => readonly string[] = (id) => speciesForRegion(id).map((e) => e.herbId),
): readonly string[] {
  if (stateId === null) return species;
  const allowed = new Set(stateSpecies(stateId));
  return species.filter((id) => allowed.has(id));
}

/**
 * The species a player's selection resolves to, or null for "no filter at all".
 *
 * Flag off or no selected region => NO REGION LENS, and today's behaviour is reproduced exactly:
 * a state alone yields that state's own list (what `speciesForRegion` returns today) and nothing
 * selected yields null. With a lens, the state intersects the union.
 */
export function speciesInView(opts: {
  enabled: boolean;
  preference: RegionPreference;
  membership: RegionMembership;
  stateId: string | null;
  stateSpecies?: (stateId: string) => readonly string[];
}): readonly string[] | null {
  const { enabled, preference, membership, stateId, stateSpecies } = opts;
  const lens = enabled ? selectedRegions(preference) : [];
  if (lens.length === 0) {
    if (stateId === null) return null;
    return applyStateFilter(
      stateSpecies ? stateSpecies(stateId) : speciesForRegion(stateId).map((e) => e.herbId),
      stateId,
      stateSpecies,
    );
  }
  return applyStateFilter(unionSpecies(lens, membership), stateId, stateSpecies);
}
