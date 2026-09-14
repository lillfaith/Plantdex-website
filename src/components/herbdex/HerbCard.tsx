'use client';

import Image from 'next/image';
import Link from 'next/link';
import { RarityAura } from '../game/RarityAura';
import type { Herb } from '@/lib/types';
import { assetPath } from '@/lib/asset-path';
import { MASTERY_STAGE_LABEL, type MasteryStage } from '@/lib/mastery';
import { RarityBadge } from './RarityBadge';
import { MysteryCard } from './MysteryCard';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';

/**
 * The marker in the corner of a discovered card, one per mastery stage.
 *
 * Found → a ticked leaf. Learned → a seed opened up. Mastered → a flower in bloom. The
 * progression is botanical rather than a tick/diamond/star ladder borrowed from a game,
 * and each still carries its stage name in the accessible label.
 */
const STAGE_MARK: Record<MasteryStage, IconName> = {
  discovered: 'discovered',
  learned: 'learned',
  mastered: 'mastered',
};

/**
 * A single slot in the Herbdex grid.
 *
 * Discovered: the real card face, with a corner marker for its mastery stage.
 * Undiscovered: the same art rendered as a silhouette, with the literal words
 * "Not discovered" — the state is never conveyed by the visual treatment alone
 * (AGENTS.md: essential information must not depend solely on colour). The stage marker
 * follows the same rule: every marker carries its stage name in the accessible label.
 */
/**
 * A Field Card's XP state, and ONLY ever passed for a Field Card.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE TILE NEEDED A THIRD STATE AT ALL.
 *
 * `discovered` is binary and that was correct while the grid held only printed cards,
 * where the single question is "have you found this plant". A Field Card asks two
 * questions at once — have you EARNED it (XP), and have you FOUND it (outdoors) — and
 * they have different answers.
 *
 * Reusing the undiscovered branch would have re-created, in the grid, precisely the bug
 * CLAUDE.md records fixing on the card page: a player who had WON a Field Card was shown
 * a silhouette captioned "Not discovered" and told to go outside and find it. Earning and
 * finding stay three separate facts here — locked, earned, found — exactly as they are in
 * the reducer.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type FieldCardUnlock =
  /** Below the threshold. The tile names the XP, because that is what actually opens it. */
  | { kind: 'locked'; xp: number }
  /** Past the threshold. The card is readable and owned — but still not FOUND. */
  | { kind: 'earned' };

