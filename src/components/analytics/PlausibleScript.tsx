import Script from 'next/script';
import { analyticsDomain } from '@/lib/analytics';

/**
 * The Plausible tag, loaded only when a domain is configured.
 *
 * WHY THIS IS SAFE TO PUT IN A PRIVACY-CONSCIOUS SITE. Plausible sets no cookies and stores
 * no persistent identifier, which is why no consent banner appears anywhere in this app.
 * That is a property of the provider, and if the provider is ever swapped for one that uses
 * cookies, a banner and a rewritten privacy page have to arrive in the same change.
 *
 * THE QUEUE SHIM IS NOT HERE. It lives in `track()` (src/lib/analytics.ts) and installs
 * itself on the first call, because a shim loaded by this component is not in place early
 * enough: a mount effect on first paint runs before an `afterInteractive` script, which
 * silently cost `herbdex_opened` and `garden_opened` every single event they should have
 * sent. `script.js` replays `window.plausible.q` whichever way it was created.
 *
 * `script.js` handles client-side navigation on its own, which matters here because the app
 * is a static export with a client router: a hand-rolled pageview call on route change would
 * double-count against the script's own.
 */
export function PlausibleScript() {
  const domain = analyticsDomain();
  if (!domain) return null;

  return (
    <Script
      // NOT id="plausible": an element id becomes a property of `window`, so `<script
      // id="plausible">` makes `window.plausible` resolve to the ELEMENT until the real
      // script overwrites it. Every event fired in that window went to a DOM node.
      id="plausible-analytics"
      strategy="afterInteractive"
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
    />
  );
}
