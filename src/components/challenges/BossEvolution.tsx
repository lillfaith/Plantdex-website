'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PlantSprite } from '@/components/PlantSprite';
import { CHALLENGE_DISCLAIMER } from '@/lib/boss-form';
import { Art } from './ChallengeArt';
import { usePageHidden } from './BotanicalStage';
import { Sparkles } from './Sparkles';

/**
 * THE EVOLUTION, and the one moment in the challenges that is allowed to be big.
 *
 * It dims the screen (a flat translucent layer, not a blur), then in order: the adult fades out,
 * one gold ring pulses outward, a warm glow swells and sparks fly as the Boss Form fades in,
 * and "Evolution Complete!" rises in over it. About three seconds, and SKIPPABLE at any moment:
 * Skip (or Escape) lands every animation on its end state at once, and reduced motion starts
 * there.
 *
 * IT SHOWS ONLY WHAT EXISTS. The Boss Form sprite is the one already in the manifest, and the
 * only words are the headline, the plant's name, and the fixed sentence every result carries.
 * No XP, achievement, frame or collectible is mentioned, because none is awarded.
 *
 * Rendered through a portal so it covers the fixed navigation too. Opacity and transform only;
 * paused while the page is hidden.
 */
export function BossEvolution({
  herbId,
  name,
  onDone,
}: {
  herbId: string;
  name: string;
  onDone: () => void;
}) {
  // True once we are in the browser. A portal needs `document`, and this avoids a mismatch.
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [skipped, setSkipped] = useState(false);
  const hidden = usePageHidden();
  const done = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!mounted) return;
    done.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDone();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mounted, onDone]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Evolution complete"
      data-paused={hidden}
      data-skip={skipped}
      className="boss-scene fixed inset-0 z-[70] flex flex-col items-center justify-center bg-plum-950/95 px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-center"
    >
      {!skipped ? (
        <button
          type="button"
          onClick={() => setSkipped(true)}
          className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-4 min-h-11 px-3 text-sm font-bold text-violet-200 underline-offset-4 hover:underline"
        >
          Skip
        </button>
      ) : null}

      <div className="relative flex h-56 w-56 items-center justify-center">
        <span
          aria-hidden="true"
          className="evolve-flash absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgb(255_210_110/0.65),rgb(190_140_255/0.25)_60%,transparent_80%)]"
        />
        <span
          aria-hidden="true"
          className="evolve-ring absolute inset-6 rounded-full border-[5px] border-gold-300"
        />
        <div className="evolve-out absolute inset-0 flex items-center justify-center">
          <PlantSprite herbId={herbId} alt="" stage="flowering" scale={1} frozen />
        </div>
        <div className="evolve-in absolute inset-0 flex items-center justify-center">
          <PlantSprite herbId={herbId} alt={`${name}, Boss Form`} stage="boss" scale={1} />
        </div>
        <Sparkles count={10} radius={104} startMs={1000} />
      </div>

      <h2 className="evolve-text mt-5 font-display text-4xl leading-tight font-extrabold text-gold-plate">
        Evolution Complete!
      </h2>
      <p className="evolve-text-late mt-1 flex items-center gap-2 text-lg font-bold text-violet-50">
        <Art name="crown" className="h-5 w-5 text-gold-300" />
        {name} · Boss Form
      </p>
      <p className="evolve-text-late mx-auto mt-3 max-w-xs text-xs text-violet-300">{CHALLENGE_DISCLAIMER}</p>
      <button
        ref={done}
        type="button"
        onClick={onDone}
        className="evolve-text-late arcade-key holo-fill mt-6 min-h-14 w-full max-w-xs rounded-full px-6 text-base font-extrabold text-plum-900"
      >
        Done
      </button>
    </div>,
    document.body,
  );
}
