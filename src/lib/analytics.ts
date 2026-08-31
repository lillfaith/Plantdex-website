/**
 * PRODUCT ANALYTICS.
 *
 * One typed `track()` call, one provider behind it, and a hard rule about what may travel.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT MAY NEVER BE SENT
 *
 * No email, no user id, no session id, no sighting notes, no photographs, no region text,
 * no coordinates, no card names typed by a player. Every property below is a small
 * enumerable value — a card number, a habitat class, a placement — chosen because it
 * answers a launch question and because it identifies nobody.
 *
 * This is not a convention. `EventProps` types each event's properties exactly, so a
 * component cannot attach a stray field, and `analytics.test.ts` fails the build if a
 * forbidden key ever appears in the schema.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY A WRAPPER RATHER THAN CALLING THE PROVIDER DIRECTLY. Three reasons, all practical:
 * components stay free of provider APIs so swapping one is this file and nothing else;
 * events are spell-checked by the compiler instead of being loose strings; and the whole
 * thing degrades to a no-op when unconfigured, which is what keeps local development, the
 * test suite and any fork from sending traffic to somebody's dashboard.
 */

/** The provider, named so the privacy page and the sync test can both refer to it. */
export const ANALYTICS_PROVIDER = 'Plausible';

/**
 * Every event the app may send. Adding one here is the only way to send one.
 *
 * `pageview` is Plausible's own reserved name and is emitted automatically by its script on
 * navigation; it is listed for completeness and never sent by hand.
 */
export interface EventProps {
  pageview: never;
  herbdex_opened: undefined;
  plant_viewed: { card_number: number; state: 'locked' | 'revealed' | 'discovered' };
  card_revealed: { card_number: number };
  discovery_logged: { card_number: number; habitat: string; is_first: boolean };
  knowledge_check_passed: { card_number: number };
  card_mastered: { card_number: number };
  research_completed: { task_kind: 'daily' | 'collection' | 'seasonal' };
  garden_opened: undefined;
  signup_started: undefined;
  signup_completed: undefined;
  login_completed: undefined;
  progress_imported: { had_progress: boolean };
  deck_cta_clicked: { placement: string };
  checkout_started: { placement: string };
}

export type EventName = keyof EventProps;

/** The full list, for tests and for documentation that cannot drift from the code. */
export const EVENT_NAMES: readonly EventName[] = [
  'pageview',
  'herbdex_opened',
  'plant_viewed',
  'card_revealed',
  'discovery_logged',
  'knowledge_check_passed',
  'card_mastered',
  'research_completed',
  'garden_opened',
  'signup_started',
  'signup_completed',
  'login_completed',
  'progress_imported',
  'deck_cta_clicked',
  'checkout_started',
];

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
  deck_cta_clicked: 'There is no shop, so there is no CTA to click. Wired when commerce ships.',
  checkout_started: 'There is no checkout. Wired when commerce ships.',
};

/**
 * Property keys that must never appear on any event, checked by test.
 *
 * The list is the point: it is easier to add a field than to notice one was added, and an
 * analytics payload is exactly the place a user id gets attached "just for debugging".
 */
export const FORBIDDEN_PROP_KEYS: readonly string[] = [
  'email',
  'user_id',
  'userId',
  'uid',
  'session_id',
  'sessionId',
  'notes',
  'photo',
  'photo_path',
  'region',
  'latitude',
  'longitude',
  'lat',
  'lng',
  'ip',
  'name',
  'common_name',
  'herb_id',
];

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
  (event: string, options?: { props?: Record<string, string | number | boolean> }): void;
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
 * Deliberately fire-and-forget and deliberately unable to throw: an analytics failure must
 * never break a discovery.
 */
export function track<E extends EventName>(
  event: E,
  ...[props]: EventProps[E] extends undefined ? [] : [EventProps[E]]
): void {
  if (typeof window === 'undefined' || !isAnalyticsConfigured()) return;
  try {
    plausibleQueue()(
      event,
      props ? { props: props as Record<string, string | number | boolean> } : undefined,
    );
  } catch {
    // Never let measurement break the thing being measured.
  }
}
