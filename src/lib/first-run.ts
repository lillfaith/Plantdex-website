import { useSyncExternalStore } from 'react';
import { ANONYMOUS_SCOPE } from './unlocked-field-cards';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHO IS NEW HERE — the one question the welcome has to answer, and it is harder than a flag.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * TWO SIGNALS, BECAUSE EITHER ALONE GETS A REAL PLAYER WRONG.
 *
 * A DISMISSAL FLAG ALONE fails the player who clears their browser, changes device, or
 * signs in somewhere new: they have forty cards and are shown "Welcome to Plantdex".
 *
 * AN EMPTY COLLECTION ALONE fails the player who read the welcome, tapped past it, and has
 * not found anything yet — which is every new player for the whole of their first session.
 * They would meet the same overlay on every page load until their first discovery.
 *
 * So the gate is: the collection is genuinely empty AND this scope has not dismissed it.
 * Emptiness is derived from the same `discoveredCount` the Herbdex already publishes — not
 * stored, not a second copy of anything — which is also why signing in cannot be fooled: a
 * returning account's count arrives from the server and is not zero.
 * ───────────────────────────────────────────────────────────────────────────────
 *
 * `ready` IS PART OF THE GATE, NOT A GUARD CLAUSE. Before hydration resolves, EVERY
 * collection looks empty. Without it, a player with forty cards is shown a first-run
 * welcome for the length of a load — `FirstFindNote` carries this exact note for the exact
 * same reason, and it is the single easiest way to get this wrong.
 *
 * SCOPED BY ACCOUNT, AND THIS REPO HAS SHIPPED THE BUG TWICE. The local-progress import
 * offer and the Field Card unlock record were both keyed globally at first, so the first
 * account to use a device silently spent the state for every account after it. Here that
 * would mean one person dismissing the welcome and their partner never seeing it. The
 * signed-out scope is `device`, which is right rather than a fallback: signed out, the
 * collection is local too, so the flag and the records describe the same player.
 *
 * NOTHING HERE IS A REWARD, AND NOTHING HERE PERSISTS PROGRESS. The only thing written is
 * "this scope has seen the welcome". It awards no XP, records no discovery and touches
 * neither `HerbdexState` nor the achievements — so no amount of clearing, re-reading or
 * re-dismissing can produce a duplicate of anything.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * The prefix every scope's key shares, so account deletion's `plantdex.` sweep takes all of
 * them — the same arrangement `unlocked-field-cards.ts` uses.
 */
export const WELCOME_STORAGE_KEY = 'plantdex.welcome.v1';

/**
 * Imported rather than re-declared. Two spellings of the signed-out scope is two things free
 * to drift, and a drift here reads one player's flag under another player's name.
 */
export { ANONYMOUS_SCOPE };

function storageKey(scope: string): string {
  return `${WELCOME_STORAGE_KEY}:${scope}`;
}

const listeners = new Set<() => void>();

/** The scope the cache belongs to, so a sign-in cannot read the previous player's flag. */
let cachedScope: string | null = null;
let cache: boolean | null = null;

function read(scope: string): boolean {
  if (cache !== null && cachedScope === scope) return cache;
  if (typeof window === 'undefined') return false;
  let value = false;
  try {
    value = window.localStorage.getItem(storageKey(scope)) === 'seen';
  } catch {
    /*
     * A blocked or full store degrades to "not yet seen", which costs a returning player one
     * extra overlay they can dismiss — the opposite choice would hide the welcome from every
     * genuinely new player in a private window.
     */
    value = false;
  }
  cachedScope = scope;
  cache = value;
  return value;
}

/** Has this scope already seen the welcome? */
export function welcomeSeen(scope: string = ANONYMOUS_SCOPE): boolean {
  return read(scope);
}

