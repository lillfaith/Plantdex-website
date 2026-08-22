'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { Herb } from '@/lib/types';
import { buildKnowledgeCheck, MIN_QUESTIONS } from '@/lib/knowledge-check';
import { XP_FOR_LEARNING } from '@/lib/progression';
import { useHerbdex } from '@/state/HerbdexProvider';

/**
 * The card check — the second stage of mastery.
 *
 * Open-book by design. The card is on the same page and the player is encouraged to read
 * it; this is a prompt to actually look at what they own, not an exam. Getting one wrong
 * costs nothing but a retry, and the answer is shown immediately along with where on the
 * card it is printed, so a wrong answer teaches instead of punishing.
 *
 * MUST STAY MOUNTED ACROSS THE PASS. Passing the check moves the card from "discovered"
 * to "learned", which changes what the mastery track renders — so this component is
 * rendered unconditionally and hides only its trigger. Mounting it inside the
 * stage-specific branch destroys the <dialog> at the exact moment it is showing the
 * result, which is the same trap the discovery celebration falls into (see HerbDetail).
 */
export function KnowledgeCheck({
  herb,
  /** Hides the button that opens the check, without unmounting the dialog. */
  showTrigger = true,
}: {
  herb: Herb;
  showTrigger?: boolean;
}) {
  const { markLearned } = useHerbdex();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const questions = useMemo(() => buildKnowledgeCheck(herb), [herb]);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);

  const restart = useCallback(() => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
    setXpAwarded(0);
  }, []);

  const open = useCallback(() => {
    restart();
    dialogRef.current?.showModal();
  }, [restart]);

  const question = questions[index];
  const total = questions.length;
  const passed = finished && score === total;

  const choose = useCallback(
    (option: number) => {
      if (picked !== null || !question) return;
      setPicked(option);
      if (option === question.answerIndex) setScore((current) => current + 1);
    },
    [picked, question],
  );

  const advance = useCallback(() => {
    if (index + 1 < total) {
      setIndex(index + 1);
      setPicked(null);
      return;
    }

    setFinished(true);
    // Answering and advancing are separate clicks, so `score` already includes the last
    // answer by the time this runs.
    if (score === total) {
      const outcome = markLearned(herb);
      setXpAwarded(outcome.xpAwarded);
    }
  }, [index, total, score, markLearned, herb]);

  if (questions.length < MIN_QUESTIONS) {
    // A card that cannot produce a real check is not one the player can fail to learn.
    return showTrigger ? (
      <p className="text-xs text-violet-400">
        This card does not carry enough printed detail for a knowledge check yet.
      </p>
    ) : null;
  }

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          onClick={open}
          className="min-h-11 w-full rounded-full border border-gold-500/60 bg-gold-500/12 px-5 text-sm font-bold text-gold-300 transition-colors hover:bg-gold-500/20"
        >
          Take the card check
          <span className="ml-1.5 text-xs font-extrabold opacity-70">+{XP_FOR_LEARNING} XP</span>
        </button>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="check-title"
        className="panel m-auto max-h-[90dvh] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto p-5 text-violet-100 backdrop:bg-violet-deep/85 backdrop:backdrop-blur-sm"
      >
        <h2 id="check-title" className="font-display text-lg font-bold text-gold-plate">
          {finished ? (passed ? 'Card learned' : 'Not quite yet') : `Card check — ${herb.commonName}`}
        </h2>

        {!finished && question && (
          <>
            <p className="mt-1 text-xs text-violet-400 tabular-nums">
              Question {index + 1} of {total}
            </p>
            <p className="mt-3 text-sm font-semibold text-violet-100">{question.prompt}</p>

            <ul className="mt-3 space-y-2">
              {question.options.map((option, optionIndex) => {
                const isAnswer = optionIndex === question.answerIndex;
                const isPicked = optionIndex === picked;
                const revealed = picked !== null;

                let tone = 'border-violet-600 bg-violet-900/50 text-violet-100 hover:bg-violet-800';
                if (revealed && isAnswer) {
                  tone = 'border-gold-500 bg-gold-500/15 text-gold-300';
                } else if (revealed && isPicked) {
                  tone = 'border-pink-accent bg-pink-accent/15 text-violet-100';
                } else if (revealed) {
                  tone = 'border-violet-700 bg-violet-900/40 text-violet-400';
                }

                return (
                  <li key={option}>
                    <button
                      type="button"
                      onClick={() => choose(optionIndex)}
                      disabled={revealed}
                      className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-4 py-2 text-left text-sm font-semibold transition-colors disabled:cursor-default ${tone}`}
                    >
                      <span className="flex-1">{option}</span>
                      {revealed && isAnswer && <span aria-hidden="true">✓</span>}
                      {revealed && isPicked && !isAnswer && <span aria-hidden="true">✕</span>}
                    </button>
                  </li>
                );
              })}
            </ul>

            <p aria-live="polite" className="mt-3 min-h-10 text-xs text-violet-300">
              {picked === null
                ? ''
                : picked === question.answerIndex
                  ? `Correct — it's printed in ${question.where}.`
                  : `Not this time. The answer is printed in ${question.where}.`}
            </p>

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="min-h-11 rounded-full border border-violet-500 px-4 text-sm font-semibold text-violet-200 hover:bg-violet-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={advance}
                disabled={picked === null}
                className="min-h-11 rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400 disabled:opacity-40"
              >
                {index + 1 < total ? 'Next question' : 'Finish'}
              </button>
            </div>
          </>
        )}

        {finished && (
          <>
            <p className="mt-3 text-sm text-violet-200">
              {passed ? (
                <>
                  You got all {total} right. <strong className="text-gold-300">{herb.commonName}</strong>{' '}
                  is now marked <strong className="text-gold-300">Learned</strong> in your Herbdex,
                  and it has grown in your garden.
                </>
              ) : (
                <>
                  {score} of {total} right. Have another read of the card — everything the check
                  asks about is printed on it — then try again.
                </>
              )}
            </p>

            {passed && xpAwarded > 0 && (
              <p className="font-display mt-3 text-2xl font-extrabold text-gold-plate tabular-nums">
                +{xpAwarded} XP
              </p>
            )}

            <p className="mt-3 text-xs text-violet-400">
              Learning a card means you know what it says. It is not a statement that any plant
              is safe to eat, drink, or apply.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              {!passed && (
                <button
                  type="button"
                  onClick={restart}
                  className="min-h-11 rounded-full border border-violet-500 px-4 text-sm font-semibold text-violet-200 hover:bg-violet-800"
                >
                  Try again
                </button>
              )}
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="min-h-11 rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400"
              >
                {passed ? 'Continue' : 'Back to the card'}
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
