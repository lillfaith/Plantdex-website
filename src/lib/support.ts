/**
 * THE DONATION DESTINATION.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE VARIABLE, HOST-VALIDATED, AND OFF UNTIL SOMEBODY SETS IT.
 *
 * A donate button is the second control on this site that sends somebody somewhere to give
 * money, and it gets the same treatment as the first for the same reason `shop.ts` gives:
 * "a mistyped or tampered repo variable must turn the button *off* rather than send buyers
 * somewhere else with a card in hand". So `NEXT_PUBLIC_DONATE_URL` is parsed, required to be
 * `https:`, and matched against an explicit list of hostnames — EXACT hostname equality, not
 * a substring and not a suffix, which is the bug class `buy-stripe.com` and
 * `stripe.com.attacker.test` belong to.
 *
 * Unset or unrecognised means NO BUTTON. Nothing invents a destination, nothing falls back,
 * and `src/app/page.tsx` renders nothing at all rather than a link to a page nobody chose —
 * the same shape as `/shop` rendering "not on sale yet" rather than guessing a price.
 *
 * NO KEY, NO SDK, NO WIDGET. Every host below hosts its own payment page, so this stays a
 * plain outbound link exactly as `BuyButton` does: no script from a payment host, no
 * publishable key, nothing that could handle a card number here even in principle.
 * `support.test.ts` fails the build on any of those appearing.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY AN ALLOW-LIST RATHER THAN "ANY HTTPS URL". The alternative is a button on the front
 * page pointing wherever a repository variable says, which is an open redirect with a
 * donation prompt on it. The list is short, it is the whole set of places this project would
 * plausibly collect from, and adding one is a one-line change with a test.
 *
 * WHY THIS IS NOT A PRIVACY PROCESSOR. The site makes no request to any host below; a
 * visitor who taps the button leaves, exactly as they do when they tap a POWO citation or an
 * invasive-status source. `/privacy` names Stripe because an ORDER returns a name and an
 * address to the owner for packing; a donation returns nothing to this site and is not
 * connected to a Plantdex account. The one sentence on that page that makes an exhaustive
 * claim — "only GitHub Pages and Plausible are involved" — is reconciled there, gated on
 * this module, so the page cannot deny something configuration has turned on.
 */

/**
 * A host that may receive a donation, and the name a page prints for it.
 *
 * `pathPrefix` is required where a host serves far more than donations: `github.com` is only
 * a donation destination under `/sponsors/`, and `paypal.com` only under `/donate`. Without
 * it the variable could name any page on either host.
 */
interface DonationHost {
  readonly host: string;
  readonly name: string;
  readonly pathPrefix?: string;
}

export const DONATION_HOSTS: readonly DonationHost[] = [
  { host: 'ko-fi.com', name: 'Ko-fi' },
  { host: 'www.ko-fi.com', name: 'Ko-fi' },
  { host: 'buymeacoffee.com', name: 'Buy Me a Coffee' },
  { host: 'www.buymeacoffee.com', name: 'Buy Me a Coffee' },
  { host: 'github.com', name: 'GitHub Sponsors', pathPrefix: '/sponsors/' },
  { host: 'donate.stripe.com', name: 'Stripe' },
  { host: 'buy.stripe.com', name: 'Stripe' },
  { host: 'paypal.me', name: 'PayPal' },
  { host: 'www.paypal.com', name: 'PayPal', pathPrefix: '/donate' },
];

export interface DonationDestination {
  /** The URL exactly as configured — never rebuilt, so no query string is dropped. */
  readonly url: string;
  readonly host: string;
  /** What a page calls it, from the list above rather than from the URL. */
  readonly name: string;
}

/**
 * The configured donation destination, or null.
 *
 * Returns the ORIGINAL string rather than `url.href`: Ko-fi and PayPal both carry meaningful
 * query strings, and `URL` normalisation is a silent way to lose one.
 */
export function donationDestination(): DonationDestination | null {
  const raw = process.env.NEXT_PUBLIC_DONATE_URL?.trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;

  const match = DONATION_HOSTS.find((candidate) => candidate.host === parsed.hostname);
  if (!match) return null;
  if (match.pathPrefix && !parsed.pathname.startsWith(match.pathPrefix)) return null;

  return { url: raw, host: match.host, name: match.name };
}

export function isDonationConfigured(): boolean {
  return donationDestination() !== null;
}
