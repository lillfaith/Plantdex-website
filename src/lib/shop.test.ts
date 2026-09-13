import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PRINTED_DECK_SIZE, getPrintedCard } from './deck';
import {
  DECK_CARD_COUNT,
  INCLUDED,
  NOT_INCLUDED,
  PHYSICAL_CARD_COUNT,
  REFERENCE_CARD_COUNT,
  SHOWCASE_HERB_IDS,
  displayPrice,
  isShopConfigured,
  paymentLink,
  PRODUCT_HERO,
  PRODUCT_PHOTOS,
} from './shop';

/** Every .ts/.tsx file under src/, so a key cannot hide in a directory nobody listed. */
function sourceFiles(dir = 'src'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

describe('the checkout boundary', () => {
  it('contains no Stripe key of any kind', () => {
    /*
     * THE TEST THAT MATTERS FOR COMMERCE.
     *
     * A Payment Link needs no API key — not a secret one, and not a publishable one. So the
     * correct number of Stripe keys in this repository is zero, and anything that looks like
     * one is either a real leaked credential or the start of an integration that quietly
     * moves card handling onto this site. Both are worth failing a build over.
     *
     * Comments are stripped first: this file and shop.ts both discuss keys by name, and a
     * guard its own explanation can trip is a guard nobody keeps.
     */
    for (const path of sourceFiles()) {
      const source = strip(readFileSync(path, 'utf8'));
      expect(source, `${path} contains something shaped like a Stripe key`).not.toMatch(
        /\b(sk|pk|rk)_(test|live)_[A-Za-z0-9]{8,}/,
      );
      expect(source, `${path} references a Stripe secret key`).not.toMatch(
        /STRIPE_SECRET|STRIPE_API_KEY|stripeSecret/i,
      );
    }
  });

  it('loads no Stripe script and mounts no payment form', () => {
    /*
     * The buyer types their card number on Stripe's origin, never on ours. That is only true
     * while no Stripe.js is loaded here — the moment one is, card data is being handled by a
     * page this project serves, and the entire PCI position changes.
     */
    for (const path of sourceFiles()) {
      const source = strip(readFileSync(path, 'utf8'));
      expect(source, `${path} loads Stripe.js — checkout must stay on Stripe's own pages`).not.toMatch(
        /js\.stripe\.com|@stripe\/stripe-js|loadStripe|<CardElement/,
      );
    }
  });
});

describe('paymentLink()', () => {
  const original = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
    else process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK = original;
  });

  it('is absent until configured', () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
    expect(paymentLink()).toBeNull();
    expect(isShopConfigured()).toBe(false);
  });

  it('accepts a real Stripe link', () => {
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_abc123';
    expect(paymentLink()).toBe('https://buy.stripe.com/test_abc123');
  });

  it('refuses a link that is not Stripe-hosted', () => {
    /*
     * This value is the destination of the site's single most prominent button. A typo, a
     * copied-wrong variable or a tampered repo variable should turn the button OFF rather
     * than send buyers somewhere else with their card in hand — an open redirect on a page
     * that says "pay here" is about the worst shape this bug could take.
     */
    for (const hostile of [
      'https://buy-stripe.com/evil',
      'https://example.com/checkout',
      'http://buy.stripe.com/insecure',
      'javascript:alert(1)',
      'https://stripe.com.attacker.test/pay',
    ]) {
      process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK = hostile;
      expect(paymentLink(), `${hostile} was accepted as a payment link`).toBeNull();
    }
  });

  it('needs a price as well as a link before it will sell anything', () => {
    // Half-configured is the dangerous state: a buy button with no price, or a price with
    // nowhere to pay. Either would be a shopfront that cannot take money.
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_abc123';
    delete process.env.NEXT_PUBLIC_DECK_PRICE;
    expect(displayPrice()).toBeNull();
    expect(isShopConfigured()).toBe(false);
  });
});

