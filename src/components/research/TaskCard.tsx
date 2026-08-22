'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getHerb } from '@/lib/deck';
import { assetPath } from '@/lib/asset-path';
import { xpForTask, type TaskProgress } from '@/lib/research';
import { useHerbdex } from '@/state/HerbdexProvider';

/**
 * One Field Research task.
 *
 * Always shows the cards it is about. A research system that rendered as generic progress
 * bars would pull attention away from the deck, which is the thing this is meant to send
 * people back to — so the artwork is the body of the card, not decoration on it.
 *
 * Undiscovered cards appear here as the same blurred silhouette the Herbdex grid uses, so
 * a challenge can name what you are looking for without spoiling the reveal.
 */
export function TaskCard({ progress }: { progress: TaskProgress }) {
  const { isDiscovered } = useHerbdex();
  const { task, steps, done, completedAt } = progress;
  const pct = progress.target > 0 ? Math.round((progress.current / progress.target) * 100) : 0;

  // A long challenge shows a strip of its cards; a daily shows the single card it names.
  const cards = task.herbIds
    .map((id) => getHerb(id))
    .filter((herb): herb is NonNullable<typeof herb> => Boolean(herb))
    .slice(0, task.kind === 'daily' ? 1 : 8);

  return (
    <li
      className={`panel overflow-hidden p-4 ${
        done ? 'border-gold-500/60 bg-gold-500/[0.07]' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {cards.length === 1 && cards[0] && (
          <Link
            href={`/herbdex/${cards[0].id}`}
            className="shrink-0"
            aria-label={`Open card ${cards[0].cardNumber}`}
          >
            <Image
              src={assetPath(cards[0].thumb)}
              alt=""
              aria-hidden="true"
              width={356}
              height={576}
              className={`h-24 w-[3.7rem] rounded-md object-cover ${
                isDiscovered(cards[0].id)
                  ? ''
                  : 'blur-[2.5px] brightness-[0.62] saturate-0'
              }`}
            />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="font-display text-base font-bold text-gold-plate">{task.title}</h3>
            <span
              className={`shrink-0 text-xs font-extrabold tabular-nums ${
                done ? 'text-gold-300' : 'text-violet-300'
              }`}
            >
              {done ? '✓ ' : '+'}
              {xpForTask(task)} XP
            </span>
          </div>

          {/* Descriptions are written for a task you have not done yet ("this card is
              still a silhouette"), so a finished one would be stating something false.
              The ticked steps and the completion date say everything needed instead. */}
          {!done && (
            <p className="mt-1 text-xs leading-relaxed text-violet-300">{task.description}</p>
          )}

          <ul className="mt-3 space-y-1.5">
            {steps.map(({ step, current, target, done: stepDone }) => (
              <li key={step.id} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden="true"
                  className={stepDone ? 'text-gold-300' : 'text-violet-500'}
                >
                  {stepDone ? '☑' : '☐'}
                </span>
                <span className={stepDone ? 'text-violet-200 line-through' : 'text-violet-200'}>
                  {step.label}
                </span>
                {target > 1 && (
                  <span className="ml-auto shrink-0 text-[0.68rem] text-violet-400 tabular-nums">
                    {current} / {target}
                  </span>
                )}
                <span className="sr-only">
                  {stepDone ? ' — done' : ` — ${current} of ${target}`}
                </span>
              </li>
            ))}
          </ul>

          {steps.length > 1 && (
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-900"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${task.title}: ${pct}% complete`}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                  done ? 'bg-gold-500' : 'bg-cyan-accent'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          {done && completedAt && (
            <p className="mt-2 text-[0.68rem] text-gold-300">
              Completed{' '}
              <time dateTime={completedAt}>
                {new Date(completedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </p>
          )}
        </div>
      </div>

      {/* A challenge's own cards, so the deck stays the visible subject. */}
      {cards.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {cards.map((herb) => {
            const found = isDiscovered(herb.id);
            return (
              <li key={herb.id}>
                <Link
                  href={`/herbdex/${herb.id}`}
                  title={found ? herb.commonName : `Card #${herb.cardNumber}`}
                  className="block"
                >
                  <Image
                    src={assetPath(herb.thumb)}
                    alt={found ? herb.commonName : `Card ${herb.cardNumber}, not discovered`}
                    width={356}
                    height={576}
                    className={`h-14 w-[2.2rem] rounded object-cover transition-transform hover:scale-105 ${
                      found ? '' : 'blur-[2px] brightness-[0.6] saturate-0'
                    }`}
                  />
                </Link>
              </li>
            );
          })}
          {task.herbIds.length > cards.length && (
            <li className="self-center text-[0.68rem] text-violet-400">
              +{task.herbIds.length - cards.length} more
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
