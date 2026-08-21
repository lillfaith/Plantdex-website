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
 */
export function RarityBadge({ rarity, className = '' }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-bold tracking-wide uppercase ${RARITY_CLASS[rarity]} ${className}`}
    >
      <span className="sr-only">Encounter rate: </span>
      {rarity}
    </span>
  );
}
