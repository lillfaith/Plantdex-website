import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  DAILY_JOURNAL_POINT_CAP,
  LEADERBOARD_POINTS,
  MIN_QUALIFYING_NOTE,
  SCORING_TASK_PREFIXES,
  paysChallengePoints,
} from './leaderboard';
import { STANDING_TASKS, buildWorld, pickDailyTasks } from './research';
import { emptyState } from './herbdex-state';

/**
 * THE SQL AND THE CLIENT MUST AGREE, AND NOTHING ELSE CHECKS THAT THEY DO.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `leaderboard.ts` is the client's mirror of `leaderboard_standings()` — it exists so a
 * player can be told what the entry they just saved earned, before the board is next read.
 * That is the same relationship `herbdex-reducer.ts` has with `herbdex-action`, with one
 * important difference: the reducer is COPIED to the edge function by
 * `npm run sync:edge-shared`, so the two cannot drift. This one is hand-written SQL, so they
 * can.
 *
 * A drift here is silent and ugly in exactly the way this repository keeps warning about: the
 * save panel says "+15" and the board, computed from a stale constant, disagrees — and the
 * player concludes the score is made up. So every number the SQL hard-codes is read back out
 * of the migration here and compared with the constant it was copied from.
 *
 * WHY THE SQL HARD-CODES THEM AT ALL. A `language sql` function cannot import, and putting
 * the constants in a settings table would make the score depend on a row somebody could
 * change — which is the write path the whole design exists to avoid. Literals plus this test
 * is the honest version: the values are fixed in the schema, and changing one without
 * changing the other fails the build.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SQL = readFileSync(
  join(import.meta.dirname, '..', '..', 'supabase', 'migrations', '0011_leaderboard.sql'),
  'utf8',
);

/**
 * The migration with its `--` comments removed.
 *
 * Needed because this file argues its own case in prose and therefore NAMES the things it
 * bans — `sightings.region`, a points column, a daily namespace. A check run against the raw
 * text fails on the explanation rather than on the SQL.
 */
const STATEMENTS = SQL.replace(/--[^\n]*/g, '');

describe('the migration and the client agree on every number', () => {
  it('was read at all — an empty file would pass every check below', () => {
    expect(SQL).toContain('create or replace function public.leaderboard_standings');
    expect(SQL.length).toBeGreaterThan(2000);
  });

  it('multiplies by the same point values', () => {
    for (const [source, value] of Object.entries(LEADERBOARD_POINTS)) {
      expect(SQL, `the SQL does not multiply by ${value} for ${source}`).toMatch(
        new RegExp(`\\* ${value}\\)`),
      );
    }
  });

  it('uses the same minimum note length', () => {
    expect(SQL).toMatch(new RegExp(`>= ${MIN_QUALIFYING_NOTE}\\b`));
  });

  it('uses the same daily cap', () => {
    expect(SQL).toMatch(new RegExp(`rank_in_day <= ${DAILY_JOURNAL_POINT_CAP}\\b`));
  });

  it('selects the same Field Research namespaces', () => {
    for (const prefix of SCORING_TASK_PREFIXES) {
      expect(SQL, `the SQL does not pay ${prefix}`).toContain(`task_id like '${prefix}%'`);
    }
    // And no others — a `daily:%` here would pay 100 points for a 25 XP nudge.
    const matched = [...SQL.matchAll(/task_id like '([a-z]+:)%'/g)].map(([, prefix]) => prefix!);
    expect([...new Set(matched)].sort()).toEqual([...SCORING_TASK_PREFIXES].sort());
  });

  it('counts a journal entry only for a species the player has discovered', () => {
    // The join is the SQL half of `isQualifyingEntry`'s discovery check. Without it the
    // journal term would pay for plants nobody claimed to have found.
    expect(SQL).toMatch(/join public\.discoveries d\s+on d\.user_id = s\.user_id and d\.herb_id = s\.herb_id/);
  });

  it('partitions the daily cap in UTC', () => {
    // A cap measured in local time is a cap a player can reset by changing their clock.
    expect(SQL).toContain("(first_at at time zone 'UTC')::date");
  });
});

/**
 * THE PREFIXES HAVE TO MATCH IDS THAT REALLY EXIST.
 *
 * `SCORING_TASK_PREFIXES` is a string match against `research_completions.task_id`. Rename a
 * namespace in `research.ts` and both the SQL and the client keep working, silently, paying
 * nobody — a regression with no error anywhere. So the prefixes are checked against the ids
 * the task registry actually produces.
 */
