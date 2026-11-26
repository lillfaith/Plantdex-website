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

import { identifyPlant, isScanFailure, type ObservationPhoto } from './scans';

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
