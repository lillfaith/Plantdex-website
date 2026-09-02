import Link from 'next/link';
import { getHerb } from '@/lib/deck';
import { STAGE_LABEL, type GardenEntry } from '@/lib/garden';
import { PlantSprite } from '../PlantSprite';
import { Panel } from '../ui/Panel';
import { SectionHeader } from '../ui/SectionHeader';

/**
 * A glimpse of the garden, not the garden.
 *
 * Five plants at most, most-grown first — so the strip shows a player's best work and stays
 * one row on a phone. Everything else stays at `/garden`, which is the page built for it;
 * duplicating the whole scene here would give the profile a second, worse garden to keep in
 * step with the real one.
 *
 * Stages come from `buildGarden()`, so these sprites are the same art at the same growth
 * stage the Garden itself would draw. There is no separate progression behind this strip.
 */
export function GardenPreview({ entries }: { entries: GardenEntry[] }) {
  return (
    <Panel aria-labelledby="profile-garden" pad="md">
      <SectionHeader
        id="profile-garden"
        eyebrow="Garden"
        title="Growing right now"
        accent="orchid"
        icon="garden"
        right={
          <Link
            href="/garden"
            className="inline-flex min-h-11 items-center text-xs font-bold text-gold-400 hover:text-gold-300"
          >
            Visit My Garden &rarr;
          </Link>
        }
      />

      {entries.length === 0 ? (
        <p className="text-sm text-violet-300">
          Your garden fills as you find plants. Nothing is planted yet.
        </p>
      ) : (
        <ul className="flex items-end justify-between gap-1.5">
          {entries.map((entry) => {
            const herb = getHerb(entry.herbId);
            if (!herb) return null;
            return (
              <li key={entry.herbId} className="min-w-0 flex-1 text-center">
                <Link href={`/herbdex/${herb.id}`} className="group block">
                  {/*
                    THE SPRITE IS CAPPED IN WIDTH, NOT JUST GIVEN A ROW HEIGHT. `fit` fills
                    the container's WIDTH and takes its height from the sheet's 170x140
                    frame — so in a wide desktop cell an 84%-width sprite came out 107px tall
                    inside a 64px row and climbed straight over the section heading. The row
                    is 80px and the sprite tops out at 80px wide, which is 66px tall.
                  */}
                  <span className="relative mx-auto flex h-20 w-full items-end justify-center">
                    {/* Soil line, so the row reads as a bed rather than five floating icons. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-1 bottom-0 z-0 h-1.5 rounded-full bg-violet-700/45"
                    />
                    <PlantSprite
                      herbId={herb.id}
                      alt={herb.commonName}
                      stage={entry.stage}
                      fit
                      className="relative z-10 w-full max-w-20"
                    />
                  </span>
                  <span className="mt-1.5 block truncate text-[0.72rem] font-semibold text-violet-300 group-hover:text-gold-300">
                    {herb.commonName}
                  </span>
                  <span className="block truncate text-[0.72rem] text-violet-400">
                    {STAGE_LABEL[entry.stage]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
