'use client';

import { useEffect } from 'react';
import { track, type EventName, type EventProps } from '@/lib/analytics';

/**
 * Fires one event when a page is opened.
 *
 * A tiny client island so a server component — which cannot call `track()` — can still be
 * measured without being converted to a client component wholesale. Dropping `'use client'`
 * on `/herbdex` or `/garden` to record one event would ship their entire render to the
 * browser and give up static prerendering, which is a large cost for a small number.
 *
 * Fires ONCE per mount, in an effect, because that is the correct place for a side effect
 * that talks to an external system. It is deliberately not memoised on the props: these
 * pages pass a constant event name, and a route change remounts the island anyway.
 */
export function TrackView<E extends EventName>({
  event,
  ...rest
}: { event: E } & (EventProps[E] extends undefined ? { props?: never } : { props: EventProps[E] })) {
  const props = (rest as { props?: EventProps[E] }).props;
  useEffect(() => {
    // The cast is contained here rather than pushed onto every caller: `track` is precisely
    // typed at its own call sites, and this generic wrapper is the one place the two
    // signatures have to be reconciled.
    (track as (name: E, props?: EventProps[E]) => void)(event, props);
  }, [event, props]);
  return null;
}
