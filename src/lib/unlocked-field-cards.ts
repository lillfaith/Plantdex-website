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
 * WHY NOT IN `HerbdexState`. That holds only what XP is derived FROM, plus achievements. An
 * unlock is derived from XP, so putting it there would be circular and would add a number a
 * client could assert. This is a separate store with its own key that awards nothing and is
 * read by no predicate — the same shape, and the same reasoning, as `reveals.ts`.
 *
 * WRITE-ONCE. An ordinal already present is never rewritten, so the date a card was earned
 * cannot drift later. Same contract as every other record in this app.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const FIELD_CARD_UNLOCKS_STORAGE_KEY = 'plantdex.field-cards.v1';

/** ordinal -> ISO timestamp of first reach. */
type UnlockRecord = Record<string, string>;

let cache: UnlockRecord | null = null;
const listeners = new Set<() => void>();
const EMPTY: UnlockRecord = Object.freeze({});

/**
 * Ordinals recorded by THIS session's `recordUnlocks`, so a page can reveal them.
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

function read(): UnlockRecord {
  if (cache) return cache;
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(FIELD_CARD_UNLOCKS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    const out: UnlockRecord = {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        // Only well-formed pairs survive; a malformed file degrades to "not yet seen",
        // which costs a player one extra reveal rather than a broken page.
        if (typeof value === 'string' && /^\d+$/.test(key)) out[key] = value;
      }
    }
    cache = out;
    return out;
  } catch {
    cache = EMPTY;
    return EMPTY;
  }
}

function commit(next: UnlockRecord): void {
  cache = next;
  snapshot = { record: next, justUnlocked };
  try {
    window.localStorage.setItem(FIELD_CARD_UNLOCKS_STORAGE_KEY, JSON.stringify(next));
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
export function recordUnlocks(xp: number, at: string = new Date().toISOString()): FieldCardSlot[] {
  const reached = slotsUnlockedAt(xp);
  const current = read();
  const fresh = reached.filter((slot) => !current[String(slot.ordinal)]);
  if (fresh.length === 0) return [];

  const next: UnlockRecord = { ...current };
  // Write-once: only slots with no entry are added, so an existing date never moves.
  for (const slot of fresh) next[String(slot.ordinal)] = at;
  justUnlocked = [...justUnlocked, ...fresh.map((slot) => slot.ordinal)];
  commit(next);
  return fresh;
}

/**
 * Every slot this player holds: reached by current XP, OR recorded earlier.
 *
 * The union is the ratchet. A slot recorded in the past stays unlocked even if the XP that
 * earned it is later recomputed downwards by a formula change.
 */
export function resolveUnlocked(xp: number, record: UnlockRecord = read()): FieldCardSlot[] {
  const derived = new Set(slotsUnlockedAt(xp).map((slot) => slot.ordinal));
  return FIELD_CARD_SLOTS.filter(
    (slot) => derived.has(slot.ordinal) || Boolean(record[String(slot.ordinal)]),
  );
}

/** When a slot was first reached, if it has been. */
export function unlockedAt(ordinal: number, record: UnlockRecord = read()): string | undefined {
  return record[String(ordinal)];
}

/** Subscribe a component to the record and this session's fresh unlocks. */
export function useFieldCardUnlocks(): UnlockState {
  return useSyncExternalStore(
    subscribe,
    () => {
      // Keep the cached object identity unless the record really changed, or every render
      // of any subscriber would see a new snapshot and loop.
      const current = read();
      if (snapshot.record !== current || snapshot.justUnlocked !== justUnlocked) {
        snapshot = { record: current, justUnlocked };
      }
      return snapshot;
    },
    () => SERVER_STATE,
  );
}

const SERVER_STATE: UnlockState = { record: EMPTY, justUnlocked: [] };

/** Testing and account deletion only. */
export function clearFieldCardUnlocks(): void {
  justUnlocked = [];
  commit({});
}
