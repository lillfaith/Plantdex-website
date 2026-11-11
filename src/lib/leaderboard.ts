import type { HerbdexState } from './types';
import type { Sighting } from './sightings';

/**
 * LEADERBOARD POINTS — the one place the competitive score is defined.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS NOT A SECOND CURRENCY, AND THE WHOLE DESIGN TURNS ON THAT.
 *
 * XP already measures one thing — how far a player has got with the collection — and it is
 * DERIVED rather than stored (`progression.ts`; CLAUDE.md: "XP is derived, never stored").
 * A leaderboard measures a different thing: how much real field work somebody has put in,
 * compared with other people. Those are genuinely two questions, which is why the board does
 * not simply rank by XP — XP pays for learning a card and mastering it, both of which happen
 * indoors, and a competitive board that rewarded sitting at a table with the deck would point
 * the incentive at the screen.
 *
 * But it is also NOT a parallel economy. Points buy nothing, unlock nothing and gate nothing.
 * They are a VIEW over records the game already keeps — discoveries, field journal entries,
 * completed research challenges — in exactly the way `boardProgress` is a view over
 * discoveries and `xpForDiscoveries` is a view over the same rows. Nothing anywhere stores a
 * point total.
 *
 * WHY DERIVED SCORING IS STRONGER THAN "IDEMPOTENT AWARDS".
 *
 * The usual way to build this is an awards ledger: when something happens, write a row worth
 * N points, with a unique key so it cannot be written twice. That is a correct design and it
 * is weaker than this one, because it still has a WRITE PATH — something, somewhere, decides
 * to award. Every bug in such a system is a bug in that decision.
 *
 * Here there is no award. A player's score is a pure function of rows they already own, and
 * every anti-farming rule the brief asks for falls out of set membership rather than being
 * enforced:
 *
 *   "repeated observations of the same species earn no further discovery points"
 *        → `discoveries` has primary key (user_id, herb_id). There is only ever one row.
 *   "editing an existing entry earns no points"
 *        → the score counts SPECIES with a qualifying entry, not entries. Editing one
 *          changes nothing to count. (`sightings` has no update policy either, so an edit is
 *          a delete and an insert — which is the next line.)
 *   "no farming by creating, deleting and recreating"
 *        → delete and re-log a sighting and the species is still one species with one
 *          qualifying entry. The set is the same size it was.
 *   "award points server-side"
 *        → `leaderboard_standings()` in migration 0011 is the only thing that computes a
 *          published score, it is `security definer`, and no table in the schema has a
 *          points column for a client to assert. This module is the client's MIRROR of that
 *          function, used to tell a player what an entry just earned — the same relationship
 *          `herbdex-reducer.ts` has with `herbdex-action`, and `leaderboard-schema.test.ts`
 *          holds the two sets of numbers equal.
 *   "track the source of awarded points so scores can be audited"
 *        → the sources ARE the rows. `leaderboard_standings` returns the three subtotals
 *          separately, and every one of them can be recomputed from records the player can
 *          download in their own account export.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * NOTHING HERE IS VERIFIED, AND THE BOARD MUST NEVER SAY OTHERWISE.
 *
 * Plantdex progression is self-declared at every stage and deliberately so — see CLAUDE.md,
 * "Progression is self-declared": `DiscoverPanel` records a find from two taps and no camera,
 * and an identifier's suggestion is a suggestion. The brief for this board asked that an AI
 * identification not be treated as proof somebody physically found a species, and that
 * provisional points be distinguished from verified ones. There is no verification mechanism
 * in this product, so the honest answer is that EVERY point here is provisional. That is a
 * fact the UI states in words; `PROVISIONAL` below exists so the type system carries it too,
 * and so that a future verified tier has to be added rather than assumed.
 *
 * `photoBackedEntries` is the nearest thing to evidence the schema holds: a journal entry
 * with a photograph in it. It is reported as a separate count and never folded into the
 * score, because a photograph is better evidence than a tap and still not proof.
 */

/**
 * What each kind of record is worth.
 *
 * SIZED AGAINST EACH OTHER RATHER THAN AGAINST XP, which runs on a different scale (a
 * discovery pays 100-500 XP by rarity). These are flat: the board measures field work, and
 * finding a Rare plant is not three times the field work of finding a Common one — it is
 * one plant found, once. Rarity already changes what a find is worth in the game.
 */
