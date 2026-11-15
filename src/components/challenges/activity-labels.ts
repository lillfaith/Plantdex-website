import type { ActivityId } from '@/lib/boss-form';

/**
 * THE WORDS A PLAYER SEES FOR EACH ACTIVITY. Presentation only: the internal ids are what the
 * database, the server and the rules module use, and they do not change when a label does.
 * `compare` is shown as "Picture Match" because its questions ask which picture shows
 * something, not which of two lookalikes is which.
 */
export const ACTIVITY_LABELS: Readonly<Record<ActivityId, { name: string; hint: string }>> = {
  'part-spotter': { name: 'Part Spotter', hint: 'Name the parts' },
  compare: { name: 'Picture Match', hint: 'Look closely' },
  'habitat-season': { name: 'Habitat', hint: 'Where it grows' },
  'boss-trial': { name: 'Boss Trial', hint: 'Final unlock' },
};
