'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import type { Herb } from '@/lib/types';

/**
 * The physical card, front and back, with a flip toggle.
 *
 * A real button drives the flip rather than a hover effect, so it works on touch and
 * from the keyboard. The flip animation is decorative — the underlying images swap
 * regardless, so reduced-motion users lose nothing.
 */
export function CardFlip({ herb }: { herb: Herb }) {
  const [showBack, setShowBack] = useState(false);
  const panelId = useId();

  return (
    <div>
      <div
        id={panelId}
        className="relative mx-auto w-56 overflow-hidden rounded-[var(--radius-card)] shadow-card-lift transition-transform duration-500 sm:mx-0 sm:w-64"
        style={{ transform: showBack ? 'rotateY(180deg)' : undefined, transformStyle: 'preserve-3d' }}
      >
        <div style={{ transform: showBack ? 'rotateY(180deg)' : undefined }}>
          <Image
            src={showBack ? herb.backImage : herb.image}
            alt={
              showBack
                ? `Back of Plantdex card ${herb.cardNumber}: ${herb.commonName}. The same information is listed in text below.`
                : `Front of Plantdex card ${herb.cardNumber}: ${herb.commonName} (${herb.scientificName})`
            }
            width={800}
            height={1295}
            priority
            className="w-full"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowBack((current) => !current)}
        aria-expanded={showBack}
        aria-controls={panelId}
        className="mx-auto mt-3 flex min-h-11 items-center justify-center gap-2 rounded-full border border-violet-600 px-4 text-sm font-semibold text-violet-200 hover:bg-violet-800 sm:mx-0"
      >
        <span aria-hidden="true">⟲</span>
        {showBack ? 'Show card front' : 'Show card back'}
      </button>
    </div>
  );
}
