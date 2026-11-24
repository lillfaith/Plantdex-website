import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScanCandidate } from './plant-match';

/**
 * The atomic confirm path (migration 0014). Inert unless NEXT_PUBLIC_CONFIRM_SCAN_RPC is 'on';
 * these tests stub it per case. A fake client records every call so each branch is observable.
 */
const fake = vi.hoisted(() => ({
  rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  rpcResult: { data: true, error: null } as { data: unknown; error: { code?: string; message: string } | null },
  rpcThrows: false,
  fromCalls: 0,
  /** What the mitigation path finds when it reads the row. */
  row: null as Record<string, unknown> | null,
}));

vi.mock('./supabase-client', () => ({
  supabase: {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      fake.rpcCalls.push({ fn, args });
      if (fake.rpcThrows) throw new Error('network down');
      return fake.rpcResult;
    },
    from: () => {
      fake.fromCalls += 1;
      const chain: Record<string, unknown> = {
        eq: () => chain,
        maybeSingle: async () => ({ data: fake.row, error: null }),
      };
      return { select: () => chain };
    },
  },
}));

import { confirmScan } from './scans';

const candidate = {
  scientificName: 'Oxalis stricta',
  score: 0.9,
  match: { eligibility: 'exact', observedTaxon: { rank: 'species' } },
} as unknown as ScanCandidate;

const run = () => confirmScan('u1', 'scan_1', 'oxalis-stricta', candidate);

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  fake.rpcCalls = [];
  fake.rpcResult = { data: true, error: null };
  fake.rpcThrows = false;
  fake.fromCalls = 0;
  // Already confirmed for the same card, so the mitigation path answers true without writing.
  fake.row = { id: 'scan_1', user_id: 'u1', confirmed_herb_id: 'oxalis-stricta' };
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
  vi.unstubAllEnvs();
});

describe('flag off (the default)', () => {
  it('never calls the RPC when the variable is unset', async () => {
    expect(await run()).toBe(true);
    expect(fake.rpcCalls).toHaveLength(0);
    expect(fake.fromCalls).toBe(1);
  });

  it.each(['off', 'preview', 'ON', ''])('never calls the RPC for %j', async (v) => {
    vi.stubEnv('NEXT_PUBLIC_CONFIRM_SCAN_RPC', v);
    await run();
    expect(fake.rpcCalls).toHaveLength(0);
  });
});

describe('flag on', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_CONFIRM_SCAN_RPC', 'on'));

  it('calls confirm_scan with exactly the seven parameters', async () => {
    await run();
    expect(fake.rpcCalls).toEqual([
      {
        fn: 'confirm_scan',
        args: {
          p_scan_id: 'scan_1',
          p_herb_id: 'oxalis-stricta',
          p_scientific_name: 'Oxalis stricta',
          p_probability: 0.9,
          p_taxon_rank: 'species',
          p_eligibility: 'exact',
          p_species_confidence: expect.any(String),
        },
      },
    ]);
    expect(Object.keys(fake.rpcCalls[0]!.args)).toHaveLength(7);
  });

  it('true is success and the mitigation path is not touched', async () => {
    expect(await run()).toBe(true);
    expect(fake.fromCalls).toBe(0);
  });

  it("false is refusal (other card, or not the caller's), never success, and no fallback", async () => {
    fake.rpcResult = { data: false, error: null };
    expect(await run()).toBe(false);
    expect(fake.fromCalls).toBe(0);
  });

  it('anything other than literal true is not success', async () => {
    fake.rpcResult = { data: null, error: null };
    expect(await run()).toBe(false);
  });

  it.each([
    ['permission denied', '42501'],
    ['other Postgres error', '23514'],
    ['gateway', 'PGRST301'],
    ['no code at all', undefined],
  ])('an RPC error (%s) is a failure and does not fall back', async (_n, code) => {
    fake.rpcResult = { data: null, error: { code, message: 'boom' } };
    expect(await run()).toBe(false);
    expect(fake.fromCalls).toBe(0);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const msg = String(errorSpy.mock.calls[0]![0]);
    expect(msg).toContain('scan_1');
    expect(msg).not.toContain('Oxalis');
  });

  it('a thrown network failure is a failure and does not fall back', async () => {
    fake.rpcThrows = true;
    expect(await run()).toBe(false);
    expect(fake.fromCalls).toBe(0);
  });

  it.each(['PGRST202', '42883'])('only a missing function (%s) falls back to the mitigation', async (code) => {
    fake.rpcResult = { data: null, error: { code, message: 'function not found' } };
    expect(await run()).toBe(true); // the mitigation found the same card already confirmed
    expect(fake.rpcCalls).toHaveLength(1);
    expect(fake.fromCalls).toBe(1);
  });

  it('the fallback still refuses what the mitigation refuses', async () => {
    fake.rpcResult = { data: null, error: { code: 'PGRST202', message: 'x' } };
    fake.row = { id: 'scan_1', user_id: 'u1', confirmed_herb_id: 'taraxacum-officinale' };
    expect(await run()).toBe(false);
  });
});
