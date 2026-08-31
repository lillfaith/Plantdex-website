'use client';

import { useEffect } from 'react';
import { track, type EventName } from '@/lib/analytics';

/**
 * Fires one event when a page is opened.
 *
 * A tiny client island so a server component — which cannot call `track()` — can still be
 * measured without being converted to a client component wholesale. Dropping `'use client'`
 * on `/herbdex` or `/garden` to record one event would ship their entire render to the
 * browser and give up static prerendering, which is a large cost for a small number.
 *
 * Fires ONCE per mount, in an effect, because that is the correct place for a side effect
 * that talks to an external system. A route change remounts the island, which is what makes
 * one mount mean one view.
 */
export function TrackView({ event }: { event: EventName }) {
  useEffect(() => {
    track(event);
  }, [event]);
  return null;
}
