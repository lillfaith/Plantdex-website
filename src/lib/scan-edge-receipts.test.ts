import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATALOGUE } from './catalogue';
import { matchScientificName, speciesConfidenceFor } from './plant-match';
import { receiptItemsFor as clientReceiptItemsFor, isReceiptEligibility, CAPTURE_CODES, CAPTURE_CONFIG } from './observation-capture-receipt';
import { importEdge, type CaptureModule, type PortShape } from './scan-edge-harness';

/*
 * The edge half of the receipt contract, below the handler: the pieces `capture.ts` is made of, and
 * the guarantees that are about source text rather than behaviour (no metadata read, no credential
 * held, the real `receiptItemsFor` and the local copy agreeing on the whole catalogue).
 * `scan-edge-handler.test.ts` runs the whole handler; `scan-edge-receipts.local.test.ts` runs it
 * against a real PostgreSQL.
 */

const edge = await importEdge<CaptureModule>('capture');
// Aliases so the cases read as the functions they exercise.
const readCaptureAsk: CaptureModule['readCaptureAsk'] = (f) => edge.readCaptureAsk(f);
const imageDigests: CaptureModule['imageDigests'] = (f) => edge.imageDigests(f);
const beginCapture: CaptureModule['beginCapture'] = (...a) => edge.beginCapture(...a);
const checkReplay: CaptureModule['checkReplay'] = (...a) => edge.checkReplay(...a);
const issueForCandidates: CaptureModule['issueForCandidates'] = (...a) => edge.issueForCandidates(...a);
const edgeReceiptItemsFor: CaptureModule['receiptItemsFor'] = (c) => edge.receiptItemsFor(c);
const supabasePort: CaptureModule['supabasePort'] = (a) => edge.supabasePort(a);
type CapturePort = PortShape;
type AdminLike = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }>;
  from(table: string): { select(c: string): { eq(c: string, v: unknown): { eq(c: string, v: unknown): PromiseLike<{ data: unknown; error: { message?: string } | null }> } } };
};

const root = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([^:])\/\/.*$/gm, '$1');

const SESSION = '22222222-2222-4222-8222-222222222222';
const NONCE = 'cd'.repeat(32);
const USER = '11111111-1111-4111-8111-111111111111';

function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

describe('readCaptureAsk', () => {
  it('only an explicit purpose=collect asks for a capture', () => {
    expect(readCaptureAsk(form({}))).toBeNull();
    expect(readCaptureAsk(form({ purpose: 'lookup', capture_session_id: SESSION, capture_nonce: NONCE }))).toBeNull();
    expect(readCaptureAsk(form({ capture_session_id: SESSION, capture_nonce: NONCE }))).toBeNull();
    expect(readCaptureAsk(form({ purpose: 'COLLECT' }))).toBeNull();
    expect(readCaptureAsk(form({ purpose: 'collect', capture_session_id: SESSION, capture_nonce: NONCE }))).toEqual({
      sessionId: SESSION,
      nonce: NONCE,
      complete: true,
    });
  });
  it('a malformed session or nonce is incomplete, never trusted', () => {
    expect(readCaptureAsk(form({ purpose: 'collect', capture_session_id: 'x', capture_nonce: NONCE }))!.complete).toBe(false);
    expect(readCaptureAsk(form({ purpose: 'collect', capture_session_id: SESSION, capture_nonce: 'short' }))!.complete).toBe(false);
    expect(readCaptureAsk(form({ purpose: 'collect' }))!.complete).toBe(false);
  });
});

describe('imageDigests', () => {
  it('is SHA-256 hex of the bytes, in order, and nothing else', async () => {
    const a = new Blob([new TextEncoder().encode('abc')]);
    const b = new Blob([new TextEncoder().encode('')]);
    expect(await imageDigests([a, b])).toEqual([
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    ]);
  });
});

type Spy = CapturePort & { log: string[] };
function port(over: Partial<CapturePort> = {}): Spy {
  const log: string[] = [];
  const base: CapturePort = {
    async sessionConsumed() { log.push('peek'); return false; },
    async consume() { log.push('consume'); return { ok: true }; },
    async issue({ items }) { log.push('issue'); return items.map((i, n) => ({ id: `rcpt_${n}`, herbId: i.herb_id, rankPosition: i.rank_position })); },
    async receiptsForSession() { log.push('receipts'); return []; },
  };
  return Object.assign({ ...base, ...over }, { log }) as Spy;
}
const ask = readCaptureAsk(form({ purpose: 'collect', capture_session_id: SESSION, capture_nonce: NONCE }))!;
const files = [new Blob(['1']), new Blob(['2'])];