export const LEADERBOARD_POINTS = {
  /** The first — and only — record of a species in this player's collection. */
  discovery: 50,
  /** The first qualifying field journal entry for a species already discovered. */
  journalEntry: 15,
  /**
   * A completed Field Research challenge: a Collection challenge or a seasonal ladder.
   *
   * WHICH "QUEST" THIS IS, BECAUSE THE WORD IS OVERLOADED HERE. The brief asked for points
   * for "completing a regional quest". Plantdex has two things by that name and only one of
   * them is a completion anything records:
   *
   *   The REGIONAL QUEST BOARD (`quest-board.ts`) is explicitly a lens — "it awards nothing,
   *   stores nothing and gates nothing", recomputed per render from a seeded RNG over
   *   (region, season, year). Postgres cannot reproduce that seed, so a server-side score
   *   cannot see it, and the only way to make it scorable would be to have a client assert
   *   that it finished one. That is the exact write path this whole module exists to avoid.
   *
   *   FIELD RESEARCH challenges (`research.ts`) ARE recorded, in `research_completions`, and
   *   they are RECOMPUTED SERVER-SIDE by `herbdex-action` from the player's own sighting and
   *   discovery rows. They are the completion the database can actually stand behind.
   *
   * So the hundred points go to the second. Daily tasks are deliberately excluded — a daily
   * is a nudge worth 25 XP, and paying 100 board points for one would make the board a
   * measure of how often somebody opened the app.
   */
  challenge: 100,
} as const;

export type PointSource = keyof typeof LEADERBOARD_POINTS;

/**
 * Qualifying journal entries that can earn points in one day.
 *
 * WHAT THE CAP IS ACTUALLY FOR. The species rules above already bound the journal term hard:
 * one payment per species, 45 printed cards, so a player's journal points can never exceed
 * 675 however many entries they write. The cap is not there to stop the total running away —
 * it is there so that the board cannot be climbed in an afternoon by somebody who sits down
 * and logs a line against every card they already hold. At four a day the journal term takes
 * at least a dozen days of real returns to the field, which is the pace the thing is meant to
 * measure.
 *
 * AN ENTRY PAST THE CAP IS KEPT AND NOT PAID. It is still in the journal, still visible, and
 * still counts toward mastery; it simply earns no board points, then or later. The
 * alternative — carrying unpaid species forward to a future day with room — is fairer and
 * needs the score to remember which species have been paid, which is a ledger, which is the
 * design this module is built to avoid. The cap is generous enough that the trade is cheap,
 * and the explainer on the board says plainly which rule is in force.
 */
export const DAILY_JOURNAL_POINT_CAP = 4;

/**
 * The shortest note that counts as an observation, in characters after trimming.
 *
 * MEASURED AGAINST THE FORM'S OWN PLACEHOLDER, which reads "Growing along the sunny edge of a
 * field. Several plants flowering." — 68 characters. Twenty-four is comfortably under one
 * real sentence, so the floor refuses "nice" and "found it" without ever refusing somebody
 * who actually wrote something.
 *
 * IT IS NOT A SPAM FILTER AND MUST NOT BE MISTAKEN FOR ONE. Twenty-four characters of
 * nonsense clears it, and no character-counting rule will ever not be clearable. What
 * actually bounds a spammer is the pair of structural limits above — one payment per species,
 * four a day — and those do not depend on being able to tell a real note from a fake one.
 * This floor only keeps an empty form from paying.
 */
export const MIN_QUALIFYING_NOTE = 24;

/**
 * Task-id prefixes whose completion pays `challenge` points.
 *
 * Field Research ids are namespaced by kind — `collection:backyard`, `seasonal:spring`,
 * `daily:<template>:<herb>` — which is what lets the SQL in 0011 select the right ones with
 * a prefix match and no second table. `leaderboard-schema.test.ts` checks these against the
 * ids `research.ts` really produces, so a renamed namespace fails here rather than silently
 * zeroing everybody's challenge points.
 */
export const SCORING_TASK_PREFIXES = ['collection:', 'seasonal:'] as const;

/**
 * Every point in this product is provisional. There is no second value yet, and that is the
 * point: a `verified` tier has to be built and named, not assumed into existence by a board
 * that quietly implies its numbers were checked.
 */
export const PROVISIONAL = 'provisional' as const;

export interface LeaderboardCounts {
  /** Species in the player's collection. One row each, by primary key. */
  discoveries: number;
  /** Species with a paid qualifying journal entry. */
  journalEntries: number;
  /** Completed Collection and seasonal Field Research challenges. */
  challenges: number;
}

export interface LeaderboardScore extends LeaderboardCounts {
  points: number;
  discoveryPoints: number;
  journalPoints: number;
  challengePoints: number;
  verification: typeof PROVISIONAL;
}

