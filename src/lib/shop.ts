import { DECK_SIZE } from './deck';

/**
 * THE DECK AS A PRODUCT.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTHING COMMERCIAL IS INVENTED HERE.
 *
 * AGENTS.md forbids fabricated pricing, shipping and inventory claims, and a product page
 * is exactly where those appear by accident: a plausible "£24.99", a friendly "ships in
 * 3–5 days", a confident "30-day returns" — none of which anybody decided. Every such value
 * is an owner input, and until one is supplied this module reports it as missing and the
 * page renders an honest "not yet on sale" state instead of a shopfront that cannot take
 * money.
 *
 * WHY THE PAYMENT LINK IS THE SWITCH. A Stripe Payment Link holds the real price, the real
 * currency and the real shipping countries — Stripe is the system of record for all three.
 * If no link exists there is no product to sell, so there is nothing truthful to print. One
 * environment variable therefore gates the entire commercial half of the page, exactly as
 * `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` gates analytics and the Supabase pair gates accounts.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS *NOT* A PLACEHOLDER. The deck's contents are real and verifiable from this
 * repository — the card count, the card list, the artwork, what is printed on a card. Those
 * are stated plainly, because they are the honest half of a product page and they are the
 * half a buyer actually needs.
 */

/** The number of cards a buyer receives — read from the deck, never typed by hand. */
export const DECK_CARD_COUNT = DECK_SIZE;

/**
 * The two reference cards that ship with the deck but are not species.
 *
 * Card 46 is the Icon Cheat Sheet and card 47 the Disclaimer; both are transcribed in
 * `scripts/build_deck.py` and neither is a plant, which is why `DECK_SIZE` is 45 and the
 * physical deck is 47 cards. Saying "45 cards" on a product page for a 47-card deck would
 * be an inventory claim that is wrong in the buyer's favour to discover, so both numbers
 * are stated.
 */
export const REFERENCE_CARD_COUNT = 2;
export const PHYSICAL_CARD_COUNT = DECK_CARD_COUNT + REFERENCE_CARD_COUNT;

/**
 * The Stripe Payment Link, e.g. `https://buy.stripe.com/xxxxxxxx`.
 *
 * Public by design: a Payment Link is a URL meant to be shared, it carries no secret, and
 * Stripe hosts the page it opens. No Stripe API key — publishable or secret — appears
 * anywhere in this application, because Payment Links need none. That is the entire reason
 * this option was chosen over a custom integration.
 */
export function paymentLink(): string | null {
  const link = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK?.trim();
  if (!link) return null;
  // Only ever a Stripe-hosted URL. A misconfiguration should fail closed rather than turn
  // the site's primary call to action into an open redirect somebody else controls.
  return /^https:\/\/(buy\.stripe\.com|[a-z0-9-]+\.stripe\.com)\//.test(link) ? link : null;
}

/**
 * The displayed price, as a complete formatted string including its currency, e.g. `$24.99`.
 *
 * Deliberately a string rather than a number plus a currency code: the owner sets exactly
 * what appears, so there is no rounding, no locale guess and no chance of the page inventing
 * a currency symbol for an amount Stripe will charge in a different one. It must match the
 * Payment Link's own price, which is why both are set together.
 */
export function displayPrice(): string | null {
  const price = process.env.NEXT_PUBLIC_DECK_PRICE?.trim();
  return price ? price : null;
}

/** True only when there is both something to sell and a price to print for it. */
export function isShopConfigured(): boolean {
  return paymentLink() !== null && displayPrice() !== null;
}

/**
 * What a buyer receives, and what they do not.
 *
 * Every line is checkable against this repository. The digital half is stated as free and
 * account-optional because it is: the Herbdex works signed out and nothing here is gated
 * behind a purchase, and implying otherwise would be inventing a product.
 */
export const INCLUDED: readonly string[] = [
  `${DECK_CARD_COUNT} illustrated species cards, each printed front and back`,
  'An icon cheat sheet card explaining every symbol on a card face',
  'A disclaimer card carrying the deck’s safety wording',
  'Free use of the digital Plantdex — no account required, and nothing to enter',
];

export const NOT_INCLUDED: readonly string[] = [
  'No subscription, and no part of the digital Plantdex is behind a paywall',
  'No app to install — the Plantdex is a website',
];
