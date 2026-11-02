import { PRINTED_DECK_SIZE } from './deck';
import { LEGAL_STATUS } from './legal';

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
 * `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_ID` gates analytics and the Supabase pair gates accounts.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS *NOT* A PLACEHOLDER. The deck's contents are real and verifiable from this
 * repository — the card count, the card list, the artwork, what is printed on a card. Those
 * are stated plainly, because they are the honest half of a product page and they are the
 * half a buyer actually needs.
 */

/** The number of cards a buyer receives — read from the deck, never typed by hand. */
export const DECK_CARD_COUNT = PRINTED_DECK_SIZE;

/**
 * The two reference cards that ship with the deck but are not species.
 *
 * Card 46 is the Icon Cheat Sheet and card 47 the Disclaimer; both are transcribed in
 * `scripts/build_deck.py` and neither is a plant, which is why `PRINTED_DECK_SIZE` is 45 and the
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

/**
 * The price divided by the number of cards, formatted like the price itself, e.g. `$0.53`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ARITHMETIC ON THE OWNER'S OWN FIGURES, NEVER A FIGURE OF ITS OWN.
 *
 * A product page is asked to justify its price, and the honest way to do that here is to
 * restate what the owner already set, divided by a count read from the deck. Both inputs
 * are real: `displayPrice()` is the string the owner typed and must match Stripe, and
 * `PHYSICAL_CARD_COUNT` comes from the deck data. So this cannot drift from the price being
 * charged — change the Payment Link's price and this follows on the next build.
 *
 * IT RETURNS NULL RATHER THAN GUESSING, and that is the whole reason it parses so strictly.
 * The price is deliberately a free-form string so the owner controls exactly what appears,
 * which means it may be `$24.99`, `£24.99`, `24,99 €` or `CA$24.99`. Only a leading-symbol
 * form with a dot decimal is understood; anything else gives null and the page simply omits
 * the line. A per-card figure in the wrong currency, or built by assuming a decimal
 * separator, would be a fabricated price claim — exactly what this module exists to
 * prevent — and it would appear right beside a real one, which is worse than silence.
 *
 * Deliberately NOT rounded up to a prettier number, and not expressed in minor units: `53¢`
 * is only correct for some of the currencies this could be, and a cent symbol on a pound
 * price is the same class of error.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function pricePerCard(): string | null {
  const price = displayPrice();
  if (!price) return null;
  // One optional symbol or code, then a plain decimal amount. No thousands separators: a
  // deck costing four figures is not a state to guess a grouping convention for.
  const match = /^([^\d\s]{1,3})\s?(\d+(?:\.\d{1,2})?)$/.exec(price);
  if (!match) return null;
  const [, symbol, amount] = match;
  const per = Number(amount) / PHYSICAL_CARD_COUNT;
  if (!Number.isFinite(per) || per <= 0) return null;
  return `${symbol}${per.toFixed(2)}`;
}

/**
 * True only when there is both something to sell and a price to print for it.
 *
 * CONFIGURED IS NOT LIVE. This answers one question — are the Stripe variables set and
 * valid — and deliberately keeps answering only that, so the two halves of the decision stay
 * separately testable. `isCommerceLive()` is what surfaces ask.
 */
export function isShopConfigured(): boolean {
  return paymentLink() !== null && displayPrice() !== null;
}

