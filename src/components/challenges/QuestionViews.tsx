'use client';

import { useRef, useState, type MouseEvent } from 'react';
import { assetPath } from '@/lib/asset-path';
import { BOSS_IMAGES, REGION_LABELS, pointInBox } from '@/lib/boss-images';
import { REGION_LABEL_OVERRIDES, iconFor, sceneSetFor } from '@/lib/boss-presentation';
import type { BuiltQuestion } from '@/lib/mastery-challenges';
import { resolveTap } from '@/lib/tap-select';
import { Art } from './ChallengeArt';
import { ChoiceIcon } from './ChoiceIcon';
import { HabitatScene } from './HabitatScene';
import { PhotoStage } from './PhotoStage';

/**
 * The four question formats, one screen each. Every one answers with an INDEX into
 * `question.options`, which is all the server scores:
 *
 *   pick-picture / showdown   a large preview and three labelled thumbnails (Picture Match); the
 *                             option is the image id
 *   spot-feature              one photograph; a tap or the visible list picks a region (a region id)
 *   quick-pick                a short line of text, with a small icon or a scene of a place when
 *                             the client-only presentation data has one for it
 *
 * THE PHOTOGRAPH IS THE POINT. It is shown at its own proportions and never cropped (`PhotoStage`),
 * the thumbnails letterbox rather than crop, and a screen too short to show everything scrolls
 * instead of shrinking a photograph until it cannot be read.
 *
 * Choosing is separate from answering. With `onSelect`, a tap only SELECTS, and the player may
 * change it; the screen's Check action sets `chosen`, which locks it. Without `onSelect` a tap
 * answers at once, as it used to.
 */
export interface QuestionViewProps {
  question: BuiltQuestion;
  /** The option index already chosen and locked, or null while the question is open. */
  chosen: number | null;
  onAnswer: (index: number) => void;
  /** The option picked but NOT yet confirmed, and the handler that picks it. */
  selected?: number | null;
  onSelect?: (index: number) => void;
  /**
   * Whether answering shows which option was right. True for ordinary stages, which explain each
   * answer as it is given. False in the Boss Trial, which marks only the player's own choice and
   * reveals nothing until the whole Trial is submitted.
   */
  reveal?: boolean;
}

/** A calm, flat tile for every answer, so the STATE ring is the loudest thing on it. */
const TILE = 'rounded-lg border-2 border-violet-500 bg-plum-800';

const RING = {
  picked: 'ring-4 ring-violet-200',
  right: 'ring-4 ring-gold-300 shadow-[0_0_22px_rgb(255_210_110/0.55)]',
  wrong: 'ring-4 ring-pink-accent',
  dim: 'opacity-45',
  focus: 'outline-none focus-visible:ring-4 focus-visible:ring-gold-300',
} as const;

type Mark = 'idle' | 'picked' | 'right' | 'chosen-wrong' | 'dim';

/** One rule for every format: what a choice looks like given what has happened to it. */
function markFor(
  index: number,
  { question, chosen, selected = null, reveal = true }: QuestionViewProps,
): Mark {
  if (chosen !== null) {
    if (!reveal) return index === chosen ? 'picked' : 'dim';
    if (index === question.correctIndex) return 'right';
    return index === chosen ? 'chosen-wrong' : 'dim';
  }
  return selected === index ? 'picked' : 'idle';
}

function ringOf(mark: Mark): string {
  return mark === 'picked' ? RING.picked : mark === 'right' ? RING.right : mark === 'chosen-wrong' ? RING.wrong : mark === 'dim' ? RING.dim : 'hover:border-violet-300';
}

/** The words on a tile for its state. Text, so colour is never the only signal. */
function chipOf(mark: Mark): string | null {
  return mark === 'right' ? 'Right answer' : mark === 'chosen-wrong' ? 'Not this one' : mark === 'picked' ? 'Your pick' : null;
}

function Tick() {
  return (
    <span
      aria-hidden="true"
      className="challenge-pop flex h-7 w-7 items-center justify-center rounded-full bg-gold-400 text-plum-950 shadow-[0_0_14px_rgb(255_210_110/0.6)]"
    >
      <Art name="check" className="h-4 w-4" />
    </span>
  );
}

