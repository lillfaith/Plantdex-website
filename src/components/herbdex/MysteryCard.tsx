import type { Herb } from '@/lib/types';
import { PlantSprite } from '../PlantSprite';
import { hasSprite } from '@/lib/plant-sprites';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * An undiscovered card, shown face-down.
 *
 * WHAT THIS REPLACES. The locked state used to be the real card thumbnail, blurred and
 * desaturated to near-black under a violet scrim. Two problems with that. It read as
 * disabled UI — the grey-out every interface uses for "you cannot have this" — and against
 * a dark violet page it was one dark rectangle on another, so a mostly-undiscovered
 * Herbdex looked like a broken image grid rather than a deck waiting to be turned over.
 *
 * A physical deck already solves this: an undiscovered card is simply a card lying face
 * DOWN, and the Plantdex backs are pink at the top edge, pale lilac through the middle and
 * periwinkle at the foot. Those exact values are sampled into `--color-mystery-*` and
 * composed by the `card-mystery` utility, so this is the real product's back rather than a
 * purple gradient invented to look mysterious.
 *
 * WHAT IT SHOWS, AND WHAT IT MUST NOT. The plant's own sprite, held on its resting frame
 * and reduced to a soft shadow: enough shape to be worth chasing, no name, no stats, no
 * printed text — the blur that used to be doing that job is no longer load-bearing, because
 * the artwork simply is not here. The card number stays, as it does on a real card's
 * corner, and a keyhole marks it as a secret rather than an error.
 *
 * Discovery is never conveyed by the treatment alone: every use pairs this with the words
 * "Not discovered", which AGENTS.md requires and which colour cannot carry.
 */
export function MysteryCard({
  herb,
  /** `grid` is the Herbdex thumbnail; `detail` is the larger single-card view. */
  size = 'grid',
  className = '',
}: {
  herb: Herb;
  size?: 'grid' | 'detail';
  className?: string;
}) {
  const number = `#${String(herb.cardNumber).padStart(2, '0')}`;
  const detail = size === 'detail';

  return (
    <div
      aria-hidden="true"
      className={`card-mystery relative isolate h-full w-full overflow-hidden ${className}`}
    >
      {/* Paper tooth. Sits under everything else at low opacity — present at full size,
          invisible as noise at thumbnail size, which is the point. */}
      <span className="card-tooth absolute inset-0 opacity-70" />

      {/* The printed backs carry a double frame: a bright outer edge and an inset hairline.
          Reproduced with rings rather than borders so neither eats into the card's box. */}
      <span
        className={`absolute inset-0 rounded-[inherit] ring-1 ring-white/45 ring-inset ${
          detail ? 'm-2.5' : 'm-1.5'
        }`}
      />
      <span className="absolute inset-0 rounded-[inherit] ring-1 ring-plum-950/25 ring-inset" />

      {/* The plant, as a shadow. Centred slightly high so the number and the keyhole below
          are not crowded by it. */}
      <span className="absolute inset-0 flex items-center justify-center pb-[10%]">
        {/*
          NOT EVERY CARD HAS A SPRITE, and one without renders an EMPTY BACK — a blank
          gradient that reads as a broken tile rather than a card face down. All 45 printed
          cards have one, so this was unreachable until the Field Cards joined the grid:
          `sprites.json` holds 45 entries and no sheet exists on disk for #48-51.

          The fallback is deliberately NOT a generic plant. A shape standing in for a
          species is the thing the Seed Shelf's pots rule already forbids — a drawing the
          reader would take as a claim about which plant is hiding here. The keyhole says
          the true thing instead: something is locked, and its shape is not the clue.

          Sized as a fraction of the CARD, not in sprite pixels: a locked thumbnail on a
          phone and the same card at full size then hold the same composition.
        */}
        {hasSprite(herb.id) ? (
          <span className="block w-[74%]">
            <PlantSprite herbId={herb.id} alt="" frozen fit className="plant-silhouette" />
          </span>
        ) : (
          <PlantdexIcon
            name="locked"
            className={`text-plum-950/25 ${detail ? 'text-7xl' : 'text-4xl'}`}
          />
        )}
      </span>

      {/* A low bloom off the foot of the card, which is where the printed back is darkest —
          it gives the silhouette something to stand on. */}
      <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-plum-950/35 to-transparent" />

      <span
        className={`absolute left-0 right-0 flex items-center justify-center gap-1.5 text-plum-950/80 ${
          detail ? 'bottom-5' : 'bottom-2.5'
        }`}
      >
        <PlantdexIcon name="locked" className={detail ? 'text-lg' : 'text-[0.8rem]'} />
        <span
          className={`font-bold tracking-[0.18em] tabular-nums ${
            detail ? 'text-sm' : 'text-[0.72rem]'
          }`}
        >
          {number}
        </span>
      </span>
    </div>
  );
}
