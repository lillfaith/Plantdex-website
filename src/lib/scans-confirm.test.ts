import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScanCandidate } from './plant-match';

/** A stand-in `scans` table that honours the filters it is given and can be told to fail. */
const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  failDelete: false,
  failSelect: false,
  failInsertAt: new Set<number>(),
  inserts: 0,
  /** Runs between this call's read and its delete (to interleave another confirmation). */
  beforeDelete: null as null | (() => void),
}));

function builder(rows: () => Record<string, unknown>[]) {
  const filters: Array<(r: Record<string, unknown>) => boolean> = [];
  const matching = () => rows().filter((r) => filters.every((f) => f(r)));
  const chain: Record<string, unknown> = {
    eq(col: string, v: unknown) {
      filters.push((r) => r[col] === v);
      return chain;
    },
    is(col: string, v: unknown) {
      filters.push((r) => (r[col] ?? null) === v);
      return chain;
    },
    maybeSingle: async () =>
      state.failSelect
        ? { data: null, error: { message: 'select failed' } }
        : { data: matching()[0] ?? null, error: null },
  };
  return { chain, matching };
}

vi.mock('./supabase-client', () => ({
  supabase: {
    from: () => ({
      select: () => builder(() => state.rows).chain,
      delete: () => {
        const { chain, matching } = builder(() => state.rows);
        const run = async () => {
          state.beforeDelete?.();
          state.beforeDelete = null;
          if (state.failDelete) return { data: null, error: { message: 'delete failed' } };
          const gone = matching();
          state.rows = state.rows.filter((r) => !gone.includes(r));
          return { data: gone.map((r) => ({ id: r.id })), error: null };
        };
        chain.select = run;
        chain.then = (res: (v: unknown) => unknown) => run().then(res);
        return chain;
      },
      insert: async (row: Record<string, unknown>) => {
        state.inserts += 1;
        if (state.failInsertAt.has(state.inserts)) return { error: { message: 'insert failed' } };
        if (state.rows.some((r) => r.id === row.id)) return { error: { message: 'duplicate' } };
        state.rows.push(row);
        return { error: null };
      },
    }),
  },
}));

import { confirmScan } from './scans';

const original = { id: 'scan_1', user_id: 'u1', top_scientific_name: 'Oxalis dillenii', confidence: 0.41 };
const candidate = {
  scientificName: 'Oxalis stricta',
  score: 0.09,
  match: { eligibility: 'exact', observedTaxon: { rank: 'species' } },
} as unknown as ScanCandidate;

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  state.rows = [{ ...original }];
  state.failDelete = false;
  state.failSelect = false;
  state.failInsertAt = new Set();
  state.inserts = 0;
  state.beforeDelete = null;
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

describe('confirmScan replaces the row without being able to lose it', () => {
  it('writes the confirmation on success', async () => {
    expect(await confirmScan('u1', 'scan_1', 'oxalis-stricta', candidate)).toBe(true);
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]!.confirmed_herb_id).toBe('oxalis-stricta');
  });

  it('puts the original row back when the replacement insert fails', async () => {
    state.failInsertAt = new Set([1]);
    expect(await confirmScan('u1', 'scan_1', 'oxalis-stricta', candidate)).toBe(false);
    expect(state.rows).toEqual([original]);
  });

  it('does not insert when the delete failed', async () => {
    state.failDelete = true;
    expect(await confirmScan('u1', 'scan_1', 'oxalis-stricta', candidate)).toBe(false);
    expect(state.inserts).toBe(0);
    expect(state.rows).toEqual([original]);
  });

  it('reports false and logs only the scan id when the restore fails too', async () => {
    state.failInsertAt = new Set([1, 2]);
    expect(await confirmScan('u1', 'scan_1', 'oxalis-stricta', candidate)).toBe(false);
    expect(state.inserts).toBe(2); // one restore attempt, no retry loop
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const msg = String(errorSpy.mock.calls[0]![0]);
    expect(msg).toContain('scan_1');
    expect(msg).toContain('failed');
    expect(msg).not.toContain('Oxalis');
  });

  it('treats a select error as an error, not as "no row", and writes nothing', async () => {
    state.failSelect = true;
    expect(await confirmScan('u1', 'scan_1', 'oxalis-stricta', candidate)).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(state.inserts).toBe(0);
    expect(state.rows).toEqual([original]);
  });

  it('is a success, writing nothing, when the same card is already confirmed', async () => {
    const confirmed = { ...original, confirmed_herb_id: 'oxalis-stricta' };
    state.rows = [confirmed];
    expect(await confirmScan('u1', 'scan_1', 'oxalis-stricta', candidate)).toBe(true);
    expect(state.inserts).toBe(0);
    expect(state.rows).toEqual([confirmed]);
  });

  it('refuses, writing nothing, when a different card is already confirmed', async () => {
    const confirmed = { ...original, confirmed_herb_id: 'taraxacum-officinale' };
    state.rows = [confirmed];
    expect(await confirmScan('u1', 'scan_1', 'oxalis-stricta', candidate)).toBe(false);
    expect(state.inserts).toBe(0);
    expect(state.rows).toEqual([confirmed]);
  });

  it('race: a late confirmation cannot delete the first one or restore the original over it', async () => {
    // B has read the unconfirmed row; before B deletes, A completes its confirmation.
    const confirmedByA = { ...original, confirmed_herb_id: 'taraxacum-officinale' };
    state.beforeDelete = () => {
      state.rows = [confirmedByA];
    };
    state.failInsertAt = new Set([1]); // B's insert would fail if it got that far
    expect(await confirmScan('u1', 'scan_1', 'oxalis-stricta', candidate)).toBe(false);
    expect(state.rows).toEqual([confirmedByA]);
  });
});
