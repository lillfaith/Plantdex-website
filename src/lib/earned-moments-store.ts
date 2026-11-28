'use client';

import { useSyncExternalStore } from 'react';
import {
  deriveEarnedMoments,
  mergeForward,
  type EarnedMoment,
  type EarnedSnapshot,
} from './earned-moments';

/**
 * Session-scoped, memory-only store for earned moments, in the spirit of `garden-moments.ts`.
 * Nothing is persisted, so nothing can leak between accounts on a shared device.
 *
 * The FIRST snapshot observed for a scope is the baseline and fires nothing, which is what
 * keeps a reload, a second-device sign-in or a reconnect from replaying old achievements.
 */
let scope: string | null = null;
let baseline: EarnedSnapshot | null = null;
const announced = new Set<string>();
let pending: readonly EarnedMoment[] = Object.freeze([]);
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export function subscribeEarnedMoments(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function pendingEarnedMoments(): readonly EarnedMoment[] {
  return pending;
}

/** Feed an AUTHORITATIVE snapshot. Returns the moments it newly queued. */
export function observeSnapshot(accountScope: string, next: EarnedSnapshot): EarnedMoment[] {
  if (scope !== accountScope) {
    resetEarnedMoments();
    scope = accountScope;
  }
  if (baseline === null) {
    baseline = next;
    return [];
  }
  const fresh = deriveEarnedMoments(baseline, next, announced);
  baseline = mergeForward(baseline, next);
  if (fresh.length === 0) return [];
  const queued = new Set(pending.map((m) => m.id));
  const added = fresh.filter((m) => !queued.has(m.id));
  if (added.length === 0) return [];
  pending = Object.freeze([...pending, ...added]);
  emit();
  return added;
}

/** Mark ids as already celebrated elsewhere; drops any pending moment with the same id. */
export function markAnnounced(ids: readonly string[]): void {
  for (const id of ids) announced.add(id);
  const kept = pending.filter((m) => !announced.has(m.id));
  if (kept.length !== pending.length) {
    pending = Object.freeze(kept);
    emit();
  }
}

/** The moment has been shown: remember it and drop it from the queue. */
export function acknowledge(id: string): void {
  announced.add(id);
  const kept = pending.filter((m) => m.id !== id);
  if (kept.length !== pending.length) {
    pending = Object.freeze(kept);
    emit();
  }
}

/** Sign-out / account change: clears baseline, ledger and queue. */
export function resetEarnedMoments(): void {
  scope = null;
  baseline = null;
  announced.clear();
  const hadPending = pending.length > 0;
  pending = Object.freeze([]);
  if (hadPending) emit();
}

const EMPTY: readonly EarnedMoment[] = Object.freeze([]);

export function useEarnedMoments(): readonly EarnedMoment[] {
  return useSyncExternalStore(subscribeEarnedMoments, pendingEarnedMoments, () => EMPTY);
}
