/**
 * Regions a player can choose, and the one that is launched.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A REGION IS CHOSEN, NEVER DETECTED.
 *
 * No GPS, no permission prompt, no IP lookup. `prepareImage` goes to structural lengths to
 * make retaining a camera's coordinates unrepresentable — there is no code path returning
 * original bytes, specifically so EXIF GPS cannot be stored — and asking for a location to
 * pick a plant list would trade that away for a precision the gameplay does not need. A
 * state is wrong only near a border, and the fix for that is letting somebody pick a second
 * one, not reading their position.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The structure is already national: `kind` and `parentId` carry counties and ecoregions
 * whenever those are worth the picker, and `catalog_regions` in 0010 mirrors this exactly.
 * Only `launched` regions are offered, so adding Alabama is a row and a data pass rather
 * than a code change.
 */

export const REGION_KINDS = ['country', 'state', 'ecoregion', 'county'] as const;
export type RegionKind = (typeof REGION_KINDS)[number];

export interface Region {
  id: string;
  kind: RegionKind;
  name: string;
  parentId?: string;
  /** Offered to players. A region can be researched long before it is launched. */
  launched: boolean;
}

export const REGIONS: readonly Region[] = [
  { id: 'us', kind: 'country', name: 'United States', launched: false },
  { id: 'us-ga', kind: 'state', name: 'Georgia', parentId: 'us', launched: true },
];

export function launchedRegions(): Region[] {
  return REGIONS.filter((region) => region.launched);
}

export function regionById(id: string | null | undefined): Region | null {
  if (!id) return null;
  return REGIONS.find((region) => region.id === id) ?? null;
}

/**
 * The region a player's collection is shown for, or null.
 *
 * NULL IS A FIRST-CLASS STATE AND NOT AN ERROR. Plantdex works everywhere and always has;
 * a player who never picks a region keeps the whole Herbdex exactly as it is today. The
 * region adds a lens, never a gate — which is also why nothing in the app may require one.
 */
export function resolveRegion(stored: string | null | undefined): Region | null {
  const region = regionById(stored);
  return region?.launched ? region : null;
}
