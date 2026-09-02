'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/state/AuthProvider';
import { useHerbdex } from '@/state/HerbdexProvider';
import { AccountDataSection } from '@/components/auth/AccountDataSection';
import { resolveProfile } from '@/lib/player-profile';
import { useProfileStore } from '@/lib/profile-store';
import { profileStats } from '@/lib/profile-stats';
import { EYEBROW, MICRO_LABEL } from '@/components/ui/accents';
import { Cabinet } from './Cabinet';
import { EditProfilePanel } from './EditProfilePanel';
import { FieldRecord } from './FieldRecord';
import { GardenPreview } from './GardenPreview';
import { HabitatIdentity } from './HabitatIdentity';
import { PinnedAchievements } from './PinnedAchievements';
import { ProfileHero } from './ProfileHero';
import { RecentFinds } from './RecentFinds';

/**
 * The profile, assembled.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SIX SURFACES, NOT ONE. The page first shipped as nine consecutive `.panel` rectangles —
 * same background, same hairline, same uppercase eyebrow — which is why nothing on it read
 * as more important than anything else. It now runs down a deliberate ramp:
 *
 *   game-panel     the hero, and only the hero. The page's whole neon budget.
 *   panel          the gameplay sections: field record, habitats, garden.
 *   field-panel    reference: recent finds, the editor.
 *   science-panel  the flattest: the cabinet.
 *   sunken         recesses INSIDE those — stat tiles, cabinet slots.
 *   no surface     the trophies, floating on the page ground.
 *
 * Nothing here invents a colour or a surface: every one of those is a utility that already
 * existed for the plant page, plus `sunken`, which is the missing step below `.panel`.
 *
 * NOTHING IS FETCHED THAT IS NOT ALREADY IN MEMORY. The whole page derives from
 * `HerbdexState` — the same state the Herbdex, the Garden and the achievement shelf read —
 * plus one small row of chosen settings.
 *
 * NO `SafetyNotice`, DELIBERATELY. Every page that discusses ingestion, preparation,
 * identification or medicinal tradition carries one; this page discusses none of them. A
 * notice repeated onto a page that raises no such risk is how the notices on the pages that
 * DO raise one stop being read. No `DeckCta` either — four placements, one per page, fixed.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SPACING IS PART OF THE HIERARCHY. The gaps are uneven on purpose: wide after the hero and
 * around the floating trophies, tight between the two gameplay sections that belong
 * together. An even rhythm is what made nine sections read as one list.
 */
export function ProfileView() {
  const { state, ready: collectionReady } = useHerbdex();
  const { configured, ready: authReady, user, signOut } = useAuth();
  const { profile: stored, ready: profileReady, save, error } = useProfileStore();

  const stats = useMemo(() => profileStats(state), [state]);
  const profile = useMemo(() => resolveProfile(stored, state), [stored, state]);

  // Both stores must have spoken. Editing before then could write a placeholder over a real
  // row, which is the same reason every mutating method on the collection store needs
  // `ready` first.
  const ready = collectionReady && profileReady;

  return (
    <main id="main" className="mx-auto max-w-4xl px-4 pt-6 pb-8">
      <nav aria-label="Breadcrumb" className="mb-2">
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-violet-300 hover:text-gold-400"
        >
          ← Plantdex
        </Link>
      </nav>

      <h1 className="sr-only">Your profile</h1>

      <ProfileHero profile={profile} stats={stats} state={state} />

      {/* Clearance for the sidekick, which stands on the hero's floor and overlaps its
          bottom edge on a phone. Without it the creature would sit on the next section. */}
      <div className="mt-8 space-y-3 sm:mt-6">
        <FieldRecord stats={stats} />
        <HabitatIdentity stats={stats} />
      </div>

      {/* The trophies float on the page ground, so they get air on both sides rather than a
          border to separate them. */}
      <div className="mt-7">
        <PinnedAchievements ids={profile.pinnedAchievementIds} />
      </div>

      <div className="mt-7 space-y-3">
        <RecentFinds finds={stats.recentFinds} />
        {/* Room above for the sprites, which stand proud of the strip's top edge. */}
        <div className="pt-2">
          <GardenPreview entries={stats.gardenPreview} />
        </div>
      </div>

      <div className="mt-7 space-y-3">
        {/*
          RENDERED UNCONDITIONALLY, AT A FIXED POSITION. Saving re-renders the hero at the top
          of this page; an editor mounted inside a branch that changed would be recreated
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
      </div>

      {/*
        ── YOUR ACCOUNT ─────────────────────────────────────────────────────────
        Identity and data, at the foot of the page they belong to. These moved here from
        /account rather than being copied: account deletion is irreversible, and an
        irreversible action offered in two places is one somebody meets twice and trusts
        less each time. /account keeps the sign-in door and nothing else.

        `AccountDataSection` sits OUTSIDE the signed-in branch, and that is load-bearing.
        Its own comment records why: deleting an account signs the player out, which unmounts
        every signed-in branch — including, if it were nested in one, the confirmation dialog
        reporting the result, mid-sentence. Same rule as the editor above and the knowledge
        check on a plant page.

        Still no `SafetyNotice`. An email address and a delete button raise no question of
        ingestion, preparation, identification or medicinal tradition, so the page's position
        is unchanged — and a notice repeated onto a page that raises no such risk is how the
        notices on pages that DO raise one stop being read.
      */}
      <div className="mt-8 space-y-3">
        <h2 className={`${EYEBROW} px-1 text-mystery-purple`}>Your account</h2>

        {configured && authReady && user && (
          <section className="science-panel p-4 sm:p-5">
            <p className={`${MICRO_LABEL} text-violet-400`}>Signed in as</p>
            <p className="mt-1 truncate text-sm font-bold text-violet-100">{user.email}</p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-4 inline-flex min-h-11 items-center rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-plum-600"
            >
              Sign out
            </button>
          </section>
        )}

        {configured && authReady && !user && (
          <section className="science-panel p-4 sm:p-5">
            <p className={`${MICRO_LABEL} text-violet-400`}>Not signed in</p>
            <p className="mt-1.5 text-sm text-violet-200">
              Your collection lives in this browser only, and clearing site data would take it
              with no way back.
            </p>
            <Link
              href="/account"
              className="mt-4 inline-flex min-h-11 items-center rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-plum-600"
            >
              Sign in or create an account
            </Link>
          </section>
        )}

        <AccountDataSection userId={user?.id} email={user?.email ?? undefined} />
      </div>

      <p className="mt-6 px-1 text-xs text-violet-400">
        This profile is yours alone — nobody else can see it. It shows no journal notes and
        nothing about where you have been. Your email address appears here only because you
        are the one reading it.
      </p>
    </main>
  );
}
