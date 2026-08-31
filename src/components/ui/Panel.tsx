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
  pad = 'md',
  as: Tag = 'section',
  accent,
  className = '',
  children,
  ...rest
}: {
  frame?: PanelFrame;
  pad?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'section' | 'div' | 'aside';
  /** Gives the surface this section's identity: a hairline border and a faint wash. */
  accent?: AccentName;
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const pads = frame === 'bare' ? PAD.none : PAD[pad];
  // The accent's border overrides the frame's own, so the two cannot fight; the wash sits
  // far below the printed card's brightness, which stays the page's brightest object.
  const tone = accent && accent !== 'neutral' ? ACCENTS[accent] : null;
  const tint = tone ? `${tone.border} ${tone.wash}` : '';
  return (
    <Tag className={`${FRAME[frame]} ${pads} ${tint} ${className}`.replace(/\s+/g, ' ').trim()} {...rest}>
      {children}
    </Tag>
  );
}
