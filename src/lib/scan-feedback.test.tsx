import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { SHUTTER_MS, shutterPlan } from './scan-shutter';
import { WAITING_COPY, waitingCopy } from './scan-waiting';
import { ScanScout } from '@/components/scan/ScanScout';
import { ScanFailure } from '@/components/scan/ScanFailure';
import { CollectFlow } from '@/components/scan/CollectFlow';

const read = (p: string) => readFileSync(p, 'utf8');
const CAMERA = read('src/components/scan/CameraCapturePanel.tsx');
const PANEL = read('src/components/scan/ScanPanel.tsx');
const FLOW = read('src/components/scan/CollectFlow.tsx');

describe('shutter', () => {
  it('flashes and brackets normally', () => {
    expect(shutterPlan(() => ({ matches: false }))).toEqual({ flash: true, brackets: true });
    expect(shutterPlan(null)).toEqual({ flash: true, brackets: true });
  });
  it('renders no flash under reduced motion (injected media query), only the static outline', () => {
    const asked: string[] = [];
    const plan = shutterPlan((q) => (asked.push(q), { matches: true }));
    expect(asked).toEqual(['(prefers-reduced-motion: reduce)']);
    expect(plan).toEqual({ flash: false, brackets: true });
  });
  it('is brief and driven from the real captured frame, after the photo is handed on', () => {
    expect(SHUTTER_MS).toBeLessThanOrEqual(300);
    expect(CAMERA).toContain('aria-hidden="true" className="shutter-flash');
    expect(CAMERA).toContain('shutter-brackets');
    const shoot = CAMERA.slice(CAMERA.indexOf('const shoot'), CAMERA.indexOf('const copy'));
    expect(shoot.indexOf('onCaptured(')).toBeGreaterThan(-1);
    expect(shoot.indexOf('fireShutter()')).toBeGreaterThan(shoot.indexOf('onCaptured('));
    expect(shoot.indexOf('if (!frame) return;')).toBeLessThan(shoot.indexOf('fireShutter()'));
    // read in a handler, ignores double triggers, never during render
    expect(CAMERA).toContain('if (shutterActive.current) return;');
    const render = CAMERA.slice(CAMERA.indexOf('const copy'));
    expect(render).not.toContain('matchMedia');
  });
});

describe('waiting', () => {
  it('maps text only to the two observed stages', () => {
    expect(Object.keys(WAITING_COPY)).toEqual(['preparing', 'identifying']);
    expect(waitingCopy('idle')).toBeNull();
    expect(waitingCopy('preparing')!.title).toMatch(/Preparing/);
    expect(waitingCopy('identifying')!.title).toMatch(/Identifying/);
    expect(JSON.stringify(WAITING_COPY)).not.toMatch(/analys|%\s*complete|almost/i);
  });
  it('plays the scout in the busy panel, with a bar driven by stage and not by a timer', () => {
    expect(PANEL).toContain('<ScanScout waiting');
    expect(PANEL).toContain("['--fill' as string]: waiting.fill");
    expect(PANEL).toContain('waitingCopy(stage)');
    // The only timer in the file is the one-frame yield before the first stage paints.
    expect(PANEL.match(/setInterval/g)).toBeNull();
    expect(PANEL.match(/setTimeout/g)?.length).toBe(1);
    expect(PANEL).toContain('setTimeout(resolve, 0)');
    const waitingModule = read('src/lib/scan-waiting.ts');
    expect(waitingModule).not.toMatch(/setInterval|setTimeout|Date\.now/);
  });
  it('the scout plays only where waiting is set', () => {
    expect(renderToStaticMarkup(<ScanScout />)).not.toContain('scout-waiting');
    expect(renderToStaticMarkup(<ScanScout waiting />)).toContain('scout-waiting');
    expect(renderToStaticMarkup(<ScanScout />)).toContain('aria-hidden="true"');
  });
});

describe('failure', () => {
  it('shows the resting scout, the message and a 44px Retry', () => {
    const html = renderToStaticMarkup(<ScanFailure message="The identification service could not be reached." onRetry={() => {}} />);
    expect(html).toContain('could not be reached');
    expect(html).toContain('scan-scout');
    expect(html).not.toContain('scout-waiting');
    expect(html).toMatch(/<button[^>]*min-h-11[^>]*>Retry<\/button>/);
  });
  it('offers no Retry when none is given (daily limit)', () => {
    expect(renderToStaticMarkup(<ScanFailure message="x" />)).not.toContain('Retry');
  });
  it('the panel retries through the same guarded run and never for a rate limit', () => {
    expect(PANEL).toContain("setRetryable(answer.kind !== 'rateLimited')");
    expect(PANEL).toContain('retryable && canIdentify && !busy && !outOfScans');
    expect(PANEL).toContain('void run(photos)');
  });
});

describe('explainer', () => {
  it('plays once and can be replayed by remount, with no timers', () => {
    const html = renderToStaticMarkup(<CollectFlow />);
    expect(html).toMatch(/<section[^>]*class="cf cf-once/);
    expect(html).toContain('aria-label="Replay the explainer"');
    expect(html).toMatch(/min-h-11/);
    expect(FLOW).toContain('<Fragment key={run}>');
    expect(FLOW).not.toMatch(/setTimeout|setInterval/);
    expect(FLOW).not.toMatch(/8s loop/);
  });
});
