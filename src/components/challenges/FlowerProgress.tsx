import { Art } from './ChallengeArt';

/**
 * PROGRESS AS A ROW OF SMALL FLOWERS instead of a number: a bud for what is ahead, a bright bud
 * for where you are, an open gold bloom for a right answer, a young sprout for one still being
 * learned (it opens if the second chance goes well). Each flower opens once, when it is earned.
 * The text alternative says where you are, because the picture is decoration.
 */
export type FlowerState = 'ahead' | 'current' | 'bloom' | 'sprout';

const LOOK: Record<FlowerState, { art: 'bud' | 'bloom' | 'sprout'; tone: string }> = {
  ahead: { art: 'bud', tone: 'text-violet-500' },
  current: { art: 'bud', tone: 'text-violet-100' },
  bloom: { art: 'bloom', tone: 'text-gold-300' },
  sprout: { art: 'sprout', tone: 'text-violet-300' },
};

export function FlowerProgress({
  states,
  label,
}: {
  states: readonly FlowerState[];
  label: string;
}) {
  return (
    <ol className="flex items-end gap-2.5" aria-label={label}>
      {states.map((state, index) => {
        const look = LOOK[state];
        return (
          <li key={index} className={look.tone}>
            <Art
              name={look.art}
              accent="fill-plum-900"
              className={`h-6 w-6 ${state === 'bloom' ? 'flower-bloom' : ''}`}
            />
          </li>
        );
      })}
    </ol>
  );
}