describe('what the product page claims', () => {
  it('counts the cards from the deck rather than from a typed number', () => {
    expect(DECK_CARD_COUNT).toBe(PRINTED_DECK_SIZE);
    expect(DECK_CARD_COUNT).toBe(45);
    // Cards 46 (Icon Guide) and 47 (Disclaimer) are real cards a buyer receives and are not
    // herbs — scripts/build_deck.py skips them by number. Advertising "45 cards" for a
    // 47-card deck would be an inventory claim that is simply wrong.
    expect(REFERENCE_CARD_COUNT).toBe(2);
    expect(PHYSICAL_CARD_COUNT).toBe(47);
  });

  it('shows product photography that actually exists', () => {
    /*
     * The showcase is hard-coded ids pointing at GENERATED deck data. Rename a species in
     * scripts/build_deck.py and getPrintedCard() quietly returns undefined: a card disappears from
     * the product page with no error, or — if all three go — static generation crashes on an
     * empty array. Neither shows up in a build log as anything recognisable.
     *
     * The image files are checked too, because a card can exist in herbs.json while its
     * artwork does not, and a broken <img> on the page selling the artwork is its own kind
     * of bad.
     */
    expect(SHOWCASE_HERB_IDS.length).toBeGreaterThan(0);
    for (const id of SHOWCASE_HERB_IDS) {
      const herb = getPrintedCard(id);
      expect(herb, `showcase id "${id}" is not in the deck any more`).toBeDefined();
      expect(existsSync(`public/cards/${id}.webp`), `missing front art for ${id}`).toBe(true);
      expect(existsSync(`public/cards/back/${id}.webp`), `missing back art for ${id}`).toBe(true);
    }
  });

  it('ships every product photograph it names, in both variants', () => {
    /*
     * Same guard shape as the card art above, for the same reason: a page can name a file
     * that does not exist and the only symptom is a broken image on the page selling the
     * thing. Both variants are checked because the call sites differ — the hero names the
     * full-size file and the two-up names `thumb`, and a missing thumb breaks only the
     * smaller one, which is exactly the failure nobody notices in a desktop screenshot.
     */
    for (const photo of [PRODUCT_HERO, ...PRODUCT_PHOTOS]) {
      expect(
        existsSync(`public/product/${photo.file}.webp`),
        `missing display variant for ${photo.file}`,
      ).toBe(true);
      expect(
        existsSync(`public/product/thumb/${photo.file}.webp`),
        `missing thumb variant for ${photo.file}`,
      ).toBe(true);
      // Alt text is what a screen reader gets instead of the photograph, and a product page
      // whose images are unlabelled is selling to some people and not others.
      expect(photo.alt.length, `${photo.file} needs real alt text`).toBeGreaterThan(40);
      expect(photo.caption.length, `${photo.file} needs a caption`).toBeGreaterThan(10);
    }
  });

  it('carries no camera metadata in any published photograph', () => {
    /*
     * THE GUARD THAT MADE `build_product_photos.py` A SCRIPT RATHER THAN A RESIZE.
     *
     * A phone writes GPS into EXIF, and these are photographs of a product taken where its
     * owner lives — so an unprocessed one publishes the coordinates of a house, on a public
     * repository and a public site. It would also invert what /privacy tells players:
     * "Plantdex does not upload or store camera location metadata", enforced for their
     * photos by `image-prepare.ts` refusing anything it cannot re-encode. The owner's own
     * images are the last place that rule should lapse.
     *
     * Checked HERE and not only in the generator, because a property asserted solely by the
     * script that wrote the files is a property nobody re-checks — and the files are
     * committed, so a hand-dropped replacement never runs that script at all.
     *
     * Reads the container directly: a WebP carrying EXIF stores it in a chunk literally
     * named "EXIF", so its absence in the bytes is the whole assertion.
     */
    const files = [PRODUCT_HERO, ...PRODUCT_PHOTOS].flatMap((photo) => [
      `public/product/${photo.file}.webp`,
      `public/product/thumb/${photo.file}.webp`,
    ]);
    for (const file of files) {
      const bytes = readFileSync(file);
      expect(
        bytes.includes(Buffer.from('EXIF', 'ascii')),
        `${file} still carries an EXIF chunk — re-run npm run build:product`,
      ).toBe(false);
    }
  });

  it('promises nothing about the digital side that is not true', () => {
    /*
     * The digital Plantdex is free, unlocked and account-optional. A product page saying
     * otherwise — "unlock the app", "redeem your code", "premium access" — would be
     * inventing a product, and would also contradict the whole shape of the codebase.
     */
    const claims = [...INCLUDED, ...NOT_INCLUDED].join(' ');
    expect(claims).not.toMatch(/unlock|redeem|premium|activation|licen[cs]e key/i);

    const page = strip(readFileSync('src/app/shop/page.tsx', 'utf8'));
    expect(page).not.toMatch(/unlock the|redeem|premium|activation code/i);
  });

  it('makes no scarcity, stock or urgency claim', () => {
    // AGENTS.md forbids fabricated inventory claims outright, and a launch page is exactly
    // where "only 50 left" appears because it sells. Nobody has counted any stock.
    const page = strip(readFileSync('src/app/shop/page.tsx', 'utf8'));
    expect(page).not.toMatch(
      /only \d+ left|limited edition|selling fast|while stocks last|in stock|sold out|hurry|last chance/i,
    );
  });

  it('states no delivery time anywhere it has not been given one', () => {
    /*
     * The single likeliest fabrication on a commerce page. Every delivery claim has to come
     * from the owner via an OwnerGap, so a bare "ships in 3-5 days" in JSX is a bug.
     */
    for (const path of [
      'src/app/shop/page.tsx',
      'src/app/shop/thanks/page.tsx',
      'src/app/shipping/page.tsx',
    ]) {
      const page = strip(readFileSync(path, 'utf8'));
      expect(page, `${path} states an invented delivery time`).not.toMatch(
        /\d+\s*[-–to]+\s*\d+\s*(business\s*)?(days|weeks)|arrives? in \d|within \d+ days/i,
      );
    }
  });

  it('keeps the thank-you page free of order details it cannot verify', () => {
    /*
     * The page is static and has no Stripe secret, so anything it printed from the URL would
     * be unverified — a confirmation anybody could forge by editing a query string.
     */
    const page = strip(readFileSync('src/app/shop/thanks/page.tsx', 'utf8'));
    expect(page).not.toMatch(/searchParams|session_id|useSearchParams|order\s*#|orderNumber/i);
  });
});

/**
 * PAGES THAT DENY THE SHOP EXISTS.
 *
 * This repository has shipped this bug twice. `/terms` claimed "there is no shop, no checkout
 * and no payment processing anywhere in the application" after `/shop` shipped, and `/privacy`
 * denied analytics after Plausible was wired in; `legal.test.ts` guards both now. The landing
 * page was carrying the third instance — an unconditional sentence reading "the physical deck
 * is not on sale yet", printed to every visitor while `/shop` resolved the same fact from
 * configuration and would render an Order panel the moment the owner set the two variables.
 *
 * A first-time buyer arriving from a vendor-table QR would have read the landing page telling
 * them it was not for sale and the checkout offering to sell it. The failure is silent: no
 * test breaks, no build fails, and it only becomes visible on the single day the whole launch
 * depends on.
 */
describe('no page denies the sale while configuration can turn it on', () => {
  it('derives the landing page sale state instead of hard-coding it', () => {
    const page = readFileSync('src/app/page.tsx', 'utf8');
    const denial = /not on sale yet/;
    if (denial.test(page)) {
      // It may SAY it, but only as one branch of the same predicate `/shop` reads. A denial
      // with no conditional beside it is the bug.
      expect(
        page.includes('isShopConfigured'),
        'the landing page denies the sale unconditionally — derive it from isShopConfigured()',
      ).toBe(true);
    }
  });

  it('does not imply a live checkout on the sale terms while the shop is off', () => {
    /*
     * THE INVERSE OF THE RULE ABOVE, and it arrived the moment `commerce-terms` was answered.
     * A denial that outlives its configuration is one bug; an ASSERTION that outlives it is
     * the same bug pointing the other way, and the more expensive one — /terms-of-sale is a
     * page of contract-formation and payment language, so printing a bare price on it while
     * /shop says "Not on sale yet" tells a reader there is something to buy.
     *
     * Source-level, like its sibling: what matters is that the page RESOLVES the state from
     * the one function that owns it rather than stating a tense in prose.
     */
    const source = readFileSync('src/app/terms-of-sale/page.tsx', 'utf8');
    expect(source, '/terms-of-sale must resolve its sale state from isShopConfigured()').toMatch(
      /isShopConfigured\(\)/,
    );
    // And the settled price stays an owner input rather than being re-typed into the copy.
    expect(source).toMatch(/<OwnerGap id="commerce-terms" \/>/);
    expect(source, '/terms-of-sale hard-codes a price').not.toMatch(/\$\d+\.\d{2}/);
  });

  it('reads that state from the one function that owns it', () => {
    // Not a second copy of the environment check. `isShopConfigured` requires BOTH a
    // Stripe-validated link and a price, and a page testing only one of them would advertise
    // a checkout with no price on it, or a price with no way to pay.
    const page = readFileSync('src/app/page.tsx', 'utf8');
    expect(page).not.toContain('NEXT_PUBLIC_STRIPE_PAYMENT_LINK');
    expect(page).not.toContain('NEXT_PUBLIC_DECK_PRICE');
  });
});