/**
 * Whether the deck may actually be SOLD: configured, and governed by terms that are in force.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE GAP THIS CLOSES. `/shop` was gated on configuration alone, so setting two repository
 * variables would have put a live checkout on a site whose own Terms of Sale carry a
 * "Draft — not yet in force" banner and say so in the first thing a reader sees. Two
 * settings in a dashboard, no code change, no review — and a buyer handing over a card
 * under terms the seller has published as not yet applying to anything.
 *
 * It is the same shape this repository has shipped three times and caught three times:
 * `/terms` denying the shop, `/privacy` denying analytics, the landing page denying the
 * sale. Each was a page asserting one thing while configuration asserted another. This is
 * that bug with the polarity reversed — configuration turning the sale ON while the pages
 * still say it is off — which is the more expensive direction, because the contradiction is
 * discovered by somebody at a checkout rather than by somebody reading.
 *
 * IT DEPENDS ON `LEGAL_STATUS`, NOT ON ANY GAP'S NAME. That is the whole point: the registry
 * is free to gain a blocking input or a `reviewRecommended` tomorrow, and commerce gates
 * itself on it with no edit here. Naming `legal-entity` or `liability` would gate on today's
 * list and silently stop gating the moment the list changed.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function isCommerceLive(): boolean {
  return isShopConfigured() && LEGAL_STATUS !== 'draft';
}

/**
 * The Payment Link, but only when the deck may actually be sold.
 *
 * WHY THIS EXISTS RATHER THAN A GUARD AT EACH CALL SITE. `paymentLink()` reads configuration
 * and knows nothing about whether selling is permitted, so every future component rendering
 * a buy button would have to remember to check `isCommerceLive()` first — and the one that
 * forgot would ship a working checkout under draft terms, which is precisely the failure
 * being designed out. Rendering surfaces call this; nothing renders `paymentLink()` into an
 * href. `shop.test.ts` fails on any component that does.
 *
 * Same reasoning as `prepareImage` having no path that returns original bytes: make the
 * unwanted state unrepresentable rather than documented.
 *
 * WHAT THIS DOES AND DOES NOT REMOVE FROM THE BUILD, measured rather than assumed. Built with
 * both Stripe variables set while `LEGAL_STATUS` is draft: ZERO HTML files carry the URL and
 * zero `href`s point at Stripe, so nothing a reader can click exists. The literal DOES still
 * appear once, in the `DeckCta` client chunk — `DeckCta` is `'use client'` and imports this
 * module, and Next inlines every `NEXT_PUBLIC_*` it can reach at build time, exactly as it
 * does for the Supabase pair. That is a property of the variable, not a leak past this gate:
 * a Payment Link is a public shareable URL carrying no secret. But it is DISCOVERABLE by
 * reading the bundle, so "the link is not in the build" would be false and must not be
 * claimed. Removing it entirely means resolving the state in a server component and passing
 * a boolean into `DeckCta` — a change to four call sites, worth doing only if the link must
 * be unfindable rather than merely unofferable.
 */
export function checkoutLink(): string | null {
  return isCommerceLive() ? paymentLink() : null;
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
  'A companion world online — log what you find, grow a garden, track a collection',
];

/**
 * WHAT ELSE IS IN THE BOX, kept separate from `INCLUDED` on purpose.
 *
 * `INCLUDED` promises that every line is checkable against this repository — the card count
 * comes from the deck data, the companion site is this codebase. A pack-in is not checkable
 * that way: it is a physical object the owner puts in an envelope, and the only thing
 * standing behind it is that they did. Folding these into that list would quietly weaken a
 * guarantee the rest of the page depends on, so they get their own section and their own
 * wording.
 *
 * THE PHOTOGRAPH IS OPTIONAL, AND THAT IS A REAL STATE RATHER THAN AN OVERSIGHT. An item
 * with no `file` renders as text alone, which is what honesty looks like before the owner
 * has photographed the thing: the alternative is a stock image of a product nobody has
 * confirmed is the one that ships. Same reasoning as `FieldCardSlot.card` staying optional
 * with every card drawn — the type describes the state something passes through.
 *
 * THE PHOTOGRAPH MAY SHOW MORE THAN SHIPS, AND THE COPY HAS TO SAY SO. These are stock
 * shots of multi-packs: twenty pouches, sixty stickers, a whole card collection. Two of
 * each go in a box. The images are cropped down so they do not read as a bulk pack, and
 * every `detail` states the number in words — because a photograph is the thing a buyer
 * actually counts, and no crop can carry "two" on its own. `shop.test.ts` fails if an
 * item's copy stops naming its quantity.
 *
 * A PRODUCT PHOTO HERE SHOULD BE THE OWNER'S OWN. Pulling a seller's image off a marketplace
 * listing and republishing it on a storefront is someone else's copyrighted photograph doing
 * the selling, and `shop.test.ts` cannot detect that — only this comment and the person
 * adding the file can.
 */
export interface BonusItem {
  /** Basename under /product, without extension. Absent until it has been photographed. */
  readonly file?: string;
  readonly title: string;
  readonly detail: string;
  readonly alt?: string;
}

