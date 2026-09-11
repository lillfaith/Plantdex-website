'use client';

import { useSyncExternalStore } from 'react';
import { FIELD_CARD_SLOTS, slotsUnlockedAt, type FieldCardSlot } from './field-cards';

/**
 * WHEN EACH FIELD CARD WAS FIRST REACHED.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNLOCK IS DERIVED, NOT STORED. `slotsUnlockedAt(xp)` is the source of truth, and it needs
 * no persistence at all: the same XP always yields the same set, so an unlock survives a
 * reload, a sync, and signing in on a new phone without anything being written anywhere.
 * That is why there is no server table here and no migration — the XP is already synced, and
 * the answer is a pure function of it.
 *
 * SO WHAT IS THIS FILE FOR? Two things a pure function cannot do.
 *
 *   1. THE MOMENT. A reveal must fire ONCE, when a threshold is crossed — not on every page
 *      load forever after. That needs a record of what has already been seen.
 *
 *   2. THE RATCHET, which is the important one. Deriving from XP means a future change to the
 *      XP formula could in principle LOWER a total and take a card back. Nothing in Plantdex
 *      has ever revoked something a player earned — mastery is recorded rather than
 *      recomputed for exactly this reason, and research completion is written once and never
 *      un-written. So a reached slot is recorded here, and `resolveUnlocked()` returns
 *      DERIVED ∪ RECORDED. Once a card is yours it stays yours, whatever the maths does next.
 *
 * THE RECORD IS KEYED BY ACCOUNT, and that is not decoration. The ratchet grants cards that
 * the current XP does not, so a single global key would hand the first player's unlocks to
 * every account that signs in on a shared device afterwards — 2/9 on a brand-new account
 * with no XP. This repo has already been bitten by exactly that shape once: the local-import
 * offer was keyed globally and silently denied itself to every account after the first. A
 * signed-out device gets its own scope, which is right — signed out, your XP is local too,
 * so the derived half and the recorded half describe the same player.
 *
 * WHY NOT IN `HerbdexState`. That holds only what XP is derived FROM, plus achievements. An
 * unlock is derived from XP, so putting it there would be circular and would add a number a
 * client could assert. This is a separate store with its own key that awards nothing and is
 * read by no predicate — the same shape, and the same reasoning, as `reveals.ts`.
 *
 * WRITE-ONCE. An ordinal already present is never rewritten, so the date a card was earned
 * cannot drift later. Same contract as every other record in this app.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The signed-out scope. A device is a player too, and gets its own record. */
export const ANONYMOUS_SCOPE = 'device';

/** The prefix every scope's key shares, so account deletion can sweep all of them. */
export const FIELD_CARD_UNLOCKS_STORAGE_KEY = 'plantdex.field-cards.v1';

function storageKey(scope: string): string {
  return `${FIELD_CARD_UNLOCKS_STORAGE_KEY}:${scope}`;
}

/** ordinal -> ISO timestamp of first reach. */
type UnlockRecord = Record<string, string>;

const listeners = new Set<() => void>();
const EMPTY: UnlockRecord = Object.freeze({});

/** The scope the cache below belongs to, so a sign-in cannot read the wrong player's record. */
let cachedScope: string | null = null;
let cache: UnlockRecord | null = null;

/**
 * Ordinals recorded by the LATEST crossing, so a page can reveal exactly those.
 *
 * REPLACED, NEVER APPENDED. "New Field Card unlocked" is a statement about the event that
 * just happened; a player who crosses 600 XP and then 1,200 XP in one sitting should see
 * Cattail announced, not Coneflower announced a second time alongside it. Accumulating here
 * would also mean the banner grew all session. Crossing two thresholds on a single XP gain
 * is one event and correctly announces both.
 *
 * Part of the store's snapshot rather than component state, and that is not a stylistic
 * choice: a component cannot hold it. Setting it with `setState` inside an effect cascades a
 * render and lint refuses it; capturing "what was already there at mount" in a ref means
 * reading a ref during render, which React forbids and lint also refuses. Both are really the
 * same mistake — the freshness belongs to the external system that changed, so the external
 * system reports it, and the ordinary subscription delivers the re-render.
 *
 * Session-scoped on purpose: it is not persisted, so a reload shows the card as held rather
 * than re-announcing it, while a player still on the page sees the moment.
 */
let justUnlocked: readonly number[] = [];

/** Cached so `useSyncExternalStore` sees a stable object between unrelated renders. */
let snapshot: UnlockState = { record: EMPTY, justUnlocked: [] };

