'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { assetPath } from '@/lib/asset-path';
import { PlantSprite } from '../PlantSprite';
import { RarityBadge } from '../herbdex/RarityBadge';
import { EYEBROW } from '../ui/accents';
import type { Herb } from '@/lib/types';

/**
 * THE LANDING PAGE'S HAND OF CARDS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS REPLACED, AND WHY A GRID WAS THE WRONG SHAPE.
 *
 * Four card thumbnails in a two-by-four grid, each a link to its plant. Nothing was wrong
 * with it except what it said: a uniform grid of product images is how a catalogue presents
 * stock, and this is the page that has to make somebody want to collect these. A hand of
 * cards with one held out says the same thing about the deck and a different thing about
 * what it is for.
 *
 * ONE CARD IS HELD, THE REST ARE FANNED, AND EVERY ONE IS REACHABLE. The fanned cards are
 * `<button>`s that promote themselves to the front; the held card is the `<Link>` into its
 * plant page. That split is deliberate: a card you are looking at and a card you are choosing
 * are two different actions, and making all five links would mean a tap on a half-hidden card
 * navigated away from the page instead of showing it to you.
 *
 * THE CREATURE IS THE SAME SPECIES AS THE HELD CARD. It is the one element that makes this a
 * scene rather than a carousel — the plant standing in front of its own card — and it changes
 * with the selection for free, because `PlantSprite` takes the herb id and every species in
 * the deck has authored art for all three growth stages. Flowering, like the hero row above:
 * this is the invitation, and a seedling advertises the least of what is here.
 *
 * THE TRAITS ARE THE DECK'S OWN WORDS. `herb.back.healingTraits` is transcribed from the
 * printed card back, so nothing here is written by us, and the non-claim framing line is the
 * SAME SENTENCE `HealingTraitsSection` prints on every plant page — copied deliberately
 * rather than reworded, because two phrasings of one caveat are free to disagree.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT THIS COSTS. Five 400px thumbnails, about 21KB each — one more than the grid it
 * replaced, because any of the five can be promoted to the front and a card that arrives on
 * tap would arrive after the tap. All five are `loading="lazy"`: the whole section sits below
 * the fold on a phone, so none of them competes with the hero for the first paint. The two
 * loops animate `transform` and `opacity` only (see `showcase-drift` / `showcase-halo` in
 * globals.css) and there is no scroll listener, no observer and no timer anywhere in here.
 */

/**
 * Where a fanned card sits, from the outside in. Four slots for the four cards that are not
 * being held.
 *
 * THE OFFSETS ARE CSS VARIABLES RATHER THAN NUMBERS because the fan has to narrow on a
 * phone: at 390px the stage is about 358px wide, and the outer pair at the desktop spread
 * would put their far edges past the page gutter. The stage declares `--fan-1` / `--fan-2`
 * and overrides both at `sm`, so one set of slots serves both widths — see the element below.
 *
 * Rotation grows with distance from the centre, which is what makes a row of cards read as a
 * fan rather than as a staircase.
 *
 * THE Z-INDEX IS NOT DECORATION, AND LEAVING IT TO DOM ORDER PUT A CARD IN A HOLE. Painted in
 * source order, each card covers the one before it — so on the LEFT the inner card lands on
 * top of the outer one and peeks out correctly, while on the RIGHT the outer card lands on
 * top of the inner one and hides it completely. Four cards went out, three came back. A fan
 * is symmetric about its middle, so the stacking has to be: outer pair behind, inner pair in
 * front of them, held card (`z-20`) in front of everything.
 */
const SLOTS = [
  { x: 'calc(var(--fan-2) * -1)', rotate: -17, z: 'z-0' },
  { x: 'calc(var(--fan-1) * -1)', rotate: -8, z: 'z-10' },
  { x: 'var(--fan-1)', rotate: 8, z: 'z-10' },
  { x: 'var(--fan-2)', rotate: 17, z: 'z-0' },
] as const;

/** How many traits are dealt. Three is the brief; the cards print between three and six. */
const TRAITS_SHOWN = 3;

/** Milliseconds between one trait appearing and the next. */
const TRAIT_STAGGER = 130;