export const BONUS_ITEMS: readonly BonusItem[] = [
  {
    file: 'bonus-trading-card',
    title: 'A real trading card from the game that started it',
    detail:
      'Plantdex is a love letter to the Pokémon cards a lot of us grew up on, so every deck ships with one genuine card tucked inside. The photograph is the collection it comes out of — which card you get depends on what is in the box that day.',
    alt: 'Three fanned stacks of Pokémon trading cards, the collection the included card is drawn from',
  },
  {
    file: 'bonus-pouches',
    title: 'Two holographic pouches',
    detail:
      'Two of them, pink, about the size of a card. For seeds, petals, a pressed leaf — whatever comes home in a pocket. The start of a collection you keep off the screen.',
    alt: 'A pink holographic zip pouch photographed beside others in the same range',
  },
  {
    file: 'bonus-stickers',
    title: 'Two herbalism stickers',
    detail:
      'Two, pulled from a sheet of designs like these. For a water bottle, a field notebook, the lid of a jar. Yours to put somewhere.',
    alt: 'A cluster of botanical and herbalism stickers',
  },
];

/**
 * Stated wherever the trading card is mentioned.
 *
 * IT SAID "unopened-from-pack" AND THAT WAS NOT TRUE. Caught by screenshotting the page
 * rather than by reading it: the photograph directly above the sentence shows loose cards,
 * sorted and sleeved, plainly out of their packs long ago. A disclaimer is the last place
 * that can afford a detail nobody checked, and this one was contradicted by the picture it
 * sits under.
 *
 * Naming another company's product to say truthfully what is in the box is one thing;
 * letting a buyer infer that company had anything to do with this deck is another, and the
 * line between them is a sentence. `shop.test.ts` fails if the card is described without it.
 */
export const BONUS_DISCLAIMER =
  'Plantdex is not affiliated with, endorsed by or sponsored by Nintendo, Game Freak or The Pokémon Company. The included card is an authentic card from the owner\u2019s own collection, passed on as-is; no part of this deck reproduces their artwork.';

/**
 * The cards shown as product photography, in order.
 *
 * Here rather than inline in the page so a test can assert they all still resolve. They are
 * hard-coded ids pointing at generated deck data: if a species is ever renamed, `getPrintedCard`
 * quietly returns undefined, a card vanishes from the product page and nobody notices — or,
 * if all three go, static generation crashes on an empty array. `shop.test.ts` fails first.
 *
 * Chosen for contrast: a yellow composite, a white umbel and a tree, so the strip shows the
 * deck's range rather than three variations on a dandelion.
 */
export const SHOWCASE_HERB_IDS = [
  'taraxacum-officinale',
  'achillea-millefolium',
  'quercus-spp',
] as const;

/**
 * PHOTOGRAPHS OF THE ACTUAL PRINTED DECK.
 *
 * The card images beside these are RENDERS — the same generated artwork the site draws
 * everywhere else. They show what is printed; they cannot show what arrives. A photograph of
 * the object in a hand, outdoors, is the one claim a render structurally cannot make, and it
 * is the claim a buyer is actually weighing.
 *
 * Three, each saying something the other two do not: what you get, that it is a real object
 * with heft, and that the backs are printed too.
 *
 * THE SET LOST ITS "WHAT IT IS FOR" FRAME and that is worth knowing rather than discovering.
 * The photograph it replaced held three cards up beside a living red clover — the one image
 * that showed the deck doing its job next to the plant it describes. It went because it was
 * the weakest frame in the set by some distance: soft throughout, apparently a video still,
 * with the cards themselves out of focus. A sharp photograph of the deck beside the plant it
 * names would be the best single image on this page, and there is currently none.
 *
 * Dimensions are the built output, not the source, because `images.unoptimized` is forced by
 * `output: 'export'` and a wrong intrinsic size is a layout shift nothing corrects. Generated
 * by `npm run build:product` from `product-source/`; `shop.test.ts` fails if a file named here
 * is missing, and — the reason that script exists — if any of them carries EXIF.
 */
export interface ProductPhoto {
  /** Basename under /product and /product/thumb, without the extension. */
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly caption: string;
}

export const PRODUCT_HERO: ProductPhoto = {
  file: 'deck-fanned',
  width: 1100,
  height: 954,
  alt:
    'A fan of cards from the deck laid on grass with their fronts showing \u2014 among them ' +
    'Purple Dead Nettle, Oak, Goldenrod, Wild Violet, Red Clover, Dandelion and Honeysuckle ' +
    '\u2014 with a second stack of cards beside them.',
  caption: 'The printed deck, outdoors where it is meant to be used.',
};

