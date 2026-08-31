import { RARITY_LABEL } from '@/lib/deck';
import type { Rarity } from '@/lib/types';

const RARITY_CLASS: Record<Rarity, string> = {
  Common: 'text-rarity-common border-rarity-common/40 bg-rarity-common/10',
  Uncommon: 'text-rarity-uncommon border-rarity-uncommon/40 bg-rarity-uncommon/10',
  Rare: 'text-rarity-rare border-rarity-rare/40 bg-rarity-rare/10',
  Epic: 'text-rarity-epic border-rarity-epic/50 bg-rarity-epic/10',
};

/**
 * "Encounter Rate" badge, echoing the wording printed on the cards.
 * Rarity is always spelled out in text — never signalled by colour alone.
 *
 * The text comes from `RARITY_LABEL`, not from the key. Printing the key worked only
 * while every tier's label happened to equal its identifier; the moment one diverged this
 * badge and the meter on the plant page would have shown a card two different encounter
 * rates. Both now read the same table. `rarity-display.test.ts` keeps it that way.
 */
export function RarityBadge({ rarity, className = '' }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold tracking-wide uppercase ${RARITY_CLASS[rarity]} ${className}`}
    >
      <span className="sr-only">Encounter rate: </span>
      {RARITY_LABEL[rarity]}
    </span>
  );
}
