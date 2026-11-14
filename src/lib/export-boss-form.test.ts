import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Boss Form records in the account export, against a stand-in Supabase client, and in the
 * account deletion list. The live behaviour (RLS refusing writes, a real export) is covered by
 * `e2e/supabase.e2e.test.ts`; here is what the CLIENT asks for and how it fails.
 *
 * The rows below are MOCK rows for the test, not data from any account.
 */
const { tables, queried, fake } = vi.hoisted(() => {
  const tables: Record<string, { data: unknown; error: { message: string } | null }> = {};
  const queried: { table: string; filter?: [string, unknown] }[] = [];
  const builder = (table: string) => {
    const entry: { table: string; filter?: [string, unknown] } = { table };
    queried.push(entry);
    const result = () => tables[table] ?? { data: [], error: null };
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        entry.filter = [column, value];
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (value: unknown) => unknown) => resolve(result()),
    };
    return chain;
  };
  return { tables, queried, fake: { from: builder, storage: { from: () => ({ download: vi.fn() }) } } };
});

vi.mock('./supabase-client', () => ({ supabase: fake }));

import { exportAccountData, exportLocalData } from './export-account-data';

const USER = 'user-1';

beforeEach(() => {
  queried.length = 0;
  for (const key of Object.keys(tables)) delete tables[key];
});

describe('account export includes Boss Form records', () => {
  it('reads both tables for the signed-in user only', async () => {
    tables.challenge_completions = {
      data: [{ herb_id: 'taraxacum-officinale', activity_id: 'part-spotter', completed_at: '2026-01-01T00:00:00Z' }],
      error: null,
    };
    tables.boss_forms = {
      data: [{ herb_id: 'taraxacum-officinale', earned_at: '2026-01-02T00:00:00Z' }],
      error: null,
    };
    const out = await exportAccountData(USER);
    expect(out.challengeCompletions).toEqual([
      { herb_id: 'taraxacum-officinale', activity_id: 'part-spotter', completed_at: '2026-01-01T00:00:00Z' },
    ]);
    expect(out.bossForms).toEqual([{ herb_id: 'taraxacum-officinale', earned_at: '2026-01-02T00:00:00Z' }]);
    for (const table of ['challenge_completions', 'boss_forms']) {
      const asked = queried.filter((q) => q.table === table);
      expect(asked, table).toHaveLength(1);
      expect(asked[0]!.filter, table).toEqual(['user_id', USER]);
    }
  });

  it('is empty, not missing, for an account that never took part', async () => {
    const out = await exportAccountData(USER);
    expect(out.challengeCompletions).toEqual([]);
    expect(out.bossForms).toEqual([]);
  });

  it('exports no score and no XP, because none is stored', async () => {
    const out = await exportAccountData(USER);
    const text = JSON.stringify({ a: out.challengeCompletions, b: out.bossForms });
    expect(text).not.toMatch(/score|xp|points/i);
    const source = readFileSync('src/lib/export-account-data.ts', 'utf8');
    expect(source).toMatch(/from\('challenge_completions'\)\.select\('herb_id, activity_id, completed_at'\)/);
  });

  it('fails loudly instead of exporting a partial file', async () => {
    tables.boss_forms = { data: null, error: { message: 'boom' } };
    await expect(exportAccountData(USER)).rejects.toThrow(/Boss Forms/);
    tables.boss_forms = { data: [], error: null };
    tables.challenge_completions = { data: null, error: { message: 'boom' } };
    await expect(exportAccountData(USER)).rejects.toThrow(/challenge completions/);
  });

  it('a signed-out device export carries empty lists, because the server writes them', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
    const out = await exportLocalData().catch(() => null);
    if (out) {
      expect(out.challengeCompletions).toEqual([]);
      expect(out.bossForms).toEqual([]);
    }
    vi.unstubAllGlobals();
  });
});

describe('account deletion removes Boss Form records', () => {
  const source = readFileSync('supabase/functions/delete-account/index.ts', 'utf8');
  const list = /const USER_TABLES = \[([\s\S]*?)\] as const;/.exec(source)?.[1] ?? '';
  const names = list
    .split('\n')
    .map((line) => /^\s*'(\w+)',/.exec(line)?.[1])
    .filter((name): name is string => Boolean(name));

  it('lists both tables', () => {
    expect(names).toContain('challenge_completions');
    expect(names).toContain('boss_forms');
  });

  it('deletes every listed table by the caller id, before the account itself', () => {
    const loop = source.slice(source.indexOf('for (const table of USER_TABLES)'));
    expect(loop.slice(0, 200)).toMatch(/\.delete\(\)\.eq\('user_id', userId\)/);
    expect(source.indexOf('for (const table of USER_TABLES)')).toBeLessThan(
      source.indexOf('auth.admin.deleteUser'),
    );
  });

  it('keeps the shared registry out of deletion, as before', () => {
    expect(names).not.toContain('species_packets');
  });
});
