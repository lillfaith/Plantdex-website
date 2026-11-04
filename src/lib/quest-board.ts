import { PRINTED_CARDS } from './deck';
import { boardTierFor, findabilityIn } from './findability';
import { habitatOf } from './habitat';
import { seeded, hash } from './rng';
import type { Herb } from './types';

/**
 * The regional quest board: a deterministic view over cards a player could plausibly find.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BOARD IS A LENS, NOT A SECOND COLLECTION.
 *
 * It awards nothing, stores nothing and gates nothing. Every plant on it is a card that
 * already exists; every find is the ordinary `applyDiscovery` that the card page, the
 * scanner and the Seed Shelf already perform; every point of XP is the one that find
 * already paid. Progress is DERIVED from `discoveries` on each render, which is why there
 * is no quest table, no counter to double-increment and no unlock to replay.
 *
 * ONE BOARD PER (REGION, SEASON, YEAR), SHARED BY EVERYONE IN THAT REGION. Not per player:
 * that is what makes seasonal refresh free, lets two people compare boards, and lets a
 * device recompute its own board offline with nothing stored. The seeded RNG is the one
 * `seed-packet.ts` already uses for the same reason — same inputs, same answer, any device.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT DECIDES WHETHER A PLANT MAY APPEAR, AND THE MISTAKE THIS FIXES.
 *
 * An earlier draft filtered on `medicinal_eligibility = 'eligible'`. Applied to the printed
 * deck that empties the board, because every one of the 45 is `pending` until its
 * documentation audit is done — and it confuses two different questions. Eligibility gates
 * whether a NEW species may BECOME a published card. It is not a re-trial of cards that
 * are already published, already printed and already in people's hands.
 *
 * So the board asks the question that is actually correct: **is this a published card, and
 * does its plant occur here?** For a printed card the first is already true. For a
 * generated card it is true only once the species is eligible, because that is precisely
 * what the publication gate in 0010 enforces. One rule, and it reaches the right answer for
 * both kinds without ever re-litigating the original deck.
 */

export const QUEST_TIERS = ['starter', 'main', 'stretch'] as const;
export type QuestTier = (typeof QUEST_TIERS)[number];

export const SEASONS_IN_ORDER = ['spring', 'summer', 'autumn', 'winter'] as const;
export type BoardSeason = (typeof SEASONS_IN_ORDER)[number];

/**
 * Habitats a beginner can reach without a car and without entering anywhere sensitive.
 *
 * WETLAND AND WOODLAND ARE ABSENT FROM THE STARTER TIER ON PURPOSE. A quest is an
 * invitation to go somewhere, and the first one somebody accepts should not be into a bog
 * or off a path. They remain available in the other tiers, where a player has already
 * worked out what the game is asking of them.
 */
export const STARTER_HABITATS = ['wayside', 'garden'] as const;

export interface BoardEntry {
  herbId: string;
  tier: QuestTier;
}

export interface QuestBoard {
  regionId: string;
  season: BoardSeason;
  year: number;
  entries: BoardEntry[];
}

/** What the board needs to know about a species. Supplied by the caller, never guessed. */
export interface RegionalSpecies {
  herbId: string;
  /** `confirmed` or `likely` only — see `isFindable`. */
  occurrence: 'confirmed' | 'likely' | 'insufficient' | 'unlikely';
  /**
   * Seasons the species is FINDABLE in this region, from phenology — never from a histogram
   * of when records happened to be made. `ga_occurrence.py` measures recording effort, which
   * is a different thing and is documented as unusable for this. Empty means year-round,
   * which is the honest default when nobody has established otherwise.
   */
  seasons?: readonly BoardSeason[];
}

const TIER_SIZE: Record<QuestTier, number> = { starter: 5, main: 10, stretch: 3 };

/**
 * ABSENCE OF RECORDS IS NOT ABSENCE OF THE PLANT, but it is also not a reason to send
 * somebody looking. `insufficient` stays off the board without being called `unlikely`.
 */
export function isFindable(species: RegionalSpecies): boolean {
  return species.occurrence === 'confirmed' || species.occurrence === 'likely';
}

/**
 * Is this species in season here?
 *
 * NO SEASON DATA MEANS YEAR-ROUND, NOT OUT OF SEASON. The collection is available all year;
 * seasonal quests are a featured challenge over it. Defaulting the other way would empty
 * the board for every species whose phenology nobody has written down yet, which is most of
 * them, and would quietly turn missing data into a claim.
 */
export function inSeason(species: RegionalSpecies, season: BoardSeason): boolean {
  if (!species.seasons || species.seasons.length === 0) return true;
  return species.seasons.includes(season);
}

function cardFor(herbId: string): Herb | undefined {
  return PRINTED_CARDS.find((card) => card.id === herbId);
}

/**
 * Every card a player in this region may discover — the whole regional collection, not the
 * featured board.
 *
 * This is what makes "users can discover eligible species even when they are not on the
 * current board" true rather than promised: the board is a selection FROM this, and the
 * collection page renders all of it.
 */