/** Write it down. Idempotent: dismissing twice is the same as dismissing once. */
export function markWelcomeSeen(scope: string = ANONYMOUS_SCOPE): void {
  if (read(scope)) return;
  cachedScope = scope;
  cache = true;
  try {
    window.localStorage.setItem(storageKey(scope), 'seen');
  } catch {
    /* The in-memory flag still suppresses it for this session, which is the behaviour that
       matters in the moment; a blocked store simply means it returns next load. */
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribe to the flag, so dismissing the overlay removes it without a prop drill. */
export function useWelcomeSeen(scope: string = ANONYMOUS_SCOPE): boolean {
  return useSyncExternalStore(
    subscribe,
    () => welcomeSeen(scope),
    // Server render: never show it, so the overlay cannot appear in static HTML and then
    // vanish. The client decides on its first real render.
    () => true,
  );
}

/**
 * THE ONLY ROUTES THE WELCOME MAY OPEN ON.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AN OVERLAY ON EVERY ROUTE IS AN INTERRUPTION, NOT A WELCOME.
 *
 * The gate's other two signals say WHETHER somebody is new; this says whether the page they
 * opened is one where a first-run introduction belongs. Without it, a link to a single plant,
 * a glossary entry or the safety disclaimer opens behind a modal the reader did not ask for —
 * and somebody arriving from a search result for `/safety` is exactly the person who should
 * not have to dismiss a dialog first.
 *
 * TWO ROUTES, both of which mean "I am here to collect":
 *
 *   `/`         the homepage, where somebody lands to find out what this is.
 *   `/herbdex`  the collection itself, deliberately opened.
 *
 * WHAT IS DELIBERATELY EXCLUDED, and why each one is a decision rather than an oversight:
 *
 *   `/herbdex/<id>`  a deep link to one plant. The reader came for that plant.
 *   `/start`         already a purpose-built introduction with one dominant action. An
 *                    overlay on top of it is two onboardings competing.
 *   `/scan`          the player is mid-action with a camera open. Interrupting that is worse
 *                    than never introducing anything.
 *   `/safety`, `/privacy`, `/terms`, `/learn/*`  reference and legal reading, often arrived
 *                    at from outside. A modal in front of a safety disclaimer is the single
 *                    worst placement available here.
 *   `/account`       `ImportLocalProgressDialog` is mounted there, and two dialogs must never
 *                    open together.
 *
 * EXACT MATCHES ONLY, which is what keeps `/herbdex` in and `/herbdex/urtica-dioica` out. A
 * prefix test would quietly re-admit every one of the 54 card pages.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const WELCOME_ROUTES: readonly string[] = ['/', '/herbdex'];

/**
 * Is this a route the welcome may open on?
 *
 * A trailing slash is accepted because the export emits directory-style URLs, so the same
 * page is reachable as `/herbdex` and `/herbdex/` depending on how it was linked.
 */
export function isWelcomeRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const trimmed = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return WELCOME_ROUTES.includes(trimmed);
}

/** Everything the decision depends on. Taken as data so the rule is testable on its own. */
export interface FirstRunState {
  /** Has the collection finished hydrating? Before that, every collection looks empty. */
  readonly ready: boolean;
  /** Cards found. Derived from the Herbdex; never stored by this module. */
  readonly discoveredCount: number;
  /** Has this scope dismissed the welcome? */
  readonly seen: boolean;
  /** The route being viewed. Only `WELCOME_ROUTES` may open the overlay. */
  readonly pathname?: string | null;
}

/**
 * THE WHOLE RULE, IN ONE PURE FUNCTION.
 *
 * Deliberately not a hook and deliberately not reading the store: every case the brief names
 * — a new anonymous visitor, a new account, a returning player, a cleared browser, an
 * account transition — is a different set of these three values, so each one is a test rather
 * than a scenario somebody has to reproduce in a browser.
 */
export function shouldShowWelcome(state: FirstRunState): boolean {
  if (!state.ready) return false;
  if (state.seen) return false;
  if (state.discoveredCount !== 0) return false;
  /*
   * `pathname` is optional so the three player-identity signals can still be tested on their
   * own, and an omitted route is read as "not a welcome route" — closed rather than open,
   * because the failure that matters is an overlay appearing where it should not.
   */
  return isWelcomeRoute(state.pathname);
}

/** Test seam, and the reset account deletion's prefix sweep performs in production. */
export function clearWelcomeState(): void {
  cache = null;
  cachedScope = null;
  try {
    /*
     * `length` + `key(i)` rather than `Object.keys(localStorage)`.
     *
     * The latter works only because a browser exposes each stored key as an own enumerable
     * property of the Storage object, which is an implementation detail rather than the
     * interface. The indexed form is the specified API, so this also behaves under a plain
     * stub — which matters here, because this suite runs in `node` and nothing in it has a
     * real `localStorage` unless a test provides one.
     *
     * Collected before removing: deleting during iteration shifts every later index and
     * silently skips half the keys.
     */
    const store = window.localStorage;
    const doomed: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key !== null && key.startsWith(WELCOME_STORAGE_KEY)) doomed.push(key);
    }
    for (const key of doomed) store.removeItem(key);
  } catch {
    /* Nothing to clear if the store is unreachable. */
  }
  for (const listener of listeners) listener();
}
