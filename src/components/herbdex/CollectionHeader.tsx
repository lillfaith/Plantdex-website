'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePrevious } from '@/lib/use-previous';
import { useHerbdex } from '@/state/HerbdexProvider';
import { useProfileStore } from '@/lib/profile-store';
import { resolveProfile } from '@/lib/player-profile';
import { titleLabel } from '@/lib/field-titles';
import { stageForState } from '@/lib/garden';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { CURRENT_COLLECTION } from '@/lib/collection';
import { progressionSubtext } from '@/lib/progression-track';
import { XpMilestones } from '../game/XpMilestones';
import { CountUp } from './CountUp';
import { ProfileAvatar } from '../profile/ProfileAvatar';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { achievementIcon } from '../icons/achievement-icons';
import { PixelIcon } from './HerbalVisuals';
import { illustration, traitBadge } from '@/lib/pixel-icons';

/**
 * The top of the collection: who you are, how far along, what you hold, what you have earned.
 *
 * Every number comes from `useHerbdex()`, exactly as `ProgressHeader` read them: no XP or
 * level threshold lives here, and the profile fields are the already-validated
 * `resolveProfile` output. Nothing is stored and nothing new is awarded.
 */
export function CollectionHeader() {
  const { progress, discoveredCount, learnedCount, masteredCount, deckSize, state, ready } =
    useHerbdex();
  const { profile: stored } = useProfileStore();
  const profile = useMemo(() => resolveProfile(stored, state), [stored, state]);
  const previousXp = usePrevious(progress.xp);

  const pct = Math.round(progress.fraction * 100);
  const title = profile.title ? titleLabel(profile.title, state) : progress.levelName;
  const collectionComplete = ready && deckSize > 0 && discoveredCount >= deckSize;

  // Four badges: earned ones first (in the achievements' own order), then the next locked ones.
  const earned = ACHIEVEMENTS.filter((a) => ready && Boolean(state.achievements[a.id]));
  const locked = ACHIEVEMENTS.filter((a) => !(ready && state.achievements[a.id]));
  const shown = [...earned, ...locked].slice(0, 4);

  return (
    <section aria-labelledby="progress-heading" className="space-y-4">
      <h2 id="progress-heading" className="sr-only">
        Your progress
      </h2>

      {/* ── Identity ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link href="/profile" aria-label="Open your field naturalist card" className="shrink-0">
          <ProfileAvatar
            herbId={profile.avatarHerbId}
            herbName={undefined}
            frame={profile.frame}
            stage={
              (profile.avatarHerbId && stageForState(state, profile.avatarHerbId)) || 'flowering'
            }
            size="lg"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-xl leading-tight font-extrabold text-violet-50">
                {profile.displayName ?? 'Field Naturalist'}
              </p>
              <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-gold-300">
                <PlantdexIcon name="laurel" className="text-sm" aria-hidden="true" />
                <span className="truncate">{title}</span>
              </p>
            </div>
            <span className="rounded-full border-2 border-gold-500/80 bg-plum-900/70 px-3 py-1 text-sm font-extrabold text-gold-200 tabular-nums">
              Lv. {progress.level}
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="relative">
          <div
            className="relative h-6 overflow-hidden rounded-full bg-plum-950/80 ring-2 ring-violet-400/60"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={
              progress.nextLevelXp === null
                ? 'Maximum level reached'
                : `${pct}% of the way to level ${progress.level + 1}`
            }
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-500 to-pink-accent transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(pct, discoveredCount > 0 ? 2 : 0)}%` }}
            />
            <p className="absolute inset-y-0 right-6 flex items-center text-xs font-extrabold text-violet-50 tabular-nums">
              <CountUp from={previousXp} to={progress.xp} durationMs={900} />
              {progress.nextLevelXp !== null && (
                <span>&nbsp;/ {progress.nextLevelXp.toLocaleString()}</span>
              )}
              &nbsp;XP
            </p>
          </div>
          <XpMilestones progress={progress} />
        </div>
        <p className="mt-1.5 text-xs text-violet-300">{progressionSubtext(progress)}</p>
        {ready && progress.xp === 0 && (
          <p className="mt-1 text-xs text-violet-400">
            Earn XP by exploring and completing Field Research. Higher levels unlock digital Field
            Cards.
          </p>
        )}
      </div>

      {/* ── What you hold ───────────────────────────────────────────── */}
      <dl className="grid grid-cols-3 divide-x divide-violet-500/40 text-center">
        <Stat
          icon={<PixelIcon uri={illustration('cards')} size={34} />}
          value={`${discoveredCount} / ${deckSize}`}
          label="Cards collected"
        />
        <Stat
          icon={<PixelIcon uri={illustration('leaf')} size={34} />}
          value={String(learnedCount)}
          label="Cards learned"
        />
        <Stat
          icon={<PixelIcon uri={traitBadge('star')} size={34} />}
          value={`${masteredCount} / ${deckSize}`}
          label="Cards mastered"
        />
      </dl>
      <p className="-mt-2 text-center text-xs text-violet-400">
        Found &rarr; learned &rarr; found again &rarr; mastered.
      </p>

      {collectionComplete && (
        <div className="rounded-xl border border-gold-500/60 bg-gold-500/[0.1] p-4 text-center">
          <p aria-hidden="true" className="flex justify-center text-3xl text-gold-400">
            <PlantdexIcon name="laurel" />
          </p>
          <p className="font-display mt-1 text-base font-extrabold text-gold-plate">
            {CURRENT_COLLECTION.shortName} complete
          </p>
          <p className="mt-1 text-sm text-violet-200">
            All {deckSize} plants in the original deck, found in the real world.
          </p>
          <p className="mt-2 text-xs text-violet-400">More pages to fill someday.</p>
        </div>
      )}

      {/* ── Achievements ─────────────────────────────────────────────── */}
      <div className="border-t border-violet-500/40 pt-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-violet-50">
            <PixelIcon uri={illustration('trophy')} size={30} />
            Achievements
          </p>
          <Link
            href="/profile"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-violet-300 tabular-nums hover:text-gold-300"
          >
            {earned.length} / {ACHIEVEMENTS.length}
            <span aria-hidden="true">&rsaquo;</span>
            <span className="sr-only"> achievements. Open your profile.</span>
          </Link>
        </div>
        <ul className="mt-1 grid grid-cols-4 gap-2 text-center">
          {shown.map((achievement) => {
            const isEarned = Boolean(ready && state.achievements[achievement.id]);
            return (
              <li key={achievement.id} className="flex flex-col items-center gap-1">
                <span
                  className={`relative flex h-14 w-14 items-center justify-center rounded-xl border-2 text-2xl ${
                    isEarned
                      ? 'border-gold-400 bg-plum-800/70 text-gold-300 shadow-[0_0_10px_rgb(255_212_92/0.35)]'
                      : 'border-violet-600/60 bg-plum-900/50 text-violet-400/70'
                  }`}
                >
                  <PlantdexIcon
                    name={achievementIcon(achievement.id)}
                    aria-hidden="true"
                    className={isEarned ? '' : 'opacity-60'}
                  />
                  {!isEarned && (
                    <PlantdexIcon
                      name="locked"
                      aria-hidden="true"
                      className="absolute -top-1.5 -right-1.5 text-sm text-violet-300"
                    />
                  )}
                </span>
                <span
                  className={`text-xs leading-tight font-semibold ${
                    isEarned ? 'text-violet-50' : 'text-violet-300'
                  }`}
                >
                  {achievement.name}
                </span>
              </li>
            );
          })}
        </ul>
        <details className="mt-1">
          <summary className="group flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-xs font-bold tracking-wide text-violet-300 uppercase">
            <span
              aria-hidden="true"
              className="text-base leading-none transition-transform group-open:rotate-90 motion-reduce:transition-none"
            >
              &rsaquo;
            </span>
            All achievements
          </summary>
          <ul className="space-y-1.5 pb-2">
            {ACHIEVEMENTS.map((achievement) => {
              const isEarned = Boolean(ready && state.achievements[achievement.id]);
              return (
                <li key={achievement.id} className="flex items-start gap-2 text-xs">
                  <PlantdexIcon
                    name={achievementIcon(achievement.id)}
                    aria-hidden="true"
                    className={`mt-0.5 shrink-0 text-base ${isEarned ? 'text-gold-300' : 'text-violet-500'}`}
                  />
                  <span className={isEarned ? 'text-violet-50' : 'text-violet-300'}>
                    <span className="font-bold">{achievement.name}</span>
                    {isEarned ? ' (unlocked)' : ' (locked)'} &mdash; {achievement.description}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      </div>
    </section>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1">
      {icon}
      <dd className="text-xl leading-none font-extrabold text-violet-50 tabular-nums">{value}</dd>
      <dt className="text-xs leading-tight text-violet-300">{label}</dt>
    </div>
  );
}
