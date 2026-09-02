import { ACHIEVEMENTS } from './achievements';
import { DECK_SIZE, getHerb } from './deck';
import { buildGarden, type GardenEntry } from './garden';
import { HABITATS, habitatOf, type HabitatClass } from './habitat';
import { stageFor, type MasteryStage } from './mastery';
import { progressFromState, researchKindFromId, type Progress } from './progression';
import { RARITIES, type HerbdexState, type Rarity } from './types';

/**
 * EVERYTHING THE PROFILE SHOWS THAT NOBODY CHOSE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DERIVED, EVERY TIME, FROM THE RECORDS. Not one number here is stored, on the client or on
 * the server — they are recomputed from `HerbdexState` on each read. That is what makes the
 * profile row a list of choices with no numbers in it, and it is the same reason XP has
 * never been stored: a stored total is a total that can be replayed, tampered with, or fall
 * out of step with the records it claims to summarise.
 *
 * NO THRESHOLD LITERALS. Level, XP and the level band come from `progressFromState()`
 * (CLAUDE.md: XP and level thresholds live only in `progression.ts`). Nothing in this file
 * knows what a level costs.
 *
 * EVERY ORDERING IS DETERMINISTIC. Discoveries are an object, so any "first" or "best"
 * decided by key order would move between a reload, a sync and the server. Each sort below
 * therefore ends in a fixed tie-break — card number, or `HABITATS` order.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface RecentFind {
  herbId: string;
  discoveredAt: string;
  stage: MasteryStage;
}

export interface HabitatStanding {
  habitat: HabitatClass;
  count: number;
}

export interface ProfileStats {
  progress: Progress;
  discovered: number;
  learned: number;
  mastered: number;
  deckSize: number;
  /** 0-100, rounded. Discovery, not mastery — completion of the collection. */
  completionPct: number;
  achievementsEarned: number;
  achievementsTotal: number;
  researchCompleted: number;
  /** Every habitat, in HABITATS order, with how many of its species have been found. */
  habitats: HabitatStanding[];
  /** The most-worked ground, or null when nothing has been found there yet. */
  topHabitat: HabitatStanding | null;
  /** The highest-rarity card held; the lowest card number among equals. */
  rarestHerbId: string | null;
  recentFinds: RecentFind[];
  /** A few plants for the garden strip, most grown first. Never the whole garden. */
  gardenPreview: GardenEntry[];
}

export const RECENT_FIND_COUNT = 3;
export const GARDEN_PREVIEW_COUNT = 5;

/** Only ids that name real cards count. A tampered or stale id is worth nothing anywhere. */
function realIds(record: Record<string, string>): string[] {
  return Object.keys(record).filter((id) => getHerb(id));
}

const cardNumber = (id: string): number => getHerb(id)?.cardNumber ?? Number.MAX_SAFE_INTEGER;
const rarityRank = (rarity: Rarity): number => RARITIES.indexOf(rarity);

function habitatStandings(state: HerbdexState): HabitatStanding[] {
  const counts = Object.fromEntries(HABITATS.map((h) => [h, 0])) as Record<HabitatClass, number>;
  for (const id of realIds(state.discoveries)) {
    // Primary only — the same thing the habitat chip, the Herbdex filter and the habitat
    // achievements all mean by "a Woodland species".
    const primary = habitatOf(id)?.primary;
    if (primary) counts[primary] += 1;
  }
  return HABITATS.map((habitat) => ({ habitat, count: counts[habitat] }));
}

function rarestDiscovered(state: HerbdexState): string | null {
  let best: string | null = null;
  for (const id of realIds(state.discoveries)) {
    if (best === null) {
      best = id;
      continue;
    }
    const a = getHerb(id)!;
    const b = getHerb(best)!;
    const byRarity = rarityRank(a.rarity) - rarityRank(b.rarity);
    if (byRarity > 0 || (byRarity === 0 && a.cardNumber < b.cardNumber)) best = id;
  }
  return best;
}

function recentFinds(state: HerbdexState, limit: number): RecentFind[] {
  return realIds(state.discoveries)
    .map((herbId) => ({
      herbId,
      discoveredAt: state.discoveries[herbId]!,
      stage: stageFor(state, herbId) ?? 'discovered',
    }))
    .sort(
      (a, b) =>
        b.discoveredAt.localeCompare(a.discoveredAt) || cardNumber(a.herbId) - cardNumber(b.herbId),
    )
    .slice(0, limit);
}

/** Most grown first, so a short strip shows a player's best work rather than their newest. */
const STAGE_ORDER = { flowering: 0, growing: 1, sprout: 2 } as const;

function gardenPreview(state: HerbdexState, limit: number): GardenEntry[] {
  return buildGarden(state, realIds(state.discoveries))
    .sort(
      (a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage] || cardNumber(a.herbId) - cardNumber(b.herbId),
    )
    .slice(0, limit);
}

export function profileStats(state: HerbdexState): ProfileStats {
  const discovered = realIds(state.discoveries).length;
  const habitats = habitatStandings(state);
  // `reduce` rather than a sort, so an all-zero board yields null instead of "woodland, 0".
  const topHabitat = habitats.reduce<HabitatStanding | null>(
    (best, entry) => (entry.count > 0 && (best === null || entry.count > best.count) ? entry : best),
    null,
  );

  return {
    progress: progressFromState(state),
    discovered,
    learned: realIds(state.learned).length,
    mastered: realIds(state.mastered).length,
    deckSize: DECK_SIZE,
    completionPct: DECK_SIZE > 0 ? Math.round((discovered / DECK_SIZE) * 100) : 0,
    achievementsEarned: ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length,
    achievementsTotal: ACHIEVEMENTS.length,
    // Priced through `researchKindFromId` so a record whose id belongs to no known kind is
    // not counted — the same rule `progression.ts` applies when paying for one.
    researchCompleted: Object.keys(state.research).filter((id) => researchKindFromId(id)).length,
    habitats,
    topHabitat,
    rarestHerbId: rarestDiscovered(state),
    recentFinds: recentFinds(state, RECENT_FIND_COUNT),
    gardenPreview: gardenPreview(state, GARDEN_PREVIEW_COUNT),
  };
}
