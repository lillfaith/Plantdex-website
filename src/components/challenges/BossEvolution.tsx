'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PlantSprite } from '@/components/PlantSprite';
import { CHALLENGE_DISCLAIMER } from '@/lib/boss-form';
import { Art } from './ChallengeArt';
import { usePageHidden } from './BotanicalStage';
import { Sparkles } from './Sparkles';

/** Boss frame is 230x190 and its ink is ~76% wide, ~84% tall (sprites.json `content`). */
const INK_W = 175;
const INK_H = 160;
const FRAME_H = 190;

/**
 * The largest scale at which the Boss Form's ink fits the screen, in steps of 0.2. The art is
 * drawn on a 5x5-sheet-pixel grid, so a multiple of 0.2 is a whole number of screen pixels per
 * art pixel and `image-rendering: pixelated` stays crisp (1.4 is 7px blocks, 1.6 is 8px). A
 * fractional scale would shimmer. Width leaves a 20px gutter each side; height leaves room for
 * the words and the Done button on a short phone.
 */
export function evolutionScale(width: number, height: number): number {
  const byWidth = (width - 40) / INK_W;
  const byHeight = (height * 0.38) / INK_H;
  const raw = Math.min(byWidth, byHeight, 2.2);
  return Math.max(1, Math.floor(raw / 0.2 + 1e-9) * 0.2);
}

function subscribeResize(cb: () => void) {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
}
function useEvolutionScale(): number {
  return useSyncExternalStore(
    subscribeResize,
    () => Number(evolutionScale(window.innerWidth, window.innerHeight).toFixed(1)),
    () => 1,
  );
}

/**
 * THE EVOLUTION, and the one moment in the challenges that is allowed to be big. About three
 * seconds, in beats:
 *
 *   0.0s  the screen dims
 *   0.3s  the adult swells a little and a warm glow builds behind it
 *   1.25s ONE gold flash; the adult gives way and a ring pulses outward
 *   1.35s the Boss Form pops in large, then settles; two rings and a burst of gold sparks
 *   2.0s  "Evolution Complete!" rises in
 *   2.5s  the plant's name and the Done button arrive, and the Boss Form is left to admire
 *
 * SKIPPABLE: Skip (or Escape) lands every animation on its end state at once, and reduced
 * motion starts there. Nothing loops. Opacity and transform only, no blur, paused while the
 * page is hidden.
 *
 * EARNED OR PREVIEW, AND THEY LOOK DIFFERENT ON PURPOSE. `preview` (only ever passed by the
 * development-only button) swaps the headline for "Evolution Preview" and says plainly that
 * nothing was earned, so a screenshot of one can never be mistaken for the other. The earned
 * version is reached only from the server's own answer.
 *
 * IT SHOWS ONLY WHAT EXISTS. The Boss Form sprite is the one already in the manifest and the
 * words are the headline, the plant's name and the fixed disclaimer. No XP, badge, frame or
 * collectible is mentioned, because none is awarded.
 */
export function BossEvolution({
  herbId,
  name,
  preview = false,
  onDone,
}: {
  herbId: string;
  name: string;
  preview?: boolean;
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
  const scale = useEvolutionScale();
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
      aria-label={preview ? 'Evolution preview, nothing earned' : 'Evolution complete'}
      data-paused={hidden}
      data-skip={skipped}
      data-evolution={preview ? 'preview' : 'earned'}
      className="boss-scene fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-plum-950/95 px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-center"
    >
      {/* The one flash. A flat gold layer fading in and out: no blur, no filter. */}
      <span
        aria-hidden="true"
        className="evolve-burst pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgb(255_236_170),rgb(255_210_110/0.7)_35%,transparent_75%)]"
      />

      {!skipped ? (
        <button
          type="button"
          onClick={() => setSkipped(true)}
          className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-4 z-20 min-h-11 px-3 text-sm font-bold text-violet-200 underline-offset-4 hover:underline"
        >
          Skip
        </button>
      ) : null}

      <div
        className="relative flex w-full items-center justify-center"
        style={{ height: FRAME_H * scale }}
      >
        <span
          aria-hidden="true"
          className="evolve-flash absolute inset-0 mx-auto aspect-square h-full max-w-full rounded-full bg-[radial-gradient(closest-side,rgb(255_210_110/0.6),rgb(190_140_255/0.25)_62%,transparent_82%)]"
        />
        <span
          aria-hidden="true"
          className="evolve-ring absolute top-1/2 left-1/2 h-[70%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-gold-300"
        />
        <span
          aria-hidden="true"
          className="evolve-ring-late absolute top-1/2 left-1/2 h-[70%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-violet-200"
        />
        <div className="evolve-out absolute inset-0 flex items-center justify-center">
          <PlantSprite herbId={herbId} alt="" stage="flowering" scale={scale} frozen />
        </div>
        <div className="evolve-in absolute inset-0 flex items-center justify-center">
          <PlantSprite herbId={herbId} alt={`${name}, Boss Form`} stage="boss" scale={scale} />
        </div>
        <Sparkles count={14} radius={Math.round(INK_W * scale * 0.62)} startMs={1300} />
        <Sparkles count={10} radius={Math.round(INK_W * scale * 0.9)} startMs={1380} />
      </div>

      <h2 className="evolve-text mt-2 font-display text-4xl leading-tight font-extrabold text-gold-plate">
        {preview ? 'Evolution Preview' : 'Evolution Complete!'}
      </h2>
      <p className="evolve-text-late mt-1 flex items-center gap-2 text-lg font-bold text-violet-50">
        <Art name="crown" className="h-5 w-5 text-gold-300" />
        {name} · Boss Form
      </p>
      <p className="evolve-text-late mx-auto mt-3 max-w-xs text-sm text-violet-200">
        {preview ? 'Preview only. Nothing was earned or recorded.' : CHALLENGE_DISCLAIMER}
      </p>
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
