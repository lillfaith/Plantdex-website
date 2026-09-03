import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_DISPLAY_NAME, MAX_PINNED, emptyProfile } from './player-profile';

/**
 * Guards `supabase/migrations/0003_profiles.sql` against the two ways this table could stop
 * meaning what the profile is built on.
 *
 *  1. A DERIVED COLUMN. The whole feature rests on "the row holds only choices"; a cached
 *     `xp` or `discovered_count` would be a progression number a client could assert, and it
 *     is exactly the column somebody adds when a page feels slow. The migration is read here
 *     rather than a live database, so the guard runs in `npm test` with no credentials.
 *
 *  2. AN UPDATE POLICY THAT LOST ITS `with check`. `using` alone constrains which rows may
 *     be updated, not what they may become — so an owner could set `user_id` to somebody
 *     else's and hand over, or overwrite, another account's profile. That half is the reason
 *     this exception to the no-update rule is safe, and it must not be quietly dropped.
 *
 * And the third: that the exception stayed an exception. Every other migration must still
 * grant no update at all.
 */

const migrations = join(import.meta.dirname, '..', '..', 'supabase', 'migrations');
const profiles = readFileSync(join(migrations, '0003_profiles.sql'), 'utf8');

/** Column names declared in the `create table public.profiles` block. */
function declaredColumns(sql: string): string[] {
  const body = sql.split(/create table if not exists public\.profiles\s*\(/i)[1] ?? '';
  const columns: string[] = [];
  for (const line of body.split('\n')) {
    if (/^\s*\)\s*;/.test(line)) break;
    const match = /^\s{2}([a-z_]+)\s+(uuid|text|timestamptz|integer|boolean|numeric|jsonb)/.exec(line);
    if (match) columns.push(match[1]!);
  }
  return columns;
}

describe('the profiles table', () => {
  const columns = declaredColumns(profiles);

  it('was parsed at all — an empty column list would pass every check below', () => {
    expect(columns).toContain('user_id');
    expect(columns.length).toBeGreaterThanOrEqual(8);
  });

  it('declares a column for each stored choice, and nothing else but user_id/updated_at', () => {
    expect([...columns].sort()).toEqual([
      'avatar_frame_id',
      'avatar_herb_id',
      'display_name',
      'featured_herb_id',
      'pinned_achievement_ids',
      'sidekick_herb_id',
      'title_id',
      'updated_at',
      'user_id',
    ]);
    expect(profiles).toMatch(/pinned_achievement_ids\s+text\[\]/);
  });

  it('has one column per field of StoredProfile', () => {
    // Exactly the seven choices, plus the owner key and the write timestamp. An eighth
    // column would mean the row had started holding something nobody chose.
    expect(columns.length).toBe(Object.keys(emptyProfile()).length + 2);
  });

  it('holds no derived progression value', () => {
    for (const word of [
      'xp',
      'level',
      'discovered_count',
      'mastered_count',
      'learned_count',
      'completion',
      'achievements_earned',
      'research_completed',
      'streak',
      'rank',
    ]) {
      expect(columns).not.toContain(word);
    }
  });

  it('holds nothing about the person behind the account', () => {
    for (const word of ['email', 'region', 'location', 'notes', 'photo', 'scan', 'ip']) {
      expect(columns.some((column) => column.includes(word))).toBe(false);
    }
  });

  it('caps the display name and the pin list in the database, not only in the client', () => {
    expect(profiles).toContain(`char_length(display_name) <= ${MAX_DISPLAY_NAME}`);
    expect(profiles).toContain(`<= ${MAX_PINNED}`);
  });
});

describe('row level security on profiles', () => {
  it('is enabled', () => {
    expect(profiles).toMatch(/alter table public\.profiles enable row level security/);
  });

  it('scopes all four policies to the owner', () => {
    for (const action of ['select', 'insert', 'update', 'delete']) {
      expect(profiles).toMatch(new RegExp(`for ${action}[\\s\\S]{0,120}auth\\.uid\\(\\) = user_id`));
    }
  });

  /*
   * THE HALF THAT MATTERS. Without `with check`, `using (auth.uid() = user_id)` says which
   * rows you may update but nothing about what they may become — so the new row could carry
   * another account's user_id.
   */
  it('constrains the NEW row on update, not only which row may be updated', () => {
    const update = /for update\s+using \(auth\.uid\(\) = user_id\)\s+with check \(auth\.uid\(\) = user_id\)/;
    expect(profiles).toMatch(update);
  });
});

/**
 * EVERY MIGRATION MUST SURVIVE BEING RUN TWICE.
 *
 * `run-migration.yml` says so in its own header — "the only honest assumption about a
 * manually dispatched workflow is that somebody will eventually run it twice" — and 0004 and
 * 0005 were both quietly breaking it. `create table if not exists` made them LOOK idempotent,
 * but Postgres has no `create policy if not exists`, so the second run aborted with 42710 at
 * the first policy. That is not hypothetical: it happened during the production rollout, and
 * it cost a confusing detour because the error named a table the operator had not just been
 * working on.
 *
 * So: any `create policy` outside a guard is a re-run that will fail.
 */
describe('migrations can be applied twice', () => {
  it('guards every create policy, because Postgres has no if-not-exists for them', () => {
    for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql'))) {
      const sql = readFileSync(join(migrations, file), 'utf8');
      const policies = sql.match(/^\s*create policy/gim) ?? [];
      if (policies.length === 0) continue;
      expect(
        sql,
        `${file} creates ${policies.length} policy/policies but has no pg_policies guard, ` +
          'so re-running it aborts with 42710',
      ).toMatch(/from pg_policies/);
    }
  });

  it('guards every create table and index too', () => {
    for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql'))) {
      const sql = readFileSync(join(migrations, file), 'utf8');
      for (const [what, pattern] of [
        ['table', /create table (?!if not exists)/i],
        ['index', /create index (?!if not exists)/i],
      ] as const) {
        expect(sql, `${file} creates a ${what} without "if not exists"`).not.toMatch(pattern);
      }
    }
  });
});

describe('the no-update rule everywhere else', () => {
  it('holds for every migration but 0003', () => {
    for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql'))) {
      if (file === '0003_profiles.sql') continue;
      const sql = readFileSync(join(migrations, file), 'utf8');
      // `for update` in a policy, and `for all` — which silently includes update.
      expect(sql, `${file} grants an update`).not.toMatch(/create policy[\s\S]{0,200}?for update/i);
      expect(sql, `${file} uses for all`).not.toMatch(/create policy[\s\S]{0,200}?for all/i);
    }
  });
});
