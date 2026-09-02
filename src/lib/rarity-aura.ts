import type { Rarity } from './types';

/**
 * The glow panel behind a collectible card, keyed to its encounter rate.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT IS A PANEL, NOT A HALO. The first version reused `card-aura`, a radial gradient that
 * fades at 72% of the closest side — which draws a soft ELLIPSE. Behind a tall rounded
 * rectangle that reads as a faint smudge at the waist of the card and nothing at the
 * corners. What a collectible wants is a blurred rounded rectangle a little larger than the
 * card, sitting behind it like a lit backing board, so the shape of the glow agrees with
 * the shape of the thing it is framing.
 *
 * IT IS A READOUT, NOT DECORATION. The tint is the SAME token the card's rarity text uses —
 * `RarityBadge` and `RarityMeter` both paint `text-rarity-*` from these four — so the glow
 * and the word agree by construction rather than by somebody keeping two lists in step.
 *
 * NEVER THE ONLY SIGNAL. Rarity is always spelled out in text on the same card, so nothing
 * here is information carried by colour alone (AGENTS.md). Remove every aura and the page
 * still says which tier each card is.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * COMMON USED TO BE VIOLET. `SpeciesHero` carried its own copy of this map in which Common
 * was `violet-700` — the page ground, not a rarity colour — so the one tier that covers most
 * of the deck glowed a colour its own badge never uses. Unified on the token the text uses.
 */
export const RARITY_AURA_COLOUR: Record<Rarity, string> = {
  Common: 'var(--color-rarity-common)',
  Uncommon: 'var(--color-rarity-uncommon)',
  Rare: 'var(--color-rarity-rare)',
  Epic: 'var(--color-rarity-epic)',
};

export interface AuraLayer {
  /**
   * Whole Tailwind classes. NEVER interpolated.
   *
   * Tailwind compiles the utilities it can find as literal text in source; a built string
   * like `-inset-${n}` yields a class that exists in the DOM and in no stylesheet. This
   * codebase has already shipped that mistake twice — with `ring-*` and with an arbitrary
   * `shadow-[...]` — both of which looked correct in the markup and painted nothing.
   */
  className: string;
  /** How much of the rarity colour this layer carries, as a percentage. */
  alpha: number;
}

/**
 * How the four tiers differ, on the four axes that actually read as "rarer".
 *
 *   SPREAD     how far past the card edge the panel reaches (-inset-*)
 *   SOFTNESS   how diffuse it is (blur-*)
 *   SATURATION how much of the rarity colour each layer carries (alpha)
 *   DEPTH      how many layers stack — one flat wash, or a wide bloom with a tighter,
 *              brighter core inside it
 *
 * Common gets a single quiet layer and is deliberately not dead: it still reads as lit,
 * just calm. Epic gets two and is the strongest thing on the page except the card itself,
 * which is the limit the deck's neon already sets for itself and this stays inside.
 *
 * ONE SET PER CARD SIZE, because reach and blur do not scale with the card on their own.
 *
 * The first version had a single set tuned for the grid: `-inset-8` and `blur-3xl`. On a
 * 150px grid card that is a 32px margin under a 64px blur, which smears the panel into
 * nothing; on the 670px hero card the same 32px is five per cent of the width and simply is
 * not there. Measured on both and the hero showed no visible glow at all.
 *
 * So the axes below are tuned twice. `grid` keeps the blur tight enough that the rectangle
 * survives at thumbnail size; `hero` reaches far enough to read as the lit backing panel the
 * card is sitting on.
 */
export type AuraSize = 'grid' | 'hero';

export const RARITY_AURA_LAYERS: Record<AuraSize, Record<Rarity, readonly AuraLayer[]>> = {
  grid: {
    Common: [{ className: '-inset-1.5 rounded-[1.4rem] blur-md', alpha: 2.4 }],
    Uncommon: [{ className: '-inset-2.5 rounded-[1.7rem] blur-lg', alpha: 3.4 }],
    Rare: [
      { className: '-inset-4 rounded-[2.2rem] blur-xl', alpha: 3.2 },
      { className: '-inset-1.5 rounded-[1.4rem] blur-md', alpha: 4.2 },
    ],
    Epic: [
      { className: '-inset-5 rounded-[2.5rem] blur-2xl', alpha: 4.2 },
      { className: '-inset-2 rounded-[1.6rem] blur-lg', alpha: 5.4 },
    ],
  },
  hero: {
    Common: [{ className: '-inset-5 rounded-[2.5rem] blur-xl', alpha: 2.6 }],
    Uncommon: [{ className: '-inset-8 rounded-[3rem] blur-2xl', alpha: 3.6 }],
    Rare: [
      { className: '-inset-14 rounded-[4.5rem] blur-2xl', alpha: 3.4 },
      { className: '-inset-5 rounded-[2.5rem] blur-xl', alpha: 4.6 },
    ],
    Epic: [
      { className: '-inset-20 rounded-[6rem] blur-2xl', alpha: 4.4 },
      { className: '-inset-8 rounded-[3rem] blur-xl', alpha: 6.0 },
    ],
  },
};

/**
 * What a card whose tier the player has not earned yet is allowed to glow.
 *
 * The grid prints "Find it to reveal" WHERE THE ENCOUNTER RATE WOULD GO — the tier is
 * withheld until you find the plant. Four aura colours would hand that straight back, and
 * anyone could read off which silhouettes were worth chasing. So a concealed card takes the
 * page's own violet at the gentlest strength: still a collectible, still telling you nothing.
 */
export const CONCEALED_AURA_COLOUR = 'var(--color-violet-700)';
export const concealedAuraLayers = (size: AuraSize) => RARITY_AURA_LAYERS[size].Common;
