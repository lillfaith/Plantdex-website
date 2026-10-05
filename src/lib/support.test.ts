import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EVENT_NAMES, PLAUSIBLE_GOALS } from './analytics';
import { DONATION_HOSTS, donationDestination, isDonationConfigured } from './support';

/** Every .ts/.tsx file under src/, so nothing can hide in a directory nobody listed. */
function sourceFiles(dir = 'src'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const read = (path: string) => readFileSync(path, 'utf8');

const VAR = 'NEXT_PUBLIC_DONATE_URL';

describe('donationDestination()', () => {
  const original = process.env[VAR];
  afterEach(() => {
    if (original === undefined) delete process.env[VAR];
    else process.env[VAR] = original;
  });

  it('is absent until configured', () => {
    delete process.env[VAR];
    expect(donationDestination()).toBeNull();
    expect(isDonationConfigured()).toBe(false);
  });

  it('is absent for a variable that is set but empty', () => {
    // A repository variable created and left blank is the ordinary half-done state, and it
    // must read as "off" rather than as a URL of zero length.
    process.env[VAR] = '   ';
    expect(donationDestination()).toBeNull();
  });

  it('accepts a real donation page on every listed host', () => {
    const samples: Record<string, string> = {
      'ko-fi.com': 'https://ko-fi.com/plantdex',
      'www.ko-fi.com': 'https://www.ko-fi.com/plantdex',
      'buymeacoffee.com': 'https://buymeacoffee.com/plantdex',
      'www.buymeacoffee.com': 'https://www.buymeacoffee.com/plantdex',
      'github.com': 'https://github.com/sponsors/lillfaith',
      'donate.stripe.com': 'https://donate.stripe.com/test_abc123',
      'buy.stripe.com': 'https://buy.stripe.com/test_abc123',
      'paypal.me': 'https://paypal.me/plantdex',
      'www.paypal.com': 'https://www.paypal.com/donate?hosted_button_id=ABC',
    };

    // Every host in the list is exercised, so adding one without a sample fails here rather
    // than shipping a host nobody checked.
    expect(Object.keys(samples).sort()).toEqual(DONATION_HOSTS.map((h) => h.host).sort());

    for (const [host, url] of Object.entries(samples)) {
      process.env[VAR] = url;
      const resolved = donationDestination();
      expect(resolved, `${url} was refused`).not.toBeNull();
      expect(resolved!.host).toBe(host);
      // The URL is returned EXACTLY as configured. PayPal and Ko-fi both carry meaningful
      // query strings, and rebuilding from a parsed URL is a quiet way to drop one.
      expect(resolved!.url).toBe(url);
      expect(resolved!.name.length).toBeGreaterThan(0);
    }
  });

  it('refuses anything that is not a listed donation host', () => {
    /*
     * SAME REASONING AS THE PAYMENT LINK, and the same bug classes.
     *
     * This is the destination of a button asking somebody for money, so a mistyped, copied-
     * wrong or tampered repository variable must turn the button OFF rather than become an
     * open redirect with a donation prompt on it. Suffix and substring matching are what
     * make `ko-fi.com.attacker.test` and `evil-ko-fi.com` pass elsewhere; the hostname is
     * compared for equality.
     */
    for (const hostile of [
      'https://ko-fi.com.attacker.test/plantdex',
      'https://evil-ko-fi.com/plantdex',
      'https://attacker.test/ko-fi.com/plantdex',
      'http://ko-fi.com/plantdex',
      'javascript:alert(1)',
      'data:text/html,<h1>give</h1>',
      'ko-fi.com/plantdex',
      'https://example.com/donate',
      // Hosts that serve far more than donations are confined to the path that does.
      'https://github.com/lillfaith/plantdex-website',
      'https://www.paypal.com/signin',
    ]) {
      process.env[VAR] = hostile;
      expect(donationDestination(), `${hostile} was accepted as a donation link`).toBeNull();
    }
  });

  it('refuses the deck\u2019s own Payment Link', () => {
    /*
     * Both links live on buy.stripe.com, are made in the same dashboard and are pasted into
     * two fields on one settings page. Swapped, a button labelled Donate charges the full
     * price of a deck \u2014 a mis-set variable that looks like it worked. The button must
     * vanish instead, because a missing button is noticed by the owner and a wrong charge is
     * noticed by the person charged.
     */
    const deckLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
    try {
      process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_deck';
      process.env[VAR] = 'https://buy.stripe.com/test_deck';
      expect(donationDestination()).toBeNull();

      // A DIFFERENT Stripe link is still a perfectly good donation destination \u2014 the guard
      // is about collision, not about Stripe.
      process.env[VAR] = 'https://buy.stripe.com/test_donate';
      expect(donationDestination()).not.toBeNull();
    } finally {
      if (deckLink === undefined) delete process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
      else process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK = deckLink;
    }
  });

  it('names every host from the list rather than from the URL', () => {
    // The printed name is what /privacy discloses. Deriving it from the hostname would print
    // "Ko-fi.com" on a legal page; deriving it from the list keeps one spelling of each.
    for (const host of DONATION_HOSTS) {
      expect(host.name, `${host.host} has no printable name`).toMatch(/\S/);
      expect(host.name).not.toContain('.');
    }
  });
});

describe('the donate button', () => {
  it('is rendered in exactly one place, under the creator’s note', () => {
    /*
     * ONE PLACEMENT. `DeckCta` documents at length why a buy prompt on every panel turns a
     * field guide into an advertisement; a donation prompt is the same thing with a worse
     * tone, and the front page already leads with a filled buy button. If this ever earns a
     * second home it should be a deliberate edit to this test, not a drive-by import.
     */
    const callers = sourceFiles().filter(
      (path) =>
        path !== 'src/components/support/DonateButton.tsx' &&
        /<DonateButton\b/.test(strip(read(path))),
    );
    expect(callers).toEqual(['src/app/page.tsx']);

    // And it is inside the creator's-note section rather than floating after it.
    const page = read('src/app/page.tsx');
    const note = page.indexOf('aria-labelledby="note-heading"');
    const donate = page.indexOf('<DonateButton');
    const close = page.indexOf('</section>', note);
    expect(note).toBeGreaterThan(-1);
    expect(donate).toBeGreaterThan(note);
    expect(donate).toBeLessThan(close);
  });

  it('cannot render while no destination is configured', () => {
    // The gate is the first thing the component does, and it returns null rather than
    // rendering a disabled button or a link to nowhere.
    const source = read('src/components/support/DonateButton.tsx');
    expect(source).toMatch(/donationDestination\(\)/);
    expect(source).toMatch(/if \(!destination\) return null;/);
  });

  it('loads no payment script, widget or key', () => {
    /*
     * Every listed host hosts its own payment page, so this stays a plain outbound link —
     * exactly the property that keeps card handling off this site for the deck. A Ko-fi or
     * PayPal widget would put a payment surface on the front page and change that in one
     * import.
     */
    for (const path of sourceFiles()) {
      const source = strip(read(path));
      expect(source, `${path} embeds a donation widget or SDK`).not.toMatch(
        /ko-fi\.com\/widget|storage\.ko-fi\.com|buymeacoffee\.com\/widget|paypalobjects\.com|paypal\.com\/sdk|js\.stripe\.com/,
      );
    }
  });

  it('fires one analytics event, and that event is a configured goal', () => {
    const source = read('src/components/support/DonateButton.tsx');
    // Outbound navigation, so the event has to be fired on the press as well as the click —
    // see BuyButton for the measurement behind that. A ref, not a local, or a re-render
    // between the two would send it twice.
    expect(source).toContain('onPointerDown');
    expect(source).toContain('onClick');
    expect(source).toMatch(/useRef\(false\)/);
    expect(source).toContain("track('donate_clicked')");

    expect(EVENT_NAMES).toContain('donate_clicked');
    expect(PLAUSIBLE_GOALS).toContain('donate_clicked');
  });

  it('promises nothing about what a donation funds', () => {
    /*
     * AGENTS.md's prohibition on invented commercial claims does not stop at prices. A
     * donation prompt is where "helps us ship the next deck", "keeps the servers running"
     * and "only N left to reach our goal" appear, and not one of those is a fact anybody in
     * this repository has established.
     */
    const copy = strip(read('src/components/support/DonateButton.tsx'));
    for (const invented of [
      /keeps? the (servers?|lights?|site) (running|on)/i,
      /goal|target|raised|so far/i,
      /next (deck|collection|printing)/i,
      /\d+\s*%/,
      /[$£€]\s?\d/,
      /always be free|free forever/i,
    ]) {
      expect(copy, `the donate copy makes a claim nobody set: ${invented}`).not.toMatch(invented);
    }
  });
});

describe('/privacy and the donation gate', () => {
  it('names a donation host only while one is configured', () => {
    /*
     * THE SHAPE THIS REPOSITORY HAS SHIPPED THREE TIMES: a page denying something
     * configuration had switched on. /terms denied the shop, /privacy denied analytics, the
     * landing page denied the sale. The closing sentence of the processors section is an
     * EXHAUSTIVE claim about who is involved, so it reads from the same predicate the button
     * does instead of being written once and left behind.
     */
    const privacy = read('src/app/privacy/page.tsx');
    expect(privacy).toContain("from '@/lib/support'");
    expect(privacy).toMatch(/isDonationConfigured\(\)/);

    // Unconfigured, the sentence must still stand exactly as it always did — no dangling
    // "and not donating" on a site with no donate button.
    const guarded = privacy.slice(privacy.indexOf('only GitHub Pages and Plausible') - 400);
    expect(guarded).toMatch(/isDonationConfigured\(\)/);
  });

  it('does not describe a donation host as a processor of anything', () => {
    // It is an outbound link, like a POWO citation: this site makes no request to it and
    // receives nothing back. Saying otherwise would be a disclosure that is wrong in the
    // direction of sounding more careful than it is.
    const privacy = strip(read('src/app/privacy/page.tsx'));
    expect(privacy).not.toMatch(/donation[^.]{0,80}on our behalf/i);
  });
});
