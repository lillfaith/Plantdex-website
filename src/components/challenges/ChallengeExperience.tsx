'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/state/AuthProvider';
import { useHerbdex } from '@/state/HerbdexProvider';
import { bossFormsMode } from '@/lib/boss-forms';
import { CHALLENGE_ACTIVITIES, PREREQUISITE_ACTIVITIES, isBossPilot, type ActivityId } from '@/lib/boss-form';
import { deriveAwakening } from '@/lib/awakening-state';
import { noteBossEarned } from '@/lib/boss-moments';
import { notePassed, passedThisSession } from '@/lib/boss-session';
import { useChallengeCompletions } from '@/lib/challenge-completions';
import { buildChallenge } from '@/lib/mastery-challenges';
import { ACTIVITY_LABELS } from './activity-labels';
import { AwakeningView } from './Awakening';
import { BossEvolution } from './BossEvolution';
import { BotanicalStage } from './BotanicalStage';
import { ChallengeRunner } from './ChallengeRunner';

/**
 * THE CHALLENGE ENTRANCE for a pilot plant: the Awakening, three short rounds and a final Boss Trial.
 * It changes nothing about WHAT can be played or scored; it only presents it.
 *
 * OFF BY DEFAULT. With `NEXT_PUBLIC_BOSS_FORMS` unset (production) this module is not even in the
 * bundle (see `ChallengeGate`). In `next dev` with `preview`, draft questions are playable but
 * record nothing; with `on` a signed-in player's results are scored and saved by the server, and a
 * question is served only if a named reviewer has signed it off. Rounds whose questions are
 * disabled show "Coming soon" and cannot be started.
 *
 * WHAT COUNTS AS DONE, and where each kind comes from:
 *   on       the server's own record (`useChallengeCompletions`), plus a round the server has just
 *            passed in this visit. Nothing else. A round is never shown as done from a tap, an
 *            animation or a preview.
 *   preview  simulated passes from this visit only, kept under their own key and never mixed with
 *            the server's.
 * While the server's record is loading, or failed to load, no round is shown as done OR as not
 * done: the screen says progress is unavailable and offers a retry.
 */
export function ChallengeExperience({ herbId, name }: { herbId: string; name: string }) {
  const mode = bossFormsMode();
  const { isMastered, ready } = useHerbdex();
  const { user } = useAuth();
  const router = useRouter();
  const [active, setActive] = useState<ActivityId | null>(null);
  const [attempt, setAttempt] = useState(0);
  const sessionMode = mode === 'on' ? 'on' : 'preview';
  // Passes seen by a verdict in this visit. Filled only by a verdict, kept apart by mode.
  const [seen, setSeen] = useState<ReadonlySet<ActivityId>>(() => passedThisSession(sessionMode, herbId));
  // 'earned' only ever comes from the server's answer; 'preview' only from the dev-only button.
  const [evolved, setEvolved] = useState<false | 'earned' | 'preview'>(false);
  // The sleeping Boss Form swells once when the SERVER confirms a pass. Never for a preview.
  const [pulse, setPulse] = useState(false);
  const completions = useChallengeCompletions({ enabled: mode === 'on', userId: user?.id, herbId });

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
  // WHAT IS KNOWN, decided in one tested place: a round is done only on the server's say-so (or a
  // labelled preview), and never "not done" while the answer is unknown.
  const { progress, done, nodes, next, level } = deriveAwakening({
    preview,
    signedIn: Boolean(user),
    completions: completions.state,
    seen,
    runnable,
  });

  const start = (activity: ActivityId) => {
    setAttempt(0);
    setActive(activity);
  };
  const exit = () => router.push(`/herbdex/${herbId}`);

  // After a round passes, lead straight on to the next playable one, if any.
  const afterActive = (current: ActivityId): ActivityId | null => {
    const all = new Set<ActivityId>([...done, current]);
    const open = PREREQUISITE_ACTIVITIES.every((one) => all.has(one));
    return (
      CHALLENGE_ACTIVITIES.find(
        (one) => !all.has(one) && runnable(one) && (one !== 'boss-trial' || open),
      ) ?? null
    );
  };

  const action =
    progress === 'loading'
      ? { label: 'Loading', onClick: () => undefined, disabled: true }
      : progress === 'error'
        ? { label: 'Try again', onClick: completions.retry }
        : progress === 'signedout'
          ? { label: 'Sign in', onClick: () => router.push('/account') }
          : next
            ? {
                label: next === 'boss-trial' ? 'Face the Boss Trial' : done.size === 0 ? 'Begin the Awakening' : `Continue: ${ACTIVITY_LABELS[next].name}`,
                onClick: () => start(next),
              }
            : { label: 'Nothing to play yet', onClick: () => undefined, disabled: true };
  const status =
    progress === 'loading'
      ? 'Checking what you have passed.'
      : progress === 'error'
        ? 'Your progress is unavailable right now.'
        : progress === 'signedout'
          ? 'Your progress is kept on your account.'
          : next
            ? level === 3
              ? 'One trial remains.'
              : level > 0
                ? 'The shape grows clearer.'
                : 'Prove you know it, and it wakes.'
            : 'Nothing is open yet.';

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
          nextLabel={afterActive(active) ? ACTIVITY_LABELS[afterActive(active)!].name : undefined}
          onContinue={() => {
            const to = afterActive(active);
            if (to) start(to);
            else setActive(null);
          }}
          onVerdict={({ passed }) => {
            if (!passed) return;
            notePassed(sessionMode, herbId, active);
            setSeen((current) => new Set(current).add(active));
            if (!preview) setPulse(true);
            // Read the server's record again, so what is shown follows what is stored.
            if (!preview) completions.retry();
          }}
          onDone={({ bossForm }) => {
            setActive(null);
            setAttempt(0);
            if (bossForm) {
              noteBossEarned(herbId);
              setEvolved('earned');
            }
          }}
          onRetry={() => setAttempt((n) => n + 1)}
          onExit={() => {
            setActive(null);
            setAttempt(0);
          }}
        />
      ) : (
        <AwakeningView
          herbId={herbId}
          name={name}
          nodes={nodes}
          level={level}
          progress={progress}
          action={action}
          status={status}
          onRetry={completions.retry}
          onExit={exit}
          signInHref="/account"
          pulse={pulse}
          onPulseShown={() => setPulse(false)}
          footerNote={
            preview ? (
              <button
                type="button"
                onClick={() => setEvolved('preview')}
                className="min-h-12 w-full text-sm font-bold text-violet-300 underline-offset-4 hover:underline"
              >
                Preview the evolution (not earned)
              </button>
            ) : null
          }
        />
      )}
    </BotanicalStage>
  );
}
