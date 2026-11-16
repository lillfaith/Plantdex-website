'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * A SMALL TROPHY IN THE CORNER THAT GOES STRAIGHT TO THE FIELD BOARD, ON EVERY PAGE.
 *
 * Not a seventh destination in `SiteNav` (that file explains why six is the budget). It sits in
 * the top-right cluster `layout.tsx` builds, immediately left of the account badge, so the two
 * header marks read as a pair and the badge's changing width (a 36px circle with an avatar, a
 * wider "Sign in" pill without) is the cluster's problem rather than this link's. A first
 * version floated top-left and clipped the corner of the profile avatar on the Collection page.
 *
 * `tap-44` for the same reason the badge has it: drawn at 36px, with an invisible overlay
 * keeping the thumb target at 44px. It carries no count, no dot and no motion, because the
 * board is opt-in and a nagging mark would be a nudge to join.
 */
export function BoardTrophyLink() {
  const onBoard = usePathname() === '/leaderboard';

  return (
    <Link
      href="/leaderboard"
      aria-label="Field Board"
      aria-current={onBoard ? 'page' : undefined}
      className={`tap-44 relative z-40 flex h-9 w-9 items-center justify-center rounded-full border text-lg backdrop-blur transition-colors ${
        onBoard
          ? 'border-gold-500/70 bg-plum-600/90 text-gold-300'
          : 'border-violet-600 bg-plum-950/90 text-gold-300 hover:bg-plum-600/80'
      }`}
    >
      <PlantdexIcon name="trophy" />
    </Link>
  );
}