export function CardShowcase({ cards }: { cards: readonly Herb[] }) {
  const [featuredId, setFeaturedId] = useState(cards[0]?.id ?? '');
  const traitsId = useId();

  const featured = cards.find((card) => card.id === featuredId) ?? cards[0];
  if (!featured) return null;

  const fanned = cards.filter((card) => card.id !== featured.id).slice(0, SLOTS.length);
  const traits = featured.back.healingTraits.slice(0, TRAITS_SHOWN);

  return (
    <div>
      {/*
        THE STAGE. A fixed height rather than one the cards set, because the fanned cards are
        positioned by `transform` and take no part in layout: without a height here the
        container would collapse to the held card alone and the rotated corners would spill
        over whatever sits underneath.

        `--fan-1` and `--fan-2` are the inner and outer spread. On a 390px screen the outer
        card's far edge lands about 15px inside the page gutter; at `sm` and up there is room
        for a wider hand.
      */}
      <div
        className="relative mx-auto flex h-72 w-full max-w-xl items-center justify-center [--fan-1:3.9rem] [--fan-2:7rem] sm:h-[22rem] sm:[--fan-1:5.6rem] sm:[--fan-2:10rem]"
      >
        {fanned.map((card, index) => {
          const slot = SLOTS[index]!;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setFeaturedId(card.id)}
              /*
                The accessible name is the ACTION, not the card: "Red Clover" alone would
                read as a link to it, which is what the held card is. The card number comes
                along because it is how the deck itself refers to a card.

                DELIBERATELY NOT `aria-pressed`. These four are the cards that are NOT being
                held, so every one of them would carry `aria-pressed="false"` forever and the
                one that is pressed is a link rather than a button — a toggle group whose
                selected member is not in the group is worse than no toggle at all. The held
                card is announced instead by the heading and the name beneath the fan.
              */
              aria-label={`Show card ${card.cardNumber}, ${card.commonName}`}
              style={{ transform: `translateX(${slot.x}) rotate(${slot.rotate}deg)` }}
              /*
                `transition-transform` is what animates the reshuffle when a different card is
                promoted — the slots do not move, the cards move between them. The blanket
                reduced-motion rule collapses it, and the end state is the same arrangement.
              */
              className={`card-frame absolute ${slot.z} w-26 overflow-hidden rounded-xl shadow-card transition-transform duration-300 hover:brightness-110 focus-visible:z-30 sm:w-32`}
            >
              <Image
                src={assetPath(card.thumb)}
                alt=""
                aria-hidden="true"
                width={178}
                height={288}
                loading="lazy"
                className="w-full"
              />
            </button>
          );
        })}

        {/*
          THE HELD CARD, IN NORMAL FLOW. Everything else in the stage is absolutely
          positioned precisely so this one element can own `transform` outright — see
          `showcase-drift`, which would otherwise fight whatever centred it.
        */}
        <div className="showcase-drift relative z-20">
          {/*
            The halo. A sibling behind the card rather than a shadow on it: a drop-shadow
            would trace the card's own rectangle and read as a sticker, where a soft radial
            behind it reads as the card being lit. `-z-10` is safe here and is not in
            `RarityAura` — this element makes its own stacking context, so there is no page
            background for the layer to fall behind.
          */}
          <span
            aria-hidden="true"
            className="showcase-halo absolute -inset-6 -z-10 rounded-[3rem] bg-gold-500/20 blur-2xl"
          />
          <Link
            href={`/herbdex/${featured.id}`}
            className="card-frame card-frame-lg block overflow-hidden rounded-[var(--radius-card)] shadow-card-lift"
          >
            <Image
              src={assetPath(featured.thumb)}
              alt={`Plantdex card ${featured.cardNumber}: ${featured.commonName} (${featured.scientificName})`}
              width={178}
              height={288}
              loading="lazy"
              className="w-38 sm:w-48"
            />
          </Link>
        </div>

        {/*
          THE CREATURE, STANDING IN FRONT OF THE HAND.

          At the stage's own baseline so it shares the ground line every sprite is authored
          on, and in front of the fan rather than beside it — there is no room beside it at
          390px, and a plant standing in front of its own card is the better picture anyway.
          The lit patch under its feet is the same device the hero row uses, and for the same
          reason: four characters floating on a gradient read as stickers.

          `aria-hidden` on the wrapper: the sprite is the held card's own species, which the
          card beside it already names, and a screen reader gains nothing from hearing it
          twice.
        */}
        <span
          aria-hidden="true"
          /*
            PLACED OFF THE FAN'S OWN SPREAD, NOT OFF THE STAGE. Pinned to a corner of the
            container it read as a sprite that had wandered away from the picture, and —
            worse — as belonging to the leftmost card rather than to the one it actually
            depicts. 1.6 x the inner spread lands it just past the held card's left edge at
            both widths, so it overlaps the card it is the species of.

            `bottom-5` is the cards' own baseline: the held card is 21px shorter than the
            stage at both breakpoints, so this stands the creature on the same line rather
            than below the hand. It deliberately does NOT drift with the card — the card is
            being held up, the plant is standing on the ground.
          */
          style={{ transform: 'translateX(calc(-50% + var(--fan-1) * -1.6))' }}
          className="absolute bottom-5 left-1/2 z-30 block w-20 sm:w-28"
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
        WHAT IS BEING HELD, AND WHAT THE CARD SAYS ABOUT IT.

        Labelled by the plant's name rather than announced through a live region: the fanned
        cards are `aria-pressed` buttons, so a screen reader already reports the selection
        changing, and a polite announcement of three traits on every tap would talk over that.
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

        <h3 id={traitsId} className={`mt-5 ${EYEBROW} text-gold-400`}>
          Healing Traits
        </h3>
        {/*
          THE SAME SENTENCE AS EVERY PLANT PAGE. `HealingTraitsSection` prints this directly
          under the heading it qualifies; a shorter version here would be a second phrasing of
          one caveat, free to drift from the first. It is the heading's note, not the page's
          disclaimer — `SafetyNotice` at the foot of the homepage is a separate thing and
          stays.
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
        {/*
          CHIPS THAT WRAP, NOT STACKED BARS. Full-width rounded rows read as three buttons —
          which is exactly wrong on a section whose only real control is the fan above, and
          doubly so next to a page whose two actual buttons are the same shape. A trait is a
          label, so it is sized by its word.
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
          Tap a card behind to bring it forward.
        </p>
      </div>
    </div>
  );
}
