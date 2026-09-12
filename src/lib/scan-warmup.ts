'use client';

import { supabase } from './supabase-client';

/**
 * Ask the identifier to wake up, before anybody has a photograph to send it.
 *
 * THE FIRST SCAN OF A SESSION PAYS TWICE FOR NOTHING. The identification request is a
 * multipart POST carrying `apikey` and `Authorization`, which is not a simple request — so
 * the browser sends a CORS preflight and waits a full round trip before a single byte of the
 * photograph moves. And the edge function is an isolate that may not be running, so the
 * request that finally arrives arrives at a cold start. Both of those happen while somebody
 * is standing in front of a plant holding up a phone.
 *
 * Neither has to be on that path. An OPTIONS sent when the scan screen mounts answers the
 * preflight into the browser's cache (the function sets `Access-Control-Max-Age: 86400`) and
 * boots the isolate, and by the time a photograph exists both are already done.
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
