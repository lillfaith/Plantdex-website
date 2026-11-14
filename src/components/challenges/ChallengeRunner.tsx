'use client';

import { useMemo, useState } from 'react';
import { PlantSprite } from '@/components/PlantSprite';
import { hasRetry, type ActivityId } from '@/lib/boss-form';
import { submitChallenge, type SubmitResult } from '@/lib/challenge-client';
import { buildChallenge, scoreSubmission, type Slot } from '@/lib/mastery-challenges';
import { QuestionView } from './QuestionViews';

/**
 * ONE ACTIVITY, ONE SCREEN AT A TIME.
 *
 * The flow is: every first question, then (Part Spotter and Habitat only) a short "second
 * chance" for the ones missed, then the result. The second chance asks a DIFFERENT question on
 * the same fact, because the feedback has just shown the answer to the first. Compare and the
 * Boss Trial never offer one; `hasRetry` is the single rule, shared with the server's scorer.
 *
 * The answers are sent exactly as `scoreSubmission` reads them: `[first]` or `[first, second]`
 * per slot. Nothing about scoring is decided here. In `preview` (development only) the result
 * is computed locally and nothing is recorded; in `on` the server's verdict is the only one
 * shown.
 */
type Step = { slot: number; which: 'primary' | 'replacement' };

export interface RunnerProps {
  herbId: string;
  activity: ActivityId;
  attempt: number;
  mode: 'preview' | 'on';
  onDone: (outcome: { passed: boolean; bossForm: boolean }) => void;
  onRetry: () => void;
  onExit: () => void;
}

