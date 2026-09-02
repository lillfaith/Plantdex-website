import Link from 'next/link';
import Image from 'next/image';
import { assetPath } from '@/lib/asset-path';
import { getHerb } from '@/lib/deck';
import { RARITY_AURA_COLOUR } from '@/lib/rarity-aura';
import { STAGE_LABEL, nextStageHint, stageForState } from '@/lib/garden';
import { HABITAT_LABEL } from '@/lib/habitat';
import { MASTERY_STAGE_LABEL, stageFor } from '@/lib/mastery';
import { titleLabel } from '@/lib/field-titles';
import type { ResolvedProfile } from '@/lib/player-profile';
import type { ProfileStats } from '@/lib/profile-stats';
import type { HerbdexState } from '@/lib/types';
import { PlantSprite } from '../PlantSprite';
import { RarityAura } from '../game/RarityAura';
import { RarityBadge } from '../herbdex/RarityBadge';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';
import { EYEBROW, MICRO_LABEL } from '../ui/accents';
import { ProfileAvatar } from './ProfileAvatar';
import { ProgressRing } from './ProgressRing';
import { Sparkles } from './Sparkles';

/**
 * THE PLAYER CARD — identity, progress, sidekick and signature plant as ONE composition.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THESE FOUR THINGS ARE NOW ONE THING. They shipped as three consecutive `.panel`
 * rectangles, which is how a trainer card turns into a form: identity in a box, companion in
 * a box, favourite card in a box, each with an identical border and an identical uppercase
 * eyebrow. None of them was more important than the others because nothing said so. Merged,
 * the hero can carry the page's whole hierarchy in one surface and let every section below
 * it be quieter.
 *
 * THIS IS THE ONLY `game-panel` ON THE PAGE. That utility is the deck's neon surface and its
 * own comment caps the budget — "the printed card must stay the brightest object on the
 * page". One bloom, spent here. Everything below uses `panel`, `field-panel` or `sunken`, so
 * hierarchy comes from surface DEPTH rather than from more glow. `profile-surfaces.test.ts`
 * fails if a second `game-panel` appears in this folder.
 *
 * PERSONALISED BY TINT, NOT BY REPAINT. `--accent` is the featured card's own rarity token
 * and it drives exactly two things: `hero-wash`'s corner gradient at 12%, and the aura
 * behind the card. Structure stays violet and gold. Handing rarity the whole surface would
 * make an Epic player's profile and a Common player's profile look like two products.
 *
 * OVERLAP IS THE MECHANISM, AND IT YIELDS TO READABILITY. The card breaks the top edge and
 * the avatar's level badge sits over the avatar's corner — but on a 390px phone, putting the
 * sidekick beside the avatar as well leaves the name about 180px between two sprites and a
 * card. So the sidekick moves to the hero's floor on mobile and only takes its place beside
 * the identity from `sm:` up. Crowding is not a style somebody grows to like.
 *
 * NOTHING HERE CLIPS. `RarityAura` is drawn entirely in the margin around the card, so an
 * ancestor with `overflow-hidden` would delete it. `game-clip` only chamfers a corner.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const STAGE_MARK: Record<string, IconName> = {
  discovered: 'discovered',
  learned: 'learned',
  mastered: 'mastered',
};

export function ProfileHero({
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
  const sidekick = profile.sidekickHerbId ? getHerb(profile.sidekickHerbId) : undefined;
  const featured = profile.featuredHerbId ? getHerb(profile.featuredHerbId) : undefined;

  const habitatName = stats.topHabitat ? HABITAT_LABEL[stats.topHabitat.habitat] : undefined;
  const title = profile.title ? titleLabel(profile.title, state, habitatName) : progress.levelName;

  const sidekickStage = sidekick ? stageForState(state, sidekick.id) : null;
  const featuredStage = featured ? (stageFor(state, featured.id) ?? 'discovered') : null;

  const xpPct = Math.round(progress.fraction * 100);
  const accent = featured ? RARITY_AURA_COLOUR[featured.rarity] : 'var(--color-violet-600)';

  /* The sidekick creature, rendered at the growth stage its own mastery earns — the same
     mapping the Garden uses. No second progression, no clock: `garden.ts`'s rule on one
     plant. Rendered twice because its two placements are genuinely different mechanisms:
     absolute on the hero floor at phone width, in normal flow beside the identity above it. */
  const sidekickSprite = sidekick && sidekickStage && (
    <span className="relative block h-full w-full">
      <span
        aria-hidden="true"
        className="absolute inset-x-3 bottom-0.5 z-0 h-1.5 rounded-full bg-violet-900/50 blur-[4px]"
      />
      <PlantSprite
        herbId={sidekick.id}
        alt={sidekick.commonName}
        stage={sidekickStage}
        fit
        className="relative z-10 w-full"
      />
      <Sparkles />
    </span>
  );

  /* The signature card. ONE definition, two placements — see the header: on a phone it sits
     in a bottom row beside the sidekick, because putting it top-right as well left the
     player's name about 150px of room and it truncated to "Wren Ash…". From `sm:` up there
     is room for it to break the panel's top edge, which is where it belongs. */
  const featuredCard = featured && featuredStage && (
    <div className="card-tilt relative">
      <RarityAura rarity={featured.rarity} size="grid" />
      <Link
        href={`/herbdex/${featured.id}`}
        aria-label={`Your signature plant: ${featured.commonName}, ${featured.rarity}. ${MASTERY_STAGE_LABEL[featuredStage]}.`}
        className="group relative z-10 block aspect-[356/576] overflow-hidden rounded-[var(--radius-card)] shadow-card"
      >
        <Image
          src={assetPath(featured.thumb)}
          alt=""
          fill
          sizes="(min-width: 640px) 10rem, 5rem"
          className="object-cover"
        />
        {/* The shine, on hover only — reserved for a card you have mastered. */}
        {featuredStage === 'mastered' && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 group-hover:animate-sheen group-hover:opacity-100 motion-reduce:group-hover:animate-none"
          />
        )}
      </Link>
    </div>
  );

  const signatureLine = featured && featuredStage && (
    <>
      <RarityBadge rarity={featured.rarity} />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/45 bg-gold-500/12 px-2 py-0.5 text-xs font-bold text-gold-300">
        <PlantdexIcon name={STAGE_MARK[featuredStage]!} className="text-xs" aria-hidden="true" />
        {MASTERY_STAGE_LABEL[featuredStage]}
      </span>
    </>
  );

  return (
    <section
      aria-labelledby="profile-identity"
      className="game-panel game-clip hero-wash relative p-4 sm:p-6"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <h2 id="profile-identity" className="sr-only">
        Your field naturalist card
      </h2>

      {/* ── Identity row ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 sm:gap-5">
        <span className="relative shrink-0">
          <ProfileAvatar
            herbId={profile.avatarHerbId}
            herbName={avatarHerb?.commonName}
            frame={profile.frame}
            stage={
              (profile.avatarHerbId && stageForState(state, profile.avatarHerbId)) || 'flowering'
            }
          />
          {/* The level worn on the avatar, the way a trainer card wears its number — not
              filed in a stat row where it would be one figure among six. Repeated in words
              on the rank line below, so nothing depends on reading a badge. */}
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -bottom-1.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 border-plum-950 bg-gold-500 text-sm font-extrabold text-violet-deep tabular-nums sm:h-9 sm:w-9 sm:text-base"
          >
            {progress.level}
          </span>
        </span>

        {/* Desktop only: the companion stands beside the identity, which is where it reads
            as a companion rather than as a mascot parked in a corner. */}
        {sidekickSprite && (
          <span className="hidden h-24 w-24 shrink-0 self-end sm:block">{sidekickSprite}</span>
        )}

        <div className="min-w-0 flex-1 sm:pr-44">
          <p className={`${EYEBROW} text-mystery-lilac`}>Field naturalist</p>
          <p className="font-display mt-0.5 truncate text-2xl font-extrabold text-gold-plate sm:text-4xl">
            {profile.displayName ?? 'Unnamed'}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-violet-200 sm:text-base">
            {title}
          </p>
          {/*
            With no title chosen the line above IS the level name, so printing
            "Level 1 · Seedling" under "Seedling" says the same word twice. The rank line
            drops the name in that case and keeps only the number the title cannot carry.
          */}
          <p className={`${MICRO_LABEL} mt-1 truncate text-violet-400`}>
            Level {progress.level}
            {profile.title ? ` · ${progress.levelName}` : ''}
          </p>

          {sidekick && sidekickStage && (
            <p className="mt-2 hidden text-xs text-violet-300 sm:block">
              <span className="font-bold text-violet-200">{sidekick.commonName}</span> travels with
              you · {STAGE_LABEL[sidekickStage]}
              {sidekickStage !== 'flowering' && nextStageHint(sidekickStage)
                ? ` · ${nextStageHint(sidekickStage)}`
                : ''}
            </p>
          )}
        </div>
      </div>

      {featuredCard && (
        <div className="absolute top-5 right-6 z-10 hidden w-40 sm:block">{featuredCard}</div>
      )}

      {/* ── Meters ──────────────────────────────────────────────────────── */}
      {/*
        THE RESERVE IS NOT OPTIONAL. The card is absolutely positioned so it can break the
        panel's top edge, which means it takes no space and the meters ran straight under it —
        the XP figure was clipped by the card's edge and the collection count sat behind it
        entirely. `sm:pr-52` is the card's width plus its right offset plus a gutter.
      */}
      <div className="mt-4 flex items-end gap-4 sm:mt-6 sm:pr-52">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className={`${MICRO_LABEL} text-violet-300`}>Experience</p>
            <p className="glow-gold text-sm font-bold text-gold-300 tabular-nums">
              {progress.xp.toLocaleString()}
              {progress.nextLevelXp !== null && (
                <span className="font-semibold text-violet-400">
                  {' '}
                  / {progress.nextLevelXp.toLocaleString()}
                </span>
              )}{' '}
              XP
            </p>
          </div>
          {/* Taller than a normal bar (12px) because this is the page's headline number, and
              filled through `.path-fill` so it animates in once on arrival rather than every
              time something re-renders. */}
          <div
            className="mt-1.5 h-3 overflow-hidden rounded-full bg-plum-950/80 ring-1 ring-violet-600/40"
            role="progressbar"
            aria-valuenow={xpPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={
              progress.nextLevelXp === null
                ? 'Maximum level reached'
                : `${xpPct}% of the way to level ${progress.level + 1}`
            }
          >
            <div
              className="path-fill h-full rounded-full bg-gradient-to-r from-gold-500 to-pink-accent"
              style={{ '--fill': `${Math.max(xpPct, progress.xp > 0 ? 2 : 0)}%` } as React.CSSProperties}
            />
          </div>
          <p className="mt-1 text-xs text-violet-300">
            {progress.nextLevelXp === null
              ? 'Highest level reached.'
              : `${(progress.nextLevelXp - progress.xp).toLocaleString()} XP to level ${progress.level + 1}`}
          </p>

          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className={`${MICRO_LABEL} text-violet-300`}>Collection</p>
            <p className="text-sm font-bold text-violet-200 tabular-nums">
              {stats.discovered}
              <span className="font-semibold text-violet-400"> / {stats.deckSize}</span>
            </p>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-plum-950/80 ring-1 ring-violet-600/40">
            <div
              className="path-fill h-full rounded-full bg-cyan-accent"
              style={{ '--fill': `${stats.completionPct}%` } as React.CSSProperties}
            />
          </div>
        </div>

        {/* The one ring on the page. A second bar here would read as a duplicate of the one
            above it; a different shape is what lets both be taken in at a glance. */}
        <ProgressRing
          value={stats.completionPct}
          label={`${stats.discovered} of ${stats.deckSize} plants discovered`}
        />
      </div>

      {/*
        PHONE ONLY: the card, its state, and the companion in one bottom row.

        This is the simplification the crowding forced. The first version put the card
        top-right on every width and the sidekick on the hero's floor — at 390px that left
        the name truncated, the rank line wrapped onto two, the card sitting over the XP
        figure and the creature standing on the collection bar. Overlap is worth having
        until it costs readability, and here it did. The badge on the avatar is the one
        overlap the phone layout keeps.
      */}
      {(featuredCard || sidekickSprite) && (
        <div className="mt-4 flex items-end gap-3 border-t border-violet-700/45 pt-4 sm:hidden">
          {featuredCard && <div className="w-20 shrink-0">{featuredCard}</div>}
          {featured && (
            <div className="min-w-0 flex-1">
              <p className={`${MICRO_LABEL} text-mystery-pink`}>Signature plant</p>
              <Link
                href={`/herbdex/${featured.id}`}
                className="tap-44 mt-0.5 block truncate text-sm font-bold text-violet-100"
              >
                {featured.commonName}
              </Link>
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">{signatureLine}</span>
            </div>
          )}
          {sidekickSprite && (
            <span className="relative h-[4.5rem] w-[4.5rem] shrink-0 self-end">
              {sidekickSprite}
              <span className="sr-only">
                {sidekick?.commonName} travels with you
                {sidekickStage ? `, ${STAGE_LABEL[sidekickStage]}` : ''}.
              </span>
            </span>
          )}
        </div>
      )}

      {/* Signature plant's own line, under the meters, where there is room for words. On a
          phone the card carries a "Signature" label instead. */}
      {featured && featuredStage && (
        <div className="mt-4 hidden flex-wrap items-center gap-2 border-t border-violet-700/45 pt-3 sm:flex sm:pr-52">
          <span className={`${MICRO_LABEL} text-mystery-pink`}>Signature plant</span>
          <Link
            href={`/herbdex/${featured.id}`}
            className="tap-44 text-sm font-bold text-violet-100 hover:text-gold-300"
          >
            {featured.commonName}
          </Link>
          <span className="text-xs text-violet-400 italic">{featured.scientificName}</span>
          {signatureLine}
        </div>
      )}

      {/* Nothing chosen yet — an empty hero must still read as the start of something rather
          than as a broken one. Kept to one sentence; the editor is a few sections down. */}
      {!featured && !sidekick && (
        <p className="mt-4 text-sm text-violet-300 sm:mt-5">
          Pick an avatar, a sidekick and a signature plant to make this card yours.
        </p>
      )}
    </section>
  );
}
