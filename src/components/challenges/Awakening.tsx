'use client';

import { useEffect, type ReactNode } from 'react';
import { PlantSprite } from '@/components/PlantSprite';
import { assetPath } from '@/lib/asset-path';
import type { ActivityId } from '@/lib/boss-form';
import { spriteFor } from '@/lib/plant-sprites';
import type { NodeState, ProgressNote } from '@/lib/awakening-state';
import { ACTIVITY_LABELS } from './activity-labels';
import { Art } from './ChallengeArt';
import { ChallengeShell } from './ChallengeShell';

/**
 * THE AWAKENING: where a player sees how far they are and what to do next. Presentation only; the
 * container decides every state and passes it in.
 *
 * It says only what is known:
 *   done      the SERVER has recorded this round as passed (or, in a preview, a simulated pass)
 *   next      the one to do now
 *   later     playable, but not the next one
 *   locked    waiting on earlier rounds (the Boss Trial before the three rounds are done)
 *   soon      not available yet (nothing has been reviewed)
 *   unknown   progress could not be read, so nothing is claimed either way
 * Progress that is still loading, or that failed to load, is NEVER drawn as "nothing done".
 *
 * Two equal columns carry the plant and its sleeping Boss Form, drawn from the same frame width so
 * they are symmetric whatever the plant looks like. The Boss Form is a flat silhouette made with a
 * CSS mask over its resting frame (no filter), and it only gets lighter as rounds are passed.
 */
export type { NodeState, ProgressNote } from '@/lib/awakening-state';

export interface AwakeningNode {
  activity: ActivityId;
  state: NodeState;
}

const STATE_WORD: Record<NodeState, string> = {
  done: 'Done',
  next: 'Next',
  later: 'Later',
  locked: 'Locked',
  soon: 'Coming soon',
  unknown: 'Unknown',
};

const LEVEL = ['bg-plum-950', 'bg-plum-700', 'bg-plum-600', 'bg-violet-800'] as const;

function Sigil() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="h-12 w-12 text-gold-300">
      <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="32" cy="32" r="8" fill="currentColor" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <g key={a} transform={`rotate(${a} 32 32)`}>
          <line x1="32" y1="32" x2="32" y2="9" stroke="currentColor" strokeWidth="3" />
          <circle cx="32" cy="8" r="3" fill="#fff4d6" />
        </g>
      ))}
    </svg>
  );
}

/** The sleeping Boss Form: its own resting frame as a flat shape that lightens with progress. */
function BossSilhouette({ herbId, level }: { herbId: string; level: number }) {
  const still = spriteFor(herbId, 'boss')?.still;
  if (!still) return <div aria-hidden="true" className="aspect-[230/190] w-full" />;
  const url = `url(${assetPath(still)})`;
  return (
    <div
      role="img"
      aria-label="The Boss Form, asleep"
      className={`aspect-[230/190] w-full ${LEVEL[Math.min(level, LEVEL.length - 1)]}`}
      style={{
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center bottom',
        WebkitMaskPosition: 'center bottom',
        imageRendering: 'pixelated',
      }}
    />
  );
}

