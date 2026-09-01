/**
 * PRODUCT ANALYTICS.
 *
 * One typed `track()` call, one provider behind it, and a hard rule about what may travel.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTHING BUT AN EVENT NAME IS EVER SENT.
 *
 * `track()` takes an event name and nothing else. There is no second parameter, so there is
 * no place an email, a user id, a session id, a note, a photograph, a region string or a
 * coordinate could be attached — not by a careless component, not by a future edit. This
 * used to be a typed property object policed by a forbidden-key test; it is now a property
 * of the function signature, which is a much stronger guarantee than a test, because a test
 * can only fail after somebody has written the thing it forbids.
 *
 * The names below are a fixed, enumerable list. Each one answers a launch question and
 * identifies nobody.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY NO PROPERTIES — THE PLAN CONSTRAINT, AND WHY IT COSTS NOTHING.
 *
 * Plausible's custom properties are a Business-plan feature. On the Starter plan a `props`
 * payload is accepted by the API and then simply never shown, which is the worst possible
 * failure: the data leaves the browser, the dashboard looks fine, and the breakdown you
 * built the event for is not there. So the schema does not send properties at all.
 *
 * The dimensions that were properties are recovered two ways:
 *
 *   • FROM THE PAGE PATH, free, for anything identifying a plant. Every plant profile is
 *     its own URL (`/herbdex/[herbId]`), so Plausible's ordinary page report already breaks
 *     every plant event down by species — and therefore by card number, and therefore by
 *     habitat, since each card has exactly one primary habitat. `card_number` and `habitat`
 *     as properties were duplicating a breakdown the free half of the product already gives.
 *
 *   • FROM THE EVENT NAME, for the few dimensions the page cannot imply: whether a
 *     discovery was a first, which kind of research task completed, which CTA was clicked,
 *     and how much of a plant the viewer had unlocked. These are small closed sets, so they
 *     become distinct goal names rather than a property on one name.
 *
 * The net loss going from Business to Starter is nil for this app. See `docs/analytics.md`.
 *
 * WHY A WRAPPER RATHER THAN CALLING THE PROVIDER DIRECTLY. Components stay free of provider
 * APIs so swapping one is this file and nothing else; events are spell-checked by the
 * compiler instead of being loose strings; and the whole thing degrades to a no-op when
 * unconfigured, which is what keeps local development, the test suite and any fork from
 * sending traffic to somebody's dashboard.
 */

/** The provider, named so the privacy page and the sync test can both refer to it. */
export const ANALYTICS_PROVIDER = 'Plausible';

/**
 * The cheapest plan this schema works correctly on.
 *
 * Named here rather than in a comment so the plan decision is greppable from the code that
 * depends on it. If a future event needs a property, this constant is what has to change
 * first, and `analytics.test.ts` is what will make that change deliberate.
 */
export const REQUIRED_PLAN = 'Starter';

/**
 * Every event the app may send. Adding one here is the only way to send one.
 *
 * `pageview` is Plausible's own reserved name, emitted automatically by its script on
 * navigation; it is listed for completeness and never sent by hand.
 */
