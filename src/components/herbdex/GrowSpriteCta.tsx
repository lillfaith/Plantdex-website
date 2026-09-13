'use client';

import type { Herb } from '@/lib/types';
import { growCtaLabel } from '@/lib/grow-track';
import { tracksMastery } from '@/lib/mastery';
import { useHerbdex } from '@/state/HerbdexProvider';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * "Grow your sprite" — the way into the growth track, sitting under the sprite it grows.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TRACK WAS NEVER MISSING; IT WAS SECTION ELEVEN OF TWELVE.
 *
 * Everything a player needs in order to grow a plant already existed and already worked.
 * It sat below the Field Log and below every botanical section, on a page that is long by
 * design — so somebody looking at a sprout and wondering what moves it had to scroll past
 * healing traits, compounds, lookalikes, usable parts, preparations and habitat to find
 * out. The answer to "how do I level this up" was eleven sections away from the sprite it
 * was about.
 *
 * So this is a signpost, not a feature: one line naming the current stage and one control
 * that jumps to the track. It adds no mechanic, stores nothing, and is the smallest thing
 * that could fix the actual problem.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * AN ANCHOR, NOT A ROUTE. `#card-mastery` is the id `MasteryTrack` already carries for the
 * discovery celebration's own "Learn this card" button, so both entry points land on the
 * same panel and there is one destination to keep working rather than two.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SHAPED FOR THE COLUMN IT LIVES IN, WHICH IS NARROW AND THAT IS THE POINT.
 *
 * It began as a full-width bar below the discovery stamp — one clear line, and a full screen
 * below the fold at 390px, because the hero's card art alone is 414px tall. Under the sprite
 * it is on the first screen and, better, it is ATTACHED TO THE THING IT ACTS ON: the creature
 * a player is looking at when they wonder how to grow it.
 *
 * That costs width. The sprite column is 112px on a phone, so two things went:
 *
 *   THE STAGE SUFFIX, which was never news here. The hero's own status chip sits inches away
 *   reading DISCOVERED, and growth stage maps one-to-one onto mastery stage — so printing
 *   SPROUT beside it was the same fact twice in two vocabularies.
 *
 *   THE ICON, because at this size a glyph and two words compete for the same line and the
 *   words are the half carrying the instruction.
 *
 * What is left is the verb, centred, filling its column. The button sizes to the column
 * rather than the column to the button, so the sprite above keeps exactly the dimensions the
 * hero was composed around.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function GrowSpriteCta({ herb }: { herb: Herb }) {
  const { stageOf, ready } = useHerbdex();
  const stage = ready ? stageOf(herb.id) : null;

  // Same two gates the track itself applies: nothing to grow before a discovery, and no
  // growth track at all for a card mastery does not cover.
  if (!stage || !tracksMastery(herb.id)) return null;

  const label = growCtaLabel(stage);

  /*
   * THE FINISHED STATE IS A STATE, NOT A QUIETER BUTTON. A mastered plant has no next
   * action, and offering one that scrolled to a panel saying "nothing left to do" would be
   * the same dead end this component exists to remove.
   *
   * The one place the icon survives: with no verb to crowd, the bloom mark is what makes a
   * finished plant read as finished at a glance.
   */
  if (!label) {
    return (
      <p className="flex w-full items-center justify-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-2 py-1.5 text-center text-[0.72rem] leading-tight font-bold text-gold-300">
        <PlantdexIcon name="mastered" className="shrink-0 text-sm" aria-hidden="true" />
        Fully grown
      </p>
    );
  }

  return (
    <a
      href="#card-mastery"
      /*
       * `min-h-11` holds the 44px touch target every control on this site keeps, while the
       * type stays small enough to sit under a 112px sprite — the height comes from padding
       * rather than from font size, which is what lets those two survive together.
       */
      className="flex min-h-11 w-full items-center justify-center rounded-full border border-gold-500/60 bg-gold-500/12 px-2 text-center text-[0.72rem] leading-tight font-bold text-gold-300 transition-colors hover:bg-gold-500/25 hover:text-gold-200"
    >
      {label}
    </a>
  );
}
