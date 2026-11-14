'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PlantSprite } from '@/components/PlantSprite';
import { useHerbdex } from '@/state/HerbdexProvider';
import { bossFormsMode } from '@/lib/boss-forms';
import { CHALLENGE_ACTIVITIES, PREREQUISITE_ACTIVITIES, isBossPilot, type ActivityId } from '@/lib/boss-form';
import { buildChallenge } from '@/lib/mastery-challenges';
import { BossEvolution } from './BossEvolution';
import { ChallengeRunner } from './ChallengeRunner';

/**
 * THE CHALLENGE HUB for a pilot plant: three short activities and the Boss Trial.
 *
 * OFF BY DEFAULT. With `NEXT_PUBLIC_BOSS_FORMS` unset (production) this renders one plain
 * sentence and nothing is built or requested. In `next dev` with `preview`, draft questions are
 * playable but record nothing; with `on` a signed-in player's results are scored and saved by
 * the server, and a question is served only if a named reviewer has signed it off. Activities
 * whose questions are disabled show "Coming soon" and cannot be started.
 */
const TITLES: Record<ActivityId, { name: string; hint: string }> = {
  'part-spotter': { name: 'Part Spotter', hint: 'Find the parts' },
  compare: { name: 'Lookalikes', hint: 'Spot the difference' },
  'habitat-season': { name: 'Habitat', hint: 'Where it grows' },
  'boss-trial': { name: 'Boss Trial', hint: 'Ten quick ones' },
};

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

  if (evolved) {
    return <BossEvolution herbId={herbId} name={name} onDone={() => setEvolved(false)} />;
  }

  if (active) {
    return (
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
    );
  }

  return (
    <section className="mt-4">
      <div className="flex flex-col items-center text-center">
        <PlantSprite herbId={herbId} alt={name} stage="flowering" scale={1} />
        <h1 className="mt-2 font-display text-3xl font-extrabold text-gold-plate">Evolve your {name}</h1>
        <p className="mt-1 text-sm text-violet-200">Three quick rounds, then the Boss Trial.</p>
      </div>
      {preview ? (
        <p className="mt-3 text-center text-xs text-violet-400">
          Preview: draft questions, nothing is recorded.
        </p>
      ) : null}
      <ul className="mt-5 grid gap-3">
        {CHALLENGE_ACTIVITIES.map((activity) => {
          const available = runnable(activity);
          const locked = activity === 'boss-trial' && !trialOpen;
          const finishedOne = done.has(activity);
          const enabled = available && !locked;
          return (
            <li key={activity}>
              <button
                type="button"
                disabled={!enabled}
                onClick={() => {
                  setAttempt(0);
                  setActive(activity);
                }}
                className={`pixel-tile flex min-h-16 w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-transform active:scale-[0.98] ${enabled ? '' : 'opacity-55'} ${activity === 'boss-trial' && enabled ? 'holo-border' : ''}`}
              >
                <span>
                  <span className="block text-lg font-extrabold text-violet-50">{TITLES[activity].name}</span>
                  <span className="block text-xs text-violet-300">{TITLES[activity].hint}</span>
                </span>
                <span className="text-sm font-bold text-gold-300">
                  {finishedOne ? 'Done' : !available ? 'Coming soon' : locked ? 'Locked' : 'Play'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {preview ? (
        <button
          type="button"
          onClick={() => setEvolved(true)}
          className="mt-5 w-full min-h-11 text-sm font-bold text-violet-300 underline-offset-4 hover:underline"
        >
          Preview the evolution
        </button>
      ) : null}
    </section>
  );
}