export const EVENT_NAMES = [
  'pageview',

  // Section usage.
  'herbdex_opened',
  'garden_opened',

  // Plant profiles. The species comes from the URL; the name carries only how much of that
  // plant the viewer had already unlocked, which the URL cannot say.
  'plant_viewed_locked',
  'plant_viewed_revealed',
  'plant_viewed_discovered',

  // Collection activity. `_first` separates a plant found for the first time from a repeat
  // sighting of one already collected — the difference between growth and habit.
  'card_revealed',
  'discovery_logged',
  'discovery_logged_first',
  'knowledge_check_passed',
  'card_mastered',

  // Field Research. The kind is in the name because a task completes on whatever page the
  // player happened to be on, so the path cannot imply it.
  'research_completed_daily',
  'research_completed_collection',
  'research_completed_seasonal',

  // Accounts.
  'signup_started',
  'signup_completed',
  'login_completed',
  'progress_imported',

  // Plant ID. The outcome is in the name because "how often does a scan find nothing" is
  // the question that decides whether the deck should grow — and no species travels, which
  // would be both a property (Business tier) and more than a count needs.
  'scan_started',
  'scan_matched',
  'scan_uncertain',
  'scan_no_match',
  'scan_confirmed',

  // Commerce. Placement is in the name because that is the entire question a CTA asks.
  'deck_cta_home',
  'deck_cta_herbdex',
  'deck_cta_plant',
  'deck_cta_footer',
  'checkout_started',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/**
 * The goals to create in Plausible's dashboard, which is every event except the automatic
 * one. Exported because a custom event that has not been configured as a goal records
 * nothing visible, and a hand-kept copy of this list in a wiki would be wrong within a month.
 */
export const PLAUSIBLE_GOALS: readonly EventName[] = EVENT_NAMES.filter(
  (name) => name !== 'pageview',
);

/**
 * Events that are declared above but emitted nowhere yet, each with the reason.
 *
 * A schema is allowed to be ahead of the code, but not silently: `analytics.test.ts` requires
 * every name in `EVENT_NAMES` to either appear at a real call site or be listed here. That is
 * what stops the list drifting into a catalogue of events nobody ever sends, which is how a
 * dashboard ends up with a chart that has been empty for a year and nobody can say why.
 */
export const UNEMITTED_EVENTS: Readonly<Partial<Record<EventName, string>>> = {
  pageview: "Plausible's own script sends this on navigation; calling it by hand would double-count.",
};

/* ── Name builders ──────────────────────────────────────────────────────────────
 *
 * Each returns an `EventName`, so a typo is a compile error rather than a goal that never
 * appears in the dashboard. They exist so call sites read as one idea ("this discovery was
 * a first") instead of a string concatenation.
 */

export type PlantViewState = 'locked' | 'revealed' | 'discovered';
export type ResearchKind = 'daily' | 'collection' | 'seasonal';
export type CtaPlacement = 'home' | 'herbdex' | 'plant' | 'footer';

export function plantViewedEvent(state: PlantViewState): EventName {
  return `plant_viewed_${state}`;
}

export function discoveryEvent(isFirst: boolean): EventName {
  return isFirst ? 'discovery_logged_first' : 'discovery_logged';
}

export function researchEvent(kind: ResearchKind): EventName {
  return `research_completed_${kind}`;
}

export function deckCtaEvent(placement: CtaPlacement): EventName {
  return `deck_cta_${placement}`;
}

/**
 * The site being measured, e.g. `plantdex.example`.
 *
 * Absent means analytics is off — no script is loaded and `track()` does nothing. That is
 * the state in local development, in CI, and in any deployment that has not configured it.
 */
export function analyticsDomain(): string | null {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  return domain ? domain : null;
}

export function isAnalyticsConfigured(): boolean {
  return analyticsDomain() !== null;
}

interface PlausibleFn {
  (event: string): void;
  q?: unknown[];
}

/**
 * Plausible's documented queue shim, installed on demand.
 *
 * WHY THIS IS HERE AND NOT ONLY IN A `<Script>` TAG. It was only in a tag, loaded
 * `afterInteractive`, and two events never fired at all: `herbdex_opened` and
 * `garden_opened` are sent from a mount effect, and a mount effect on first paint runs
 * BEFORE an afterInteractive script executes. `window.plausible` was undefined, `track()`
 * returned early, and the two page-open events — the ones most likely to be somebody's
 * first action on the site — were silently dropped. Nothing errored; the numbers were
 * simply zero.
 *
 * Installing the queue from `track()` itself removes the ordering assumption entirely: the
 * first call to fire creates the queue, whenever that is, and the real script replays `q`
 * when it arrives. If the script got there first, this never runs.
 */
function plausibleQueue(): PlausibleFn {
  const target = window as unknown as { plausible?: unknown };
  const existing = target.plausible;
  /*
   * `typeof existing === 'function'` rather than a truthiness check, because the name can be
   * occupied by something that is not the provider. It was: an element's `id` becomes a
   * property of `window`, so the tag's own `<script id="plausible">` made `window.plausible`
   * an HTMLScriptElement until the real script overwrote it, and every event fired in that
   * window was handed to a DOM node. The tag's id was renamed, and this is the belt to that
   * braces — any future collision degrades to a fresh queue rather than a lost event.
   */
  if (typeof existing === 'function') return existing as PlausibleFn;

  const queued: PlausibleFn = function (...args: unknown[]) {
    (queued.q = queued.q ?? []).push(args);
  } as unknown as PlausibleFn;
  target.plausible = queued;
  return queued;
}

/**
 * Record something that happened.
 *
 * The signature is the privacy guarantee: one name from a fixed list, and no second
 * parameter to carry anything else. Deliberately fire-and-forget and deliberately unable to
 * throw — an analytics failure must never break a discovery.
 */
export function track(event: EventName): void {
  if (typeof window === 'undefined' || !isAnalyticsConfigured()) return;
  try {
    plausibleQueue()(event);
  } catch {
    // Never let measurement break the thing being measured.
  }
}