/** The score for a set of counts. The whole arithmetic of the board, in one function. */
export function scoreFromCounts(counts: LeaderboardCounts): LeaderboardScore {
  const discoveryPoints = counts.discoveries * LEADERBOARD_POINTS.discovery;
  const journalPoints = counts.journalEntries * LEADERBOARD_POINTS.journalEntry;
  const challengePoints = counts.challenges * LEADERBOARD_POINTS.challenge;
  return {
    ...counts,
    discoveryPoints,
    journalPoints,
    challengePoints,
    points: discoveryPoints + journalPoints + challengePoints,
    verification: PROVISIONAL,
  };
}

/** Does this Field Research task id pay challenge points? */
export function paysChallengePoints(taskId: string): boolean {
  return SCORING_TASK_PREFIXES.some((prefix) => taskId.startsWith(prefix));
}

/**
 * Does this entry carry an observation, rather than being an empty form?
 *
 * A PHOTOGRAPH OR A SENTENCE. Either one is a thing somebody did at the plant; a date and a
 * growth-stage dropdown are two taps and can be done from a sofa. Growth stage deliberately
 * does NOT qualify on its own for exactly that reason, though it remains the most useful
 * field in the journal and nothing here discourages filling it in.
 *
 * The entry must also be for a species the player has DISCOVERED. A journal entry is a return
 * visit to something already in the collection — that is what the field log on a plant page
 * is — so an entry against an undiscovered card is a record with nothing behind it.
 */
export function isQualifyingEntry(
  sighting: Pick<Sighting, 'herbId' | 'notes' | 'photoId'>,
  discoveredIds: ReadonlySet<string>,
): boolean {
  if (!discoveredIds.has(sighting.herbId)) return false;
  if (sighting.photoId) return true;
  return (sighting.notes ?? '').trim().length >= MIN_QUALIFYING_NOTE;
}

/** A sighting as this module needs to see it. Keeps the mirror honest about its inputs. */
type ScorableSighting = Pick<Sighting, 'herbId' | 'notes' | 'photoId' | 'createdAt'>;

/**
 * Which species have a PAID qualifying journal entry, in the order they were paid.
 *
 * THE CLIENT MIRROR OF THE SQL, and it has to produce the same answer or the reward shown
 * when somebody saves an entry will not match the score the board publishes a moment later.
 * The two steps are the two CTEs in `leaderboard_standings`:
 *
 *   1. For each species, the EARLIEST qualifying entry. (`min(created_at) group by herb_id`)
 *   2. Within each UTC day, the first `DAILY_JOURNAL_POINT_CAP` of those. (`row_number()
 *      over (partition by user_id, day order by first_at)`)
 *
 * UTC, NOT LOCAL. The database has no idea where a player is standing, and a cap that moved
 * with a timezone could be reset by changing one. It is the one place in this app that does
 * not use `localDateKey` — `MySightings` is right to pre-fill the local date, because that is
 * a date a person reads, and this is a window a server has to agree about. A player near a
 * date boundary may see their cap roll over at an odd local hour; the explainer says so.
 *
 * Ties are broken by herb id so that two entries saved in the same millisecond rank the same
 * way here and in Postgres, which orders by `(first_at, herb_id)` for the same reason.
 */
export function paidJournalSpecies(
  sightings: readonly ScorableSighting[],
  discoveredIds: ReadonlySet<string>,
): string[] {
  const firstQualifying = new Map<string, string>();
  for (const sighting of sightings) {
    if (!isQualifyingEntry(sighting, discoveredIds)) continue;
    const held = firstQualifying.get(sighting.herbId);
    if (held === undefined || sighting.createdAt < held) {
      firstQualifying.set(sighting.herbId, sighting.createdAt);
    }
  }

  const ordered = [...firstQualifying.entries()].sort(
    ([herbA, atA], [herbB, atB]) => atA.localeCompare(atB) || herbA.localeCompare(herbB),
  );

  const perDay = new Map<string, number>();
  const paid: string[] = [];
  for (const [herbId, at] of ordered) {
    const day = utcDayOf(at);
    const used = perDay.get(day) ?? 0;
    if (used >= DAILY_JOURNAL_POINT_CAP) continue;
    perDay.set(day, used + 1);
    paid.push(herbId);
  }
  return paid;
}

/**
 * The UTC date an ISO timestamp falls on.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ONE PLACE IN THIS APP THAT DELIBERATELY NAMES A UTC DAY, and it is spelled out with
 * `getUTCFullYear()` rather than `toISOString().slice(0, 10)` for two reasons.
 *
 * The first is that `local-date.test.ts` bans the slice outright, repo-wide, and is right to:
 * every OTHER calendar day in Plantdex is a day a PERSON reads — the date on a sighting, the
 * key for today's daily board — and taking those from UTC is the bug that pre-filled
 * tomorrow's date for anyone west of Greenwich. A guard with a quiet exception is a guard
 * that grows more of them.
 *
 * The second is that these getters SAY what the slice only implies. Somebody reading
 * `getUTCDate()` can see the choice was made; somebody reading `.slice(0, 10)` cannot tell it
 * from the mistake. The cap has to be a window everybody on the board shares, and a player
 * must not be able to widen it by changing the clock on their phone — so UTC is the answer
 * here, and saying so in the code is the point.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * An unparseable timestamp falls back to its own leading characters rather than throwing: a
 * malformed row should cost that row its slot in the cap, not take down the whole score.
 */
