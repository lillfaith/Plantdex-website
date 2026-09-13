'use client';

import { useEffect, useState } from 'react';
import type { Herb } from '@/lib/types';
import {
  MASTERY_STAGES,
  MASTERY_STAGE_BLURB,
  MASTERY_STAGE_LABEL,
  stageIndex,
  tracksMastery,
  type MasteryStage,
} from '@/lib/mastery';
import { FIELD_LOG_TRIGGER_ID, growTrack } from '@/lib/grow-track';
import { XP_FOR_LEARNING, XP_FOR_MASTERY, xpForDiscoveries } from '@/lib/progression';
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

/*
 * THE LEDGER'S NUMBER, NOT THE ARTWORK'S. `herb.xp` is what is printed on the card; what a
 * discovery actually pays is `xpForDiscoveries`, which resolves through the PRINTED deck and
 * so credits zero for anything else. The two agree on all 45 printed cards and disagree on
 * every Field Card — #48 prints 250 and pays nothing — so reading the face value here was a
 * promise this panel could not keep.
 *
 * Second instance of that exact bug: `DiscoverPanel` printed `herb.xp` in its button for the
 * same reason and was corrected the same way. A number shown next to a stage is a promise,
 * and it has to come from the thing that pays it.
 */
const XP_FOR_STAGE: Record<MasteryStage, (herb: Herb) => number> = {
  discovered: (herb) => xpForDiscoveries([herb.id]),
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

  /*
   * Hooks must run on every render, so the early returns come after them.
   *
   * `tracksMastery` IS THE SECOND GATE, AND IT IS NOT DECORATION. This panel used to draw
   * itself for anything with a stage, and `stageOf` reads recorded state without consulting
   * the deck — so a Field Card found outdoors got the full three-stage track, "Stage 1 of 3",
   * and the card check's trigger button. Passing that check calls `markLearned`, which
   * `applyLearned` refuses for a card outside the printed deck by returning the very same
   * state object. Nothing was recorded, the track never moved, and the check could be taken
   * again forever.
   *
   * Mastery covers the deck in your hands (see mastery.ts). For a card it does not cover,
   * the honest thing is to draw no track at all rather than one stuck at its first node —
   * the discovery is still recorded, still shown, and still a real find.
   */
  if (!ready || !stage) return null;
  if (!tracksMastery(herb.id)) return null;

  const reached = stageIndex(stage);
  const sightings = sightingsFor(herb.id);
  const masteredAt = state.mastered[herb.id];

  /*
   * THE STEPS, DERIVED FROM THE SAME RECORDS MASTERY READS. Not memoised: it is three
   * boolean lookups and two string picks over state this component already holds, and a
   * `useMemo` here would cost more than it saves while adding a dependency array to keep
   * honest.
   */
  const quest = growTrack(state, herb.id, sightings);
  const learnStep = quest?.steps.find((step) => step.id === 'learn');
  const learnStepIsNext = learnStep?.current ?? false;

  /*
   * OPENING THE FIELD LOG, WHICH IS A SIBLING SECTION AND OWNS ITS OWN <dialog>.
   *
   * Both are bands in the same ordered list on the plant page, rendered from a config — so
   * neither is the other's parent and there is nothing to pass a ref through. The choices
   * were a context provider for one button, lifting the dialog out of the component that
   * owns it, or asking the DOM for the trigger that is already there. The third is the only
   * one that adds no state and no coupling in the type system, and the id it looks for is
   * asserted by the tests so it cannot be renamed out from under this.
   *
   * `.click()` rather than a scroll: the Field Log form is a MODAL, so it covers the page
   * wherever the page happens to be. Scrolling first would animate the background of a
   * dialog nobody can see behind. If the trigger is somehow absent the sighting section is
   * scrolled to instead, which is the honest fallback — never a dead button.
   */
  const openFieldLog = () => {
    const trigger = document.getElementById(FIELD_LOG_TRIGGER_ID);
    if (trigger) {
      trigger.click();
      return;
    }
    document.getElementById('sightings-heading')?.scrollIntoView({ behavior: 'smooth' });
  };
  // The line fills to the LAST completed node, so a half-done track reads as half-done.
  const fill = reached <= 1 ? 0 : ((reached - 1) / (MASTERY_STAGES.length - 1)) * 100;

  return (
    <Panel
      family="game"
      clip
      pad="md"
      // The scroll target for the discovery celebration's "Learn this card" button. Named
      // here rather than in the celebration so the anchor lives with the thing it names.
      id="card-mastery"
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

      {/*
        ── THE QUEST, AS THREE STEPS ───────────────────────────────────────────
        This was three stage-keyed paragraphs — one sentence visible at a time, each
        describing only the stage the player happened to be on. A player could therefore see
        "read the card, then answer a few questions" and have no idea a third requirement
        existed, or what it was. A progression you can only see one step of is not one you
        can plan against.

        Every flag comes from `growTrack`, which asks the same records `qualifiesForMastery`
        asks, in the same order. There is no checklist state here to fall out of step with
        the reducer — the panel cannot claim a step is done that mastery does not count, and
        cannot miss one that it does.
      */}
      {quest && (
        <ol className="mt-5 space-y-3">
          {quest.steps.map((step) => (
            <li key={step.id} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                  step.done
                    ? 'border-gold-400 bg-gold-500/25 text-gold-300'
                    : step.current
                      ? 'border-mystery-pink bg-mystery-pink/15 text-mystery-pink'
                      : 'border-violet-700 bg-plum-900 text-violet-500'
                }`}
              >
                <PlantdexIcon name={step.done ? 'check' : 'pending'} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span
                    className={`text-sm font-bold ${
                      step.done ? 'text-gold-300' : 'text-violet-100'
                    }`}
                  >
                    {step.label}
                  </span>
                  {/* Status in WORDS, never by colour alone. "Next" rather than "Locked":
                      the Field Log accepts a sighting at any time, so a lock here would
                      describe a rule the app does not enforce. */}
                  <span
                    className={`text-[0.72rem] font-bold tracking-[0.08em] uppercase ${
                      step.done
                        ? 'text-gold-400'
                        : step.current
                          ? 'text-mystery-pink'
                          : 'text-violet-400'
                    }`}
                  >
                    {step.done ? 'Complete' : step.current ? 'Next' : 'Then'}
                  </span>
                </p>

                {/* The supporting line, and only where it still has something to say. A
                    finished step needs no instructions. */}
                {!step.done && step.note && (
                  <p className="mt-1 text-xs leading-relaxed text-violet-300">{step.note}</p>
                )}
                {/* Except this one: a sighting logged before the check is the one case where
                    a DONE step carries news, because it changes what the next step means. */}
                {step.done && step.id === 'sighting' && !learnStep?.done && step.note && (
                  <p className="mt-1 text-xs leading-relaxed text-gold-300">{step.note}</p>
                )}

                {/* ONE action, on the step that is actually next. */}
                {step.current && step.id === 'sighting' && (
                  <button
                    type="button"
                    onClick={openFieldLog}
                    className="mt-2 min-h-11 rounded-full border border-gold-500/60 bg-gold-500/15 px-4 text-xs font-bold text-gold-300 transition-colors hover:bg-gold-500/30 hover:text-gold-200"
                  >
                    Log a sighting
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {/*
        Rendered at a fixed position, outside every stage branch, and never conditionally
        mounted. Passing the check advances the stage, which re-renders everything above —
        a check mounted inside the `discovered` branch would be torn down while its result
        dialog was still on screen.

        Its TRIGGER is now shown on the step rather than on the stage, which is the same
        condition said more precisely: the check is offered exactly when learning is the step
        to act on.
      */}
      <KnowledgeCheck herb={herb} showTrigger={learnStepIsNext} />

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
