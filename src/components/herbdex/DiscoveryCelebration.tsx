'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { DiscoveryResult, Herb } from '@/lib/types';
import { getAchievement } from '@/lib/achievements';
import { progressFromXp } from '@/lib/progression';
import { tracksMastery } from '@/lib/mastery';
import { assetPath } from '@/lib/asset-path';
import { MysteryCard } from './MysteryCard';
import { achievementIcon } from '../icons/achievement-icons';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { CountUp } from './CountUp';

/**
 * The discovery celebration: reveal, reward, progress.
 *
 * Sequenced deliberately rather than firing everything at once — the card flips first,
 * then the XP lands, then the bar moves. Each beat is short; the whole thing is under a
 * second and a half, and a single `revealed` flag drives all of it so reduced-motion
 * users simply start at the end state.
 *
 * `xpAfter` is the player's total *after* the discovery, so the value before it is
 * `xpAfter - xpAwarded`. That is what makes the bar and the number animate from the real
 * previous state rather than from zero.
 */
export interface CelebrationNext {
  /** Where the primary control goes. */
  href: string;
  /** Its label, e.g. "Open its card". */
  label: string;
  /** The dismiss control's label — "Keep looking around" is the card page's own phrasing. */
  dismissLabel: string;
  /** Fired on navigation, for the caller's own analytics goal. */
  onNavigate?: () => void;
}

