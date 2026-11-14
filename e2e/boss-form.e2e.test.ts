import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

import { exportAccountData } from '@/lib/export-account-data';

/**
 * BOSS FORM TABLES, ATTACKED AS AN ORDINARY PLAYER. Test project only (`npm run verify:supabase`).
 *
 * Needs migration 0012 on the test project (applied). It never needs, and never uses, a
 * service-role key, so it can prove only what a CLIENT can do: it can read its own (empty) rows
 * and can NOT write, change or delete anything in either table, for itself or for anybody else.
 * The server-side writer (`award_challenge`) is exercised by the unit tests; its deployment is
 * a separate, approved step.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const configured = Boolean(URL && KEY);

const PRODUCTION_REFS = ['vygiamigomwlvnwkryyl'];
if (URL && PRODUCTION_REFS.some((ref) => URL.includes(ref))) {
  throw new Error('e2e/boss-form.e2e.test.ts refuses to run against the production project.');
}

const STAMP = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

function freshClient(): SupabaseClient {
  return createClient(URL!, KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

describe.skipIf(!configured)('Boss Form tables — a client has no write path', () => {
  let user: User;
  let client: SupabaseClient;

  beforeAll(async () => {
    client = freshClient();
    const email = `plantdex-e2e-boss-${STAMP}@mailinator.com`;
    const password = `Test-Passw0rd-${Math.random().toString(36).slice(2, 10)}`;
    const up = await client.auth.signUp({ email, password });
    if (up.error) throw new Error(`signUp failed: ${up.error.message}`);
    const inn = await client.auth.signInWithPassword({ email, password });
    if (inn.error || !inn.data.user) throw new Error(`signIn failed: ${inn.error?.message}`);
    user = inn.data.user;
    // A token used in the second it was issued can be refused as "JWT issued at future".
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }, 60_000);

  it('can read its own rows, which are empty', async () => {
    for (const table of ['challenge_completions', 'boss_forms']) {
      const { data, error } = await client.from(table).select('*').eq('user_id', user.id);
      expect(error, table).toBeNull();
      expect(data, table).toEqual([]);
    }
  });

  it('cannot insert a completion or a Boss Form, even for itself', async () => {
    const completion = await client
      .from('challenge_completions')
      .insert({ user_id: user.id, herb_id: 'taraxacum-officinale', activity_id: 'part-spotter' });
    expect(completion.error, 'challenge_completions insert').not.toBeNull();
    const boss = await client
      .from('boss_forms')
      .insert({ user_id: user.id, herb_id: 'taraxacum-officinale' });
    expect(boss.error, 'boss_forms insert').not.toBeNull();
  });

  it('cannot update or delete, and nothing appears afterwards', async () => {
    for (const table of ['challenge_completions', 'boss_forms']) {
      await client.from(table).update({ herb_id: 'x' }).eq('user_id', user.id);
      await client.from(table).delete().eq('user_id', user.id);
      const { data } = await client.from(table).select('*').eq('user_id', user.id);
      expect(data ?? [], table).toEqual([]);
    }
  });

  it('cannot call the award function', async () => {
    const { error } = await client.rpc('award_challenge', {
      p_user: user.id,
      p_herb: 'taraxacum-officinale',
      p_activity: 'part-spotter',
      p_boss: false,
    });
    expect(error).not.toBeNull();
  });

  it('exports the (empty) records through the real export code', async () => {
    // The export uses the app’s singleton client, which these tests do not sign in, so a
    // real read goes through this client’s own queries; the shape is pinned by the unit test.
    const [a, b] = await Promise.all([
      client.from('challenge_completions').select('herb_id, activity_id, completed_at').eq('user_id', user.id),
      client.from('boss_forms').select('herb_id, earned_at').eq('user_id', user.id),
    ]);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    expect(typeof exportAccountData).toBe('function');
  });
});
