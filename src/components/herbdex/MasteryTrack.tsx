'use client';

import { useEffect, useState } from 'react';
import type { Herb } from '@/lib/types';
import {
  MASTERY_STAGES,
  MASTERY_STAGE_BLURB,
  MASTERY_STAGE_LABEL,
  SIGHTINGS_FOR_MASTERY,
  stageIndex,
  type MasteryStage,
} from '@/lib/mastery';
import { XP_FOR_LEARNING, XP_FOR_MASTERY } from '@/lib/progression';
import { useHerbdex } from '@/state/HerbdexProvider';
import { track } from '@/lib/analytics';
import { Panel } from '../ui/Panel';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { KnowledgeCheck } from './KnowledgeCheck';

/**
 * The three-stage mastery track, as a progression path.
 *
 * This was three identical rectangles, which said "here are three boxes" rather than
 * "here is where you are on a route". A connected track states the ORDER and the distance
 * left, which is the whole point of a progression.
 *
 * WHAT DID NOT CHANGE, and must not:
 *
 *  - `KnowledgeCheck` is still rendered UNCONDITIONALLY at a fixed position in this tree,
 *    with only its trigger hidden. Passing the check advances the stage, which re-renders
 *    everything around it — mounted inside the `discovered` branch, its own result dialog
 *    would be torn down while on screen. CLAUDE.md records this biting twice.
 *  - Stage is stated in words and marked with a symbol, never by colour alone.
 *  - Nothing here changes what unlocks a stage; it only draws the result.
 */

const XP_FOR_STAGE: Record<MasteryStage, (herb: Herb) => number> = {
  discovered: (herb) => herb.xp,
  learned: () => XP_FOR_LEARNING,
  mastered: () => XP_FOR_MASTERY,
};

