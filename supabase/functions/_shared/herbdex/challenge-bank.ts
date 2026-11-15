import type { ActivityId } from './boss-form.ts';
import { DANDELION_SPECIES } from './boss-species/taraxacum-officinale.ts';

/**
 * THE SPECIES REGISTRY AND THE SHAPE OF A QUESTION. This file is generic: it names no plant except
 * to register the ones that have a Boss Form. A plant's questions live in `boss-species/<plant>.ts`.
 *
 * EVERY QUESTION IS A DRAFT UNTIL REVIEWED. `mastery-challenges.ts` serves an item only when
 * `CHALLENGE_REVIEWS` carries a named reviewer and a date for its id and every asset it `requires`
 * is ready. Registering a species here approves nothing.
 *
 * EVERY ANSWER IS AN INDEX INTO `options`, WHATEVER THE FORMAT, so one server scorer serves all
 * four formats: a picture is an image id, a tapped part is a region id, a quick pick is short text.
 */
export type ChallengeKind = 'pick-picture' | 'spot-feature' | 'showdown' | 'quick-pick';
export type ChallengeCategory = 'visual' | 'applied' | 'recall';

export interface ChallengeItem {
  readonly id: string;
  readonly herbId: string;
  readonly activity: ActivityId;
  readonly kind: ChallengeKind;
  readonly category: ChallengeCategory;
  /** Up to nine words. */
  readonly prompt: string;
  /** A picture shown with the question: the photograph to tap on, or the puff to match. */
  readonly media?: string;
  /** Image id, region id or short text, by kind. The builder shuffles it in. */
  readonly correct: string;
  /** One for a showdown, two or three otherwise. */
  readonly distractors: readonly string[];
  /** One sentence, up to eighteen words. */
  readonly feedback: string;
  readonly sources: readonly string[];
  /** A phrase from the curated notes this item tests. */
  readonly fact: string;
  /** A second phrase, for an item that needs two observations to answer. Also from the notes. */
  readonly alsoFact?: string;
  readonly requires?: readonly string[];
}

/**
 * ONE PLANT'S BOSS FORM CONTENT. `active` is the pool the engine plays from, in rotation order.
 * `archived` is kept for later expansions and is never served or scored.
 */
export interface BossSpecies {
  readonly herbId: string;
  readonly active: readonly ChallengeItem[];
  readonly archived: readonly ChallengeItem[];
}

/** Add a plant by registering its species file here. Nothing else in the engine changes. */
export const BOSS_SPECIES: readonly BossSpecies[] = [DANDELION_SPECIES];

/** What the engine plays: every registered plant's ACTIVE questions. */
export const ACTIVE_CHALLENGES: readonly ChallengeItem[] = BOSS_SPECIES.flatMap((s) => s.active);

/** Everything drafted, active or archived. For review packets and tests, never for serving. */
export const CHALLENGE_BANK: readonly ChallengeItem[] = BOSS_SPECIES.flatMap((s) => [
  ...s.active,
  ...s.archived,
]);

export function speciesFor(herbId: string): BossSpecies | undefined {
  return BOSS_SPECIES.find((s) => s.herbId === herbId);
}

/**
 * THE GENERIC CHECK A NEW SPECIES MUST PASS before it is registered: pool sizes match the template
 * exactly (so a retry can always draw a different set and never needs more questions than exist),
 * every item belongs to this plant and stage, ids are unique, no active question is gated or
 * archived twice, and answers are distinct. Returns problems; an empty list means structurally sound.
 * It says nothing about botany, which is the reviewer's job.
 */
export function speciesProblems(
  species: BossSpecies,
  rules: Readonly<Record<ActivityId, { played: number; pool: number }>>,
): string[] {
  const problems: string[] = [];
  const all = [...species.active, ...species.archived];
  const ids = all.map((i) => i.id);
  if (new Set(ids).size !== ids.length) problems.push('duplicate question ids');
  for (const item of all) {
    if (item.herbId !== species.herbId) problems.push(`${item.id}: belongs to ${item.herbId}`);
    if (new Set([item.correct, ...item.distractors]).size !== 1 + item.distractors.length) {
      problems.push(`${item.id}: answers are not distinct`);
    }
  }
  for (const [activity, rule] of Object.entries(rules) as [ActivityId, { played: number; pool: number }][]) {
    const pool = species.active.filter((i) => i.activity === activity);
    if (pool.length !== rule.pool) problems.push(`${activity}: ${pool.length} active, template wants ${rule.pool}`);
    if (rule.pool <= rule.played) problems.push(`${activity}: pool must exceed questions played`);
    for (const item of pool) if (item.requires?.length) problems.push(`${item.id}: active but gated`);
  }
  return problems;
}
