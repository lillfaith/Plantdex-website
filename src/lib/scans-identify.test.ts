import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  data: null as unknown,
  error: null as unknown,
}));

vi.mock('./supabase-client', () => ({
  supabase: { functions: { invoke: async () => ({ data: state.data, error: state.error }) } },
}));
vi.mock('./image-prepare', () => ({
  IDENTIFY_PROFILE: {},
  UnprocessableImageError: class extends Error {},
  prepareImage: async () => ({
    blob: new Blob(['x']),
    extension: 'jpg',
    contentType: 'image/jpeg',
  }),
}));

import { identifyPlant, isScanFailure, providerFailureMessage, type ObservationPhoto } from './scans';

const photos: ObservationPhoto[] = [
  { file: new File(['a'], 'a.jpg', { type: 'image/jpeg' }), organ: 'leaf' },
  { file: new File(['b'], 'b.jpg', { type: 'image/jpeg' }), organ: 'auto' },
];

describe('identifyPlant: what the answer is allowed to say', () => {
  beforeEach(() => {
    state.data = null;
    state.error = null;
  });

  it.each([
    ['a null body', null],
    ['an error body served as success', { error: 'boom' }],
    ['candidates that are not a list', { candidates: 'none' }],
  ])('treats %s as a failure, never as "no card"', async (_name, body) => {
    state.data = body;
    const answer = await identifyPlant(photos);
    expect(isScanFailure(answer)).toBe(true);
  });

  it('treats suggestions that are all unreadable as a failure', async () => {
    state.data = { candidates: [{ scientificName: '', score: 0.5 }, { scientificName: 'Bellis perennis', score: Number.NaN }] };
    expect(isScanFailure(await identifyPlant(photos))).toBe(true);
  });

  it('keeps the readable suggestions when only some are malformed', async () => {
    state.data = {
      candidates: [{ scientificName: 'Taraxacum officinale', score: 0.6 }, { scientificName: '', score: 0.2 }],
    };
    const answer = await identifyPlant(photos);
    if (isScanFailure(answer)) throw new Error('expected a result');
    expect(answer.candidates.map((c) => c.scientificName)).toEqual(['Taraxacum officinale']);
  });

  it('carries "not a plant" through, distinct from an ordinary empty result', async () => {
    state.data = { candidates: [], notAPlant: true, provider: 'plantid' };
    const answer = await identifyPlant(photos);
    if (isScanFailure(answer)) throw new Error('expected a result');
    expect(answer.notAPlant).toBe(true);
    expect(answer.providerFoundNothing).toBeUndefined();
    expect(answer.outcome).toBe('noMatch');
  });

  it('carries "the provider found nothing" through', async () => {
    state.data = { candidates: [], providerFoundNothing: true };
    const answer = await identifyPlant(photos);
    if (isScanFailure(answer)) throw new Error('expected a result');
    expect(answer.providerFoundNothing).toBe(true);
    expect(answer.notAPlant).toBeUndefined();
  });

  it('only an explicit true counts as a flag', async () => {
    state.data = { candidates: [], notAPlant: 'yes' };
    const answer = await identifyPlant(photos);
    if (isScanFailure(answer)) throw new Error('expected a result');
    expect(answer.notAPlant).toBeUndefined();
  });

  it('a genuine empty list with no flag is still a result', async () => {
    state.data = { candidates: [] };
    const answer = await identifyPlant(photos);
    expect(isScanFailure(answer)).toBe(false);
  });
});

describe('identifyPlant: a provider failure the server handed back', () => {
  it('says the attempt was free and may be repeated, and shows no internals', async () => {
    state.data = null;
    state.error = {
      context: new Response(
        JSON.stringify({
          error: 'The identification service could not be reached. Please try again.',
          code: 'provider',
          providerStatus: 502,
          providerMessage: 'PlantNet returned 502.',
          capture: { accepted: true, retryable: true },
          allowance: 'refunded',
        }),
        { status: 502 },
      ),
    };
    const answer = await identifyPlant(photos);
    expect(isScanFailure(answer)).toBe(true);
    expect(answer).toEqual({
      kind: 'error',
      message: 'The identifier could not be reached. You can try again with the same photos, and this attempt was not counted against your daily scans.',
      retryable: true,
    });
    expect(JSON.stringify(answer)).not.toMatch(/PlantNet|502/);
  });

  it('without capture.retryable the ordinary message stands', async () => {
    state.data = null;
    state.error = {
      context: new Response(JSON.stringify({ error: 'The identification service could not be reached. Please try again.', code: 'provider' }), { status: 502 }),
    };
    const answer = await identifyPlant(photos);
    expect(answer).toEqual({ kind: 'error', message: 'The identification service could not be reached. Please try again.' });
  });
});

describe('identifyPlant: four honest outcomes, exact words', () => {
  const U = 'The identifier could not be reached.';
  const fail = async (body: Record<string, unknown>, options?: Parameters<typeof identifyPlant>[1]) => {
    state.data = null;
    state.error = { context: new Response(JSON.stringify({ code: 'provider', ...body }), { status: 502 }) };
    return identifyPlant(photos, undefined, options);
  };
  const cap = { capture: { sessionId: 's', nonce: 'n' } } as unknown as Parameters<typeof identifyPlant>[1];
  const R = { accepted: true, retryable: true };

  it('released && refunded', async () => {
    expect(await fail({ capture: R, allowance: 'refunded' })).toEqual({
      kind: 'error', retryable: true,
      message: `${U} You can try again with the same photos, and this attempt was not counted against your daily scans.`,
    });
  });
  it.each([['not_refunded'], [undefined]])('released && !refunded (%s)', async (allowance) => {
    expect(await fail({ capture: R, allowance })).toEqual({
      kind: 'error', retryable: true,
      message: `${U} You can try again with the same photos. We could not confirm your daily scan count was restored.`,
    });
  });
  it('!released && refunded: capture', async () => {
    const a = await fail({ allowance: 'refunded' }, cap);
    expect(a).toEqual({ kind: 'error', message: `${U} This attempt was not counted against your daily scans. Please take your photos again.` });
    expect(a).not.toHaveProperty('retryable');
  });
  it('!released && refunded: non-capture lookup', async () => {
    expect(await fail({ allowance: 'refunded' })).toEqual({
      kind: 'error', message: `${U} This attempt was not counted against your daily scans. Please try again.`,
    });
  });
  it('neither', async () => {
    const a = await fail({ allowance: 'not_refunded' }, cap);
    expect(a).toEqual({ kind: 'error', message: `${U} Please try again in a little while.` });
    expect(a).not.toHaveProperty('retryable');
  });
  it('no player-facing message names global, shared or budget, or claims a restore without confirmation', () => {
    for (const released of [true, false]) for (const refunded of [true, false]) for (const c of [true, false]) {
      const m = providerFailureMessage(released, refunded, c);
      expect(m).not.toMatch(/global|shared|budget/i);
      if (!refunded) expect(m).not.toMatch(/not counted|not charged/i);
    }
  });
});
