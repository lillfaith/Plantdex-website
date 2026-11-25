import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CATALOGUE } from './catalogue';

/**
 * Guards `0015_expansion_catalogue_ids.sql` (DRAFT, not applied anywhere): the database's list of valid card
 * ids, extended with the 85 digital-only Herbdex Expansion cards (#57-141).
 *
 * What is pinned, and why each one is a separate test. The function is the only thing on the database side
 * that refuses a new card id (0013 hard-codes the 54 of today's catalogue). Replacing it is therefore safe
 * only if it can never LOSE an id (that would stop old rows scoring), never invent one (the list is
 * client-writable by anybody holding a session), never drift from the catalogue the app serves, and never
 * carry anything but that one statement. The ids come from the audit inventory, not from this file: a
 * hand-typed list is how a species name gets mis-spelled into permanent, unwritable rows.
 */
const root = join(import.meta.dirname, '..', '..');
const migrations = join(root, 'supabase', 'migrations');
const read = (p: string): string => readFileSync(p, 'utf8');

const SQL_0013 = read(join(migrations, '0013_leaderboard_integrity.sql'));
const SQL_0015 = read(join(migrations, '0015_expansion_catalogue_ids.sql'));
const ROLLBACK = read(join(root, 'docs', 'agent-workflow', 'migration-0015-rollback.sql'));
const INVENTORY = read(join(root, 'docs', 'expansion', 'audit', 'inventory.csv'));

/** The quoted ids of one `is_catalogue_herb` definition, in order. Comment lines never match. */
function idsOf(sql: string): string[] {
  const start = sql.indexOf('function public.is_catalogue_herb(');
  expect(start, 'function is not defined in this file').toBeGreaterThan(-1);
  const body = sql.slice(start, sql.indexOf('$$;', start));
  return [...body.matchAll(/^\s{4}'([^']+)',?$/gm)].map((m) => m[1] ?? '');
}

const code = (sql: string): string =>
  sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

interface Draft {
  cardNumber: number;
  id: string;
  scientific: string;
}
const DRAFTS: Draft[] = [
  ...INVENTORY.matchAll(/^(\d{2,3}),([a-z0-9-]+),(?:"[^"]*"|[^,]*),([A-Z][a-z]+ [a-z-]+),/gm),
].map((m) => ({ cardNumber: Number(m[1]), id: m[2] ?? '', scientific: m[3] ?? '' }));

const OLD = idsOf(SQL_0013);
const NEW = idsOf(SQL_0015);
const ADDED = NEW.slice(OLD.length);

describe('the inventory is read correctly', () => {
  it('holds exactly the 85 drafts, #57 to #141, in order', () => {
    expect(DRAFTS).toHaveLength(85);
    expect(DRAFTS.map((d) => d.cardNumber)).toEqual(Array.from({ length: 85 }, (_, i) => 57 + i));
  });
  it('every draft id is the lowercase, hyphenated scientific name (the standing id rule)', () => {
    for (const d of DRAFTS) expect(d.id, `#${d.cardNumber}`).toBe(d.scientific.toLowerCase().replace(/ /g, '-'));
  });
});

describe('0015 can only add ids, never lose or invent one', () => {
  it('starts with 0013\'s 54 ids, verbatim and in order', () => {
    expect(OLD).toHaveLength(54);
    expect(NEW.slice(0, OLD.length)).toEqual(OLD);
  });
  it('adds only ids from the expansion inventory, in card-number order, each at most once', () => {
    const order = new Map(DRAFTS.map((d, i) => [d.id, i]));
    for (const id of ADDED) expect(order.has(id), `${id} is not in the inventory`).toBe(true);
    const positions = ADDED.map((id) => order.get(id)!);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(new Set(ADDED).size).toBe(ADDED.length);
  });
  it('no added id is already one of the 54', () => {
    const old = new Set(OLD);
    for (const id of ADDED) expect(old.has(id), id).toBe(false);
  });
  it('every added id fits the shape the daily-task rule accepts', () => {
    for (const id of ADDED) expect(id).toMatch(/^[a-z0-9-]+$/);
  });
  it('is not empty: a file that adds nothing is not this migration', () => {
    expect(ADDED.length).toBeGreaterThan(0);
  });
});

describe('0015 stays in step with the catalogue the app serves', () => {
  it('accepts every id in CATALOGUE, whichever batch of the expansion is live', () => {
    const accepted = new Set(NEW);
    for (const herb of CATALOGUE) expect(accepted.has(herb.id), `${herb.id} would be refused`).toBe(true);
  });
  it('no other migration after 0013 redefines the function, so 0015 is the latest definition', () => {
    const files = readdirSync(migrations).filter((f) => /^\d{4}_.*\.sql$/.test(f) && Number(f.slice(0, 4)) > 13);
    const definers = files.filter((f) => /create (or replace )?function public\.is_catalogue_herb/i.test(code(read(join(migrations, f)))));
    expect(definers).toEqual(['0015_expansion_catalogue_ids.sql']);
  });
});

describe('0015 is exactly one function replacement', () => {
  const body = code(SQL_0015);
  it('has the same signature and attributes as 0013\'s', () => {
    expect(body).toMatch(/create or replace function public\.is_catalogue_herb\(p text\)\s+returns boolean language sql immutable set search_path = '' as \$\$/);
    expect(body.match(/create or replace function/gi)).toHaveLength(1);
  });
  it('contains no other statement: no constraint, policy, table, grant, data change or drop', () => {
    expect(body).not.toMatch(/\b(alter|drop|truncate|delete|insert|update|grant|revoke|create (table|policy|trigger|index))\b/i);
    expect(body).not.toMatch(/validate\s+constraint/i);
  });
  it('says in its own header that it is a draft and that only a released batch may be applied', () => {
    expect(SQL_0015).toMatch(/STATUS: DRAFT\. NOT APPLIED ANYWHERE/);
    expect(SQL_0015).toMatch(/APPLY ONLY A RELEASED BATCH/);
    expect(SQL_0015).toMatch(/docs\/agent-workflow\/migration-0015-rollback\.sql/);
  });
});

describe('the rollback restores 0013 exactly and checks before it acts', () => {
  it('restores the 54 ids, verbatim and in order', () => {
    expect(idsOf(ROLLBACK).slice(0, OLD.length)).toEqual(OLD);
  });
  it('runs a pre-check on all four id-bearing tables before it replaces anything', () => {
    const check = ROLLBACK.indexOf('discoveries_beyond_54');
    const replace = ROLLBACK.search(/create or replace function public\.is_catalogue_herb/);
    expect(check).toBeGreaterThan(-1);
    expect(replace).toBeGreaterThan(check);
    for (const table of ['discoveries', 'learned', 'mastered', 'sightings']) {
      expect(ROLLBACK).toContain(`public.${table}`);
    }
  });
  it('is not under supabase/migrations/, so no tool can pick it up as a migration', () => {
    expect(readdirSync(migrations)).not.toContain('migration-0015-rollback.sql');
  });
});