function Chip({ text, right }: { text: string; right: boolean }) {
  return (
    <span className={`rounded-full bg-plum-950/90 px-2.5 py-0.5 text-sm font-extrabold ${right ? 'text-gold-300' : 'text-violet-100'}`}>
      {text}
    </span>
  );
}

function Photo({ id, fit = 'contain', className = '' }: { id: string; fit?: 'contain' | 'cover'; className?: string }) {
  const image = BOSS_IMAGES[id];
  if (!image?.src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetPath(image.src)}
      alt={image.alt}
      draggable={false}
      loading="eager"
      className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${className}`}
    />
  );
}

/** A photograph's width over its height, with a sensible portrait default if it is not recorded. */
function ratioOf(id: string): number {
  const image = BOSS_IMAGES[id];
  return image?.width && image.height ? image.width / image.height : 0.8;
}

/**
 * A photograph shown beside other things: as tall as asked and no taller, so a short question is
 * not stretched. `size` picks how much of the screen it may take.
 */
function Preview({ id, size = 'large' }: { id: string; size?: 'large' | 'small' }) {
  return (
    <PhotoStage ratio={ratioOf(id)} height={size === 'large' ? 'clamp(15rem, 42dvh, 26rem)' : 'clamp(15rem, 34dvh, 20rem)'}>
      <Photo id={id} />
    </PhotoStage>
  );
}

/** A small plain heading that says what the thing below it is. */
function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1.5 text-base font-bold text-violet-200">{children}</h3>;
}

/**
 * Whether a question's photograph IS the question, so its screen should use all the room it has.
 * Everything else is only as tall as its content: a short multiple-choice question stays short.
 */
export function fillsHeight(question: BuiltQuestion): boolean {
  return question.kind === 'spot-feature';
}

const LETTERS = ['A', 'B', 'C', 'D'] as const;

/**
 * PICTURE MATCH. The three pictures to choose from come first, labelled A, B and C under a plain
 * heading. Picking one shows it larger below them, labelled with its letter, so the large photograph
 * is clearly a closer look at a choice and never a fourth choice. A reference photograph that the
 * question itself shows ("this flower, what does it become?") sits above the choices under its own
 * heading and has no letter. Nothing is drawn until there is something to show: no empty panel.
 */
function PictureChoices(props: QuestionViewProps) {
  const { question, chosen, onAnswer, selected = null, onSelect } = props;
  const pick = onSelect ?? onAnswer;
  const answered = chosen !== null;
  const shown = chosen ?? selected;
  const previewId = shown !== null ? question.options[shown] : null;
  return (
    <div className="mt-3 flex flex-col gap-4">
      {question.media ? (
        <section aria-label="Reference photograph">
          <Heading>Look at this photo</Heading>
          <Preview id={question.media} size="small" />
        </section>
      ) : null}
      <section aria-label="Pictures to choose from">
        <Heading>Choose one picture</Heading>
        <ul className="grid grid-cols-3 gap-2.5">
          {question.options.map((id, index) => {
            const mark = markFor(index, props);
            const chip = chipOf(mark);
            const alt = BOSS_IMAGES[id]?.alt ?? id;
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={answered}
                  aria-pressed={selected === index}
                  onClick={() => pick(index)}
                  aria-label={`Picture ${LETTERS[index]}: ${alt}${chip ? `. ${chip}` : ''}`}
                  className={`relative block aspect-[3/4] w-full touch-manipulation overflow-hidden p-0.5 ${TILE} ${RING.focus} ${ringOf(mark)}`}
                >
                  <span className="block h-full w-full overflow-hidden rounded-md bg-plum-950">
                    <Photo id={id} />
                  </span>
                  <span aria-hidden="true" className="absolute top-1.5 left-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-plum-950/90 text-base font-extrabold text-violet-50">
                    {LETTERS[index]}
                  </span>
                  {mark === 'right' ? <span className="absolute top-1.5 right-1.5"><Tick /></span> : null}
                  {chip ? (
                    <span aria-hidden="true" className="absolute right-1 bottom-1 left-1 flex justify-center">
                      <Chip text={chip} right={mark === 'right'} />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      {previewId && shown !== null ? (
        <section aria-label="Larger view">
          <Heading>Picture {LETTERS[shown]}, larger</Heading>
          <Preview id={previewId} />
        </section>
      ) : (
        <p className="text-center text-base text-violet-200">Tap a picture to see it larger.</p>
      )}
    </div>
  );
}

/** The label for a region on THIS photograph: its own name if the general one would be wrong. */
function regionLabel(imageId: string, region: string): string {
  return REGION_LABEL_OVERRIDES[imageId]?.[region] ?? REGION_LABELS[region] ?? region;
}

type TapNote = { kind: 'ambiguous' | 'none'; at: number | null } | null;

const NOTE_TEXT = {
  ambiguous: 'Tap closer to one part, or use the list.',
  none: 'Tap a part of the plant, or use the list.',
} as const;

function SpotFeature(props: QuestionViewProps) {
  const { question, chosen, onAnswer, selected = null, onSelect, reveal = true } = props;
  const pick = onSelect ?? onAnswer;
  const box = useRef<HTMLDivElement | null>(null);
  const list = useRef<HTMLDetailsElement | null>(null);
  const [note, setNote] = useState<TapNote>(null);
  const imageId = question.media ?? '';
  const image = BOSS_IMAGES[imageId];
  const answered = chosen !== null;
  const rightId = question.options[question.correctIndex]!;
  const regions = image?.regions ?? {};

  const tap = (event: MouseEvent<HTMLDivElement>) => {
    if (answered || !box.current) return;
    const point = pointInBox(box.current.getBoundingClientRect(), event.clientX, event.clientY);
    if (!point) return;
    // Forgiving, never guessing: a near tap selects the one region it is next to, and a tap that
    // could mean two asks the player to be clearer. The reviewed regions are only ever READ.
    const outcome = resolveTap(regions, question.options, point.x, point.y);
    if (outcome.kind === 'exact' || outcome.kind === 'near') {
      const index = question.options.indexOf(outcome.region);
      if (index >= 0) {
        setNote(null);
        pick(index);
        return;
      }
    }
    setNote({ kind: outcome.kind === 'ambiguous' ? 'ambiguous' : 'none', at: selected });
  };

  if (!image?.src || !image.width || !image.height) return null;

  const zones = (id: string, className: string, key: string) =>
    (regions[id] ?? []).map((r, i) => (
      <span
        key={`${key}-${i}`}
        aria-hidden="true"
        className={`pointer-events-none absolute rounded-md ${className.includes('border-gold') ? 'border-[3px]' : ''} ${className}`}
        style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
      />
    ));
  const pickedId = selected !== null ? question.options[selected] : null;
  const chosenId = chosen !== null ? question.options[chosen] : null;

  return (
    <div className="mt-3 flex flex-1 flex-col gap-2">
      <PhotoStage ratio={image.width / image.height} boxRef={box} onBoxClick={tap} label={image.alt}>
        <Photo id={imageId} />
        {!answered && pickedId ? zones(pickedId, 'border-2 border-violet-200', 'picked') : null}
        {answered && !reveal && chosenId ? zones(chosenId, 'border-2 border-violet-200', 'locked') : null}
        {answered && reveal ? zones(rightId, 'challenge-pop border-gold-300', 'right') : null}
        {answered && reveal && chosenId && chosenId !== rightId
          ? zones(chosenId, 'border-2 border-dashed border-pink-accent', 'wrong')
          : null}
      </PhotoStage>

      {/* A message belongs to the selection it was made against: pick anything and it is gone. */}
      <p aria-live="polite" className="min-h-6 text-center text-base text-violet-200">
        {note && note.at === selected ? NOTE_TEXT[note.kind] : null}
      </p>

      {/* THE LIST ALTERNATIVE: always visible, a real disclosure, a large target. Every part is a
          button, so choosing without tapping a photograph, or with a switch or a keyboard, is just
          as complete a way to answer. */}
      <details ref={list} className="group">
        <summary
          className={`${TILE} flex min-h-12 cursor-pointer list-none items-center justify-center gap-2 px-4 text-base font-extrabold text-violet-50 select-none ${RING.focus} ${answered ? 'pointer-events-none opacity-60' : ''}`}
        >
          Use a list
          <span aria-hidden="true" className="text-gold-300 group-open:hidden">+</span>
          <span aria-hidden="true" className="hidden text-gold-300 group-open:inline">&minus;</span>
        </summary>
        <ul className="mt-2 grid grid-cols-2 gap-2" aria-label="Parts of the plant">
          {question.options.map((id, index) => {
            const mark = markFor(index, props);
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={answered}
                  aria-pressed={selected === index}
                  onClick={() => {
                    setNote(null);
                    pick(index);
                    if (list.current) list.current.open = false;
                  }}
                  className={`${TILE} flex min-h-12 w-full touch-manipulation items-center justify-center px-3 py-2 text-base font-bold text-violet-50 ${RING.focus} ${ringOf(mark)}`}
                >
                  {regionLabel(imageId, id)}
                </button>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}

/** A choice drawn as a scene of a place. Only used when EVERY option has one. */
function HabitatChoices(props: QuestionViewProps & { scenes: NonNullable<ReturnType<typeof sceneSetFor>> }) {
  const { question, chosen, onAnswer, selected = null, onSelect, scenes } = props;
  const pick = onSelect ?? onAnswer;
  const answered = chosen !== null;
  return (
    <ul className="mt-3 grid gap-2.5" aria-label="Places to choose from">
      {question.options.map((text, index) => {
        const mark = markFor(index, props);
        const chip = chipOf(mark);
        const scene = scenes[index]!;
        return (
          <li key={text}>
            <button
              type="button"
              disabled={answered}
              aria-pressed={selected === index}
              onClick={() => pick(index)}
              aria-label={`${text}${chip ? `. ${chip}` : ''}`}
              className={`relative block h-28 w-full touch-manipulation overflow-hidden p-0.5 text-left ${TILE} ${RING.focus} ${ringOf(mark)}`}
            >
              <HabitatScene ground={scene.ground} light={scene.light} className="absolute inset-0.5 h-[calc(100%-4px)] w-[calc(100%-4px)] rounded-md" />
              <span className="absolute bottom-2 left-2.5 max-w-[78%] rounded-md bg-plum-950/90 px-2.5 py-1 text-base leading-tight font-extrabold text-violet-50">
                {text}
              </span>
              {mark === 'right' ? <span className="absolute top-2 right-2"><Tick /></span> : null}
              {chip && mark !== 'right' ? (
                <span aria-hidden="true" className="absolute top-2 right-2"><Chip text={chip} right={false} /></span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function QuickPick(props: QuestionViewProps) {
  const { question, chosen, onAnswer, selected = null, onSelect } = props;
  const pick = onSelect ?? onAnswer;
  const answered = chosen !== null;
  const scenes = sceneSetFor(question.id, question.options);
  if (scenes) {
    return <HabitatChoices {...props} scenes={scenes} />;
  }
  return (
    <div className="mt-3 flex flex-col gap-3">
      {question.media ? <Preview id={question.media} size="small" /> : null}
      <ul className="grid gap-2.5" aria-label="Answers">
        {question.options.map((text, index) => {
          const mark = markFor(index, props);
          const icon = iconFor(question.id, text);
          return (
            <li key={text}>
              <button
                type="button"
                disabled={answered}
                aria-pressed={selected === index}
                onClick={() => pick(index)}
                className={`${TILE} flex min-h-16 w-full touch-manipulation items-center gap-3 px-3 py-2 text-left text-lg leading-tight font-extrabold text-violet-50 ${RING.focus} ${ringOf(mark)}`}
              >
                {icon ? (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-plum-950/70">
                    <ChoiceIcon name={icon.name} tint={icon.tint} />
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">{text}</span>
                {mark === 'right' ? <Tick /> : null}
                {mark === 'chosen-wrong' || mark === 'picked' ? <Chip text="Your pick" right={false} /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
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
