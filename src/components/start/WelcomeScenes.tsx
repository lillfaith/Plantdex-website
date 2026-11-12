'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { PlantSprite } from '../PlantSprite';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { ProfileAvatar } from '../profile/ProfileAvatar';
import { RarityBadge } from '../herbdex/RarityBadge';
import { assetPath } from '@/lib/asset-path';
import { getPrintedCard } from '@/lib/deck';
import type { GardenStage } from '@/lib/garden';
import { getAchievement } from '@/lib/achievements';
import { FIELD_FRAMES } from '@/lib/field-frames';

/**
 * The tour's scenes, in order. Five scenes, each drawn to fit a small phone. The shell only knows this list.
 *
 * Every scene is drawn to fit a 320x568 phone WITHOUT scrolling, and `welcome-tour.test.ts`
 * pins the class budget that keeps it so. None of them awards anything: the rewards on the
 * last scene are the ones a real first find already pays, read from their definitions.
 */

/** The creature that greets, and stands in for "the plant you found" on later scenes. */
const GREETER = 'taraxacum-officinale';

export interface SceneProps {
  /** True for somebody who already has discoveries, taking the tour on purpose. */
  readonly returning: boolean;
  readonly onLeave: () => void;
}

export interface Scene {
  readonly id: string;
  readonly Component: ComponentType<SceneProps>;
}

function Title({ children }: { children: ReactNode }) {
  return (
    <h2
      id="welcome-title"
      tabIndex={-1}
      className="font-display text-[1.7rem] leading-tight font-bold text-gold-plate"
      style={{ outline: 'none' }}
    >
      {children}
    </h2>
  );
}

function Welcome() {
  return (
    <>
      <div className="welcome-stage mx-auto">
        <span aria-hidden="true" className="welcome-mote welcome-mote-a" />
        <span aria-hidden="true" className="welcome-mote welcome-mote-b" />
        <span aria-hidden="true" className="welcome-mote welcome-mote-c" />
        <div className="welcome-greeter w-44">
          <PlantSprite herbId={GREETER} stage="flowering" alt="" fit />
        </div>
      </div>
      <Title>Welcome to Plantdex</Title>
      <p className="mx-auto mt-2 max-w-[19rem] text-sm leading-relaxed text-violet-100">
        A real-world plant collecting adventure. Step outside, meet the plants growing around
        you, and fill your Herbdex.
      </p>
    </>
  );
}

const SUGGESTIONS = ['Taraxacum officinale', 'Taraxacum campylodes', 'Leontodon hispidus'] as const;

function Discover() {
  return (
    <>
      <Title>Photograph. Check. Record.</Title>
      <div
        aria-hidden="true"
        className="welcome-prop mx-auto mt-3 w-full max-w-[17rem] p-2.5 text-left"
      >
        <div className="welcome-photo relative mx-auto flex h-24 w-full items-end justify-center overflow-hidden">
          <span className="welcome-scan-line" />
          <div className="w-32">
            <PlantSprite herbId={GREETER} stage="flowering" alt="" fit />
          </div>
        </div>
        <ul className="mt-2 space-y-1">
          {SUGGESTIONS.map((name, index) => (
            <li
              key={name}
              className={`rounded border-l-4 px-2 py-1 text-xs italic ${
                index === 0
                  ? 'border-gold-500 bg-plum-700/50 font-bold text-violet-100'
                  : 'border-violet-600 text-violet-200'
              }`}
            >
              {name}
            </li>
          ))}
        </ul>
        <p className="mt-2 rounded bg-gold-400 py-1 text-center text-[0.72rem] font-bold tracking-wide text-plum-900 uppercase">
          Record this find
        </p>
      </div>
      <p className="mx-auto mt-3 max-w-[19rem] text-sm leading-relaxed text-violet-100">
        Snap a plant, review the suggestions, then record it only if you really met it.{' '}
        <strong className="text-gold-300">Identifying a plant is not finding it.</strong>
      </p>
    </>
  );
}


/*
 * COLLECT. A demonstration card the player can turn over. It is a picture of a printed card
 * and nothing else: this module imports no store, so flipping it cannot record a discovery,
 * pay XP or unlock anything. The back is the real printed back, which is the point.
 */
