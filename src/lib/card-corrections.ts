import type { Herb } from './types';

/**
 * A recommendation Plantdex has CHANGED from what the physical card prints.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A FOURTH LAYER AND NOT ONE OF THE THREE THAT EXIST.
 *
 *   `herb.warning`        a hazard the card itself prints. Transcribed, never invented.
 *   `KNOWN_CARD_ISSUES`   "your card is wrong" — a misprint, answered as a correction.
 *   `SITE_CAUTIONS`       "here is the risk" — a hazard the card does not carry.
 *   CARD_CORRECTIONS      "the card says to use this; we no longer recommend it."
 *
 * The fourth is a different sentence from all three. It is not a misprint — card #31's
 * reprinted back lists "Leaf" and "Shoot" deliberately, and the plate is not wrong about what
 * it meant to say. It is not only a risk either: a caution tells somebody what could happen,
 * while this tells them that the instruction they are reading has been WITHDRAWN. Somebody
 * holding the deck and reading the screen needs to know which of the two to follow, and
 * neither "your card has a typo" nor "elder leaves can harm you" answers that directly.
 *
 * THE TRANSCRIPTION IS NOT TOUCHED. `usableParts` still reads exactly as printed, because
 * that guarantee is what makes every other field trustworthy — a reader comparing card to
 * screen must never be left wondering which of the two was edited. The correction sits
 * ALONGSIDE the transcription and names the superseded parts; it never rewrites them.
 *
 * THE BAR. Same height as `SITE_CAUTIONS`: a specific, sourced, current-evidence reason to
 * stop recommending something the card prints. Not a place for preference, and not a place
 * for a risk that a caution already carries — if the card's instruction still stands and
 * merely needs a warning beside it, that is a caution and belongs there.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface CardCorrection {
  /** The printed values this supersedes, exactly as the card spells them. */
  readonly supersededParts: readonly string[];
  /** One sentence. It must say what the card says AND what Plantdex now recommends. */
  readonly message: string;
}

export const CARD_CORRECTIONS: Record<string, CardCorrection> = {
  '31': {
    supersededParts: ['Leaf', 'Shoot'],
    message:
      'Leaf and Shoot are listed as usable on the printed card. Plantdex no longer ' +
      'recommends those parts.',
  },
};

/** The withdrawn-recommendation correction for a card, if it has one. */
export function cardCorrectionFor(herb: Herb): CardCorrection | undefined {
  return CARD_CORRECTIONS[String(herb.cardNumber)];
}
