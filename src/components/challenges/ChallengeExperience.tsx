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

type NodeState = 'done' | 'next' | 'later';

function PathNode({ state, art }: { state: NodeState; art: ArtName }) {
  const look = {
    done: 'border-gold-300 bg-gold-400 text-plum-950 shadow-[0_0_12px_rgb(255_210_110/0.55)]',
    next: 'border-gold-300 bg-plum-900 text-gold-300 shadow-[0_0_10px_rgb(255_210_110/0.4)]',
    later: 'border-violet-600 bg-plum-900 text-violet-500',
  }[state];
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${look}`}>
      <Art name={art} accent={state === 'done' ? 'fill-gold-400' : 'fill-plum-900'} className="h-4 w-4" />
    </span>
  );
}

function PathBar({ filled }: { filled: boolean }) {
  return (
    <span className="mx-1 h-1 flex-1 overflow-hidden rounded-sm bg-violet-700">
      <span
        className="block h-full bg-gold-400 transition-[width] duration-700 ease-out"
        style={{ width: filled ? '100%' : '0%' }}
      />
    </span>
  );
}

/** Three rounds and a crown. Gold = done, a gold outline = the one to do next, violet = later. */
function EvolutionPath({
  done,
  next,
}: {
  done: ReadonlySet<ActivityId>;
  next: ActivityId | null;
}) {
  const count = PREREQUISITE_ACTIVITIES.filter((one) => done.has(one)).length;
  const nodeState = (activity: ActivityId): NodeState =>
    done.has(activity) ? 'done' : activity === next ? 'next' : 'later';
  return (
    <div className="mt-2 text-center">
      <div
        role="img"
        aria-label={`${count} of ${PREREQUISITE_ACTIVITIES.length} rounds done`}
        className="mx-auto flex max-w-[16rem] items-center"
      >
        {PREREQUISITE_ACTIVITIES.map((activity, index) => (
          <span key={activity} className="flex flex-1 items-center first:flex-none">
            {index > 0 ? <PathBar filled={done.has(PREREQUISITE_ACTIVITIES[index - 1]!)} /> : null}
            <PathNode state={nodeState(activity)} art={done.has(activity) ? 'bloom' : 'bud'} />
          </span>
        ))}
        <PathBar filled={count === PREREQUISITE_ACTIVITIES.length} />
        <PathNode state={nodeState('boss-trial')} art="crown" />
      </div>
      <p className="mt-1 text-xs font-bold tracking-wide text-violet-200 uppercase">
        {count} of {PREREQUISITE_ACTIVITIES.length} rounds done
      </p>
    </div>
  );
}

type TileState = 'ready' | 'done' | 'soon' | 'locked';

const STATUS: Record<TileState, string> = { ready: 'Play', done: 'Done', soon: 'Coming soon', locked: 'Locked' };

/** THE NEXT THING TO TAP: big, outlined in the holographic border, with a real button on it. */
function FeaturedTile({ activity, onPlay }: { activity: ActivityId; onPlay: () => void }) {
  const tile = TILES[activity];
  return (
    <button
      type="button"
      onClick={onPlay}
      className="pixel-tile holo-border arcade-key relative flex min-h-24 w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-transform active:scale-[0.98]"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-plum-950/60 text-gold-300">
        <Art name={tile.art} accent="fill-plum-900" className="h-10 w-10" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.72rem] font-bold tracking-wide text-gold-300 uppercase">Next up</span>
        <span className="block text-xl leading-tight font-extrabold text-violet-50">{tile.name}</span>
        <span className="block text-xs leading-tight text-violet-200">{activity === 'boss-trial' ? 'Final unlock' : tile.hint}</span>
      </span>
      <span className="holo-fill shrink-0 rounded-full px-4 py-2 text-sm font-extrabold text-plum-900">Play</span>
    </button>
  );
}

/** Everything that is not the next step: smaller, and quieter the less it can be played. */
function SideTile({
  activity,
  state,
  onPlay,
}: {
  activity: ActivityId;
  state: TileState;
  onPlay: () => void;
}) {
  const tile = TILES[activity];
  const playable = state === 'ready' || state === 'done';
  const boss = activity === 'boss-trial';
  const tone =
    state === 'done' ? 'text-gold-300' : state === 'ready' ? 'text-gold-300' : 'text-violet-500';
  return (
    <li className={`relative ${boss ? 'col-span-full' : ''}`}>
      {state === 'done' ? (
        <span aria-hidden="true" className="tile-glow absolute -inset-1 rounded-xl bg-gold-400/25" />
      ) : null}
      <button
        type="button"
        disabled={!playable}
        onClick={onPlay}
        className={`pixel-tile relative flex w-full rounded-lg transition-transform active:scale-[0.97] ${
          boss ? 'min-h-14 items-center justify-between gap-3 px-3 py-2 text-left' : 'min-h-[5.25rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-center'
        } ${playable ? '' : 'opacity-45'}`}
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center ${tone}`}>
          <Art name={state === 'locked' ? 'lock' : tile.art} accent="fill-plum-900" className="h-full w-full" />
        </span>
        <span className={boss ? 'min-w-0 flex-1' : ''}>
          <span className="block text-sm leading-tight font-extrabold text-violet-50">{tile.name}</span>
          {boss ? <span className="block text-[0.72rem] leading-tight text-violet-300">Final unlock</span> : null}
        </span>
        <span className={`flex items-center gap-1 text-xs font-bold ${state === 'done' ? 'text-gold-200' : state === 'ready' ? 'text-gold-300' : 'text-violet-400'}`}>
          {state === 'done' ? <Art name="check" className="h-3 w-3" /> : null}
          {STATUS[state]}
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
  // 'earned' only ever comes from the server's answer; 'preview' only from the dev-only button.
  const [evolved, setEvolved] = useState<false | 'earned' | 'preview'>(false);

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
  // The Trial opens only when every required round is done. Preview has no shortcut: the server
  // enforces the same rule, and a hub that let preview skip it would teach the wrong order.
  const trialOpen = PREREQUISITE_ACTIVITIES.every((one) => done.has(one));

  const stateOf = (activity: ActivityId): TileState => {
    if (done.has(activity)) return 'done';
    if (!runnable(activity)) return 'soon';
    if (activity === 'boss-trial' && !trialOpen) return 'locked';
    return 'ready';
  };

  // The next thing to do is the first playable activity that is not done yet.
  const next = CHALLENGE_ACTIVITIES.find((one) => stateOf(one) === 'ready') ?? null;
  const rest = CHALLENGE_ACTIVITIES.filter((one) => one !== next);

  const start = (activity: ActivityId) => {
    setAttempt(0);
    setActive(activity);
  };

  return (
    <BotanicalStage>
      {evolved ? (
        <BossEvolution herbId={herbId} name={name} preview={evolved === 'preview'} onDone={() => setEvolved(false)} />
      ) : null}

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
            if (bossForm) setEvolved('earned');
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
            <div className="relative flex h-28 w-28 items-center justify-center">
              <span aria-hidden="true" className="boss-aura absolute inset-0 rounded-full" />
              <PlantSprite herbId={herbId} alt={name} stage="flowering" fit className="relative w-24" />
            </div>
            <h1 className="font-display text-2xl leading-tight font-extrabold text-gold-plate">Evolve your {name}</h1>
          </div>
          <EvolutionPath done={done} next={next} />
          {preview ? (
            <p className="mt-1.5 text-center text-xs text-violet-400">Preview: draft questions, nothing is recorded.</p>
          ) : null}
          {next ? (
            <div className="mt-3">
              <FeaturedTile activity={next} onPlay={() => start(next)} />
            </div>
          ) : null}
          <ul className="mt-3 grid grid-flow-col auto-cols-fr gap-2 [&>li:last-child]:col-auto">
            {rest.filter((a) => a !== 'boss-trial').map((activity) => (
              <SideTile key={activity} activity={activity} state={stateOf(activity)} onPlay={() => start(activity)} />
            ))}
          </ul>
          {rest.includes('boss-trial') ? (
            <ul className="mt-2 grid">
              <SideTile activity="boss-trial" state={stateOf('boss-trial')} onPlay={() => start('boss-trial')} />
            </ul>
          ) : null}
          {preview ? (
            <button
              type="button"
              onClick={() => setEvolved('preview')}
              className="mt-3 min-h-11 w-full text-sm font-bold text-violet-300 underline-offset-4 hover:underline"
            >
              Preview the evolution (not earned)
            </button>
          ) : null}
        </section>
      )}
    </BotanicalStage>
  );
}
