'use client';

import { useCallback, useRef, useState } from 'react';
import { deleteAccount } from '@/lib/delete-account';
import {
  downloadExport,
  exportAccountData,
  exportLocalData,
  type AccountExport,
} from '@/lib/export-account-data';

/**
 * "Your data" — download it, and close the account.
 *
 * The two sit together deliberately. Deletion is irreversible and the export is the only
 * thing that survives it, so the offer to keep a copy belongs in front of the person about
 * to destroy the original, not on some other page they would have to know to visit first.
 *
 * THE CONFIRMATION IS TYPED, NOT CLICKED. A second "are you sure?" button is dismissed
 * about as fast as the first one, and this deletes photographs that exist nowhere else.
 * Typing DELETE is the standard for an action with no undo, and it is the only interaction
 * in this app that asks for it.
 *
 * The dialog is rendered unconditionally and hides only its trigger, for the reason
 * CLAUDE.md gives twice over: a `<dialog>` reporting the result of an action has to outlive
 * the state change that action causes, and it needs a stable position in the tree or React
 * recreates it underneath itself. Deleting an account signs the player out, which unmounts
 * every signed-in branch — including, if it were nested there, this dialog mid-sentence.
 */
export function AccountDataSection({
  userId,
  email,
}: {
  /** Absent when signed out: the section then offers only the on-device export. */
  userId?: string;
  email?: string;
}) {
  const confirmRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [typed, setTyped] = useState('');

  const onExport = useCallback(async () => {
    setBusy('export');
    setError(null);
    setNote(null);
    try {
      const data: AccountExport = userId
        ? await exportAccountData(userId, email)
        : await exportLocalData();
      downloadExport(data);
      const omitted = data.photos.omitted.length;
      setNote(
        omitted === 0
          ? 'Downloaded.'
          : `Downloaded. ${omitted} photo${omitted === 1 ? '' : 's'} could not be included — the file lists which, and why.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The export failed.');
    } finally {
      setBusy(null);
    }
  }, [userId, email]);

  const onDelete = useCallback(async () => {
    setBusy('delete');
    setError(null);
    const result = await deleteAccount();
    if (!result.ok) {
      // The dialog stays open. A failure here means the account still exists, and saying so
      // in place is the only way the player learns that retrying is worth doing.
      setError(result.error ?? 'Deletion failed.');
      setBusy(null);
      return;
    }
    // No success message: `deleteAccount` signs out, so this whole branch unmounts and the
    // page shows the signed-out view, which is the honest confirmation.
    confirmRef.current?.close();
  }, []);

  return (
    <section className="panel p-5">
      <h2 className="text-sm font-bold tracking-wide text-gold-400 uppercase">Your data</h2>

      <p className="mt-3 text-sm text-violet-200">
        {userId
          ? 'Download everything this account holds — your collection, research, achievements, sightings and their photographs — as a single JSON file.'
          : 'Download everything saved in this browser — your collection, research, achievements, sightings and their photographs — as a single JSON file.'}
      </p>
      <button
        type="button"
        onClick={() => void onExport()}
        disabled={busy !== null}
        className="mt-3 min-h-11 rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-plum-600 disabled:opacity-60"
      >
        {busy === 'export' ? 'Preparing…' : 'Download my data'}
      </button>
      {note && <p className="mt-2 text-sm text-violet-300">{note}</p>}

      {userId && (
        <div className="mt-6 border-t border-violet-500/40 pt-5">
          <h3 className="text-sm font-bold text-stat-temp">Delete your account</h3>
          <p className="mt-2 text-sm text-violet-200">
            This removes your account, everything in your collection, every sighting and every
            photograph you have uploaded.{' '}
            <strong className="text-violet-100">It cannot be undone</strong>, and we cannot
            recover any of it afterwards. Download your data first if you want to keep a copy.
          </p>
          <button
            type="button"
            onClick={() => {
              setTyped('');
              setError(null);
              confirmRef.current?.showModal();
            }}
            className="mt-3 min-h-11 rounded-full border border-stat-temp px-5 text-sm font-semibold text-stat-temp hover:bg-plum-600"
          >
            Delete my account
          </button>
        </div>
      )}

      <dialog
        ref={confirmRef}
        aria-labelledby="delete-account-title"
        className="panel m-auto w-[min(26rem,calc(100vw-2rem))] p-5 text-violet-100 backdrop:bg-plum-950/88 backdrop:backdrop-blur-sm"
      >
        <h2 id="delete-account-title" className="font-display text-lg font-bold text-stat-temp">
          Delete your account permanently?
        </h2>
        <p className="mt-2 text-sm text-violet-200">
          Your collection, {email ? <strong className="text-violet-100">{email}</strong> : 'your email address'},
          every sighting and every photograph will be erased. There is no way to get them back.
        </p>
        <label
          htmlFor="delete-confirm"
          className="mt-4 block text-sm font-semibold text-violet-200"
        >
          Type <span className="font-mono text-gold-300">DELETE</span> to confirm
        </label>
        <input
          id="delete-confirm"
          type="text"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          className="mt-2 min-h-11 w-full rounded-lg border border-violet-500 bg-plum-800 px-3 text-sm text-violet-100"
        />
        {error && <p className="mt-3 text-sm text-stat-temp">{error}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => confirmRef.current?.close()}
            disabled={busy === 'delete'}
            className="min-h-11 rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-plum-600 disabled:opacity-60"
          >
            Keep my account
          </button>
          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={typed !== 'DELETE' || busy === 'delete'}
            className="min-h-11 rounded-full bg-stat-temp px-5 text-sm font-bold text-violet-deep disabled:opacity-50"
          >
            {busy === 'delete' ? 'Deleting…' : 'Delete everything'}
          </button>
        </div>
      </dialog>
    </section>
  );
}
