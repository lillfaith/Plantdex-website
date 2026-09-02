import Link from 'next/link';
import { getHerb } from '@/lib/deck';
import { GARDEN_STAGE_BY_MASTERY } from '@/lib/garden';
import { MASTERY_STAGE_LABEL } from '@/lib/mastery';
import type { RecentFind } from '@/lib/profile-stats';
import { PlantSprite } from '../PlantSprite';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';
import { EYEBROW, MICRO_LABEL } from '../ui/accents';

/**
 * The last three plants this player found — as an activity feed, not as three more cards.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A RAIL AND NODES, NOT BOXES. Each row shipped inside its own bordered rectangle, which
 * made three finds look like three unrelated objects. A dashed rail with the sprites sitting
 * on it says what the section actually is: one thread of activity, most recent at the top.
 * The rail is `pixel-rail`, the vertical twin of the `pixel-rule` the scan page already uses.
 *
 * IT IS NOT THE JOURNAL, and that boundary is deliberate. A sighting carries a date, a
 * region, notes and often a photograph — things about where somebody was and what they
 * wrote. None of that appears here. This reads the DISCOVERY record only: which card, when
 * it was first unlocked, and how far along it is. The profile therefore says what you have
 * found without saying anything about where you were.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Each sprite is drawn at the growth stage its own mastery earns, so the thread doubles as a
 * picture of how worked-over your newest finds are.
 */
const STAGE_MARK: Record<string, IconName> = {
  discovered: 'discovered',
  learned: 'learned',
  mastered: 'mastered',
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * "Today", "3 days ago", "2 months ago" — and the exact date underneath.
 *
 * Both, because a relative time is what makes a feed feel current and an absolute one is
 * what makes it a record. Computed against the render clock, which is safe here: on the
 * server the collection is empty, so no row exists to disagree with the client's.
 */
function relativeDay(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const days = Math.floor((Date.now() - then) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function exactDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function RecentFinds({ finds }: { finds: RecentFind[] }) {
  return (
    <section aria-labelledby="profile-recent" className="field-panel p-4 sm:p-5">
      <h2 id="profile-recent" className={`${EYEBROW} text-mystery-lilac`}>
        Recent field finds
      </h2>

      {finds.length === 0 ? (
        <p className="mt-2 text-sm text-violet-300">
          Nothing found yet. Your first discovery shows up here.
        </p>
      ) : (
        <ol className="relative mt-3">
          {/* The thread. Inset so it runs through the middle of each sprite, and stopped
              short at both ends so it reads as a section of a longer history rather than as
              a bracket around exactly three rows. */}
          <span
            aria-hidden="true"
            className="pixel-rail absolute top-5 bottom-5 left-[1.4rem] z-0"
          />
          {finds.map((find) => {
            const herb = getHerb(find.herbId);
            if (!herb) return null;
            return (
              <li key={find.herbId} className="relative z-10">
                <Link
                  href={`/herbdex/${herb.id}`}
                  className="lift flex min-h-14 items-center gap-3 rounded-2xl px-1 py-2 hover:bg-plum-700/45"
                >
                  {/* The node: the sprite on a plum disc, so the rail passes behind it
                      rather than through it. */}
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-plum-950/80 ring-1 ring-violet-600/35">
                    <PlantSprite
                      herbId={herb.id}
                      alt={herb.commonName}
                      stage={GARDEN_STAGE_BY_MASTERY[find.stage]}
                      fit
                      className="w-[86%]"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-violet-100">
                      {herb.commonName}
                    </span>
                    <span className="block text-xs text-violet-300">
                      {relativeDay(find.discoveredAt)}
                      <span className="text-violet-400"> · {exactDay(find.discoveredAt)}</span>
                    </span>
                  </span>
                  <span
                    className={`${MICRO_LABEL} flex shrink-0 items-center gap-1.5 ${
                      find.stage === 'mastered' ? 'text-gold-300' : 'text-violet-300'
                    }`}
                  >
                    <PlantdexIcon
                      name={STAGE_MARK[find.stage]!}
                      className="text-sm"
                      aria-hidden="true"
                    />
                    {MASTERY_STAGE_LABEL[find.stage]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
