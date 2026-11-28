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

afterEach(() => vi.unstubAllEnvs());
const cam = { source: 'camera' as const };
const imp = { source: 'import' as const };

describe('channelForPhotos', () => {
  it('is unspecified, and collecting is NOT allowed (identification only), with the pilot off', () => {
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'off');
    expect(channelForPhotos([imp, imp])).toBe('unspecified');
    expect(collectAllowed('unspecified')).toBe(false);
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

describe('the collect rule is wired before the reducer call', () => {
  const panel = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8');
  it('a lookup cannot reach discover() for a card not already held', () => {
    const decide = panel.indexOf('const decision = decideConfirm(');
    const refuse = panel.indexOf('if (!decision.allow) return;');
    const call = panel.indexOf('const outcome = discover(herb);');
    expect(decide).toBeGreaterThan(-1);
    expect(refuse).toBeGreaterThan(decide);
    expect(call).toBeGreaterThan(refuse);
  });
  it('claims the server receipt BEFORE the ordinary insert, never after', () => {
    expect(panel.indexOf('await claimDiscovery(')).toBeLessThan(panel.indexOf('const outcome = discover(herb);'));
  });
  it('ScanPanel calls discover( only once, and only after the decision allows it', () => {
    const calls = [...panel.matchAll(/\bdiscover\(/g)].map((m) => m.index!);
    const refuse = panel.indexOf('if (!decision.allow) return;');
    const live = calls.filter((i) => !/^\s*\*|\/\//.test(panel.slice(panel.lastIndexOf('\n', i) + 1, i)) && !panel.slice(panel.lastIndexOf('\n', i) + 1, i).includes('`'));
    expect(live).toHaveLength(1);
    expect(live[0]).toBeGreaterThan(refuse);
  });
  it('the Seed Shelf has no write path into the collection', () => {
    const shelf = readFileSync('src/components/seedshelf/SeedShelfView.tsx', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    expect(shelf).not.toMatch(/\bdiscover\b/);
    expect(shelf).toContain('Scan it to collect it');
    expect(shelf).toContain('href="/scan"');
  });
  it('the confirm row offers nothing unless channel is collect AND somebody is signed in', () => {
    expect(panel).toMatch(/!collectAllowed\(sentChannel\) \|\| !user/);
  });
  it('the live camera input drops capture= so the library path is plainly a library path', () => {
    expect(readFileSync('src/components/scan/ObservationPhotos.tsx', 'utf8')).toContain("capture={cameraOn ? undefined : 'environment'}");
  });
});
