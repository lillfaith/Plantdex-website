import { RARITY_AURA_COLOUR, RARITY_AURA_STRENGTH } from '@/lib/rarity-aura';
import type { Rarity } from '@/lib/types';

/**
 * The rarity glow, as one element.
 *
 * Nothing new is drawn here: `card-aura` is the existing utility — a radial gradient that
 * fades out at 72% — and this only supplies its `--aura` colour and a strength. The plant
 * page already did exactly that inline; this is that code with the map lifted out so the
 * grid, the showcase and the hero cannot drift apart.
 *
 * BEHIND, AND INERT. `-z-10` puts it under the card, `pointer-events-none` keeps it out of
 * the way of the link it sits behind, and `aria-hidden` keeps it out of the accessibility
 * tree — the tier it represents is already spelled out in text on the card itself.
 *
 * THE PARENT MUST BE `relative` AND MUST NOT CLIP. A card's own root has `overflow-hidden`
 * to round its artwork, so an aura placed inside one is invisible: it is drawn entirely in
 * the region that gets clipped away. It belongs in a wrapper around the card, never in it.
 */
export function RarityAura({
  rarity,
  concealed = false,
  className = '',
}: {
  rarity: Rarity;
  /**
   * The card's tier is not known to the player yet.
   *
   * THIS IS NOT A STYLE CHOICE, IT IS THE SAME SECRET THE BADGE KEEPS. An undiscovered card
   * in the grid shows "Find it to reveal" WHERE ITS ENCOUNTER RATE WOULD GO — the tier is
   * deliberately withheld until you find the plant. Tinting its halo by rarity would hand
   * that back: four colours, four tiers, and anyone could read off which silhouettes are
   * worth chasing. So a concealed card glows the page's own violet at the gentlest strength
   * — it still reads as a collectible, and it still tells you nothing.
   */
  concealed?: boolean;
  className?: string;
}) {
  const strength = concealed ? RARITY_AURA_STRENGTH.Common : RARITY_AURA_STRENGTH[rarity];
  const colour = concealed ? 'var(--color-violet-700)' : RARITY_AURA_COLOUR[rarity];
  return (
    <div
      aria-hidden="true"
      className={`card-aura pointer-events-none absolute inset-0 -z-10 ${strength} ${className}`}
      style={{ ['--aura' as string]: colour }}
    />
  );
}
