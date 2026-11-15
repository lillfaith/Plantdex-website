'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PlantSprite } from '@/components/PlantSprite';
import { revealsAnswersAtEndOnly, type ActivityId } from '@/lib/boss-form';
import { submitChallenge, type SubmitResult } from '@/lib/challenge-client';
import { buildChallenge, scoreSubmission, type BuiltQuestion } from '@/lib/mastery-challenges';
import { ChallengeFrame } from './ChallengeFrame';
import { FlowerProgress, type FlowerState } from './FlowerProgress';
import { QuestionView } from './QuestionViews';
import { Sparkles } from './Sparkles';

/**
 * ONE STAGE, ONE SCREEN AT A TIME.
 *
 * The flow is: every question once, then the result. There is no second chance on a question. A
 * stage that is not passed is replayed WHOLE, and each new attempt number draws a different set from
 * the pool (`selectForAttempt`), so a retry is never the same set twice running.
 *
 * Ordinary stages explain each answer as it is given. The Boss Trial does not: it marks only the
 * player's own choice, and answers and explanations appear on the result screen once the whole Trial
 * has been submitted (`revealsAnswersAtEndOnly`). That is presentation only; the server decides the
 * pass.
 *
 * The answers are sent exactly as `scoreSubmission` reads them: one option index per question.
 * Nothing about scoring is decided here. In `preview` (development only) the result is computed
 * locally and nothing is recorded; in `on` the server's verdict is the only one shown, and the
 * Trial's answers are shown only if that verdict arrived.
 */
export interface RunnerProps {
  herbId: string;
  activity: ActivityId;
  attempt: number;
  mode: 'preview' | 'on';
  onDone: (outcome: { passed: boolean; bossForm: boolean }) => void;
  onRetry: () => void;
  onExit: () => void;
}

type Finished =
  | SubmitResult
  | { ok: true; preview: true; passed: boolean; resolved: number; total: number };

