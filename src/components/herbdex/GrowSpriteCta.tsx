'use client';

import type { Herb } from '@/lib/types';
import { growCtaLabel } from '@/lib/grow-track';
import { tracksMastery } from '@/lib/mastery';
import { GARDEN_STAGE_BY_MASTERY, STAGE_LABEL } from '@/lib/garden';
import { useHerbdex } from '@/state/HerbdexProvider';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * "Grow your sprite" — the way into the growth track, from the top of the page.
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
 */
export function GrowSpriteCta({ herb }: { herb: Herb }) {
  const { stageOf, ready } = useHerbdex();
  const stage = ready ? stageOf(herb.id) : null;

  // Same two gates the track itself applies: nothing to grow before a discovery, and no
  // growth track at all for a card mastery does not cover.
  if (!stage || !tracksMastery(herb.id)) return null;

  const label = growCtaLabel(stage);
  const growth = GARDEN_STAGE_BY_MASTERY[stage];

  /*
   * THE FINISHED STATE IS A STATE, NOT A QUIETER BUTTON. A mastered plant has no next
   * action, and offering one that scrolled to a panel saying "nothing left to do" would be
   * the same dead end this component exists to remove.
   */
  if (!label) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-2 text-xs font-bold text-gold-300">
        <PlantdexIcon name="mastered" className="text-sm" aria-hidden="true" />
        Flowering &mdash; fully grown
      </p>
    );
  }

  return (
    <a
      href="#card-mastery"
      className="flex min-h-11 items-center justify-between gap-3 rounded-full border border-gold-500/60 bg-gold-500/12 px-4 text-sm font-bold text-gold-300 transition-colors hover:bg-gold-500/25 hover:text-gold-200"
    >
      <span className="flex items-center gap-2">
        <PlantdexIcon name="sprout" className="text-base" aria-hidden="true" />
        {label}
      </span>
      {/* The stage in words beside the action, so the button says where you are as well as
          where it goes. `STAGE_LABEL` is the Garden's own wording — the tile and this
          button must not name the same plant two different things. */}
      <span className="text-[0.72rem] font-semibold tracking-[0.08em] text-violet-300 uppercase">
        {STAGE_LABEL[growth]}
      </span>
    </a>
  );
}
