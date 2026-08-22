'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;
    if (hasImportBeenOffered()) return;

    hasLocalProgressToImport().then((has) => {
      if (cancelled) return;
      if (has) {
        setStatus('offering');
        ref.current?.showModal();
      } else {
        markImportOffered();
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const onImport = useCallback(async () => {
    setStatus('importing');
    await importLocalProgress(userId);
    markImportOffered();
    setStatus('done');
    // The Herbdex store already hydrated from (empty) server rows before this import ran;
    // reloading is the simplest way to pick up what just got written without adding a
    // force-rehydrate path to herbdex-store.ts for what is a one-time action.
    window.location.reload();
  }, [userId]);

  const onSkip = useCallback(() => {
    markImportOffered();
    ref.current?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="import-title"
      className="panel m-auto w-[min(26rem,calc(100vw-2rem))] p-5 text-violet-100 backdrop:bg-violet-deep/85 backdrop:backdrop-blur-sm"
    >
      <h2 id="import-title" className="font-display text-lg font-bold text-gold-plate">
        Bring your progress with you?
      </h2>
      <p className="mt-2 text-sm text-violet-200">
        This device already has discoveries, sightings or achievements saved locally. Import
        them into this account so they follow you to any device you sign in on. Nothing on
        this device is deleted either way.
      </p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onSkip}
          disabled={status === 'importing'}
          className="min-h-11 rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-violet-800 disabled:opacity-60"
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
