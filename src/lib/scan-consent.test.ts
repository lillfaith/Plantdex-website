import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.hoisted(() => vi.fn(async () => ({ data: { candidates: [] }, error: null })));
vi.mock('./supabase-client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('./image-prepare', () => ({
  IDENTIFY_PROFILE: {},
  UnprocessableImageError: class extends Error {},
  prepareImage: async () => ({ blob: new Blob(['x']), extension: 'jpg', contentType: 'image/jpeg' }),
}));

import {
  CONSENT_COPY,
  CONSENT_PRIVACY_HREF,
  CONSENT_STORAGE_KEY,
  IDENTIFICATION_PROVIDERS,
  acknowledge,
  consentStamp,
  hasAcknowledged,
  isConsentEnforced,
  mayTransmit,
} from './scan-consent';
import { identifyPlant } from './scans';

function store(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
  };
}
const PHOTOS = [
  { file: new File(['a'], 'a.jpg', { type: 'image/jpeg' }), organ: 'leaf' as const },
  { file: new File(['b'], 'b.jpg', { type: 'image/jpeg' }), organ: 'auto' as const },
];

afterEach(() => {
  vi.unstubAllEnvs();
  invoke.mockClear();
});

describe('the flag', () => {
  it('is off by default and for any value but the exact string on', () => {
    for (const v of [undefined, 'off', 'ON', '', 'true']) {
      vi.stubEnv('NEXT_PUBLIC_SCAN_CONSENT', v as string);
      vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'off');
      expect(isConsentEnforced()).toBe(false);
    }
  });
  it('is on with its own flag or with the camera pilot', () => {
    vi.stubEnv('NEXT_PUBLIC_SCAN_CONSENT', 'on');
    expect(isConsentEnforced()).toBe(true);
    vi.stubEnv('NEXT_PUBLIC_SCAN_CONSENT', 'off');
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'on');
    expect(isConsentEnforced()).toBe(true);
  });
  it('never blocks anything while off', () => {
    vi.stubEnv('NEXT_PUBLIC_SCAN_CONSENT', 'off');
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'off');
    expect(mayTransmit(null, 'device')).toBe(true);
  });
});

describe('the acknowledgement', () => {
  it('is per account and per device, never shared', () => {
    const s = store();
    expect(acknowledge(s, 'user-a')).toBe(true);
    expect(hasAcknowledged(s, 'user-a')).toBe(true);
    expect(hasAcknowledged(s, 'user-b')).toBe(false);
    expect(hasAcknowledged(s, 'device')).toBe(false);
  });
  it('stores the stamp and nothing else', () => {
    const s = store();
    acknowledge(s, 'device');
    expect(JSON.parse(s.data[`${CONSENT_STORAGE_KEY}:device`]!)).toEqual({ stamp: consentStamp() });
  });
  it('re-prompts when the wording version or the provider set changed', () => {
    const k = `${CONSENT_STORAGE_KEY}:device`;
    expect(hasAcknowledged(store({ [k]: JSON.stringify({ stamp: 'v0:plantnet+plantid' }) }), 'device')).toBe(false);
    expect(hasAcknowledged(store({ [k]: JSON.stringify({ stamp: 'v1:plantnet' }) }), 'device')).toBe(false);
    expect(hasAcknowledged(store({ [k]: JSON.stringify({ stamp: consentStamp() }) }), 'device')).toBe(true);
  });
  it('treats malformed, missing or throwing storage as not acknowledged', () => {
    const k = `${CONSENT_STORAGE_KEY}:device`;
    for (const raw of ['', 'nope', '{}', 'null', '[]', '{"stamp":1}']) {
      expect(hasAcknowledged(store({ [k]: raw }), 'device')).toBe(false);
    }
    expect(hasAcknowledged(null, 'device')).toBe(false);
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(hasAcknowledged(throwing, 'device')).toBe(false);
    expect(acknowledge(throwing, 'device')).toBe(false);
  });
});

describe('nothing is sent before the acknowledgement', () => {
  it('refuses to transmit when enforced and no storage is available (sends nothing)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SCAN_CONSENT', 'on');
    const answer = await identifyPlant(PHOTOS);
    expect(answer).toMatchObject({ kind: 'error' });
    expect((answer as { message: string }).message).toContain('Nothing was sent');
    expect(invoke).not.toHaveBeenCalled();
  });
  it('is unchanged with the flags off', async () => {
    vi.stubEnv('NEXT_PUBLIC_SCAN_CONSENT', 'off');
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'off');
    const answer = await identifyPlant(PHOTOS);
    expect(answer).not.toMatchObject({ kind: 'error' });
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});

describe('the notice and /privacy say the same thing', () => {
  const privacy = readFileSync('src/app/privacy/page.tsx', 'utf8');
  it('names every provider the privacy page names', () => {
    expect(privacy).toContain('PlantNet');
    expect(privacy).toContain('plant.id');
    const body = CONSENT_COPY.body.join(' ');
    for (const p of IDENTIFICATION_PROVIDERS) expect(body).toContain(p.name.split(' ')[0]);
  });
  it('links to a section that exists and states the three disclosures', () => {
    expect(CONSENT_PRIVACY_HREF).toBe('/privacy#plant-id');
    expect(privacy).toContain('id="plant-id"');
    const body = CONSENT_COPY.body.join(' ').toLowerCase();
    expect(body).toContain('photos');
    expect(body).toMatch(/location/);
    expect(body).toContain('optional');
  });
  it('claims no location or EXIF is sent, matching the re-encode rule', () => {
    expect(CONSENT_COPY.body.join(' ')).toMatch(/location data \(EXIF\/GPS\) is removed/);
    expect(readFileSync('src/lib/scans.ts', 'utf8')).toContain('prepareImage(photo.file, IDENTIFY_PROFILE)');
  });
});

describe('wiring (source guards)', () => {
  const panel = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8');
  it('the identify button stays disabled until accepted and the scope reaches identifyPlant', () => {
    expect(panel).toContain('!(consent.known && consent.accepted)');
    expect(panel).toContain('!canIdentify || busy');
    expect(panel).toContain('consentScope: consent.scope');
  });
  it('introduces no tracking', () => {
    for (const f of ['scan-consent.ts', 'scan-flow.ts', 'scan-receipt.ts', 'scan-capture-copy.ts']) {
      expect(readFileSync(`src/lib/${f}`, 'utf8')).not.toMatch(/track\(|plausible|fetch\(/);
    }
  });
});
