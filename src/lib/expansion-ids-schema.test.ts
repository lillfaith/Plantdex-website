import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CATALOGUE } from './catalogue';

/**
 * Guards `0015_expansion_catalogue_ids.sql` (owner-approved for the TEST project only; never production).
 *
 * THE SHAPE, AND WHY. 0013 makes four tables refuse any card id outside `is_catalogue_herb()`, and the same function feeds the Field
 * Board and the daily-research rule. The first draft widened that function, which would have scored every expansion discovery 50 board
 * points. Owner decision 6 says expansion discoveries contribute NO board score until separately approved, so 0015 leaves
 * `is_catalogue_herb` and `leaderboard_standings` untouched and adds a separate "may be stored" function that only the four CHECK
 * constraints call. What is pinned, each as its own test:
 *   (b) 0013 compatibility: the 0013 function is not redefined (so its 54 ids, order and signature are byte-identical), and the rollback
 *       restores exactly that;
 *   (c) no new scoring or unlock behaviour: nothing that scores or unlocks references an expansion id or the new functions;
 *   (d) the rollback refuses under a new-id row and never deletes a player record;
 *   plus the id list is read from the audit inventory, never typed here (a hand-typed list is how a species is mis-spelled into
 *   permanent, unwritable rows).
 */
const root = join(import.meta.dirname, '..', '..');
const migrations = join(root, 'supabase', 'migrations');
const read = (p: string): string => readFileSync(p, 'utf8');

const SQL_0013 = read(join(migrations, '0013_leaderboard_integrity.sql'));
const SQL_0015 = read(join(migrations, '0015_expansion_catalogue_ids.sql'));
const ROLLBACK = read(join(root, 'docs', 'agent-workflow', 'migration-0015-rollback.sql'));
const VERIFY = read(join(root, 'docs', 'agent-workflow', 'migration-0015-test-verification.sql'));
const INVENTORY = read(join(root, 'docs', 'expansion', 'audit', 'inventory.csv'));

/** Strip `--` comment lines so a sentence in a header can never satisfy or break a structural assertion. */
const code = (sql: string): string =>
  sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

/** The quoted ids inside `needle`'s array literal (up to its closing `]`), in order. */
function idsAfter(sql: string, needle: string): string[] {
  const start = sql.indexOf(needle);
  expect(start, `${needle} not found`).toBeGreaterThan(-1);
  const body = sql.slice(start, sql.indexOf(']', start + needle.length));
  return [...body.matchAll(/^\s{4}'([^']+)',?$/gm)].map((m) => m[1] ?? '');
}

