'use client';

import { RecentFinds } from '../profile/RecentFinds';
import { recentFinds, RECENT_FIND_COUNT } from '@/lib/profile-stats';
import { useHerbdex } from '@/state/HerbdexProvider';

/**
 * The last few finds, on the page a returning player actually lands on.
 *
 * `RecentFinds` already existed and was mounted in exactly one place — `ProfileView` — so
 * the record of what you have been doing lately lived two taps away from where you do it.
 * This is the same component and the same `recentFinds()` data function, not a second
 * implementation: the strip renders identically on both pages, and a change to either lands
 * on both.
 *
 * A thin client wrapper because /herbdex is a server component and the collection lives in
 * the browser. It holds no logic of its own beyond "is there anything to show yet".
 *
 * SILENT UNTIL THERE IS SOMETHING TO SAY. `RecentFinds` has a written empty state and it is
 * right for the profile, which is a page about you and should acknowledge a blank record.
 * The Herbdex is a page about the deck: an empty panel above the grid would push the cards
 * down to announce that nothing has happened yet, which the silhouettes below already say
 * far better.
 */
export function RecentFindsStrip() {
  const { state, ready } = useHerbdex();
  if (!ready) return null;

  const finds = recentFinds(state, RECENT_FIND_COUNT);
  if (finds.length === 0) return null;

  return <RecentFinds finds={finds} />;
}
