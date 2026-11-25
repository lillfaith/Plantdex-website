import { getPrintedCard } from './deck';
import { HABITATS, HABITAT_LABEL, habitatsOf, type HabitatClass } from './habitat';
import { isFindable, type RegionalSpecies } from './quest-board';
import { speciesInView, type RegionMembership } from './region-collection';
import { selectedRegions, type RegionPreference } from './region-preference';
import { speciesForRegion } from './region-species';
import { nearbyByHabitat } from './regional-nearby';

/**
 * The data layer behind the Habitats screen (poster carousel, three-column labelled sprite grid,
 * on-demand plant info sheet). PURE: no UI, no storage, no clock, no location. Every input is a
 * parameter, so the screen supplies state and the tests supply fixtures.
 *
 * Vocabulary (owner): `collected` is owning a card, derived from `discoveries` and NEVER from a
 * region. `recorded` is only for occurrence data. `unlocked` is reserved for XP Field Cards and
 * appears nowhere here. Absence from a list is "no record", never "unlikely".
 *
 * Flag off, or no selected region: the view is `nearbyByHabitat` over today's single region, same
 * species, same split. Nothing in the existing modules is changed.
 */

export type TileStatus = 'collected' | 'notFound';

export interface PlantInfo {
  herbId: string;
  commonName: string;
  scientificName: string;
  habitats: readonly { id: HabitatClass; label: string }[];
  collected: boolean;
  /** Route path of the card page. The screen's link component adds any base path. */
  cardHref: string;
}

export interface HabitatTile {
  herbId: string;
  commonName: string;
  cardNumber: number;
  /** Exactly one of two, from the player's discoveries alone. */
  status: TileStatus;
  /** Occurrence data lists this species in the scope. False means "no record", not "unlikely". */
  recorded: boolean;
  /** Recorded, but only occasionally. Implies `recorded`. */
  recordedOccasionally: boolean;
  info: PlantInfo;
}

export interface ScopedCount {
  collected: number;
  total: number;
  /** Names the source, e.g. "Georgia records". Always present. */
  scopeLabel: string;
}

export interface HabitatSection {
  habitat: HabitatClass;
  label: string;
  tiles: readonly HabitatTile[];
  count: ScopedCount;
}

export interface ScopeDescriptor {
  mode: 'singleRegion' | 'regions';
  regionIds: readonly string[];
  stateId: string | null;
  source: 'occurrence' | 'membership' | 'none';
  label: string;
}

export type ViewState = 'ready' | 'empty' | 'noRegionSelected' | 'noRegionData';

export interface HabitatsViewModel {
  state: ViewState;
  scope: ScopeDescriptor;
  habitats: readonly HabitatSection[];
  /** Unique species across the whole scope, counted once. NEVER the sum of `habitats`. */
  total: ScopedCount;
  message: string | null;
}

export const HABITAT_VIEW_COPY = {
  count: (collected: number, total: number) => `${collected} of ${total} collected`,
  collected: 'Collected',
  notFound: 'Not found yet',
  recorded: 'Recorded',
  recordedOccasionally: 'Recorded only occasionally',
  noRecord: 'No record in this scope',
  noRegionSelected: 'Choose a region to see its recorded plants.',
  noRegionData: 'No region data yet.',
  empty: 'No plants recorded for this selection.',
} as const;

const DEFAULT_NAMES: Readonly<Record<string, string>> = { 'us-ga': 'Georgia' };

export interface HabitatsInput {
  /** The collection: any record keyed by herb id. Collected = has an entry. */
  discoveries: Readonly<Record<string, unknown>>;
  enabled: boolean;
  preference: RegionPreference;
  membership: RegionMembership;
  stateId: string | null;
  /** Today's single region id (what `/quests` reads). Used when the flag is off or nothing is selected. */
  legacyRegionId: string | null;
  occurrence?: (regionId: string) => readonly RegionalSpecies[];
  stateSpecies?: (stateId: string) => readonly string[];
  regionName?: (regionId: string) => string;
}

interface Row { herbId: string; recorded: boolean; occasional: boolean }

function tileFor(row: Row, discoveries: Readonly<Record<string, unknown>>): HabitatTile | null {
  const card = getPrintedCard(row.herbId);
  if (!card) return null;
  const collected = Boolean(discoveries[row.herbId]);
  return {
    herbId: row.herbId,
    commonName: card.commonName,
    cardNumber: card.cardNumber,
    status: collected ? 'collected' : 'notFound',
    recorded: row.recorded,
    recordedOccasionally: row.recorded && row.occasional,
    info: {
      herbId: row.herbId,
      commonName: card.commonName,
      scientificName: card.scientificName,
      habitats: habitatsOf(row.herbId).map((id) => ({ id, label: HABITAT_LABEL[id] })),
      collected,
      cardHref: `/herbdex/${row.herbId}`,
    },
  };
}

