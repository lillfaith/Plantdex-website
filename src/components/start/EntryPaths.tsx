'use client';

import Link from 'next/link';
import { ENTRY_PATHS } from '@/lib/entry-point';
import { track, type EventName } from '@/lib/analytics';

/**
 * The three doors out of `/start`.
 *
 * A client island rather than a client page: `/start` stays a server component so it
 * prerenders as static HTML, and only this list ships JavaScript. The only reason it needs
 * any is measurement — which of the three a first-time visitor chooses is the single most
 * useful number a vendor event can produce, and the page path cannot imply it because all
 * three are clicks on the same URL.
 *
 * THE ORDER IS DELIBERATE AND LIVES IN `entry-point.ts`, not here: scanning first because it
 * is the only one that requires being outdoors and is what makes this a field guide, browsing
 * second for the person who has just opened the box, and the explainer third because anybody
 * who wants it will scroll to it anyway.
 *
 * ONE PRIMARY, TWO PEERS. Three equally loud buttons is not a choice, it is a menu, and a
 * menu is what a stranger bounces off. Scanning takes the deck's gradient — the same
 * treatment the Herbdex gets on the landing page, because it is the primary action HERE — and
 * the other two are outlined peers underneath it.
 */

/**
 * Which event each destination fires.
 *
 * Keyed by href and resolved by lookup rather than assembled from the path, so a typo is a
 * missing key the compiler catches instead of a string that silently never appears as a goal
 * in the dashboard. `EventName` is a closed union, so `start_path_scam` would not compile.
 */
const PATH_EVENTS: Record<string, EventName> = {
  '/scan': 'start_path_scan',
  '/herbdex': 'start_path_herbdex',
  '/learn': 'start_path_learn',
};

export function EntryPaths() {
  return (
    <ul className="space-y-3">
      {ENTRY_PATHS.map((path, index) => {
        const primary = index === 0;
        return (
          <li key={path.href}>
            <Link
              href={path.href}
              onClick={() => {
                const event = PATH_EVENTS[path.href];
                if (event) track(event);
              }}
              className={`flex min-h-[3.5rem] flex-col justify-center rounded-2xl px-5 py-3 transition-colors ${
                primary
                  ? 'bg-gradient-to-r from-gold-500 to-pink-accent text-violet-deep shadow-card'
                  : 'border border-violet-700/70 bg-plum-800/60 text-violet-100 hover:bg-plum-700'
              }`}
            >
              <span className={`text-base font-bold ${primary ? '' : 'text-gold-300'}`}>
                {path.label}
              </span>
              {/*
                The blurb is not decoration and not a second call to action: it says what the
                destination actually does, so somebody can pick without opening all three.
                On the gradient it takes a darkened ink rather than a lighter one — the button
                is bright, so contrast here runs the other way.
              */}
              <span
                className={`mt-0.5 text-xs leading-relaxed ${
                  primary ? 'text-violet-deep/80' : 'text-violet-300'
                }`}
              >
                {path.blurb}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
