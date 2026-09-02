'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useHerbdex } from '@/state/HerbdexProvider';
import { resolveProfile } from '@/lib/player-profile';
import { useProfileStore } from '@/lib/profile-store';
import { profileStats } from '@/lib/profile-stats';
import { Cabinet } from './Cabinet';
import { EditProfilePanel } from './EditProfilePanel';
import { FeaturedPlant } from './FeaturedPlant';
import { FieldRecord } from './FieldRecord';
import { GardenPreview } from './GardenPreview';
import { HabitatIdentity } from './HabitatIdentity';
import { IdentityBanner } from './IdentityBanner';
import { PinnedAchievements } from './PinnedAchievements';
import { RecentFinds } from './RecentFinds';
import { SidekickPanel } from './SidekickPanel';

/**
 * The profile, assembled.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTHING HERE IS FETCHED THAT IS NOT ALREADY IN MEMORY. The whole page is derived from
 * `HerbdexState` — the same state the Herbdex, the Garden and the achievement shelf read —
 * plus one small row of chosen settings. That is why there is no loading state beyond the
 * one the collection itself has, and no second source of truth to keep in step.
 *
 * NO `SafetyNotice`, DELIBERATELY. Every page that discusses ingestion, preparation,
 * identification or medicinal tradition carries one; this page discusses none of them. It
 * lists plants you have found and cosmetics you have earned. A notice repeated onto a page
 * that raises no such risk is how the notices on the pages that DO raise one stop being
 * read — the same argument that moved the full disclaimer to `/safety`.
 *
 * NO `DeckCta` either. The four placements are a fixed, tested set with one per page.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ORDER IS THE MOBILE ORDER. One column on a phone, top to bottom: who you are, who is with
 * you, your signature card, what you have done, where you walk, what you are proudest of,
 * what you found last, what is growing, and last of all the cabinet — folded, because a list
 * of cosmetics is the least urgent thing here and should never sit between a player and the
 * rest of the page.
 */
export function ProfileView() {
  const { state, ready: collectionReady } = useHerbdex();
  const { profile: stored, ready: profileReady, save, error } = useProfileStore();

  const stats = useMemo(() => profileStats(state), [state]);
  const profile = useMemo(() => resolveProfile(stored, state), [stored, state]);

  // Both stores must have spoken. Editing before then could write a placeholder over a real
  // row, which is the same reason every mutating method on the collection store needs
  // `ready` first.
  const ready = collectionReady && profileReady;

  return (
    <main id="main" className="mx-auto max-w-4xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-2">
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-violet-300 hover:text-gold-400"
        >
          ← Plantdex
        </Link>
      </nav>

      <h1 className="sr-only">Your profile</h1>

      <div className="space-y-4">
        <IdentityBanner profile={profile} stats={stats} state={state} />
        <SidekickPanel herbId={profile.sidekickHerbId} state={state} />
        <FeaturedPlant herbId={profile.featuredHerbId} state={state} />
        <FieldRecord stats={stats} />
        <HabitatIdentity stats={stats} />
        <PinnedAchievements ids={profile.pinnedAchievementIds} />
        <RecentFinds finds={stats.recentFinds} />
        <GardenPreview entries={stats.gardenPreview} />

        {/*
          RENDERED UNCONDITIONALLY, AT A FIXED POSITION. Saving re-renders the banner at the
          top of this list; an editor mounted inside a branch that changed would be recreated
          underneath itself. It is disabled rather than removed while the stores load, so its
          position in the tree never moves.
        */}
        <EditProfilePanel
          profile={stored}
          state={state}
          stats={stats}
          onSave={save}
          disabled={!ready}
          error={error}
        />
        <Cabinet state={state} stats={stats} />

        <p className="px-1 text-xs text-violet-400">
          This profile is yours alone — nobody else can see it. It shows no email address, no
          journal notes and nothing about where you have been.
        </p>
      </div>
    </main>
  );
}
