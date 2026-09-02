import type { Rarity } from './types';

/**
 * The glow behind a collectible card, keyed to its encounter rate.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT IS A READOUT, NOT DECORATION. The tint is the SAME token the card's rarity text uses
 * — `RarityBadge` and `RarityMeter` both paint `text-rarity-*` from these four — so the
 * halo and the word agree by construction rather than by somebody remembering to keep two
 * lists in step. A per-species colour would have been a decorative claim about a plant;
 * encounter rate is real data the card prints.
 *
 * NEVER THE ONLY SIGNAL. Rarity is always spelled out in text on the same card, so nothing
 * here is information conveyed by colour alone (AGENTS.md). Remove every aura and the page
 * still says which tier each card is.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * COMMON USED TO BE VIOLET. `SpeciesHero` carried its own copy of this map in which Common
 * was `violet-700` — the page ground, not a rarity colour — so the one tier that appears on
 * most of the deck glowed a colour its own badge never used. Unified here on the token the
 * text actually uses.
 */
export const RARITY_AURA_COLOUR: Record<Rarity, string> = {
  Common: 'var(--color-rarity-common)',
  Uncommon: 'var(--color-rarity-uncommon)',
  Rare: 'var(--color-rarity-rare)',
  Epic: 'var(--color-rarity-epic)',
};

/**
 * How far the glow reaches, and how much of it there is.
 *
 * Four steps, each a genuine step up, and the top one still restrained: the printed card
 * has to stay the brightest object on the screen — the same limit `game-panel` sets for the
 * neon — so Epic is "unmistakably special" and not "lit from within". Scale spreads the
 * halo, blur keeps it atmospheric rather than a ring, opacity carries most of the
 * difference because it is the axis the eye reads as intensity.
 *
 * These are whole Tailwind classes rather than numbers because Tailwind compiles utilities
 * it can see in source; an interpolated `scale-[${n}]` produces a class that exists in the
 * DOM and in no stylesheet, which is a mistake this codebase has already made twice with
 * `ring-*` and arbitrary shadows.
 */
export const RARITY_AURA_STRENGTH: Record<Rarity, string> = {
  Common: 'scale-105 blur-lg opacity-25',
  Uncommon: 'scale-110 blur-xl opacity-40',
  Rare: 'scale-115 blur-xl opacity-60',
  Epic: 'scale-125 blur-2xl opacity-80',
};
