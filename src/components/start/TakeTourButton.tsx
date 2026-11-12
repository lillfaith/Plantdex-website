'use client';

import { openTour } from '@/lib/welcome-tour';

/** An optional way back into the introduction. Writes nothing; see `welcome-tour.ts`. */
export function TakeTourButton({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openTour}
      className={`tap-44 inline-flex items-center justify-center rounded px-3 text-sm font-bold text-violet-300 underline-offset-2 transition-colors hover:text-violet-100 hover:underline focus-visible:text-violet-100 ${className}`}
    >
      Take the tour
    </button>
  );
}
