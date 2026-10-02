/**
 * Where a plant GREW, which identification tells you nothing about.
 *
 * Every other safety layer in this app answers "is this the right plant" or "is this plant
 * safe". This one answers neither, and that is why it needed its own text: a correctly
 * identified, entirely edible plant pulled off a sprayed verge is not safe, and nothing on a
 * card, in a scan result or in a lookalike warning says so. Contamination is a property of the
 * GROUND, and the only person who can assess it is the one standing on it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT APPEARS IN THREE PLACES AND MUST NOT SPREAD
 *
 *   1. /scan              — the one screen that is about where somebody is standing.
 *   2. Usable Parts       — on a plant profile, against the list of parts to eat or use.
 *   3. /safety            — folded into the existing "Where you pick matters as much as
 *                           what" practice item, NOT added as a second block beside it.
 *
 * Deliberately NOT: the global layout, the Herbdex grid, the Garden, the Seed Shelf, the
 * discovery celebration, or any card screen that does not list usable parts. This file's own
 * test enforces that, because the failure mode here is not omission — it is a warning pasted
 * onto every surface until it reads as furniture and people scroll past the one place it
 * mattered. That is the lesson the full disclaimer already taught this codebase: it was on
 * three pages, nobody read it by the third, and it now lives once at /safety.
 *
 * THE SEED SHELF IS EXCLUDED ON PURPOSE. It records species with no card, says nothing about
 * edibility or preparation, and tells the player so. A contamination warning there would be a
 * warning about an action that surface does not offer.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE WORDING IS NOT A GENERAL CAVEAT and must stay specific. It names the chemicals, and it
 * gives the rule for the ordinary case — not knowing — because "be careful of pesticides"
 * leaves a forager with a worry and no decision. "If you are unsure, do not consume it" is a
 * decision.
 */
export const CONTAMINATION_LABEL = 'Foraging safety';

export const CONTAMINATION_WARNING =
  'Avoid eating or using plants from areas that may have been treated with pesticides, ' +
  'herbicides, or other chemicals. If you’re unsure whether an area was sprayed, ' +
  'don’t consume the plant.';

/**
 * The surfaces allowed to render it, as module paths. Read by `foraging-safety.test.ts`,
 * which fails both ways: a surface here that stopped showing it, and any OTHER module that
 * started.
 *
 * A LIST RATHER THAN A CONVENTION, because "only show it where it belongs" is not something a
 * reviewer can check by eye across 54 profiles and twenty-odd routes, and the next person to
 * add a safety surface will reach for this text first.
 */
export const CONTAMINATION_SURFACES = [
  'src/app/scan/page.tsx',
  'src/components/herbdex/CardBackDetails.tsx',
  'src/app/safety/page.tsx',
] as const;
