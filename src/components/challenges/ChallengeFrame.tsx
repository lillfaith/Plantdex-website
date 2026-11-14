import type { ReactNode } from 'react';
import { Art } from './ChallengeArt';

/**
 * The botanical frame around the question: a pixel-stepped gold border (see `challenge-frame`
 * in globals.css) with a small leaf set into the top edge and a square pixel at each corner.
 * Decoration only. The content inside is untouched, so photographs keep their own sizes and
 * tap regions keep their own coordinates.
 */
export function ChallengeFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`challenge-frame ${className}`}>
      <span aria-hidden="true" className="absolute -top-1 -left-1 h-2 w-2 bg-gold-300" />
      <span aria-hidden="true" className="absolute -top-1 -right-1 h-2 w-2 bg-gold-300" />
      <span aria-hidden="true" className="absolute -bottom-1 -left-1 h-2 w-2 bg-gold-300" />
      <span aria-hidden="true" className="absolute -right-1 -bottom-1 h-2 w-2 bg-gold-300" />
      <span
        aria-hidden="true"
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-plum-900 px-1.5 text-gold-300"
      >
        <Art name="leaf" className="h-3.5 w-3.5" />
      </span>
      {children}
    </div>
  );
}
