'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PlantSprite } from '@/components/PlantSprite';
import { useHerbdex } from '@/state/HerbdexProvider';
import { bossFormsMode } from '@/lib/boss-forms';
import { CHALLENGE_ACTIVITIES, PREREQUISITE_ACTIVITIES, isBossPilot, type ActivityId } from '@/lib/boss-form';
import { buildChallenge } from '@/lib/mastery-challenges';
import { Art, type ArtName } from './ChallengeArt';
import { BossEvolution } from './BossEvolution';
import { BotanicalStage } from './BotanicalStage';
import { ChallengeRunner } from './ChallengeRunner';

/**
 * THE CHALLENGE HUB for a pilot plant: an evolution journey of three short rounds and a final
 * Boss Trial. It changes nothing about WHAT can be played or scored; it only presents it.
 *
 * OFF BY DEFAULT. With `NEXT_PUBLIC_BOSS_FORMS` unset (production) this module is not even in
 * the bundle (see `ChallengeGate`). In `next dev` with `preview`, draft questions are playable
 * but record nothing; with `on` a signed-in player's results are scored and saved by the
 * server, and a question is served only if a named reviewer has signed it off. Activities whose
 * questions are disabled show "Coming soon" and cannot be started.
 *
 * `done` is this session's view of what the player just passed. The authoritative record is the
 * server's, and the hub never invents a reward: the only thing earned is the Boss Form itself.
 */
const TILES: Record<ActivityId, { name: string; hint: string; art: ArtName }> = {
  'part-spotter': { name: 'Part Spotter', hint: 'Name the parts', art: 'leaf' },
  compare: { name: 'Lookalikes', hint: 'Spot the difference', art: 'pair' },
  'habitat-season': { name: 'Habitat', hint: 'Where it grows', art: 'tree' },
  'boss-trial': { name: 'Boss Trial', hint: 'Final unlock', art: 'crown' },
};

