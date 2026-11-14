'use client';

import { useRef, type MouseEvent } from 'react';
import { assetPath } from '@/lib/asset-path';
import { BOSS_IMAGES, REGION_LABELS, pointInBox, regionAt } from '@/lib/boss-images';
import type { BuiltQuestion } from '@/lib/mastery-challenges';
import { Art } from './ChallengeArt';

/**
 * The four question formats, one screen each. Every one answers with an INDEX into
 * `question.options`, which is all the server scores:
 *
 *   pick-picture / showdown   large photographs; the option is the image id
 *   spot-feature              one photograph; a tap becomes the region under it (a region id)
 *   quick-pick                a short line of text
 *
 * THE PHOTOGRAPH IS THE POINT, so the chrome around it is thin. Pictures are shown in a 4:5
 * tile (most field photographs are portrait) and never stretched. The tap photograph is sized
 * from the viewport HEIGHT as well as its width, so it keeps its own aspect ratio on every
 * screen instead of being clipped, and the tap is measured against the picture itself: a
 * region is a percentage of the image, so it lands in the same place at 320px and at 430px.
 */
export interface QuestionViewProps {
  question: BuiltQuestion;
  /** The option index already chosen, or null while the question is open. */
  chosen: number | null;
  onAnswer: (index: number) => void;
}

/** The tallest the tap photograph may be, as a share of the viewport's height. */
const TAP_PHOTO_MAX_HEIGHT = '52dvh';

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
    <div className="mx-auto mt-2 h-24 w-24 overflow-hidden rounded pixel-tile p-[3px]">
      <Photo id={id} />
    </div>
  );
}

function PictureChoices({ question, chosen, onAnswer }: QuestionViewProps) {
  const answered = chosen !== null;
  const three = question.options.length === 3;
  return (
    <>
      {question.media ? <Media id={question.media} /> : null}
      <ul className="mt-3 grid grid-cols-2 gap-2.5">
        {question.options.map((id, index) => {
          const isRight = index === question.correctIndex;
          const isChosen = chosen === index;
          const state = answered
            ? isRight
              ? 'ring-4 ring-gold-300 shadow-[0_0_22px_rgb(255_210_110/0.55)]'
              : isChosen
                ? 'ring-2 ring-violet-300 opacity-70'
                : 'opacity-55'
            : 'hover:brightness-110';
          return (
            <li key={id} className={three && index === 2 ? 'col-span-2 mx-auto w-[calc(50%-0.3rem)]' : ''}>
              <button
                type="button"
                disabled={answered}
                onClick={() => onAnswer(index)}
                aria-label={BOSS_IMAGES[id]?.alt ?? id}
                className={`pixel-tile relative block aspect-[4/5] w-full touch-manipulation overflow-hidden rounded-md p-[3px] outline-none transition-transform active:scale-95 focus-visible:ring-4 focus-visible:ring-gold-300 ${state}`}
              >
                <Photo id={id} className="rounded-[3px]" />
                {answered && isRight ? (
                  <span
                    aria-hidden="true"
                    className="challenge-pop absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gold-400 text-plum-950"
                  >
                    <Art name="check" className="h-5 w-5" />
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
    const point = pointInBox(box.current.getBoundingClientRect(), event.clientX, event.clientY);
    if (!point) return;
    const region = regionAt(imageId, point.x, point.y);
    // A tap on no region answers nothing, so a stray tap is never a wrong answer.
    if (region === null) return;
    const index = question.options.indexOf(region);
    if (index >= 0) onAnswer(index);
  };

  if (!image?.src || !image.width || !image.height) return null;
  const ratio = image.width / image.height;
  return (
    <div className="mt-3">
      {/* Width comes from BOTH the screen's width and its height, so the photograph is never
          squeezed into a shorter box and cropped: its aspect ratio is its own, and the tap
          regions (percentages of the picture) stay where the plant is. */}
      <div
        className="pixel-tile mx-auto rounded-md p-[3px]"
        style={{ width: `min(100%, calc(${TAP_PHOTO_MAX_HEIGHT} * ${ratio.toFixed(4)}))` }}
      >
        <div
          ref={box}
          onClick={tap}
          className="relative cursor-pointer touch-manipulation overflow-hidden rounded-[3px]"
          style={{ aspectRatio: `${image.width} / ${image.height}` }}
        >
          <Photo id={imageId} />
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
      </div>
      {/* The same choices for keyboards and screen readers. Hidden until one is focused, then
          shown as ordinary buttons, so a keyboard user can always see where they are. */}
      <ul className="sr-only focus-within:not-sr-only focus-within:mt-2 focus-within:grid focus-within:grid-cols-2 focus-within:gap-2">
        {question.options.map((id, index) => (
          <li key={id}>
            <button
              type="button"
              disabled={answered}
              onClick={() => onAnswer(index)}
              className="pixel-tile min-h-11 w-full rounded-md px-3 py-2 text-sm font-bold text-violet-50 outline-none focus-visible:ring-4 focus-visible:ring-gold-300"
            >
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
    <ul className="mt-4 grid gap-3">
      {question.options.map((text, index) => {
        const isRight = index === question.correctIndex;
        const isChosen = chosen === index;
        const state = answered
          ? isRight
            ? 'ring-4 ring-gold-300 shadow-[0_0_22px_rgb(255_210_110/0.45)]'
            : isChosen
              ? 'ring-2 ring-violet-300 opacity-80'
              : 'opacity-70'
          : '';
        return (
          <li key={text}>
            <button
              type="button"
              disabled={answered}
              onClick={() => onAnswer(index)}
              className={`pixel-tile flex min-h-14 w-full touch-manipulation items-center justify-between rounded-lg px-4 py-3 text-left text-base font-bold text-violet-50 outline-none transition-transform active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-gold-300 ${state}`}
            >
              {text}
              {answered && isRight ? (
                <span aria-hidden="true" className="challenge-pop text-gold-300">
                  <Art name="check" className="h-6 w-6" />
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
