import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ANALYTICS_PROVIDER,
  EVENT_NAMES,
  PLAUSIBLE_GOALS,
  REQUIRED_PLAN,
  UNEMITTED_EVENTS,
  analyticsDomain,
  deckCtaEvent,
  discoveryEvent,
  isAnalyticsConfigured,
  plantViewedEvent,
  researchEvent,
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

/**
 * The name builders, paired with every name each one can produce.
 *
 * Composed names never appear as literals at a call site — `track(researchEvent(kind))` is
 * the whole point — so the "is this event actually sent" check has to know that calling the
 * builder counts as sending all of its names.
 */
const BUILDERS = [
  {
    fn: 'plantViewedEvent',
    names: (['locked', 'revealed', 'discovered'] as const).map(plantViewedEvent),
  },
  { fn: 'discoveryEvent', names: [discoveryEvent(true), discoveryEvent(false)] },
  {
    fn: 'researchEvent',
    names: (['daily', 'collection', 'seasonal'] as const).map(researchEvent),
  },
  {
    fn: 'deckCtaEvent',
    names: (['home', 'herbdex', 'plant', 'footer'] as const).map(deckCtaEvent),
  },
];

/** Source of every file that may call `track()` — analytics.ts itself deliberately excluded. */
function callSites(): string {
  return sourceFiles()
    .filter((path) => path !== join('src', 'lib', 'analytics.ts'))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
}

describe('analytics schema', () => {
  it('carries no custom property at all, because the plan would not show one', () => {
    /*
     * THE TEST THAT MATTERS, and it now guards two things at once.
     *
     * PRIVACY. `track()` takes an event name and nothing else, so there is no parameter an
     * email, a user id, a note or a coordinate could ride in on. That is a stronger promise
     * than the forbidden-key list this replaced: a list can only fail the build after
     * somebody has already written the line, whereas a one-parameter function makes the
     * line impossible to write.
     *
     * PLAN COMPATIBILITY. Plausible's custom properties are Business-tier. On Starter a
     * `props` payload is accepted by the API and then never displayed — data leaves the
     * browser and the breakdown simply is not there. Sending none is what makes the Starter
     * plan correct rather than merely affordable.
     */
    const signature = SOURCE.match(/export function track\(([^)]*)\)/);
    expect(signature, 'track() signature not found — this test reads it').not.toBeNull();
    expect(signature![1]!.split(',')).toHaveLength(1);

    // And the provider is handed the name alone.
    expect(SOURCE).toMatch(/plausibleQueue\(\)\(event\)/);
    expect(SOURCE).not.toMatch(/props:/);
  });

  it('passes no second argument from any call site', () => {
    /*
     * The signature is the boundary, but a cast could widen it — `TrackView` used to contain
     * exactly such a cast. So the calls themselves are read.
     */
    for (const path of sourceFiles()) {
      // Comments stripped first. Prose that merely mentions `track()` is not a call site,
      // and a guard that its own explanation can trip is a guard nobody keeps — the same
      // mistake the id="plausible" check made before it.
      const source = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
      for (const call of source.matchAll(/\btrack\(([^;]*?)\);/g)) {
        const args = call[1]!;
        // Commas inside a builder call are its own arguments, not track's. A TRAILING comma
        // is formatting — prettier adds one to any multi-line call — and is not an argument
        // either, so it is stripped before the check rather than counted as one.
        const outer = args.replace(/\([^()]*\)/g, '').replace(/,\s*$/, '');
        expect(outer, `${path}: track() is being passed more than an event name`).not.toContain(
          ',',
        );
      }
    }
  });

  it('builds only names it declares', () => {
    /*
     * A builder composes its name from a template literal, so a drifted suffix would produce
     * an event that is not in EVENT_NAMES — and therefore a goal that can never be created
     * in the dashboard and a chart that stays empty forever.
     */
    for (const builder of BUILDERS) {
      for (const name of builder.names) {
        expect(EVENT_NAMES, `${builder.fn}() produces "${name}", which is not declared`).toContain(
          name,
        );
      }
    }
  });

  it('only carries events that are actually sent, or says why not', () => {
    /*
     * `analytics.ts` is excluded, and that exclusion is the whole test: with the module in
     * the corpus every name trivially matches its own declaration, and the guard silently
     * passes for an event nothing sends. It did exactly that until it was checked.
     */
    const calls = callSites();
    for (const name of EVENT_NAMES) {
      const literal = calls.includes(`'${name}'`) || calls.includes(`"${name}"`);
      const viaBuilder = BUILDERS.some(
        (builder) => builder.names.includes(name) && calls.includes(`${builder.fn}(`),
      );
      const excused = UNEMITTED_EVENTS[name];
      expect(
        literal || viaBuilder || Boolean(excused),
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

  it('publishes the goal list the dashboard has to be configured with', () => {
    /*
     * A custom event that has not been created as a goal in Plausible records nothing
     * visible. PLAUSIBLE_GOALS is what the owner works from, so it must be every event
     * except the automatic one — never a hand-kept subset that quietly falls behind.
     */
    expect(PLAUSIBLE_GOALS).toEqual(EVENT_NAMES.filter((name) => name !== 'pageview'));
    expect(PLAUSIBLE_GOALS).not.toContain('pageview' as EventName);
  });

  it('names the plan it depends on', () => {
    expect(REQUIRED_PLAN).toBe('Starter');
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

  it('sends the bare event name once configured', () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = 'example.test';
    const { calls } = withWindow();
    track(plantViewedEvent('discovered'));
    // One argument reaching the provider, and it is the name. Nothing rides alongside.
    expect(calls).toEqual([['plant_viewed_discovered', undefined]]);
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
    track(plantViewedEvent('locked'));
    const queue = (globalThis as { window?: { plausible?: { q?: unknown[] } } }).window!.plausible!
      .q;
    expect(queue).toEqual([['herbdex_opened'], ['plant_viewed_locked']]);
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
    track('card_mastered');
    const value = (globalThis as { window?: { plausible?: { q?: unknown[] } } }).window!.plausible!;
    expect(typeof value).toBe('function');
    expect(value.q).toEqual([['card_mastered']]);
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
