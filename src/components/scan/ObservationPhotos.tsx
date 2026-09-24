'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ACCEPT_ATTRIBUTE } from '@/lib/photo-input';
import {
  MAX_OBSERVATION_PHOTOS,
  MIN_OBSERVATION_PHOTOS,
  type ObservationPhoto,
} from '@/lib/scans';

/**
 * TWO TO THREE PHOTOGRAPHS OF ONE INDIVIDUAL PLANT.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY MORE THAN ONE. Both providers take a set of images and treat them as a single plant;
 * PlantNet additionally wants to know which organ each one shows. A whole-plant shot and a
 * leaf close-up answer different questions about the same specimen, and together they narrow
 * an identification far more than either does alone. The count is therefore part of the
 * method rather than a preference about forms.
 *
 * THE SLOTS ARE NAMED, NOT NUMBERED, because the name is the instruction. "Photo 2" tells
 * somebody standing in front of a plant nothing; "Leaf + stem" tells them what to point the
 * camera at, which is the only thing that improves the answer. The prose under each was
 * shortened to one line for the same reason the names exist: it is read standing up, outdoors,
 * on a phone, and a sentence that has to be parsed is a sentence that gets skipped.
 *
 * THE THIRD IS OPTIONAL AND SAYS SO. A flower, fruit or bark shot is the single most useful
 * addition when the plant has one — and many plants, in many seasons, have none of them.
 * Requiring it would block real finds for a feature that does not exist that week.
 *
 * ONE SCAN, NOT THREE. All three photographs are one observation and cost one identification.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface Slot {
  readonly key: string;
  readonly label: string;
  readonly instruction: string;
  readonly organ: ObservationPhoto['organ'];
  readonly required: boolean;
}

const SLOTS: readonly Slot[] = [
  {
    key: 'whole',
    label: 'Whole plant',
    instruction: 'Show its overall shape and how it grows.',
    organ: 'habit',
    required: true,
  },
  {
    key: 'close',
    label: 'Leaf + stem',
    instruction: 'Show one leaf clearly and, if you can, where it joins the stem.',
    organ: 'leaf',
    required: true,
  },
  {
    key: 'feature',
    label: 'Flower / fruit / feature',
    instruction: 'Capture the most distinctive feature you can find.',
    // `auto` rather than a guess: this slot is deliberately whatever the plant offers, and
    // naming one organ here would mislabel every other thing somebody legitimately shoots.
    organ: 'auto',
    required: false,
  },
];

interface Held {
  readonly file: File;
  readonly url: string;
}

/** Cheap identity, at pick time. Catches the real case: the same file chosen twice. */
const fingerprint = (file: File): string => `${file.name}:${file.size}:${file.lastModified}`;

