import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * COMMERCE IS GATED ON THE LEGAL STATE, NOT ONLY ON CONFIGURATION.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `/shop` used to be gated on `isShopConfigured()` alone, so setting two repository
 * variables would have opened a live checkout on a site whose own Terms of Sale carry a
 * "Draft — not yet in force" banner. Two settings in a dashboard, no code change, no review,
 * and a buyer handing over a card under terms the seller has published as not yet applying.
 *
 * It is the shape this repository has shipped and caught three times — `/terms` denying the
 * shop, `/privacy` denying analytics, the landing page denying the sale — with the polarity
 * reversed. Configuration turning the sale ON while the pages say it is off is the more
 * expensive direction, because the contradiction is met by somebody at a checkout rather
 * than by somebody reading.
 *
 * `LEGAL_STATUS` is mocked here rather than driven through the registry. The point is the
 * GATE, and a test that answered its question by emptying `OWNER_INPUTS` would be asserting
 * something about today's gap list instead — which is exactly the coupling the gate avoids.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const LINK = 'https://buy.stripe.com/test_abc123';

/**
 * Load `shop.ts` with `LEGAL_STATUS` forced and the Stripe variables set or cleared.
 *
 * `resetModules` because both the constant and the module reading it are resolved at import;
 * without it every case after the first answers with whichever state imported first.
 */
async function loadShop({ legal, configured }: { legal: 'draft' | 'published'; configured: boolean }) {
  vi.resetModules();
  vi.doMock('./legal', async () => ({
    ...(await vi.importActual<typeof import('./legal')>('./legal')),
    LEGAL_STATUS: legal,
  }));
  if (configured) {
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK = LINK;
    process.env.NEXT_PUBLIC_DECK_PRICE = '$24.99';
  } else {
    delete process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
    delete process.env.NEXT_PUBLIC_DECK_PRICE;
  }
  return import('./shop');
}

describe('a checkout needs configuration AND terms in force', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
    vi.doUnmock('./legal');
    vi.resetModules();
  });

  it('stays unavailable while the legal pages are a draft, however configured', async () => {
    const shop = await loadShop({ legal: 'draft', configured: true });
    // Configuration really is complete — this is the dangerous state, not a half-set one.
    expect(shop.isShopConfigured()).toBe(true);
    expect(shop.isCommerceLive()).toBe(false);
    expect(shop.checkoutLink()).toBeNull();
  });

  it('stays unavailable while the Stripe variables are missing, however settled the law', async () => {
    const shop = await loadShop({ legal: 'published', configured: false });
    expect(shop.isShopConfigured()).toBe(false);
    expect(shop.isCommerceLive()).toBe(false);
    expect(shop.checkoutLink()).toBeNull();
  });

  it('becomes available only when both halves are true', async () => {
    const shop = await loadShop({ legal: 'published', configured: true });
    expect(shop.isCommerceLive()).toBe(true);
    expect(shop.checkoutLink()).toBe(LINK);
  });

  it('withholds the link itself, not just the button', async () => {
    /*
     * THE HREF IS THE THING THAT MATTERS. A branch that hides a button still leaves a real
     * Stripe URL in the module for the next component to render, and a static export ships
     * whatever a component names. `checkoutLink()` returning null is what makes a live
     * checkout URL unrepresentable while the terms are a draft — the same reasoning as
     * `prepareImage` having no path that returns original bytes.
     */
    const draft = await loadShop({ legal: 'draft', configured: true });
    // The raw reader still sees it — that is its job, and why the gate is a second function.
    expect(draft.paymentLink()).toBe(LINK);
    expect(draft.checkoutLink()).toBeNull();
  });
});

describe('legal review alone no longer holds commerce shut', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
    vi.doUnmock('./legal');
    vi.resetModules();
  });

  /*
   * THE OWNER DOWNGRADED REVIEW FROM BLOCKER TO RECOMMENDATION, which moves LEGAL_STATUS to
   * 'published' with every blocking input answered. These two pin what that did and did NOT
   * change: the Stripe half of the gate is untouched and is now the only thing standing
   * between here and a live checkout.
   */

  it('still refuses to sell with the Stripe variables missing', async () => {
    const shop = await loadShop({ legal: 'published', configured: false });
    expect(shop.isShopConfigured()).toBe(false);
    expect(shop.isCommerceLive()).toBe(false);
    expect(shop.checkoutLink()).toBeNull();
  });

  it('sells once the law is settled and the variables are valid', async () => {
    const shop = await loadShop({ legal: 'published', configured: true });
    expect(shop.isCommerceLive()).toBe(true);
    expect(shop.checkoutLink()).toBe(LINK);
  });

  it('keeps the gate a conjunction, not a single condition', () => {
    /*
     * With `LEGAL_STATUS` now 'published' in the real registry, the legal half of this
     * expression is true for every caller — so a refactor that dropped it would break
     * nothing today and quietly remove the guard that exists for the day a blocking input
     * returns. Read from the source, because no runtime assertion can see a term that is
     * currently always true.
     */
    const shop = readFileSync('src/lib/shop.ts', 'utf8');
    expect(shop).toMatch(/isShopConfigured\(\) && LEGAL_STATUS !== 'draft'/);
  });
});

describe('the gate is wired where it can be forgotten', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

  it('renders no href from the raw payment link', () => {
    /*
     * `paymentLink()` knows nothing about whether selling is permitted, so a component
     * rendering it directly bypasses the gate entirely — and would do it while looking
     * perfectly reasonable in a diff. Only `shop.ts` may call it.
     */
    for (const path of [
      'src/app/shop/page.tsx',
      'src/components/shop/DeckCta.tsx',
      'src/app/page.tsx',
      'src/components/shop/BuyButton.tsx',
    ]) {
      let source: string;
      try {
        source = strip(readFileSync(path, 'utf8'));
      } catch {
        continue; // A component that no longer exists cannot render the wrong link.
      }
      expect(source, `${path} renders the ungated paymentLink()`).not.toMatch(/paymentLink\(\)/);
    }
  });

  it('gates on LEGAL_STATUS rather than on any gap name', () => {
    /*
     * The registry is free to gain a blocking input or a `reviewRecommended` tomorrow, and
     * commerce has to gate itself on that with no edit here. Naming `legal-entity` or
     * `liability` would pin the gate to today's list and silently stop gating the moment the
     * list changed — which is the failure that looks like nothing at all.
     */
    const shop = strip(readFileSync('src/lib/shop.ts', 'utf8'));
    expect(shop).toMatch(/LEGAL_STATUS !== 'draft'/);
    for (const gap of ['legal-entity', 'liability', 'audience-scope', 'data-processing']) {
      expect(shop, `shop.ts names the gap "${gap}" instead of reading LEGAL_STATUS`).not.toContain(
        gap,
      );
    }
  });

  it('keeps the unavailable state the page already had', () => {
    // Not a redesign: the same branch, the same words. Only the predicate widened.
    const page = readFileSync('src/app/shop/page.tsx', 'utf8');
    expect(page).toContain("'Order' : 'Not on sale yet'");
  });
});
