import { DECK } from './deck';
import type { Herb } from './types';

/**
 * Errors on the physical cards, as recorded by `scripts/build_deck.py`'s
 * `KNOWN_CARD_ISSUES` and carried through into the generated deck data.
 *
 * Every herb field is transcribed from the card exactly as printed, including where the
 * card is wrong — CLAUDE.md requires that, so a reader comparing card to screen is never
 * left wondering which of the two lied to them. The consequence is that three cards show
 * ANOTHER PLANT'S profile in good faith: #11 carries dandelion's back, and #24 and #31
 * both carry sumac's.
 *
 * Recording that in generated data was enough while the deck was unprinted, because the
 * fix was going to be the next print run. The deck is in production, so it is not: the
 * site is now the only place these can be corrected, and a note nobody renders corrects
 * nothing.
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
