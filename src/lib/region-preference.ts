/**
 * Multi-region preference: pure logic, behind a flag that is OFF.
 *
 * Contract: docs/regions/ecoregion-data-contract.md (sections 3, 4, 7). Nothing imports this yet, and
 * nothing here reads a location, a clock or a detector.
 *
 * THE TYPE CANNOT HOLD A COORDINATE. Region ids are lower-case slugs and the other fields are
 * enums, so there is no number, no timestamp and no free text to put one in. `parsePreference`
 * REBUILDS the value from validated parts and drops every other key, so a stored blob carrying
 * extra fields cannot smuggle them back in.
 *
 * REGION VALIDITY IS INJECTED. The ten ecoregions are not in this repository yet, so callers pass
 * `isKnown`; nothing here lists a region or invents membership.
 */

export const HOME_SOURCES = ['detected', 'suggested', 'manual'] as const;
export type HomeSource = (typeof HOME_SOURCES)[number];

export const LOCATION_ASKS = ['never', 'declined', 'granted'] as const;
export type LocationAsk = (typeof LOCATION_ASKS)[number];

/** Ten ecoregions exist, so at most nine extras beside a home. */
export const MAX_EXTRAS = 9;

/** A slug, starting with a letter: "ecoregion-se" passes; "33.7,-84.3" and "33-84" cannot. */
const REGION_ID = /^[a-z][a-z0-9-]{1,39}$/;

export type IsKnownRegion = (id: string) => boolean;

export interface RegionPreference {
  /** Null is first-class: a region is a lens, never a gate. */
  readonly home: string | null;
  readonly extras: readonly string[];
  /** How `home` was chosen. Null exactly when `home` is null. */
  readonly homeSource: HomeSource | null;
  /** Offered at detection, not selected. They never count toward a collection. */
  readonly neighbours: readonly string[];
  readonly locationAsk: LocationAsk;
}

export const EMPTY_PREFERENCE: RegionPreference = Object.freeze({
  home: null,
  extras: Object.freeze([]) as readonly string[],
  homeSource: null,
  neighbours: Object.freeze([]) as readonly string[],
  locationAsk: 'never',
});

/**
 * The feature flag. Anything but the exact string `on` is off, so a typo cannot enable it.
 * The value is a parameter so tests do not depend on the build environment.
 */
export function multiRegionEnabled(
  value: string | undefined = process.env.NEXT_PUBLIC_MULTI_REGION,
): boolean {
  return value === 'on';
}

function validId(id: unknown, isKnown: IsKnownRegion): id is string {
  return typeof id === 'string' && REGION_ID.test(id) && isKnown(id);
}

function idList(raw: unknown, isKnown: IsKnownRegion, exclude: ReadonlySet<string>, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const id of raw) {
    if (out.length >= max) break;
    if (validId(id, isKnown) && !exclude.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * Validate on read. Anything unrecognised degrades to the empty preference or loses only the
 * offending entry: a region withdrawn from the data must not break a page somebody is reading.
 */
export function parsePreference(raw: unknown, isKnown: IsKnownRegion): RegionPreference {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return EMPTY_PREFERENCE;
  const r = raw as Record<string, unknown>;
  const home = validId(r.home, isKnown) ? r.home : null;
  const homeSource =
    home !== null && HOME_SOURCES.includes(r.homeSource as HomeSource)
      ? (r.homeSource as HomeSource)
      : home !== null
        ? 'manual'
        : null;
  const taken = new Set<string>(home ? [home] : []);
  const extras = idList(r.extras, isKnown, taken, MAX_EXTRAS);
  for (const id of extras) taken.add(id);
  const neighbours = idList(r.neighbours, isKnown, taken, MAX_EXTRAS);
  const locationAsk = LOCATION_ASKS.includes(r.locationAsk as LocationAsk)
    ? (r.locationAsk as LocationAsk)
    : 'never';
  return { home, extras, homeSource, neighbours, locationAsk };
}

/** The only shape ever written: ids and enum strings. */
export function serializePreference(pref: RegionPreference): string {
  return JSON.stringify({
    home: pref.home,
    extras: pref.extras,
    homeSource: pref.homeSource,
    neighbours: pref.neighbours,
    locationAsk: pref.locationAsk,
  });
}

// Every helper returns the SAME OBJECT when nothing changes, like the reducers.

/** Home first, then extras; deduplicated. Empty when no region is selected. */
export function selectedRegions(pref: RegionPreference): string[] {
  const all = pref.home ? [pref.home, ...pref.extras] : [...pref.extras];
  return all.filter((id, i) => all.indexOf(id) === i);
}

/**
 * Set or change the home region. The previous home is dropped, not demoted: keeping it is an
 * `addExtra` the caller makes on purpose. The new home leaves extras and neighbours.
 */
export function setHome(
  pref: RegionPreference,
  id: string,
  source: HomeSource,
  isKnown: IsKnownRegion,
): RegionPreference {
  if (!validId(id, isKnown)) return pref;
  if (pref.home === id && pref.homeSource === source) return pref;
  return {
    ...pref,
    home: id,
    homeSource: source,
    extras: pref.extras.filter((e) => e !== id),
    neighbours: pref.neighbours.filter((n) => n !== id),
  };
}

/** Back to "no home". Extras stay: they are separate choices. */
export function clearHome(pref: RegionPreference): RegionPreference {
  return pref.home === null ? pref : { ...pref, home: null, homeSource: null };
}

export function addExtra(pref: RegionPreference, id: string, isKnown: IsKnownRegion): RegionPreference {
  if (!validId(id, isKnown) || id === pref.home || pref.extras.includes(id)) return pref;
  if (pref.extras.length >= MAX_EXTRAS) return pref;
  return { ...pref, extras: [...pref.extras, id], neighbours: pref.neighbours.filter((n) => n !== id) };
}

export function removeExtra(pref: RegionPreference, id: string): RegionPreference {
  return pref.extras.includes(id) ? { ...pref, extras: pref.extras.filter((e) => e !== id) } : pref;
}