export function regionalCollection(species: readonly RegionalSpecies[]): Herb[] {
  return species
    .filter(isFindable)
    .map((entry) => cardFor(entry.herbId))
    .filter((card): card is Herb => card !== undefined)
    .sort((a, b) => a.cardNumber - b.cardNumber);
}

/** A deterministic sample: same pool and same seed give the same answer, always. */
function sample<T>(pool: readonly T[], count: number, rand: () => number): T[] {
  // Fisher-Yates over a copy, drawing from the supplied generator so the whole board is one
  // reproducible sequence rather than N independent draws that reshuffle when a tier grows.
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, count);
}

/**
 * Build the board.
 *
 * Deterministic in its inputs and nothing else: no clock, no `Math.random()`, no network,
 * no per-player state. `quest-board.test.ts` fails on any of them, the same rule
 * `seed-packet.test.ts` holds the packet generator to.
 */
export function questBoard(
  regionId: string,
  season: BoardSeason,
  year: number,
  species: readonly RegionalSpecies[],
): QuestBoard {
  const rand = seeded(hash(`${regionId}:${season}:${year}`));
  const available = species
    .filter((entry) => isFindable(entry) && inSeason(entry, season))
    .map((entry) => ({ entry, card: cardFor(entry.herbId) }))
    .filter((row): row is { entry: RegionalSpecies; card: Herb } => row.card !== undefined)
    // Sorted before sampling so the pool's order never depends on the caller's array order.
    .sort((a, b) => a.card.cardNumber - b.card.cardNumber);

  /*
   * THE TIER COMES FROM THE DOCUMENTED RULE, not from the printed rarity directly.
   * `findabilityIn` is where "how hard is this to find HERE" is decided — printed Encounter
   * Rate, adjusted at most one step for occurrence and habitat access — and `boardTierFor`
   * maps that onto the three tiers. Reading `card.rarity` here instead would mean two
   * places decided difficulty and could disagree.
   */
  const tierOf = (row: { entry: RegionalSpecies; card: Herb }) => {
    const findability = findabilityIn(row.card.id, row.entry);
    return findability ? boardTierFor(findability) : null;
  };

  /*
   * EACH TIER DRAWS FROM ITS OWN TIER, AND THAT IS A BUG FIX.
   *
   * The first version filled `main` from everything still unused, which STARVED `stretch`:
   * with thirteen featured plants, five went to starter and main took the remaining eight —
   * including both scarce ones — so the board rendered two tiers and the "worth going out
   * for" section silently vanished. Found by rendering the page, not by a unit test, which
   * is why there is now one asserting all three tiers are populated.
   *
   * Drawing per tier also makes the documented rule actually decide placement, rather than
   * deciding it only for whatever sampling order happened to leave behind.
   */
  const starterPool = available.filter(
    (row) =>
      tierOf(row) === 'starter' &&
      // The starter tier asks one thing beyond difficulty: that the place is easy to reach.
      // `habitatOf` is undefined for an unclassified card, which cannot make that promise,
      // so it is excluded from THIS tier and from no other.
      (STARTER_HABITATS as readonly string[]).includes(habitatOf(row.card.id)?.primary ?? ''),
  );
  const starter = sample(starterPool, TIER_SIZE.starter, rand);
  const taken = new Set(starter.map((row) => row.card.id));

  // `main` takes the middle tier PLUS any starter-tier plant that did not fit or whose
  // habitat is a walk rather than a verge. Nothing findable is dropped from the board for
  // want of a slot in the tier it would have preferred.
  const mainPool = available.filter(
    (row) => !taken.has(row.card.id) && tierOf(row) !== 'stretch',
  );
  const main = sample(mainPool, TIER_SIZE.main, rand);
  main.forEach((row) => taken.add(row.card.id));

  const stretchPool = available.filter(
    (row) => !taken.has(row.card.id) && tierOf(row) === 'stretch',
  );
  const stretch = sample(stretchPool, TIER_SIZE.stretch, rand);

  return {
    regionId,
    season,
    year,
    entries: [
      ...starter.map((row) => ({ herbId: row.card.id, tier: 'starter' as const })),
      ...main.map((row) => ({ herbId: row.card.id, tier: 'main' as const })),
      ...stretch.map((row) => ({ herbId: row.card.id, tier: 'stretch' as const })),
    ],
  };
}

/**
 * Progress, DERIVED from the discoveries a player already has.
 *
 * Takes the discovery record the store already holds. Nothing is stored per quest, so a
 * board that changes cannot lose progress and a player who made the finds before the board
 * existed arrives with the tier already complete.
 */
export function boardProgress(
  board: QuestBoard,
  discoveries: Readonly<Record<string, unknown>>,
): Record<QuestTier, { found: number; total: number }> {
  const out = {
    starter: { found: 0, total: 0 },
    main: { found: 0, total: 0 },
    stretch: { found: 0, total: 0 },
  };
  for (const entry of board.entries) {
    out[entry.tier].total += 1;
    if (Object.prototype.hasOwnProperty.call(discoveries, entry.herbId)) {
      out[entry.tier].found += 1;
    }
  }
  return out;
}
