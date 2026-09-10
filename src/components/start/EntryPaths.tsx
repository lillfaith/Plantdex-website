'use client';

import Link from 'next/link';
import { ENTRY_PATHS } from '@/lib/entry-point';
import { track, type EventName } from '@/lib/analytics';

/**
 * The three doors out of `/start` — ONE of which is the door.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE EQUAL BUTTONS IS NOT A CHOICE, IT IS A MENU. The first version rendered all three as
 * full-width blocks of the same shape and height; scanning had the gradient, but shape and
 * size carry more weight than colour, so the page asked a stranger holding a deck to pick
 * between three things instead of telling them what to do.
 *
 * A QR arrival has exactly one sensible next step: point the camera at something growing.
 * So scanning is a large key, and the other two are quiet text links underneath — still
 * present, still one tap, no longer competing. The page should read "do this first", and
 * hierarchy is what says that, not copy.
 *
 * ORDER STILL LIVES IN `entry-point.ts`, and `[0]` is still the primary. This component
 * decides weight; the module decides what the paths are and which comes first.
 * ─────────────────────────────────────────────────────────────────────────────
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

function fire(href: string) {
  const event = PATH_EVENTS[href];
  if (event) track(event);
}

export function EntryPaths() {
  const [primary, ...rest] = ENTRY_PATHS;
  if (!primary) return null;

  return (
    <div>
      {/*
        THE KEY. Same gradient the landing page gives its primary action, so the two pages
        agree about what a primary action looks like, and tall enough to be the only thing on
        this screen anybody could mistake for the next step.

        No blurb under the label. "Scan a plant" is not a phrase that needs explaining, and a
        sentence inside the button would make it a panel again.
      */}
      <Link
        href={primary.href}
        onClick={() => fire(primary.href)}
        className="flex min-h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-gold-500 to-pink-accent px-6 text-lg font-extrabold tracking-wide text-violet-deep shadow-card transition-transform hover:scale-[1.02] motion-reduce:hover:scale-100"
      >
        {primary.label}
      </Link>

      {/*
        THE OTHER TWO, AS LINKS. Deliberately not bordered: a box round a link is what turns
        a secondary action back into a competing one. They keep a 44px hit area because they
        are real destinations, not footnotes — the height comes from the row, not from a
        visible container.
      */}
      <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
        {rest.map((path) => (
          <li key={path.href}>
            <Link
              href={path.href}
              onClick={() => fire(path.href)}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-200 underline decoration-violet-600 underline-offset-4 transition-colors hover:text-gold-300"
            >
              {path.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