export function HerbCard({
  herb,
  discovered,
  stage = null,
  priority = false,
  unlock,
}: {
  herb: Herb;
  discovered: boolean;
  /** Mastery stage, or null while storage is still loading. */
  stage?: MasteryStage | null;
  priority?: boolean;
  /** Field Cards only. Absent for every printed card, whose behaviour is unchanged. */
  unlock?: FieldCardUnlock;
}) {
  const number = `#${String(herb.cardNumber).padStart(2, '0')}`;
  const stageLabel = stage ? MASTERY_STAGE_LABEL[stage] : 'Discovered';

  /*
   * An earned Field Card shows its face. It is owned and readable — withholding the
   * artwork from somebody who crossed the threshold would make the reward invisible at
   * the one place they go to look at their collection. What it does NOT get is the stage
   * marker or the rarity badge: those belong to a card that was found.
   */
  const earned = unlock?.kind === 'earned';
  const showFace = discovered || earned;
  const locked = unlock?.kind === 'locked' ? unlock : null;

  return (
    /*
      The wrapper exists for the aura and nothing else. The <Link> below clips to a rounded
      card, so a glow placed inside it is drawn entirely in the part that gets clipped away
      — it has to sit around the card, not in it.
    */
    <div className="relative">
      <RarityAura rarity={herb.rarity} concealed={!showFace} />
      <Link
        href={`/herbdex/${herb.id}`}
        aria-label={
          locked
            ? `Card ${number}. Field Card, locked. ${locked.xp.toLocaleString()} XP to unlock.`
            : earned
              ? `${herb.commonName}, card ${number}, ${herb.rarity}. Field Card, earned with XP. Not yet found.`
              : discovered
                ? `${herb.commonName}, card ${number}, ${herb.rarity}. ${stageLabel}.`
                : `Card ${number}. Not discovered.`
        }
        className="group relative z-10 block overflow-hidden rounded-[var(--radius-card)] shadow-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-card-lift focus-visible:-translate-y-1 motion-reduce:hover:translate-y-0"
      >
        {/*
          THE NEON IS A REWARD, SO ONLY A FOUND CARD LIGHTS UP. `violet-600` is the deck's
          bright purple and it stays rare: a silhouette you have not earned stays a silhouette,
          and the lit edge is what tells the two apart at a glance.

          AN OUTLINE, after two things that looked right and painted nothing. `ring-*` on the
          link composes into `box-shadow`, the property `shadow-card` already owns there; an
          arbitrary inset `shadow-[...]` on this frame did not resolve either. Both left the
          classes sitting in the DOM with a fully transparent shadow computed — visible only
          by reading the computed style, never by reading the markup.

          `outline` takes part in no composition at all. A negative offset tucks it inside the
          clipped corners, and it costs no layout, so nothing shifts on hover.
        */}
        <div
          className={`relative aspect-[356/576] bg-plum-800 ${
            showFace
              ? 'group-hover:[outline:2px_solid_var(--color-violet-600)] group-hover:[outline-offset:-2px] group-focus-visible:[outline:2px_solid_var(--color-violet-600)] group-focus-visible:[outline-offset:-2px]'
              : ''
          }`}
        >
          {showFace ? (
            <Image
              src={assetPath(herb.thumb)}
              alt={`Plantdex card ${number}: ${herb.commonName} (${herb.scientificName})`}
              fill
              sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 640px) 30vw, 45vw"
              priority={priority}
              loading={priority ? undefined : 'lazy'}
              className="object-cover"
            />
          ) : (
            <>
              <MysteryCard herb={herb} />
              {/*
                THE CAPTION NAMES WHAT ACTUALLY OPENS THE CARD. "Not discovered" is right
                for a printed card and wrong for a locked Field Card, where going outdoors
                does nothing at all until the XP is earned.
              */}
              <div className="absolute inset-x-0 bottom-0 flex justify-center pb-8">
                <span className="text-[0.72rem] leading-tight font-bold tracking-[0.14em] text-plum-950/75 uppercase">
                  {locked ? `${locked.xp.toLocaleString()} XP to unlock` : 'Not discovered'}
                </span>
              </div>
            </>
          )}

          {showFace && (
            <span className="absolute top-1.5 left-1.5 rounded-md bg-plum-950/75 px-1.5 py-0.5 text-[0.72rem] font-bold text-gold-400 tabular-nums">
              {number}
            </span>
          )}

          {discovered && (
            <span
              className={`absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[0.72rem] font-bold ${
                stage === 'mastered'
                  ? 'bg-gold-500 text-violet-deep'
                  : 'bg-plum-950/80 text-gold-400'
              }`}
            >
              <PlantdexIcon name={STAGE_MARK[stage ?? 'discovered']} className="block text-[0.72rem]" />
              <span className="sr-only">{stageLabel}</span>
            </span>
          )}
        </div>

        <div className="space-y-0.5 bg-plum-800/90 px-2 pt-1.5 pb-2">
          <p
            className={`truncate text-xs font-bold ${
              showFace ? 'text-violet-100' : 'text-violet-400'
            }`}
          >
            {showFace ? herb.commonName : '???'}
          </p>
          {/*
            QUIET, NOT ABSENT. This line used to be a filled pill under every one of the 45
            cards, which made the grid read as a table of tiers rather than a wall of card
            art. The tier still has to be PRINTED — it is what keeps the rarity aura a
            reinforcement instead of the only place rarity lives — so what came off is the
            pill, not the word. Both states share the weight and size so the tiles keep a
            uniform height.
          */}
          {discovered ? (
            <RarityBadge rarity={herb.rarity} tone="quiet" />
          ) : earned ? (
            /* Earned, not found — and it says so, because those are different records. */
            <span className="block text-[0.72rem] leading-none font-medium text-gold-400">
              Earned &middot; not yet found
            </span>
          ) : (
            <span className="block text-[0.72rem] leading-none font-medium text-violet-400">
              {locked ? 'Earned with XP' : 'Find it to reveal'}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
