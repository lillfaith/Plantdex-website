import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.hoisted(() => vi.fn(async () => ({ data: { candidates: [] }, error: null })));
vi.mock('./supabase-client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('./image-prepare', () => ({
  IDENTIFY_PROFILE: {},
  UnprocessableImageError: class extends Error {},
  prepareImage: async () => ({ blob: new Blob(['x']), extension: 'jpg', contentType: 'image/jpeg' }),
}));

import { MIN_CAPTURE_PHOTOS, MIN_OBSERVATION_PHOTOS, identifyPlant, minPhotosFor } from './scans';

const photo = (name: string, source: 'camera' | 'import') => ({
  file: new File([name], `${name}.jpg`, { type: 'image/jpeg' }),
  organ: 'habit' as const,
  source,
});
const CAPTURE = { sessionId: '00000000-0000-4000-8000-000000000000', nonce: 'n'.repeat(64) };

afterEach(() => {
  vi.unstubAllEnvs();
  invoke.mockClear();
});

describe('one mandatory camera photo (owner decision, 2026-11-26)', () => {
  it('collect needs one photograph; every other channel keeps two', () => {
    expect(MIN_CAPTURE_PHOTOS).toBe(1);
    expect(minPhotosFor('collect')).toBe(1);
    expect(minPhotosFor('lookup')).toBe(MIN_OBSERVATION_PHOTOS);
    expect(minPhotosFor('unspecified')).toBe(MIN_OBSERVATION_PHOTOS);
  });

  it('identifies a collect observation of ONE photo and tags it purpose=collect', async () => {
    vi.stubEnv('NEXT_PUBLIC_SCAN_CONSENT', 'off');
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'off');
    const answer = await identifyPlant([photo('a', 'camera')], undefined, { capture: CAPTURE });
    expect(answer).not.toMatchObject({ kind: 'error' });
    expect(invoke).toHaveBeenCalledTimes(1);
    const body = (invoke.mock.calls[0] as unknown as [string, { body: FormData }])[1].body;
    expect(body.getAll('image')).toHaveLength(1);
    expect(body.get('purpose')).toBe('collect');
  });

  it('still accepts 2 and 3 angles, and refuses 4', async () => {
    vi.stubEnv('NEXT_PUBLIC_SCAN_CONSENT', 'off');
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'off');
    for (const n of [2, 3]) {
      const photos = Array.from({ length: n }, (_, i) => photo(`p${i}`, 'camera'));
      expect(await identifyPlant(photos, undefined, { capture: CAPTURE })).not.toMatchObject({ kind: 'error' });
    }
    invoke.mockClear();
    const four = Array.from({ length: 4 }, (_, i) => photo(`q${i}`, 'camera'));
    expect(await identifyPlant(four, undefined, { capture: CAPTURE })).toMatchObject({ kind: 'error' });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('a non-collect request of one photograph is still refused before any upload', async () => {
    vi.stubEnv('NEXT_PUBLIC_SCAN_CONSENT', 'off');
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'off');
    const answer = await identifyPlant([photo('a', 'import')]);
    expect(answer).toMatchObject({ kind: 'error' });
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('the server refuses independently of the button', () => {
  const fn = readFileSync('supabase/functions/identify-plant/index.ts', 'utf8');
  it('lowers the floor to one for purpose=collect only, in both places', () => {
    expect(fn).toContain('const MIN_COLLECT_IMAGES = 1;');
    expect(fn).toContain('readCaptureAsk(form) ? MIN_COLLECT_IMAGES : MIN_IMAGES_FLOOR');
    expect(fn).toContain('earlyFiles.length >= MIN_COLLECT_IMAGES && earlyFiles.length <= MAX_IMAGES');
    expect(fn).toContain('files.length < imageFloor');
    // The ceiling is untouched, and the non-collect floor still comes from the shared resolver.
    expect(fn).toContain('files.length > MAX_IMAGES');
    expect(fn).toContain('const MIN_IMAGES = 2;');
  });
});

describe('copy says extra angles are optional and never proof of presence', () => {
  const ui = readFileSync('src/components/scan/ObservationPhotos.tsx', 'utf8');
  it('says optional and accuracy-only', () => {
    expect(ui).toMatch(/More angles are optional and only help/);
    expect(ui).toMatch(/extra angles optional/);
  });
  it('never implies extra photos prove anything', () => {
    // Only the strings a player reads; the file's own comments may discuss proof.
    const visible = [
      ...ui.matchAll(/More angles are optional[\s\S]*?<\/span>/g),
      ...ui.matchAll(/extra angles optional[^`]*/g),
    ]
      .map((m) => m[0])
      .join(' ');
    expect(visible.length).toBeGreaterThan(0);
    expect(visible).not.toMatch(/prove|proof|verif|evidence|more likely to be accepted/i);
  });
  it('the button floor follows the channel', () => {
    const panel = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8');
    expect(panel).toContain('minPhotosFor(channelForPhotos(photos))');
    expect(ui).toContain('minPhotosFor(channel)');
  });
});

describe('capture sessions carry no mandatory delay', () => {
  it('falls back to 0, not 2000', () => {
    const src = readFileSync('src/lib/scan-capture-session.ts', 'utf8');
    expect(src).toContain("data.min_capture_ms : 0");
    expect(src).not.toContain('2000');
  });
});
