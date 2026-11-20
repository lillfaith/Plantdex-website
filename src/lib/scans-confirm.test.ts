import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScanCandidate } from './plant-match';

/** A stand-in `scans` table that records calls and can be told to fail. */
const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  failDelete: false,
  failInsertAt: new Set<number>(),
  inserts: 0,
}));

vi.mock('./supabase-client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: state.rows[0] ?? null, error: null }) }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: async () => {
            if (state.failDelete) return { error: { message: 'delete failed' } };
            state.rows = [];
            return { error: null };
          },
        }),
      }),
      insert: async (row: Record<string, unknown>) => {
        state.inserts += 1;
        if (state.failInsertAt.has(state.inserts)) return { error: { message: 'insert failed' } };
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

beforeEach(() => {
  state.rows = [{ ...original }];
  state.failDelete = false;
  state.failInsertAt = new Set();
  state.inserts = 0;
});

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
});
