import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANALYTICS_PROVIDER, EVENT_NAMES, UNEMITTED_EVENTS } from './analytics';
import {
  LEGAL_REVIEWED,
  LEGAL_STATUS,
  OWNER_INPUTS,
  blockingOwnerInputs,
  ownerInput,
} from './legal';

const PRIVACY = 'src/app/privacy/page.tsx';
const TERMS = 'src/app/terms/page.tsx';
/*
 * The commerce pages are held to exactly the same standard as the originals: every gap
 * registered, no unregistered placeholder, the draft banner, a link to /safety. They are the
 * likeliest place for an invented "ships in 3-5 days" to appear, so they are in PAGES from
 * the day they were created rather than added after somebody notices.
 */
const TERMS_OF_SALE = 'src/app/terms-of-sale/page.tsx';
const SHIPPING = 'src/app/shipping/page.tsx';
const RETURNS = 'src/app/returns/page.tsx';
const PAGES = [PRIVACY, TERMS, TERMS_OF_SALE, SHIPPING, RETURNS];
const read = (path: string) => readFileSync(path, 'utf8');

/** Every file under a directory, so a new provider cannot hide in a folder nobody listed. */
function readdirRecursive(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? readdirRecursive(path) : [path];
  });
}

/** Every `<OwnerGap id="..." />` used across the legal pages. */
function gapsUsed(): { path: string; id: string }[] {
  return PAGES.flatMap((path) =>
    [...read(path).matchAll(/<OwnerGap id="([a-z-]+)"/g)].map((match) => ({
      path,
      id: match[1]!,
    })),
  );
}

