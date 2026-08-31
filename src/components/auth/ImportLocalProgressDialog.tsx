'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import {
  hasImportBeenOffered,
  hasLocalProgressToImport,
  importLocalProgress,
  markImportOffered,
} from '@/lib/import-local-progress';

/**
 * Offered once, right after a first sign-in that finds local progress already on this
 * device — never again after that, whether the player imports or skips. Rendered
 * unconditionally by the account page so it keeps a stable position in the tree even
 * though `showModal()` only actually opens it once its own effect decides it should.
 */
export function ImportLocalProgressDialog({ userId }: { userId: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<'checking' | 'offering' | 'importing' | 'done'>(
    'checking',
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (hasImportBeenOffered(userId)) return;

    hasLocalProgressToImport().then((has) => {
      if (cancelled) return;
      if (has) {
        setStatus('offering');
        ref.current?.showModal();
      } else {
        markImportOffered(userId);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const onImport = useCallback(async () => {
    setStatus('importing');
    setError(null);
    const outcome = await importLocalProgress(userId);

    // Only close the offer once the import actually landed. A failed write that still
    // marked itself "offered" would strand this device's progress: never deleted, but
    // never reachable from the account either. Re-running is safe — every write is an
    // additive, idempotent upsert — so leaving the dialog open is a real retry.
    if (!outcome.ok) {
      setError(
        `Couldn't import ${outcome.failed.join(', ')}. Nothing on this device was changed — check your connection and try again.`,
      );
      setStatus('offering');
      return;
    }

    // Recorded only on a successful import, and only as a yes/no — whether the offer is
    // used at all is the product question; how much anyone had is not.
    track('progress_imported');
    markImportOffered(userId);
    setStatus('done');
    // The Herbdex store already hydrated from (empty) server rows before this import ran;
    // reloading is the simplest way to pick up what just got written without adding a
    // force-rehydrate path to herbdex-store.ts for what is a one-time action.
    window.location.reload();
  }, [userId]);

  const onSkip = useCallback(() => {
    // Skipping still spends the offer — CLAUDE.md's contract is "offered once per account,
    // accepted or skipped". Only a *failed* import leaves the offer open, because that is
    // the app's error, not the player's decision.
    markImportOffered(userId);
    ref.current?.close();
  }, [userId]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="import-title"
      className="panel m-auto w-[min(26rem,calc(100vw-2rem))] p-5 text-violet-100 backdrop:bg-plum-950/88 backdrop:backdrop-blur-sm"
    >
      <h2 id="import-title" className="font-display text-lg font-bold text-gold-plate">
        Bring your progress with you?
      </h2>
      <p className="mt-2 text-sm text-violet-200">
        This device already has discoveries, sightings or achievements saved locally. Import
        them into this account so they follow you to any device you sign in on. Nothing on
        this device is deleted either way.
      </p>
      {error && <p className="mt-3 text-sm text-stat-temp">{error}</p>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onSkip}
          disabled={status === 'importing'}
          className="min-h-11 rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-plum-600 disabled:opacity-60"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={() => void onImport()}
          disabled={status === 'importing'}
          className="min-h-11 rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400 disabled:opacity-60"
        >
          {status === 'importing' ? 'Importing…' : 'Import my progress'}
        </button>
      </div>
    </dialog>
  );
}