export function ChallengeRunner({ herbId, activity, attempt, mode, onDone, onRetry, onExit }: RunnerProps) {
  const slots = useMemo<Slot[] | null>(
    () => buildChallenge(herbId, activity, attempt, { includeUnreviewed: mode === 'preview' }),
    [herbId, activity, attempt, mode],
  );
  const [answers, setAnswers] = useState<number[][]>([]);
  const [step, setStep] = useState<Step>({ slot: 0, which: 'primary' });
  const [chosen, setChosen] = useState<number | null>(null);
  const [secondChance, setSecondChance] = useState<number[] | null>(null);
  const [queue, setQueue] = useState<number[]>([]);
  const [finished, setFinished] = useState<SubmitResult | { ok: true; preview: true; passed: boolean; resolved: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!slots) {
    return <p className="mt-8 text-center text-violet-200">This one is not available yet.</p>;
  }

  const slot = slots[step.slot]!;
  const question = step.which === 'primary' ? slot.primary : slot.replacement!;
  const total = slots.length;
  const isTrial = activity === 'boss-trial';

  const missed = (current: number[][]) =>
    current
      .map((given, index) => (given[0] !== slots[index]!.primary.correctIndex && slots[index]!.replacement ? index : -1))
      .filter((index) => index >= 0);

  const finish = async (final: number[][]) => {
    setBusy(true);
    if (mode === 'preview') {
      const score = scoreSubmission(slots, activity, final);
      setFinished({ ok: true, preview: true, passed: Boolean(score?.passed), resolved: score?.resolved ?? 0, total });
      setBusy(false);
      return;
    }
    const result = await submitChallenge({ herbId, activity, attempt, answers: final });
    setFinished(result);
    setBusy(false);
    if (result.ok) onDone({ passed: result.passed, bossForm: result.bossForm });
  };

  const answer = (index: number) => {
    if (chosen !== null) return;
    setChosen(index);
    setAnswers((current) => {
      const next = current.map((given) => [...given]);
      if (step.which === 'primary') next[step.slot] = [index];
      else next[step.slot] = [...(next[step.slot] ?? []), index];
      return next;
    });
  };

  const next = () => {
    setChosen(null);
    const upto = step.which === 'primary' ? step.slot + 1 : queue.indexOf(step.slot) + 1;
    if (step.which === 'primary') {
      if (upto < total) return setStep({ slot: upto, which: 'primary' });
      // All first answers are in. Offer a second chance only where the rules allow one.
      const redo = hasRetry(activity) ? missed(answers) : [];
      if (redo.length > 0) {
        setQueue(redo);
        setSecondChance(redo);
        return setStep({ slot: redo[0]!, which: 'replacement' });
      }
      return void finish(answers);
    }
    if (upto < queue.length) return setStep({ slot: queue[upto]!, which: 'replacement' });
    return void finish(answers);
  };

  if (finished) {
    const passed = finished.ok ? finished.passed : false;
    const preview = finished.ok && 'preview' in finished;
    return (
      <section className="mt-4 flex flex-col items-center text-center" aria-live="polite">
        <PlantSprite herbId={herbId} alt="" stage={isTrial ? 'boss' : 'flowering'} scale={1} frozen={!passed} />
        {finished.ok ? (
          <>
            <h2 className="font-display text-3xl font-extrabold text-gold-plate">
              {passed ? 'Nicely done!' : 'So close!'}
            </h2>
            <p className="mt-2 text-lg font-bold text-violet-100">
              {finished.resolved} of {finished.total}
            </p>
            <p className="mt-1 text-sm text-violet-300">
              {passed ? 'Activity complete.' : 'Try again. Every try is a fresh set.'}
            </p>
            {preview ? <p className="mt-2 text-xs text-violet-400">Preview only. Nothing is recorded.</p> : null}
          </>
        ) : (
          <p className="text-violet-100">Could not save that. Please try again later.</p>
        )}
        <div className="mt-5 grid w-full gap-3">
          {!passed ? (
            <button type="button" onClick={onRetry} className="arcade-key holo-fill min-h-14 rounded-full px-6 text-base font-extrabold text-plum-900">
              Try again
            </button>
          ) : null}
          <button type="button" onClick={passed && preview ? () => onDone({ passed: true, bossForm: false }) : onExit} className="min-h-12 text-sm font-bold text-violet-200 underline-offset-4 hover:underline">
            {passed ? 'Back to the challenges' : 'Back'}
          </button>
        </div>
      </section>
    );
  }

  const correct = chosen === question.correctIndex;
  const secondPhase = step.which === 'replacement';

  return (
    <section className="mt-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <PlantSprite herbId={herbId} alt="" stage={isTrial ? 'boss' : 'flowering'} scale={1} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <ol className="flex gap-1.5" aria-label={`Question ${step.slot + 1} of ${total}`}>
            {slots.map((_, index) => {
              const given = answers[index];
              const done = given !== undefined;
              const right =
                done &&
                (given[0] === slots[index]!.primary.correctIndex ||
                  (given[1] !== undefined && given[1] === slots[index]!.replacement?.correctIndex));
              const current = index === step.slot;
              return (
                <li
                  key={index}
                  className={`h-3 flex-1 rounded-sm ${
                    right ? 'bg-gold-400' : done && !(secondChance?.includes(index) && step.slot !== index && given.length === 1 && secondPhase) ? 'bg-violet-500' : current ? 'bg-violet-200' : 'bg-violet-700'
                  }`}
                />
              );
            })}
          </ol>
          {secondPhase ? (
            <p className="mt-1.5 text-xs font-bold tracking-wide text-gold-300 uppercase">Second chance</p>
          ) : isTrial ? (
            <p className="mt-1.5 text-xs font-bold tracking-wide text-violet-300 uppercase">One hit allowed</p>
          ) : null}
        </div>
      </div>

      <h2 className="mt-5 text-center text-2xl leading-tight font-extrabold text-violet-50">{question.prompt}</h2>

      <QuestionView key={`${step.slot}-${step.which}`} question={question} chosen={chosen} onAnswer={answer} />

      {chosen !== null ? (
        <div className={`mt-4 rounded-lg px-4 py-3 text-center ${correct ? 'bg-gold-500/15' : 'bg-violet-800/60'}`}>
          <p className={`text-lg font-extrabold ${correct ? 'text-gold-200' : 'text-violet-100'}`}>
            {correct ? 'Nice!' : 'Not quite'}
          </p>
          <p className="mt-0.5 text-sm text-violet-100">{question.feedback}</p>
          <button
            type="button"
            disabled={busy}
            onClick={next}
            className="arcade-key holo-fill mt-3 min-h-12 w-full rounded-full px-6 text-base font-extrabold text-plum-900"
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
