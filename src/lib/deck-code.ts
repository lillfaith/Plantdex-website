/**
 * The activation code printed inside a physical deck: its shape, and the one normalisation
 * every layer must agree on.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS LOGIC EXISTS THREE TIMES, AND THAT IS A DELIBERATE, TESTED DUPLICATION.
 *
 *   • here, for the browser (the redemption form validates before sending);
 *   • in `supabase/functions/redeem-deck-code`, which does the hashing (Deno cannot import
 *     from `src/lib` — that is what `npm run sync:edge-shared` exists for, and a single
 *     eight-line function does not earn a place in the synced graph);
 *   • in `scripts/mint_deck_codes.py`, which hashes the same string when minting.
 *
 * IF THE THREE DRIFT, A VALID CODE HASHES TO SOMETHING THE DATABASE HAS NEVER SEEN. The
 * buyer is told their code is invalid, nothing errors anywhere, no log records a problem,
 * and there is no way for them to tell it from a code that really is bad. That is the worst
 * failure available in this feature, so `deck-code.test.ts` runs all three against one
 * corpus and fails on any disagreement.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY CROCKFORD BASE32. Somebody is reading sixteen characters off a card, by hand, possibly
 * in bad light. The alphabet omits I, L, O and U, so the two confusable groups — 1/I/L and
 * 0/O — cannot both appear in a code, and `normaliseCode` folds the letters onto the digits
 * on the way in. A person who types the letter O for a zero still redeems successfully.
 *
 * WHY SIXTEEN CHARACTERS. Ten random bytes is eighty bits, and eighty bits is exactly
 * sixteen base32 characters with nothing left over — the code IS the entropy rather than a
 * truncation of a larger draw. 2^80 is 1.2e24, which with the redemption endpoint's daily
 * limit makes enumeration a load question rather than a security one.
 */

/** Crockford's alphabet: the digits and the consonants, without I, L, O or U. */
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** How many characters a code carries after normalisation. */
export const CODE_LENGTH = 16;

/** What a code looks like on the card. */
export const CODE_EXAMPLE = 'PLNT-XXXX-XXXX-XXXX-XXXX';

/** A normalised code, and nothing else. */
export const CODE_PATTERN = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{16}$/;

/**
 * The exact string that gets hashed, on minting and on redemption alike.
 *
 * Accepts the code however somebody presents it — lower case, without the hyphens, with
 * the prefix or without, with stray spaces from a paste — and with the letters that
 * Crockford reserves folded onto their digits.
 */
export function normaliseCode(input: string): string {
  let cleaned = input.trim().toUpperCase().replaceAll('-', '').replaceAll(' ', '');
  if (cleaned.startsWith('PLNT')) cleaned = cleaned.slice(4);
  return cleaned.replaceAll('I', '1').replaceAll('L', '1').replaceAll('O', '0');
}

/** Whether this is something worth sending to the server at all. */
export function looksLikeCode(input: string): boolean {
  return CODE_PATTERN.test(normaliseCode(input));
}
