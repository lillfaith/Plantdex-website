'use client';

import { useCallback, useRef } from 'react';
import type { DiscoveryResult, Herb } from '@/lib/types';
import { useHerbdex } from '@/state/HerbdexProvider';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * The "I Found This Plant" flow.
 *
 * Confirm → record → reveal → award XP → update progress → surface any new achievements,
 * matching the discovery sequence in AGENTS.md.
 *
 * Native <dialog> is used so focus trapping, Escape-to-close and focus restoration come
 * from the platform rather than from hand-rolled key handling.
 *
 * The celebration deliberately lives in the PARENT, not here. Discovering flips this page
 * from its locked view to its full view, which unmounts this component — so a dialog owned
 * here would be destroyed the instant it was needed. The parent survives that swap.
 */
export function DiscoverPanel({
  herb,
  label = 'I Found This Plant',
  spoilerFree = false,
  onDiscovered,
}: {
  herb: Herb;
  /** CTA wording. The locked page says "Log a Discovery"; the revealed page keeps the default. */
  label?: string;
  /** On an undiscovered page the confirm step must not leak the plant's name. */
  spoilerFree?: boolean;
  /** Called only for a genuine first discovery, so the parent can celebrate it. */
  onDiscovered?: (result: DiscoveryResult) => void;
}) {
  const { isDiscovered, discover, state, ready } = useHerbdex();

  const confirmRef = useRef<HTMLDialogElement>(null);

  const discovered = ready && isDiscovered(herb.id);
  const discoveredAt = state.discoveries[herb.id];

  const closeDialog = useCallback((ref: React.RefObject<HTMLDialogElement | null>) => {
    ref.current?.close();
  }, []);

  const onConfirm = useCallback(() => {
    const outcome = discover(herb);
    closeDialog(confirmRef);
    // Only celebrate a genuine first discovery. A replayed confirm awards nothing and
    // shows nothing, which is what makes double-tapping harmless rather than lucrative.
    if (outcome.awarded) onDiscovered?.(outcome);
  }, [discover, herb, closeDialog, onDiscovered]);

  if (!ready) {
    // Placeholder of the same height, so the layout does not jump once storage is read.
    return <div className="min-h-12 rounded-full bg-plum-800/40" aria-hidden="true" />;
  }

  return (
    <>
      {discovered ? (
        <div className="panel flex items-center gap-3 p-4">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-lg text-gold-300"
          >
            <PlantdexIcon name="discovered" />
          </span>
          <div>
            <p className="text-sm font-bold text-gold-300">Discovered</p>
            {discoveredAt && (
              <p className="text-xs text-violet-300">
                <time dateTime={discoveredAt}>
                  {new Date(discoveredAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </p>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => confirmRef.current?.showModal()}
          className="group relative min-h-12 w-full overflow-hidden rounded-full bg-gradient-to-r from-gold-500 to-pink-accent px-6 text-base font-bold text-violet-deep shadow-card transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <PlantdexIcon name="discovered" className="text-base" />
            {label}
            <span className="text-sm font-extrabold opacity-70">+{herb.xp} XP</span>
          </span>
        </button>
      )}

      {/* Confirmation */}
      <dialog
        ref={confirmRef}
        aria-labelledby="confirm-title"
        className="panel m-auto w-[min(26rem,calc(100vw-2rem))] p-5 text-violet-100 backdrop:bg-plum-950/80 backdrop:backdrop-blur-sm"
      >
        <h2 id="confirm-title" className="font-display text-lg font-bold text-gold-plate">
          Add {spoilerFree ? `card #${String(herb.cardNumber).padStart(2, '0')}` : herb.commonName}{' '}
          to your Herbdex?
        </h2>
        <p className="mt-2 text-sm text-violet-200">
          Only if you actually found it outdoors. <strong className="text-gold-300">{herb.xp} XP</strong>,
          once.
        </p>
        <p className="mt-2 text-xs text-violet-300">
          Logging a find isn&apos;t confirming an identification, and never makes a plant safe
          to use.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => closeDialog(confirmRef)}
            className="min-h-11 rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-plum-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep transition-transform hover:bg-gold-400 active:scale-[0.99] motion-reduce:active:scale-100"
          >
            Yes, I found it
          </button>
        </div>
      </dialog>

    </>
  );
}
