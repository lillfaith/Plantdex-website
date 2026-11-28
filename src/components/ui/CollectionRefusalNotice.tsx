'use client';

import Link from 'next/link';
import { useHerbdex } from '@/state/HerbdexProvider';

/**
 * A calm notice for the one moment a collection write is REFUSED: the card was not saved.
 *
 * Contract (coordinator lane, branch `coord/discovery-rollback`): the store exposes
 * `lastRefusal` and `dismissRefusal()`, and `src/lib/collection-refusal.ts` exports
 * `REFUSAL_COPY`. Both are declared locally so this lane builds on its own; the integrator
 * rewires the imports. The shapes must stay identical.
 *
 * It is a status message, not a modal: no scrim, no focus trap, no animation. It sits above
 * the bottom nav like the earned-moment card and takes only the pointer events of its own
 * box, so it never covers a primary action. Wording: a card is unlocked by capturing the plant
 * in the app. Never "verified", never "found outdoors", and nothing about identification
 * accuracy or safety.
 */
export type RefusalKind = 'needs-capture' | 'needs-discovery' | 'other';
export interface CollectionRefusal {
  at: number;
  kind: RefusalKind;
  herbIds: string[];
}

export const LOCAL_REFUSAL_COPY: Record<RefusalKind, { title: string; body: string }> = {
  'needs-capture': {
    title: 'Card not saved',
    body: 'A new card is unlocked by scanning the plant with the in-app camera while signed in. Photos chosen from your library can identify a plant but cannot unlock it.',
  },
  'needs-discovery': {
    title: 'Card not saved',
    body: 'This step needs the card to be collected first. Scan the plant with the in-app camera while signed in to unlock it.',
  },
  other: {
    title: 'Card not saved',
    body: 'That change was not saved, and nothing in your collection moved. A new card is unlocked by scanning the plant with the in-app camera while signed in.',
  },
};

interface RefusalContext {
  lastRefusal?: CollectionRefusal | null;
  dismissRefusal?: () => void;
}

export function CollectionRefusalNotice() {
  // Read through a local shape until the coordinator's fields land on the context type.
  const { lastRefusal, dismissRefusal } = useHerbdex() as unknown as RefusalContext;
  if (!lastRefusal) return null;
  const copy = LOCAL_REFUSAL_COPY[lastRefusal.kind] ?? LOCAL_REFUSAL_COPY.other;

  return (
    <div className="refusal-host">
      <section role="status" aria-live="polite" className="refusal-card">
        <div className="refusal-head">
          <p className="refusal-kicker">{copy.title}</p>
          <button
            type="button"
            onClick={() => dismissRefusal?.()}
            className="refusal-dismiss min-h-11 min-w-11"
          >
            Dismiss
            <span className="sr-only"> this notice</span>
          </button>
        </div>
        <div className="refusal-body">
          <p className="refusal-text">{copy.body}</p>
          <Link href="/scan" className="refusal-link min-h-11">
            Scan it
          </Link>
        </div>
      </section>
    </div>
  );
}
