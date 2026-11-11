'use client';

import { supabase } from './supabase-client';
import { PROVISIONAL, type LeaderboardScore } from './leaderboard';
import { regionById } from './regions';

/**
 * Reading the board, and asking to be on it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THERE IS NO WRITE PATH FOR A SCORE IN THIS FILE, AND THERE CANNOT BE ONE.
 *
 * Two operations exist: join (insert a row saying "list me") and leave (delete it). Every
 * number on the board comes back from `leaderboard_standings()`, a `security definer`
 * function that computes it from the player's own discovery, sighting and research rows.
 * Nothing here sends a point total, and no column in the schema would accept one — see
 * `supabase/migrations/0011_leaderboard.sql`.
 *
 * NO CACHE, UNLIKE EVERY OTHER REMOTE MODULE HERE. `remote-sightings.ts` and
 * `remote-player-profile.ts` cache because they serve the player's OWN state to a dozen
 * components that must all agree. A standings table is other people's state, it is stale the
 * moment it arrives, and it is read by exactly one page. A cache would buy nothing and would
 * need the same `loadedForUser` guard those files carry to stop one account seeing another's
 * view.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface Standing extends Omit<LeaderboardScore, 'verification'> {
  /** The position shown. Equal scores share it — see the `rank()` argument in 0011. */
  standing: number;
  /** What the player called themselves, or null if they never set a name. */
  displayName: string | null;
  /** A launched region id, resolved against `regions.ts`, or null. */
  regionId: string | null;
  /** Journal species whose entry carried a photograph. Reported, never scored. */
  photoBackedEntries: number;
  /** True for the row belonging to whoever is asking. */
  isSelf: boolean;
  verification: typeof PROVISIONAL;
}

/** One row of the standings, as Postgres names its columns. */
interface StandingRow {
  standing: number | string;
  display_name: string | null;
  region_id: string | null;
  points: number;
  discovery_points: number;
  journal_points: number;
  challenge_points: number;
  discoveries: number;
  journal_entries: number;
  challenges: number;
  photo_backed_entries: number;
  is_self: boolean;
}

/**
 * VALIDATED ON READ, NOT TRUSTED ON ARRIVAL — the same rule `resolveProfile` follows.
 *
 * A region id is written by a client under RLS, so a player can store any string that passes
 * the column's shape check. Resolving it here means a stale or invented id degrades to "no
 * region" instead of printing something nobody can place, and it is also what keeps the
 * board from displaying a value this build does not recognise.
 */
function rowToStanding(row: StandingRow): Standing {
  return {
    standing: Number(row.standing),
    displayName: row.display_name,
    regionId: regionById(row.region_id)?.id ?? null,
    points: row.points,
    discoveryPoints: row.discovery_points,
    journalPoints: row.journal_points,
    challengePoints: row.challenge_points,
    discoveries: row.discoveries,
    journalEntries: row.journal_entries,
    challenges: row.challenges,
    photoBackedEntries: row.photo_backed_entries,
    isSelf: row.is_self,
    verification: PROVISIONAL,
  };
}

/** The standings, globally or for one region. Signed in only — the function refuses others. */
export async function fetchStandings(options?: {
  regionId?: string | null;
  limit?: number;
}): Promise<Standing[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('leaderboard_standings', {
    p_region: options?.regionId ?? null,
    p_limit: options?.limit ?? 50,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as StandingRow[]).map(rowToStanding);
}

/** Is this player listed, and where? `null` means they have not joined. */
export async function fetchMembership(
  userId: string,
): Promise<{ regionId: string | null } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('leaderboard_participants')
    .select('region_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { regionId: regionById((data as { region_id: string | null }).region_id)?.id ?? null };
}

/**
 * Ask to be listed, or move which region you are listed in.
 *
 * DELETE THEN INSERT, BECAUSE THERE IS NO UPDATE POLICY. Every progression and history table
 * in this schema is write-once and `profiles` is the single deliberate exception
 * (`profile-schema.test.ts` fails if a second table grants an update). Changing region is
 * rare enough that two statements is the right price for keeping that rule intact.
 *
 * The delete is unconditional rather than conditional on already being a member: it costs one
 * round trip, it is a no-op when there is no row, and it means this function has one code
 * path instead of two that could disagree about what "already joined" meant.
 */
export async function joinLeaderboard(userId: string, regionId: string | null): Promise<void> {
  if (!supabase) throw new Error('Accounts are not configured.');
  const region = regionById(regionId)?.id ?? null;

  const { error: cleared } = await supabase
    .from('leaderboard_participants')
    .delete()
    .eq('user_id', userId);
  if (cleared) throw new Error(cleared.message);

  const { error } = await supabase
    .from('leaderboard_participants')
    .insert({ user_id: userId, region_id: region });
  if (error) throw new Error(error.message);
}

/** Stop being listed. The row is removed; nothing about the collection changes. */
export async function leaveLeaderboard(userId: string): Promise<void> {
  if (!supabase) throw new Error('Accounts are not configured.');
  const { error } = await supabase
    .from('leaderboard_participants')
    .delete()
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
