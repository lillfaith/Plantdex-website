import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { PlantSprite } from '../PlantSprite';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { ProfileAvatar } from '../profile/ProfileAvatar';
import { getAchievement } from '@/lib/achievements';
import { FIELD_FRAMES } from '@/lib/field-frames';

/**
 * The tour's scenes, in order. Stage 1 ships Welcome, Discover and Explore; Collect and
 * Garden slot in between without touching the shell, which only knows this list.
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
  { id: 'explore', Component: Explore },
];