describe('owner input registry', () => {
  it('gives every entry a label and a reason', () => {
    expect(OWNER_INPUTS.length).toBeGreaterThan(0);
    for (const input of OWNER_INPUTS) {
      expect(input.label.length, input.id).toBeGreaterThan(10);
      // The reason is what stops the list becoming a shrug. It has to say why the policy
      // cannot be finished without it.
      expect(input.why.length, input.id).toBeGreaterThan(40);
    }
  });

  it('uses unique ids', () => {
    const ids = OWNER_INPUTS.map((input) => input.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('marks the pages as a draft while anything blocking is outstanding', () => {
    // The banner is driven by this, so the two cannot disagree.
    expect(LEGAL_STATUS).toBe(blockingOwnerInputs().length > 0 ? 'draft' : 'published');
  });

  it('dates the review, and does not date it in the future', () => {
    expect(LEGAL_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(LEGAL_REVIEWED).getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe('legal pages', () => {
  it('only uses placeholders that are registered', () => {
    // An unregistered id would render a bare "awaiting owner input" with no explanation of
    // what is missing, and would not appear on the owner's list.
    for (const { path, id } of gapsUsed()) {
      expect(ownerInput(id), `${path} uses unregistered gap "${id}"`).toBeDefined();
    }
  });

  it('actually uses every blocking input it declares', () => {
    /*
     * The registry is not a wishlist. If something is blocking publication, the sentence it
     * blocks must exist on a page — otherwise the reader never learns the policy is
     * incomplete on that point, which is the whole purpose of the mechanism.
     */
    const used = new Set(gapsUsed().map((gap) => gap.id));
    for (const input of blockingOwnerInputs()) {
      expect(used.has(input.id), `blocking input "${input.id}" appears on no page`).toBe(true);
    }
  });

  it('invents no contact route, entity or jurisdiction', () => {
    /*
     * THE TEST THAT MATTERS. A policy that names a support address nobody monitors, or a
     * governing law nobody chose, is a false statement in the one document a reader is
     * entitled to rely on. These patterns are how such a sentence would look.
     */
    for (const path of PAGES) {
      const source = read(path);
      expect(source, `${path}: invented email address`).not.toMatch(
        /[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
      );
      expect(source, `${path}: invented postal address`).not.toMatch(
        /\b\d{1,5}\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Suite)\b/,
      );
      expect(source, `${path}: invented jurisdiction`).not.toMatch(
        /laws of the (State|Commonwealth|Province) of|courts of England|Delaware|jurisdiction of the courts/i,
      );
      expect(source, `${path}: invented company form`).not.toMatch(
        /\b(LLC|Inc\.|Ltd\.|GmbH|Pty|S\.A\.|C-corp)\b/,
      );
    }
  });

  it('sets no cookie, so the page may keep saying so', () => {
    const appSource = [
      'src/app/layout.tsx',
      'src/lib/supabase-client.ts',
      'src/state/AuthProvider.tsx',
      'src/components/analytics/PlausibleScript.tsx',
      'src/lib/analytics.ts',
    ]
      .map(read)
      .join('\n');
    // The absence of a consent banner rests on this. A cookie means a banner and a rewritten
    // privacy page, in the same change.
    expect(appSource, 'a cookie is now set — update the privacy page').not.toMatch(
      /document\.cookie/,
    );
  });

  it('keeps the analytics disclosure in step with the analytics that exist', () => {
    /*
     * THIS GUARD USED TO SAY "no analytics provider exists". It now says something stronger
     * and longer-lived: whatever measurement the app performs, the privacy page describes
     * *that* measurement and no other.
     *
     * The failure mode it exists for is not adding analytics — that is a deliberate act. It
     * is adding a second provider, or swapping the first, and leaving a page that still
     * describes the old one. A policy is only worth anything while it is current.
     */
    /*
     * Comments are stripped first. Without that, the requirement "the page names the
     * provider" is satisfiable by the file's own header comment — which it was, until this
     * test was checked against a page whose visible prose had been renamed. A reader sees
     * the JSX, not the docblock.
     */
    const privacy = read(PRIVACY).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

    // 1. The page names the provider the code actually loads.
    expect(privacy, `privacy page does not name ${ANALYTICS_PROVIDER}`).toContain(
      ANALYTICS_PROVIDER,
    );
    expect(read('src/components/analytics/PlausibleScript.tsx')).toContain('plausible.io');

    // 2. No SECOND provider has appeared anywhere in the app.
    const appSource = readdirRecursive('src')
      .filter((path) => /\.tsx?$/.test(path) && !path.endsWith('.test.ts'))
      .map(read)
      .join('\n');
    expect(appSource, 'a second analytics provider was added — update the privacy page').not.toMatch(
      /gtag|googletagmanager|posthog|mixpanel|segment\.com|amplitude|hotjar|fullstory|clarity\.ms/i,
    );

    // 3. The page no longer makes the two claims that adding analytics falsified. Both were
    //    literally on this page before, and both would now be untrue.
    expect(privacy, 'privacy page still claims there is no analytics provider').not.toMatch(
      /There is no analytics provider/i,
    );
    expect(privacy, 'privacy page still claims no page contacts a third party').not.toMatch(
      /Loading a page contacts no one but our own host/i,
    );

    /*
     * 4. The page's central analytics promise, checked in BOTH directions.
     *
     * The page says each counted action "carries no attached data whatsoever". That is only
     * true while `track()` takes one parameter, so this asserts the prose and the signature
     * together — a page saying it, and code that could not do otherwise. Adding a properties
     * argument back would fail here as well as in `analytics.test.ts`, which is the point:
     * the sentence a reader trusts and the code that honours it cannot drift apart.
     */
    const emittable = EVENT_NAMES.filter((name) => !UNEMITTED_EVENTS[name]);
    expect(emittable.length, 'events exist but none are described').toBeGreaterThan(0);
    expect(privacy, 'privacy page dropped the "nothing is attached" promise').toMatch(
      /carries no attached data/i,
    );
    const signature = read('src/lib/analytics.ts').match(/export function track\(([^)]*)\)/);
    expect(
      signature![1]!.split(',').length,
      'track() gained a parameter — the privacy page now overpromises',
    ).toBe(1);

    // 5. And the three refusals that make the measurement acceptable at all.
    for (const promise of [/no email address/i, /never sent to the analytics service/i, /No coordinates/i]) {
      expect(privacy, `privacy page dropped the promise ${promise}`).toMatch(promise);
    }
  });

  it('keeps the commerce disclosure in step with the commerce that exists', () => {
    /*
     * THE SAME FAILURE, THIRD TIME OF ASKING.
     *
     * /privacy once said "there is no analytics provider" after Plausible shipped. /terms then
     * said "there is no shop, no checkout and no payment processing anywhere in the
     * application" after /shop shipped. Both were true when written and both became false in a
     * commit that had no reason to touch them — which is exactly the failure mode a legal page
     * has, because nobody re-reads one while building a feature.
     *
     * So the existence of the route is checked against the prose that denies it.
     */
    const shopExists = existsSync('src/app/shop/page.tsx');
    expect(shopExists, 'this test assumes /shop — update it if the shop was removed').toBe(true);

    const terms = read(TERMS).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    for (const denial of [
      /Nothing is sold through this site/i,
      /no shop, no checkout/i,
      /there is no shop/i,
      /nothing for sale/i,
    ]) {
      expect(terms, `Terms still denies the shop that exists: ${denial}`).not.toMatch(denial);
    }

    // And it points at the document that actually governs a sale, rather than promising to
    // grow one later — the sale terms live on their own page.
    expect(terms, 'Terms does not link to the terms of sale').toContain('/terms-of-sale');

    /*
     * The shop must never claim a price the code cannot produce. Both env vars gate it, so a
     * hard-coded figure in the JSX would be a price nobody set — the commerce equivalent of an
     * invented delivery estimate.
     */
    const shop = read('src/app/shop/page.tsx').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    expect(shop, '/shop hard-codes a price instead of reading displayPrice()').not.toMatch(
      /[$£€]\s?\d+[.,]\d{2}/,
    );
  });

  it('points at the safety page rather than replacing it', () => {
    // Terms and Privacy sit beside the herbal safety information; neither absorbs it.
    for (const path of PAGES) {
      expect(read(path) + read('src/components/legal/LegalPage.tsx')).toContain('/safety');
    }
  });

  it('is reachable from every page', () => {
    const footer = read('src/components/SiteFooter.tsx');
    for (const href of ['/safety', '/privacy', '/terms']) {
      expect(footer, `footer does not link ${href}`).toContain(`href="${href}"`);
    }
    expect(read('src/app/layout.tsx'), 'footer is not in the layout').toContain('<SiteFooter />');
  });
});