export function MasteryTrack({ herb }: { herb: Herb }) {
  const { stageOf, sightingsFor, state, ready } = useHerbdex();
  const stage = ready ? stageOf(herb.id) : null;

  /*
   * The reward beat, fired once on a real transition.
   *
   * Adjusted DURING RENDER rather than from an effect: setting state synchronously inside
   * an effect cascades an extra render, and React's own guidance is to compare against the
   * previous value while rendering instead. The effect below only clears the flag, and does
   * it from a timer callback rather than the effect body.
   *
   * `seen` starts at the stage the page loaded with, so arriving at an already-mastered
   * card never celebrates something the player did days ago.
   */
  const [seen, setSeen] = useState<MasteryStage | null>(stage);
  const [justEarned, setJustEarned] = useState<MasteryStage | null>(null);
  if (stage !== seen) {
    setSeen(stage);
    if (seen !== null && stage !== null) {
      setJustEarned(stage);
      // Only the final stage is an analytics event; the earlier two are already measured
      // where they are caused (discovery and the knowledge check).
      if (stage === 'mastered') track('card_mastered');
    }
  }
  useEffect(() => {
    if (!justEarned) return;
    const timer = setTimeout(() => setJustEarned(null), 1200);
    return () => clearTimeout(timer);
  }, [justEarned]);

  // Hooks must run on every render, so the early return comes after them.
  if (!ready || !stage) return null;

  const reached = stageIndex(stage);
  const sightings = sightingsFor(herb.id);
  const stillNeeded = Math.max(0, SIGHTINGS_FOR_MASTERY - sightings);
  const masteredAt = state.mastered[herb.id];
  // The line fills to the LAST completed node, so a half-done track reads as half-done.
  const fill = reached <= 1 ? 0 : ((reached - 1) / (MASTERY_STAGES.length - 1)) * 100;

  return (
    <Panel
      family="game"
      clip
      pad="md"
      aria-labelledby="mastery-heading"
      className={reached === MASTERY_STAGES.length ? 'game-panel-earned' : ''}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="mastery-heading"
          className="text-[0.72rem] font-bold tracking-[0.1em] text-gold-400 uppercase"
        >
          Card mastery
        </h2>
        <p className="text-[0.72rem] font-semibold text-violet-300 tabular-nums">
          Stage {reached} of {MASTERY_STAGES.length}
        </p>
      </div>

      <div className="relative mt-5">
        {/* The rail, and the earned length over it. `aria-hidden` because the list below
            already states every stage and its status in words. */}
        <div
          aria-hidden="true"
          className="absolute top-3 right-[12%] left-[12%] h-0.5 rounded-full bg-violet-800"
        >
          <div
            className="path-fill h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
            style={{ ['--fill' as string]: `${fill}%` }}
          />
        </div>

        <ol className="relative grid grid-cols-3">
          {MASTERY_STAGES.map((entry, position) => {
            const done = position < reached;
            const current = position === reached - 1;
            const earned = justEarned === entry;
            return (
              <li key={entry} className="flex flex-col items-center text-center">
                <span className="relative flex h-6 w-6 items-center justify-center">
                  {/* The "you are here" ring. Only on the current stage, and only when it
                      is not already the finished one. */}
                  {current && reached < MASTERY_STAGES.length && (
                    <span
                      aria-hidden="true"
                      className="node-pulse absolute inset-0 rounded-full bg-mystery-pink/60"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`relative flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                      done
                        ? 'bloom-gold border-gold-400 bg-gold-500/25 text-gold-300'
                        : 'border-violet-600 bg-plum-900 text-violet-500'
                    } ${earned ? 'node-earned' : ''}`}
                  >
                    <PlantdexIcon name={done ? 'check' : 'pending'} />
                  </span>
                  {earned && (
                    <span
                      aria-hidden="true"
                      className="xp-rise glow-gold absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-extrabold whitespace-nowrap text-gold-400"
                    >
                      +{XP_FOR_STAGE[entry](herb)} XP
                    </span>
                  )}
                </span>
                <span
                  className={`mt-2 block text-[0.72rem] font-bold tracking-[0.08em] uppercase ${
                    done ? 'text-gold-300' : 'text-violet-400'
                  }`}
                >
                  {MASTERY_STAGE_LABEL[entry]}
                </span>
                <span className="mt-0.5 block text-[0.72rem] text-violet-400 tabular-nums">
                  +{XP_FOR_STAGE[entry](herb)} XP
                </span>
                <span className="sr-only">
                  {done ? (current ? ' — current stage' : ' — complete') : ' — not yet earned'}.{' '}
                  {MASTERY_STAGE_BLURB[entry]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* The one next action, stated plainly under the track. */}
      {stage === 'discovered' && (
        <p className="mt-5 text-sm text-violet-200 sm:text-sm">
          Read the card, then answer a few questions about it.
        </p>
      )}

      {/*
        Rendered at a fixed position, outside every stage branch, and never conditionally
        mounted. Passing the check advances the stage, which re-renders everything above —
        a check mounted inside the `discovered` branch would be torn down while its result
        dialog was still on screen.
      */}
      <KnowledgeCheck herb={herb} showTrigger={stage === 'discovered'} />

      {stage === 'learned' && (
        <div className="mt-4">
          <p className="text-sm text-violet-200">
            Find it again and log{' '}
            {stillNeeded === 1 ? 'the sighting' : `${stillNeeded} more sightings`} below.
          </p>
          <p className="mt-1.5 text-xs text-violet-400">
            <span className="font-semibold text-gold-300">+{XP_FOR_MASTERY} XP</span> — the one
            stage you can&apos;t earn from the sofa.
          </p>
        </div>
      )}

      {stage === 'mastered' && (
        <div className="mt-5 flex items-start gap-3 border-t border-gold-500/25 pt-4">
          <span
            aria-hidden="true"
            className="bloom-gold flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-lg text-gold-300"
          >
            <PlantdexIcon name="mastered" />
          </span>
          <div>
            <p className="text-sm font-bold text-gold-300">Mastered</p>
            <p className="text-xs text-violet-300">
              Found, learned, found again
              {masteredAt && (
                <>
                  {' — '}
                  <time dateTime={masteredAt}>
                    {new Date(masteredAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </>
              )}
              .
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}
