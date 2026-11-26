import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('./supabase-client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('./image-prepare', () => ({
  IDENTIFY_PROFILE: {},
  UnprocessableImageError: class extends Error {},
  prepareImage: async () => ({ blob: new Blob(['x']), extension: 'jpg', contentType: 'image/jpeg' }),
}));
import { identifyPlant, isScanFailure, type ObservationPhoto } from './scans';

const photos: ObservationPhoto[] = [
  { file: new File(['a'], 'a.jpg', { type: 'image/jpeg' }), organ: 'habit' },
  { file: new File(['b'], 'b.jpg', { type: 'image/jpeg' }), organ: 'leaf' },
];
const sent = () => (invoke.mock.calls[0]![1] as { body: FormData }).body;

describe('identifyPlant and the discovery receipt contract', () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue({ data: { candidates: [{ scientificName: 'Taraxacum officinale', score: 0.9 }] }, error: null });
  });
  it('a lookup sends no capture fields (byte-identical request)', async () => {
    await identifyPlant(photos);
    const form = sent();
    expect(form.has('purpose')).toBe(false);
    expect(form.has('capture_session_id')).toBe(false);
    expect(form.has('capture_nonce')).toBe(false);
  });
  it('a collect with a session sends exactly the three contract fields', async () => {
    await identifyPlant(photos, undefined, { capture: { sessionId: 'sid', nonce: 'nonce' } });
    const form = sent();
    expect(form.get('purpose')).toBe('collect');
    expect(form.get('capture_session_id')).toBe('sid');
    expect(form.get('capture_nonce')).toBe('nonce');
    expect(form.getAll('image')).toHaveLength(2);
  });
  it('reads per-candidate receipts and the capture outcome; absence means no receipt', async () => {
    invoke.mockResolvedValue({
      data: {
        capture: { accepted: true },
        candidates: [
          { scientificName: 'Taraxacum officinale', score: 0.9, captureReceipt: { id: 'rcpt_1', rankPosition: 'top', expiresAt: '2026-12-26T00:00:00Z' } },
          { scientificName: 'Hypochaeris radicata', score: 0.05, captureReceipt: { id: 5 } },
        ],
      },
      error: null,
    });
    const answer = await identifyPlant(photos, undefined, { capture: { sessionId: 's', nonce: 'n' } });
    expect(isScanFailure(answer)).toBe(false);
    if (isScanFailure(answer)) return;
    expect(answer.capture).toEqual({ accepted: true, code: undefined, replay: undefined });
    expect(Object.keys(answer.receipts ?? {})).toEqual(['Taraxacum officinale']);
  });
  it('a refused capture still returns the identification', async () => {
    invoke.mockResolvedValue({ data: { capture: { accepted: false, code: 'capture_too_fast' }, candidates: [{ scientificName: 'Taraxacum officinale', score: 0.9 }] }, error: null });
    const answer = await identifyPlant(photos, undefined, { capture: { sessionId: 's', nonce: 'n' } });
    expect(isScanFailure(answer)).toBe(false);
    if (!isScanFailure(answer)) {
      expect(answer.candidates).toHaveLength(1);
      expect(answer.capture?.code).toBe('capture_too_fast');
      expect(answer.receipts).toBeUndefined();
    }
  });
});
