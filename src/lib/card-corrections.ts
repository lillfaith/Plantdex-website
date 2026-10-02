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
  /**
   * The correction itself. It must say what the card prints, that the card is WRONG about
   * it, and what to do instead.
   *
   * IT MUST NOT SAY WHAT PLANTDEX "NO LONGER RECOMMENDS". Any phrasing of that shape implies
   * the printed text was once a valid recommendation that has since been revised, and these
   * corrections exist for the opposite case: the card is simply mistaken, and was from the
   * moment it was printed.
   */
  readonly message: string;
  /**
   * Whether this replaces the card's `KNOWN_CARD_ISSUES` note on screen.
   *
   * THE DATA ENTRY IS NEVER REMOVED — the printed card is still wrong, and CLAUDE.md allows
   * an entry to go only when a reprint genuinely fixes it. This is a PRESENTATION decision:
   * where a correction already states the error and the remedy in one authoritative block,
   * rendering the note underneath explains the same mistake a second time, and a reader who
   * meets the same fact twice trusts both tellings slightly less.
   *
   * Declared per card rather than inferred, because a card could carry an unrelated misprint
   * that a correction about something else must not silently hide.
   */
  readonly supersedesCardIssue?: boolean;
}

export const CARD_CORRECTIONS: Record<string, CardCorrection> = {
  /*
   * THE CARD IS WRONG, AND THE CORRECTION SAYS SO IN THOSE WORDS.
   *
   * TWO DRAFTS BOTH IMPLIED THE PARTS WERE ONCE VALID. The first said Plantdex "no longer
   * recommends those parts"; the second named the error but still closed on "Plantdex no
   * longer recommends them". Both describe a revised recommendation. There was never a
   * recommendation to revise — elder leaves and green shoots are not edible, and their
   * appearance on the card was a printing mistake from the moment it was printed.
   *
   * So the message now does exactly two things: it names the error, and it forbids the use.
   * Nothing about Plantdex's preferences, because the preference was never the point.
   *
   * It is the single authoritative statement of this mistake on the page: the
   * `KNOWN_CARD_ISSUES` note is superseded on screen (see the flag), and the site caution
   * below it no longer repeats the leaf-and-shoot half at all — that caution is about
   * preparing the parts that ARE usable.
   */
  '31': {
    supersededParts: ['Leaf', 'Shoot'],
    message:
      'The printed Elderberry card incorrectly lists Leaf and Shoot as edible/usable parts. ' +
      'Do not eat or use these parts.',
    supersedesCardIssue: true,
  },
};

/** The withdrawn-recommendation correction for a card, if it has one. */
export function cardCorrectionFor(herb: Herb): CardCorrection | undefined {
  return CARD_CORRECTIONS[String(herb.cardNumber)];
}
