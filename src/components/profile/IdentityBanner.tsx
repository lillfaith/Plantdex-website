import { getHerb } from '@/lib/deck';
import { stageForState } from '@/lib/garden';
import { HABITAT_LABEL } from '@/lib/habitat';
import { titleLabel } from '@/lib/field-titles';
import type { ResolvedProfile } from '@/lib/player-profile';
import type { ProfileStats } from '@/lib/profile-stats';
import type { HerbdexState } from '@/lib/types';
import { ProfileAvatar } from './ProfileAvatar';
import { EYEBROW } from '../ui/accents';

/**
 * The player card at the top of the profile.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS THE ONE `game-panel` ON THE PAGE. That utility is the deck's neon surface, and
 * its own comment sets the limit this respects: "kept low: the printed card must stay the
 * brightest object on the page". Spending it here and nowhere else is what makes the banner
 * read as the most important block without anything below it having to compete — hierarchy
 * from surface weight rather than from more glow. Every section under it uses `panel`.
 *
 * EVERY NUMBER IS DERIVED. Level, XP and the band come from `progressFromState()` through
 * `ProfileStats`; there is no threshold literal here and no stored progression value
 * anywhere behind it.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE TITLE FALLS BACK TO THE LEVEL NAME. With no title chosen this prints
 * `progress.levelName` — "Field Explorer", "Master Herbalist" — straight from the ladder, so
 * a player who has never opened the editor still has one, and the ladder stays the single
 * source of truth for those names.
 */
export function IdentityBanner({
  profile,
  stats,
  state,
}: {
  profile: ResolvedProfile;
  stats: ProfileStats;
  state: HerbdexState;
}) {
  const { progress } = stats;
  const avatarHerb = profile.avatarHerbId ? getHerb(profile.avatarHerbId) : undefined;
  const habitatName = stats.topHabitat ? HABITAT_LABEL[stats.topHabitat.habitat] : undefined;
  const title = profile.title
    ? titleLabel(profile.title, state, habitatName)
    : progress.levelName;
  const pct = Math.round(progress.fraction * 100);

  return (
    <section aria-labelledby="profile-identity" className="game-panel game-clip p-4 sm:p-6">
      <h2 id="profile-identity" className="sr-only">
        Your field naturalist card
      </h2>

      <div className="flex items-start gap-4 sm:gap-5">
        <span className="relative">
          <ProfileAvatar
            herbId={profile.avatarHerbId}
            herbName={avatarHerb?.commonName}
            frame={profile.frame}
            stage={
              (profile.avatarHerbId && stageForState(state, profile.avatarHerbId)) || 'flowering'
            }
          />
          {/*
            The level badge sits ON the avatar, the way a trainer card wears its number —
            not in a stat row below, where it would read as one figure among six. The
            number is also printed in words in the XP line, so nothing depends on this.
          */}
          <span
            className="absolute -right-1.5 -bottom-1.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 border-plum-950 bg-gold-500 text-sm font-extrabold text-violet-deep tabular-nums"
            aria-hidden="true"
          >
            {progress.level}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <p className={`${EYEBROW} text-mystery-lilac`}>Field naturalist</p>
          <p className="font-display mt-0.5 truncate text-xl font-extrabold text-gold-plate sm:text-2xl">
            {profile.displayName ?? 'Unnamed'}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-violet-200">{title}</p>
          {/*
            With no title chosen the line above IS the level name, so printing
            "Level 1 · Seedling" under "Seedling" says the same word twice — which is what a
            brand-new profile did. The rank line drops the name in that case and keeps only
            the number the title cannot carry.
          */}
          <p className="mt-0.5 text-[0.72rem] font-semibold tracking-[0.1em] text-violet-400 uppercase">
            Level {progress.level}
            {profile.title ? ` · ${progress.levelName}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className={`${EYEBROW} text-violet-300`}>Experience</p>
          <p className="text-sm font-semibold text-violet-200 tabular-nums">
            {progress.xp.toLocaleString()}
            {progress.nextLevelXp !== null && (
              <span className="text-violet-400"> / {progress.nextLevelXp.toLocaleString()}</span>
            )}{' '}
            XP
          </p>
        </div>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full bg-plum-950/70 ring-1 ring-violet-600/45"
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
            style={{ width: `${Math.max(pct, progress.xp > 0 ? 2 : 0)}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-violet-300">
          {progress.nextLevelXp === null
            ? 'Highest level reached.'
            : `${(progress.nextLevelXp - progress.xp).toLocaleString()} XP to level ${progress.level + 1}`}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-violet-700/50 pt-3">
        <p className={`${EYEBROW} text-violet-300`}>Collection</p>
        <p className="text-sm font-semibold text-violet-200 tabular-nums">
          {stats.discovered} <span className="text-violet-400">/ {stats.deckSize}</span>
          <span className="ml-2 text-gold-300">{stats.completionPct}%</span>
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-plum-950/70 ring-1 ring-violet-600/45"
        role="progressbar"
        aria-valuenow={stats.completionPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${stats.discovered} of ${stats.deckSize} plants discovered`}
      >
        <div
          className="h-full rounded-full bg-cyan-accent transition-[width] duration-500 ease-out"
          style={{ width: `${stats.completionPct}%` }}
        />
      </div>
    </section>
  );
}
