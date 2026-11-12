import type { Standing } from './remote-leaderboard';

/**
 * Pure helpers for how the Field Board is laid out. Nothing here ranks anything: the order and
 * every standing number come from the server's `leaderboard_standings()` (rank by points, equal
 * points share a standing), and these functions only slice, find and label what it returned.
 */

/** Everything the page fetches in one call; the function itself caps at 200. */
export const BOARD_FETCH_LIMIT = 200;
/** Rows revealed per "Show more" tap, after the podium. */
export const BOARD_PAGE_SIZE = 25;

export interface PodiumSlot {
  place: 1 | 2 | 3;
  row: Standing;
}

/**
 * The first three rows as podium places, in display order: second, first, third.
 *
 * Places come from the ROW, not the index: three players tied on points all hold standing 1 and
 * all stand on the first step. The slots are the first three rows the server returned, so a tie
 * never pushes anybody off the podium or invents a fourth step.
 */
export function podiumOf(rows: readonly Standing[]): PodiumSlot[] {
  const top = rows.slice(0, 3).map((row) => ({
    place: Math.min(3, Math.max(1, row.standing)) as 1 | 2 | 3,
    row,
  }));
  const byPlace = [...top].sort((a, b) => a.place - b.place);
  if (byPlace.length === 3 && byPlace.every((slot) => slot.place === 1)) return byPlace;
  // Visual order: the middle step is the tallest.
  const first = byPlace[0];
  const rest = byPlace.slice(1);
  if (!first) return [];
  if (rest.length === 0) return [first];
  return [rest[0]!, first, ...rest.slice(1)];
}

export function beyondPodium(rows: readonly Standing[], shown: number): Standing[] {
  return rows.slice(3, 3 + Math.max(0, shown));
}

export function selfOf(rows: readonly Standing[]): Standing | undefined {
  return rows.find((row) => row.isSelf);
}

export function remainingAfter(rows: readonly Standing[], shown: number): number {
  return Math.max(0, rows.length - 3 - Math.max(0, shown));
}

/**
 * Where the signed-in player sits, in words, for the strip above the list.
 *
 * `outsideFetched` is true only when the board came back full and the player is not in it: the
 * function returns at most its limit, so absence from a SHORTER list means not listed in this
 * scope, never "far down".
 */
export function placeNote(
  rows: readonly Standing[],
  listed: boolean,
  fetchedFull: boolean,
):
  | { kind: 'place'; standing: number; points: number }
  | { kind: 'outside' }
  | { kind: 'elsewhere' }
  | { kind: 'unlisted' } {
  const me = selfOf(rows);
  if (me) return { kind: 'place', standing: me.standing, points: me.points };
  if (!listed) return { kind: 'unlisted' };
  return fetchedFull ? { kind: 'outside' } : { kind: 'elsewhere' };
}

export function isFull(rows: readonly Standing[]): boolean {
  return rows.length >= BOARD_FETCH_LIMIT;
}

/**
 * A readable sentence for a failed load. The raw message from the database client names
 * functions and codes, which is no use to a player, and the most likely cause today is the
 * leaderboard migration not being applied to the project at all.
 */
export function friendlyBoardError(message: string | null | undefined): string {
  const text = (message ?? '').toLowerCase();
  if (
    text.includes('could not find the function') ||
    text.includes('leaderboard_standings') ||
    text.includes('does not exist') ||
    text.includes('pgrst202') ||
    text.includes('schema cache')
  ) {
    return 'The Field Board is not switched on for this project yet. Your collection is unaffected.';
  }
  if (text.includes('fetch') || text.includes('network') || text.includes('failed to')) {
    return 'Could not reach the board. Check your connection and try again.';
  }
  return 'The board could not load just now. Try again in a moment.';
}

/** "3 species · 2 entries", with the photo count named as reported rather than scored. */
export function countsLine(
  row: Pick<Standing, 'discoveries' | 'journalEntries' | 'photoBackedEntries'>,
) {
  const species = `${row.discoveries} species`;
  const entries = `${row.journalEntries} ${row.journalEntries === 1 ? 'entry' : 'entries'}`;
  const photos = row.photoBackedEntries > 0 ? ` · ${row.photoBackedEntries} with photo` : '';
  return `${species} · ${entries}${photos}`;
}
