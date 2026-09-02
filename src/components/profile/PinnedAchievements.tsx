import { getAchievement } from '@/lib/achievements';
import { achievementShade } from '@/lib/achievement-shade';
import { MAX_PINNED } from '@/lib/player-profile';
import { ACCENTS } from '../ui/accents';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { achievementIcon } from '../icons/achievement-icons';
import { Panel } from '../ui/Panel';
import { SectionHeader } from '../ui/SectionHeader';

/**
 * Up to three earned achievements, pinned.
 *
 * Deliberately BIGGER than the pills on the Herbdex shelf. There the job is to fit sixteen
 * into a strip; here the job is the opposite — three chosen things, given room, so they read
 * as trophies rather than as tags. Same shade function keyed by id, so an achievement wears
 * the same colour in both places and gold still means earned.
 *
 * Every id has already been checked against the player's own achievement records by
 * `resolveProfile`, so nothing unearned can reach this component. `getAchievement` is still
 * consulted for the name and description rather than trusting the id alone.
 */
export function PinnedAchievements({ ids }: { ids: string[] }) {
  return (
    <Panel aria-labelledby="profile-pinned" pad="md">
      <SectionHeader
        id="profile-pinned"
        eyebrow="Pinned"
        title="Your proudest three"
        accent="gold"
        icon="laurel"
      />

      {ids.length === 0 ? (
        <p className="text-sm text-violet-300">
          Earn an achievement and pin up to {MAX_PINNED} of them here.
        </p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {ids.map((id) => {
            const achievement = getAchievement(id);
            if (!achievement) return null;
            const tone = ACCENTS[achievementShade(id)];
            return (
              <li
                key={id}
                className={`rounded-2xl border p-3.5 text-center ${tone.border} ${tone.wash}`}
              >
                <p aria-hidden="true" className={`text-2xl ${tone.icon}`}>
                  <PlantdexIcon name={achievementIcon(id)} className="mx-auto" />
                </p>
                <p className="mt-1.5 text-sm font-bold text-gold-300">{achievement.name}</p>
                <p className="mt-1 text-xs text-violet-300">{achievement.description}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
