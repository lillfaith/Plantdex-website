import type { Rarity } from '@/lib/types';
import { RARITY_LABEL } from '@/lib/deck';

/**
 * Encounter rate as a collectible tier.
 *
 * The deck prints four tiers, so there are four diamond counts — the vocabulary follows
 * the DATA rather than the other way round. Inventing a fifth tier to round out a visual
 * scale would mean the site claimed a rarity the cards do not have.
 *
 * Rarity is never signalled by colour or diamond count alone: the tier is spelled out
 * beside it, and the screen-reader text says what the symbols mean.
 */
const TIER: Record<Rarity, number> = { Common: 1, Uncommon: 2, Rare: 3, Epic: 4 };

const TONE: Record<Rarity, string> = {
  Common: 'text-rarity-common border-rarity-common/40',
  Uncommon: 'text-rarity-uncommon border-rarity-uncommon/45',
  Rare: 'text-rarity-rare border-rarity-rare/50',
  Epic: 'text-rarity-epic border-rarity-epic/60',
};

/** Only the top two tiers bloom — if everything glows, rarity stops meaning anything. */
const GLOW: Partial<Record<Rarity, string>> = {
  Rare: 'bloom-violet',
  Epic: 'bloom-violet',
};

export function RarityMeter({ rarity, className = '' }: { rarity: Rarity; className?: string }) {
  const filled = TIER[rarity];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border bg-plum-900/70 px-2.5 py-1 ${TONE[rarity]} ${GLOW[rarity] ?? ''} ${className}`}
    >
      {/*
        SHAPE carries "earned", not dimness. The first version drew every diamond filled and
        greyed the empty ones to violet-700, which measured 2.35:1 — a tier indicator you
        cannot see is not an indicator. A hollow diamond at a readable shade says the same
        thing and stays legible.
      */}
      <span aria-hidden="true" className="flex gap-0.5 text-[0.72rem] leading-none">
        {Array.from({ length: 4 }, (_, i) =>
          i < filled ? <span key={i}>◆</span> : (
            <span key={i} className="text-violet-400">
              ◇
            </span>
          ),
        )}
      </span>
      <span className="text-[0.72rem] font-bold tracking-[0.1em] uppercase">
        <span className="sr-only">Encounter rate, tier {filled} of 4: </span>
        {RARITY_LABEL[rarity]}
      </span>
    </span>
  );
}
