import {
  CONCEALED_AURA_COLOUR,
  concealedAuraLayers,
  RARITY_AURA_COLOUR,
  RARITY_AURA_LAYERS,
  type AuraSize,
} from '@/lib/rarity-aura';
import type { Rarity } from '@/lib/types';

/**
 * The rarity glow panel that sits behind a card.
 *
 * Each layer is a blurred rounded rectangle a little larger than the card, tinted with the
 * rarity token via `color-mix` — the same way `.panel` and `game-panel` derive their own
 * surfaces, so no new colour enters the system. A higher tier stacks two: a wide soft bloom
 * with a tighter, brighter core inside it, which is what gives the effect depth rather than
 * just more brightness.
 *
 * BEHIND, AND INERT. `z-0` with the card raised to `z-10` above it, `pointer-events-none`
 * so it never intercepts the link it sits behind, and `aria-hidden` so it stays out of the
 * accessibility tree — the tier is already spelled out in text on the card itself.
 *
 * IT IS NOT `-z-10`, AND THAT WAS THE BUG. A negative z-index paints an element behind the
 * background of its stacking context — and `body` carries the plum ground plus two radial
 * gradients, so every layer was being drawn UNDERNEATH the page itself. Alpha at 0.85 and
 * a 40px blur still sampled as rgb(33,23,39) against a rgb(23,16,28) ground: present in the
 * DOM, correct in computed style, and painted where nobody could see it. The card is lifted
 * to `z-10` instead, so the aura sits between the page and the card rather than below both.
 *
 * IT CANNOT HAZE THE CARD FACE. The layers are strictly behind an opaque card, so no part
 * of the artwork or its text is ever drawn through them. The glow is only ever visible in
 * the margin around the card.
 *
 * THE PARENT MUST BE `relative` AND MUST NOT CLIP. A card's own root carries
 * `overflow-hidden` to round its artwork, so an aura placed inside one is invisible — it is
 * drawn entirely in the region that gets clipped away, which is the whole margin it needs.
 * It belongs in a wrapper around the card, never inside it.
 */
export function RarityAura({
  rarity,
  size = 'grid',
  concealed = false,
  className = '',
}: {
  rarity: Rarity;
  /** Which tuning to use. Reach and blur do not scale with the card on their own. */
  size?: AuraSize;
  /** The card's tier is not known to the player yet — see CONCEALED_AURA_COLOUR. */
  concealed?: boolean;
  className?: string;
}) {
  const layers = concealed ? concealedAuraLayers(size) : RARITY_AURA_LAYERS[size][rarity];
  const colour = concealed ? CONCEALED_AURA_COLOUR : RARITY_AURA_COLOUR[rarity];

  return (
    <>
      {layers.map((layer) => (
        <div
          key={layer.className}
          aria-hidden="true"
          className={`pointer-events-none absolute z-0 ${layer.className} ${className}`}
          style={{
            background: `color-mix(in srgb, ${colour} ${layer.alpha}%, transparent)`,
          }}
        />
      ))}
    </>
  );
}
