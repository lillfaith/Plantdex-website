'use client';

import { useCallback, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { assetPath } from '@/lib/asset-path';
import { ringTransform, signedOffset } from '@/lib/card-ring';
import { PlantSprite } from '../PlantSprite';
import { RarityBadge } from '../herbdex/RarityBadge';
import { EYEBROW } from '../ui/accents';
import type { Herb } from '@/lib/types';

/**
 * THE LANDING PAGE'S TURNTABLE OF CARDS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS REPLACED, TWICE.
 *
 * First a two-by-four grid of thumbnails — accurate, and it read as a catalogue on the page
 * that has to make somebody want to collect these. Then a FIXED FAN: one card held out, four
 * in four fixed slots, and clicking one SWAPPED the two. That looked right in a screenshot
 * and was wrong in the hand: a swap is two cards teleporting past each other, so the deck had
 * no continuity between states and the card you tapped did not appear to travel anywhere.
 *
 * It is a ring now. Every card sits at an angle on one circle, its position derived from how
 * far it is from the front; choosing a card ROTATES the whole ring until that card is at the
 * front, and every other card slides round with it. Nothing swaps, nothing teleports, and the
 * same five cards are on screen the whole time.
 *
 * THE POSITION IS DERIVED FROM ONE NUMBER, which is what makes the rotation free. There is no
 * per-card state and no animation bookkeeping: `signedOffset` turns (card index, selected
 * index) into a position on the ring from -2 to +2, every card renders at the transform that
 * offset implies, and a CSS transition on the wrapper does the travelling. Changing `selected`
 * is the entire interaction.
 *
 * FOUR WAYS TO TURN IT, because a carousel reachable only by tapping a half-hidden card is a
 * carousel most people never discover: tap a card, drag or swipe the ring, press the arrow
 * keys, or use the two step buttons underneath. All four call the same `rotate`.
 *
 * ONE CARD IS A LINK AND THE REST ARE BUTTONS, and the wrapper is what keeps that from
 * breaking the animation. Tapping the front card should open its plant; tapping any other
 * should bring it forward — two different actions, so two different elements. But swapping a
 * `<button>` for a `<Link>` REMOUNTS it, and a remounted element has no previous transform to
 * transition from, so the card arriving at the front would snap while the others glided. The
 * `<li>` carries the transform and never changes type; only its contents swap.
 *
 * THE CREATURE AND THE TRAITS FOLLOW THE FRONT CARD. `PlantSprite` takes the herb id and
 * every species in the deck has authored art for all three growth stages, so the plant
 * standing in front of the ring changes with the selection for free. The traits are the
 * deck's own printed Healing Traits, under the SAME non-claim framing sentence every plant
 * page carries — copied deliberately rather than reworded, because two phrasings of one
 * caveat are free to disagree.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT THIS COSTS. Five 400px thumbnails, about 21KB each, all `loading="lazy"` — the whole
 * section sits below the fold on a phone, so none of them competes with the hero for the
 * first paint. Every card is in the DOM at all times, which is what lets the ring rotate
 * rather than re-render, and the only things that animate are `transform` and `opacity`.
 * There is no scroll listener, no observer and no timer anywhere in here.
 */

/*
 * THE RING'S GEOMETRY LIVES IN `@/lib/card-ring`, and only the geometry does. It is the one
 * part of this component with a right answer — the wrap-around in particular, where a card
 * has to travel the SHORT way round the deck — so it is pure, exported and swept by
 * `card-ring.test.ts` over every seat and every selection. Everything left in this file is
 * markup and interaction.
 */

/** How many traits are dealt. Three is the brief; the cards print between three and six. */
const TRAITS_SHOWN = 3;

/** Milliseconds between one trait appearing and the next. */
const TRAIT_STAGGER = 130;

/** A drag shorter than this is a tap on whatever is under the finger, not a swipe. */
const SWIPE_THRESHOLD = 36;

export function CardShowcase({ cards }: { cards: readonly Herb[] }) {
  const [selected, setSelected] = useState(0);
  const traitsId = useId();
  const dragFrom = useRef<number | null>(null);

  const count = cards.length;
  const featured = cards[((selected % count) + count) % count];

  /**
   * Turn the ring by `step` places.
   *
   * WRAPPED HERE RATHER THAN AT EVERY CALL SITE, so "next" from the last card is the first
   * card and the four entry points cannot disagree about what the end of the deck does.
   */
  const rotate = useCallback(
    (step: number) => {
      setSelected((current) => (((current + step) % count) + count) % count);
    },
    [count],
  );

  /*
   * DRAG AND SWIPE, ON POINTER EVENTS RATHER THAN TOUCH ONES. One pair of handlers covers a
   * finger, a stylus and a mouse, which is also what lets a desktop visitor throw the deck
   * sideways instead of hunting for the small buttons.
   *
   * The threshold is what keeps this from stealing taps: under 36px the gesture never reaches
   * `rotate`, so the click lands on whatever card is underneath and behaves exactly as a tap.
   * Nothing calls `preventDefault`, so a vertical drag still scrolls the page — this reads the
   * horizontal distance and ignores everything else.
   *
   * EVERY CARD IMAGE CARRIES `draggable={false}`, AND THE SWIPE DOES NOT WORK WITHOUT IT.
   * An `<img>` is natively draggable, so a MOUSE drag that starts on one begins a file drag:
   * the browser fires `pointercancel`, this handler dutifully forgets where the gesture
   * started, and `pointerup` never rotates anything. It cost nothing on a phone — touch does
   * not start a native image drag — so the failure was desktop-only and completely silent,
   * with the keyboard and the step buttons still working perfectly. Caught by driving the
   * drag in a real browser rather than by reading the code.
   */
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    dragFrom.current = event.clientX;
  }, []);

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const from = dragFrom.current;
      dragFrom.current = null;
      if (from === null) return;
      const travelled = event.clientX - from;
      if (Math.abs(travelled) < SWIPE_THRESHOLD) return;
      // Drag left, the deck comes forward from the right: the cards follow the finger.
      rotate(travelled < 0 ? 1 : -1);
    },
    [rotate],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        rotate(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        rotate(-1);
      }
    },
    [rotate],
  );

  if (!featured) return null;

  const traits = featured.back.healingTraits.slice(0, TRAITS_SHOWN);

  return (
    <div
      role="group"
      aria-label="Cards from the deck"
      onKeyDown={onKeyDown}
      /*
        `--ring-r` is the radius and `--card-w` the width of the card at the front; every other
        size in here is derived from one or the other, so the whole ring resizes on two numbers.
        At 390px the outermost card's far edge lands inside the page gutter; at `sm` and up
        there is room for a wider circle.
      */
      className="[--card-w:9.5rem] [--ring-r:7.5rem] sm:[--card-w:12rem] sm:[--ring-r:13rem]"
    >
      {/*
        `select-none` IS PART OF THE DRAG, NOT TIDYING. Without it a mouse drag across the
        ring selects the alt text and the page ends up with a blue smear over the deck.

        `touch-pan-y` is the other half: it tells the browser it owns VERTICAL gestures here
        and we own horizontal ones, so a swipe arrives as pointer events instead of being
        swallowed as a pan — while a finger dragged up or down still scrolls the page, which
        is why nothing in here calls `preventDefault`.
      */}
      <div
        className="relative mx-auto h-72 w-full max-w-xl touch-pan-y select-none sm:h-[22rem]"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragFrom.current = null;
        }}
        /*
          AND THE ANCHOR IS DRAGGABLE TOO, which `draggable={false}` on the images does not
          cover: the front card is a `<Link>`, and a browser lets you drag a link as a URL.
          So the first fix moved the failure rather than removing it — a swipe starting on
          the front card still began a native drag, still fired `pointercancel`, and still
          rotated nothing. Refusing `dragstart` at the stage covers every source inside it,
          including whatever gets added here later.
        */
        onDragStart={(event) => event.preventDefault()}
      >
        <ul>
          {cards.map((card, index) => {
            const offset = signedOffset(index, selected, count);
            const isFront = offset === 0;
            const depth = Math.abs(offset);
            return (
              /*
                THE WRAPPER OWNS THE TRANSFORM AND NEVER CHANGES TYPE. The element inside it
                swaps between a link and a button as the card reaches or leaves the front, and
                a swap is a remount — with the transform on the inner element, the card
                arriving at the front would have no previous value to transition from and would
                snap into place while the other four glided.
              */
              <li
                key={card.id}
                style={{ transform: ringTransform(offset), zIndex: 20 - depth }}
                className="absolute top-1/2 left-1/2 w-[var(--card-w)] transition-transform duration-500 ease-out"
              >
                {isFront ? (
                  /*
                    THE FRONT CARD IS THE WAY IN TO ITS PLANT. It is also the only one that
                    drifts and the only one with a halo: both say "this is the card you are
                    looking at", and putting them on a card you cannot reach would be
                    decoration pointing at nothing.
                  */
                  <div className="showcase-drift relative">
                    <span
                      aria-hidden="true"
                      className="showcase-halo absolute -inset-6 -z-10 rounded-[3rem] bg-gold-500/20 blur-2xl"
                    />
                    <Link
                      href={`/herbdex/${card.id}`}
                      className="card-frame card-frame-lg block overflow-hidden rounded-[var(--radius-card)] shadow-card-lift"
                    >
                      <Image
                        src={assetPath(card.thumb)}
                        alt={`Plantdex card ${card.cardNumber}: ${card.commonName} (${card.scientificName})`}
                        width={178}
                        height={288}
                        loading="lazy"
                        draggable={false}
                        className="w-full"
                      />
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelected(index)}
                    /*
                      The accessible name is the ACTION, not the card: "Red Clover" alone would
                      read as a link to it, which is what the front card is. Deliberately NOT
                      `aria-pressed` — the one card that would be pressed is a link rather than
                      a member of this group, and a toggle group whose selected member is not
                      in the group is worse than no toggle at all. What is at the front is
                      announced by the name and traits below the ring instead.
                    */
                    aria-label={`Show card ${card.cardNumber}, ${card.commonName}`}
                    className="card-frame block w-full overflow-hidden rounded-xl shadow-card transition-[filter] duration-300 hover:brightness-110"
                  >
                    <Image
                      src={assetPath(card.thumb)}
                      alt=""
                      aria-hidden="true"
                      width={178}
                      height={288}
                      loading="lazy"
                      draggable={false}
                      className="w-full"
                    />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {/*
          THE CREATURE, STANDING IN FRONT OF THE RING.

          Offset from the FRONT CARD's own width rather than from the ring's radius, because
          the two scale at different rates: anchored to the radius it drifted a long way out
          on desktop and crowded the card on a phone.

          0.46 STRADDLES THE FRONT CARD'S LEFT EDGE, and that is the whole of the placement.
          At 0.62 the creature cleared the front card entirely and landed on the card BEHIND
          it — against a second piece of busy photographic artwork, where a 20px pixel sprite
          simply disappears. Here its right half sits on the front card's plain purple footer,
          which is the only quiet surface in the whole ring, and its left half breaks the
          card's outline. That is what makes it read as standing in FRONT of the deck rather
          than as being part of it.

          `bottom-5` is the cards' own baseline: the front card is 21px shorter than the stage
          at both breakpoints, so this stands the creature on the same line as the deck rather
          than below it. It deliberately does NOT drift with the card — the card is being held
          up, the plant is standing on the ground.

          `aria-hidden`: it is the front card's own species, which the card beside it and the
          name below it both state already.
        */}
        <span
          aria-hidden="true"
          style={{ transform: 'translateX(calc(-50% - var(--card-w) * 0.46))' }}
          className="absolute bottom-4 left-1/2 z-30 block w-20 sm:w-28"
        >
          <span className="absolute inset-x-[8%] -bottom-1 -z-10 block h-5 rounded-[50%] bg-band-leaf/35 blur-md sm:h-7" />
          <PlantSprite
            key={featured.id}
            herbId={featured.id}
            alt=""
            fit
            className="w-full drop-shadow-[0_6px_16px_rgba(23,16,28,0.6)]"
          />
        </span>
      </div>

      {/*
        WHAT IS AT THE FRONT, AND WHAT THE CARD SAYS ABOUT IT.

        Labelled by the plant's name rather than announced through a live region: a polite
        announcement of a name, a tier and three traits on every single rotation would talk
        over somebody stepping through the deck with the arrow keys.
      */}
      <div className="mx-auto mt-5 max-w-md text-center">
        <p className="font-display text-xl font-bold text-gold-plate">{featured.commonName}</p>
        <p className="font-botanical mt-0.5 text-sm text-violet-300 italic">
          {featured.scientificName}
        </p>
        <p className="mt-1.5 flex items-center justify-center gap-2 text-xs text-violet-400 tabular-nums">
          <span>#{String(featured.cardNumber).padStart(2, '0')}</span>
          <span aria-hidden="true">·</span>
          <RarityBadge rarity={featured.rarity} tone="quiet" />
        </p>

        {/*
          THE STEP CONTROLS, AND THEY ARE NOT DECORATION. A ring you can only turn by tapping
          a half-hidden card is a ring most visitors never find out turns — and the back cards
          are the smallest tap targets on the page, which is the wrong place to hide the only
          control. These are the obvious version of the same action, and they sit between the
          deck and its description because that is where somebody looking at a card decides
          they want to see another one.
        */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => rotate(-1)}
            aria-label="Previous card"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-500/60 text-lg text-gold-300 transition-colors hover:bg-plum-700"
          >
            <span aria-hidden="true">&#8249;</span>
          </button>
          {/*
            WHERE YOU ARE IN THE DECK, as dots rather than "2 of 5". The count is tiny and the
            dots say the same thing while also showing that the deck WRAPS — which is the one
            thing about a ring a number cannot tell you. `aria-hidden` because the buttons
            either side are already labelled and the card's own name is the real readout.
          */}
          <span aria-hidden="true" className="flex items-center gap-1.5">
            {cards.map((card, index) => (
              <span
                key={card.id}
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  index === selected ? 'w-5 bg-gold-400' : 'w-1.5 bg-violet-600'
                }`}
              />
            ))}
          </span>
          <button
            type="button"
            onClick={() => rotate(1)}
            aria-label="Next card"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-500/60 text-lg text-gold-300 transition-colors hover:bg-plum-700"
          >
            <span aria-hidden="true">&#8250;</span>
          </button>
        </div>

        <h3 id={traitsId} className={`mt-5 ${EYEBROW} text-gold-400`}>
          Healing Traits
        </h3>
        {/*
          THE SAME SENTENCE AS EVERY PLANT PAGE. `HealingTraitsSection` prints this directly
          under the heading it qualifies; a shorter version here would be a second phrasing of
          one caveat, free to drift from the first. It is the heading's note, not the page's
          disclaimer — `SafetyNotice` at the foot of the homepage is a separate thing and stays.
        */}
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-violet-400">
          Traditional and historical use, as printed. Not medical advice, and not a claim that
          this plant treats anything.
        </p>
        {/*
          KEYED BY HERB ID, which is the whole of the sequential reveal: a new key means React
          mounts a new list and each row's `both`-filled animation plays once, rather than the
          old rows re-rendering in place. No state, no timers, no effect.
        */}
        <ul
          key={featured.id}
          aria-labelledby={traitsId}
          className="mt-3 flex flex-wrap items-center justify-center gap-2"
        >
          {traits.map((trait, index) => (
            <li
              key={trait}
              className="showcase-trait rounded-full border border-violet-600/70 bg-plum-800/70 px-3 py-1 text-sm font-semibold text-violet-100"
              style={{ animationDelay: `${index * TRAIT_STAGGER}ms` }}
            >
              {trait}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-violet-400">
          Swipe the deck, or tap a card behind to bring it round.
        </p>
      </div>
    </div>
  );
}
