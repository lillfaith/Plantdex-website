import { HABITAT_LABEL, habitatOf, type HabitatClass } from '@/lib/habitat';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';

/**
 * A species' habitat, as a compact chip pair.
 *
 * WHAT THIS IS NOT. It is not the habitat section — "Where it grows" still carries the
 * curated sentence, and this never replaces it. A class label is a signpost for deciding
 * which way to walk; the prose is what tells you the plant wants moist nutrient-rich soil
 * and turns up on farm edges. Reducing the second to the first would trade the useful half
 * for the sortable half.
 *
 * It is also not a location. The classes describe a KIND of ground, not a place, which is
 * why the label is "Woodland" and never a map.
 *
 * The primary carries the icon and the colour; the secondary is deliberately quieter —
 * smaller, unfilled, no icon — because "also found in" is genuinely a lesser claim and the
 * two should not read as equals. A species with no secondary simply shows one chip.
 */

const HABITAT_ICON: Record<HabitatClass, IconName> = {
  woodland: 'woodland',
  meadow: 'meadow',
  wetland: 'wetland',
  wayside: 'wayside',
  garden: 'garden-habitat',
};

/**
 * One tone per class, from the deck palette.
 *
 * Colour is never the only signal — the label is always spelled out beside it — so these
 * only have to be distinguishable, not decodable.
 */
const HABITAT_TONE: Record<HabitatClass, string> = {
  woodland: 'text-habitat-woodland border-habitat-woodland/45 bg-habitat-woodland/10',
  meadow: 'text-habitat-meadow border-habitat-meadow/45 bg-habitat-meadow/10',
  wetland: 'text-habitat-wetland border-habitat-wetland/45 bg-habitat-wetland/10',
  wayside: 'text-habitat-wayside border-habitat-wayside/45 bg-habitat-wayside/10',
  garden: 'text-habitat-garden border-habitat-garden/45 bg-habitat-garden/10',
};

export function HabitatChip({
  habitat,
  weight = 'primary',
  className = '',
}: {
  habitat: HabitatClass;
  weight?: 'primary' | 'secondary';
  className?: string;
}) {
  if (weight === 'secondary') {
    return (
      <span
        className={`inline-flex items-center rounded-full border border-violet-600/70 px-2 py-0.5 text-[0.72rem] font-semibold tracking-[0.06em] text-violet-300 uppercase ${className}`}
      >
        <span className="sr-only">Also found in: </span>
        {HABITAT_LABEL[habitat]}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-bold tracking-[0.06em] uppercase ${HABITAT_TONE[habitat]} ${className}`}
    >
      <PlantdexIcon name={HABITAT_ICON[habitat]} className="shrink-0 text-sm" />
      <span className="sr-only">Habitat: </span>
      {HABITAT_LABEL[habitat]}
    </span>
  );
}

/** Both chips for a herb, or nothing at all when it has no assignment. */
export function HabitatChips({ herbId, className = '' }: { herbId: string; className?: string }) {
  const assignment = habitatOf(herbId);
  if (!assignment) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <HabitatChip habitat={assignment.primary} />
      {assignment.secondary && <HabitatChip habitat={assignment.secondary} weight="secondary" />}
    </span>
  );
}
