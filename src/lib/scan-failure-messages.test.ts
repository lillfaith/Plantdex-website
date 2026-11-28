import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ data: null as unknown, error: null as unknown }));
vi.mock('./supabase-client', () => ({
  supabase: { functions: { invoke: async () => ({ data: state.data, error: state.error }) } },
}));
vi.mock('./image-prepare', () => ({
  IDENTIFY_PROFILE: {},
  UnprocessableImageError: class extends Error {},
  prepareImage: async () => ({ blob: new Blob(['x']), extension: 'jpg', contentType: 'image/jpeg' }),
}));

import { identifyPlant, isScanFailure, CAPTURE_STORE_UNAVAILABLE, type ObservationPhoto } from './scans';
import { captureStateCopy, captureUnavailableMessage } from './scan-capture-copy';

const photos: ObservationPhoto[] = [{ file: new File(['a'], 'a.jpg', { type: 'image/jpeg' }), organ: 'leaf' }];
const two: ObservationPhoto[] = [...photos, ...photos];
const fail = (body: unknown) => ({ context: new Response(JSON.stringify(body), { status: 409 }) });
const run = async (p = two, capture?: { sessionId: string; nonce: string }) => {
  const a = await identifyPlant(p, undefined, { capture });
  if (!isScanFailure(a)) throw new Error('expected failure');
  return a;
};
const NOT_CONNECTION = /connection|offline|network/i;

describe('the five failures: message and action', () => {
  beforeEach(() => {
    state.data = null;
    state.error = null;
  });

  it('1 network unavailable: says the service was unreachable, photos kept, Retry offered', async () => {
    state.error = { context: undefined };
    const a = await run();
    expect(a).toMatchObject({ kind: 'error' });
    expect(a.message).toBe('The identification service could not be reached. Your photos are still here: check your connection and try again.');
    expect('captureSpent' in a && a.captureSpent).toBeFalsy();
  });

  it('2 camera permission denied: names the browser setting and offers the library photo, no reopen', () => {
    const c = captureStateCopy('denied');
    expect(c.message).toBe(
      'Camera access is blocked. To use it, change the camera permission for this site in your browser settings; Plantdex will not ask again. You can still identify from a library photo.',
    );
    expect(c.canOpen).toBe(false);
    expect(c.message).not.toMatch(/try again/i);
  });

  it('3 session refused or expired: says retake, never blames the connection, spent so no Retry', async () => {
    state.error = fail({ code: 'captureRefused', error: 'This capture timed out. Please take the photo again.', capture: { accepted: false, code: 'capture_session_expired' } });
    const a = await run(photos, { sessionId: 's', nonce: 'n' });
    expect(a.message).toBe('This capture timed out. Please take the photo again.');
    expect(a.message).not.toMatch(NOT_CONNECTION);
    expect(a).toMatchObject({ captureSpent: true });
    expect(captureUnavailableMessage('expired')).toMatch(/take the photo again/);
    expect(captureUnavailableMessage('expired')).not.toMatch(NOT_CONNECTION);
  });

  it('3b an unavailable capture store is spent client-side, so it must not promise a retry of that photo', async () => {
    state.error = fail({ code: 'captureRefused', error: 'Collecting is unavailable right now. Please try again in a moment.', capture: { accepted: false, code: 'capture_unavailable' } });
    const a = await run(photos, { sessionId: 's', nonce: 'n' });
    expect(a.message).toBe(CAPTURE_STORE_UNAVAILABLE);
    expect(a.message).toMatch(/take the photo again/);
    expect(a.message).not.toMatch(NOT_CONNECTION);
    expect(a).toMatchObject({ captureSpent: true });
  });

  it('4 provider unavailable: says the identifier, Retry only when the same photos may be resent', async () => {
    state.error = fail({ code: 'provider', allowance: 'refunded', capture: { accepted: true, retryable: true } });
    const released = await run(photos, { sessionId: 's', nonce: 'n' });
    expect(released.message).toBe(
      'The identifier could not be reached. You can try again with the same photos, and this attempt was not counted against your daily scans.',
    );
    expect(released).toMatchObject({ retryable: true });
    expect('captureSpent' in released && released.captureSpent).toBeFalsy();
    state.error = fail({ code: 'provider', allowance: 'refunded' });
    const spent = await run(photos, { sessionId: 's', nonce: 'n' });
    expect(spent.message).toMatch(/take your photos again/);
    expect(spent).toMatchObject({ captureSpent: true });
    for (const m of [released.message, spent.message]) expect(m).not.toMatch(/check your connection/i);
  });

  it('5 identification unsuccessful: the answer is a result (not an error) saying nothing was recognised', async () => {
    state.data = { candidates: [] };
    const a = await identifyPlant(two);
    expect(isScanFailure(a)).toBe(false);
    const panel = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8') as string;
    expect(panel).toContain('Nothing was recognised in that photograph. A closer shot of a single leaf or flower usually works better.');
  });
});