/**
 * How long the card is held FACE DOWN before it turns.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BEAT WAS ALREADY HERE AND WAS TOO SHORT TO SEE.
 *
 * `revealed` has always started false, so the mystery back has always been the first thing
 * painted — but it flipped 60ms later, which is about four frames. The structure said "you
 * found something, then here it is"; the timing delivered both at once, and the card appeared
 * to arrive face up.
 *
 * 520ms is the pause. Long enough to register a face-down card and understand that something
 * is about to be turned over, short enough that it reads as suspense rather than as the app
 * being slow. It sits in front of the 900ms turn, so the whole reveal lands inside the ~1.5s
 * this moment has to spend.
 *
 * REDUCED MOTION GETS THE OLD FOUR FRAMES, AND THAT IS NOT A DETAIL. This hold is a
 * setTimeout, not a CSS transition — the global `prefers-reduced-motion` rule in globals.css
 * collapses the flip's DURATION and cannot touch a JS timer. Left alone, somebody who asked
 * for less motion would get MORE waiting than everybody else: half a second staring at a
 * static card back, followed by an instant snap with no turn to explain it. Suspense is
 * built out of motion, so where there is no motion there is nothing to build it from.
 *
 * Read at fire time rather than from a hook: it is one boolean consulted once per
 * celebration, and `CountUp` already reads the same query the same way.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const FACE_DOWN_HOLD_MS = 520;

function revealDelay(): number {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The original next-frame delay, which is only there so the browser paints the back
  // before the transition starts.
  return reduced ? 60 : FACE_DOWN_HOLD_MS;
}

export function DiscoveryCelebration({
  herb,
  result,
  xpAfter,
  onClose,
  next,
}: {
  herb: Herb;
  result: DiscoveryResult;
  xpAfter: number;
  onClose: () => void;
  /**
   * THE FOOTER IS THE ONLY PART OF THIS COMPONENT THAT BELONGS TO ONE PAGE.
   *
   * Everything above — the flip, the counting XP, the level bar, the achievement rows — is
   * the discovery itself and is identical wherever a discovery happens. The footer is not:
   * its default primary control scrolls to `#card-mastery`, an element that exists on a
   * plant page and NOWHERE ELSE. Mounting this on /scan unchanged would ship the loudest
   * button on the dialog pointing at nothing, which is precisely the class of bug this file
   * already records fixing twice (a stage offered by a surface the reducer refuses).
   *
   * So a caller on another screen passes its own onward step. Omitted, the card page's
   * behaviour is byte-for-byte what it was. The reward body stays ONE implementation, which
   * is the whole reason this is a prop rather than a second celebration component free to
   * drift from this one.
   */
  next?: CelebrationNext;
}) {
  const [revealed, setRevealed] = useState(false);

  const xpBefore = xpAfter - result.xpAwarded;
  const before = progressFromXp(xpBefore);
  const after = progressFromXp(xpAfter);
  const leveledUp = after.level > before.level;

  // On a level-up the bar would otherwise animate *backwards* (say 92% -> 8%). Fill the
  // old level to 100% first, then swap to the new level and fill from empty.
  const [barPhase, setBarPhase] = useState<'start' | 'filling' | 'newLevel'>('start');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setRevealed(true), revealDelay()));
    timers.push(setTimeout(() => setBarPhase('filling'), 700));
    if (leveledUp) timers.push(setTimeout(() => setBarPhase('newLevel'), 1500));
    return () => timers.forEach(clearTimeout);
  }, [leveledUp]);

  const shownLevel = leveledUp && barPhase !== 'newLevel' ? before : after;
  const barPct =
    barPhase === 'start'
      ? before.fraction * 100
      : leveledUp
        ? barPhase === 'filling'
          ? 100
          : after.fraction * 100
        : after.fraction * 100;

  return (
    <div className="text-center">
      <p className="text-xs font-bold tracking-[0.2em] text-violet-300 uppercase">
        New discovery
      </p>
      <h2 id="celebrate-title" className="font-display mt-1 text-2xl font-bold text-gold-plate">
        {herb.commonName}
      </h2>
      <p className="font-botanical text-sm text-violet-300 italic">{herb.scientificName}</p>

      {/*
        The reveal, and the one place the deck's own object-ness has to be felt: the card
        the player was looking at a second ago was face down, and it turns over to become
        the printed card. Mystery back → real front, one object, ~560ms.

        The faces are absolutely positioned, so an invisible sizer establishes the box —
        the same structure as `CardFlip`, for the same reason.
      */}
      <div className="flip-scene mx-auto mt-4 w-44">
        {/*
          A FULL REVOLUTION HERE, A HALF TURN EVERYWHERE ELSE. `flip-card-spin` takes the card
          round once before it lands face up (540deg), which is the flourish this one moment
          earns; the plant page's `CardFlip` is a toggle and keeps the ordinary 180deg turn.
          See the utility in globals.css for why it is scoped rather than global.
        */}
        <div className={`flip-card flip-card-spin ${revealed ? 'flip-card-revealed' : ''}`}>
          <div className="aspect-[356/576] w-full" />

          <div className="flip-face shadow-card">
            {/*
              THE SILHOUETTE PERFORMS DURING THE HOLD, AND THAT IS WHAT THE HOLD IS FOR.

              Frozen — which is every other face-down card in the app — the half second
              before the turn is a still picture, and a still picture held for half a second
              is indistinguishable from a dialog that has not finished loading. Moving, the
              same pause says there is a creature under there: the plant's own trademark
              gesture, in shadow, with no name and no artwork given away.

              It is the SAME sprite the card already showed, not a second element laid over
              it, so nothing about the composition, the number or the keyhole moves. Left
              playing through the turn rather than snapped back at `revealed`: freezing
              resets to frame 0, and the reset would land exactly as the card starts
              rotating, with the front face square to the viewer. Once past a quarter turn
              the face is `backface-visibility: hidden` and there is nothing to paint.
            */}
            <MysteryCard herb={herb} animated />
            <span className="flip-shade flip-shade-front" aria-hidden="true" />
          </div>

          <div className="flip-face flip-face-back animate-sheen shadow-card-lift">
            <Image
              src={assetPath(herb.image)}
              alt={`Plantdex card ${herb.cardNumber}: ${herb.commonName} (${herb.scientificName})`}
              width={800}
              height={1295}
              priority
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* One polite announcement covering the whole outcome, rather than three. */}
      <p className="sr-only" role="status">
        {herb.commonName} discovered. {result.xpAwarded} XP earned. Level {after.level},{' '}
        {after.levelName}.
        {leveledUp ? ` Level up from ${before.level}.` : ''}
        {result.newAchievementIds.length > 0
          ? ` Achievement unlocked: ${result.newAchievementIds
              .map((id) => getAchievement(id)?.name ?? id)
              .join(', ')}.`
          : ''}
      </p>

      <p aria-hidden="true" className="mt-4 text-2xl font-bold text-gold-400 tabular-nums">
        <CountUp from={0} to={result.xpAwarded} prefix="+" durationMs={700} /> XP
      </p>

      {/* Updated progress */}
      <div className="panel mt-4 p-3 text-left">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-sm font-bold text-gold-300">
            Level {shownLevel.level} — {shownLevel.levelName}
          </p>
          <p aria-hidden="true" className="text-xs font-semibold text-violet-200 tabular-nums">
            <CountUp from={xpBefore} to={xpAfter} durationMs={900} />
            {after.nextLevelXp !== null && (
              <span className="text-violet-400"> / {after.nextLevelXp.toLocaleString()}</span>
            )}{' '}
            XP
          </p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-plum-950/70 ring-1 ring-violet-700/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-500 to-pink-accent transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${barPct}%` }}
          />
        </div>
        {leveledUp && (
          <p className="animate-rise-in mt-2 text-xs font-bold text-gold-400">
            <PlantdexIcon name="sprout" className="text-xs" /> Level up — you are now {after.levelName}
          </p>
        )}
      </div>

      {result.newAchievementIds.length > 0 && (
        <ul className="mt-3 space-y-2">
          {result.newAchievementIds.map((id) => {
            const achievement = getAchievement(id);
            if (!achievement) return null;
            return (
              <li
                key={id}
                className="animate-toast-in rounded-xl border border-gold-500/60 bg-gold-500/15 px-3 py-2 text-left"
              >
                <p className="text-sm font-bold text-gold-300">
                  <PlantdexIcon name={achievementIcon(achievement.id)} className="text-sm" /> Achievement unlocked —{' '}
                  {achievement.name}
                </p>
                <p className="text-xs text-violet-200">{achievement.description}</p>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        THE NEXT STEP, NOT JUST A DISMISS.

        Discovering is stage 1 of 3, and the control that advances to stage 2 — "Take the
        card check" — sits about 83% of the way down a long profile page. So the celebration
        used to end the loop rather than continue it: congratulations, then a closed dialog
        and no visible next action.

        This closes the dialog and scrolls the mastery track into view. Deliberately a
        SCROLL and not an "open the check for me": the check is its own <dialog>, and opening
        one from inside another that is mid-close is exactly the kind of coupling that has
        already broken twice here. Reading the card before answering questions about it is
        also the intended order.
      */}
      {/*
        AND ONLY WHERE STAGE 2 EXISTS. A Field Card can be discovered — finding one outdoors
        is a real find — but learning and mastery are the printed deck's track, so this
        button would have scrolled to a panel that (rightly) no longer draws itself, from a
        dialog whose loudest control promised a stage the reducer refuses. Where there is no
        next stage, dismissing IS the next step, so it becomes the primary control rather
        than sitting as a quiet second choice under a button that does nothing.
      */}
      {/*
        A CALLER-SUPPLIED ONWARD STEP, WHERE THERE IS ONE. On /scan the next thing to do is
        open the card just collected, so the primary is a real navigation rather than a
        scroll — there is no mastery track on that page to scroll to. A `<Link>` and not a
        close-then-push: the dialog goes away with the page, and nothing has to sequence a
        route change against a closing modal.
      */}
      {next ? (
        <>
          <Link
            href={next.href}
            onClick={next.onNavigate}
            className="mt-5 flex min-h-11 w-full items-center justify-center rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep transition-transform hover:bg-gold-400 active:scale-[0.99] motion-reduce:active:scale-100"
          >
            {next.label} &rarr;
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 min-h-11 w-full rounded-full border border-violet-600 px-5 text-sm font-semibold text-violet-200 transition-colors hover:bg-plum-600"
          >
            {next.dismissLabel}
          </button>
        </>
      ) : (
        <>
          {tracksMastery(herb.id) && (
            <button
              type="button"
              onClick={() => {
                onClose();
                // After the dialog has actually closed, or the scroll happens under a modal.
                requestAnimationFrame(() => {
                  document
                    .getElementById('card-mastery')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
              className="mt-5 min-h-11 w-full rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep transition-transform hover:bg-gold-400 active:scale-[0.99] motion-reduce:active:scale-100"
            >
              Learn this card &rarr;
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={
              tracksMastery(herb.id)
                ? 'mt-2 min-h-11 w-full rounded-full border border-violet-600 px-5 text-sm font-semibold text-violet-200 transition-colors hover:bg-plum-600'
                : 'mt-5 min-h-11 w-full rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep transition-transform hover:bg-gold-400 active:scale-[0.99] motion-reduce:active:scale-100'
            }
          >
            Keep looking around
          </button>
        </>
      )}
    </div>
  );
}
