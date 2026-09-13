'use client';

import { useHerbdex } from '@/state/HerbdexProvider';

/**
 * What the Herbdex says to somebody who has found nothing yet.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A LINE, NOT A SECOND CALL TO ACTION.
 *
 * The obvious build here is an onboarding panel with its own "Identify your first plant"
 * button. That button already exists: it is the scan panel rendered immediately below this,
 * and adding another would put two routes to /scan about forty pixels apart — which reads as
 * a page unsure what it wants you to do, not as guidance.
 *
 * So this supplies the half the panel cannot. The panel says what the action IS; this says
 * why the page underneath it is empty and what filling it takes. The CTA stays the panel's.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * IT DISAPPEARS, AND THE CONDITION IS THE POINT. Rendered only while the collection is
 * genuinely empty, so it is onboarding rather than decoration — a returning player with one
 * card never sees it again. `ready` is required as well as the count: before hydration
 * resolves, every collection looks empty, and announcing "your Herbdex is empty" to somebody
 * with 40 cards for the length of a load is worse than saying nothing.
 */
export function FirstFindNote() {
  const { ready, discoveredCount } = useHerbdex();

  if (!ready || discoveredCount > 0) return null;

  return (
    <p className="mt-4 text-sm leading-relaxed text-violet-200">
      Your Herbdex is empty. Find your first plant outside to reveal its card and begin your
      collection.
    </p>
  );
}