describe('the scoring prefixes match the Field Research registry', () => {
  const world = buildWorld(emptyState(), {});
  /*
   * The whole registry a player can ever complete: the standing Collection and seasonal
   * tasks, plus a day's dailies. Dailies are drawn per date, so one date's board is enough —
   * every id they can produce carries the same `daily:` namespace, which is the thing under
   * test.
   */
  const tasks = [...STANDING_TASKS, ...pickDailyTasks(world, '2026-05-04', new Set())];

  it('found tasks of every kind to check against', () => {
    const kinds = new Set(tasks.map((task) => task.kind));
    expect(kinds.has('collection')).toBe(true);
    expect(kinds.has('seasonal')).toBe(true);
    expect(kinds.has('daily')).toBe(true);
  });

  it('pays every Collection and seasonal task, and no daily', () => {
    for (const task of tasks) {
      const shouldPay = task.kind === 'collection' || task.kind === 'seasonal';
      expect(
        paysChallengePoints(task.id),
        `${task.id} (${task.kind}) is ${shouldPay ? 'not ' : 'wrongly '}paid`,
      ).toBe(shouldPay);
    }
  });
});

/**
 * AND THE TABLE STAYS A DECLARATION, NOT A SCOREBOARD.
 *
 * The one failure that would undo this whole design is somebody adding a cached `points`
 * column "because the board feels slow" — the same column `profile-schema.test.ts` bans from
 * `profiles`, for the same reason, and the one a client could then assert.
 */
describe('the participants table holds no score', () => {
  const columns = (() => {
    const body =
      SQL.split(/create table if not exists public\.leaderboard_participants\s*\(/)[1] ?? '';
    const found: string[] = [];
    for (const line of body.split('\n')) {
      if (/^\s*\)\s*;/.test(line)) break;
      const match = /^\s{2}([a-z_]+)\s+(uuid|text|timestamptz|integer|boolean|numeric|jsonb)/.exec(
        line,
      );
      if (match) found.push(match[1]!);
    }
    return found;
  })();

  it('was parsed at all', () => {
    expect(columns).toContain('user_id');
  });

  it('declares only the membership itself', () => {
    expect([...columns].sort()).toEqual(['joined_at', 'region_id', 'user_id']);
  });

  it('holds no derived or competitive value', () => {
    for (const word of ['points', 'score', 'rank', 'standing', 'xp', 'level', 'streak']) {
      expect(columns, `the table holds a ${word} column`).not.toContain(word);
    }
  });

  it('stores a region id and never the journal’s free-text place', () => {
    /*
     * `sightings.region` is a sentence a player types and may name the exact patch a plant is
     * growing in. Publishing it was explicitly out of scope, and the shape check is what stops
     * one being stored here by a hand-written request.
     */
    expect(SQL).toMatch(/region_id text check \(region_id is null or region_id ~ /);
    // Statements only: this file DISCUSSES `sightings.region` at length and must be free to.
    expect(STATEMENTS, 'the standings read the journal’s free-text place').not.toContain(
      's.region',
    );
  });
});

/**
 * THE DEFINER FUNCTION'S OWN GUARDS.
 *
 * It is the only statement in the schema that reads across accounts, so the two things that
 * make that safe are checked here rather than left to review: it cannot be run by an
 * anonymous caller, and it cannot be redirected at another schema's tables.
 */
describe('the standings function is locked down', () => {
  it('pins its search path', () => {
    // Without this, a caller able to create objects on an earlier search-path schema can
    // shadow `discoveries` and have a definer function read their table with owner rights.
    expect(SQL).toMatch(/security definer\s+set search_path = public/);
  });

  it('is executable by signed-in players only', () => {
    expect(SQL).toMatch(/revoke all on function public\.leaderboard_standings\(text, integer\) from public/);
    expect(SQL).toMatch(/grant execute on function public\.leaderboard_standings\(text, integer\) to authenticated/);
  });

  it('returns nothing that identifies a person or a place', () => {
    const signature = /returns table \(([\s\S]*?)\)\s*language sql/.exec(SQL)?.[1] ?? '';
    expect(signature.length).toBeGreaterThan(0);
    for (const leak of ['user_id', 'email', 'notes', 'photo_path', 'herb_id', 'latitude']) {
      expect(signature, `the standings return ${leak}`).not.toContain(leak);
    }
    // `is_self` is the only per-caller fact, and it is a boolean about the asker's own row.
    expect(signature).toContain('is_self boolean');
  });

  it('writes nothing', () => {
    const body = /as \$\$([\s\S]*?)\$\$;/.exec(SQL)?.[1] ?? '';
    expect(body.length).toBeGreaterThan(0);
    for (const statement of ['insert into', 'update ', 'delete from']) {
      expect(body.toLowerCase(), `the standings function performs an ${statement}`).not.toContain(
        statement,
      );
    }
    expect(SQL).toMatch(/language sql\s+stable/);
  });
});
