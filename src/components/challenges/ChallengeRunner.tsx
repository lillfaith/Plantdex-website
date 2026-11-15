'use client';

import { useMemo, useRef, useState } from 'react';
import { PlantSprite } from '@/components/PlantSprite';
import { revealsAnswersAtEndOnly, type ActivityId } from '@/lib/boss-form';
import { submitChallenge, type SubmitResult } from '@/lib/challenge-client';
import { START, actionFor, step, type FlowAction, type FlowEvent, type FlowState } from '@/lib/challenge-flow';
import { buildChallenge, scoreSubmission, type BuiltQuestion } from '@/lib/mastery-challenges';
import { ACTIVITY_LABELS } from './activity-labels';
import { ChallengeResultView, type ResultKind, type ReviewItem } from './ChallengeResult';
import { ChallengeShell } from './ChallengeShell';
import { FlowerProgress, type FlowerState } from './FlowerProgress';
import { QuestionView, fillsHeight } from './QuestionViews';

/**
 * ONE STAGE, ONE SCREEN AT A TIME, inside the full-screen shell.
 *
 * The flow is: for each question, pick (and change your mind if you like), check, read the
 * feedback, go on. Checking locks the answer, so there is no second go once it is revealed. After
 * the last question the whole set is submitted. A stage that is not passed is replayed WHOLE, and
 * each new attempt number draws its set from the same pool (`selectForAttempt`), so a retry mixes
 * the questions differently but some may come back.
 *
 * Ordinary stages explain each answer as it is given. The Boss Trial does not: checking SEALS the
 * answer and moves on, and answers and explanations appear on the result screen once the whole
 * Trial has been submitted (`revealsAnswersAtEndOnly`). That is presentation only; the server
 * decides the pass.
 *
 * The answers are sent exactly as `scoreSubmission` reads them: one option index per question.
 * Nothing about scoring is decided here. In `preview` (development only) the result is computed
 * locally and nothing is recorded; in `on` the server's verdict is the only one shown, and the
 * Trial's answers are shown only if that verdict arrived.
 *
 * Two callbacks, because two different things happen. `onVerdict` fires the moment a verdict
 * exists, so the hub can note a passed round even if the player leaves from the result screen.
 * `onDone` fires only when the player leaves a PASSED result, and it carries whether the server
 * recorded a Boss Form. Leaving any other way calls `onExit`.
 */
export interface RunnerProps {
  herbId: string;
  activity: ActivityId;
  attempt: number;
  mode: 'preview' | 'on';
  onVerdict?: (outcome: { passed: boolean }) => void;
  onDone: (outcome: { passed: boolean; bossForm: boolean }) => void;
  onRetry: () => void;
  onExit: () => void;
  /** The label of the next round, and how to go straight to it from a passed result. */
  nextLabel?: string;
  onContinue?: () => void;
}

type Finished =
  | SubmitResult
  | { ok: true; preview: true; passed: boolean; resolved: number; total: number };

const ACTION_LABEL: Record<FlowAction, string> = {
  choose: 'Choose an answer',
  check: 'Check answer',
  seal: 'Seal answer',
  submit: 'Submit the Trial',
  next: 'Next',
  finish: 'Finish',
  wait: 'Submitting',
};

