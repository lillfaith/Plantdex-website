import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnprocessableImageError, type PreparedImage } from './image-prepare';
import {
  CAMERA_DECLINE_STORAGE_KEY,
  CAPTURE_CHANNELS,
  isCaptureChannel,
  readDeclined,
  stateForError,
  transition,
} from './scan-capture';
import { createCameraCapture, type CaptureDeps, type CameraStream } from './scan-capture-camera';

const SOURCE = ['scan-capture.ts', 'scan-capture-camera.ts'].map((f) => readFileSync(`src/lib/${f}`, 'utf8')).join('\n');
const PREPARED: PreparedImage = { blob: new Blob(['x']), contentType: 'image/jpeg', extension: 'jpg' };
const VIDEO = { videoWidth: 640, videoHeight: 480 };

function fakeStream() {
  const stops = [vi.fn(), vi.fn()];
  const stream: CameraStream = { getTracks: () => stops.map((stop) => ({ stop })) };
  return { stream, stops };
}

function harness(over: Partial<CaptureDeps> = {}, store: Record<string, string> = {}) {
  const fs = fakeStream();
  const getUserMedia = vi.fn(async () => fs.stream);
  const setItem = vi.fn((k: string, v: string) => void (store[k] = v));
  const deps: CaptureDeps = {
    getUserMedia,
    environment: { secureContext: true, hasGetUserMedia: true },
    storage: { getItem: (k) => store[k] ?? null, setItem },
    createCanvas: () => ({
      getContext: () => ({ drawImage: () => {} }),
      toBlob: (cb) => cb(new Blob(['frame'])),
    }),
    prepare: vi.fn(async () => PREPARED),
    ...over,
  };
  const factory = vi.fn(() => deps);
  const camera = createCameraCapture({ deps: factory, scope: 'user-1' });
  return { camera, deps, factory, getUserMedia, setItem, store, ...fs };
}

const reject = (name: string) => () => Promise.reject(Object.assign(new Error(name), { name }));

describe('flag off (the default)', () => {
  it('does nothing: no deps resolved, no prompt, no storage', async () => {
    for (const v of [undefined, 'off', 'ON', '', 'preview']) {
      vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', v as string);
      const h = harness();
      expect(h.camera.probe()).toBe('unsupported');
      expect(await h.camera.request()).toBe('unsupported');
      expect(await h.camera.capture(VIDEO, 'collect')).toBeNull();
      h.camera.release();
      expect(h.factory).not.toHaveBeenCalled();
      expect(h.getUserMedia).not.toHaveBeenCalled();
      expect(h.setItem).not.toHaveBeenCalled();
    }
    vi.unstubAllEnvs();
  });
  it('reads the flag as a literal comparison, so the bundler can drop the branch', () => {
    expect(SOURCE).toMatch(/process\.env\.NEXT_PUBLIC_CAMERA_CAPTURE === 'on'/);
  });
});

