import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COLLECT_NOTE,
  FLOW_STEPS,
  LOOKUP_NOTICE,
  channelForPhotos,
  collectAllowed,
  currentStep,
} from './scan-flow';
import { captureStateCopy } from './scan-capture-copy';
import { CAPTURE_STATES } from './scan-capture';
import { getReceiptClient, mockReceiptClient, receiptLine } from './scan-receipt';
import { matchScientificName } from './plant-match';

afterEach(() => vi.unstubAllEnvs());
const cam = { source: 'camera' as const };
const imp = { source: 'import' as const };

describe('channelForPhotos', () => {
  it('is unspecified, and collecting stays allowed, with the pilot off', () => {
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'off');
    expect(channelForPhotos([imp, imp])).toBe('unspecified');
    expect(collectAllowed('unspecified')).toBe(true);
  });
  it('is collect only when every photo is from the live camera', () => {
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'on');
    expect(channelForPhotos([cam, cam])).toBe('collect');
    expect(channelForPhotos([cam, cam, cam])).toBe('collect');
  });
  it('one imported photo (or an untagged one, or none) makes it a lookup', () => {
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'on');
    expect(channelForPhotos([cam, imp])).toBe('lookup');
    expect(channelForPhotos([imp, imp])).toBe('lookup');
    expect(channelForPhotos([cam, {}])).toBe('lookup');
    expect(channelForPhotos([])).toBe('lookup');
    expect(collectAllowed('lookup')).toBe(false);
    expect(collectAllowed('collect')).toBe(true);
  });
});

describe('steps', () => {
  it('walks Scan, Review, Confirm... in order and reaches Reveal and Collect', () => {
    expect([...FLOW_STEPS]).toEqual(['Scan', 'Review', 'Confirm', 'Reveal', 'Collect']);
    expect(currentStep({ hasResult: false, confirmed: false, celebrating: false })).toBe('Scan');
    expect(currentStep({ hasResult: true, confirmed: false, celebrating: false })).toBe('Review');
    expect(currentStep({ hasResult: true, confirmed: true, celebrating: true })).toBe('Reveal');
    expect(currentStep({ hasResult: true, confirmed: true, celebrating: false })).toBe('Collect');
  });
});

describe('copy never claims presence', () => {
  const claims = /\b(outdoor|outside|found it|verified|proof of|proves|where the plant was is)\b/i;
  it('every capture state has copy; none claims presence; denied names browser settings', () => {
    for (const state of CAPTURE_STATES) {
      const { message } = captureStateCopy(state);
      expect(message.length).toBeGreaterThan(10);
      expect(message).not.toMatch(claims);
    }
    expect(captureStateCopy('denied').message).toMatch(/browser settings/);
    expect(captureStateCopy('denied').canOpen).toBe(false);
  });
  it('failure states point at the identify-only fallback, never at a card', () => {
    for (const state of ['denied', 'no-device', 'in-use', 'insecure-context', 'unsupported', 'error'] as const) {
      expect(captureStateCopy(state).message).toMatch(/library photo/);
    }
  });
  it('the collect and lookup labels say eligibility and disclaim location', () => {
    expect(COLLECT_NOTE).toMatch(/not proof of where/);
    expect(LOOKUP_NOTICE.heading).toMatch(/not eligible to collect/);
    expect(`${COLLECT_NOTE} ${LOOKUP_NOTICE.body}`).not.toMatch(/verified|proves/i);
  });
});

describe('the receipt seam (MOCK)', () => {
  const exact = matchScientificName('Taraxacum officinale');
  it('is off with the pilot off', async () => {
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'off');
    const out = await getReceiptClient().issue({ channel: 'collect', signedIn: true, match: exact, rankPosition: 'top', alreadyHeld: false });
    expect(out).toEqual({ status: 'unavailable', reason: 'flag-off' });
  });
  it('mock: a signed-in collect of a new card is labelled MOCK and carries no token', async () => {
    const out = await mockReceiptClient.issue({ channel: 'collect', signedIn: true, match: exact, rankPosition: 'top', alreadyHeld: false });
    expect(out).toEqual({ status: 'mock', mock: true });
    expect(receiptLine(out)).toMatch(/MOCK/);
  });
  it('is not applicable for a lookup, signed out, or a held card, and never throws', async () => {
    const base = { match: exact, rankPosition: 'top' as const };
    expect(await mockReceiptClient.issue({ ...base, channel: 'lookup', signedIn: true, alreadyHeld: false })).toMatchObject({ status: 'not-applicable', reason: 'lookup' });
    expect(await mockReceiptClient.issue({ ...base, channel: 'collect', signedIn: false, alreadyHeld: false })).toMatchObject({ status: 'not-applicable', reason: 'signedOut' });
    expect(await mockReceiptClient.issue({ ...base, channel: 'collect', signedIn: true, alreadyHeld: true })).toMatchObject({ status: 'not-applicable', reason: 'alreadyHeld' });
  });
  it('is idempotent: the same request twice gives the same answer and stores nothing', async () => {
    const req = { channel: 'collect' as const, signedIn: true, match: exact, rankPosition: 'top' as const, alreadyHeld: false };
    expect(await mockReceiptClient.issue(req)).toEqual(await mockReceiptClient.issue(req));
    expect(readFileSync('src/lib/scan-receipt.ts', 'utf8')).not.toMatch(/localStorage|sessionStorage|indexedDB|fetch\(|Date\.now|Math\.random/);
  });
});

describe('the collect rule is wired before the reducer call', () => {
  const panel = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8');
  it('a lookup cannot reach discover() for a card not already held', () => {
    const gate = panel.indexOf('!collectAllowed(sentChannel)) return;');
    const call = panel.indexOf('const outcome = discover(herb);');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(call);
  });
  it('the live camera input drops capture= so the library path is plainly a library path', () => {
    expect(readFileSync('src/components/scan/ObservationPhotos.tsx', 'utf8')).toContain("capture={cameraOn ? undefined : 'environment'}");
  });
});
