'use client';

import { useRef, type MouseEvent } from 'react';
import { assetPath } from '@/lib/asset-path';
import { BOSS_IMAGES, REGION_LABELS, regionAt } from '@/lib/boss-images';
import type { BuiltQuestion } from '@/lib/mastery-challenges';

/**
 * The four question formats, one screen each. Every one answers with an INDEX into
 * `question.options`, which is all the server scores:
 *
 *   pick-picture / showdown   large photographs; the option is the image id
 *   spot-feature              one photograph; a tap becomes the region under it (a region id)
 *   quick-pick                a short line of text
 *
 * After an answer the view shows what was right and stays still: the runner owns what happens
 * next. Photographs are never stretched (`object-cover` in a square) and every one has a plain
 * description. Pixel sprites are not answer images.
 */
export interface QuestionViewProps {
  question: BuiltQuestion;
  /** The option index already chosen, or null while the question is open. */
  chosen: number | null;
  onAnswer: (index: number) => void;
}

/** A drawn check mark. The repo bans the check-mark glyphs (they render as emoji on some phones). */
function Check({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  );
}

function Photo({ id, className = '' }: { id: string; className?: string }) {
  const image = BOSS_IMAGES[id];
  if (!image?.src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetPath(image.src)}
      alt={image.alt}
      draggable={false}
      loading="eager"
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

/** The picture a question shows above its answers (the puff to match, the flower that finished). */
function Media({ id }: { id: string }) {
  return (
    <div className="mx-auto mt-3 h-28 w-28 overflow-hidden rounded-md pixel-tile p-1">
      <Photo id={id} />
    </div>
  );
}

function PictureChoices({ question, chosen, onAnswer }: QuestionViewProps) {
  const cols = question.options.length === 2 ? 'grid-cols-2' : 'grid-cols-2';
  return (
    <>
      {question.media ? <Media id={question.media} /> : null}
      <ul className={`mt-4 grid ${cols} gap-3`}>
        {question.options.map((id, index) => {
          const isRight = index === question.correctIndex;
          const isChosen = chosen === index;
          const answered = chosen !== null;
          const ring = answered
            ? isRight
              ? 'ring-4 ring-gold-300'
              : isChosen
                ? 'ring-2 ring-violet-400 opacity-60'
                : 'opacity-50'
            : '';
          return (
            <li key={id} className={question.options.length === 3 && index === 2 ? 'col-span-2 mx-auto w-1/2' : ''}>
              <button
                type="button"
                disabled={answered}
                onClick={() => onAnswer(index)}
                aria-label={BOSS_IMAGES[id]?.alt ?? id}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg pixel-tile p-1 transition-transform active:scale-95 ${ring}`}
              >
                <Photo id={id} className="rounded-md" />
                {answered && isRight ? (
                  <span
                    aria-hidden="true"
                    className="challenge-pop absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gold-400 text-plum-950"
                  >
                    <Check className="h-5 w-5" />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function SpotFeature({ question, chosen, onAnswer }: QuestionViewProps) {
  const box = useRef<HTMLDivElement | null>(null);
  const imageId = question.media ?? '';
  const image = BOSS_IMAGES[imageId];
  const answered = chosen !== null;
  const rightId = question.options[question.correctIndex]!;

  const tap = (event: MouseEvent<HTMLDivElement>) => {
    if (answered || !box.current) return;
    const rect = box.current.getBoundingClientRect();
    const region = regionAt(
      imageId,
      ((event.clientX - rect.left) / rect.width) * 100,
      ((event.clientY - rect.top) / rect.height) * 100,
    );
    // A tap on no region answers nothing, so a stray tap is never a wrong answer.
    if (region === null) return;
    const index = question.options.indexOf(region);
    if (index >= 0) onAnswer(index);
  };

  if (!image?.src) return null;
  return (
    <div className="mt-4">
      <div
        ref={box}
        onClick={tap}
        className="pixel-tile relative mx-auto w-full max-w-sm cursor-pointer overflow-hidden rounded-lg p-1"
        style={{ aspectRatio: `${image.width} / ${image.height}`, maxHeight: '40vh' }}
      >
        <Photo id={imageId} className="rounded-md" />
        {answered
          ? (image.regions?.[rightId] ?? []).map((r, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="challenge-pop pointer-events-none absolute rounded-md border-[3px] border-gold-300 bg-gold-300/20"
                style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
              />
            ))
          : null}
      </div>
      {/* The same choices for keyboards and screen readers: a tap needs no pointer. */}
      <ul className="sr-only">
        {question.options.map((id, index) => (
          <li key={id}>
            <button type="button" disabled={answered} onClick={() => onAnswer(index)}>
              {REGION_LABELS[id] ?? id}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuickPick({ question, chosen, onAnswer }: QuestionViewProps) {
  const answered = chosen !== null;
  return (
    <ul className="mt-5 grid gap-3">
      {question.options.map((text, index) => {
        const isRight = index === question.correctIndex;
        const isChosen = chosen === index;
        const state = answered
          ? isRight
            ? 'ring-4 ring-gold-300'
            : isChosen
              ? 'ring-2 ring-violet-400 opacity-60'
              : 'opacity-50'
          : '';
        return (
          <li key={text}>
            <button
              type="button"
              disabled={answered}
              onClick={() => onAnswer(index)}
              className={`pixel-tile flex min-h-14 w-full items-center justify-between rounded-lg px-4 py-3 text-left text-base font-bold text-violet-50 transition-transform active:scale-[0.98] ${state}`}
            >
              {text}
              {answered && isRight ? (
                <span aria-hidden="true" className="challenge-pop text-gold-300">
                  <Check className="h-6 w-6" />
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function QuestionView(props: QuestionViewProps) {
  switch (props.question.kind) {
    case 'pick-picture':
    case 'showdown':
      return <PictureChoices {...props} />;
    case 'spot-feature':
      return <SpotFeature {...props} />;
    case 'quick-pick':
      return <QuickPick {...props} />;
  }
}
