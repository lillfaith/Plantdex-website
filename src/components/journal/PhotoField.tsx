'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ACCEPTED_LABEL,
  ACCEPT_ATTRIBUTE,
  firstUsablePhoto,
  formatBytes,
  validatePhoto,
} from '@/lib/photo-input';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * Choosing a photo for a sighting: drop it, paste it, or browse for it.
 *
 * WHAT THIS REPLACES. A bare `<input type="file" accept="image/*">`. It worked, but it
 * accepted things nothing can render (SVG, TIFF), told nobody what would work, showed no
 * preview, and offered no way to change your mind short of picking a different file.
 *
 * THREE WAYS IN, ONE PATH THROUGH. Drag-and-drop is for the desktop half of the audience —
 * someone back from a walk with photos in a folder. Paste is nearly free once the drop
 * handler exists and is how a screenshot or a photo copied from Photos actually arrives.
 * The picker stays the primary control because it is the only one that works on a phone,
 * which is where this app mostly is. All three end in `accept()`, so validation, preview
 * and error reporting cannot drift between them.
 *
 * THE INPUT IS THE CONTROL, NOT A DIV. The whole thing is a `<label>` wrapping a real file
 * input: keyboard focus, Enter/Space, the screen-reader announcement and the phone's own
 * photo picker all come free, and the drop target is layered on top rather than replacing
 * any of it. A div with `onClick` would have had to reimplement every one of those, and
 * would have got at least one wrong.
 */
export function PhotoField({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropRef = useRef<HTMLLabelElement>(null);

  /*
   * An object URL pins its blob in memory until revoked, so the preview is created WITH the
   * file and torn down when it changes. Derived rather than held in state: a state-plus-
   * effect version renders once with a stale preview before the effect catches up, which on
   * a replaced photo means a flash of the previous one.
   */
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const accept = useCallback(
    (candidate: File | null) => {
      if (!candidate) {
        setError(null);
        onChange(null);
        return;
      }
      const verdict = validatePhoto(candidate);
      if (!verdict.ok) {
        setError(verdict.reason);
        onChange(null);
        return;
      }
      setError(null);
      onChange(candidate);
    },
    [onChange],
  );

  /*
   * `dragenter`/`dragleave` fire for every child element the pointer crosses, so a naive
   * boolean flickers the whole time the photo is over the target. Counting enters against
   * leaves is the standard fix and the only reason this is not a two-line handler.
   */
  const depth = useRef(0);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      const files = [...event.dataTransfer.files];
      const result = firstUsablePhoto(files);
      if ('ok' in result) {
        setError(result.reason);
        return;
      }
      accept(result.file);
    },
    [accept],
  );

  /*
   * Paste is bound to the drop target rather than the window: a paste anywhere on the page
   * hijacking the photo field would fight the notes textarea, which is the one place people
   * legitimately paste text.
   */
  useEffect(() => {
    const node = dropRef.current;
    if (!node) return;
    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.files ?? [])];
      if (files.length === 0) return;
      event.preventDefault();
      const result = firstUsablePhoto(files);
      if ('ok' in result) setError(result.reason);
      else accept(result.file);
    };
    node.addEventListener('paste', onPaste);
    return () => node.removeEventListener('paste', onPaste);
  }, [accept]);

  return (
    <div className="block">
      <span className="text-xs font-semibold text-violet-200">Photo (optional)</span>

      <label
        ref={dropRef}
        htmlFor={inputId}
        // tabIndex so the label can receive a paste; the input inside keeps its own focus
        // ring and its own keyboard activation.
        tabIndex={-1}
        onDragEnter={(event) => {
          event.preventDefault();
          depth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          depth.current -= 1;
          if (depth.current <= 0) {
            depth.current = 0;
            setDragging(false);
          }
        }}
        onDrop={onDrop}
        className={`mt-1 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-4 text-center transition-colors ${
          dragging
            ? 'border-gold-500 bg-gold-500/10'
            : 'border-violet-600 bg-plum-700/50 hover:bg-plum-600/50'
        }`}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- a blob: URL from the
                file the player just chose; next/image cannot optimise one and would only
                add a loader in front of it. */}
            <img
              src={preview}
              alt=""
              className="max-h-40 w-auto rounded-lg shadow-card"
            />
            <span className="text-xs font-semibold text-violet-200">
              {file?.name}
              {file && (
                <span className="font-normal text-violet-400"> · {formatBytes(file.size)}</span>
              )}
            </span>
            <span className="text-xs text-violet-400">
              Drop another to replace it
            </span>
          </>
        ) : (
          <>
            <PlantdexIcon
              name={dragging ? 'discovered' : 'journal'}
              className={`text-2xl ${dragging ? 'text-gold-400' : 'text-violet-300'}`}
            />
            <span className="text-sm font-semibold text-violet-200">
              {dragging ? 'Drop it here' : 'Drag a photo here, or browse'}
            </span>
            <span className="text-xs leading-relaxed text-violet-400">
              {ACCEPTED_LABEL}. You can paste one too.
            </span>
          </>
        )}

        <input
          id={inputId}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          onChange={(event) => accept(event.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </label>

      {file && (
        <button
          type="button"
          onClick={() => accept(null)}
          className="mt-1.5 min-h-11 text-xs font-semibold text-violet-300 underline underline-offset-2 hover:text-stat-temp"
        >
          Remove photo
        </button>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-stat-temp">
          {error}
        </p>
      )}

      <p className="mt-1 text-xs leading-relaxed text-violet-400">
        Photos are resized before they are saved, which also strips the location data a
        phone camera writes into them.
      </p>
    </div>
  );
}
