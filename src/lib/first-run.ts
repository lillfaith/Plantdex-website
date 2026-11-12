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

/** Everything the decision depends on. Taken as data so the rule is testable on its own. */
export interface FirstRunState {
  /** Has the collection finished hydrating? Before that, every collection looks empty. */
  readonly ready: boolean;
  /** Cards found. Derived from the Herbdex; never stored by this module. */
  readonly discoveredCount: number;
  /** Has this scope dismissed the welcome? */
  readonly seen: boolean;
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
  return state.discoveredCount === 0;
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
