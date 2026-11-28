'use client';

import Link from 'next/link';
import type { DiscoveryResult, Herb } from '@/lib/types';
import { useHerbdex } from '@/state/HerbdexProvider';
import { xpForDiscoveries } from '@/lib/progression';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * The route from an uncollected card to the scanner.
 *
 * OWNER DECISION: a NEW card is unlocked only by the in-app camera and receipt flow. This panel
 * used to record a find from two taps; it now writes nothing and calls no reducer. Reading a
 * card (the reveal hatch) is unaffected, because reading is not unlocking. Hiding the old button
 * is not the security rule: the server enforces it. This panel is only the honest explanation.
 *
 * Wording: a card unlocked this way was captured in the app. Never "verified", never "found
 * outdoors", and nothing here speaks about identification, edibility or safety beyond saying
 * a scan makes none of them certain.
 */
export function DiscoverPanel({
  herb,
  label = 'Scan it to collect',
  showStamp = true,
}: {
  herb: Herb;
  /** CTA wording. */
  label?: string;
  /** Show the "Discovered" stamp panel once found. The overview hides it (the Progress tab and the character panel carry the date). */
  showStamp?: boolean;
  /** Kept for callers; this panel no longer unlocks anything, so it is never called here. */
  onDiscovered?: (result: DiscoveryResult) => void;
}) {
  const { isDiscovered, state, ready } = useHerbdex();

  /*
   * WHAT THIS FIND ACTUALLY PAYS, asked of the ledger rather than read off the card.
   *
   * `herb.xp` is the value PRINTED on the artwork. For the 45 printed cards the two agree;
   * for a Field Card they do not, because `xpForDiscoveries` resolves ids through the
   * printed deck only — so this button was offering "+250 XP" for a find that credits zero.
   * A number in a button is a promise, and this is the one function that can keep it.
   */
  const award = xpForDiscoveries([herb.id]);

  const pays =
    award > 0 ? `; a successful scan collects it for ${award} XP, once` : '; this one pays no XP';
  const discovered = ready && isDiscovered(herb.id);
  const discoveredAt = state.discoveries[herb.id];

  if (!ready) {
    // Placeholder of the same height, so the layout does not jump once storage is read.
    return <div className="min-h-12 rounded-full bg-plum-800/40" aria-hidden="true" />;
  }

  return (
    <>
      {discovered ? (
        showStamp ? (
        <div className="panel flex items-center gap-3 p-4">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-lg text-gold-300"
          >
            <PlantdexIcon name="discovered" />
          </span>
          <div>
            <p className="text-sm font-bold text-gold-300">Discovered</p>
            {discoveredAt && (
              <p className="text-xs text-violet-300">
                <time dateTime={discoveredAt}>
                  {new Date(discoveredAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </p>
            )}
          </div>
        </div>
        ) : null
      ) : (
        <div>
          <Link
            href="/scan"
            className="group relative flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-gold-500 to-pink-accent px-6 text-base font-bold text-violet-deep shadow-card transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
          >
            <PlantdexIcon name="scan" className="text-base" />
            {label}
          </Link>
          <p className="mt-2 text-center text-xs leading-relaxed text-violet-300">
            A new card is unlocked by scanning the plant with the in-app camera while signed in
            {pays}. Photos chosen from your library can help identify a plant but cannot unlock a card.
            Scanning never confirms an identification or makes a plant safe to use.
          </p>
        </div>
      )}
    </>
  );
}
