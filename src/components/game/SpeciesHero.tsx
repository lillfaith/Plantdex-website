'use client';

import type { Herb, Rarity } from '@/lib/types';
import type { Progress } from '@/lib/progression';
import type { MasteryStage } from '@/lib/mastery';
import { MASTERY_STAGE_LABEL } from '@/lib/mastery';
import { cardLabel } from '@/lib/collection';
import { USE_LABEL } from '@/lib/deck';
import { CardFlip } from '../herbdex/CardFlip';
import { PlantSprite } from '../PlantSprite';
import { HabitatChips } from './HabitatChip';
import { RarityMeter } from './RarityMeter';
import { XpBar } from './XpBar';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import type { GardenStage } from '@/lib/garden';

/**
 * The collectible species hero.
 *
 * THE PRINTED CARD IS THE HERO AND STAYS THE HERO. Everything else here is arranged to
 * light it rather than compete with it: the aura sits behind it, the pixel companion is
 * deliberately small and beside the names, and no panel on the rest of the page blooms as
 * brightly as this. The card is the physical object the player paid for; the digital layer
 * is what it unlocks.
 *
 * The aura is tinted by RARITY, which is real data — a rare card genuinely glows
 * differently from a common one. It is not a random per-species colour, because that would
 * be a decorative claim about a plant rather than a readout of its encounter rate.
 */

const AURA: Record<Rarity, string> = {
  Common: 'var(--color-violet-700)',
  Uncommon: 'var(--color-rarity-uncommon)',
  Rare: 'var(--color-rarity-rare)',
  Epic: 'var(--color-rarity-epic)',
};

export function SpeciesHero({
  herb,
  progress,
  stage,
  portraitStage,
  discovered,
}: {
  herb: Herb;
  progress: Progress;
  stage: MasteryStage | null;
  portraitStage: GardenStage;
  discovered: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
      <div className="justify-self-center lg:justify-self-start">
        <div className="relative">
          <div
            aria-hidden="true"
            className="card-aura pointer-events-none absolute inset-0 -z-10 scale-[1.45] blur-2xl"
            style={{ ['--aura' as string]: AURA[herb.rarity] }}
          />
          <div className="card-tilt drop-shadow-[0_18px_44px_rgba(23,16,28,0.7)]">
            <CardFlip herb={herb} size="hero" />
          </div>
        </div>
      </div>

      <div className="min-w-0">
        {/* Collection · card number, so a card reads as part of a collectible set rather
            than a loose number. */}
        <p className="text-[0.72rem] font-bold tracking-[0.1em] text-violet-300 uppercase tabular-nums">
          {cardLabel(herb)}
        </p>

        <h1 className="font-display mt-1 text-3xl leading-tight font-extrabold text-gold-plate sm:text-4xl">
          {herb.commonName}
        </h1>
        <p className="font-botanical mt-1 text-lg text-violet-200 italic">
          {herb.scientificName}
        </p>

        {/*
          Habitat sits with the identity, not with the game state: it answers "what kind of
          ground is this plant" alongside the name, and the detailed cited sentence still
          lives in "Where it grows" further down the page.
        */}
        <HabitatChips herbId={herb.id} className="mt-3" />

        <div className="mt-4 flex items-center gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <RarityMeter rarity={herb.rarity} />
          {/* Status, in words and with a mark — never colour alone. */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-bold tracking-[0.1em] uppercase ${
              discovered
                ? 'bloom-gold border-gold-500/60 bg-gold-500/15 text-gold-300'
                : 'border-violet-600 bg-plum-800/60 text-violet-300'
            }`}
          >
            <PlantdexIcon name={discovered ? 'check' : 'locked'} className="text-sm" />
            {discovered && stage ? MASTERY_STAGE_LABEL[stage] : 'Undiscovered'}
            </span>
          </div>
          {/*
            The digital companion, NOT a replacement for the card. It shows the stage the
            player has actually reached, so the creature on their own card page grows up
            with their progress. Decoration rather than an identification aid: deliberately
            stylised, with the card art and the field notes below as the real reference.

            It sits at the end of the status row because a full-width species name leaves it
            no room beside the heading — on a 390px screen it wrapped onto a line of its own
            and read as a stranded illustration rather than a companion.
          */}
          {/* `fit` sets width:100% inline, which beats any width class on the sprite
              itself — so the SIZE lives on this wrapper. Without it the companion rendered
              358px wide on a 390px screen and read as a banner rather than a creature. */}
          <div className="ml-auto w-28 shrink-0 drop-shadow-[0_6px_20px_rgba(23,16,28,0.65)] sm:w-40">
            <PlantSprite
              herbId={herb.id}
              alt={`Pixel-art portrait of ${herb.commonName}`}
              stage={portraitStage}
              fit
            />
          </div>
        </div>

        {/* The card's own use categories. Gold, because these are the deck's headline
            classification and one of the few gold things left on the page. */}
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {herb.uses.map((use) => (
            <li
              key={use}
              className="rounded-full border border-gold-500/40 bg-gold-500/10 px-2.5 py-1 text-xs font-semibold text-gold-300"
            >
              {USE_LABEL[use]}
            </li>
          ))}
        </ul>

        {/* Account-wide level and XP. Real figures from `progressFromState`; there is no
            per-plant level in this data model and none is invented here. */}
        <div className="mt-4 rounded-xl border border-violet-700/60 bg-plum-900/50 px-3 py-2.5">
          <XpBar progress={progress} />
        </div>
      </div>
    </div>
  );
}
