import type { HerbdexState } from './types';
import {
  SIGHTINGS_FOR_MASTERY,
  stageFor,
  tracksMastery,
  type MasteryStage,
} from './mastery';

/**
 * THE GROWTH QUEST, DERIVED — never stored.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A player could see their plant as a sprout and had no idea what moved it. The three
 * things that do were spread across the app: a discovery written by two different entry
 * points, a knowledge check eleven sections down the plant page, and a Field Log form that
 * nothing ever pointed at. The mechanics were complete; the instructions did not exist.
 *
 * This turns them into three readable steps. IT DECIDES NOTHING. Every flag below is a
 * question asked of the same records `qualifiesForMastery` asks of, in the same order, so
 * there is no second checklist that could drift out of agreement with the reducer — the bug
 * this whole module is shaped to make impossible. Adding a fourth requirement to mastery
 * without adding it here would leave a step missing, which is a visible failure; inventing
 * a step here that mastery does not check is the one thing the tests forbid.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY STEP THREE IS NOT "FIND IT AGAIN", which is what it was called everywhere else.
 *
 * `qualifiesForMastery` counts EVERY Field Log sighting for the species. Not sightings
 * after learning — every one, with no date comparison. So a player who logged a sighting in
 * spring and passes the check in autumn is mastered the instant they pass it, having found
 * nothing "again". Telling that player to go and find it again would be describing a rule
 * the code does not enforce.
 *
 * So the step is named for the ACTION that satisfies it — logging a field sighting — and
 * when one is already logged it says so instead of issuing an instruction that is already
 * complete.
 */

/**
 * The id on the Field Log's own "+ Log sighting" button.
 *
 * A CONTRACT BETWEEN TWO SIBLINGS, so it lives with the flow rather than inside either of
 * them. The growth panel and the Field Log are both bands in the same ordered list on the
 * plant page — neither is the other's parent, so the panel's third step reaches its action
 * through the DOM. Exported and imported at both ends precisely so that renaming it breaks
 * a build rather than silently turning one button into a no-op.
 */
export const FIELD_LOG_TRIGGER_ID = 'log-sighting-trigger';

/** Stable ids: they key React nodes and are what the ordering test asserts against. */
export const GROW_STEP_IDS = ['found', 'learn', 'sighting'] as const;
export type GrowStepId = (typeof GROW_STEP_IDS)[number];

export interface GrowStep {
  id: GrowStepId;
  /** The step's name, as the panel prints it. */
  label: string;
  /** Whether the underlying record exists. Read, never written. */
  done: boolean;
  /**
   * The one step to act on — the first that is not done.
   *
   * DELIBERATELY NOT "LOCKED" FOR ANYTHING AFTER IT. Sightings are not gated on learning:
   * the Field Log accepts one at any time. A step drawn as locked while the form one section
   * above cheerfully accepts it would be a UI telling a lie about its own app.
   */
  current: boolean;
  /** One line of supporting copy, or null when the step speaks for itself. */
  note: string | null;
}

export interface GrowTrack {
  stage: MasteryStage;
  steps: GrowStep[];
  /** True once the card is recorded as mastered — the flowering, finished state. */
  complete: boolean;
}

/**
 * The quest for one species, or `null` where there is no quest to show.
 *
 * Null in two cases, and both are correct rather than defensive. An UNDISCOVERED plant has
 * no track because the page it would sit on is the locked view. A card OUTSIDE THE PRINTED
 * DECK has none because mastery does not cover it — `applyLearned` refuses a Field Card and
 * returns the same state object, so drawing a "learn this" step for one would offer a stage
 * the reducer silently declines. `MasteryTrack` already learned that lesson the hard way;
 * this keeps the answer in one place instead of asking `tracksMastery` at each call site.
 */
export function growTrack(
  state: HerbdexState,
  herbId: string,
  sightings: number,
): GrowTrack | null {
  if (!tracksMastery(herbId)) return null;
  const stage = stageFor(state, herbId);
  if (!stage) return null;

  const found = Boolean(state.discoveries[herbId]);
  const learned = Boolean(state.learned[herbId]);
  const logged = sightings >= SIGHTINGS_FOR_MASTERY;

  /*
   * THE ONE PLACE THE PANEL SAYS SOMETHING OTHER THAN AN INSTRUCTION.
   *
   * A sighting logged before the check is passed already satisfies mastery's third
   * condition, so "record a sighting" would be telling somebody to do a thing they have
   * done. The plant is one quiz away from flowering, and this is what says so.
   */
  const sightingNote =
    logged && !learned
      ? `${sightings} sighting${sightings === 1 ? '' : 's'} already logged — pass the card check and this plant will flower.`
      : 'Record a sighting in your Field Log to complete mastery.';

  const steps: Omit<GrowStep, 'current'>[] = [
    {
      id: 'found',
      label: 'Found in the wild',
      done: found,
      note: null,
    },
    {
      id: 'learn',
      label: 'Learn the card',
      done: learned,
      note: 'Pass its card check — every question comes from what this card prints.',
    },
    {
      id: 'sighting',
      label: 'Log a field sighting',
      done: logged,
      note: sightingNote,
    },
  ];

  // The first unfinished step is the one to act on. Once every step is done there is no
  // current step at all, which is what makes the finished panel show no action.
  const nextIndex = steps.findIndex((step) => !step.done);

  return {
    stage,
    complete: Boolean(state.mastered[herbId]),
    steps: steps.map((step, index) => ({ ...step, current: index === nextIndex })),
  };
}

/**
 * The label for the CTA that sends a player to the track, or `null` when it has nothing
 * left to offer.
 *
 * Null at `mastered`: a finished plant gets a state, not another call to action. The panel
 * says "Flowering — fully grown" where this button would have been.
 */
export function growCtaLabel(stage: MasteryStage): string | null {
  switch (stage) {
    case 'discovered':
      return 'Grow your sprite';
    case 'learned':
      return 'Keep growing';
    case 'mastered':
      return null;
  }
}
