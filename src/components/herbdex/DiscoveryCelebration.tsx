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
import { PlantSprite } from '../PlantSprite';
import { hasSprite } from '@/lib/plant-sprites';
import { achievementIcon } from '../icons/achievement-icons';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { CountUp } from './CountUp';
import { haptic } from '@/lib/haptics';
import { FIELD_CARDS_NAME, slotsCrossedBetween } from '@/lib/field-cards';
import { FIELD_FRAMES } from '@/lib/field-frames';
import { consumeJustUnlocked } from '@/lib/unlocked-field-cards';

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

/**
 * THE SPRITE REVEAL, BEFORE THE CARD TURNS.
 *
 * The card in the grid is a grey silhouette; here the mystery is paid off. The face-down card
 * steps aside for a beat, the greyed sprite is left alone on the dark, then it lights up into
 * its real colours and plays its own animation. Only then does the card return and take its
 * ordinary spin. All of it is timers and a one-shot filter transition, so Skip and reduced
 * motion jump straight past it to the card, exactly as the old sequence began.
 */
type Intro = 'card' | 'grey' | 'lit' | 'done';
const INTRO_GREY_AT = 250;
const INTRO_LIT_AT = 450;
const INTRO_DONE_AT = 1450;
const AFTER_INTRO_FLIP_MS = 150;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function revealDelay(hasIntro: boolean): number {
  // The original next-frame delay, which is only there so the browser paints the back
  // before the transition starts. With the sprite reveal first, the card returns face down at
  // INTRO_DONE_AT and turns a moment later.
  if (hasIntro) return INTRO_DONE_AT + AFTER_INTRO_FLIP_MS;
  return prefersReducedMotion() ? 60 : FACE_DOWN_HOLD_MS;
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
  // The sprite reveal plays only when there is a sprite to show and motion is welcome.
  const hasIntro = hasSprite(herb.id) && !prefersReducedMotion();
  const [intro, setIntro] = useState<Intro>(hasIntro ? 'card' : 'done');

  /**
   * SKIP: LAND THE WHOLE SEQUENCE NOW.
   *
   * The reveal is about a second and a half, which is right the first time and wrong the
   * twentieth — and a player who has just found three plants on one walk sees it three
   * times. So every beat is skippable, and skipping means arriving at the END STATE rather
   * than closing the dialog: the XP, the level bar and the achievement rows are the
   * information somebody came for, and a skip that threw them away would make the control
   * a punishment for being in a hurry.
   *
   * IT IS NOT HIDDEN UNDER REDUCED MOTION, which is worth stating because it looks like it
   * should be. That preference collapses CSS durations; the bar phases here are setTimeout
   * and are untouched by it — `FACE_DOWN_HOLD_MS` above records the same asymmetry. So a
   * reduced-motion player still waits out the 700ms and 1500ms beats, and is arguably the
   * player who most wants a way past them.
   */
  const [skipped, setSkipped] = useState(false);

  const xpBefore = xpAfter - result.xpAwarded;
  const before = progressFromXp(xpBefore);
  const after = progressFromXp(xpAfter);
  const leveledUp = after.level > before.level;

  /**
   * FIELD CARDS UNLOCKED BY THIS DISCOVERY, DERIVED RATHER THAN SUBSCRIBED TO.
   *
   * This closes a real gap. `recordUnlocks` runs in `HerbdexProvider`, which wraps every
   * page, so a crossing was RECORDED wherever it happened — but `justUnlocked` is read by
   * `FieldCardReward`, mounted on /herbdex/research alone. So crossing 600 XP by confirming
   * a find on /scan granted the card in silence, and the next visit to Field Research
   * announced a card earned on a different walk as though it had just been won. The
   * provider's own comment says this was fixed by moving the recording; only half of it
   * moved. The announcement never did.
   *
   * `slotsCrossedBetween` is a set difference over XP, which is why there is nothing to
   * invalidate: a repeat discovery awards nothing so the difference is empty, and a card
   * earned last week sits below `xpBefore`. See the argument in `field-cards.ts`.
   */
  const unlockedNow = slotsCrossedBetween(xpBefore, xpAfter);

  /**
   * IS THIS THE PLAYER'S VERY FIRST DISCOVERY? DERIVED FROM THE AWARD, NOT COUNTED.
   *
   * `first-find` is a pure predicate — `discoveredCount(state) >= 1` — so it appears in
   * `newAchievementIds` exactly once in an account's life, on the discovery that took the
   * count from nothing to one. That makes it a better answer than counting discoveries here
   * would be: the reducer has already decided, idempotently, and a repeat or a re-render
   * cannot put it back in the list.
   *
   * So there is no new state, no flag and no "has seen the first-run celebration" record.
   * The one-time-ness is a property of the achievement, which was already write-once and
   * already synced.
   */
  const firstDiscovery = result.newAchievementIds.includes('first-find');

  /*
   * FIRST FIND LEADS THE ROWS WHEN IT IS THE FIRST FIND.
   *
   * A first discovery can legitimately unlock several achievements at once — a habitat badge,
   * a season badge — and the reducer returns them in its own order, so `first-find` could
   * appear third in a list of four on the one occasion it is the headline. Moved to the front
   * for that one discovery only; every other celebration keeps the reducer's order untouched.
   *
   * A copy, not a sort in place: `result` belongs to the caller and the reducer's arrays are
   * read elsewhere.
   */
  const achievementIds = firstDiscovery
    ? [...result.newAchievementIds].sort((left, right) =>
        left === 'first-find' ? -1 : right === 'first-find' ? 1 : 0,
      )
    : result.newAchievementIds;

  /*
   * The frame that first find unlocks. Read from `FIELD_FRAMES` rather than named here,
   * because the cosmetic's own `condition` sentence is what the cabinet prints and a second
   * copy of it in this dialog would be free to promise something else.
   *
   * IT IS A PROFILE COSMETIC AND TOUCHES NO CARD'S RARITY. Frames are chosen in the profile
   * and drawn around an avatar; `rarity` is printed on the card itself and is read by the
   * aura, the badge and the foil. Nothing here goes near it.
   */
  const firstFrame = firstDiscovery
    ? (FIELD_FRAMES.find((entry) => entry.id === 'amber-ring') ?? null)
    : null;

  /*
   * AND TELL THE RESEARCH PANEL IT HAS BEEN SAID. Without this, a player who saw the card
   * here and then walked over to /herbdex/research in the same session would be told again
   * — one event, two announcements, which is the thing `justUnlocked` exists to prevent.
   * Only the pending reveal is consumed; the written record is untouched, so the card stays
   * in the quiet `Unlocked` row and the profile's held strip for good.
   *
   * DEFERRED BY A TIMEOUT, AND THAT IS NOT A HACK. React runs a CHILD's effects before its
   * parent's, and the parent here is the provider whose effect calls `recordUnlocks` and
   * sets the flag. Consuming on mount would therefore run first and find nothing, and the
   * flag would be set immediately afterwards. A zero timeout lands after the whole commit's
   * effects, which is exactly the ordering this needs. If it somehow still ran early the
   * consume is a no-op and the behaviour degrades to what it is today.
   */
  const unlockedKey = unlockedNow.map((slot) => slot.ordinal).join(',');

  useEffect(() => {
    if (!unlockedKey) return;
    const ordinals = unlockedKey.split(',').map(Number);
    const timer = setTimeout(() => consumeJustUnlocked(ordinals), 0);
    return () => clearTimeout(timer);
  }, [unlockedKey]);

  // On a level-up the bar would otherwise animate *backwards* (say 92% -> 8%). Fill the
  // old level to 100% first, then swap to the new level and fill from empty.
  const [barPhase, setBarPhase] = useState<'start' | 'filling' | 'newLevel'>('start');

  useEffect(() => {
    // Skipping has already written every end state, so re-arming the timers would animate
    // the sequence a second time over the top of its own conclusion.
    if (skipped) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    /*
       HAPTICS RIDE THE BEATS THAT ALREADY EXIST — the turn, and the level-up — rather than
       adding any of their own. Two in a celebration is the ceiling: a third would make the
       phone the loudest thing in the room at the moment somebody is trying to read a card.

       `haptic()` is a no-op wherever there is no engine, which includes iOS Safari; see
       `src/lib/haptics.ts` for why that is an abstraction and not a `navigator.vibrate`
       call. Nothing here branches on the result, because there is nothing a UI should do
       differently because a phone cannot buzz.

       Deliberately NOT fired on skip: somebody who asked to cut the sequence short has not
       asked to be buzzed twice in the same instant as it collapses.
    */
    const flipAt = revealDelay(hasIntro);
    if (hasIntro) {
      timers.push(setTimeout(() => setIntro('grey'), INTRO_GREY_AT));
      timers.push(setTimeout(() => setIntro('lit'), INTRO_LIT_AT));
      timers.push(setTimeout(() => setIntro('done'), INTRO_DONE_AT));
    }
    timers.push(
      setTimeout(() => {
        setRevealed(true);
        haptic('tap');
      }, flipAt),
    );
    // The XP beats keep their old spacing from the turn.
    timers.push(setTimeout(() => setBarPhase('filling'), flipAt + 180));
    if (leveledUp) {
      timers.push(
        setTimeout(() => {
          setBarPhase('newLevel');
          haptic('success');
        }, flipAt + 980),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [leveledUp, skipped, hasIntro]);

  /*
   * The final beat, named once. `barPhase` settles on 'newLevel' only when the level
   * actually changed — otherwise 'filling' IS the end — so this cannot be written as a
   * single constant and must not be guessed at in two places.
   */
  const finalBarPhase = leveledUp ? 'newLevel' : 'filling';
  const settled = revealed && barPhase === finalBarPhase;

  function skipToEnd() {
    setSkipped(true);
    setIntro('done');
    setRevealed(true);
    setBarPhase(finalBarPhase);
  }

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
      {/*
        IN THE FLOW AND RIGHT-ALIGNED, not absolutely positioned in the corner. This body is
        mounted inside a <dialog> owned by the CALLER — two of them, on two routes — and an
        absolute control here would be placed against whatever padding and close affordance
        that particular dialog happens to have. A flow row cannot collide with either.

        IT DISAPPEARS WHEN THERE IS NOTHING LEFT TO SKIP, rather than sitting there inert:
        once the sequence has settled the button would do nothing, and a control that does
        nothing teaches a player not to trust the next one. It is replaced by an equally
        tall spacer so the card below does not jump up at the moment the reward lands.
      */}
      <div className="flex h-6 justify-end">
        {!settled && (
          <button
            type="button"
            onClick={skipToEnd}
            className="rounded px-1.5 text-xs font-bold tracking-[0.1em] text-violet-300 uppercase transition-colors hover:text-violet-100 focus-visible:text-violet-100"
          >
            Skip
            {/* The button says "Skip"; a screen reader is told what is skipped and that
                nothing is lost by it, which the four letters cannot carry on their own. */}
            <span className="sr-only"> the reveal animation and show the rewards now</span>
          </button>
        )}
      </div>

      {/*
        THE FIRST DISCOVERY GETS ITS OWN HEADLINE, IN THE SAME DIALOG.

        Not a second modal, and not a bigger one: the brief's rule against stacking
        full-screen rewards is also just right, because a player who has found their first
        plant has had ONE moment. What marks it out is the line, the gold bloom behind the
        card, and the two reward rows below — all inside the sequence that already exists,
        and all still governed by the Skip control and the reduced-motion rules.
      */}
      {firstDiscovery ? (
        <p className="font-display text-xl leading-tight font-bold text-gold-plate">
          Your Herbalist Journey Begins!
        </p>
      ) : (
        <p className="text-xs font-bold tracking-[0.2em] text-violet-300 uppercase">
          New discovery
        </p>
      )}
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
      <div className="flip-scene relative mx-auto mt-4 w-44">
        {/* The sprite alone on the dark: grey at first, then lit into its colours and playing
            its own animation. Decorative; the plant is named in the heading above. */}
        {hasIntro && (intro === 'grey' || intro === 'lit') && (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 flex items-center justify-center"
          >
            <span
              className={`absolute inset-4 rounded-full bg-gold-400/25 blur-2xl transition-opacity duration-1000 ${
                intro === 'lit' ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <span
              className={`relative block w-full transition-[filter,opacity] duration-1000 ease-out ${
                intro === 'lit'
                  ? 'opacity-100 [filter:none]'
                  : 'opacity-60 [filter:brightness(0)_saturate(0)]'
              }`}
            >
              <PlantSprite herbId={herb.id} alt="" fit />
            </span>
          </div>
        )}
        {/*
          A FULL REVOLUTION HERE, A HALF TURN EVERYWHERE ELSE. `flip-card-spin` takes the card
          round once before it lands face up (540deg), which is the flourish this one moment
          earns; the plant page's `CardFlip` is a toggle and keeps the ordinary 180deg turn.
          See the utility in globals.css for why it is scoped rather than global.
        */}
        {/* `flip-card-instant` zeroes the 900ms turn. Setting `revealed` alone would start
            the spin rather than skip it, so the card would still take nearly a second to
            arrive — the one beat a skip most obviously has to cut. */}
        <div
          className={`flip-card flip-card-spin ${skipped ? 'flip-card-instant' : ''} ${
            revealed ? 'flip-card-revealed' : ''
          } ${
            intro === 'grey' || intro === 'lit' ? 'opacity-0' : 'opacity-100'
          } transition-opacity duration-200 motion-reduce:transition-none`}
        >
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
        {/* Folded into the one existing announcement rather than given a second live
            region, which would interrupt the first mid-sentence. */}
        {firstFrame ? ` Card frame unlocked: ${firstFrame.name}.` : ''}
        {unlockedNow.length > 0
          ? ` ${FIELD_CARDS_NAME} unlocked: ${unlockedNow
              .map((slot) => slot.card?.commonName ?? `Field Card ${slot.ordinal}`)
              .join(', ')}.`
          : ''}
      </p>

      <p aria-hidden="true" className="mt-4 text-2xl font-bold text-gold-400 tabular-nums">
        <CountUp from={0} to={result.xpAwarded} prefix="+" durationMs={skipped ? 0 : 700} /> XP
      </p>

      {/* Updated progress */}
      <div className="panel mt-4 p-3 text-left">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-sm font-bold text-gold-300">
            Level {shownLevel.level} — {shownLevel.levelName}
          </p>
          <p aria-hidden="true" className="text-xs font-semibold text-violet-200 tabular-nums">
            <CountUp from={xpBefore} to={xpAfter} durationMs={skipped ? 0 : 900} />
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

      {achievementIds.length > 0 && (
        <ul className="mt-3 space-y-2">
          {achievementIds.map((id) => {
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
        THE FIELD CARD REWARD, INSIDE THIS SEQUENCE RATHER THAN ON TOP OF IT.

        No second dialog. The brief's own rule — do not stack full-screen reward popups — is
        the reason this is a row in the celebration beside the achievements, and it is also
        just correct: a player who crosses a threshold by finding a plant has had ONE
        moment, not two, and two modals would make them dismiss the same event twice.

        TWO THRESHOLDS AT ONCE IS A LIST, NOT A QUEUE. 600 and 1,200 XP can both fall inside
        one gain, and `slotsCrossedBetween` returns both; they render as two rows in one
        block. That matches the store's own rule, which treats crossing two thresholds in one
        go as a single event announcing both.

        It borrows the achievements' own treatment deliberately — same gold border, same
        `animate-toast-in` — because these are two kinds of the same thing (a reward that is
        not a discovery) and giving the newer one louder styling would say it mattered more.

        A SLOT WITH NO CARD IS A REAL STATE and is named by ordinal. All nine are drawn
        today, so nothing renders this branch; a tenth would start here, and inventing a
        species name to fill the gap is the one thing this repo may never do.
      */}
      {unlockedNow.length > 0 && (
        <ul className="mt-3 space-y-2">
          {unlockedNow.map((slot) => (
            <li
              key={slot.ordinal}
              className="animate-toast-in flex items-center gap-3 rounded-xl border border-gold-500/60 bg-gold-500/15 px-3 py-2 text-left"
            >
              {slot.card && (
                <span className="card-frame block w-12 shrink-0 overflow-hidden rounded-lg shadow-card">
                  <Image
                    src={assetPath(slot.card.thumb)}
                    alt=""
                    width={400}
                    height={648}
                    className="h-full w-full object-cover"
                  />
                </span>
              )}
              <span className="min-w-0">
                <p className="text-sm font-bold text-gold-300">
                  <PlantdexIcon name="mastered" className="text-sm" /> {FIELD_CARDS_NAME}{' '}
                  unlocked — {slot.card?.commonName ?? `Field Card ${slot.ordinal}`}
                </p>
                {/* Earned with XP, not found outdoors — the profile's own phrasing. Those
                    are two different records and the dialog must not blur them, least of
                    all in the same breath as a real discovery. */}
                <p className="text-xs text-violet-200">
                  Earned with XP, not found outdoors.
                </p>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/*
        THE CARD FRAME THE FIRST FIND UNLOCKS.

        The badge is already announced by the achievement rows above — `first-find` arrives in
        `newAchievementIds` like any other — so this adds only the cosmetic, which has no row
        of its own anywhere else in the app. The swatch is the frame's REAL `ring` classes, so
        what the player sees here is what the profile will draw.
      */}
      {firstFrame && (
        <div className="animate-toast-in mt-3 flex items-center gap-3 rounded-xl border border-gold-500/60 bg-gold-500/15 px-3 py-2 text-left">
          <span aria-hidden="true" className={`h-8 w-8 shrink-0 rounded-full ${firstFrame.ring}`} />
          <span className="min-w-0">
            <p className="text-sm font-bold text-gold-300">
              Card frame unlocked — {firstFrame.name}
            </p>
            {/* A profile cosmetic. It changes nothing about the plant or its rarity. */}
            <p className="text-xs text-violet-200">
              Wear it on your profile. It changes no card&rsquo;s rarity.
            </p>
          </span>
        </div>
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