function utcDayOf(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso.slice(0, 10);
  const month = String(at.getUTCMonth() + 1).padStart(2, '0');
  const day = String(at.getUTCDate()).padStart(2, '0');
  return `${at.getUTCFullYear()}-${month}-${day}`;
}

/**
 * What a journal entry that has just been saved earned, if anything.
 *
 * Returns the points and the reason, so the panel can say something true in every case
 * rather than celebrating unconditionally — a reward animation that fires when nothing was
 * awarded is how a player learns not to trust the next one.
 *
 * `sightings` must already INCLUDE the new entry: this asks "given everything now recorded,
 * is this the entry that paid for this species", which is the only question whose answer
 * matches the board.
 */
export type JournalAward =
  | { awarded: true; points: number }
  | { awarded: false; reason: 'not-qualifying' | 'species-already-paid' | 'daily-cap' };

export function awardForEntry(
  entry: ScorableSighting,
  sightings: readonly ScorableSighting[],
  discoveredIds: ReadonlySet<string>,
): JournalAward {
  if (!isQualifyingEntry(entry, discoveredIds)) {
    return { awarded: false, reason: 'not-qualifying' };
  }

  const paid = paidJournalSpecies(sightings, discoveredIds);
  if (!paid.includes(entry.herbId)) {
    return { awarded: false, reason: 'daily-cap' };
  }

  /*
   * The species is paid — but by WHICH entry? If an earlier qualifying entry for the same
   * species exists, that one is what the board is counting and this one added nothing. This
   * is the test that makes a second visit, an edit, or a delete-and-relog pay zero.
   */
  const earlier = sightings.some(
    (other) =>
      other !== entry &&
      other.herbId === entry.herbId &&
      isQualifyingEntry(other, discoveredIds) &&
      other.createdAt < entry.createdAt,
  );
  if (earlier) return { awarded: false, reason: 'species-already-paid' };

  return { awarded: true, points: LEADERBOARD_POINTS.journalEntry };
}

/**
 * A player's own score, from the records this device already holds.
 *
 * THE SAME ARITHMETIC AS THE BOARD, FROM THE SAME SHAPE OF DATA. `leaderboard_standings()`
 * reads three tables; this reads the two client stores that mirror them. It is what lets the
 * save panel say what an entry earned and what the running total now is without a round trip
 * — and what makes that number the one the board will show, rather than a second opinion.
 *
 * It works SIGNED OUT TOO, which is deliberate: a player with no account has a field score,
 * they are simply not listed anywhere. Telling them what it is, is also the honest way to
 * explain what joining would publish.
 */
export function scoreFromRecords(
  state: HerbdexState,
  sightings: readonly ScorableSighting[],
): LeaderboardScore {
  const discoveredIds = new Set(Object.keys(state.discoveries));
  return scoreFromCounts({
    discoveries: discoveredIds.size,
    journalEntries: paidJournalSpecies(sightings, discoveredIds).length,
    challenges: Object.keys(state.research).filter(paysChallengePoints).length,
  });
}

/**
 * The scoring rules, as a player reads them.
 *
 * The board renders this list rather than restating the numbers in prose, for the same
 * reason the cosmetics cabinet prints each frame's own `condition` sentence: a UI free to
 * describe a rule differently from the code that enforces it will eventually do so.
 */
export const SCORING_RULES: readonly { points: number; what: string; note: string }[] = [
  {
    points: LEADERBOARD_POINTS.discovery,
    what: 'A species you have not recorded before',
    note: 'Once per species. Finding the same plant again adds nothing — your collection already holds it.',
  },
  {
    points: LEADERBOARD_POINTS.journalEntry,
    what: 'Your first real Field Journal entry for that species',
    note: `A photo, or a note of at least ${MIN_QUALIFYING_NOTE} characters. Up to ${DAILY_JOURNAL_POINT_CAP} a day. Editing an entry, or logging a second one for the same plant, adds nothing.`,
  },
  {
    points: LEADERBOARD_POINTS.challenge,
    what: 'A completed Field Research challenge',
    note: 'Collection challenges and seasonal ladders. Daily tasks pay XP, not board points.',
  },
];