export function ChallengeRunner({ herbId, activity, attempt, mode, onDone, onRetry, onExit }: RunnerProps) {
  const questions = useMemo<BuiltQuestion[] | null>(
    () => buildChallenge(herbId, activity, attempt, { includeUnreviewed: mode === 'preview' }),
    [herbId, activity, attempt, mode],
  );
  const [answers, setAnswers] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [busy, setBusy] = useState(false);
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const hidden = revealsAnswersAtEndOnly(activity);

  // After an answer, bring the feedback and its Next button into view: on a small phone the photos
  // can fill the screen, and the one action that matters must never sit below the fold.
  useEffect(() => {
    if (chosen === null) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' });
  }, [chosen]);

  if (!questions) {
    return <p className="mt-8 text-center text-violet-200">This one is not available yet.</p>;
  }

  const question = questions[index]!;
  const total = questions.length;
  const isTrial = activity === 'boss-trial';
  const last = index === total - 1;

  const finish = async (final: number[]) => {
    setBusy(true);
    if (mode === 'preview') {
      const score = scoreSubmission(questions, activity, final);
      setFinished({ ok: true, preview: true, passed: Boolean(score?.passed), resolved: score?.resolved ?? 0, total });
      setBusy(false);
      return;
    }
    const result = await submitChallenge({ herbId, activity, attempt, answers: final });
    setFinished(result);
    setBusy(false);
    // The evolution is shown only when the SERVER says a Boss Form was recorded, and only for
    // the Boss Trial. Nothing in this file decides that.
    if (result.ok) onDone({ passed: result.passed, bossForm: result.bossForm && activity === 'boss-trial' });
  };

  const answer = (choice: number) => {
    if (chosen !== null) return;
    setChosen(choice);
    setAnswers((current) => [...current.slice(0, index), choice]);
  };

  const next = () => {
    const final = answers.slice(0, total);
    setChosen(null);
    if (!last) return setIndex(index + 1);
    return void finish(final);
  };

  if (finished) {
    const passed = finished.ok ? finished.passed : false;
    const preview = finished.ok && 'preview' in finished;
    const limited = !finished.ok && finished.reason === 'limit';
    // Every question with the answer the player gave and its explanation. For the Boss Trial this
    // is the first time any of it is shown, and only when a verdict came back.
    const review = finished.ok ? questions : [];
    return (
      <section className="mt-4 flex flex-col items-center text-center" aria-live="polite">
        <div className="relative">
          <PlantSprite herbId={herbId} alt="" stage={isTrial ? 'boss' : 'flowering'} scale={1} frozen={!passed} />
          {passed ? <Sparkles count={8} radius={70} /> : null}
        </div>
        {finished.ok ? (
          <>
            <h2 className="font-display text-3xl font-extrabold text-gold-plate">
              {passed ? 'Nicely done!' : 'So close!'}
            </h2>
            <p className="mt-2 text-lg font-bold text-violet-100">
              {finished.resolved} of {finished.total}
            </p>
            <p className="mt-1 text-sm text-violet-300">
              {passed
                ? 'Stage complete. It stays complete.'
                : 'Try again. Each try mixes the questions differently.'}
            </p>
            {preview ? <p className="mt-2 text-xs text-violet-300">Preview only. Nothing is recorded.</p> : null}
          </>
        ) : limited ? (
          <p className="mt-2 text-violet-100">That is all the tries for today. Come back tomorrow.</p>
        ) : (
          <p className="mt-2 text-violet-100">Could not save that. Please try again later.</p>
        )}

        {review.length > 0 ? (
          <ol className="mt-5 grid w-full gap-2.5 text-left" aria-label="Your answers and explanations">
            {review.map((q, i) => {
              const right = answers[i] === q.correctIndex;
              return (
                <li key={q.id} className="rounded-lg bg-violet-800/50 px-3 py-2.5">
                  <p className="text-sm font-extrabold text-violet-50">
                    {right ? 'Right' : 'Not this time'}: {q.prompt}
                  </p>
                  <p className="mt-0.5 text-sm text-violet-100">{q.feedback}</p>
                </li>
              );
            })}
          </ol>
        ) : null}

        <div className="mt-5 grid w-full gap-3">
          {!passed && !limited ? (
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
  const flowers: FlowerState[] = questions.map((q, i) => {
    const given = answers[i];
    if (given === undefined) return i === index ? 'current' : 'ahead';
    if (hidden) return 'held';
    return given === q.correctIndex ? 'bloom' : 'sprout';
  });

  return (
    <section className="mt-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="w-12 shrink-0">
          <PlantSprite herbId={herbId} alt="" stage={isTrial ? 'boss' : 'flowering'} fit />
        </div>
        <div className="min-w-0 flex-1">
          <FlowerProgress states={flowers} label={`Question ${index + 1} of ${total}`} />
          {isTrial ? (
            <p className="mt-1 text-xs font-bold tracking-wide text-violet-300 uppercase">
              Final challenge: answers come at the end
            </p>
          ) : null}
        </div>
      </div>

      <ChallengeFrame className="mt-4">
        <h2 className="px-1 text-center text-xl leading-tight font-extrabold text-violet-50">{question.prompt}</h2>
        <QuestionView key={index} question={question} chosen={chosen} onAnswer={answer} reveal={!hidden} />
      </ChallengeFrame>

      {chosen !== null ? (
        <div
          ref={feedbackRef}
          className={`relative mt-3 scroll-mb-24 rounded-lg px-4 py-3 text-center ${
            hidden ? 'bg-violet-800/60' : correct ? 'bg-gold-500/15 shadow-[0_0_22px_rgb(255_210_110/0.3)]' : 'bg-violet-800/60'
          }`}
        >
          {hidden ? (
            <p className="text-sm text-violet-100">Answer locked in.</p>
          ) : (
            <>
              <p className={`relative text-lg font-extrabold ${correct ? 'text-gold-200' : 'text-violet-100'}`}>
                {correct ? 'Nice!' : 'Good try'}
                {correct ? <Sparkles count={6} radius={52} /> : null}
              </p>
              <p className="mt-0.5 text-sm text-violet-100">{question.feedback}</p>
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={next}
            className="arcade-key holo-fill mt-3 min-h-12 w-full rounded-full px-6 text-base font-extrabold text-plum-900"
          >
            {last ? (hidden ? 'Submit the Trial' : 'Finish') : 'Next'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
