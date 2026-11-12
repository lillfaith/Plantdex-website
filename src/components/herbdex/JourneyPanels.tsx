'use client';

import Link from 'next/link';
import type { Herb } from '@/lib/types';
import { MASTERY_STAGES, MASTERY_STAGE_LABEL, nextStepFor, tracksMastery } from '@/lib/mastery';
import { useHerbdex } from '@/state/HerbdexProvider';
import { PlantSprite } from '../PlantSprite';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';
import { XpBar } from '../game/XpBar';
import { ResearchTeaser } from '../research/ResearchTeaser';

/**
 * THE LOCKED AND OPEN STATES OF THE CHALLENGES AND PROGRESS TABS.
 *
 * Presentation only: nothing here changes a threshold, an award or a rule, and the dates and
 * stage come from the records the game already keeps. The locked state shows the plant's own
 * sprite as a silhouette (never its colours), the three existing mastery stages as locked
 * nodes, one sentence about what unlocks, and one action. It says nothing about Boss Forms or
 * identification challenges, which are not released.
 */

const STAGE_ICON: Record<(typeof MASTERY_STAGES)[number], IconName> = {
  discovered: 'sprout',
  learned: 'learn',
  mastered: 'mastered',
};

function Silhouette({ herb }: { herb: Herb }) {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-32 opacity-80 [filter:brightness(0)_invert(0.5)]"
    >
      <PlantSprite herbId={herb.id} alt="" stage="sprout" frozen fit />
    </div>
  );
}

export function LockedJourney({
  herb,
  heading,
  line,
}: {
  herb: Herb;
  heading: string;
  line: string;
}) {
  return (
    <section
      aria-labelledby={`locked-${heading}`}
      className="rounded-xl border border-violet-700 bg-plum-900/50 p-4 text-center"
    >
      <Silhouette herb={herb} />
      <h2 id={`locked-${heading}`} className="font-display mt-2 text-xl font-bold text-gold-plate">
        {heading}
      </h2>
      <p className="mx-auto mt-1 max-w-[19rem] text-sm leading-relaxed text-violet-200">{line}</p>
      <ol className="mt-4 flex items-center justify-center gap-2" aria-label="Mastery stages">
        {MASTERY_STAGES.map((stage, index) => (
          <li key={stage} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true" className="h-px w-4 bg-violet-600" />}
            <span className="flex flex-col items-center gap-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-600 bg-plum-800 text-violet-400">
                <PlantdexIcon name="locked" className="text-sm" />
              </span>
              <span className="text-[0.72rem] font-bold text-violet-300">
                {MASTERY_STAGE_LABEL[stage]}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <Link
        href="/scan"
        className="arcade-key mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-gold-400 px-6 text-sm font-bold tracking-wide text-plum-900 uppercase hover:bg-gold-300"
      >
        Find this plant
      </Link>
    </section>
  );
}

/** The discovered Progress tab: the journey, XP, then the field log and Field Research. */
export function JourneyPanel({ herb }: { herb: Herb }) {
  const { ready, state, stageOf, progress } = useHerbdex();
  const stage = ready ? stageOf(herb.id) : null;
  const reached: Record<(typeof MASTERY_STAGES)[number], string | undefined> = {
    discovered: state.discoveries[herb.id],
    learned: state.learned[herb.id],
    mastered: state.mastered[herb.id],
  };
  const next = stage && tracksMastery(herb.id) ? nextStepFor(stage) : null;

  return (
    <section
      aria-label="Your journey with this plant"
      className="rounded-xl border border-violet-700 bg-plum-900/50 p-4"
    >
      <ol className="flex items-start justify-between gap-1">
        {MASTERY_STAGES.map((one, index) => {
          const at = reached[one];
          return (
            <li key={one} className="flex flex-1 flex-col items-center text-center">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  at
                    ? 'border-gold-500 bg-gold-500/15 text-gold-300'
                    : 'border-violet-700 bg-plum-800 text-violet-500'
                }`}
              >
                <PlantdexIcon name={at ? STAGE_ICON[one] : 'locked'} className="text-base" />
              </span>
              <span className={`mt-1 text-xs font-bold ${at ? 'text-gold-300' : 'text-violet-400'}`}>
                {MASTERY_STAGE_LABEL[one]}
              </span>
              <span className="text-[0.72rem] text-violet-300 tabular-nums">
                {at
                  ? new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  : index === 0
                    ? ''
                    : ' '}
              </span>
            </li>
          );
        })}
      </ol>

      {next && (
        <p className="mt-3 rounded-lg bg-gold-500/10 px-3 py-2 text-sm text-violet-100">
          <span className="font-bold text-gold-300">Next: </span>
          {next}
        </p>
      )}

      <div className="mt-3 border-t border-violet-700/60 pt-3">
        <XpBar progress={progress} />
      </div>
    </section>
  );
}

export function FieldResearchRow() {
  return <ResearchTeaser />;
}
