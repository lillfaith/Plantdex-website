import { getAchievement } from './achievements';
import { getHerb } from './deck';
import { HABITATS, habitatOf, type HabitatClass } from './habitat';
import type { Cosmetic } from './cosmetics';
import type { HerbdexState } from './types';

/**
 * The eight titles a player can wear under their name.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DEFAULT IS THE LEVEL NAME, AND IT IS NOT IN THIS LIST. With no title chosen the
 * profile prints `progress.levelName` — "Field Explorer", "Master Herbalist" — straight from
 * `progression.ts`. That costs no new content, cannot drift from the ladder, and means the
 * ladder stays the single source of truth for level names (CLAUDE.md). A title here is an
 * ALTERNATIVE to that, never a duplicate of it.
 *
 * Predicates are pure functions of state, so a title unlocks retroactively — see
 * `cosmetics.ts`.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface FieldTitle extends Cosmetic {
  /**
   * True when the printed label depends on which state earned it — currently only
   * Habitat Specialist, which names the ground the player actually works.
   */
  contextual?: boolean;
}

function achievement(id: string) {
  return (state: HerbdexState) => Boolean(getAchievement(id)?.isUnlocked(state));
}

function masteredCount(state: HerbdexState): number {
  return Object.keys(state.mastered).filter((id) => getHerb(id)).length;
}

export const HABITAT_SPECIALIST_ID = 'habitat-specialist';
export const HABITAT_SPECIALIST_THRESHOLD = 5;
export const MASTERED_FOR_CARDWRIGHT = 15;

/**
 * Discoveries per habitat, counted by PRIMARY assignment only.
 *
 * Primary matches what the habitat chip, the Herbdex filter and the habitat achievements all
 * mean by "a Woodland species". Counting inclusively would let a wayside plant whose
 * secondary happens to be Woodland push somebody to Woodland Specialist, and the title would
 * not mean what it says.
 */
export function discoveriesPerHabitat(state: HerbdexState): Record<HabitatClass, number> {
  const counts = Object.fromEntries(HABITATS.map((habitat) => [habitat, 0])) as Record<
    HabitatClass,
    number
  >;
  for (const id of Object.keys(state.discoveries)) {
    const primary = habitatOf(id)?.primary;
    if (primary) counts[primary] += 1;
  }
  return counts;
}

/**
 * The habitat that earns Habitat Specialist, or null.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT PRIVILEGES NO HABITAT. Every ground qualifies on identical terms: five species whose
 * primary habitat is that one. A wetland specialist and a wayside specialist earn the same
 * title the same way, which is the whole reason there is one habitat title instead of five
 * — or instead of one that quietly means Woodland.
 *
 * THE TIE-BREAK IS DETERMINISTIC, and that is not fussiness. Discoveries are an object, and
 * "whichever habitat came first" would depend on insertion order — so the same collection
 * could print a different title after a reload, or after a sync, or on the server. Highest
 * count wins; on an exact tie, `HABITATS` order does, because it is a fixed list.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function qualifyingHabitat(state: HerbdexState): HabitatClass | null {
  const counts = discoveriesPerHabitat(state);
  let best: HabitatClass | null = null;
  for (const habitat of HABITATS) {
    if (counts[habitat] < HABITAT_SPECIALIST_THRESHOLD) continue;
    if (best === null || counts[habitat] > counts[best]) best = habitat;
  }
  return best;
}

export const FIELD_TITLES: readonly FieldTitle[] = [
  {
    id: 'seedling-scholar',
    name: 'Seedling Scholar',
    condition: 'Yours from the start.',
    isUnlocked: () => true,
  },
  {
    id: 'rare-finder',
    name: 'Rare Finder',
    condition: 'Discover 5 Rare plants.',
    isUnlocked: achievement('rare-finder'),
  },
  {
    id: 'epic-hunter',
    name: 'Epic Hunter',
    condition: 'Discover every Epic plant in the deck.',
    isUnlocked: achievement('epic-finder'),
  },
  {
    id: 'field-researcher',
    name: 'Field Researcher',
    condition: 'Complete your first Field Research task.',
    isUnlocked: achievement('first-research'),
  },
  {
    id: 'seasonal-surveyor',
    name: 'Seasonal Surveyor',
    condition: 'Complete the Field Research for every season.',
    isUnlocked: achievement('seasonal-sweep'),
  },
  {
    id: HABITAT_SPECIALIST_ID,
    name: 'Habitat Specialist',
    condition: `Discover ${HABITAT_SPECIALIST_THRESHOLD} plants that share the same primary habitat — any habitat.`,
    isUnlocked: (state) => qualifyingHabitat(state) !== null,
    contextual: true,
  },
  {
    id: 'cardwright',
    name: 'Cardwright',
    condition: `Master ${MASTERED_FOR_CARDWRIGHT} cards.`,
    isUnlocked: (state) => masteredCount(state) >= MASTERED_FOR_CARDWRIGHT,
  },
  {
    id: 'curator',
    name: 'Curator, Collection 01',
    condition: 'Discover every plant in the deck.',
    isUnlocked: achievement('complete-collection'),
  },
] as const;

export function getTitle(id: string | null | undefined): FieldTitle | undefined {
  return FIELD_TITLES.find((title) => title.id === id);
}

/**
 * What a title actually reads as for this state.
 *
 * Habitat Specialist prints the ground that earned it — "Habitat Specialist · Wetland" —
 * which is derived at render time and never stored. The stored id is just
 * `habitat-specialist`, so a player who later works a different ground keeps the title and
 * the label follows them.
 */
export function titleLabel(title: FieldTitle, state: HerbdexState, habitatName?: string): string {
  if (title.id === HABITAT_SPECIALIST_ID) {
    const habitat = qualifyingHabitat(state);
    return habitat && habitatName ? `${title.name} · ${habitatName}` : title.name;
  }
  return title.name;
}
