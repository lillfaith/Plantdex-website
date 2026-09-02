import Link from 'next/link';
import { getHerb } from '@/lib/deck';
import { GARDEN_PREVIEW_COUNT } from '@/lib/profile-stats';
import { STAGE_LABEL, type GardenEntry } from '@/lib/garden';
import { PlantSprite } from '../PlantSprite';
import { EYEBROW } from '../ui/accents';

/**
 * A glimpse of the garden — a small diorama rather than a row of icons.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BED IS DRAWN BY THE CONTAINER, NEVER BY THE PLANTS. Five evenly spaced positions on a
 * continuous soil line, always — a player with one plant sees a bed with one plant in it,
 * which is a garden at the start. Letting the sprites define the row instead would give that
 * player a single creature floating beside four gaps, which is a broken component. This is
 * the whole reason `soil-line` lives on the strip and the empty positions still take up
 * their space.
 *
 * THE SPRITES BREAK THE PANEL. They stand above the strip's top edge, which is the one place
 * on this page where content is allowed out of its rectangle — a plant that fits neatly
 * inside a box is a picture of a plant, and this section is supposed to be the charming one.
 * The section therefore must not clip, and `ProfileView` leaves the clearance above it.
 *
 * NOT THE GARDEN. Five at most, most-grown first. Everything else stays at `/garden`, which
 * is the page built for it; a second, worse garden here would be one more thing to keep in
 * step with the real one.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Stages come from `buildGarden()`, so these are the same sprites at the same growth stages
 * the Garden itself would draw. There is no separate progression behind this strip.
 */
export function GardenPreview({ entries }: { entries: GardenEntry[] }) {
  // Always the same number of beds. `undefined` is an empty one, and it still holds its place.
  const beds: (GardenEntry | undefined)[] = Array.from(
    { length: GARDEN_PREVIEW_COUNT },
    (_, index) => entries[index],
  );

  return (
    <section aria-labelledby="profile-garden" className="panel px-4 pt-4 pb-3 sm:px-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="profile-garden" className={`${EYEBROW} text-mystery-orchid`}>
          Growing right now
        </h2>
        <Link
          href="/garden"
          className="tap-44 text-xs font-bold text-gold-400 hover:text-gold-300"
        >
          Visit My Garden &rarr;
        </Link>
      </div>

      {/*
        THE BED ONLY GETS ITS FULL HEIGHT ONCE SOMETHING GROWS IN IT.
        At zero plants an 80px band above the soil is just a void, and it reads as a broken
        component rather than as an empty garden — which is the one thing this section was
        told not to do. With a single plant the full band is right: one sprite standing in a
        long bed is a garden at the start. So the height follows the content and the soil
        does not.
      */}
      {entries.length > 0 && (
        <ul className="mt-5 flex items-end justify-between gap-1 sm:gap-3">
          {beds.map((entry, index) => {
            const herb = entry ? getHerb(entry.herbId) : undefined;
            return (
              <li key={entry?.herbId ?? `bed-${index}`} className="min-w-0 flex-1">
                <span className="flex h-20 items-end justify-center sm:h-24">
                  {herb && entry ? (
                    <PlantSprite
                      herbId={herb.id}
                      alt={herb.commonName}
                      stage={entry.stage}
                      fit
                      className="w-full max-w-20 sm:max-w-24"
                    />
                  ) : (
                    // An empty bed is not a placeholder sprite — it is soil. Nothing is drawn.
                    <span aria-hidden="true" className="block h-px w-full" />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {entries.length === 0 && (
        <p className="mt-3 text-sm text-violet-300">
          Your garden fills as you find plants. The beds are ready.
        </p>
      )}

      {/* The ground, drawn once across the whole strip and bled to the section's edges so
          the bed reads as continuous rather than as five separate tiles. */}
      <span aria-hidden="true" className="soil-line -mx-4 mt-0.5 block h-2.5 sm:-mx-5" />

      {/* Labels only under the beds that hold something. An "Empty bed" caption under a
          patch of soil labels the absence of a thing, which is noise. */}
      {entries.length > 0 && (
        <ul className="mt-1.5 flex justify-between gap-1 sm:gap-3">
          {beds.map((entry, index) => {
            const herb = entry ? getHerb(entry.herbId) : undefined;
            return (
              <li key={entry?.herbId ?? `label-${index}`} className="min-w-0 flex-1 text-center">
                {herb && entry && (
                  <Link href={`/herbdex/${herb.id}`} className="tap-44 group block">
                    <span className="block truncate text-[0.72rem] font-bold text-violet-200 group-hover:text-gold-300">
                      {herb.commonName}
                    </span>
                    <span className="block truncate text-[0.72rem] text-violet-400">
                      {STAGE_LABEL[entry.stage]}
                    </span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
