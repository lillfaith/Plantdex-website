import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ACHIEVEMENTS } from './achievements';
import { CATALOGUE } from './catalogue';
import { RESERVED_NAME_WORDS, UNSAFE_NAME_CHARS, isSafeDisplayName, resolveProfile } from './player-profile';
import { STANDING_TASKS, researchTaskById } from './research';

/**
 * MIGRATION 0013, PINNED. A signed-in client could once insert invented species and invented
 * challenges straight into the progress tables and the Field Board paid for each. These tests
 * read the migration and the function that replaced the client writes, and fail when a list
 * drifts from the code it mirrors or when a write path is reopened.
 */
const root = join(import.meta.dirname, '..', '..');
const SQL = readFileSync(join(root, 'supabase', 'migrations', '0013_leaderboard_integrity.sql'), 'utf8');
const OLD = readFileSync(join(root, 'supabase', 'migrations', '0011_leaderboard.sql'), 'utf8');
const ACTION = readFileSync(join(root, 'supabase', 'functions', 'herbdex-action', 'index.ts'), 'utf8');
const IMPORT = readFileSync(join(root, 'src', 'lib', 'import-local-progress.ts'), 'utf8');

function listOf(fn: string): string[] {
  const start = SQL.indexOf(`function public.${fn}(`);
  const body = SQL.slice(start, SQL.indexOf('$$;', start));
  return [...body.matchAll(/^\s{4}'([^']+)',?$/gm)].map((m) => m[1] ?? '');
}
const standings = SQL.slice(SQL.indexOf('create or replace function public.leaderboard_standings('));

describe('the id lists in the database are the lists in the code', () => {
  it('every catalogue card, and nothing else, is a valid herb id', () => {
    expect(listOf('is_catalogue_herb')).toEqual(CATALOGUE.map((h) => h.id));
  });
  it('every standing research task, and nothing else, scores on the board', () => {
    expect(listOf('is_scoring_task')).toEqual(STANDING_TASKS.map((t) => t.id));
  });
  it('every achievement, and nothing else, is a valid achievement id', () => {
    expect(listOf('is_achievement')).toEqual(ACHIEVEMENTS.map((a) => a.id));
  });
  it('a daily task id has the shape the database accepts', () => {
    const shape = /^daily:(find|learn|revisit|master):[a-z0-9-]+$/;
    expect(SQL).toContain("'^daily:(find|learn|revisit|master):[a-z0-9-]+$'");
    for (const kind of ['find', 'learn', 'revisit', 'master']) {
      const id = `daily:${kind}:${CATALOGUE[0]!.id}`;
      expect(id).toMatch(shape);
      expect(researchTaskById(id)?.id).toBe(id);
    }
  });
});

describe('new rows must be real, and existing rows are never touched', () => {
  it.each([
    ['discoveries', 'is_catalogue_herb(herb_id)'],
    ['learned', 'is_catalogue_herb(herb_id)'],
    ['mastered', 'is_catalogue_herb(herb_id)'],
    ['sightings', 'is_catalogue_herb(herb_id)'],
    ['research_completions', 'is_research_task(task_id)'],
    ['unlocked_achievements', 'is_achievement(achievement_id)'],
    ['profiles', 'is_safe_display_name(display_name)'],
  ])('%s is constrained by %s', (table, rule) => {
    const line = SQL.split('\n').find((l) => l.startsWith(`alter table public.${table} add constraint`) && l.includes(rule));
    expect(line, `${table} has no ${rule} constraint`).toBeDefined();
    expect(line).toMatch(/not valid;$/);
  });
  it('deletes, rewrites and validates nothing: legitimate history is preserved', () => {
    const code = SQL.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n');
    expect(code).not.toMatch(/delete\s+from|truncate|validate\s+constraint|drop\s+table|update\s+public\./i);
  });
});