function PathNode({ lit, art }: { lit: boolean; art: ArtName }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-plum-900 ${
        lit ? 'border-gold-300 text-gold-300 shadow-[0_0_12px_rgb(255_210_110/0.5)]' : 'border-violet-600 text-violet-500'
      }`}
    >
      <Art name={art} accent="fill-plum-900" className="h-4 w-4" />
    </span>
  );
}

function EvolutionPath({ done }: { done: ReadonlySet<ActivityId> }) {
  const count = PREREQUISITE_ACTIVITIES.filter((one) => done.has(one)).length;
  return (
    <div className="mt-3 text-center">
      <div
        role="img"
        aria-label={`${count} of ${PREREQUISITE_ACTIVITIES.length} rounds done`}
        className="mx-auto flex max-w-[16rem] items-center"
      >
        {PREREQUISITE_ACTIVITIES.map((activity, index) => {
          const lit = done.has(activity);
          return (
            <span key={activity} className="flex flex-1 items-center first:flex-none">
              {index > 0 ? (
                <span className="mx-1 h-1 flex-1 overflow-hidden rounded-sm bg-violet-700">
                  <span
                    className="block h-full bg-gold-400 transition-[width] duration-700 ease-out"
                    style={{ width: lit ? '100%' : '0%' }}
                  />
                </span>
              ) : null}
              <PathNode lit={lit} art={lit ? 'bloom' : 'bud'} />
            </span>
          );
        })}
        <span className="mx-1 h-1 flex-1 overflow-hidden rounded-sm bg-violet-700">
          <span
            className="block h-full bg-gold-400 transition-[width] duration-700 ease-out"
            style={{ width: count === PREREQUISITE_ACTIVITIES.length ? '100%' : '0%' }}
          />
        </span>
        <PathNode lit={done.has('boss-trial')} art="crown" />
      </div>
      <p className="mt-1.5 text-xs font-bold tracking-wide text-violet-200 uppercase">
        {count} of {PREREQUISITE_ACTIVITIES.length} rounds done
      </p>
    </div>
  );
}

type TileState = 'ready' | 'done' | 'soon' | 'locked';

function Tile({
  activity,
  state,
  onPlay,
  index,
}: {
  activity: ActivityId;
  state: TileState;
  onPlay: () => void;
  index: number;
}) {
  const tile = TILES[activity];
  const enabled = state === 'ready' || state === 'done';
  const boss = activity === 'boss-trial';
  const status = { ready: 'Play', done: 'Done', soon: 'Coming soon', locked: 'Locked' }[state];
  return (
    <li className={`relative ${boss ? 'col-span-3' : ''} board-rise`} style={{ animationDelay: `${index * 70}ms` }}>
      {state === 'done' ? (
        <span aria-hidden="true" className="tile-glow absolute -inset-1 rounded-xl bg-gold-400/25" />
      ) : null}
      <button
        type="button"
        disabled={!enabled}
        onClick={onPlay}
        className={`pixel-tile relative flex w-full items-center rounded-lg text-center transition-transform active:scale-[0.97] ${
          boss ? 'min-h-16 justify-between gap-3 px-4 py-3 text-left' : 'min-h-[6.5rem] flex-col justify-center gap-1 px-1 py-3'
        } ${enabled ? '' : 'opacity-55'} ${boss && enabled ? 'holo-border' : ''}`}
      >
        <span className={`flex shrink-0 items-center justify-center ${boss ? 'h-9 w-9' : 'h-9 w-9'} ${state === 'locked' || state === 'soon' ? 'text-violet-400' : 'text-gold-300'}`}>
          <Art name={state === 'locked' ? 'lock' : tile.art} accent="fill-plum-900" className="h-full w-full" />
        </span>
        <span className={boss ? 'min-w-0 flex-1' : ''}>
          <span className="block text-sm leading-tight font-extrabold text-violet-50">{tile.name}</span>
          <span className="block text-[0.72rem] leading-tight text-violet-300">
            {boss ? 'Final unlock · ten quick ones' : tile.hint}
          </span>
        </span>
        <span className={`flex items-center gap-1 text-xs font-bold ${state === 'done' ? 'text-gold-200' : 'text-gold-300'}`}>
          {state === 'done' ? <Art name="check" className="h-3 w-3" /> : null}
          {status}
        </span>
      </button>
    </li>
  );
}

export function ChallengeExperience({ herbId, name }: { herbId: string; name: string }) {
  const mode = bossFormsMode();
  const { isMastered, ready } = useHerbdex();
  const [active, setActive] = useState<ActivityId | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState<ReadonlySet<ActivityId>>(new Set());
  const [evolved, setEvolved] = useState(false);

  if (mode === 'off' || !isBossPilot(herbId)) {
    return <p className="mt-10 text-center text-violet-200">Boss Forms are not available yet.</p>;
  }
  if (mode === 'on' && ready && !isMastered(herbId)) {
    return (
      <p className="mt-10 text-center text-violet-200">
        Master {name} first. <Link className="underline" href={`/herbdex/${herbId}`}>Back to the card</Link>
      </p>
    );
  }

  const preview = mode === 'preview';
  const runnable = (activity: ActivityId) =>
    buildChallenge(herbId, activity, 0, { includeUnreviewed: preview }) !== null;
  const trialOpen = PREREQUISITE_ACTIVITIES.every((one) => done.has(one)) || preview;

  const stateOf = (activity: ActivityId): TileState => {
    if (done.has(activity)) return 'done';
    if (!runnable(activity)) return 'soon';
    if (activity === 'boss-trial' && !trialOpen) return 'locked';
    return 'ready';
  };

  const start = (activity: ActivityId) => {
    setAttempt(0);
    setActive(activity);
  };

  return (
    <BotanicalStage>
      {evolved ? <BossEvolution herbId={herbId} name={name} onDone={() => setEvolved(false)} /> : null}

      {active ? (
        <ChallengeRunner
          key={`${active}-${attempt}`}
          herbId={herbId}
          activity={active}
          attempt={attempt}
          mode={preview ? 'preview' : 'on'}
          onDone={({ passed, bossForm }) => {
            if (passed) setDone((current) => new Set(current).add(active));
            setActive(null);
            setAttempt(0);
            if (bossForm) setEvolved(true);
          }}
          onRetry={() => setAttempt((n) => n + 1)}
          onExit={() => {
            setActive(null);
            setAttempt(0);
          }}
        />
      ) : (
        <section className="mt-1">
          <div className="flex flex-col items-center text-center">
            <div className="relative flex h-32 w-32 items-center justify-center">
              <span aria-hidden="true" className="boss-aura absolute inset-0 rounded-full" />
              <PlantSprite herbId={herbId} alt={name} stage="flowering" fit className="relative w-28" />
            </div>
            <h1 className="font-display text-2xl leading-tight font-extrabold text-gold-plate sm:text-3xl">Evolve your {name}</h1>
          </div>
          <EvolutionPath done={done} />
          {preview ? (
            <p className="mt-2 text-center text-xs text-violet-400">Preview: draft questions, nothing is recorded.</p>
          ) : null}
          <ul className="mt-4 grid grid-cols-3 gap-2">
            {CHALLENGE_ACTIVITIES.map((activity, index) => (
              <Tile
                key={activity}
                activity={activity}
                index={index}
                state={stateOf(activity)}
                onPlay={() => start(activity)}
              />
            ))}
          </ul>
          {preview ? (
            <button
              type="button"
              onClick={() => setEvolved(true)}
              className="mt-4 min-h-11 w-full text-sm font-bold text-violet-300 underline-offset-4 hover:underline"
            >
              Preview the evolution
            </button>
          ) : null}
        </section>
      )}
    </BotanicalStage>
  );
}