describe('flag on', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'on'));
  afterEach(() => vi.unstubAllEnvs());

  it('probe: unsupported, insecure-context, not-asked; asks nothing', () => {
    const a = harness({ environment: { secureContext: true, hasGetUserMedia: false } });
    expect(a.camera.probe()).toBe('unsupported');
    const b = harness({ environment: { secureContext: false, hasGetUserMedia: true } });
    expect(b.camera.probe()).toBe('insecure-context');
    const c = harness();
    expect(c.camera.probe()).toBe('not-asked');
    expect(c.getUserMedia).not.toHaveBeenCalled();
  });

  it('request does nothing before a probe, and nothing from unsupported', async () => {
    const h = harness();
    expect(await h.camera.request()).toBe('unsupported');
    const u = harness({ environment: { secureContext: true, hasGetUserMedia: false } });
    u.camera.probe();
    expect(await u.camera.request()).toBe('unsupported');
    expect(u.getUserMedia).not.toHaveBeenCalled();
  });

  it('grants, asks for the rear camera without audio, and exposes the stream', async () => {
    const h = harness();
    h.camera.probe();
    expect(await h.camera.request()).toBe('granted');
    expect(h.getUserMedia).toHaveBeenCalledWith({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    expect(h.camera.stream).not.toBeNull();
  });

  it.each([
    ['NotAllowedError', 'denied'],
    ['PermissionDeniedError', 'denied'],
    ['NotFoundError', 'no-device'],
    ['NotReadableError', 'in-use'],
    ['SecurityError', 'insecure-context'],
    ['OverconstrainedError', 'error'],
    ['AbortError', 'error'],
    ['SomethingNew', 'error'],
  ])('%s maps to %s, and nothing is retried', async (name, want) => {
    const h = harness({ getUserMedia: vi.fn(reject(name)) });
    h.camera.probe();
    expect(await h.camera.request()).toBe(want);
    expect(h.camera.stream).toBeNull();
    expect(h.deps.getUserMedia).toHaveBeenCalledTimes(1);
    expect(stateForError({ name })).toBe(want);
  });

  it('a non-error rejection is an error state', async () => {
    const h = harness({ getUserMedia: vi.fn(() => Promise.reject('boom')) });
    h.camera.probe();
    expect(await h.camera.request()).toBe('error');
  });

  it('a decline is remembered as one boolean and never asked again', async () => {
    const h = harness({ getUserMedia: vi.fn(reject('NotAllowedError')) });
    h.camera.probe();
    await h.camera.request();
    expect(h.store[`${CAMERA_DECLINE_STORAGE_KEY}:user-1`]).toBe('{"declined":true}');
    expect(await h.camera.request()).toBe('denied');
    expect(h.deps.getUserMedia).toHaveBeenCalledTimes(1);

    // A later session for the same account lands straight in denied, without asking.
    const later = harness({}, h.store);
    expect(later.camera.probe()).toBe('denied');
    expect(await later.camera.request()).toBe('denied');
    expect(later.getUserMedia).not.toHaveBeenCalled();

    // A different account on the same device is not carrying it.
    const other = createCameraCapture({ deps: () => later.deps, scope: 'user-2' });
    expect(other.probe()).toBe('not-asked');
  });

  it('only a decline is remembered, and storage that throws costs nothing', async () => {
    const h = harness({ getUserMedia: vi.fn(reject('NotFoundError')) });
    h.camera.probe();
    await h.camera.request();
    expect(h.setItem).not.toHaveBeenCalled();
    const broken = harness({
      getUserMedia: vi.fn(reject('NotAllowedError')),
      storage: { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } },
    });
    expect(broken.camera.probe()).toBe('not-asked');
    expect(await broken.camera.request()).toBe('denied');
  });

  it('validates the stored value on read', () => {
    for (const raw of ['', 'true', '{"declined":"true"}', '{"declined":1}', '[]', 'null', '{bad']) {
      expect(readDeclined({ getItem: () => raw, setItem: () => {} }, 's')).toBe(false);
    }
    expect(readDeclined({ getItem: () => '{"declined":true}', setItem: () => {} }, 's')).toBe(true);
    expect(readDeclined(null, 's')).toBe(false);
  });

  it('after in-use or no-device a player may try again, which is their own tap, not ours', async () => {
    const g = vi.fn<CaptureDeps['getUserMedia']>(reject('NotReadableError'));
    const h = harness({ getUserMedia: g });
    h.camera.probe();
    expect(await h.camera.request()).toBe('in-use');
    g.mockImplementationOnce(async () => h.stream);
    expect(await h.camera.request()).toBe('granted');
  });

  it('capture: draws a frame, prepares it with the identify profile, tags the channel, stops tracks', async () => {
    for (const channel of CAPTURE_CHANNELS) {
      const h = harness();
      h.camera.probe();
      await h.camera.request();
      const frame = await h.camera.capture(VIDEO, channel);
      expect(frame).toEqual({ image: PREPARED, channel, source: 'live-camera' });
      expect(h.camera.state).toBe('captured');
      expect(h.camera.stream).toBeNull();
      h.stops.forEach((s) => expect(s).toHaveBeenCalledTimes(1));
      const [file, profile] = (h.deps.prepare as ReturnType<typeof vi.fn>).mock.calls[0] as [File, { maxEdge: number }];
      expect(file.type).toBe('image/jpeg');
      expect(profile.maxEdge).toBe(1024);
    }
  });

  it.each([
    ['empty frame', { videoWidth: 0, videoHeight: 0 }, {}],
    ['no 2d context', VIDEO, { createCanvas: () => ({ getContext: () => null, toBlob: () => {} }) }],
    ['encode returns null', VIDEO, { createCanvas: () => ({ getContext: () => ({ drawImage: () => {} }), toBlob: (cb: (b: Blob | null) => void) => cb(null) }) }],
    ['prepareImage refuses', VIDEO, { prepare: vi.fn(() => Promise.reject(new UnprocessableImageError('x'))) }],
  ] as [string, { videoWidth: number; videoHeight: number }, Partial<CaptureDeps>][])('capture failure (%s) is an error state, returns nothing, and still stops tracks', async (_n, video, over) => {
    const h = harness(over);
    h.camera.probe();
    await h.camera.request();
    expect(await h.camera.capture(video, 'collect')).toBeNull();
    expect(h.camera.state).toBe('error');
    h.stops.forEach((s) => expect(s).toHaveBeenCalledTimes(1));
  });

  it('capture outside the granted state does nothing', async () => {
    const h = harness();
    h.camera.probe();
    expect(await h.camera.capture(VIDEO, 'collect')).toBeNull();
    expect(h.deps.prepare).not.toHaveBeenCalled();
  });

  it('release stops tracks, and a stream that arrives after release is stopped on arrival', async () => {
    const h = harness();
    h.camera.probe();
    await h.camera.request();
    h.camera.release();
    h.stops.forEach((s) => expect(s).toHaveBeenCalledTimes(1));
    expect(h.camera.state).toBe('not-asked');

    let resolve!: (s: CameraStream) => void;
    const late = fakeStream();
    const l = harness({ getUserMedia: () => new Promise<CameraStream>((r) => (resolve = r)) });
    l.camera.probe();
    const pending = l.camera.request();
    l.camera.release();
    resolve(late.stream);
    await pending;
    late.stops.forEach((s) => expect(s).toHaveBeenCalledTimes(1));
    expect(l.camera.stream).toBeNull();
    expect(l.camera.state).toBe('not-asked');
  });

  it('a track that throws on stop does not leave its siblings running', async () => {
    const h = harness();
    h.stops[0]!.mockImplementation(() => { throw new Error('x'); });
    h.camera.probe();
    await h.camera.request();
    h.camera.release();
    expect(h.stops[1]).toHaveBeenCalled();
  });
});

