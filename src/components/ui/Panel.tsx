import type { ReactNode } from 'react';
import { ACCENTS, type AccentName } from './accents';

/**
 * The profile page's surface primitive.
 *
 * THE POINT OF THE VARIANTS: the page this replaced was eight consecutive `.panel`
 * rectangles of identical size, padding and radius, and the reason nothing on it read as
 * more important than anything else. A shared surface component whose only shape was
 * `.panel` would rebuild exactly that. So a frame is a deliberate choice per band:
 *
 *   card   the existing `.panel` — content that sits in its own box
 *   plate  a wider, flatter specimen surface with a hairline inner rule
 *   rail   a low horizontal strip, for state rather than content
 *   bare   no surface at all, for reading matter that belongs on the page ground
 *
 * Nothing here paints a colour that is not a deck token, and `.panel` / `.panel-raised`
 * are the utilities already defined in globals.css rather than a second set.
 */
export type PanelFrame = 'card' | 'plate' | 'rail' | 'bare';

/**
 * WHAT KIND OF THING THIS PANEL HOLDS — and therefore how much light it gets.
 *
 *   game     progression, XP, rarity, sightings. The only family that blooms.
 *   field    botanical field notes. A thin container, not a card.
 *   science  compounds, sources, safety. The flattest, most readable surface here.
 *
 * The families are defined in globals.css so the whole neon budget lives in one place. A
 * safety notice that glowed like an achievement would read as a reward, on a page people
 * use to decide what to put in their mouth — which is why `science` is deliberately the
 * least decorated thing on the page rather than merely quieter.
 */
export type PanelFamily = 'game' | 'field' | 'science';

const FAMILY: Record<PanelFamily, string> = {
  game: 'game-panel',
  field: 'field-panel',
  science: 'science-panel',
};

const FRAME: Record<PanelFrame, string> = {
  card: 'panel',
  plate: 'panel-raised rounded-card border border-violet-700/50',
  rail: 'panel-raised rounded-2xl',
  bare: '',
};

const PAD: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6 sm:p-8',
};

export function Panel({
  frame = 'card',
  family,
  pad = 'md',
  as: Tag = 'section',
  accent,
  clip = false,
  className = '',
  children,
  ...rest
}: {
  frame?: PanelFrame;
  /** Overrides `frame`: the family decides the surface, the frame only the shape. */
  family?: PanelFamily;
  /** Clips the top-right corner, so a game panel is known by shape and not only by glow. */
  clip?: boolean;
  pad?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'section' | 'div' | 'aside';
  /** Gives the surface this section's identity: a hairline border and a faint wash. */
  accent?: AccentName;
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const pads = frame === 'bare' && !family ? PAD.none : PAD[pad];
  const surface = family ? FAMILY[family] : FRAME[frame];
  // The accent's border overrides the frame's own, so the two cannot fight; the wash sits
  // far below the printed card's brightness, which stays the page's brightest object.
  const tone = accent && accent !== 'neutral' ? ACCENTS[accent] : null;
  const tint = tone ? `${tone.border} ${tone.wash}` : '';
  return (
    <Tag
      className={`${surface} ${clip ? 'game-clip' : ''} ${pads} ${tint} ${className}`
        .replace(/\s+/g, ' ')
        .trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}
