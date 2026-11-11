'use client';

import { useAuth } from '@/state/AuthProvider';
import { ANONYMOUS_SCOPE } from './region-store';

/**
 * Which player's region preference the current session should read.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS EXISTS BECAUSE THE FIRST VERSION DID NOT CALL IT.
 *
 * `useRegion()` defaults its scope to `device`, and both the picker and the board used the
 * default — so every account on a shared browser read and wrote ONE key. Signing in as a
 * second person showed them the first person's region, and changing it changed the first
 * person's too. That is precisely the leak this repository has shipped three times before
 * (the local-progress import offer, the Field Card unlock record), and the per-scope
 * storage I wrote was defending against it while nothing passed a scope.
 *
 * Deriving the scope in one place is what stops a fourth call site forgetting again.
 *
 * A SIGNED-OUT DEVICE IS A PLAYER and gets `device`, which is correct rather than a
 * fallback: signed out, the collection is local too. `ready` is not consulted — while auth
 * is resolving there is no user, so the device scope is the honest answer for that moment,
 * and the value re-resolves the instant a session appears.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function useRegionScope(): string {
  const { user } = useAuth();
  return user?.id ?? ANONYMOUS_SCOPE;
}
