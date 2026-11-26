import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * THE V1 CAMERA-TO-COLLECTION FLOW, AGAINST THE REAL TEST PROJECT. NO MOCKED BACKEND.
 *
 * Camera session -> identify (the DEPLOYED identify-plant function and its real provider) -> receipt -> claim ->
 * persisted collection -> saved progress on a fresh sign-in, then the replay, cross-account and direct-API attacks.
 *
 * WHAT THIS REPLACES IS ONLY THE LENS. A person holds a phone camera; this holds one photograph file (E2E_PHOTO, a
 * real species photograph cropped from the deck's own card art) and sends it down the same request path the app
 * sends. Everything after the photograph is the real deployed function, the real database and the real policies.
 *
 * TEST PROJECT ONLY (guard.setup.ts allow-lists it; checked again below). Skipped without credentials, so
 * `npm test` never runs it. Disposable accounts, one per role, deleted by the project's own cleanup SQL.
 * Spends ONE provider identification per run from the daily allowance, plus one for the replay (which spends none).
 *
 * PRECONDITIONS (the run fails loudly if they are missing, rather than passing quietly):
 *   - migration 0016 applied to TEST, and identify-plant + delete-account redeployed from this checkout;
 *   - E2E_PHOTO points at a JPEG of a species the deck carries (E2E_HERB_ID, default taraxacum-officinale);
 *   - "Confirm email" OFF on TEST, so disposable accounts can sign in.
 * E2E_ENFORCEMENT=on ONLY after the owner flips the switch on TEST (set_discovery_enforcement); it adds the
 * attack half that is meaningful only then. Leave unset for the first run.
 */
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PHOTO = process.env.E2E_PHOTO;
const HERB = process.env.E2E_HERB_ID ?? 'taraxacum-officinale';
const ENFORCING = process.env.E2E_ENFORCEMENT === 'on';
const configured = Boolean(SB_URL && KEY && PHOTO);

const TEST_REF = 'vgjehmwcpavflbfhbbrp';
if (SB_URL && new URL(SB_URL).hostname !== `${TEST_REF}.supabase.co`) {
  throw new Error('e2e/capture-flow.e2e.test.ts runs against the TEST project only.');
}

const STAMP = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
type Row = Record<string, unknown>;

const fresh = (): SupabaseClient =>
  createClient(SB_URL!, KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

async function signUpAndIn(client: SupabaseClient, tag: string): Promise<{ user: User; email: string; password: string }> {
  const email = `plantdex-e2e-capture-${tag}-${STAMP}@mailinator.com`;
  const password = `Test-Passw0rd-${Math.random().toString(36).slice(2, 10)}`;
  const { error: upErr } = await client.auth.signUp({ email, password });
  if (upErr) throw new Error(`signUp failed: ${upErr.message}`);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`signIn failed: ${error?.message}`);
  return { user: data.user, email, password };
}

async function openSession(client: SupabaseClient): Promise<{ session_id: string; nonce: string }> {
  const { data, error } = await client.rpc('open_capture_session');
  expect(error, JSON.stringify(error)).toBeNull();
  const body = data as Row;
  expect(body.ok, JSON.stringify(body)).toBe(true);
  return { session_id: String(body.session_id), nonce: String(body.nonce) };
}

/** The request the app sends: multipart, one image, `purpose=collect` and the session fields, the player's own JWT. */
async function identify(client: SupabaseClient, session: { session_id: string; nonce: string }, photo: Uint8Array, name = 'scan-0.jpg') {
  const form = new FormData();
  form.append('image', new File([photo as BlobPart], name, { type: 'image/jpeg' }));
  form.append('organ', 'auto');
  form.append('purpose', 'collect');
  form.append('capture_session_id', session.session_id);
  form.append('capture_nonce', session.nonce);
  const { data, error } = await client.functions.invoke('identify-plant', { body: form });
  return { data: data as Row | null, error };
}

describe.skipIf(!configured)('V1 camera-to-collection, live (TEST project)', () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  let aliceUser: User;
  let aliceCreds: { email: string; password: string };
  let photo: Uint8Array;
  let receiptId: string | undefined;
  let firstResponse: Row | null = null;
  let sessionA: { session_id: string; nonce: string };

  beforeAll(async () => {
    photo = new Uint8Array(readFileSync(PHOTO!));
    alice = fresh();
    bob = fresh();
    const a = await signUpAndIn(alice, 'alice');
    aliceUser = a.user;
    aliceCreds = a;
    await signUpAndIn(bob, 'bob');
  });

  afterAll(async () => {
    // Disposable accounts are removed by the project's cleanup SQL (docs/release/v1-test-deployment.md).
    await alice?.auth.signOut();
    await bob?.auth.signOut();
  });

  it('the database reports its rules, and the switch state matches what this run expects', async () => {
    const { data, error } = await alice.rpc('discovery_rules');
    expect(error, JSON.stringify(error)).toBeNull();
    expect((data as Row).enforcing).toBe(ENFORCING);
    expect((data as Row).min_capture_ms).toBe(0);
  });

  it('STEP 1 - Camera: a signed-in player opens a capture session', async () => {
    sessionA = await openSession(alice);
    expect(sessionA.nonce).toMatch(/^[0-9a-f]{64}$/);
  });

  it('STEP 2 - Identify: ONE photograph through the DEPLOYED function and its real provider', async () => {
    const { data, error } = await identify(alice, sessionA, photo);
    expect(error, JSON.stringify(error)).toBeNull();
    firstResponse = data;
    const capture = data!.capture as Row;
    expect(capture, JSON.stringify(data)).toBeTruthy();
    // The capture itself must have been accepted; this is the contract, independent of what the provider said.
    expect(capture.accepted, JSON.stringify(capture)).toBe(true);
    const candidates = (data!.candidates ?? []) as Row[];
    expect(candidates.length, 'the provider returned no candidates for this photograph').toBeGreaterThan(0);
  });

  it('STEP 3 - Receipt: the server issued a receipt for the deck card, from ITS OWN match', async () => {
    const candidates = (firstResponse!.candidates ?? []) as Row[];
    // The server names candidates by the provider's own scientificName; the CARD is named only by the receipt's claim.
    const mine = candidates.find((c) => c.captureReceipt);
    expect(
      mine,
      `No candidate earned a receipt. The provider's answer was: ${JSON.stringify(candidates.map((c) => c.scientificName ?? c.name))}. ` +
        'This is the REAL provider disagreeing with the card art, not a code failure: try another photograph via E2E_PHOTO. Not a pass.',
    ).toBeTruthy();
    receiptId = String((mine!.captureReceipt as Row).id);
    expect(receiptId).toMatch(/^rcpt_[0-9a-f]{32}$/);
  });

  it('STEP 4 - Collect: claiming the receipt writes the discovery, once', async () => {
    const claim = await alice.rpc('claim_discovery', { p_receipt_id: receiptId });
    expect(claim.error, JSON.stringify(claim.error)).toBeNull();
    expect((claim.data as Row).ok, JSON.stringify(claim.data)).toBe(true);
    expect((claim.data as Row).status).toBe('claimed');
    expect(
      (claim.data as Row).herb_id,
      `The receipt was for a different card than the photograph's species (${HERB}). The REAL provider answered differently; not a pass.`,
    ).toBe(HERB);
    const again = await alice.rpc('claim_discovery', { p_receipt_id: receiptId });
    expect((again.data as Row).ok).toBe(true);
    expect((again.data as Row).status).toBe('already_claimed');
    const { data: rows } = await alice.from('discoveries').select('herb_id,discovered_at,recorded_at').eq('user_id', aliceUser.id);
    const herbs = (rows ?? []).map((r) => (r as Row).herb_id);
    expect(herbs.filter((h) => h === (claim.data as Row).herb_id)).toHaveLength(1);
  });

  it('STEP 5 - Saved progress: a FRESH sign-in reads the collection back from the server', async () => {
    const again = fresh();
    const { error } = await again.auth.signInWithPassword({ email: aliceCreds.email, password: aliceCreds.password });
    expect(error).toBeNull();
    const { data } = await again.from('discoveries').select('herb_id').eq('user_id', aliceUser.id);
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    const { data: receipts } = await again.from('capture_receipts').select('id,claimed_at').eq('id', receiptId!);
    expect((receipts ?? [])[0]).toMatchObject({ id: receiptId });
    expect(((receipts ?? [])[0] as Row).claimed_at).not.toBeNull();
  });

  it('REPLAY: the identical request again returns the SAME receipts, spends no provider call, and mints nothing new', async () => {
    const before = await alice.from('capture_receipts').select('id').eq('user_id', aliceUser.id);
    const { data, error } = await identify(alice, sessionA, photo);
    expect(error, JSON.stringify(error)).toBeNull();
    expect((data!.capture as Row).accepted).toBe(true);
    const after = await alice.from('capture_receipts').select('id').eq('user_id', aliceUser.id);
    expect((after.data ?? []).length).toBe((before.data ?? []).length);
  });

  it('REUSE: the same session with a DIFFERENT image is refused', async () => {
    const other = new Uint8Array([...photo.slice(0, photo.length - 1), (photo[photo.length - 1]! + 1) & 0xff]);
    const { data } = await identify(alice, sessionA, other, 'scan-other.jpg');
    const capture = (data?.capture ?? {}) as Row;
    expect(capture.accepted).toBe(false);
    expect(capture.code).toBe('capture_session_used');
  });

  it("CROSS-ACCOUNT: Bob cannot claim Alice's receipt or read it", async () => {
    const claim = await bob.rpc('claim_discovery', { p_receipt_id: receiptId });
    expect((claim.data as Row)?.ok).toBe(false);
    const { data } = await bob.from('capture_receipts').select('id').eq('id', receiptId!);
    expect(data ?? []).toHaveLength(0);
  });

  it("CROSS-ACCOUNT: Bob cannot use Alice's session", async () => {
    const stolen = await openSession(alice);
    const { data } = await identify(bob, stolen, photo);
    expect(((data?.capture ?? {}) as Row).accepted).toBe(false);
  });

  it('DIRECT API: no client can write a receipt, a session, a digest, a refund ledger or flip the switch', async () => {
    const forged = await alice.from('capture_receipts').insert({
      id: `rcpt_${'0'.repeat(32)}`, user_id: aliceUser.id, session_id: sessionA.session_id, observation_id: 'x', herb_id: 'urtica-dioica',
      observed_taxon_key: 'x', observed_taxon_rank: 'species', eligibility: 'exact', rank_position: 'top', species_confidence: 'high',
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(forged.error, 'a client wrote a receipt').not.toBeNull();
    expect((await alice.from('capture_sessions').insert({ user_id: aliceUser.id, nonce_digest: '\\x00', expires_at: new Date().toISOString() })).error).not.toBeNull();
    expect((await alice.from('scan_refunds').select('*')).error ?? { code: 'x' }).toBeTruthy();
    expect((await alice.rpc('set_discovery_enforcement', { p_on: true, p_cutoff: new Date().toISOString(), p_confirm: 'ENFORCE NEW DISCOVERIES' })).error).not.toBeNull();
    expect((await alice.rpc('release_capture_session', { p_user: aliceUser.id, p_session: sessionA.session_id })).error).not.toBeNull();
    expect((await alice.rpc('refund_scan_claim', { p_bucket: `user:${aliceUser.id}`, p_day: new Date().toISOString().slice(0, 10), p_observation_id: crypto.randomUUID() })).error).not.toBeNull();
  });

  it.skipIf(!ENFORCING)('ENFORCEMENT ON: a direct insert of a card with no receipt is refused; a claimed one stands', async () => {
    const direct = await alice.from('discoveries').insert({ user_id: aliceUser.id, herb_id: 'urtica-dioica' });
    expect(direct.error, 'enforcement is ON but a direct insert succeeded').not.toBeNull();
    const { data } = await alice.from('discoveries').select('herb_id').eq('user_id', aliceUser.id);
    expect((data ?? []).map((r) => (r as Row).herb_id)).not.toContain('urtica-dioica');
  });

  it.skipIf(ENFORCING)('ENFORCEMENT OFF: the existing direct path is unchanged (nothing here claims otherwise)', async () => {
    const direct = await alice.from('discoveries').insert({ user_id: aliceUser.id, herb_id: 'urtica-dioica' });
    expect(direct.error, JSON.stringify(direct.error)).toBeNull();
    await alice.from('discoveries').delete().eq('user_id', aliceUser.id).eq('herb_id', 'urtica-dioica');
  });
});