describe('beginCapture', () => {
  it('anonymous: not signed in, and the database is not asked', async () => {
    const p = port();
    expect(await beginCapture(p, ask, null, 'obs', files)).toEqual({ kind: 'failed', code: 'capture_not_signed_in' });
    expect(p.log).toEqual([]);
  });
  it('a refused consume maps to its own code; an unknown code is capture_unavailable', async () => {
    expect(await beginCapture(port({ consume: async () => ({ ok: false, code: 'capture_too_fast' }) }), ask, USER, 'obs', files)).toEqual({ kind: 'failed', code: 'capture_too_fast' });
    expect(await beginCapture(port({ consume: async () => ({ ok: false, code: 'made_up' }) }), ask, USER, 'obs', files)).toEqual({ kind: 'failed', code: 'capture_unavailable' });
    expect(await beginCapture(port({ consume: async () => ({ ok: false }) }), ask, USER, 'obs', files)).toEqual({ kind: 'failed', code: 'capture_unavailable' });
  });
  it('a throwing database never throws out', async () => {
    const p = port({ consume: async () => { throw new Error('down'); } });
    await expect(beginCapture(p, ask, USER, 'obs', files)).resolves.toEqual({ kind: 'failed', code: 'capture_unavailable' });
  });
  it('every code it can return is one the contract names', async () => {
    const outcomes = [
      await beginCapture(port(), { ...ask, complete: false, sessionId: '' }, USER, 'o', files),
      await beginCapture(port(), { ...ask, complete: false, sessionId: 'x' }, USER, 'o', files),
      await beginCapture(port(), ask, null, 'o', files),
    ];
    for (const o of outcomes) {
      expect(o.kind).toBe('failed');
      if (o.kind === 'failed') expect(CAPTURE_CODES as readonly string[]).toContain(o.code);
    }
  });
});

describe('checkReplay', () => {
  const consumedPort = (over: Partial<CapturePort> = {}) =>
    port({
      sessionConsumed: async () => true,
      consume: async () => ({ ok: true, replay: true }),
      receiptsForSession: async () => [{ id: 'rcpt_1', herbId: 'plantago-major', rankPosition: 'top' as const, expiresAt: 'x' }],
      ...over,
    });
  it('returns the recorded receipts for an identical re-send', async () => {
    expect(await checkReplay(consumedPort(), ask, USER, files)).toEqual({ receipts: [{ id: 'rcpt_1', herbId: 'plantago-major', rankPosition: 'top' }] });
  });
  it('is null for: anonymous, an unconsumed or unknown session, a different request, no receipts, any fault', async () => {
    expect(await checkReplay(consumedPort(), ask, null, files)).toBeNull();
    expect(await checkReplay(consumedPort({ sessionConsumed: async () => false }), ask, USER, files)).toBeNull();
    expect(await checkReplay(consumedPort({ sessionConsumed: async () => null }), ask, USER, files)).toBeNull();
    expect(await checkReplay(consumedPort({ consume: async () => ({ ok: false, code: 'capture_session_used' }) }), ask, USER, files)).toBeNull();
    expect(await checkReplay(consumedPort({ receiptsForSession: async () => [] }), ask, USER, files)).toBeNull();
    expect(await checkReplay(consumedPort({ sessionConsumed: async () => { throw new Error('x'); } }), ask, USER, files)).toBeNull();
  });
  it('never asks the database about a session that is not consumed (no side effect on a first presentation)', async () => {
    const p = consumedPort({ sessionConsumed: async () => false });
    await checkReplay(p, ask, USER, files);
    expect(p.log).toEqual([]);
  });
});

