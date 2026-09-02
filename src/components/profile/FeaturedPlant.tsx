import Image from 'next/image';
import Link from 'next/link';
import { assetPath } from '@/lib/asset-path';
import { getHerb } from '@/lib/deck';
import { MASTERY_STAGE_LABEL, stageFor } from '@/lib/mastery';
import type { HerbdexState } from '@/lib/types';
import { RarityAura } from '../game/RarityAura';
import { RarityBadge } from '../herbdex/RarityBadge';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';
import { Panel } from '../ui/Panel';
import { EYEBROW } from '../ui/accents';

/**
 * The player's signature plant — one card, given room.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO TREATMENTS, AND THAT IS THE WHOLE POINT OF THIS FILE.
 *
 * A hero-sized card is right on a desktop and wrong on a 390px phone: it would eat most of
 * the viewport on its own and push the eight sections below it off the bottom of a page
 * somebody is meant to scan. So the phone gets a landscape module — card art at thumbnail
 * scale beside its rarity and mastery state — and the desktop gets the standing card. Both
 * keep the artwork, the aura, the tier and the state; only the axis changes.
 *
 * `RarityAura` already tunes reach and blur per card size (its own comment records that one
 * shared set smeared into nothing at thumbnail scale and vanished entirely at hero scale),
 * so each treatment asks for the tuning that matches it: `grid` beside the small art,
 * `hero` behind the large one.
 *
 * THE SWITCH IS TWO WHOLE CLASSES, `sm:hidden` and `hidden sm:block` — never an interpolated
 * class name, and never a JS breakpoint check, which would have to wait for hydration and
 * would flash the wrong module on a static export.
 *
 * EACH AURA NEEDS ITS OWN `relative`, NON-CLIPPING WRAPPER. An aura placed inside the card
 * itself is drawn entirely in the rounded region that gets clipped away — the margin is the
 * only place it is visible.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const STAGE_MARK: Record<string, IconName> = {
  discovered: 'discovered',
  learned: 'learned',
  mastered: 'mastered',
};

export function FeaturedPlant({
  herbId,
  state,
}: {
  herbId: string | null;
  state: HerbdexState;
}) {
  const herb = herbId ? getHerb(herbId) : undefined;

  if (!herb) {
    return (
      <Panel aria-labelledby="profile-featured" pad="sm">
        <h2 id="profile-featured" className={`${EYEBROW} text-mystery-pink`}>
          Signature plant
        </h2>
        <p className="mt-1.5 text-sm text-violet-300">
          Choose one card to stand for your collection. It appears here at full size.
        </p>
      </Panel>
    );
  }

  const stage = stageFor(state, herb.id) ?? 'discovered';
  const number = `#${String(herb.cardNumber).padStart(2, '0')}`;
  const art = (
    <Image
      src={assetPath(herb.thumb)}
      alt={`Plantdex card ${number}: ${herb.commonName} (${herb.scientificName})`}
      fill
      sizes="(min-width: 640px) 15rem, 6rem"
      className="object-cover"
    />
  );

  const details = (
    <div className="min-w-0">
      <p className={`${EYEBROW} text-mystery-pink`}>Signature plant</p>
      {/*
        THE GRADIENT SITS ON THE LINK, NOT ON THE PARAGRAPH. `text-gold-plate` is a
        background-clip gradient with `color: transparent`; put it on an ancestor and the
        link's own computed colour is transparent while something above it does the painting.
        That renders correctly and is a trap for anything that reads colour off the element —
        the contrast pass scored this exact node 1:1. Hover brightens the gradient, because a
        colour change cannot show through transparent text.
      */}
      <p className="font-display mt-1 text-lg font-extrabold sm:text-xl">
        <Link
          href={`/herbdex/${herb.id}`}
          className="tap-44 text-gold-plate transition-[filter] hover:brightness-125 motion-reduce:transition-none"
        >
          {herb.commonName}
        </Link>
      </p>
      <p className="mt-0.5 text-xs text-violet-400 italic">{herb.scientificName}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <RarityBadge rarity={herb.rarity} />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/45 bg-gold-500/12 px-2 py-0.5 text-xs font-bold text-gold-300">
          <PlantdexIcon name={STAGE_MARK[stage]!} className="text-xs" aria-hidden="true" />
          {MASTERY_STAGE_LABEL[stage]}
        </span>
        <span className="text-xs font-bold text-violet-400 tabular-nums">{number}</span>
      </div>
    </div>
  );

  return (
    <Panel aria-labelledby="profile-featured" pad="md">
      <h2 id="profile-featured" className="sr-only">
        Signature plant
      </h2>

      {/* Phone: landscape, so the card is unmistakably a card without owning the screen. */}
      <div className="flex items-center gap-4 sm:hidden">
        <div className="relative shrink-0">
          <RarityAura rarity={herb.rarity} size="grid" />
          <div className="relative z-10 aspect-[356/576] w-24 overflow-hidden rounded-[var(--radius-card)] shadow-card">
            {art}
          </div>
        </div>
        {details}
      </div>

      {/* Desktop: the card stands up, with the full glow panel behind it. */}
      {/* Centred rather than left-hugging: the pair is the whole content of a full-width
          panel, and pinning it left leaves a lake of empty plum to its right. */}
      <div className="hidden items-center justify-center gap-8 sm:flex">
        <div className="relative shrink-0">
          <RarityAura rarity={herb.rarity} size="hero" />
          <div className="relative z-10 aspect-[356/576] w-60 overflow-hidden rounded-[var(--radius-card)] shadow-card">
            {art}
          </div>
        </div>
        {details}
      </div>
    </Panel>
  );
}
