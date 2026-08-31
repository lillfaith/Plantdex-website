import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DECK_SIZE } from './deck';
import {
  DECK_CARD_COUNT,
  INCLUDED,
  NOT_INCLUDED,
  PHYSICAL_CARD_COUNT,
  REFERENCE_CARD_COUNT,
  displayPrice,
  isShopConfigured,
  paymentLink,
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
    expect(DECK_CARD_COUNT).toBe(DECK_SIZE);
    expect(DECK_CARD_COUNT).toBe(45);
    // Cards 46 (Icon Guide) and 47 (Disclaimer) are real cards a buyer receives and are not
    // herbs — scripts/build_deck.py skips them by number. Advertising "45 cards" for a
    // 47-card deck would be an inventory claim that is simply wrong.
    expect(REFERENCE_CARD_COUNT).toBe(2);
    expect(PHYSICAL_CARD_COUNT).toBe(47);
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
