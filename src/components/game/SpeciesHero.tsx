'use client';

import type { Herb } from '@/lib/types';
import type { MasteryStage } from '@/lib/mastery';
import { MASTERY_STAGE_LABEL } from '@/lib/mastery';
import { cardLabel } from '@/lib/collection';
import { LEAF_ASPECT, pixelLeaf } from '@/lib/pixel-art';
import { useHerbdex } from '@/state/HerbdexProvider';
import { CardFlip } from '../herbdex/CardFlip';
import { RarityAura } from './RarityAura';
import { PlantSprite } from '../PlantSprite';
import { GrowSpriteCta } from '../herbdex/GrowSpriteCta';
import { RarityMeter } from './RarityMeter';
import { PixelIsland } from './PixelIsland';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import type { SpriteStage } from '@/lib/plant-sprites';

/**
 * THE CHARACTER PANEL UNDER THE COLLECTIBLE CARD.
 *
 * The printed card above it is untouched and complete. This panel is the Plantdex layer
 * around it: the creature on a small grass island as the centrepiece, rarity and growth as one
 * quiet line, mastery as the single prominent mark (the gold ribbon), the three traditional
 * uses as one connected tile group, and one prominent way into the expanded profile.
 *
 * Retro where it is a character or scenery (the sprite, the island, the leaf, the ribbon's
 * laurels), modern where it is information or a control (names, tiles' words, the button).
 * Every figure comes from the records the game already keeps; nothing is added or reworded.
 */

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 28"
      width="12"
      height="17"
      fill="currentColor"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M10 27C3 22 1 14 4 3c1 5 3 7 6 8-4 2-5 5-4 8 2-3 4-4 5-4-1 3-1 6-1 12z" />
    </svg>
  );
}

export function SpeciesHero({
  herb,
  stage,
  portraitStage,
  discovered,
}: {
  herb: Herb;
  stage: MasteryStage | null;
  portraitStage: SpriteStage;
  discovered: boolean;
}) {
  const { state } = useHerbdex();
  const discoveredAt = state.discoveries[herb.id];
  const mastered = discovered && stage === 'mastered';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
      <div className="justify-self-center lg:justify-self-start">
        <div className="relative">
          <RarityAura rarity={herb.rarity} size="hero" />
          <div className="card-tilt relative z-10 drop-shadow-[0_18px_44px_rgba(23,16,28,0.7)]">
            <CardFlip herb={herb} size="hero" />
          </div>
        </div>
        {/* A quiet cue that more sits below the card: a small bobbing chevron, twice, never
            looping, and still under reduced motion. */}
        <p aria-hidden="true" className="scroll-cue mt-1 text-center text-lg text-violet-400">
          &#8964;
        </p>
      </div>

      <section
        aria-label={`${herb.commonName} overview`}
        className="character-panel relative min-w-0 rounded-[1.75rem] p-4 pt-5"
      >
        {/* Pink pixel confetti on the corners: decoration only. */}
        <span aria-hidden="true" className="pixel-confetti pixel-confetti-left" />
        <span aria-hidden="true" className="pixel-confetti pixel-confetti-right" />

        <div className="grid grid-cols-[1.12fr_1fr] items-center gap-1.5">
          <div className="min-w-0">
            <p className="text-[0.72rem] font-bold tracking-[0.1em] text-violet-300 uppercase tabular-nums">
              {cardLabel(herb)}
            </p>
            <h1 className="font-display text-gold-plate mt-1 text-3xl leading-[1.05] font-extrabold">
              {herb.commonName}
            </h1>
            <p className="font-botanical mt-0.5 text-base text-violet-200 italic">
              {herb.scientificName}
            </p>

            {/* Rarity and growth, as one quiet line rather than two badges. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
              <RarityMeter rarity={herb.rarity} className="border-0 bg-transparent px-0" />
              <span aria-hidden="true" className="text-violet-500">
                &middot;
              </span>
              <GrowSpriteCta herb={herb} />
            </div>

            {discoveredAt && (
              <p className="mt-2 text-[0.72rem] text-violet-300">
                Discovered{' '}
                <time dateTime={discoveredAt}>
                  {new Date(discoveredAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </p>
            )}
          </div>

          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-3 -top-3 bottom-4 bg-[radial-gradient(closest-side,rgba(255,226,140,0.5),rgba(255,159,207,0.16)_62%,transparent_76%)]"
            />
            <div className="relative">
              <div className="relative z-10 -mb-[22%] w-[125%] -translate-x-[10%] drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]">
                <PlantSprite
                  herbId={herb.id}
                  alt={`Pixel-art portrait of ${herb.commonName}`}
                  stage={portraitStage}
                  fit
                />
              </div>
              <PixelIsland className="relative z-0" />
            </div>
            {/* Mastery is the ONE prominent mark. A plant not yet mastered gets a quiet tag. */}
            {mastered ? (
              <p className="mastery-ribbon relative z-20 mx-auto -mt-2 flex w-max items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold tracking-[0.1em] uppercase">
                <Laurel />
                {MASTERY_STAGE_LABEL.mastered}
                <Laurel flip />
              </p>
            ) : (
              <p className="relative z-20 mx-auto -mt-2 flex w-max items-center gap-1 rounded-full border border-botanical-400/50 bg-botanical-400/15 px-3 py-1 text-xs font-extrabold tracking-[0.1em] text-botanical-200 uppercase">
                <PlantdexIcon name={discovered ? 'check' : 'locked'} className="text-sm" />
                {discovered && stage ? MASTERY_STAGE_LABEL[stage] : 'Undiscovered'}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <h2 className="flex items-center gap-1.5 text-[0.72rem] font-extrabold tracking-[0.14em] text-botanical-200 uppercase">
            <PlantdexIcon name="leaves" className="text-sm" />
            Traditional Uses
          </h2>
          <ul className="uses-tiles mt-1.5 grid grid-cols-3 overflow-hidden rounded-2xl">
            {herb.back.healingTraits.slice(0, 3).map((trait) => (
              <li key={trait} className="flex flex-col items-center gap-1 px-1.5 py-2.5 text-center">
                <span
                  aria-hidden="true"
                  className="block w-[22px]"
                  style={{
                    aspectRatio: LEAF_ASPECT,
                    backgroundImage: pixelLeaf(),
                    backgroundSize: '100% 100%',
                    imageRendering: 'pixelated',
                  }}
                />
                <span className="text-xs leading-tight font-bold text-botanical-50">{trait}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-center text-[0.72rem] text-pink-accent/90 italic">
            Traditional use, not proven treatment.
          </p>
        </div>

        <a href="#field-identification" className="profile-cta mt-4 flex min-h-14 items-center justify-center gap-2.5 rounded-full px-5 text-[0.95rem] font-extrabold tracking-[0.03em] text-white">
          <PlantdexIcon name="learn" className="text-xl" />
          Explore full plant profile
          <span aria-hidden="true">&rarr;</span>
        </a>
      </section>
    </div>
  );
}