export function ObservationPhotos({
  onChange,
  disabled = false,
}: {
  onChange: (photos: ObservationPhoto[]) => void;
  disabled?: boolean;
}) {
  const [held, setHeld] = useState<Record<string, Held | undefined>>({});
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  /*
   * Object URLs are revoked when the slot stops showing them. They cost no decode and no
   * round trip, which is why the photograph is on screen before any work starts — but each
   * one is a live handle and leaving them behind leaks for the life of the page.
   */
  useEffect(() => {
    return () => {
      for (const one of Object.values(held)) if (one) URL.revokeObjectURL(one.url);
    };
    // Intentionally on unmount only; `replace` revokes the URL it is displacing itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publish = useCallback(
    (next: Record<string, Held | undefined>) => {
      const photos = SLOTS.flatMap((slot) => {
        const one = next[slot.key];
        return one ? [{ file: one.file, organ: slot.organ }] : [];
      });
      onChange(photos);
    },
    [onChange],
  );

  const put = useCallback(
    (slot: Slot, file: File | undefined) => {
      setHeld((current) => {
        const previous = current[slot.key];
        if (previous) URL.revokeObjectURL(previous.url);
        const next = { ...current };
        if (file) {
          next[slot.key] = { file, url: URL.createObjectURL(file) };
        } else {
          delete next[slot.key];
        }
        /*
         * A WARNING, NEVER A BLOCK. Two shots of one leaf a second apart are different files
         * and legitimately similar; only an exact re-pick is detectable cheaply, and even that
         * is sometimes deliberate. Refusing would cost real observations to prevent a mistake
         * the player can see for themselves in the previews.
         */
        const marks = Object.entries(next)
          .filter(([, one]) => one)
          .map(([, one]) => fingerprint(one!.file));
        setDuplicate(
          new Set(marks).size !== marks.length
            ? 'Two of these look like the same photo. Different angles identify a plant better.'
            : null,
        );
        publish(next);
        return next;
      });
    },
    [publish],
  );

  const count = SLOTS.filter((slot) => held[slot.key]).length;
  const ready = count >= MIN_OBSERVATION_PHOTOS;

  return (
    <div className="space-y-3">
      {/*
        THE ONE SENTENCE THAT MAKES THE SET MEAN ANYTHING. Both providers blend the images
        into a single answer, so photographs of two different plants produce a confident
        result about neither. It sits above the slots because it governs all of them.
      */}
      <p className="text-sm leading-relaxed text-violet-200">
        Take <span className="font-semibold text-gold-300">2 or 3 photos of the same plant</span> —
        the same individual, not two plants of the same kind.
      </p>

      <ol className="space-y-3">
        {SLOTS.map((slot, index) => {
          const one = held[slot.key];
          return (
            <li key={slot.key} className="rounded-xl border border-violet-600/70 bg-plum-700/40 p-3">
              <div className="flex items-start gap-3">
                {/* The preview doubles as the state indicator: filled means done. */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-violet-600 bg-plum-800">
                  {one ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={one.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-full w-full items-center justify-center text-lg text-violet-400"
                    >
                      {index + 1}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {/*
                    `flex-wrap`, because "Identifying Feature" plus its Recommended chip does
                    not fit one line at 390px and the unwrapped version collided them. The
                    marker keeps `items-center` alignment on the first line either way.
                  */}
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-violet-100">
                    {/*
                      DRAWN, NOT A CHARACTER. A tick glyph is an emoji by the suite's
                      definition and by this app's — the interface is pixel art, and a font's
                      idea of a checkmark is neither drawn nor consistent across platforms. A
                      filled square is held, a hollow one is not, and the count below says the
                      same thing in words for anyone who cannot see either.
                    */}
                    <span
                      aria-hidden="true"
                      className={`inline-block h-2.5 w-2.5 shrink-0 border-2 ${
                        one ? 'border-gold-400 bg-gold-400' : 'border-violet-400'
                      }`}
                    />
                    {slot.label}{' '}
                    <span className="text-xs font-semibold text-violet-400">
                      {slot.required ? 'Required' : 'Recommended'}
                    </span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-violet-300">{slot.instruction}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => inputs.current[slot.key]?.click()}
                      className="min-h-11 text-sm font-semibold text-gold-300 underline underline-offset-4 hover:text-gold-200 disabled:text-violet-400"
                    >
                      {one ? 'Replace' : 'Add photo'}
                    </button>
                    {one && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => put(slot, undefined)}
                        className="min-h-11 text-sm font-semibold text-violet-300 underline underline-offset-4 hover:text-violet-100 disabled:text-violet-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <input
                ref={(node) => {
                  inputs.current[slot.key] = node;
                }}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  // Reset first, or picking the same file twice never fires a change event.
                  event.target.value = '';
                  if (file) put(slot, file);
                }}
              />
            </li>
          );
        })}
      </ol>

      {duplicate && <p className="text-sm text-stat-temp">{duplicate}</p>}

      <p className="text-xs font-semibold text-violet-300" aria-live="polite">
        {count} of {MAX_OBSERVATION_PHOTOS} added ·{' '}
        {ready ? (
          <span className="text-gold-300">ready to identify</span>
        ) : (
          <span>{MIN_OBSERVATION_PHOTOS} photos required · {MAX_OBSERVATION_PHOTOS} recommended</span>
        )}
      </p>
    </div>
  );
}