describe('derived records have no client write path', () => {
  it('the client insert policies on mastered and research_completions are dropped', () => {
    expect(SQL).toContain('drop policy if exists "own mastered insert" on public.mastered;');
    expect(SQL).toContain('drop policy if exists "own research completions insert" on public.research_completions;');
    expect(SQL).not.toMatch(/create policy[^;]*(mastered|research_completions)[^;]*for (insert|update|all)/i);
  });
  it('herbdex-action writes both with the service role, and never with the caller session', () => {
    expect(ACTION).toMatch(/admin\s*\.from\('mastered'\)/);
    expect(ACTION).toMatch(/admin\s*\.from\('research_completions'\)/);
    expect(ACTION).not.toMatch(/supabase\s*\.from\('mastered'\)\s*\.upsert/);
    expect(ACTION).not.toMatch(/supabase\s*\.from\('research_completions'\)\s*\.upsert/);
  });
  it('it still identifies the caller from their own token and reads through their session', () => {
    expect(ACTION).toMatch(/supabase\.auth\.getUser\(\)/);
    expect(ACTION).toMatch(/supabase\.from\('sightings'\)\.select/);
    expect(ACTION).not.toMatch(/body\.userId|body\.user_id/);
  });
  it('it refuses rather than pretending when it cannot write, and never logs the key', () => {
    expect(ACTION).toMatch(/needsDerivedWrite && !SUPABASE_SERVICE_ROLE_KEY/);
    expect(ACTION).not.toMatch(/console\.\w+\([^)]*SERVICE_ROLE/);
  });
  it('a request cannot offer an unbounded list of daily tasks', () => {
    expect(ACTION).toMatch(/slice\(0, MAX_DAILY_TASK_IDS\)/);
  });
  it('the local import no longer asserts mastery or research; no service key is in client code', () => {
    expect(IMPORT).not.toMatch(/upsertTimestampRows\('mastered'|upsertTimestampRows\('research_completions'/);
    expect(IMPORT).not.toMatch(/SERVICE_ROLE/);
  });
});

describe('journal scoring cannot be backdated or backed by a made-up photograph', () => {
  it('a sighting takes the server clock on insert', () => {
    expect(SQL).toMatch(/new\.created_at := pg_catalog\.now\(\);/);
    expect(SQL).toMatch(/create trigger sightings_server_clock\s+before insert on public\.sightings/);
  });
  it('a photo path must be in the owner folder, and counts only when the file exists', () => {
    expect(SQL).toContain("photo_path is null or photo_path like user_id::text || '/%'");
    expect(SQL).toMatch(/from storage\.objects o\s+where o\.bucket_id = 'sighting-photos' and o\.name = p_path/);
    expect(standings.match(/public\.sighting_photo_exists\(s\.user_id, s\.photo_path\)/g)).toHaveLength(2);
    expect(standings).not.toMatch(/photo_path is not null/);
  });
  it('the photo check is not callable by clients', () => {
    for (const role of ['public', 'anon', 'authenticated']) {
      expect(SQL).toContain(`revoke all on function public.sighting_photo_exists(uuid, text) from ${role};`);
    }
  });
});

describe('the standings count only valid records, and publish exactly what they did', () => {
  it('invalid species, tasks and names contribute nothing', () => {
    expect(standings).toMatch(/from public\.discoveries\s+where public\.is_catalogue_herb\(herb_id\)/);
    expect(standings).toMatch(/where public\.is_scoring_task\(task_id\)/);
    expect(standings).not.toMatch(/task_id like/);
    expect(standings).toContain('case when public.is_safe_display_name(pr.display_name) then pr.display_name end');
  });
  it('the returned columns, the point values and the grants are unchanged from 0011', () => {
    const signature = (s: string) => s.slice(s.indexOf('returns table ('), s.indexOf('language sql'));
    expect(signature(standings)).toBe(signature(OLD.slice(OLD.indexOf('create or replace function public.leaderboard_standings('))));
    for (const pin of ['* 50)::int', '* 15)::int', '* 100)::int', 'rank_in_day <= 4', '>= 24)', 'limit least(coalesce(p_limit, 50), 200)']) {
      expect(standings).toContain(pin);
    }
    expect(standings).toContain('revoke all on function public.leaderboard_standings(text, integer) from anon;');
    expect(standings).toContain('grant execute on function public.leaderboard_standings(text, integer) to authenticated;');
  });
});

describe('display names', () => {
  it('the reserved words and the character class match the database', () => {
    expect(SQL).toContain(`'(${RESERVED_NAME_WORDS.join('|')})'`);
    const sqlClass = SQL.match(/p !~ '(\[[^']+\])'/)?.[1];
    expect(sqlClass).toBe(UNSAFE_NAME_CHARS.source);
  });
  it('refuses invisible characters and names posing as the service', () => {
    expect(isSafeDisplayName('Fern​Friend')).toBe(false);
    expect(isSafeDisplayName('Fern‮Friend')).toBe(false);
    expect(isSafeDisplayName('PlantDex Admin')).toBe(false);
    expect(isSafeDisplayName('Official Staff')).toBe(false);
    expect(isSafeDisplayName('Fern Friend')).toBe(true);
    expect(isSafeDisplayName('Zoë 木')).toBe(true);
  });
  it('a stored name that is unsafe never reaches the page', () => {
    const empty = { discoveries: {}, learned: {}, mastered: {}, research: {}, achievements: {} };
    const stored = { displayName: 'PlantDex Support', avatarHerbId: null, avatarFrameId: null, titleId: null, sidekickHerbId: null, featuredHerbId: null, pinnedAchievementIds: [] };
    expect(resolveProfile(stored as never, empty as never).displayName).toBeNull();
  });
});
