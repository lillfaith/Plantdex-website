'use client';

import type { Herb } from '@/lib/types';
import {
  MASTERY_STAGES,
  MASTERY_STAGE_BLURB,
  MASTERY_STAGE_LABEL,
  SIGHTINGS_FOR_MASTERY,
  stageIndex,
} from '@/lib/mastery';
import { XP_FOR_LEARNING, XP_FOR_MASTERY } from '@/lib/progression';
import { useHerbdex } from '@/state/HerbdexProvider';
import { KnowledgeCheck } from './KnowledgeCheck';

/**
 * The three-stage mastery track for one card.
 *
 * Shows where the card stands and exactly one next action, so the path from "found it" to
 * "mastered it" is never a guess. Stage is stated in words and marked with a symbol, never
 * by colour alone.
 */
export function MasteryTrack({ herb }: { herb: Herb }) {
  const { stageOf, sightingsFor, state, ready } = useHerbdex();

  if (!ready) return null;

  const stage = stageOf(herb.id);
  if (!stage) return null;

  const reached = stageIndex(stage);
  const sightings = sightingsFor(herb.id);
  const stillNeeded = Math.max(0, SIGHTINGS_FOR_MASTERY - sightings);
  const masteredAt = state.mastered[herb.id];

  return (
    <section aria-labelledby="mastery-heading" className="panel mt-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="mastery-heading" className="text-sm font-bold tracking-wide text-gold-400 uppercase">
          Card mastery
        </h2>
        <p className="text-xs font-semibold text-violet-300 tabular-nums">
          Stage {reached} of {MASTERY_STAGES.length}
        </p>
      </div>

      <ol className="mt-4 grid grid-cols-3 gap-2">
        {MASTERY_STAGES.map((entry, position) => {
          const done = position < reached;
          const current = position === reached - 1;
          return (
            <li
              key={entry}
              className={`rounded-xl border p-2.5 text-center ${
                done
                  ? 'border-gold-500/60 bg-gold-500/12'
                  : 'border-violet-700 bg-violet-900/50'
              }`}
            >
              <span
                aria-hidden="true"
                className={`block text-base leading-none ${done ? 'text-gold-300' : 'text-violet-400'}`}
              >
                {done ? '✓' : '○'}
              </span>
              <span
                className={`mt-1 block text-[0.68rem] font-bold tracking-wide uppercase ${
                  done ? 'text-gold-300' : 'text-violet-400'
                }`}
              >
                {MASTERY_STAGE_LABEL[entry]}
              </span>
              <span className="sr-only">
                {done ? (current ? ' — current stage' : ' — complete') : ' — not yet earned'}.{' '}
                {MASTERY_STAGE_BLURB[entry]}
              </span>
            </li>
          );
        })}
      </ol>

      {stage === 'discovered' && (
        <p className="mt-4 mb-3 text-sm text-violet-200">
          You&apos;ve found this plant. Read its card, then answer a few questions about what it
          says to mark it <strong className="text-gold-300">Learned</strong>.
        </p>
      )}

      {/*
        Rendered at a fixed position, outside every stage branch, and never conditionally
        mounted. Passing the check advances the stage, which re-renders everything above —
        a check mounted inside the `discovered` branch would be torn down while its result
        dialog was on screen.
      */}
      <KnowledgeCheck herb={herb} showTrigger={stage === 'discovered'} />

      {stage === 'learned' && (
        <div className="mt-4">
          <p className="text-sm text-violet-200">
            You know this card. Go and find the plant again — log{' '}
            {stillNeeded === 1 ? 'one more sighting' : `${stillNeeded} more sightings`} below to
            master it.
          </p>
          <p className="mt-1.5 text-xs text-violet-400">
            Worth <span className="font-semibold text-gold-300">+{XP_FOR_MASTERY} XP</span>. Mastery
            is the one stage you cannot earn from the sofa.
          </p>
        </div>
      )}

      {stage === 'mastered' && (
        <div className="mt-4 flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-lg text-gold-300"
          >
            ★
          </span>
          <div>
            <p className="text-sm font-bold text-gold-300">Mastered</p>
            <p className="text-xs text-violet-300">
              Found, learned, and found again
              {masteredAt && (
                <>
                  {' '}
                  — completed on{' '}
                  <time dateTime={masteredAt}>
                    {new Date(masteredAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </>
              )}
              . This plant is flowering in your garden.
            </p>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-violet-400">
        Discovery is worth {herb.xp} XP, learning the card {XP_FOR_LEARNING}, mastering it{' '}
        {XP_FOR_MASTERY}. Each is awarded once and can never be earned twice.
      </p>
    </section>
  );
}
