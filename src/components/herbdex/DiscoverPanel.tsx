'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { DiscoveryResult, Herb } from '@/lib/types';
import { getAchievement } from '@/lib/achievements';
import { useHerbdex } from '@/state/HerbdexProvider';
import { assetPath } from '@/lib/asset-path';

/**
 * The "I Found This Plant" flow.
 *
 * Confirm → record → reveal → award XP → surface any new achievements, matching the
 * discovery sequence in AGENTS.md.
 *
 * Native <dialog> is used for both steps so focus trapping, Escape-to-close and focus
 * restoration come from the platform rather than from hand-rolled key handling.
 */
export function DiscoverPanel({ herb }: { herb: Herb }) {
  const { isDiscovered, discover, state, ready } = useHerbdex();

  const confirmRef = useRef<HTMLDialogElement>(null);
  const celebrateRef = useRef<HTMLDialogElement>(null);
  const [result, setResult] = useState<DiscoveryResult | null>(null);

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
    if (outcome.awarded) {
      setResult(outcome);
      celebrateRef.current?.showModal();
    }
  }, [discover, herb, closeDialog]);

  // Keep React state in sync when the dialog is dismissed with Escape or a backdrop click.
  useEffect(() => {
    const node = celebrateRef.current;
    if (!node) return;
    const handleClose = () => setResult(null);
    node.addEventListener('close', handleClose);
    return () => node.removeEventListener('close', handleClose);
  }, []);

  if (!ready) {
    // Placeholder of the same height, so the layout does not jump once storage is read.
    return <div className="min-h-11 rounded-full bg-violet-900/40" aria-hidden="true" />;
  }

  return (
    <>
      {discovered ? (
        <div className="panel flex items-center gap-3 p-4">
          <span aria-hidden="true" className="text-2xl">
            ✓
          </span>
          <div>
            <p className="text-sm font-bold text-gold-300">Discovered</p>
            {discoveredAt && (
              <p className="text-xs text-violet-300">
                Added to your Herbdex on{' '}
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
          className="min-h-12 w-full rounded-full bg-gradient-to-r from-gold-500 to-pink-accent px-6 text-base font-bold text-violet-deep shadow-card transition-transform hover:scale-[1.02] active:scale-[0.99] motion-reduce:hover:scale-100"
        >
          I Found This Plant
        </button>
      )}

      {/* Step 1 — confirmation */}
      <dialog
        ref={confirmRef}
        aria-labelledby="confirm-title"
        className="panel m-auto w-[min(26rem,calc(100vw-2rem))] p-5 text-violet-100 backdrop:bg-violet-deep/80 backdrop:backdrop-blur-sm"
      >
        <h2 id="confirm-title" className="font-display text-lg font-bold text-gold-plate">
          Add {herb.commonName} to your Herbdex?
        </h2>
        <p className="mt-2 text-sm text-violet-200">
          Only confirm if you actually found this plant in the real world. This awards{' '}
          <strong className="text-gold-300">{herb.xp} XP</strong> and can only be claimed
          once.
        </p>
        <p className="mt-2 text-xs text-violet-300">
          Recording a find is not a confirmation that you identified it correctly, and never
          makes a wild plant safe to eat, drink, or apply.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => closeDialog(confirmRef)}
            className="min-h-11 rounded-full border border-violet-600 px-5 text-sm font-semibold text-violet-200 hover:bg-violet-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400"
          >
            Yes, I found it
          </button>
        </div>
      </dialog>

      {/* Step 2 — reveal and rewards */}
      <dialog
        ref={celebrateRef}
        aria-labelledby="celebrate-title"
        className="panel m-auto w-[min(24rem,calc(100vw-2rem))] p-5 text-center text-violet-100 backdrop:bg-violet-deep/85 backdrop:backdrop-blur-sm"
      >
        {result && (
          <>
            <p className="text-xs font-bold tracking-[0.2em] text-violet-300 uppercase">
              New discovery
            </p>
            <h2
              id="celebrate-title"
              className="font-display mt-1 text-2xl font-bold text-gold-plate"
            >
              {herb.commonName}
            </h2>

            <div className="animate-sheen relative mx-auto mt-4 w-40 overflow-hidden rounded-[var(--radius-card)] shadow-card-lift">
              <Image
                src={assetPath(herb.thumb)}
                alt={`Plantdex card ${herb.cardNumber}: ${herb.commonName}`}
                width={178}
                height={288}
                className="animate-card-reveal w-full"
              />
            </div>

            <p
              aria-live="polite"
              className="animate-rise-in mt-4 text-xl font-bold text-gold-400"
            >
              +{result.xpAwarded} XP
            </p>

            {result.newAchievementIds.length > 0 && (
              <ul className="mt-4 space-y-2">
                {result.newAchievementIds.map((id) => {
                  const achievement = getAchievement(id);
                  if (!achievement) return null;
                  return (
                    <li
                      key={id}
                      className="animate-toast-in rounded-xl border border-gold-500/60 bg-gold-500/15 px-3 py-2 text-left"
                    >
                      <p className="text-sm font-bold text-gold-300">
                        <span aria-hidden="true">{achievement.icon}</span> Achievement
                        unlocked — {achievement.name}
                      </p>
                      <p className="text-xs text-violet-200">{achievement.description}</p>
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={() => closeDialog(celebrateRef)}
              className="mt-5 min-h-11 w-full rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400"
            >
              Continue
            </button>
          </>
        )}
      </dialog>
    </>
  );
}