export const PRODUCT_PHOTOS: readonly ProductPhoto[] = [
  {
    file: 'deck-in-hand',
    width: 600,
    height: 772,
    alt:
      'The deck held in one hand over grass, seen from the side so the stacked card edges are ' +
      'visible with sunlight across them. The Dandelion card is on top.',
    caption: 'The deck in hand, edges catching the sun.',
  },
  {
    file: 'card-backs',
    width: 600,
    height: 842,
    alt:
      'Cards fanned with their backs showing, each printed with healing traits, signature ' +
      'compounds, taste and aromatic profiles, preparations and usable parts. The deck\u2019s ' +
      'disclaimer card is among them.',
    caption: 'The backs, as printed.',
  },
];

/**
 * Why somebody would want the deck.
 *
 * REWRITTEN AT THE OWNER'S REQUEST, and the previous note here said these were "the owner's
 * words, verbatim" and "not ours to rewrite". That was true of the first draft and is not a
 * standing rule: the owner asked for copy that argues the deck's value rather than listing
 * its features. What IS standing is everything below.
 *
 * EVERY CLAIM IS CHECKABLE AGAINST THIS REPOSITORY OR IS NOT MADE. The counts come from the
 * deck data. What a card prints is what `herbs.json` holds — a portrait, both names, the
 * season and rarity on the front; traits, compounds, taste, aroma, usable parts and
 * traditional preparations on the back. The collection ladder is the real one
 * (`mastery.ts`). Nothing here describes a card nobody printed.
 *
 * WHAT THEY MAY NEVER BECOME:
 *   * A HEALTH CLAIM. "Healing Traits" is the deck's own heading for traditional use and
 *     the furthest any of this goes — a plant treating, curing or relieving anything may
 *     not be said here in any phrasing.
 *   * A SAFETY CLAIM. This deck is not an identification authority and must never be sold
 *     as one: no line may suggest it makes foraging, eating or preparing a wild plant safe,
 *     or that a card confirms what something is. That is the one place value-oriented copy
 *     could do real harm, so it is the one place the page understates rather than sells.
 *   * A SCARCITY, STOCK OR DELIVERY CLAIM. Nobody has counted any stock.
 *
 * `shop.test.ts` enforces all three. It did not before this rewrite, although the note here
 * claimed it did — a prohibition asserted in a comment and nowhere else.
 */
export interface SellingPoint {
  readonly lead: string;
  readonly body: string;
}

export const DECK_SELLING_POINTS: readonly SellingPoint[] = [
  {
    lead: 'You walk past dozens of wild species a day and can probably name three.',
    body:
      'That is not ignorance, it is a missing index. The deck is built from the plants you ' +
      'genuinely encounter rather than the rarities a field guide opens with \u2014 so the ' +
      'first card you use is for something growing within a minute of your door, and the ' +
      'walk you already take stops being scenery.',
  },
  {
    lead: 'A field guide stays on the shelf. A deck goes in a pocket.',
    body:
      'Six hundred indexed pages are for checking at home, afterwards, which is why they ' +
      'are rarely in your hand at the moment you want them. ' +
      `All ${DECK_CARD_COUNT + REFERENCE_CARD_COUNT} cards together weigh nothing, need no ` +
      'signal and no battery, and can be handed to somebody else while you both look at the ' +
      'same leaf.',
  },
  {
    lead: 'Printed on both sides, because recognising a plant is not the same as knowing it.',
    body:
      'The front carries the portrait, both names, and when and how often you can expect ' +
      'to meet it. The back carries the traits it is known for, its signature compounds, ' +
      'its taste and aroma, the parts people use and how it has traditionally been ' +
      'prepared. That is the difference between naming a plant and having something to ' +
      'say about it.',
  },
  {
    lead: 'It gives an ordinary walk a point.',
    body:
      'The cards are collectible, and finding the plant outdoors is what makes one yours ' +
      'here \u2014 discovered, then learned, then mastered. The deck is the reason to go ' +
      'and look; the collection is what remembers that you did. It is the rare collectible ' +
      'that can only be completed outdoors.',
  },
];

export const NOT_INCLUDED: readonly string[] = [
  'No subscription — Plantdex online is free to everyone, cards or no cards',
  'No app to install — the Plantdex is a website',
];