function Node({ node, index }: { node: AwakeningNode; index: number }) {
  const label = ACTIVITY_LABELS[node.activity];
  const look = {
    done: 'border-gold-300 bg-gold-400 text-plum-950',
    next: 'border-gold-300 bg-plum-900 text-gold-300 shadow-[0_0_12px_rgb(255_210_110/0.5)]',
    later: 'border-violet-500 bg-plum-900 text-violet-300',
    locked: 'border-violet-500 bg-plum-900 text-violet-300',
    soon: 'border-dashed border-violet-500 bg-plum-900 text-violet-300',
    unknown: 'border-dashed border-violet-400 bg-plum-900 text-violet-200',
  }[node.state];
  return (
    <li className="flex flex-col items-center gap-1 text-center">
      <span className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg font-extrabold ${look}`}>
        {node.state === 'done' ? <Art name="check" className="h-5 w-5" /> : node.activity === 'boss-trial' ? <Art name="crown" className="h-5 w-5" /> : index + 1}
      </span>
      <span className="text-sm leading-tight font-bold text-violet-50">{label.name}</span>
      <span className={`text-sm leading-tight ${node.state === 'done' || node.state === 'next' ? 'font-bold text-gold-300' : 'text-violet-200'}`}>
        {STATE_WORD[node.state]}
      </span>
    </li>
  );
}

export interface AwakeningProps {
  herbId: string;
  name: string;
  nodes: readonly AwakeningNode[];
  /** How many of the three rounds are known to be passed; lightens the sleeping Boss Form. */
  level: number;
  progress: ProgressNote;
  action: { label: ReactNode; onClick: () => void; disabled?: boolean };
  status: string;
  onRetry?: () => void;
  onExit: () => void;
  /** Whatever the container wants under the steps (the dev-only evolution preview). */
  footerNote?: ReactNode;
  /** For `signedout`: where to sign in. */
  signInHref?: string;
  /** True once, right after the server confirmed a pass: the sleeping Boss Form swells. */
  pulse?: boolean;
  onPulseShown?: () => void;
}

export function AwakeningView({ herbId, name, nodes, level, progress, action, status, onRetry, onExit, footerNote, signInHref, pulse = false, onPulseShown }: AwakeningProps) {
  // The pulse is a one-time moment: once it has been drawn it is spent, so coming back does not replay it.
  useEffect(() => {
    if (pulse) onPulseShown?.();
  }, [pulse, onPulseShown]);
  return (
    <ChallengeShell title="Awakening" kicker="Boss Form" status={<span>{status}</span>} action={action} onExit={onExit}>
      <div className="flex min-h-full flex-col gap-5">
        <h2 className="text-center text-2xl leading-tight font-extrabold text-violet-50">Something older sleeps in your {name}</h2>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-1">
          <figure className="flex flex-col items-center gap-1.5">
            <div className="w-full max-w-[9.5rem]">
              <PlantSprite herbId={herbId} alt={name} stage="flowering" fit />
            </div>
            <figcaption className="text-base font-bold text-violet-50">{name}</figcaption>
          </figure>
          <div className="mb-8 self-center">
            <Sigil />
          </div>
          <figure className="flex flex-col items-center gap-1.5">
            <div className="relative flex w-full max-w-[9.5rem] justify-center">
              {pulse ? <span aria-hidden="true" className="awaken-glow pointer-events-none absolute inset-[-15%]" /> : null}
              <div className={pulse ? 'awaken-pulse w-full' : 'w-full'}>
                <BossSilhouette herbId={herbId} level={level} />
              </div>
            </div>
            <figcaption className="text-base font-bold text-violet-50">Boss Form</figcaption>
          </figure>
        </div>

        <ol className="grid grid-cols-4 gap-1.5" aria-label="Rounds">
          {nodes.map((node, i) => (
            <Node key={node.activity} node={node} index={i} />
          ))}
        </ol>

        {progress === 'loading' ? (
          <p role="status" className="text-center text-base text-violet-100">Loading your progress.</p>
        ) : null}
        {progress === 'error' ? (
          <div role="alert" className="rounded-lg bg-violet-800/60 px-3 py-2.5 text-center">
            <p className="text-base text-violet-50">We could not load your progress. Nothing has been lost.</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 min-h-12 px-4 text-base font-extrabold text-gold-300 underline underline-offset-4 outline-none focus-visible:ring-4 focus-visible:ring-gold-300"
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : null}
        {progress === 'signedout' ? (
          <p className="text-center text-base text-violet-100">
            Sign in to play and keep your progress.{' '}
            {signInHref ? (
              <a href={signInHref} className="font-extrabold text-gold-300 underline underline-offset-4">Sign in</a>
            ) : null}
          </p>
        ) : null}
        {progress === 'preview' ? (
          <p className="text-center text-sm text-violet-200">Preview: draft questions, nothing is recorded.</p>
        ) : null}
        {footerNote}
      </div>
    </ChallengeShell>
  );
}