interface Draft {
  cardNumber: number;
  id: string;
  scientific: string;
}
const DRAFTS: Draft[] = [
  ...INVENTORY.matchAll(/^(\d{2,3}),([a-z0-9-]+),(?:"[^"]*"|[^,]*),([A-Z][a-z]+ [a-z-]+),/gm),
].map((m) => ({ cardNumber: Number(m[1]), id: m[2] ?? '', scientific: m[3] ?? '' }));

const OLD = idsAfter(SQL_0013, 'function public.is_catalogue_herb(');
const ADDED = idsAfter(SQL_0015, 'function public.is_expansion_herb(');

describe('the inventory is read correctly', () => {
  it('holds exactly the 85 drafts, #57 to #141, in order', () => {
    expect(DRAFTS).toHaveLength(85);
    expect(DRAFTS.map((d) => d.cardNumber)).toEqual(Array.from({ length: 85 }, (_, i) => 57 + i));
  });
  it('every draft id is the lowercase, hyphenated scientific name (the standing id rule)', () => {
    for (const d of DRAFTS) expect(d.id, `#${d.cardNumber}`).toBe(d.scientific.toLowerCase().replace(/ /g, '-'));
  });
});

describe('0015 adds ids and can never lose or invent one', () => {
  it('adds only ids from the expansion inventory, in card-number order, each at most once', () => {
    const order = new Map(DRAFTS.map((d, i) => [d.id, i]));
    for (const id of ADDED) expect(order.has(id), `${id} is not in the inventory`).toBe(true);
    const positions = ADDED.map((id) => order.get(id)!);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(new Set(ADDED).size).toBe(ADDED.length);
  });
  it('the approved TEST batch is all 85', () => {
    expect(ADDED).toEqual(DRAFTS.map((d) => d.id));
  });
  it('no added id is one of 0013\'s 54, and every one fits the shape the daily-task rule accepts', () => {
    const old = new Set(OLD);
    for (const id of ADDED) {
      expect(old.has(id), id).toBe(false);
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });
  it('the permitted function is exactly "a 0013 id, or one of the added ids": nothing else can be stored', () => {
    expect(code(SQL_0015)).toMatch(
      /create or replace function public\.is_permitted_herb\(p text\)\s+returns boolean language sql immutable set search_path = '' as \$\$\s+select public\.is_catalogue_herb\(p\) or public\.is_expansion_herb\(p\)\s+\$\$;/,
    );
  });
  it('accepts every id in CATALOGUE, whichever batch of the expansion is live', () => {
    const accepted = new Set([...OLD, ...ADDED]);
    for (const herb of CATALOGUE) expect(accepted.has(herb.id), `${herb.id} would be refused`).toBe(true);
  });
});

describe('(b) 0013 compatibility is preserved by not touching it', () => {
  it('0013 holds the 54 ids of today\'s CATALOGUE, in order', () => {
    expect(OLD).toHaveLength(54);
    expect(OLD).toEqual(CATALOGUE.map((h) => h.id).slice(0, 54));
  });
  it('0015 redefines none of 0013\'s functions, and no later migration redefines is_catalogue_herb either', () => {
    const body = code(SQL_0015);
    for (const f of ['is_catalogue_herb', 'is_scoring_task', 'is_research_task', 'is_achievement', 'is_safe_display_name', 'leaderboard_standings', 'sighting_photo_exists', 'sightings_server_clock']) {
      expect(body, f).not.toMatch(new RegExp(`function public\\.${f}\\b`, 'i'));
    }
    const files = readdirSync(migrations).filter((f) => /^\d{4}_.*\.sql$/.test(f) && Number(f.slice(0, 4)) > 13);
    const definers = files.filter((f) => /create (or replace )?function public\.is_catalogue_herb/i.test(code(read(join(migrations, f)))));
    expect(definers).toEqual([]);
  });
  it('re-points exactly the four id tables, each by its 0013 constraint name, each still NOT VALID', () => {
    const body = code(SQL_0015);
    for (const [table, name] of [
      ['discoveries', 'discoveries_valid_herb'],
      ['learned', 'learned_valid_herb'],
      ['mastered', 'mastered_valid_herb'],
      ['sightings', 'sightings_valid_herb'],
    ] as const) {
      expect(SQL_0013, name).toContain(`add constraint ${name} check (public.is_catalogue_herb(herb_id)) not valid`);
      expect(body, name).toContain(`alter table public.${table} drop constraint if exists ${name};`);
      expect(body, name).toContain(`alter table public.${table} add constraint ${name} check (public.is_permitted_herb(herb_id)) not valid;`);
    }
    expect(body.match(/add constraint/gi)).toHaveLength(4);
    expect(body).not.toMatch(/validate\s+constraint/i);
  });
  it('contains no table, column, policy, grant, trigger, index, data change or drop other than the four constraint swaps', () => {
    const body = code(SQL_0015).replace(/alter table public\.\w+ drop constraint if exists \w+;/g, '');
    expect(body).not.toMatch(/\b(drop|truncate|delete|insert|update|grant|revoke)\b/i);
    expect(body).not.toMatch(/create (table|policy|trigger|index)/i);
    expect(body).not.toMatch(/add column|alter column/i);
    expect(body.match(/create or replace function/gi)).toHaveLength(2);
  });
  it('says in its own header what it is approved for, and that only a released batch may go anywhere real', () => {
    expect(SQL_0015).toMatch(/TEST project ONLY \(never production\)/);
    expect(SQL_0015).toMatch(/APPLY ONLY A RELEASED BATCH/);
    expect(SQL_0015).toMatch(/docs\/agent-workflow\/migration-0015-rollback\.sql/);
    expect(SQL_0015).toMatch(/docs\/agent-workflow\/migration-0015-test-apply\.md/);
  });
});

describe('(c) nothing that scores or unlocks can see an expansion id', () => {
  const standings = SQL_0013.slice(SQL_0013.indexOf('function public.leaderboard_standings('));
  it('leaderboard_standings (0011, 0013) is defined in no later migration', () => {
    const files = readdirSync(migrations).filter((f) => /^\d{4}_.*\.sql$/.test(f) && Number(f.slice(0, 4)) > 13);
    for (const f of files) {
      expect(code(read(join(migrations, f))), f).not.toMatch(/function public\.leaderboard_standings/i);
    }
  });
  it('every card-id filter in the standings asks the 0013 function, so an expansion id counts for nothing', () => {
    const filters = [...standings.matchAll(/public\.(is_\w+_herb)\(/g)].map((m) => m[1]);
    expect(filters.length).toBeGreaterThanOrEqual(3);
    for (const f of filters) expect(f).toBe('is_catalogue_herb');
  });
  it('no function, policy or trigger in any migration other than 0015 mentions the new functions or an expansion id', () => {
    const files = readdirSync(migrations).filter((f) => /^\d{4}_.*\.sql$/.test(f) && !f.startsWith('0015'));
    for (const f of files) {
      const sql = read(join(migrations, f));
      expect(sql, f).not.toMatch(/is_permitted_herb|is_expansion_herb/);
      for (const d of DRAFTS) expect(sql, `${f} mentions ${d.id}`).not.toContain(`'${d.id}'`);
    }
  });
  it('no edge function and no client scoring module mentions the new functions or an expansion id', () => {
    const roots = [join(root, 'supabase', 'functions'), join(root, 'src', 'lib')];
    const walk = (d: string, out: string[] = []): string[] => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (/\.(ts|tsx|sql)$/.test(n) && !/\.test\./.test(n)) out.push(p);
      }
      return out;
    };
    for (const r of roots) {
      for (const p of walk(r)) {
        const text = read(p);
        expect(text, p).not.toMatch(/is_permitted_herb|is_expansion_herb/);
        for (const d of DRAFTS) expect(text, `${p} mentions ${d.id}`).not.toContain(`'${d.id}'`);
      }
    }
  });
  it('0015 awards nothing: no points, XP, task, achievement or unlock vocabulary in its code', () => {
    expect(code(SQL_0015)).not.toMatch(/points|\bxp\b|is_scoring_task|is_research_task|is_achievement|leaderboard|unlock/i);
  });
  it('the verification script asserts the standing result with the real standings function', () => {
    expect(VERIFY).toMatch(/public\.leaderboard_standings\(null, 200\)/);
    expect(VERIFY).toMatch(/total_after - total_before = 50/);
    expect(VERIFY).toMatch(/is_catalogue_herb accepts NONE of the expansion ids/);
  });
});

describe('(d) the rollback refuses under a new-id row and never deletes a player record', () => {
  it('restores the four constraints to is_catalogue_herb, NOT VALID, and drops only the two functions 0015 added', () => {
    const body = code(ROLLBACK);
    for (const t of ['discoveries', 'learned', 'mastered', 'sightings']) {
      expect(body).toContain(`alter table public.${t} add constraint ${t}_valid_herb check (public.is_catalogue_herb(herb_id)) not valid;`);
    }
    const drops = [...body.matchAll(/drop function if exists (public\.\w+)\(text\);/g)].map((m) => m[1]);
    expect(drops).toEqual(['public.is_permitted_herb', 'public.is_expansion_herb']);
    expect(body).not.toMatch(/\bdrop (table|column|policy|trigger)\b/i);
  });
  it('its pre-check list is 0013\'s 54, in order, and covers all four tables', () => {
    expect(idsAfter(ROLLBACK, 'old_ids text[] := array[')).toEqual(OLD);
    for (const t of ['discoveries', 'learned', 'mastered', 'sightings']) expect(ROLLBACK).toMatch(new RegExp(`public\\.${t}\\s+x where x\\.herb_id <> all \\(old_ids\\)`));
  });
  it('raises BEFORE it changes anything, inside one DO block (one transaction)', () => {
    const body = code(ROLLBACK);
    expect(body).toMatch(/do \$rollback\$/);
    const refuse = body.indexOf("raise exception 'ROLLBACK REFUSED");
    const firstChange = body.search(/alter table|drop function/);
    expect(refuse).toBeGreaterThan(-1);
    expect(firstChange).toBeGreaterThan(refuse);
    expect(body).toMatch(/if d \+ l \+ m \+ s > 0 then/);
  });
  it('issues no DELETE, UPDATE, INSERT or TRUNCATE: it never touches a player record', () => {
    expect(code(ROLLBACK)).not.toMatch(/\b(delete|update|insert|truncate)\b/i);
  });
  it('is not under supabase/migrations/, so no tool can pick it up as a migration', () => {
    expect(readdirSync(migrations)).not.toContain('migration-0015-rollback.sql');
  });
});

describe('the verification script is self-rolling-back and writes nothing it does not roll back', () => {
  it('is one DO block that ends by raising its report, and never deletes or updates', () => {
    expect(VERIFY).toMatch(/do \$verify\$/);
    expect(VERIFY).toMatch(/raise exception E'RESULT %/);
    expect(code(VERIFY)).not.toMatch(/\b(delete|update|truncate|drop|alter)\b/i);
  });
  it('carries the same 85 ids as the migration, and 0013\'s 54', () => {
    expect(idsAfter(VERIFY, 'expansion_ids text[] := array[')).toEqual(ADDED);
    expect(idsAfter(VERIFY, 'old_ids text[] := array[')).toEqual(OLD);
  });
});
