import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyState } from './herbdex-state';
import type { HerbdexState } from './types';

const h = vi.hoisted(() => {
  const calls: { table: string; rows: Record<string, string>[] }[] = [];
  const server: Record<string, Record<string, string>[]> = {};
  const ctl = {
    policy: (...args: [string, Record<string, string>[]]): { code?: string; message: string } | null => (args.length ? null : null),
  };
  const fake = {
    from(table: string) {
      return {
        upsert(rows: Record<string, string>[]) {
          calls.push({ table, rows });
          const error = ctl.policy(table, rows);
          if (!error) (server[table] ??= []).push(...rows);
          return Promise.resolve({ error });
        },
        select() {
          return { eq: () => Promise.resolve({ data: server[table] ?? [], error: null }) };
        },
      };
    },
  };
  return { calls, server, ctl, fake };
});
const { calls, server, ctl } = h;
vi.mock('./supabase-client', () => ({ supabase: h.fake }));

import { createRemoteHerbdexStorage } from './remote-herbdex-storage';

const AT = '2026-01-01T00:00:00.000Z';
const refuse = { code: '42501', message: 'discovery_requires_capture_receipt' };
const settle = () => new Promise((r) => setTimeout(r, 0));

function state(p: Partial<HerbdexState>): HerbdexState {
  return { ...emptyState(), ...p };
}
const rowsFor = (table: string) => calls.filter((c) => c.table === table);

beforeEach(() => {
  calls.length = 0;
  for (const k of Object.keys(server)) delete server[k];
  ctl.policy = () => null;
});

describe('remote adapter write failures', () => {
  it('lets valid rows land beside a refused one and reports the refusal once', async () => {
    ctl.policy = (table, rows) =>
      table === 'discoveries' && rows.some((r) => r.herb_id === 'bad') ? refuse : null;
    const adapter = createRemoteHerbdexStorage('u1');
    const onRefused = vi.fn();
    adapter.onRefused = onRefused;
    await adapter.load();
    adapter.save(state({ discoveries: { good: AT, bad: AT } }));
    await settle();
    expect(server.discoveries?.map((r) => r.herb_id)).toEqual(['good']);
    expect(onRefused).toHaveBeenCalledTimes(1);
    expect(onRefused).toHaveBeenCalledWith({
      table: 'discoveries',
      ids: ['bad'],
      code: 'discovery_requires_capture_receipt',
    });
  });

  it('never retries a refused row in the same session, but still writes later valid rows', async () => {
    ctl.policy = (table, rows) =>
      table === 'discoveries' && rows.some((r) => r.herb_id === 'bad') ? refuse : null;
    const adapter = createRemoteHerbdexStorage('u1');
    const onRefused = vi.fn();
    adapter.onRefused = onRefused;
    await adapter.load();
    adapter.save(state({ discoveries: { bad: AT } }));
    await settle();
    const writes = rowsFor('discoveries').length;
    adapter.save(state({ discoveries: { bad: AT } }));
    adapter.save(state({ discoveries: { bad: AT }, achievements: { x: AT } }));
    await settle();
    expect(rowsFor('discoveries').length).toBe(writes);
    expect(onRefused).toHaveBeenCalledTimes(1);
  });

  it('writes a refused row normally after a reload (rollback) if it is captured properly', async () => {
    let refusing = true;
    ctl.policy = (table) => (table === 'discoveries' && refusing ? refuse : null);
    const adapter = createRemoteHerbdexStorage('u1');
    adapter.onRefused = vi.fn();
    await adapter.load();
    adapter.save(state({ discoveries: { bad: AT } }));
    await settle();
    await adapter.load(); // the store's rollback
    refusing = false;
    adapter.save(state({ discoveries: { bad: AT } }));
    await settle();
    expect(server.discoveries?.map((r) => r.herb_id)).toEqual(['bad']);
  });

  it('keeps a learned/achievement row for a held card when a discovery in the batch is refused', async () => {
    ctl.policy = (table, rows) =>
      table === 'discoveries' && rows.some((r) => r.herb_id === 'bad') ? refuse : null;
    const adapter = createRemoteHerbdexStorage('u1');
    adapter.onRefused = vi.fn();
    await adapter.load();
    adapter.save(
      state({
        discoveries: { held: AT, bad: AT },
        learned: { held: AT },
        achievements: { 'first-find': AT },
      }),
    );
    await settle();
    expect(server.learned?.map((r) => r.herb_id)).toEqual(['held']);
    expect(server.unlocked_achievements?.map((r) => r.achievement_id)).toEqual(['first-find']);
  });

  it('does not write an achievement that depended on the refused discovery', async () => {
    ctl.policy = (table) => (table === 'discoveries' ? refuse : null);
    const adapter = createRemoteHerbdexStorage('u1');
    adapter.onRefused = vi.fn();
    await adapter.load();
    adapter.save(state({ discoveries: { bad: AT }, achievements: { 'first-find': AT } }));
    await settle();
    expect(server.unlocked_achievements).toBeUndefined();
  });

  it('keeps a transient failure retryable on the next save and does not report it', async () => {
    let failing = true;
    ctl.policy = () => (failing ? { message: 'TypeError: Failed to fetch' } : null);
    const adapter = createRemoteHerbdexStorage('u1');
    const onRefused = vi.fn();
    adapter.onRefused = onRefused;
    await adapter.load();
    adapter.save(state({ discoveries: { a: AT } }));
    await settle();
    expect(onRefused).not.toHaveBeenCalled();
    failing = false;
    adapter.save(state({ discoveries: { a: AT } }));
    await settle();
    expect(server.discoveries?.map((r) => r.herb_id)).toEqual(['a']);
  });

  it('treats an upsert that hits an existing row as success, not a refusal', async () => {
    const adapter = createRemoteHerbdexStorage('u1');
    const onRefused = vi.fn();
    adapter.onRefused = onRefused;
    await adapter.load();
    adapter.save(state({ discoveries: { a: AT } })); // on conflict do nothing: no error
    await settle();
    expect(onRefused).not.toHaveBeenCalled();
    expect(rowsFor('discoveries')).toHaveLength(1);
  });
});