/** Recorded-often first, then card number: the same order `nearbyByHabitat` lists. */
function ordered(tiles: HabitatTile[]): HabitatTile[] {
  return tiles.sort(
    (a, b) => Number(a.recordedOccasionally) - Number(b.recordedOccasionally) || a.cardNumber - b.cardNumber,
  );
}

function assemble(
  tiles: readonly HabitatTile[],
  scope: ScopeDescriptor,
  state: ViewState,
): HabitatsViewModel {
  const sections = HABITATS.map((habitat) => {
    const inHabitat = ordered(tiles.filter((t) => habitatsOf(t.herbId).includes(habitat)));
    return {
      habitat,
      label: HABITAT_LABEL[habitat],
      tiles: inHabitat,
      count: {
        collected: inHabitat.filter((t) => t.status === 'collected').length,
        total: inHabitat.length,
        scopeLabel: scope.label,
      },
    };
  });
  const message =
    state === 'noRegionSelected' ? HABITAT_VIEW_COPY.noRegionSelected
    : state === 'noRegionData' ? HABITAT_VIEW_COPY.noRegionData
    : state === 'empty' ? HABITAT_VIEW_COPY.empty
    : null;
  return {
    state,
    scope,
    habitats: sections,
    total: {
      collected: tiles.filter((t) => t.status === 'collected').length,
      total: tiles.length,
      scopeLabel: scope.label,
    },
    message,
  };
}

export function habitatsViewModel(input: HabitatsInput): HabitatsViewModel {
  const { discoveries, preference, stateId, legacyRegionId } = input;
  const occurrence = input.occurrence ?? ((id: string) => speciesForRegion(id));
  const nameOf = input.regionName ?? ((id: string) => DEFAULT_NAMES[id] ?? id);
  const lens = input.enabled ? selectedRegions(preference) : [];

  if (lens.length === 0) {
    // Today's experience, reproduced from the existing grouping.
    if (!legacyRegionId) {
      return assemble([], { mode: 'singleRegion', regionIds: [], stateId: null, source: 'none', label: 'No region' }, 'noRegionSelected');
    }
    const species = occurrence(legacyRegionId);
    const scope: ScopeDescriptor = {
      mode: 'singleRegion', regionIds: [legacyRegionId], stateId: null,
      source: species.length > 0 ? 'occurrence' : 'none',
      label: `${nameOf(legacyRegionId)} records`,
    };
    const seen = new Map<string, Row>();
    for (const g of nearbyByHabitat(legacyRegionId, discoveries, species)) {
      for (const id of g.confirmed) if (!seen.has(id)) seen.set(id, { herbId: id, recorded: true, occasional: false });
      for (const id of g.likely) if (!seen.has(id)) seen.set(id, { herbId: id, recorded: true, occasional: true });
    }
    const tiles = [...seen.values()].map((r) => tileFor(r, discoveries)).filter((t): t is HabitatTile => t !== null);
    return assemble(tiles, scope, species.length === 0 ? 'noRegionData' : tiles.length === 0 ? 'empty' : 'ready');
  }

  const occ = new Map<string, Row>();
  for (const id of lens) {
    for (const entry of occurrence(id)) {
      if (!isFindable(entry)) continue;
      const occasional = entry.occurrence !== 'confirmed';
      const prior = occ.get(entry.herbId);
      if (!prior || (prior.occasional && !occasional)) occ.set(entry.herbId, { herbId: entry.herbId, recorded: true, occasional });
    }
  }
  const inView = speciesInView({
    enabled: true, preference, membership: input.membership, stateId, stateSpecies: input.stateSpecies,
  }) ?? [];
  const tiles = [...new Set(inView)]
    .map((id) => tileFor(occ.get(id) ?? { herbId: id, recorded: false, occasional: false }, discoveries))
    .filter((t): t is HabitatTile => t !== null);

  const hasData = lens.some((id) => (input.membership[id]?.length ?? 0) > 0 || occurrence(id).length > 0);
  const stateList = stateId === null ? null : (input.stateSpecies ? input.stateSpecies(stateId) : occurrence(stateId).map((e) => e.herbId));
  const names = lens.map(nameOf).join(' + ');
  const source = occ.size > 0 ? 'occurrence' : hasData ? 'membership' : 'none';
  const scope: ScopeDescriptor = {
    mode: 'regions', regionIds: lens, stateId, source,
    label: `${names} ${source === 'occurrence' ? 'records' : 'species list'}${stateId ? `, ${nameOf(stateId)} only` : ''}`,
  };
  const state: ViewState =
    !hasData || (stateList !== null && stateList.length === 0) ? 'noRegionData'
    : tiles.length === 0 ? 'empty'
    : 'ready';
  return assemble(tiles, scope, state);
}
