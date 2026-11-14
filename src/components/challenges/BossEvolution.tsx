'use client';

import { PlantSprite } from '@/components/PlantSprite';
import { CHALLENGE_DISCLAIMER } from '@/lib/boss-form';

/**
 * THE EVOLUTION: three beats, once, then it rests on the Boss Form.
 *   1. the adult sprite fades out,  2. one gold ring pulses outward,  3. the Boss Form fades in.
 * Opacity and transform only (no blur, which halved the reveal's frame rate before), and a still
 * frame under reduced motion. It reuses the existing Boss Form sprite; nothing new is drawn.
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
  return (
    <section className="mt-6 text-center" aria-live="polite">
      <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
        <span
          aria-hidden="true"
          className="evolve-ring absolute inset-4 rounded-full border-[5px] border-gold-300"
        />
        <div className="evolve-out absolute inset-0 flex items-center justify-center">
          <PlantSprite herbId={herbId} alt="" stage="flowering" scale={1} frozen />
        </div>
        <div className="evolve-in absolute inset-0 flex items-center justify-center" style={{ opacity: 0 }}>
          <PlantSprite herbId={herbId} alt={`${name}, Boss Form`} stage="boss" scale={1} />
        </div>
      </div>
      <h2 className="mt-4 font-display text-3xl font-extrabold text-gold-plate">{name} evolved!</h2>
      <p className="mt-1 text-base font-bold text-violet-100">Boss Form</p>
      <p className="mx-auto mt-3 max-w-xs text-xs text-violet-300">{CHALLENGE_DISCLAIMER}</p>
      <button
        type="button"
        onClick={onDone}
        className="arcade-key holo-fill mt-5 min-h-14 w-full rounded-full px-6 text-base font-extrabold text-plum-900"
      >
        Done
      </button>
    </section>
  );
}
