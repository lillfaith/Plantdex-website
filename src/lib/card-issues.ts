import { DECK } from './deck';
import type { Herb } from './types';

/**
 * Errors on the physical cards, as recorded by `scripts/build_deck.py`'s
 * `KNOWN_CARD_ISSUES` and carried through into the generated deck data.
 *
 * Every herb field is transcribed from the card exactly as printed, including where the
 * card is wrong — CLAUDE.md requires that, so a reader comparing card to screen is never
 * left wondering which of the two lied to them.
 *
 * Recording that in generated data was enough while the deck was unprinted, because the
 * fix was going to be the next print run. The deck is in production, so it is not: the
 * site is now the only place these can be corrected, and a note nobody renders corrects
 * nothing.
 *
 * WHAT IS LEFT AFTER THE AUGUST REPRINT. Three cards used to show another plant's profile
 * in good faith — #11 carried dandelion's back, #24 and #31 both carried sumac's — and all
 * three were corrected on the card, so their entries went with the new transcription. An
 * entry is removed only when the printed card is genuinely fixed; removing one to tidy the
 * list would have this module deny an error still in somebody's hands.
 *
 * Of the three that remain, #2 and #38 are typos. **#31 is not**: the reprinted back lists
 * "Leaf" and "Shoot" among usable parts, which is a hazard rather than a misprint, so it is
 * the one entry paired with a `SITE_CAUTIONS` entry in `card-cautions.ts`. The two are
 * deliberately separate and both render — this note answers "is my card wrong?", the
 * caution answers "what is the risk?", and neither substitutes for the other.
 *
 * WHY THIS IS NOT IN `deck.ts`. That module is copied verbatim into
 * `supabase/functions/_shared/herbdex/` by `npm run sync:edge-shared`, so anything added
 * to it has to be re-synced and the edge function redeployed. The server has no use for
 * what a card misprinted — this is presentation — so it lives outside the synced set and
 * costs no deploy.
 */
export const KNOWN_CARD_ISSUES: Record<string, string> = DECK.knownCardIssues;

/** The recorded printing error for a card, if one was found. */
export function knownIssueFor(herb: Herb): string | undefined {
  return KNOWN_CARD_ISSUES[String(herb.cardNumber)];
}
