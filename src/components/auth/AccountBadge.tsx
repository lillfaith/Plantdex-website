'use client';

import Link from 'next/link';
import { useAuth } from '@/state/AuthProvider';

/**
 * A persistent, sitewide account-status affordance — not a seventh destination in
 * `SiteNav` (see that file's own comment on why six is the limit). Floats in the top-right
 * corner, clear of the fixed bottom nav bar on mobile and the top nav bar on wider screens.
 */
export function AccountBadge() {
  const { ready, configured, user } = useAuth();

  if (!configured || !ready) return null;

  const initial = user?.email?.[0]?.toUpperCase();

  return (
    <Link
      href="/account"
      className="fixed top-2 right-2 z-40 flex h-9 min-w-9 items-center justify-center rounded-full border border-violet-600 bg-violet-deep/90 px-3 text-xs font-semibold text-violet-100 backdrop-blur hover:bg-violet-800/80 sm:top-3 sm:right-3"
    >
      {user ? (initial ?? 'Account') : 'Sign in'}
    </Link>
  );
}
