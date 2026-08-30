'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import type { Herb } from '@/lib/types';
import { assetPath } from '@/lib/asset-path';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * The physical card, turned over.
 *
 * WHAT WAS WRONG BEFORE, since the fix is entirely structural. This rendered ONE `<img>`
 * whose `src` was swapped the instant the button was pressed, inside a container that then
 * rotated 180°, with an inner element counter-rotating to keep the (already swapped) image
 * upright. Three consequences, all visible:
 *
 *   1. The back appeared at 0°, not at 90°, so the "flip" was watching the back face turn
 *      around rather than watching the front become the back.
 *   2. No ancestor carried `perspective`, so `rotateY` degenerated into a horizontal
 *      squash — the card got thin and fat again instead of turning through depth.
 *   3. The counter-rotating child had no transition of its own, so it snapped while its
 *      parent eased.
 *
 * It is now one object with two faces. Both are absolutely positioned in the same box; the
 * back is pre-rotated 180° so its artwork lands upright; `backface-visibility: hidden` does
 * the swap for us at exactly the edge-on moment. See the `flip-*` utilities in globals.css.
 *
 * SIZE. An invisible sizer image establishes the box, and both faces fill it. Card fronts
 * and backs are both 800×1295, but relying on that would put a layout jump one asset
 * revision away — the sizer means the container's height is decided once, by the front, and
 * neither face can change it.
 *
 * STATE. `showBack` is a plain boolean and the animation is pure CSS, so a rapid tap simply
 * retargets the transition from wherever the card currently is. There is no animation state
 * machine to corrupt and no way to strand the card between faces; the button is also
 * outside the rotating element, so it never moves while the card turns.
 */
export function CardFlip({ herb, size = 'default' }: { herb: Herb; size?: 'default' | 'hero' }) {
  const [showBack, setShowBack] = useState(false);
  const panelId = useId();

  const frontAlt = `Front of Plantdex card ${herb.cardNumber}: ${herb.commonName} (${herb.scientificName})`;
  const backAlt = `Back of Plantdex card ${herb.cardNumber}: ${herb.commonName}. The same information is listed in text below.`;

  return (
    <div>
      <div
        className={`flip-scene mx-auto sm:mx-0 ${
          // The profile hero is the one place the printed card should dominate, so it gets
          // its own width rather than the grid's.
          size === 'hero' ? 'w-64 sm:w-72 lg:w-[21rem]' : 'w-56 sm:w-64'
        }`}
      >
        <div
          id={panelId}
          className={`flip-card shadow-card-lift rounded-[var(--radius-card)] ${
            showBack ? 'flip-card-revealed' : ''
          }`}
        >
          {/* Establishes the box both faces fill. Never painted, never read. */}
          <Image
            src={assetPath(herb.image)}
            alt=""
            aria-hidden="true"
            width={800}
            height={1295}
            priority
            className="invisible w-full"
          />

          <div className="flip-face">
            <Image
              src={assetPath(herb.image)}
              alt={frontAlt}
              width={800}
              height={1295}
              priority
              className="h-full w-full object-cover"
            />
            <span className="flip-shade flip-shade-front" aria-hidden="true" />
          </div>

          <div className="flip-face flip-face-back">
            <Image
              src={assetPath(herb.backImage)}
              alt={backAlt}
              width={800}
              height={1295}
              className="h-full w-full object-cover"
            />
            <span className="flip-shade flip-shade-back" aria-hidden="true" />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowBack((current) => !current)}
        aria-expanded={showBack}
        aria-controls={panelId}
        className="mx-auto mt-3 flex min-h-11 items-center justify-center gap-2 rounded-full border border-violet-500 px-4 text-sm font-semibold text-violet-200 hover:bg-plum-600 sm:mx-0"
      >
        <PlantdexIcon name="flip" className="text-base" />
        {showBack ? 'Show card front' : 'Show card back'}
      </button>
    </div>
  );
}