describe('issueForCandidates', () => {
  const open = { kind: 'open', sessionId: SESSION, userId: USER } as const;
  const cand = (scientificName: string, score = 0.7) => ({ scientificName, score });

  it('issues for card species, not for species without a card, and keeps every candidate field', async () => {
    const p = port();
    const out = await issueForCandidates(p, open, [{ ...cand('Plantago major'), extra: 1 }, cand('Bellis perennis')], () => Date.UTC(2030, 0, 1));
    expect(out.capture).toEqual({ accepted: true });
    expect(out.candidates[0]).toMatchObject({ scientificName: 'Plantago major', extra: 1, captureReceipt: { rankPosition: 'top' } });
    expect(out.candidates[1]!.captureReceipt).toBeUndefined();
  });
  it('falls back to the contracted TTL when the expiry cannot be re-read', async () => {
    const out = await issueForCandidates(port({ receiptsForSession: async () => { throw new Error('x'); } }), open, [cand('Plantago major')], () => Date.UTC(2030, 0, 1));
    expect(out.candidates[0]!.captureReceipt!.expiresAt).toBe(new Date(Date.UTC(2030, 0, 1) + edge.RECEIPT_TTL_DAYS * 86_400_000).toISOString());
  });
  it('a failed capture issues nothing and reports its code', async () => {
    const p = port();
    const out = await issueForCandidates(p, { kind: 'failed', code: 'capture_duplicate_image' }, [cand('Plantago major')]);
    expect(out.capture).toEqual({ accepted: false, code: 'capture_duplicate_image' });
    expect(p.log).toEqual([]);
    expect(out.candidates[0]!.captureReceipt).toBeUndefined();
  });
  it('two candidates for ONE card yield one receipt, on the first', async () => {
    const out = await issueForCandidates(port(), open, [cand('Taraxacum officinale', 0.6), cand('Taraxacum officinale', 0.2)]);
    expect(out.candidates.filter((c) => c.captureReceipt)).toHaveLength(1);
    expect(out.candidates[0]!.captureReceipt).toBeDefined();
  });
  it('a database that returns no receipts is capture_unavailable, with the identification intact', async () => {
    const out = await issueForCandidates(port({ issue: async () => [] }), open, [cand('Plantago major')]);
    expect(out.capture).toEqual({ accepted: false, code: 'capture_unavailable' });
    expect(out.candidates).toHaveLength(1);
  });
  it('legacyGenus, sameGenus and ambiguous matches never receive a receipt', async () => {
    // Goldenrod is the one card on the temporary `legacyGenus` basis; Rumex has two cards (sameGenus).
    const names = ['Solidago altissima', 'Solidago gigantea', 'Rumex acetosa', 'Taraxacum'];
    const out = await issueForCandidates(port(), open, names.map((n) => cand(n)));
    const holders = new Set<string>();
    for (const [i, name] of names.entries()) {
      const m = matchScientificName(name);
      const qualifies = m.confirmable && isReceiptEligibility(m.eligibility) && !holders.has(m.herbId!);
      if (qualifies) holders.add(m.herbId!);
      expect(Boolean(out.candidates[i]!.captureReceipt), name).toBe(qualifies);
    }
    // The cases this test exists for: a sibling species and a bare genus are relatives, not the plant.
    expect(out.candidates.map((c) => Boolean(c.captureReceipt))).toEqual([false, true, false, false]);
  });
});