export interface UnlockState {
  record: UnlockRecord;
  justUnlocked: readonly number[];
}

function read(scope: string): UnlockRecord {
  if (cache && cachedScope === scope) return cache;
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    const out: UnlockRecord = {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        // Only well-formed pairs survive; a malformed file degrades to "not yet seen",
        // which costs a player one extra reveal rather than a broken page.
        if (typeof value === 'string' && /^\d+$/.test(key)) out[key] = value;
      }
    }
    if (cachedScope !== scope) {
      // A different player is reading now, so the previous scope's reveal is not theirs.
      justUnlocked = [];
    }
    cachedScope = scope;
    cache = out;
    return out;
  } catch {
    cachedScope = scope;
    cache = EMPTY;
    return EMPTY;
  }
}

function commit(scope: string, next: UnlockRecord): void {
  cachedScope = scope;
  cache = next;
  snapshot = { record: next, justUnlocked };
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify(next));
  } catch {
    /* A full or blocked store must never break the page; the derived set still works. */
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Record every slot the current XP has reached, and report the ones that are NEW.
 *
 * Returns the newly recorded slots so a caller can show the reveal. Returns an empty array
 * when nothing changed, which is what stops the moment from firing twice — and makes calling
 * this on every render harmless.
 */
export function recordUnlocks(
  xp: number,
  scope: string = ANONYMOUS_SCOPE,
  at: string = new Date().toISOString(),
): FieldCardSlot[] {
  const reached = slotsUnlockedAt(xp);
  const current = read(scope);
  const fresh = reached.filter((slot) => !current[String(slot.ordinal)]);
  if (fresh.length === 0) return [];

  const next: UnlockRecord = { ...current };
  // Write-once: only slots with no entry are added, so an existing date never moves.
  for (const slot of fresh) next[String(slot.ordinal)] = at;
  justUnlocked = fresh.map((slot) => slot.ordinal);
  commit(scope, next);
  return fresh;
}

/**
 * Every slot this player holds: reached by current XP, OR recorded earlier.
 *
 * The union is the ratchet. A slot recorded in the past stays unlocked even if the XP that
 * earned it is later recomputed downwards by a formula change.
 *
 * The record is a required argument rather than defaulting to the device's: a caller that
 * forgot to pass one would silently read the signed-out scope while a player was signed in,
 * and be wrong in the direction of granting cards.
 */
export function resolveUnlocked(xp: number, record: UnlockRecord): FieldCardSlot[] {
  const derived = new Set(slotsUnlockedAt(xp).map((slot) => slot.ordinal));
  return FIELD_CARD_SLOTS.filter(
    (slot) => derived.has(slot.ordinal) || Boolean(record[String(slot.ordinal)]),
  );
}

/** When a slot was first reached, if it has been. */
export function unlockedAt(ordinal: number, record: UnlockRecord): string | undefined {
  return record[String(ordinal)];
}

/**
 * One account's record and its latest crossing, as one object.
 *
 * Separate from the hook so the reveal is observable without rendering: `justUnlocked` is
 * module state, and a test that could only read `recordUnlocks`'s return value would be
 * checking what it returns rather than what a component would be shown — which is how an
 * accumulating banner passed its own test.
 */
export function fieldCardUnlockState(scope: string = ANONYMOUS_SCOPE): UnlockState {
  // Keep the cached object identity unless the record really changed, or every render of
  // any subscriber would see a new snapshot and loop.
  const current = read(scope);
  if (snapshot.record !== current || snapshot.justUnlocked !== justUnlocked) {
    snapshot = { record: current, justUnlocked };
  }
  return snapshot;
}

/** Subscribe a component to one account's record and its latest crossing. */
export function useFieldCardUnlocks(scope: string = ANONYMOUS_SCOPE): UnlockState {
  return useSyncExternalStore(
    subscribe,
    () => fieldCardUnlockState(scope),
    () => SERVER_STATE,
  );
}

const SERVER_STATE: UnlockState = { record: EMPTY, justUnlocked: [] };

/** Testing and account deletion only. Takes every scope on this device. */
export function clearFieldCardUnlocks(): void {
  justUnlocked = [];
  cache = null;
  cachedScope = null;
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(FIELD_CARD_UNLOCKS_STORAGE_KEY)) window.localStorage.removeItem(key);
    }
  } catch {
    /* Same reasoning as `commit`: a blocked store must not break the page. */
  }
  for (const listener of listeners) listener();
}
