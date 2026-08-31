'use client';

import { useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useAuth } from '@/state/AuthProvider';
import { useHerbdex } from '@/state/HerbdexProvider';
import { isAccountsConfigured } from '@/lib/supabase-client';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * "Your progress is on this device."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE PROBLEM THIS SOLVES, AND THE ONE IT MUST NOT CREATE
 *
 * Signed out, everything works and nothing is stored anywhere but the browser — which is a
 * genuinely good default, and also a quiet trap: the app feels as durable as any account-
 * backed product right up until somebody clears their site data and finds a collection they
 * spent a season building is gone. Nobody warned them, because nothing ever looked
 * temporary.
 *
 * The failure mode of fixing that is worse than the bug: a signup wall, a modal on arrival,
 * a banner that returns every session. So the rules here are deliberate constraints, not
 * decoration:
 *
 *   • NEVER ON ARRIVAL. It appears only once a player has something worth losing.
 *   • NEVER BLOCKING. Inline in the page flow, never a modal, never over content.
 *   • DISMISSIBLE FOR GOOD. Dismissal is remembered; it does not come back next week.
 *   • NEVER A WALL. Everything stays usable signed out, before and after dismissal.
 *   • HONEST. It says where the data is, not that the player is doing something wrong.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DISMISSED_KEY = 'plantdex.local-progress-notice-dismissed.v1';

/**
 * How much progress counts as "worth protecting".
 *
 * Three discoveries rather than one: a single find is a person trying the app out, and
 * asking them to make an account at that moment is the wall this is trying not to be. By the
 * third they have chosen to keep going.
 */
const DISCOVERIES_BEFORE_NUDGE = 3;

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    // Storage blocked. Say nothing rather than nag on every render — and if storage is
    // blocked there is no local progress to protect in the first place.
    return true;
  }
}

/*
 * Read through `useSyncExternalStore` rather than an effect, matching `useRevealed` in
 * reveals.ts. The static HTML is shared by every visitor, so the server snapshot must be
 * "dismissed" — that way the notice is absent from the markup and can only ever appear
 * after hydration, and there is no synchronous setState in an effect to cascade a render.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function LocalProgressNotice() {
  const { user, ready: authReady } = useAuth();
  const { state, ready } = useHerbdex();

  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);

  const onDismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // Dismissal not remembered across reloads. Hiding it now is still the right response,
      // and the listeners below still fire, so it disappears immediately either way.
    }
    for (const listener of listeners) listener();
  }, []);

  if (!ready || !authReady || dismissed) return null;
  // Signed in, there is nothing to warn about — progress is already synced.
  if (user) return null;
  // No Supabase configured on this deployment: an account is not on offer, so the notice
  // would be asking for something that cannot be done.
  if (!isAccountsConfigured()) return null;

  const discoveries = Object.keys(state.discoveries).length;
  if (discoveries < DISCOVERIES_BEFORE_NUDGE) return null;

  return (
    <aside
      aria-labelledby="local-progress-heading"
      className="panel relative mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4"
    >
      <PlantdexIcon
        name="storage"
        className="shrink-0 text-xl text-violet-300"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <h2
          id="local-progress-heading"
          className="text-[0.72rem] font-bold tracking-[0.1em] text-gold-400 uppercase"
        >
          Saved on this device
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-violet-200">
          Your {discoveries} discoveries are stored in this browser only. Clearing your site
          data would delete them. An account syncs your collection and keeps it safe.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/account"
          className="inline-flex min-h-11 items-center rounded-full bg-gold-500 px-4 text-sm font-bold text-violet-deep hover:bg-gold-400"
        >
          Create an account
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-violet-300 hover:text-gold-400"
        >
          Not now
        </button>
      </div>
    </aside>
  );
}