describe('the local receiptItemsFor is the real one', () => {
  const names = [
    ...CATALOGUE.map((h) => h.scientificName),
    'Solidago altissima', 'Solidago gigantea', 'Solidago', 'Rumex acetosa', 'Rumex', 'Taraxacum', 'Taraxacum sect. Erythrosperma',
    'Taraxacum sect. Ruderalia', 'Mentha × piperita', 'Quercus leana', 'Bellis perennis', 'Plantago major subsp. intermedia',
    'Capsella rubella', 'Oxalis dillenii', 'Oxalis stricta', 'Trifolium repens', 'Not a plant', '',
  ];
  const confidences = ['high', 'moderate', 'low', 'unresolved'] as const;
  it('agrees on every catalogue name and every awkward one, at every rank position and band', () => {
    let checked = 0;
    for (const [i, name] of names.entries()) {
      const match = matchScientificName(name);
      for (const rankPosition of ['top', 'listed'] as const) {
        const speciesConfidence = confidences[i % 4]!;
        const input = [{ match, rankPosition, speciesConfidence }];
        expect(edgeReceiptItemsFor(input), name).toEqual(clientReceiptItemsFor(input));
        checked += 1;
      }
    }
    // Whole lists, with duplicates and a mix.
    const all = names.map((name, i) => ({ match: matchScientificName(name), rankPosition: i === 0 ? ('top' as const) : ('listed' as const), speciesConfidence: confidences[i % 4]! }));
    for (let start = 0; start < all.length; start += 3) {
      const slice = all.slice(start, start + 5);
      expect(edgeReceiptItemsFor(slice)).toEqual(clientReceiptItemsFor(slice));
    }
    expect(checked).toBeGreaterThan(100);
  });
  it('and issues at least one receipt for every card species, so the comparison is not vacuous', () => {
    for (const herb of CATALOGUE) {
      const match = matchScientificName(herb.scientificName);
      const items = edgeReceiptItemsFor([{ match, rankPosition: 'top', speciesConfidence: speciesConfidenceFor(match.observedTaxon!.rank, 0.9) }]);
      expect(items.length, herb.scientificName).toBe(match.confirmable && match.eligibility !== 'legacyGenus' ? 1 : 0);
    }
  });
  it('its constants are the contract’s', () => {
    expect(edge.MIN_CAPTURE_MS).toBe(CAPTURE_CONFIG.minCaptureMs);
    expect(edge.RECEIPT_TTL_DAYS).toBe(CAPTURE_CONFIG.receiptTtlDays);
  });
  it('every code capture.ts can emit is in the contract list, and the list is the contract’s', () => {
    const src = read('supabase/functions/identify-plant/capture.ts');
    const block = src.match(/export type CaptureCode =([\s\S]*?);/)![1]!;
    const emitted = [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(emitted.sort()).toEqual([...CAPTURE_CODES].sort());
  });
});

describe('supabasePort (the PostgREST adapter)', () => {
  it('speaks the exact SQL signatures of migration 0016', async () => {
    const seen: Array<[string, Record<string, unknown>]> = [];
    const admin: AdminLike = {
      rpc: (name, args) => {
        seen.push([name, args]);
        return Promise.resolve({ data: name === 'issue_capture_receipts' ? [{ id: 'rcpt_x', herb_id: 'h', rank_position: 'listed' }] : { ok: true, replay: false }, error: null });
      },
      from: () => ({ select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [{ id: 's', consumed_at: null }], error: null }) }) }) }),
    };
    const p = supabasePort(admin);
    await p.consume({ userId: 'u', sessionId: 's', nonce: 'n', observationId: 'o', digests: ['d'] });
    expect(await p.issue({ userId: 'u', sessionId: 's', items: [] })).toEqual([{ id: 'rcpt_x', herbId: 'h', rankPosition: 'listed' }]);
    expect(await p.sessionConsumed('u', 's')).toBe(false);
    const sql = read('docs/discoveries/sql/0016_discovery_capture_enforcement.sql');
    expect(sql).toContain('consume_capture_session(\n  p_user uuid, p_session uuid, p_nonce text, p_observation_id text, p_image_digests text[]');
    expect(seen[0]).toEqual(['consume_capture_session', { p_user: 'u', p_session: 's', p_nonce: 'n', p_observation_id: 'o', p_image_digests: ['d'] }]);
    expect(sql).toContain('issue_capture_receipts(p_user uuid, p_session uuid, p_items jsonb)');
    expect(seen[1]).toEqual(['issue_capture_receipts', { p_user: 'u', p_session: 's', p_items: [] }]);
  });
  it('treats an error or a malformed answer as a thrown fault (swallowed by the callers)', async () => {
    const bad: AdminLike = {
      rpc: () => Promise.resolve({ data: null, error: { message: 'nope' } }),
      from: () => ({ select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'nope' } }) }) }) }),
    };
    const p = supabasePort(bad);
    await expect(p.consume({ userId: 'u', sessionId: 's', nonce: 'n', observationId: 'o', digests: [] })).rejects.toThrow();
    await expect(p.issue({ userId: 'u', sessionId: 's', items: [] })).rejects.toThrow();
    await expect(p.sessionConsumed('u', 's')).rejects.toThrow();
    await expect(p.receiptsForSession('u', 's')).rejects.toThrow();
  });
});

describe('what the edge code may and may not touch (source-level)', () => {
  const capture = stripComments(read('supabase/functions/identify-plant/capture.ts'));
  const index = read('supabase/functions/identify-plant/index.ts');

  it('capture.ts holds no credential and reads no environment', () => {
    expect(capture).not.toMatch(/Deno\./);
    expect(capture).not.toMatch(/SERVICE_ROLE|service_role|SUPABASE_|createClient|process\.env|apikey/i);
  });
  it('neither the capture code nor its handler wiring reads, parses or stores EXIF, location or a device id', () => {
    const wiring = stripComments(index);
    for (const text of [capture, wiring]) {
      expect(text).not.toMatch(/\bexif\b|\bgps\b|latitude|longitude|geolocation|navigator\.|deviceId|device_id|fingerprint|userAgent|user-agent/i);
    }
  });
  it('the only column read from an image is its digest: nothing is decoded', () => {
    expect(capture).not.toMatch(/createImageBitmap|\bImage\(|DataView|readAsDataURL|\.slice\(\s*\d+\s*,/);
  });
  it('the capture RPCs are called only through the service-role port, and never the caller’s client', () => {
    const wiring = stripComments(index);
    expect(wiring).not.toMatch(/asCaller\.(rpc|from)/);
    expect(wiring).toContain('supabasePort(admin');
    expect(wiring).not.toMatch(/admin\.rpc\('(consume_capture_session|issue_capture_receipts|claim_discovery|open_capture_session)/);
  });
  it('the harness and handler test are not imported by any application code', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);
        return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
      });
    for (const dir of ['src/app', 'src/components']) {
      for (const file of walk(join(root, dir))) {
        expect(readFileSync(file, 'utf8'), file).not.toContain('scan-edge-harness');
      }
    }
  });
  it('enabling nothing: no enforcement switch, flag or workflow is touched by this task', () => {
    expect(index).not.toMatch(/set_discovery_enforcement|discovery_enforcement/);
    expect(capture).not.toMatch(/set_discovery_enforcement|NEXT_PUBLIC_/);
  });
});
