import { RARITY_LABEL } from '@/lib/deck';
import type { Rarity } from '@/lib/types';

const RARITY_CLASS: Record<Rarity, string> = {
  Common: 'text-rarity-common border-rarity-common/40 bg-rarity-common/10',
  Uncommon: 'text-rarity-uncommon border-rarity-uncommon/40 bg-rarity-uncommon/10',
  Rare: 'text-rarity-rare border-rarity-rare/40 bg-rarity-rare/10',
  Epic: 'text-rarity-epic border-rarity-epic/50 bg-rarity-epic/10',
};

/**
 * The same four tokens with the pill taken off.
 *
 * A separate table rather than a slice of the one above, because picking the `text-*` class
 * out of a shared string at runtime produces a class that exists in the DOM and in no
 * stylesheet — this codebase has shipped that mistake twice.
 */
const RARITY_TEXT: Record<Rarity, string> = {
  Common: 'text-rarity-common/70',
  Uncommon: 'text-rarity-uncommon/70',
  Rare: 'text-rarity-rare/70',
  Epic: 'text-rarity-epic/70',
};

/**
 * How much room the badge takes.
 *
 *   badge  a filled pill — bordered, tinted, bold, uppercase. Right where it sits beside
 *          another pill of the same shape and the two read as a pair (the profile hero's
 *          mastery chip, the field record's rarest-held line).
 *   quiet  the tier as a plain caption in its own colour. Right in the collection grid,
 *          where forty-five filled pills stacked under forty-five pieces of card art turn a
 *          wall of plants into a table — the SHAPE was the noise, not the words.
 *
 * The tier is still spelled out either way, which is the part that matters: it is what lets
 * the rarity aura stay a reinforcement rather than becoming the only place rarity lives
 * (AGENTS.md — no information carried by colour alone).
 */
export type RarityBadgeTone = 'badge' | 'quiet';

/**
 * "Encounter Rate" badge, echoing the wording printed on the cards.
 * Rarity is always spelled out in text — never signalled by colour alone.
 *
 * The text comes from `RARITY_LABEL`, not from the key. Printing the key worked only
 * while every tier's label happened to equal its identifier; the moment one diverged this
 * badge and the meter on the plant page would have shown a card two different encounter
 * rates. Both now read the same table. `rarity-display.test.ts` keeps it that way.
 */
export function RarityBadge({
  rarity,
  tone = 'badge',
  className = '',
}: {
  rarity: Rarity;
  tone?: RarityBadgeTone;
  className?: string;
}) {
  const dress =
    tone === 'quiet'
      ? /*
         * No border, no fill, no uppercase tracking, medium rather than bold, and the tier
         * colour held back to 70%.
         *
         * SIZE COULD NOT DO THIS WORK. The plant's name is `text-xs` (12px) and the type
         * floor is 0.72rem (11.52px), so there is half a pixel of headroom between them —
         * shrinking the tier enough to subordinate it would have gone under the floor
         * `type-floor.test.ts` exists to hold. Weight and colour intensity are the levers
         * that were left, and dimming is checked against AA rather than assumed: the
         * composited contrast of all four tiers is measured on the rendered grid.
         */
        `text-[0.72rem] font-medium ${RARITY_TEXT[rarity]}`
      : `rounded-full border px-2 py-0.5 text-xs font-bold tracking-wide uppercase ${RARITY_CLASS[rarity]}`;

  return (
    <span className={`inline-flex items-center ${dress} ${className}`}>
      <span className="sr-only">Encounter rate: </span>
      {RARITY_LABEL[rarity]}
    </span>
  );
}
