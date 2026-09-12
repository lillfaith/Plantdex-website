'use client';

import { supabase } from './supabase-client';

/**
 * Ask the identifier to wake up, before anybody has a photograph to send it.
 *
 * WHAT THIS BUYS: THE ISOLATE IS ALREADY RUNNING. The edge function may not be, so without
 * this the first scan of a session arrives at a cold start — while somebody is standing in
 * front of a plant holding up a phone. An OPTIONS at mount boots it, and by the time a
 * photograph exists that cost is already paid.
 *
 * WHAT IT DOES NOT BUY, THOUGH THIS COMMENT ONCE CLAIMED IT DID: the later POST's CORS
 * preflight. The claim was that an OPTIONS here answers the preflight into the browser's
 * cache under `Access-Control-Max-Age: 86400`. Measured against a logging server, replaying
 * this exact call and then the exact identify POST:
 *
 *   after warm-up   : OPTIONS, OPTIONS
 *   after real POST : OPTIONS, POST
 *
 * Two things are wrong with the old story. This warm-up COSTS TWO ROUND TRIPS rather than
 * one — `OPTIONS` is not a CORS-safelisted method, so the browser preflights the warm-up
 * itself — and the real POST still issues its own preflight regardless; the cache entry this
 * creates does not serve it.
 *
 * The isolate boot is the larger term and is real, so this earns its place. The extra round
 * trip is not worth engineering away with a `GET`: nothing waits on this, it fires at mount,
 * and a stream of 405s in the network panel is the kind of tidying this repo has already
 * recorded going wrong once.
 *
 * IT COSTS NO QUOTA AND SENDS NO IMAGE. `identify-plant` answers OPTIONS at the top of its
 * handler, before it resolves the caller and before either `claim_scan` — so this cannot
 * consume an identification, cannot write a `scan_quota` row, and cannot rate-limit anybody.
 *
 * EVERY FAILURE IS SWALLOWED. This is an optimisation, and an optimisation that can break the
 * thing it optimises is worse than no optimisation: an offline device, a blocked request or a
 * missing deployment must leave the real scan exactly as it would have been.
 */

/** One per page load. Warming twice buys nothing and is two requests. */
let warmed = false;

export async function warmIdentifier(): Promise<void> {
  if (warmed) return;
  warmed = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url || !supabase) return;

  try {
    await fetch(`${url.replace(/\/+$/, '')}/functions/v1/identify-plant`, {
      method: 'OPTIONS',
      // `no-store` because there is nothing here to keep: the value is the preflight the
      // browser caches and the isolate that is now running, not this response's body.
      cache: 'no-store',
    });
  } catch {
    /* An optimisation may not fail anything. */
  }
}
