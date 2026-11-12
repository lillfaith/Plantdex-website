'use client';

import Link from 'next/link';
import { useHerbdex } from '@/state/HerbdexProvider';
import { getAchievement } from '@/lib/achievements';
import { FIELD_FRAMES } from '@/lib/field-frames';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { ProfileAvatar } from '../profile/ProfileAvatar';

/**
 * THE ONE QUEST A NEW PLAYER IS SHOWN.
 *
 * A new player used to meet three equal Field Research tasks, each naming a specific plant
 * they have no reason to be near ("Find Nettle"). This replaces that first impression with
 * the single objective the game actually starts on: record any one real find. It is not a
 * task and has no state of its own — the badge and the frame are the existing `first-find`
 * achievement and `amber-ring` frame, read from their definitions, and they unlock the
 * moment a real discovery is recorded. Nothing here awards anything or adds an XP source.
 *
 * It renders only while the collection is empty, and only once the store is ready, because
 * before hydration every collection looks empty.
 *
 * `cta` is false on /herbdex, where the scanner sits directly beneath: a second button to
 * the same place forty pixels away reads as a page that cannot decide what it wants.
 */
export function FirstQuestCard({ cta = true }: { cta?: boolean }) {
  const { ready, discoveredCount } = useHerbdex();
  if (!ready || discoveredCount > 0) return null;

  const badge = getAchievement('first-find');
  const amberRing = FIELD_FRAMES.find((entry) => entry.id === 'amber-ring');

  return (
    <section
      aria-labelledby="first-quest-heading"
      className="mt-4 rounded border-2 border-gold-500 bg-gold-500/10 px-4 py-3 shadow-[3px_3px_0_var(--color-plum-950)]"
    >
      <p className="text-[0.72rem] font-bold tracking-[0.18em] text-gold-300 uppercase">
        Your first quest
      </p>
      <h2 id="first-quest-heading" className="font-display text-2xl font-bold text-gold-plate">
        Make your first find
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-violet-100">
        Find any plant growing outdoors, photograph it, then record it. It counts once you
        confirm the find.{' '}
        {!cta && 'Use the scanner just below.'}
      </p>
      {badge && amberRing && (
        <ul className="mt-3 flex items-center gap-4 text-xs font-bold text-gold-300">
          <li className="flex items-center gap-2">
            <PlantdexIcon name="sprout" className="text-2xl text-gold-400" />
            <span>{badge.name} badge</span>
          </li>
          <li className="flex items-center gap-2">
            <ProfileAvatar herbId="taraxacum-officinale" frame={amberRing} size="xs" />
            <span>{amberRing.name} profile frame</span>
          </li>
        </ul>
      )}
      {cta && (
        <Link
          href="/scan"
          className="arcade-key mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-400 px-6 text-sm font-bold tracking-wide text-plum-900 uppercase transition-colors hover:bg-gold-300"
        >
          Find my first plant
        </Link>
      )}
    </section>
  );
}
