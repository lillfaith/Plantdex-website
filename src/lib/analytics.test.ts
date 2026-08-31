import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ANALYTICS_PROVIDER,
  EVENT_NAMES,
  FORBIDDEN_PROP_KEYS,
  UNEMITTED_EVENTS,
  analyticsDomain,
  isAnalyticsConfigured,
  track,
  type EventName,
} from './analytics';

const SOURCE = readFileSync('src/lib/analytics.ts', 'utf8');

/** Every .ts/.tsx file under src/, so a call site cannot hide in a directory nobody listed. */
function sourceFiles(dir = 'src'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

/** The body of `export interface EventProps { ... }`, as written. */
function eventPropsBlock(): string {
  const match = SOURCE.match(/export interface EventProps \{([\s\S]*?)\n\}/);
  expect(match, 'EventProps interface not found — this test parses it').not.toBeNull();
  return match![1]!;
}

describe('analytics schema', () => {
  it('lists exactly the events it declares', () => {
    /*
     * `EVENT_NAMES` is a hand-written array of a type's keys, which is the classic place for
     * the two to drift. Parsing the interface is the only way to catch a key added to the
     * type and not to the list — the compiler is happy either way.
     */
    const declared = [...eventPropsBlock().matchAll(/^ {2}([a-z_]+):/gm)].map((m) => m[1]!);
    expect(declared.sort()).toEqual([...EVENT_NAMES].sort());
  });

  it('sends no personally identifying property, ever', () => {
    /*
     * THE TEST THAT MATTERS. Every property on every event has to be a small enumerable
     * value. An analytics payload is exactly where a user id gets attached "just for
     * debugging", and the person it identifies never finds out.
     */
    const block = eventPropsBlock();
    for (const key of FORBIDDEN_PROP_KEYS) {
      expect(
        block,
        `EventProps carries a forbidden property "${key}" — analytics may not identify anyone`,
      ).not.toMatch(new RegExp(`\\b${key}\\s*[?]?\\s*:`));
    }
  });

  it('sends no personally identifying property from any call site either', () => {
    /*
     * The schema is the boundary, but a call site could pass a wider object through a cast —
     * `TrackView` contains one such cast by necessity. So the calls are read as well.
     */
    for (const path of sourceFiles()) {
      const source = readFileSync(path, 'utf8');
      for (const call of source.matchAll(/track[^\n]*\([\s\S]{0,400}?\n\s*\}\)|track\([^)\n]*\)/g)) {
        for (const key of FORBIDDEN_PROP_KEYS) {
          expect(call[0], `${path}: a track() call passes "${key}"`).not.toMatch(
            new RegExp(`\\b${key}\\s*:`),
          );
        }
      }
    }
  });

  it('only carries events that are actually sent, or says why not', () => {
    /*
     * `analytics.ts` is excluded, and that exclusion is the whole test: with the module in
     * the corpus every name trivially matches its own declaration, and the guard silently
     * passes for an event nothing sends. It did exactly that until it was checked.
     */
    const calls = sourceFiles()
      .filter((path) => path !== join('src', 'lib', 'analytics.ts'))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    for (const name of EVENT_NAMES) {
      // Either a `track('name'` call, or a `<TrackView event="name" />` island.
      const emitted = calls.includes(`'${name}'`) || calls.includes(`"${name}"`);
      const excused = UNEMITTED_EVENTS[name];
      expect(
        emitted || Boolean(excused),
        `"${name}" is declared but sent nowhere — wire it or list it in UNEMITTED_EVENTS`,
      ).toBe(true);
      if (excused) expect(excused.length, `${name}: give a real reason`).toBeGreaterThan(20);
    }
  });

  it('excuses only events that exist', () => {
    for (const name of Object.keys(UNEMITTED_EVENTS)) {
      expect(EVENT_NAMES, `UNEMITTED_EVENTS names "${name}", which is not an event`).toContain(
        name as EventName,
      );
    }
  });
});