function Collect() {
  const [flipped, setFlipped] = useState(false);
  const herb = getPrintedCard(GREETER);

  return (
    <>
      <Title>Collect the deck</Title>
      {herb && (
        <div className="mt-3">
          <div className="flip-scene relative mx-auto w-32">
            <span aria-hidden="true" className="welcome-fan welcome-fan-left" />
            <span aria-hidden="true" className="welcome-fan welcome-fan-right" />
            <button
              type="button"
              aria-pressed={flipped}
              onClick={() => setFlipped((one) => !one)}
              aria-label={`Example card: ${herb.commonName}. Tap to turn it over.`}
              className="relative block w-full rounded-[var(--radius-card)]"
            >
              <span className={`flip-card shadow-card-lift block ${flipped ? 'flip-card-revealed' : ''}`}>
                <Image
                  src={assetPath(herb.image)}
                  alt=""
                  aria-hidden="true"
                  width={800}
                  height={1295}
                  className="invisible w-full"
                />
                <span className="flip-face">
                  <Image
                    src={assetPath(herb.image)}
                    alt=""
                    width={800}
                    height={1295}
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className="flip-face flip-face-back">
                  <Image
                    src={assetPath(herb.backImage)}
                    alt=""
                    width={800}
                    height={1295}
                    className="h-full w-full object-cover"
                  />
                </span>
              </span>
            </button>
          </div>
          <p className="mt-2 text-xs font-bold tracking-[0.1em] text-gold-300 uppercase">
            Tap the card to turn it over
          </p>
        </div>
      )}
      <ul className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        {(['Common', 'Uncommon', 'Rare', 'Epic'] as const).map((tier) => (
          <li key={tier}>
            <RarityBadge rarity={tier} />
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-3 max-w-[19rem] text-sm leading-relaxed text-violet-100">
        Every plant you find unlocks its card. Cards come in four rarities, earn XP and
        levels, and open cosmetic rewards. This one is just for show.
      </p>
    </>
  );
}

/*
 * GARDEN. Real sprites at the three growth stages, planted in a small bed. The columns say
 * what grows a plant, using the same mapping `garden.ts` draws: found, learned, mastered.
 */
const BED: readonly { stage: GardenStage; label: string; plants: readonly string[] }[] = [
  { stage: 'sprout', label: 'Found', plants: ['plantago-major', 'viola-sororia'] },
  { stage: 'growing', label: 'Learned', plants: ['trifolium-pratense', 'urtica-dioica'] },
  { stage: 'flowering', label: 'Mastered', plants: ['taraxacum-officinale', 'achillea-millefolium'] },
];

function Garden() {
  return (
    <>
      <Title>Grow your garden</Title>
      <div aria-hidden="true" className="welcome-bed mx-auto mt-3 grid w-full max-w-[19rem] grid-cols-3 gap-x-1 px-2 pt-2 pb-1">
        {BED.map((column) => (
          <div key={column.stage} className="flex flex-col items-center">
            {column.plants.map((herbId) => (
              <div key={herbId} className="w-16">
                <PlantSprite herbId={herbId} stage={column.stage} alt="" fit />
              </div>
            ))}
            <p className="mt-1 text-[0.72rem] leading-tight font-bold text-plum-950">
              {column.label}
            </p>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-3 max-w-[19rem] text-sm leading-relaxed text-violet-100">
        Every plant you discover appears in your Garden. Learn its card to help it grow, master
        it to watch it bloom.
      </p>
    </>
  );
}

const EXPLORE_TILES = [
  { icon: 'journal', label: 'Field Journal', note: 'Your finds' },
  { icon: 'compass', label: 'Regional quests', note: 'Plants to seek' },
  { icon: 'laurel', label: 'Leaderboard', note: 'Opt in only' },
] as const;

function Explore({ returning, onLeave }: SceneProps) {
  const badge = getAchievement('first-find');
  const amberRing = FIELD_FRAMES.find((entry) => entry.id === 'amber-ring');

  return (
    <>
      <ul className="grid grid-cols-3 gap-2">
        {EXPLORE_TILES.map((tile) => (
          <li
            key={tile.icon}
            className={`welcome-prop px-1 py-2 ${tile.icon === 'journal' ? 'welcome-journal' : ''}`}
          >
            <PlantdexIcon name={tile.icon} className="mx-auto text-2xl text-gold-300" />
            <p className="mt-1 text-[0.72rem] leading-tight font-bold text-violet-100">
              {tile.label}
            </p>
            <p className="text-[0.72rem] leading-tight text-violet-300">{tile.note}</p>
          </li>
        ))}
      </ul>

      <div className="welcome-quest mt-4 px-4 py-3">
        <p className="text-[0.72rem] font-bold tracking-[0.18em] text-gold-300 uppercase">
          {returning ? 'Keep exploring' : 'Your first quest'}
        </p>
        <Title>{returning ? 'Find something new' : 'Your First Find'}</Title>
        <p className="mt-1 text-sm leading-relaxed text-violet-100">
          Photograph a plant outdoors, then record it.
        </p>
        {!returning && badge && amberRing && (
          <div className="mt-3 flex items-center justify-center gap-4">
            <div className="text-center">
              <PlantdexIcon name="sprout" className="mx-auto text-3xl text-gold-400" />
              <p className="mt-1 text-[0.72rem] leading-tight font-bold text-gold-300">
                {badge.name}
                <br />
                badge
              </p>
            </div>
            <div className="text-center">
              <ProfileAvatar
                herbId={GREETER}
                herbName="Dandelion"
                frame={amberRing}
                size="sm"
              />
              <p className="mt-1 text-[0.72rem] leading-tight font-bold text-gold-300">
                {amberRing.name}
                <br />
                profile frame
              </p>
            </div>
          </div>
        )}
      </div>

      <Link
        href="/scan"
        onClick={onLeave}
        className="arcade-key mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-400 px-6 text-sm font-bold tracking-wide text-plum-900 uppercase transition-colors hover:bg-gold-300"
      >
        {returning ? 'Go scan a plant' : 'Find my first plant'}
      </Link>
      <Link
        href="/herbdex"
        onClick={onLeave}
        className="tap-44 mt-1 inline-flex items-center justify-center text-sm font-bold text-violet-200 underline-offset-2 hover:text-violet-100 hover:underline"
      >
        Or look around the deck first
      </Link>
    </>
  );
}

export const SCENES: readonly Scene[] = [
  { id: 'welcome', Component: Welcome },
  { id: 'discover', Component: Discover },
  { id: 'collect', Component: Collect },
  { id: 'garden', Component: Garden },
  { id: 'explore', Component: Explore },
];
