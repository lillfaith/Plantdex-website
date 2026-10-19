'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { analyticsScriptSrc, initAnalytics } from '@/lib/analytics';

/**
 * The Plausible tag, loaded only when a script id is configured.
 *
 * WHY THIS IS SAFE TO PUT IN A PRIVACY-CONSCIOUS SITE. Plausible sets no cookies and stores
 * no persistent identifier, which is why no consent banner appears anywhere in this app.
 * That is a property of the provider, and if the provider is ever swapped for one that uses
 * cookies, a banner and a rewritten privacy page have to arrive in the same change.
 *
 * THE SITE'S IDENTITY IS IN THE FILENAME NOW. The provider's current snippet loads
 * `/js/pa-<id>.js` and carries no `data-domain`; the older one was `/js/script.js` plus that
 * attribute. So there is no attribute to get wrong and one value to get right, which is why
 * `analyticsScriptId()` pattern-checks it and returns null on anything malformed — a typo
 * turns analytics off rather than putting a stray URL in a `<script src>` on every page.
 *
 * NEITHER THE QUEUE SHIM NOR `init()` IS INLINE HERE, and that is deliberate. The provider
 * ships them as a second inline `<script>` after the tag, which assumes the two execute in
 * order; under `next/script` they need not. The shim installs itself from `track()` on the
 * first event, and `init()` is called from the mount effect below. Both paths work whichever
 * of them wins the race, which is the whole point: a shim that was only in a tag once cost
 * `herbdex_opened` and `garden_opened` every event they should have sent, because a mount
 * effect on first paint runs before an `afterInteractive` script. Nothing errored; the
 * numbers were simply zero.
 *
 * `init()` is what starts automatic pageview tracking, and the script handles client-side
 * navigation on its own — which matters here because the app is a static export with a
 * client router. A hand-rolled pageview call on route change would double-count against it.
 */
export function PlausibleScript() {
  const src = analyticsScriptSrc();

  /*
   * Unconditional hook, conditional render. Returning before `useEffect` would make the
   * hook count depend on configuration, which React forbids — and `initAnalytics()` is
   * already a no-op when analytics is off, so the gate lives in one place rather than two.
   */
  useEffect(() => {
    initAnalytics();
  }, []);

  if (!src) return null;

  return (
    <Script
      // NOT id="plausible": an element id becomes a property of `window`, so `<script
      // id="plausible">` makes `window.plausible` resolve to the ELEMENT until the real
      // script overwrites it. Every event fired in that window went to a DOM node.
      id="plausible-analytics"
      strategy="afterInteractive"
      src={src}
    />
  );
}