describe('track()', () => {
  const originalWindow = (globalThis as { window?: unknown }).window;
  const originalDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  afterEach(() => {
    if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window?: unknown }).window = originalWindow;
    if (originalDomain === undefined) delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    else process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = originalDomain;
  });

  function withWindow(): { calls: [string, unknown][] } {
    const calls: [string, unknown][] = [];
    (globalThis as { window?: unknown }).window = {
      plausible: (event: string, options?: unknown) => calls.push([event, options]),
    };
    return { calls };
  }

  it('does nothing at all when no domain is configured', () => {
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    const { calls } = withWindow();
    expect(isAnalyticsConfigured()).toBe(false);
    expect(analyticsDomain()).toBeNull();
    track('garden_opened');
    // Local development, CI and any fork must not send traffic to somebody's dashboard.
    expect(calls).toEqual([]);
  });

  it('treats a blank domain as unconfigured', () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = '   ';
    expect(analyticsDomain()).toBeNull();
  });

  it('sends the event and its properties once configured', () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = 'example.test';
    const { calls } = withWindow();
    track('plant_viewed', { card_number: 7, state: 'discovered' });
    expect(calls).toEqual([
      ['plant_viewed', { props: { card_number: 7, state: 'discovered' } }],
    ]);
  });

  it('queues events fired before the provider script has loaded', () => {
    /*
     * REGRESSION. `herbdex_opened` and `garden_opened` are sent from a mount effect, which
     * runs before an `afterInteractive` script executes — so with the shim in a <Script> tag
     * they fired into a `window.plausible` that did not exist yet and were dropped, silently
     * and completely. `track()` now creates the queue itself; the real script replays it.
     */
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = 'example.test';
    (globalThis as { window?: unknown }).window = {}; // no provider, as on first paint
    track('herbdex_opened');
    track('plant_viewed', { card_number: 3, state: 'locked' });
    const queue = (globalThis as { window?: { plausible?: { q?: unknown[] } } }).window!.plausible!
      .q;
    expect(queue).toEqual([
      ['herbdex_opened', undefined],
      ['plant_viewed', { props: { card_number: 3, state: 'locked' } }],
    ]);
  });

  it('leaves a real provider in place rather than shadowing it', () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = 'example.test';
    const { calls } = withWindow();
    track('garden_opened');
    expect(calls).toEqual([['garden_opened', undefined]]);
  });

  it('creates no global at all when unconfigured', () => {
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    (globalThis as { window?: unknown }).window = {};
    track('herbdex_opened');
    expect((globalThis as { window?: { plausible?: unknown } }).window!.plausible).toBeUndefined();
  });

  it('ignores a non-function squatting on the global name', () => {
    /*
     * REGRESSION. An element's `id` becomes a property of `window`, so the tag's own
     * `<script id="plausible">` made `window.plausible` an HTMLScriptElement. `track()`
     * found a truthy value, called it, threw, and swallowed it — `plant_viewed` recorded
     * nothing on any page where the tag was already in the DOM.
     */
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = 'example.test';
    (globalThis as { window?: unknown }).window = { plausible: { nodeName: 'SCRIPT' } };
    track('card_mastered', { card_number: 12 });
    const value = (globalThis as { window?: { plausible?: { q?: unknown[] } } }).window!.plausible!;
    expect(typeof value).toBe('function');
    expect(value.q).toEqual([['card_mastered', { props: { card_number: 12 } }]]);
  });

  it('never throws, whatever the provider does', () => {
    /*
     * An analytics failure must never break a discovery. This is the reason for the catch —
     * a blocked script, an ad blocker replacing the global, a provider outage.
     */
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = 'example.test';
    (globalThis as { window?: unknown }).window = {
      plausible: () => {
        throw new Error('blocked');
      },
    };
    expect(() => track('herbdex_opened')).not.toThrow();

    // A frozen window is the ad-blocker case: the shim cannot be installed and must not throw.
    (globalThis as { window?: unknown }).window = Object.freeze({});
    expect(() => track('herbdex_opened')).not.toThrow();
  });
});

describe('the provider itself', () => {
  it('loads no script unless a domain is set', () => {
    const script = readFileSync('src/components/analytics/PlausibleScript.tsx', 'utf8');
    expect(script).toContain('if (!domain) return null;');
  });

  it('uses a provider that needs no consent banner', () => {
    /*
     * The absence of a cookie banner is a claim about the provider, not a design choice. If
     * this constant ever names a cookie-setting provider, the banner and a rewritten privacy
     * page have to arrive in the same change — and this test is where that is noticed.
     */
    expect(ANALYTICS_PROVIDER).toBe('Plausible');
  });

  it('gives the script tag an id that cannot shadow the global', () => {
    // Comments stripped: the file explains this hazard by quoting the very string being
    // banned, and a guard that its own explanation can trip is a guard nobody keeps.
    const script = readFileSync('src/components/analytics/PlausibleScript.tsx', 'utf8').replace(
      /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
      '',
    );
    expect(script, 'id="plausible" makes window.plausible resolve to the element').not.toMatch(
      /id="plausible"/,
    );
  });

  it('sets no cookie and stores no identifier of its own', () => {
    const analytics = SOURCE + readFileSync('src/components/analytics/PlausibleScript.tsx', 'utf8');
    expect(analytics).not.toMatch(/document\.cookie|localStorage|sessionStorage|crypto\.randomUUID/);
  });
});
