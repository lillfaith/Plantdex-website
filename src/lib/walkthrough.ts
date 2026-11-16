import { useSyncExternalStore } from 'react';
import { ANONYMOUS_SCOPE } from './first-run';

/**
 * THE GUIDED WALKTHROUGH: a spotlight tour of the real app, offered after the welcome intro.
 *
 * This file is the DATA and the one stored fact. The overlay that draws it is
 * `components/start/AppWalkthrough.tsx`. Nothing here reads a collection, awards anything or
 * touches an account: a tour that could write progress would be a second way into it, and the
 * ladder has exactly the doors it has. The only thing persisted is that it was finished or
 * skipped, and that exists so the intro stops OFFERING it, never so a player is forced through.
 *
 * A step is a route and a list of CSS selectors, tried in order. The first that matches a visible
 * element is spotlighted; if none does (a page still loading, a layout that moved) the step is
 * shown without a hole rather than blocking the tour on a selector. Every route is a real page
 * and every selector points at real markup; `walkthrough.test.ts` checks both, so a renamed
 * heading fails a test instead of quietly leaving a step pointing at nothing.
 */

/** Dispatched to open the walkthrough from the intro, the profile or anywhere else. */
export const WALKTHROUGH_EVENT = 'plantdex:start-walkthrough';

export function startWalkthrough(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(WALKTHROUGH_EVENT));
}

export interface WalkStep {
  readonly id: string;
  /** A real route, without a trailing slash. */
  readonly route: string;
  /** Tried in order; the first visible match is highlighted. */
  readonly targets: readonly string[];
  readonly title: string;
  readonly body: string;
  /** Static sample artwork for a step whose real page may be empty for a new player. */
  readonly sample?: 'garden-stages';
}

export const WALK_STEPS: readonly WalkStep[] = [
  {
    id: 'scan',
    route: '/scan',
    targets: ['section[aria-label="Identify a plant"]', 'main h1'],
    title: 'Scan a plant',
    body: 'Snap a few photos of one plant growing outdoors. Plantdex suggests what it might be, and you choose whether to record the find.',
  },
  {
    id: 'collection',
    route: '/herbdex',
    targets: ['[data-tour="first-card"]', 'main h1'],
    title: 'Your collection',
    body: 'Every card starts as a silhouette. Find its plant outdoors and the card blooms. Tap a card to read its story.',
  },
  {
    id: 'garden',
    route: '/garden',
    targets: ['[data-tour="garden-bed"]', 'main h1'],
    title: 'Watch it grow',
    body: 'Each find takes root here and grows as you get to know it: Discovered, then Learned, then Mastered.',
    sample: 'garden-stages',
  },
  {
    id: 'journal',
    route: '/journal',
    targets: ['main h1'],
    title: 'Field Journal',
    body: 'Jot a note or add a photo each time you meet a plant again. Every visit is pressed here like a leaf in a book.',
  },
  {
    id: 'research',
    route: '/herbdex/research',
    targets: ['#today-heading', 'main h1'],
    title: 'Field Research',
    body: 'Little daily quests and seasonal ladders send you outside, and finishing them earns XP. Regional quests suggest plants to seek near you.',
  },
  {
    id: 'board',
    route: '/leaderboard',
    targets: ['section[aria-labelledby="own-heading"]', 'main h1'],
    title: 'The Field Board',
    body: 'An optional leaderboard. Finds, journal entries and challenges earn points, you only appear if you choose to join, and every score is self-reported.',
  },
  {
    id: 'profile',
    route: '/profile',
    targets: ['.hero-wash', 'main h1'],
    title: 'Your field card',
    body: 'XP, badges, titles and frames gather here. Level up and your card grows right along with you.',
  },
];

/** The closing card: no target, one button, and the only link in the tour that leaves it. */
export const WALK_FINISH = {
  title: 'Your adventure begins now!',
  body: 'Somewhere close by, a plant is waiting to be found.',
  cta: 'Find My First Plant',
  href: '/scan',
} as const;

/** How many steps the progress indicator counts: the seven stops and the closing card. */
export const WALK_TOTAL = WALK_STEPS.length + 1;

/* ── The one stored fact ────────────────────────────────────────────────────────────────── */

export const WALKTHROUGH_STORAGE_KEY = 'plantdex.walkthrough.v1';

const storageKey = (scope: string) => `${WALKTHROUGH_STORAGE_KEY}:${scope}`;

const listeners = new Set<() => void>();
let cachedScope: string | null = null;
let cache: boolean | null = null;

function read(scope: string): boolean {
  if (cache !== null && cachedScope === scope) return cache;
  if (typeof window === 'undefined') return false;
  let value = false;
  try {
    value = window.localStorage.getItem(storageKey(scope)) !== null;
  } catch {
    value = false;
  }
  cachedScope = scope;
  cache = value;
  return value;
}

/** Has this account (or this device, signed out) finished or skipped the walkthrough? */
export function walkthroughDone(scope: string = ANONYMOUS_SCOPE): boolean {
  return read(scope);
}

/**
 * Record that it was finished or skipped. Keyed by account like every other first-run flag here,
 * because one global key would hand the first person's answer to everybody who signs in on that
 * device afterwards. A blocked store only means the intro offers the tour once more.
 */
export function markWalkthroughDone(scope: string, how: 'finished' | 'skipped'): void {
  cachedScope = scope;
  cache = true;
  try {
    window.localStorage.setItem(storageKey(scope), how);
  } catch {
    /* Nothing to do: the tour is a convenience and the flag only stops it being re-offered. */
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWalkthroughDone(scope: string = ANONYMOUS_SCOPE): boolean {
  return useSyncExternalStore(
    subscribe,
    () => walkthroughDone(scope),
    // Server render: treat it as done, so the static HTML never advertises a tour the client
    // may already have finished. The client corrects it on its first real render.
    () => true,
  );
}
