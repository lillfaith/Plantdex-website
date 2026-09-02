import Link from 'next/link';
import { getHerb } from '@/lib/deck';
import { STAGE_LABEL, nextStageHint, stageForState } from '@/lib/garden';
import { MASTERY_STAGE_LABEL, stageFor } from '@/lib/mastery';
import type { HerbdexState } from '@/lib/types';
import { PlantSprite } from '../PlantSprite';
import { Panel } from '../ui/Panel';
import { EYEBROW } from '../ui/accents';

/**
 * The plant that travels with the player.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT IS NOT A PET, AND THERE IS NO SECOND PROGRESSION HERE.
 *
 * The sprite is drawn at `stageForState()` — the SAME mapping the Garden uses, from the
 * card's own mastery stage to a growth stage. So a sidekick grows sprout → growing →
 * flowering by being learned and mastered, and by nothing else. It reads no clock, holds no
 * state of its own, cannot be fed, watered or neglected, and has no timer: exactly the
 * discipline `garden.ts` was written to enforce ("The garden mirrors mastery; it is not a
 * second progression system"), applied to one plant instead of the whole collection.
 *
 * Discovery is enough to choose one. A plant you have actually found may come with you the
 * moment you find it; how grown it looks is what mastery buys.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function SidekickPanel({
  herbId,
  state,
}: {
  herbId: string | null;
  state: HerbdexState;
}) {
  const herb = herbId ? getHerb(herbId) : undefined;
  const stage = herbId ? stageForState(state, herbId) : null;
  const mastery = herbId ? stageFor(state, herbId) : null;
  const hint = stage ? nextStageHint(stage) : null;

  return (
    <Panel aria-labelledby="profile-sidekick" pad="sm" className="flex items-center gap-4">
      <h2 id="profile-sidekick" className="sr-only">
        Your sidekick
      </h2>

      {herb && stage ? (
        <>
          <span className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            {/* A soft ground so the creature stands on something rather than floating. */}
            <span
              aria-hidden="true"
              className="absolute inset-0 z-0 rounded-full bg-violet-700/25 blur-md"
            />
            <PlantSprite
              herbId={herb.id}
              alt={herb.commonName}
              stage={stage}
              fit
              className="relative z-10 w-[88%]"
            />
          </span>
          <div className="min-w-0">
            <p className={`${EYEBROW} text-mystery-orchid`}>Sidekick</p>
            <p className="mt-0.5 truncate text-base font-bold text-violet-100">
              <Link href={`/herbdex/${herb.id}`} className="tap-44 hover:text-gold-300">
                {herb.commonName}
              </Link>
            </p>
            <p className="mt-0.5 text-xs text-violet-300">
              {STAGE_LABEL[stage]} · {mastery ? MASTERY_STAGE_LABEL[mastery] : 'Discovered'}
            </p>
            {hint && <p className="mt-1 text-xs text-violet-400">{hint}</p>}
          </div>
        </>
      ) : (
        <div>
          <p className={`${EYEBROW} text-mystery-orchid`}>Sidekick</p>
          <p className="mt-1 text-sm text-violet-300">
            Discover a plant and pick one to travel with you. It grows as you learn and master
            its card.
          </p>
        </div>
      )}
    </Panel>
  );
}
