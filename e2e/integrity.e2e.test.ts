import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * MIGRATION 0013, ATTACKED AS AN ORDINARY PLAYER. Test project only (`npm run verify:supabase`).
 * Disposable accounts and the anon key; never a service-role key. Every forgery below must be
 * REFUSED by Postgres, and the one legitimate path must still work. Needs 0013 applied and the
 * updated `herbdex-action` deployed on TEST.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (URL && URL.includes('vygiamigomwlvnwkryyl')) {
  throw new Error('e2e/integrity.e2e.test.ts refuses to run against the production project.');
}
const STAMP = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const HERB = 'taraxacum-officinale';

async function account(tag: string): Promise<{ client: SupabaseClient; id: string }> {
  const client = createClient(URL!, KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `plantdex-e2e-integrity-${tag}-${STAMP}@mailinator.com`;
  const password = `Test-Passw0rd-${Math.random().toString(36).slice(2, 10)}`;
  const up = await client.auth.signUp({ email, password });
  if (up.error) throw new Error(`signUp failed: ${up.error.message}`);
  const inn = await client.auth.signInWithPassword({ email, password });
  if (inn.error || !inn.data.user) throw new Error(`signIn failed: ${inn.error?.message}`);
  return { client, id: inn.data.user.id };
}

describe.skipIf(!(URL && KEY))('leaderboard integrity (TEST) — forged progress is refused', () => {
  let alice: { client: SupabaseClient; id: string };
  let bob: { client: SupabaseClient; id: string };
  const points = async (who: { client: SupabaseClient }) => {
    const { data, error } = await who.client.rpc('leaderboard_standings', { p_limit: 200 });
    if (error) throw new Error(error.message);
    return (data as { is_self: boolean; points: number }[]).find((r) => r.is_self)?.points ?? null;
  };

  beforeAll(async () => {
    [alice, bob] = await Promise.all([account('a'), account('b')]);
    const join = await alice.client.from('leaderboard_participants').insert({ user_id: alice.id, region_id: null });
    if (join.error) throw new Error(join.error.message);
  }, 60_000);

  it('an invented species is refused, and a real one is accepted exactly once', async () => {
    const fake = await alice.client.from('discoveries').insert({ user_id: alice.id, herb_id: `invented-${STAMP}` });
    expect(fake.error).not.toBeNull();
    const real = await alice.client.from('discoveries').insert({ user_id: alice.id, herb_id: HERB });
    expect(real.error).toBeNull();
    const again = await alice.client.from('discoveries').insert({ user_id: alice.id, herb_id: HERB });
    expect(again.error).not.toBeNull();
    expect(await points(alice)).toBe(50);
  });

  it('twenty simultaneous copies of one discovery still pay once', async () => {
    await Promise.all(Array.from({ length: 20 }, () => alice.client.from('discoveries').upsert({ user_id: alice.id, herb_id: HERB }, { onConflict: 'user_id,herb_id', ignoreDuplicates: true })));
    expect(await points(alice)).toBe(50);
  });

  it.each([
    ['research_completions', { task_id: 'collection:backyard' }],
    ['research_completions', { task_id: `collection:invented-${STAMP}` }],
    ['mastered', { herb_id: HERB }],
  ])('a direct insert into %s is refused, valid id or not', async (table, row) => {
    const { error } = await alice.client.from(table).insert({ user_id: alice.id, ...row });
    expect(error).not.toBeNull();
    expect(await points(alice)).toBe(50);
  });

  it('an invented achievement and an invented learned card are refused', async () => {
    expect((await alice.client.from('unlocked_achievements').insert({ user_id: alice.id, achievement_id: `fake-${STAMP}` })).error).not.toBeNull();
    expect((await alice.client.from('learned').insert({ user_id: alice.id, herb_id: `fake-${STAMP}` })).error).not.toBeNull();
  });

  it('a backdated sighting takes the server clock, and a made-up photo path scores nothing', async () => {
    const id = `sighting_${STAMP}_x`;
    const ins = await alice.client.from('sightings').insert({ id, user_id: alice.id, herb_id: HERB, date: '2020-01-01', notes: 'x', created_at: '2020-01-01T00:00:00Z', photo_path: `${alice.id}/not-a-real-file.jpg` });
    expect(ins.error).toBeNull();
    const { data } = await alice.client.from('sightings').select('created_at').eq('id', id).single();
    expect(Date.now() - new Date((data as { created_at: string }).created_at).getTime()).toBeLessThan(5 * 60_000);
    expect(await points(alice)).toBe(50); // short note, no real photograph: no journal points
    const foreign = await alice.client.from('sightings').insert({ id: `${id}2`, user_id: alice.id, herb_id: HERB, date: '2020-01-01', photo_path: `${bob.id}/theirs.jpg` });
    expect(foreign.error).not.toBeNull();
  });

  it('one player cannot write progress for another', async () => {
    expect((await bob.client.from('discoveries').insert({ user_id: alice.id, herb_id: 'plantago-major' })).error).not.toBeNull();
    expect(await points(alice)).toBe(50);
  });

  it('an invisible or impersonating display name is refused; an ordinary one is kept', async () => {
    expect((await alice.client.from('profiles').upsert({ user_id: alice.id, display_name: 'Fern​Friend' })).error).not.toBeNull();
    expect((await alice.client.from('profiles').upsert({ user_id: alice.id, display_name: 'PlantDex Admin' })).error).not.toBeNull();
    expect((await alice.client.from('profiles').upsert({ user_id: alice.id, display_name: 'Fern Friend' })).error).toBeNull();
  });

  it('the legitimate path still works: herbdex-action answers and forges nothing', async () => {
    const { data, error } = await alice.client.functions.invoke('herbdex-action', { body: { dailyTaskIds: [] } });
    expect(error).toBeNull();
    expect(Array.isArray((data as { masteredIds: unknown }).masteredIds)).toBe(true);
    expect(await points(alice)).toBe(50);
  });
});
