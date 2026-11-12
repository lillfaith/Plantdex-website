'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * THE DAILY SCAN ALLOWANCE, AS THE PLAYER SEES IT.
 *
 * The server owns the real limit (`claim_scan_pair` in `identify-plant`, counted per signed-in
 * account or per anonymous bucket). This module only remembers what the last identification
 * answer said — `remaining` and `limit` — so the page can show "7 of 10 left today" before the
 * next tap, and a device that has just run out can say so instead of spending a round trip to
 * be told. It is a mirror, never an authority: nothing here can raise a limit, and a cleared
 * browser simply shows a full allowance until the next answer corrects it.
 *
 * The day is the server's day (UTC), because that is when the count resets; written with the
 * `getUTC*` accessors rather than an ISO slice, like the Field Board's day, so the rule that
 * nothing else names a UTC calendar day by slicing a string stays absolute.
 */
export const SIGNED_IN_DAILY_SCANS = 10;
export const ANON_DAILY_SCANS = 10;

const KEY = 'plantdex.scan-allowance.v1';

export interface ScanAllowance {
  limit: number;
  left: number;
  used: number;
}

export function dailyLimitFor(signedIn: boolean): number {
  return signedIn ? SIGNED_IN_DAILY_SCANS : ANON_DAILY_SCANS;
}

export function scanDay(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
}

function full(limit: number): ScanAllowance {
  return { limit, left: limit, used: 0 };
}

interface Stored {
  day: string;
  remaining: number;
  limit: number;
}

export function allowanceFromRaw(
  raw: string | null,
  signedIn: boolean,
  now: Date = new Date(),
): ScanAllowance {
  const limit = dailyLimitFor(signedIn);
  try {
    if (!raw) return full(limit);
    const stored = JSON.parse(raw) as Partial<Stored>;
    if (stored.day !== scanDay(now)) return full(limit);
    if (typeof stored.remaining !== 'number' || typeof stored.limit !== 'number') return full(limit);
    const total = stored.limit > 0 ? stored.limit : limit;
    const left = Math.max(0, Math.min(total, Math.floor(stored.remaining)));
    return { limit: total, left, used: total - left };
  } catch {
    return full(limit);
  }
}

export function readAllowance(
  scope: string,
  signedIn: boolean,
  now: Date = new Date(),
  storage: Pick<Storage, 'getItem'> | null = typeof window === 'undefined' ? null : window.localStorage,
): ScanAllowance {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(`${KEY}:${scope}`) ?? null;
  } catch {
    raw = null;
  }
  return allowanceFromRaw(raw, signedIn, now);
}

export function writeAllowance(
  scope: string,
  remaining: number,
  limit: number,
  now: Date = new Date(),
  storage: Pick<Storage, 'setItem'> | null = typeof window === 'undefined' ? null : window.localStorage,
): void {
  try {
    const value: Stored = { day: scanDay(now), remaining: Math.max(0, remaining), limit };
    storage?.setItem(`${KEY}:${scope}`, JSON.stringify(value));
  } catch {
    /* private mode or full storage: the display is a convenience, the server still counts */
  }
}

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (typeof window !== 'undefined') window.addEventListener('storage', callback);
  return () => {
    listeners.delete(callback);
    if (typeof window !== 'undefined') window.removeEventListener('storage', callback);
  };
}

export function useScanAllowance(userId: string | null) {
  const scope = userId ?? 'device';
  const signedIn = Boolean(userId);
  // The stored text is the snapshot, so the display follows storage (and other tabs) without
  // an effect that sets state. The server render sees no storage and shows a full allowance.
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(`${KEY}:${scope}`) ?? '';
      } catch {
        return '';
      }
    },
    () => '',
  );
  const allowance = useMemo(() => allowanceFromRaw(raw || null, signedIn), [raw, signedIn]);

  const record = useCallback(
    (remaining: number, limit?: number) => {
      const total = limit && limit > 0 ? limit : dailyLimitFor(signedIn);
      writeAllowance(scope, remaining, total);
      listeners.forEach((listener) => listener());
    },
    [scope, signedIn],
  );

  return { allowance, record };
}
