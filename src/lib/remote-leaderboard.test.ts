import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The board's data layer against a stand-in Supabase client. The live behaviour (RLS, the SQL
 * function) is exercised by `e2e/leaderboard.e2e.test.ts` against the test project; this file
 * pins what the CLIENT sends and how it reads the answer, including every failure path.
 */
const { rpc, table, fake } = vi.hoisted(() => {
  const rpc = vi.fn();
  const table = {
    delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    insert: vi.fn(async () => ({ error: null })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })),
    })),
  };
  return { rpc, table, fake: { rpc, from: vi.fn(() => table) } };
});

vi.mock('./supabase-client', () => ({ supabase: fake }));

import { fetchMembership, fetchStandings, joinLeaderboard, leaveLeaderboard } from './remote-leaderboard';

/** MOCK rows, for tests only. */
const raw = (over: Record<string, unknown> = {}) => ({
  standing: '1',
  display_name: 'Mock Fern',
  region_id: 'us-ga',
  points: 150,
  discovery_points: 100,
  journal_points: 15,
  challenge_points: 35,
  discoveries: 2,
  journal_entries: 1,
  challenges: 0,
  photo_backed_entries: 1,
  is_self: false,
  ...over,
});

beforeEach(() => {
  rpc.mockReset();
  vi.clearAllMocks();
});

describe('reading the standings', () => {
  it('asks for the whole board, or for one region, and maps the answer', async () => {
    rpc.mockResolvedValue({ data: [raw(), raw({ standing: 2, display_name: null, is_self: true })], error: null });
    const rows = await fetchStandings({ regionId: 'us-ga', limit: 200 });
    expect(rpc).toHaveBeenCalledWith('leaderboard_standings', { p_region: 'us-ga', p_limit: 200 });
    expect(rows.map((row) => row.standing)).toEqual([1, 2]);
    expect(rows[1]).toMatchObject({ displayName: null, isSelf: true, avatarHerbId: null, frameId: null });

    rpc.mockResolvedValue({ data: [], error: null });
    await fetchStandings();
    expect(rpc).toHaveBeenLastCalledWith('leaderboard_standings', { p_region: null, p_limit: 50 });
  });

  it('keeps the server order and tied standings exactly as returned', async () => {
    rpc.mockResolvedValue({
      data: [raw({ standing: 1, points: 90 }), raw({ standing: 1, points: 90 }), raw({ standing: 3, points: 40 })],
      error: null,
    });
    const rows = await fetchStandings();
    expect(rows.map((row) => [row.standing, row.points])).toEqual([[1, 90], [1, 90], [3, 40]]);
  });

  it('drops a region id the app has not launched', async () => {
    rpc.mockResolvedValue({ data: [raw({ region_id: 'zz-nowhere' })], error: null });
    expect((await fetchStandings())[0]!.regionId).toBeNull();
  });

  it('surfaces a backend failure as an error, and an empty board as an empty list', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Could not find the function public.leaderboard_standings' } });
    await expect(fetchStandings()).rejects.toThrow(/leaderboard_standings/);
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await fetchStandings()).toEqual([]);
  });

  it('copies no field the function does not publish', async () => {
    rpc.mockResolvedValue({
      data: [raw({ user_id: 'u-secret', email: 'a@b.c', herb_id: 'x', notes: 'private', photo_path: 'p' })],
      error: null,
    });
    const keys = Object.keys((await fetchStandings())[0]!).sort();
    expect(keys).toEqual(
      [
        'avatarHerbId', 'challengePoints', 'challenges', 'discoveries', 'discoveryPoints',
        'displayName', 'frameId', 'isSelf', 'journalEntries', 'journalPoints', 'photoBackedEntries',
        'points', 'regionId', 'standing', 'verification',
      ].sort(),
    );
  });
});

describe('listing and leaving', () => {
  it('joining deletes any old row, then inserts only your own with a valid region', async () => {
    await joinLeaderboard('user-1', 'us-ga');
    expect(table.delete).toHaveBeenCalled();
    expect(table.insert).toHaveBeenCalledWith({ user_id: 'user-1', region_id: 'us-ga' });
    await joinLeaderboard('user-1', 'free text region');
    expect(table.insert).toHaveBeenLastCalledWith({ user_id: 'user-1', region_id: null });
  });

  it('leaving deletes the row, and a failure is reported', async () => {
    await leaveLeaderboard('user-1');
    expect(table.delete).toHaveBeenCalledTimes(1);
    table.insert.mockResolvedValueOnce({ error: { message: 'denied' } } as never);
    await expect(joinLeaderboard('user-1', null)).rejects.toThrow('denied');
  });

  it('reads your own membership, and none when there is no row', async () => {
    expect(await fetchMembership('user-1')).toBeNull();
  });
});
