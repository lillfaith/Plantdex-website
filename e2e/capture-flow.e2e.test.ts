import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
/** Disposable, already-confirmed accounts created by the workflow's admin step; absent on a manual run (then the suite signs up). */
const PROVISIONED = {
  alice: { email: process.env.E2E_ALICE_EMAIL, password: process.env.E2E_ALICE_PASSWORD },
  bob: { email: process.env.E2E_BOB_EMAIL, password: process.env.E2E_BOB_PASSWORD },
};
const EXPIRED_RECEIPT = process.env.E2E_EXPIRED_RECEIPT_ID;
const NONPLANT_PHOTO = process.env.E2E_NONPLANT_PHOTO;
const EVIDENCE_FILE = process.env.E2E_EVIDENCE_FILE;
const CHECKPOINT_DIR = process.env.E2E_CHECKPOINT_DIR;

/**
 * Ask the workflow for a PRIVILEGED read (quota counters have no client policy) without holding any credential: write
 * `<name>.req`, wait for `<name>.ack`, return what the helper recorded. Absent a checkpoint directory (a manual run) it is a no-op.
 */
async function checkpoint(name: string): Promise<Row | null> {
  if (!CHECKPOINT_DIR) return null;
  mkdirSync(CHECKPOINT_DIR, { recursive: true });
  writeFileSync(`${CHECKPOINT_DIR}/${name}.req`, '');
  for (let i = 0; i < 100; i++) {
    if (existsSync(`${CHECKPOINT_DIR}/${name}.ack`)) {
      return JSON.parse(readFileSync(`${CHECKPOINT_DIR}/${name}.json`, 'utf8')) as Row;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`checkpoint ${name} was not acknowledged: the workflow's counter helper is not running`);
}
/** Non-secret facts the run observed, written for the run summary. Never a password, key or token. */
const evidence: Record<string, unknown> = {};

const TEST_REF = 'vgjehmwcpavflbfhbbrp';
if (SB_URL && new URL(SB_URL).hostname !== `${TEST_REF}.supabase.co`) {
  throw new Error('e2e/capture-flow.e2e.test.ts runs against the TEST project only.');
}

const STAMP = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
type Row = Record<string, unknown>;

const fresh = (): SupabaseClient =>
  createClient(SB_URL!, KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

async function signUpAndIn(client: SupabaseClient, tag: 'alice' | 'bob'): Promise<{ user: User; email: string; password: string }> {
  const given = PROVISIONED[tag];
  if (given.email && given.password) {
    const { data, error } = await client.auth.signInWithPassword({ email: given.email, password: given.password });
    if (error || !data.user) throw new Error(`signIn failed for the provisioned ${tag} account: ${error?.message}`);
    return { user: data.user, email: given.email, password: given.password };
  }
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
  if (error) {
    // A refusal (409), a quota answer (429) or a validation answer (400) is a non-2xx: read its JSON body so tests can assert on it.
    const res = (error as { context?: Response }).context;
    if (res) return { data: ((await res.clone().json().catch(() => null)) as Row | null), error, status: res.status };
  }
  return { data: data as Row | null, error, status: 200 };
}

/** A collect request with NO photograph at all, sent the way the app would: validation must refuse it before any allowance is charged. */
async function identifyWithoutPhoto(client: SupabaseClient, session: { session_id: string; nonce: string }) {
  const form = new FormData();
  form.append('purpose', 'collect');
  form.append('capture_session_id', session.session_id);
  form.append('capture_nonce', session.nonce);
  const { data, error } = await client.functions.invoke('identify-plant', { body: form });
  const res = (error as { context?: Response } | null)?.context;
  return { data: res ? ((await res.clone().json().catch(() => null)) as Row | null) : (data as Row | null), status: res?.status ?? 200 };
}

describe.skipIf(!configured)('V1 camera-to-collection, live (TEST project)', () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  let bobUser: User;
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
    bobUser = (await signUpAndIn(bob, 'bob')).user;
    evidence.accounts = { provisioned: Boolean(PROVISIONED.alice.email), alice: aliceUser.id, bob: bobUser.id };
  });

  afterAll(async () => {
    // Disposable accounts are removed by the project's cleanup SQL (docs/release/v1-test-deployment.md).
    await alice?.auth.signOut();
    await bob?.auth.signOut();
    if (EVIDENCE_FILE) writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2));
  });

  it('the database reports its rules, and the switch state matches what this run expects', async () => {
    const { data, error } = await alice.rpc('discovery_rules');
    expect(error, JSON.stringify(error)).toBeNull();
    expect((data as Row).enforcing).toBe(ENFORCING);
    expect((data as Row).min_capture_ms).toBe(0);
    evidence.rules = data;
  });

  it('STEP 1 - Camera: a signed-in player opens a capture session', async () => {
    sessionA = await openSession(alice);
    expect(sessionA.nonce).toMatch(/^[0-9a-f]{64}$/);
    evidence.session = { id: sessionA.session_id, nonceIsHex64: true };
  });

  it('STEP 2 - Identify: ONE photograph through the DEPLOYED function and its real provider', async () => {
    evidence.cpBeforeIdentify = await checkpoint('before-identify');
    const { data, error } = await identify(alice, sessionA, photo);
    expect(error, JSON.stringify(error)).toBeNull();
    evidence.cpAfterIdentify = await checkpoint('after-identify');
    firstResponse = data;
    const capture = data!.capture as Row;
    expect(capture, JSON.stringify(data)).toBeTruthy();
    // The capture itself must have been accepted; this is the contract, independent of what the provider said.
    expect(capture.accepted, JSON.stringify(capture)).toBe(true);
    const candidates = (data!.candidates ?? []) as Row[];
    expect(candidates.length, 'the provider returned no candidates for this photograph').toBeGreaterThan(0);
    evidence.provider = {
      name: data!.provider,
      observationId: data!.observationId,
      candidates: candidates.slice(0, 5).map((c) => ({ scientificName: c.scientificName, score: c.score, hasReceipt: Boolean(c.captureReceipt) })),
    };
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
    evidence.receipt = { id: receiptId, ...(mine!.captureReceipt as Row) };
    // The receipt rows are the player's own (RLS select): they say WHICH rule earned each receipt, live.
    const rows = await alice.from('capture_receipts').select('herb_id,observed_taxon_key,eligibility,rank_position,species_confidence').eq('observation_id', String(firstResponse!.observationId));
    evidence.receiptRows = rows.data;
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
    evidence.claim = { first: claim.data, second: again.data, discoveryRowsForCard: herbs.filter((h) => h === HERB).length };
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
    evidence.persistence = { discoveriesAfterFreshSignIn: (data ?? []).map((r) => (r as Row).herb_id), receiptClaimedAt: ((receipts ?? [])[0] as Row).claimed_at };
  });

  it('REPLAY: the identical request again returns the SAME receipts, spends no provider call, and mints nothing new', async () => {
    const before = await alice.from('capture_receipts').select('id').eq('user_id', aliceUser.id);
    const cpBefore = await checkpoint('before-replay');
    const { data, error } = await identify(alice, sessionA, photo);
    expect(error, JSON.stringify(error)).toBeNull();
    expect((data!.capture as Row).accepted).toBe(true);
    const cpAfter = await checkpoint('after-replay');
    evidence.replay = { response: { replay: (data!.capture as Row).replay, candidates: ((data!.candidates ?? []) as Row[]).length }, quotaBefore: cpBefore, quotaAfter: cpAfter };
    if (cpBefore && cpAfter) {
      expect(cpAfter.alice_quota, 'a replay must not spend the caller allowance').toBe(cpBefore.alice_quota);
      // The shared counter is recorded, not asserted: any other TEST player scanning in this one-second window would move it.
    }
    const after = await alice.from('capture_receipts').select('id').eq('user_id', aliceUser.id);
    expect((after.data ?? []).length).toBe((before.data ?? []).length);
  });

  it('REUSE: the same session with a DIFFERENT image is refused BEFORE any allowance is charged and before the provider', async () => {
    const other = new Uint8Array([...photo.slice(0, photo.length - 1), (photo[photo.length - 1]! + 1) & 0xff]);
    const cpBefore = await checkpoint('before-reuse');
    const { data, status } = await identify(alice, sessionA, other, 'scan-other.jpg');
    const cpAfter = await checkpoint('after-reuse');
    expect(status, JSON.stringify(data)).toBe(409);
    const capture = (data?.capture ?? {}) as Row;
    expect(capture.accepted).toBe(false);
    expect(capture.code).toBe('capture_session_used');
    expect(data?.candidates, 'a refused capture must not return an identification (no provider call)').toBeUndefined();
    evidence.refusedReuse = { status, code: capture.code, quotaBefore: cpBefore, quotaAfter: cpAfter };
    if (cpBefore && cpAfter) expect(cpAfter.alice_quota, 'a refused reuse must not spend the caller allowance').toBe(cpBefore.alice_quota);
  });

  it("CROSS-ACCOUNT: Bob cannot claim Alice's receipt or read it", async () => {
    const claim = await bob.rpc('claim_discovery', { p_receipt_id: receiptId });
    expect((claim.data as Row)?.ok).toBe(false);
    const { data } = await bob.from('capture_receipts').select('id').eq('id', receiptId!);
    expect(data ?? []).toHaveLength(0);
  });

  it("CROSS-ACCOUNT: Bob cannot use Alice's session; nobody is charged and Alice's session is not burned", async () => {
    const stolen = await openSession(alice);
    const cpBefore = await checkpoint('before-stolen');
    const { data, status } = await identify(bob, stolen, photo);
    const cpAfter = await checkpoint('after-stolen');
    expect(status, JSON.stringify(data)).toBe(409);
    expect(((data?.capture ?? {}) as Row).accepted).toBe(false);
    expect(data?.candidates).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain(stolen.session_id);
    evidence.refusedForeign = { status, code: ((data?.capture ?? {}) as Row).code, quotaBefore: cpBefore, quotaAfter: cpAfter };
    if (cpBefore && cpAfter) {
      expect(cpAfter.bob_quota, "Bob's refused attempt must not spend his allowance").toBe(cpBefore.bob_quota);
      expect(cpAfter.alice_quota, "Alice's allowance must not be touched").toBe(cpBefore.alice_quota);
      expect(cpAfter.alice_sessions_consumed, "Alice's open session must not be consumed by Bob").toBe(cpBefore.alice_sessions_consumed);
    }
  });

  it('SIGNED-OUT COLLECT: refused with a sign-in message and no identification', async () => {
    const anon = fresh();
    const { data, status } = await identify(anon, { session_id: crypto.randomUUID(), nonce: 'ab'.repeat(32) }, photo);
    expect(status, JSON.stringify(data)).toBe(409);
    expect(((data?.capture ?? {}) as Row).code).toBe('capture_not_signed_in');
    expect(data?.candidates).toBeUndefined();
    evidence.signedOut = { status, code: ((data?.capture ?? {}) as Row).code };
  });

  it('NO PHOTOGRAPH: refused by validation before any allowance is charged', async () => {
    const session = await openSession(alice);
    const cpBefore = await checkpoint('before-nophoto');
    const { data, status } = await identifyWithoutPhoto(alice, session);
    const cpAfter = await checkpoint('after-nophoto');
    expect(status, JSON.stringify(data)).toBe(400);
    evidence.noPhoto = { status, code: data?.code ?? null, quotaBefore: cpBefore, quotaAfter: cpAfter };
    if (cpBefore && cpAfter) expect(cpAfter.alice_quota).toBe(cpBefore.alice_quota);
  });

  it('FORGED RECEIPT: a well-formed receipt id that the server never issued is refused and writes nothing', async () => {
    const forged = `rcpt_${[...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
    const before = await bob.from('discoveries').select('herb_id').eq('user_id', bobUser.id);
    const claim = await bob.rpc('claim_discovery', { p_receipt_id: forged });
    expect((claim.data as Row)?.ok, JSON.stringify(claim.data)).toBe(false);
    expect((claim.data as Row)?.code).toBe('receipt_unknown');
    const malformed = await bob.rpc('claim_discovery', { p_receipt_id: "rcpt_' or true --" });
    expect((malformed.data as Row)?.ok).toBe(false);
    const after = await bob.from('discoveries').select('herb_id').eq('user_id', bobUser.id);
    expect((after.data ?? []).length).toBe((before.data ?? []).length);
    evidence.forged = { code: (claim.data as Row)?.code };
  });

  it.skipIf(!EXPIRED_RECEIPT)('EXPIRED RECEIPT: a real receipt past its expiry cannot be claimed, and nothing is written', async () => {
    // The receipt row was AGED by the workflow's admin step (it could not otherwise be tested without waiting a month).
    // It is the player's own receipt; claim_discovery, the real function, is what judges it.
    const mine = await bob.from('capture_receipts').select('id,herb_id,claimed_at,expires_at').eq('id', EXPIRED_RECEIPT!);
    expect((mine.data ?? []).length, 'the aged receipt fixture is missing for this account').toBe(1);
    expect(new Date(String(((mine.data ?? [])[0] as Row).expires_at)).getTime()).toBeLessThan(Date.now());
    const claim = await bob.rpc('claim_discovery', { p_receipt_id: EXPIRED_RECEIPT });
    expect((claim.data as Row)?.ok, JSON.stringify(claim.data)).toBe(false);
    expect((claim.data as Row)?.code).toBe('receipt_expired');
    const { data } = await bob.from('discoveries').select('herb_id').eq('user_id', bobUser.id).eq('herb_id', 'urtica-dioica');
    expect(data ?? []).toHaveLength(0);
    evidence.expired = { code: (claim.data as Row)?.code };
  });

  it.skipIf(!NONPLANT_PHOTO)('PROVIDER, REAL: a photograph with no plant in it is handled without a reward, a leak or a stuck session', async () => {
    // A real provider call with input it cannot identify. This is NOT an outage: a genuine provider outage (timeout, 5xx)
    // cannot be induced against the live provider without faking it, and that path (session handed back, allowance refunded)
    // stays proven by the unit and local-database tests only. What this proves live is the failure SHAPE.
    const blank = new Uint8Array(readFileSync(NONPLANT_PHOTO!));
    const session = await openSession(bob);
    const before = await bob.from('discoveries').select('herb_id').eq('user_id', bobUser.id);
    evidence.cpBeforeBlank = await checkpoint('before-blank');
    const { data, error } = await identify(bob, session, blank, 'scan-blank.jpg');
    evidence.cpAfterBlank = await checkpoint('after-blank');
    let status = 200;
    let body: Row | null = data;
    if (error) {
      const res = (error as { context?: Response }).context;
      status = res?.status ?? 0;
      body = res ? ((await res.json().catch(() => null)) as Row | null) : null;
    }
    expect(body, `no readable body (HTTP ${status})`).toBeTruthy();
    expect([200, 502], `HTTP ${status}: ${JSON.stringify(body)}`).toContain(status);
    expect(JSON.stringify(body), 'the response must never carry a provider key or URL').not.toMatch(/api-key|api_key|key=|apikey/i);
    if (status === 502) {
      expect(['provider', 'timeout', 'network', 'rateLimited', 'schema']).toContain(String(body!.code));
      if ((body!.capture as Row | undefined)?.retryable) expect(['refunded', 'not_refunded']).toContain(String(body!.allowance));
    } else {
      const cands = (body!.candidates ?? []) as Row[];
      expect((body!.capture as Row)?.accepted).toBe(true);
      // Whatever the provider guessed, a receipt exists only for a candidate that the server itself judged eligible.
      const issued = await bob.from('capture_receipts').select('id').eq('observation_id', String(body!.observationId));
      expect((issued.data ?? []).length).toBe(cands.filter((c) => c.captureReceipt).length);
    }
    const after = await bob.from('discoveries').select('herb_id').eq('user_id', bobUser.id);
    expect((after.data ?? []).length, 'identification alone must never write a discovery').toBe((before.data ?? []).length);
    const blankRows = await bob.from('capture_receipts').select('herb_id,observed_taxon_key,eligibility,rank_position,species_confidence').eq('observation_id', String(body!.observationId ?? ''));
    evidence.nonPlantCandidates = ((body!.candidates ?? []) as Row[]).map((c) => ({ scientificName: c.scientificName, score: c.score, hasReceipt: Boolean(c.captureReceipt) }));
    evidence.nonPlantReceiptRows = blankRows.data;
    evidence.nonPlant = { httpStatus: status, code: body!.code ?? null, providerFoundNothing: body!.providerFoundNothing ?? null, notAPlant: body!.notAPlant ?? null, candidates: ((body!.candidates ?? []) as Row[]).length, candidatesWithReceipt: ((body!.candidates ?? []) as Row[]).filter((c) => c.captureReceipt).length, retryable: (body!.capture as Row | undefined)?.retryable ?? null, allowance: body!.allowance ?? null };
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