describe('the pure machine', () => {
  it('denied is left only by a fresh probe, and release never un-declines', () => {
    expect(transition('denied', { type: 'request' })).toBe('denied');
    expect(transition('denied', { type: 'release' })).toBe('denied');
    expect(transition('denied', { type: 'granted' })).toBe('denied');
  });
  it('ignores events that make no sense', () => {
    expect(transition('not-asked', { type: 'capture' })).toBe('not-asked');
    expect(transition('granted', { type: 'captured' })).toBe('granted');
    expect(transition('unsupported', { type: 'request' })).toBe('unsupported');
  });
  it('channels are a closed set', () => {
    expect(isCaptureChannel('collect')).toBe(true);
    expect(isCaptureChannel('lookup')).toBe(true);
    expect(isCaptureChannel('import')).toBe(false);
    expect(isCaptureChannel(undefined)).toBe(false);
  });
});

describe('what this layer may not do', () => {
  it('stores no frame, uploads nothing, reads no location, imports no discoveries or reward code', () => {
    const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/geolocation|exif|indexedDB|fetch\(|XMLHttpRequest|sendBeacon|supabase/i);
    expect(code).not.toMatch(/from '\.\/(observation-qualification|herbdex-reducer|progression|photo-store|sightings)/);
    expect(code).not.toMatch(/blob:\s*file|return file\b/);
  });
  it('never uses the word that would turn a tag into a claim', () => {
    expect(SOURCE).not.toMatch(/verif/i);
  });
});
