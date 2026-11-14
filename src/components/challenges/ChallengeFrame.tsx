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
      <span aria-hidden="true" className="absolute -top-1.5 -left-1.5 h-2.5 w-2.5 bg-gold-300" />
      <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 bg-gold-300" />
      <span aria-hidden="true" className="absolute -bottom-1.5 -left-1.5 h-2.5 w-2.5 bg-gold-300" />
      <span aria-hidden="true" className="absolute -right-1.5 -bottom-1.5 h-2.5 w-2.5 bg-gold-300" />
      <span
        aria-hidden="true"
        className="absolute -top-3 left-1/2 -translate-x-1/2 bg-plum-900 px-2 text-gold-300"
      >
        <Art name="leaf" className="h-4 w-4" />
      </span>
      {children}
    </div>
  );
}
