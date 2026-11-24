import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * `confirm_scan` (migration 0014), ATTACKED LIVE. TEST PROJECT ONLY.
 *
 * Skipped without credentials (so `npm test` and CI never run it) and refuses to run against
 * production or any project but the test one: `e2e/guard.setup.ts` allow-lists the test ref for
 * every live suite, and the check below repeats it so this file is safe on its own.
 *
 * Disposable accounts only (a fresh Alice and Bob per run, each on their own client). Every
 * scan id carries the run's stamp, so reruns never collide, and `afterAll` deletes what was
 * written. The function must already exist on the target (apply 0014 to TEST first); if it does
 * not, the first test fails with PGRST202 rather than passing quietly.
 */
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const configured = Boolean(SB_URL && KEY);

const TEST_REF = 'vgjehmwcpavflbfhbbrp';
if (SB_URL && new URL(SB_URL).hostname !== `${TEST_REF}.supabase.co`) {
  throw new Error('e2e/scans-confirm.e2e.test.ts runs against the TEST project only.');
}

const STAMP = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const CARD_A = 'oxalis-stricta';
const CARD_B = 'taraxacum-officinale';

type Row = Record<string, unknown>;

function freshClient(): SupabaseClient {
  return createClient(SB_URL!, KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signUpAndIn(client: SupabaseClient, tag: string): Promise<User> {
  const email = `plantdex-e2e-confirm-${tag}-${STAMP}@mailinator.com`;
  const password = `Test-Passw0rd-${Math.random().toString(36).slice(2, 10)}`;
  const { error: signUpError } = await client.auth.signUp({ email, password });
  if (signUpError) throw new Error(`signUp failed: ${signUpError.message}`);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`signIn failed: ${error?.message}`);
  return data.user;
}

const confirmArgs = (scanId: string, herbId: string | null, over: Row = {}) => ({
  p_scan_id: scanId,
  p_herb_id: herbId,
  p_scientific_name: 'Oxalis stricta',
  p_probability: 0.42,
  p_taxon_rank: 'species',
  p_eligibility: 'exact',
  p_species_confidence: 'likely',
  ...over,
});

describe.skipIf(!configured)('confirm_scan, live (TEST project)', () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  let anon: SupabaseClient;
  let aliceUser: User;
  let bobUser: User;
  const ids: string[] = [];

  /** Insert an unconfirmed scan for a user and return its id and the row as stored. */
  async function seed(client: SupabaseClient, user: User, tag: string) {
    const id = `scan_e2e_${STAMP}_${tag}`;
    const { error } = await client.from('scans').insert({
      id,
      user_id: user.id,
      top_scientific_name: 'Oxalis dillenii',
      top_herb_id: null,
      confidence: 0.77,
      outcome: 'uncertain',
      photo_path: null,
    });
    expect(error, JSON.stringify(error)).toBeNull();
    ids.push(id);
    return id;
  }

  async function read(client: SupabaseClient, id: string): Promise<Row | null> {
    const { data, error } = await client.from('scans').select('*').eq('id', id).maybeSingle();
    expect(error, JSON.stringify(error)).toBeNull();
    return data as Row | null;
  }

  /** Everything the function must never touch. */
  const untouched = (r: Row) => ({
    id: r.id, user_id: r.user_id, created_at: r.created_at, photo_path: r.photo_path,
    top_scientific_name: r.top_scientific_name, top_herb_id: r.top_herb_id,
    confidence: r.confidence, outcome: r.outcome,
  });

  beforeAll(async () => {
    alice = freshClient();
    bob = freshClient();
    anon = freshClient();
    aliceUser = await signUpAndIn(alice, 'alice');
    bobUser = await signUpAndIn(bob, 'bob');
  }, 90_000);

  afterAll(async () => {
    // Users need a service-role key to remove, which this suite deliberately never holds.
    for (const [client, user] of [[alice, aliceUser], [bob, bobUser]] as const) {
      if (!client || !user) continue;
      await client.from('scans').delete().eq('user_id', user.id);
      await client.auth.signOut();
    }
  }, 60_000);

  it('confirms once: true, the six confirmed_* columns set, nothing else changed', async () => {
    const id = await seed(alice, aliceUser, 'once');
    const before = (await read(alice, id))!;
    const { data, error } = await alice.rpc('confirm_scan', confirmArgs(id, CARD_A));
    expect(error, JSON.stringify(error)).toBeNull();
    expect(data).toBe(true);
    const after = (await read(alice, id))!;
    expect(after.confirmed_herb_id).toBe(CARD_A);
    expect(after.confirmed_scientific_name).toBe('Oxalis stricta');
    expect(Number(after.confirmed_probability)).toBeCloseTo(0.42);
    expect(after.confirmed_taxon_rank).toBe('species');
    expect(after.confirmed_eligibility).toBe('exact');
    expect(after.confirmed_species_confidence).toBe('likely');
    expect(untouched(after)).toEqual(untouched(before));
  });

  it('the same card again is true (a retry after a lost response) and changes nothing', async () => {
    const id = await seed(alice, aliceUser, 'same');
    await alice.rpc('confirm_scan', confirmArgs(id, CARD_A));
    const first = (await read(alice, id))!;
    const { data, error } = await alice.rpc('confirm_scan', confirmArgs(id, CARD_A, { p_probability: 0.99 }));
    expect(error).toBeNull();
    expect(data).toBe(true);
    expect(await read(alice, id)).toEqual(first);
  });

  it('a different card is false and the first confirmation stands', async () => {
    const id = await seed(alice, aliceUser, 'other');
    await alice.rpc('confirm_scan', confirmArgs(id, CARD_A));
    const first = (await read(alice, id))!;
    const { data, error } = await alice.rpc('confirm_scan', confirmArgs(id, CARD_B));
    expect(error).toBeNull();
    expect(data).toBe(false);
    expect(await read(alice, id)).toEqual(first);
  });

  it("another user's scan: false, and the row is untouched", async () => {
    const id = await seed(alice, aliceUser, 'foreign');
    const before = (await read(alice, id))!;
    const { data, error } = await bob.rpc('confirm_scan', confirmArgs(id, CARD_A));
    expect(error).toBeNull();
    expect(data).toBe(false);
    expect(await read(alice, id)).toEqual(before);
    expect((await read(alice, id))!.confirmed_herb_id).toBeNull();
  });

  it('an unknown scan id is false', async () => {
    const { data, error } = await alice.rpc('confirm_scan', confirmArgs(`scan_e2e_${STAMP}_missing`, CARD_A));
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it.each([[null], [''], ['   ']])('a null or blank card id (%j) is false and the row is untouched', async (herb) => {
    const id = await seed(alice, aliceUser, `blank${String(herb).length}${herb === null ? 'n' : 'b'}`);
    const before = (await read(alice, id))!;
    const { data, error } = await alice.rpc('confirm_scan', confirmArgs(id, herb));
    expect(error).toBeNull();
    expect(data).toBe(false);
    expect(await read(alice, id)).toEqual(before);
  });

  it.each([[1.5], [-0.1]])('probability %s is out of range: false, row untouched', async (p) => {
    const id = await seed(alice, aliceUser, `prob${p > 1 ? 'hi' : 'lo'}`);
    const before = (await read(alice, id))!;
    const { data, error } = await alice.rpc('confirm_scan', confirmArgs(id, CARD_A, { p_probability: p }));
    expect(error).toBeNull();
    expect(data).toBe(false);
    expect(await read(alice, id)).toEqual(before);
  });

  it('two parallel confirmations of different cards: exactly one wins and the row is never unconfirmed', async () => {
    const id = await seed(alice, aliceUser, 'race');
    const [a, b] = await Promise.all([
      alice.rpc('confirm_scan', confirmArgs(id, CARD_A)),
      alice.rpc('confirm_scan', confirmArgs(id, CARD_B)),
    ]);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    expect([a.data, b.data].filter((v) => v === true)).toHaveLength(1);
    expect([a.data, b.data].filter((v) => v === false)).toHaveLength(1);
    const row = (await read(alice, id))!;
    const winner = a.data === true ? CARD_A : CARD_B;
    expect(row.confirmed_herb_id).toBe(winner);
    // The row is still there, still confirmed, on a second look as well.
    expect((await read(alice, id))!.confirmed_herb_id).toBe(winner);
  });

  it('anon is refused (permission denied), and nothing is written', async () => {
    const id = await seed(alice, aliceUser, 'anon');
    const { data, error } = await anon.rpc('confirm_scan', confirmArgs(id, CARD_A));
    expect(data === true).toBe(false);
    expect(error, 'anon must not be able to execute confirm_scan').not.toBeNull();
    expect((await read(alice, id))!.confirmed_herb_id).toBeNull();
  });
});
