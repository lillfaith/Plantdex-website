'use client';

import type { ReactNode } from 'react';
import { PlantSprite } from '@/components/PlantSprite';
import { ChallengeShell } from './ChallengeShell';
import { Sparkles } from './Sparkles';

/**
 * THE FOUR WAYS A SUBMISSION CAN END, each its own screen with its own words, in the same frame.
 *
 *   complete   the verdict was a pass. In `on` mode that is the SERVER's verdict; in preview it is
 *              the local one and the screen says so.
 *   failed     the verdict was not a pass. Rounds already passed stay passed, and a retry mixes the
 *              questions from the same set, so some may come back.
 *   limit      the SERVER refused the submission for today. This screen is only ever shown for that
 *              refusal, never guessed from a count or a network failure.
 *   error      the answers could not be sent or no verdict came back. Nothing was recorded and
 *              nothing is claimed.
 *
 * Presentation only. It decides nothing: the kind and every number come from the caller, which got
 * them from the verdict.
 */
export type ResultKind = 'complete' | 'failed' | 'limit' | 'error';

export interface ReviewItem {
  id: string;
  prompt: string;
  feedback: string;
  right: boolean;
}

export interface ResultViewProps {
  kind: ResultKind;
  herbId: string;
  activityName: string;
  isTrial: boolean;
  preview: boolean;
  resolved?: number;
  total?: number;
  /** The player's answers with their explanations. Empty until a verdict has arrived. */
  review: readonly ReviewItem[];
  /** For `complete`: the label of the next round, so the action can lead straight on. */
  nextLabel?: string;
  /** The server recorded a Boss Form: the pass leads into the evolution. */
  awakens?: boolean;
  onPrimary: () => void;
  onBack: () => void;
  onExit: () => void;
}

function Words({ children }: { children: ReactNode }) {
  return <p className="mt-2 max-w-xs text-center text-lg text-violet-100">{children}</p>;
}

export function ChallengeResultView(props: ResultViewProps) {
  const { kind, herbId, activityName, isTrial, preview, resolved, total, review, nextLabel, awakens = false, onPrimary, onBack, onExit } = props;
  const score = resolved !== undefined && total !== undefined ? `${resolved} of ${total}` : null;

  const copy: Record<ResultKind, { kicker: string; heading: string; status: string; action: string }> = {
    complete: {
      kicker: preview ? 'Preview' : awakens ? 'Boss Trial passed' : 'Stage complete',
      heading: preview ? 'Passed in preview' : awakens ? 'The seal holds' : 'Nicely done!',
      status: preview ? 'Preview only. Nothing is recorded.' : awakens ? 'Something is waking.' : 'Stage complete.',
      action: awakens ? 'Awaken the Boss Form' : nextLabel ? `Continue to ${nextLabel}` : 'Back to the Awakening',
    },
    failed: {
      kicker: 'Not yet',
      heading: isTrial ? 'Not this time' : 'So close!',
      status: preview
        ? 'Preview only. Nothing is recorded.'
        : 'Questions are drawn from a set, so some may come back.',
      action: isTrial ? 'Try the Trial again' : 'Try again',
    },
    limit: {
      kicker: 'Resting',
      heading: 'That is enough for today',
      status: 'The count resets at midnight UTC.',
      action: 'Come back tomorrow',
    },
    error: {
      kicker: 'Problem',
      heading: 'Could not save that',
      status: 'Nothing was recorded. Please try again later.',
      action: 'Back to the Awakening',
    },
  };
  const c = copy[kind];

  return (
    <ChallengeShell
      title={activityName}
      kicker={c.kicker}
      status={<span>{c.status}</span>}
      action={{ label: c.action, onClick: kind === 'limit' ? onBack : onPrimary, disabled: kind === 'limit' }}
      secondary={
        kind === 'failed' || kind === 'limit' ? (
          <button
            type="button"
            onClick={onBack}
            className="min-h-12 px-4 text-base font-bold text-violet-200 underline underline-offset-4 outline-none focus-visible:ring-4 focus-visible:ring-gold-300"
          >
            Back to the Awakening
          </button>
        ) : null
      }
      onExit={onExit}
    >
      <section className="flex flex-col items-center text-center" aria-live="polite">
        {kind === 'complete' || kind === 'failed' ? (
          <div className="relative">
            <PlantSprite herbId={herbId} alt="" stage={isTrial ? 'boss' : 'flowering'} scale={1} frozen={kind !== 'complete'} />
            {kind === 'complete' ? <Sparkles count={8} radius={70} /> : null}
          </div>
        ) : null}
        <h2 className="mt-2 font-display text-3xl font-extrabold text-gold-plate">{c.heading}</h2>
        {kind === 'complete' || kind === 'failed' ? (
          <>
            {score ? <p className="mt-2 text-lg font-bold text-violet-100">{score}</p> : null}
            {kind === 'failed' && !preview ? <Words>Rounds you have passed stay passed.</Words> : null}
          </>
        ) : null}
        {kind === 'limit' ? (
          <>
            <Words>You have used all of today&rsquo;s tries. Your answers this time were not scored.</Words>
            <Words>Everything you have passed is kept.</Words>
          </>
        ) : null}
        {kind === 'error' ? <Words>Your answers could not be sent, so nothing has changed.</Words> : null}

        {review.length > 0 ? (
          <ol className="mt-5 grid w-full gap-2.5 text-left" aria-label="Your answers and explanations">
            {review.map((q) => (
              <li key={q.id} className="rounded-lg bg-violet-800/50 px-3 py-2.5">
                <p className="text-base font-extrabold text-violet-50">
                  {q.right ? 'Right' : 'Not this time'}: {q.prompt}
                </p>
                <p className="mt-0.5 text-base text-violet-100">{q.feedback}</p>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </ChallengeShell>
  );
}
