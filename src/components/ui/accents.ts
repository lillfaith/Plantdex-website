/**
 * A section's colour identity, and the one place the profile page's type floor is set.
 *
 * THE HUES ARE NOT NEW. `globals.css` carries a second ramp sampled straight down the
 * middle of the printed card BACKS — pink at the top edge, pale lilac through the middle,
 * periwinkle at the foot. Those shades already belong to this deck, so giving each section
 * its own identity costs no new colour and nothing is added to `@theme`. CLAUDE.md's rule
 * still holds: if a shade is too dim for the text placed on it, move UP the ramp rather
 * than inventing one.
 *
 * AN ACCENT IS TRIM, NOT A REPAINT. Eyebrow, hairline border, icon tint and a faint wash.
 * Body text stays on the violet ramp at every section, so per-section colour cannot drag
 * legibility around with it — the contrast pass measures one text ramp, not nine.
 */
export type AccentName =
  | 'lilac'
  | 'pink'
  | 'orchid'
  | 'mauve'
  | 'violet'
  | 'gold'
  | 'indigo'
  | 'blossom'
  | 'purple'
  | 'neutral';

export interface Accent {
  /** The eyebrow and any small caps that carry the section's identity. */
  label: string;
  /** Hairline border for the section's own surface. */
  border: string;
  /** Icon tint. Decorative, so it may sit dimmer than text. */
  icon: string;
  /** A faint wash, well below the card art's brightness. */
  wash: string;
}

/**
 * `mystery-indigo` is the darkest shade here and was the one at risk of failing AA as an
 * eyebrow on plum. It is used for the compounds plate; if the composited contrast pass ever
 * fails it, the fix is `mystery-purple`, not a new colour.
 */
export const ACCENTS: Record<AccentName, Accent> = {
  lilac: {
    label: 'text-mystery-lilac',
    border: 'border-mystery-lilac/25',
    icon: 'text-mystery-lilac/80',
    wash: 'bg-mystery-lilac/[0.04]',
  },
  pink: {
    label: 'text-mystery-pink',
    border: 'border-mystery-pink/25',
    icon: 'text-mystery-pink/80',
    wash: 'bg-mystery-pink/[0.04]',
  },
  orchid: {
    label: 'text-mystery-orchid',
    border: 'border-mystery-orchid/25',
    icon: 'text-mystery-orchid/80',
    wash: 'bg-mystery-orchid/[0.04]',
  },
  mauve: {
    label: 'text-mystery-mauve',
    border: 'border-mystery-mauve/25',
    icon: 'text-mystery-mauve/80',
    wash: 'bg-mystery-mauve/[0.04]',
  },
  violet: {
    label: 'text-mystery-violet',
    border: 'border-mystery-violet/25',
    icon: 'text-mystery-violet/80',
    wash: 'bg-mystery-violet/[0.04]',
  },
  purple: {
    label: 'text-mystery-purple',
    border: 'border-mystery-purple/25',
    icon: 'text-mystery-purple/80',
    wash: 'bg-mystery-purple/[0.04]',
  },
  indigo: {
    label: 'text-mystery-indigo',
    border: 'border-mystery-indigo/30',
    icon: 'text-mystery-indigo/80',
    wash: 'bg-mystery-indigo/[0.05]',
  },
  blossom: {
    label: 'text-pink-accent',
    border: 'border-pink-accent/25',
    icon: 'text-pink-accent/80',
    wash: 'bg-pink-accent/[0.04]',
  },
  // Gold stays the restrained one: display type and earned state, never a chip fill.
  gold: {
    label: 'text-gold-400',
    border: 'border-gold-500/25',
    icon: 'text-gold-400/80',
    wash: 'bg-gold-500/[0.04]',
  },
  neutral: {
    label: 'text-violet-300',
    border: 'border-violet-700/60',
    icon: 'text-violet-300',
    wash: '',
  },
};

/**
 * THE TYPE FLOOR, in one constant because it drifted once already.
 *
 * The redesign shipped uppercase eyebrows at 0.62rem and plate labels at 0.58rem — 9.9px
 * and 9.3px — which on a phone put 15% of the page's characters below 12px, under wide
 * letter-spacing, which is the least legible combination available. The old page's floor
 * was 12px. Nothing here goes below 0.72rem, and the tracking came down with it: wide
 * tracking is exactly what makes small caps hard to read and it buys nothing at this size.
 */
export const EYEBROW = 'text-[0.72rem] font-bold tracking-[0.1em] uppercase';

/** A micro-label inside a tile or plate. Same floor, lighter weight. */
export const MICRO_LABEL = 'text-[0.72rem] font-bold tracking-[0.1em] uppercase';

/**
 * Reading copy is 16px on a phone and 14px from `sm:` up. This content is read outdoors on
 * a handheld, which is the whole premise of the deck, and 16px is the normal floor there.
 */
export const READING = 'text-base sm:text-sm';

/** A note or caveat: never the smallest thing on the page, because it often matters most. */
export const NOTE = 'text-sm sm:text-xs';
