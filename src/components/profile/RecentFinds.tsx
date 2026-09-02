import Link from 'next/link';
import { getHerb } from '@/lib/deck';
import { GARDEN_STAGE_BY_MASTERY } from '@/lib/garden';
import { MASTERY_STAGE_LABEL } from '@/lib/mastery';
import type { RecentFind } from '@/lib/profile-stats';
import { PlantSprite } from '../PlantSprite';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';
import { Panel } from '../ui/Panel';
import { SectionHeader } from '../ui/SectionHeader';

/**
 * The last three plants this player found.
 *
 * IT IS NOT THE JOURNAL, and that boundary is deliberate. A sighting carries a date, a
 * region, notes and often a photograph — things about where somebody was and what they
 * wrote. None of that appears here. This reads the DISCOVERY record only: which card, when
 * it was first unlocked, and how far along it is. The profile therefore says what you have
 * found without saying anything about where you were.
 *
 * Each sprite is drawn at the growth stage its own mastery earns, so the row doubles as a
 * picture of how worked-over your newest finds are.
 */
const STAGE_MARK: Record<string, IconName> = {
  discovered: 'discovered',
  learned: 'learned',
  mastered: 'mastered',
};

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function RecentFinds({ finds }: { finds: RecentFind[] }) {
  return (
    <Panel aria-labelledby="profile-recent" pad="md">
      <SectionHeader
        id="profile-recent"
        eyebrow="Recent field finds"
        title="Newest in the collection"
        accent="lilac"
        icon="discovered"
      />

      {finds.length === 0 ? (
        <p className="text-sm text-violet-300">
          Nothing found yet. Your first discovery shows up here.
        </p>
      ) : (
        <ul className="space-y-2">
          {finds.map((find) => {
            const herb = getHerb(find.herbId);
            if (!herb) return null;
            return (
              <li key={find.herbId}>
                <Link
                  href={`/herbdex/${herb.id}`}
                  className="flex min-h-14 items-center gap-3 rounded-2xl border border-violet-700/60 bg-plum-800/50 p-2.5 transition-colors hover:border-violet-600 hover:bg-plum-700/60"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center">
                    <PlantSprite
                      herbId={herb.id}
                      alt={herb.commonName}
                      stage={GARDEN_STAGE_BY_MASTERY[find.stage]}
                      fit
                      className="w-full"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-violet-100">
                      {herb.commonName}
                    </span>
                    <span className="block text-xs text-violet-400">
                      Found {formatDay(find.discoveredAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-violet-600/70 px-2 py-0.5 text-[0.72rem] font-bold text-violet-200">
                    <PlantdexIcon
                      name={STAGE_MARK[find.stage]!}
                      className="text-[0.72rem]"
                      aria-hidden="true"
                    />
                    {MASTERY_STAGE_LABEL[find.stage]}
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