export function ChallengeRunner({ herbId, activity, attempt, mode, onVerdict, onDone, onRetry, onExit, nextLabel, onContinue }: RunnerProps) {
  const questions = useMemo<BuiltQuestion[] | null>(
    () => buildChallenge(herbId, activity, attempt, { includeUnreviewed: mode === 'preview' }),
    [herbId, activity, attempt, mode],
  );
  const [flow, setFlow] = useState<FlowState>(START);
  const [finished, setFinished] = useState<Finished | null>(null);
  // A guard against a double tap sending the set twice before the screen has re-rendered.
  const sent = useRef(false);
  const hidden = revealsAnswersAtEndOnly(activity);
  const label = ACTIVITY_LABELS[activity];

  if (!questions) {
    return (
      <ChallengeShell
        title={label.name}
        action={{ label: 'Back', onClick: onExit }}
        onExit={onExit}
      >
        <p className="mt-8 text-center text-lg text-violet-100">This one is not available yet.</p>
      </ChallengeShell>
    );
  }

  const total = questions.length;
  const isTrial = activity === 'boss-trial';
  const question = questions[Math.min(flow.index, total - 1)]!;
  const ctx = { total, hidden, optionCount: question.options.length };

  const finish = async (final: readonly number[]) => {
    if (sent.current) return;
    sent.current = true;
    const answers = [...final];
    if (mode === 'preview') {
      const score = scoreSubmission(questions, activity, answers);
      const verdict = { ok: true as const, preview: true as const, passed: Boolean(score?.passed), resolved: score?.resolved ?? 0, total };
      setFinished(verdict);
      onVerdict?.({ passed: verdict.passed });
      return;
    }
    const result = await submitChallenge({ herbId, activity, attempt, answers });
    setFinished(result);
    // A round is noted as passed only on the SERVER's say-so. A failed call notes nothing.
    if (result.ok) onVerdict?.({ passed: result.passed });
  };

  const apply = (event: FlowEvent) => {
    const after = step(flow, event, ctx);
    if (after === flow) return;
    setFlow(after);
    if (after.phase === 'submitting') void finish(after.answers);
  };

  const leave = () => {
    if (finished && finished.ok && finished.passed) {
      // The evolution is shown only when the SERVER says a Boss Form was recorded, and only for
      // the Boss Trial. Nothing in this file decides that.
      const bossForm = !('preview' in finished) && finished.bossForm && isTrial;
      onDone({ passed: true, bossForm });
      return;
    }
    onExit();
  };

  if (finished) {
    const passed = finished.ok ? finished.passed : false;
    const preview = finished.ok && 'preview' in finished;
    // The limit screen is shown ONLY for the server's own refusal (a 429), never for any other failure.
    const kind: ResultKind = !finished.ok ? (finished.reason === 'limit' ? 'limit' : 'error') : passed ? 'complete' : 'failed';
    // For the Boss Trial this is the first time any answer or explanation is shown, and only when a
    // verdict came back.
    const review: ReviewItem[] = finished.ok
      ? questions.map((q, i) => ({ id: q.id, prompt: q.prompt, feedback: q.feedback, right: flow.answers[i] === q.correctIndex }))
      : [];
    // Passing leads straight to the next round when there is one and no Boss Form to celebrate.
    const bossFormEarned = passed && !preview && isTrial && finished.ok && 'bossForm' in finished && finished.bossForm;
    const onPrimary =
      kind === 'complete' ? (nextLabel && !bossFormEarned && onContinue ? onContinue : leave) : kind === 'failed' ? onRetry : onExit;
    return (
      <ChallengeResultView
        kind={kind}
        herbId={herbId}
        activityName={label.name}
        isTrial={isTrial}
        preview={preview}
        resolved={finished.ok ? finished.resolved : undefined}
        total={finished.ok ? finished.total : undefined}
        review={review}
        nextLabel={nextLabel && !bossFormEarned ? nextLabel : undefined}
        onPrimary={onPrimary}
        onBack={onExit}
        onExit={leave}
      />
    );
  }

  const act = actionFor(flow, ctx);
  const locked = flow.locked;
  // While the set is being sent the last answer stays on screen, so the player sees what was sent.
  const shown = flow.phase === 'submitting' ? (flow.answers[flow.index] ?? null) : locked;
  const correct = shown === question.correctIndex;
  const flowers: FlowerState[] = questions.map((q, i) => {
    const given = flow.answers[i];
    if (given === undefined) return i === flow.index ? 'current' : 'ahead';
    if (hidden) return 'held';
    return given === q.correctIndex ? 'bloom' : 'sprout';
  });

  const onAction = () => {
    if (act === 'check' || act === 'seal' || act === 'submit') apply({ type: 'check' });
    else if (act === 'next' || act === 'finish') apply({ type: 'next' });
  };

  const status =
    act === 'wait' ? (
      <span>Sending your answers.</span>
    ) : locked !== null && !hidden ? (
      <span>
        <b className={correct ? 'text-gold-200' : 'text-violet-50'}>{correct ? 'Yes. ' : 'Not quite. '}</b>
        {question.feedback}
      </span>
    ) : act === 'choose' ? (
      <span>{hidden ? 'Pick an answer. Nothing is shown until the end.' : 'Pick an answer, then check it.'}</span>
    ) : (
      <span>You can change it until you {hidden ? 'seal' : 'check'} it.</span>
    );

  return (
    <ChallengeShell
      title={label.name}
      kicker={isTrial ? 'Final challenge' : `Question ${flow.index + 1} of ${total}`}
      counter={`${Math.min(flow.index + 1, total)}/${total}`}
      progress={
        <div className="flex items-center gap-3">
          <div className="w-10 shrink-0">
            <PlantSprite herbId={herbId} alt="" stage={isTrial ? 'boss' : 'flowering'} fit />
          </div>
          <div className="min-w-0 flex-1">
            <FlowerProgress states={flowers} label={`Question ${flow.index + 1} of ${total}`} />
          </div>
        </div>
      }
      status={status}
      scrollKey={flow.index}
      action={{ label: ACTION_LABEL[act], onClick: onAction, disabled: act === 'choose' || act === 'wait' }}
      onExit={onExit}
    >
      <div className={`flex flex-col ${fillsHeight(question) ? 'min-h-full' : ''}`}>
        <h2 className="px-1 text-center text-[1.375rem] leading-tight font-extrabold text-violet-50">{question.prompt}</h2>
        <QuestionView
          key={flow.index}
          question={question}
          chosen={shown}
          selected={flow.selected}
          onSelect={(index) => apply({ type: 'select', index })}
          onAnswer={(index) => apply({ type: 'select', index })}
          reveal={!hidden}
        />
      </div>
    </ChallengeShell>
  );
}
