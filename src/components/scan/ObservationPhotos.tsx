'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ACCEPT_ATTRIBUTE } from '@/lib/photo-input';
import { PlantdexIcon } from '../icons/PlantdexIcon';
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
    instruction: 'Step back. Show its overall shape and how it grows.',
    organ: 'habit',
    required: true,
  },
  {
    key: 'close',
    label: 'Leaf + stem',
    instruction:
      'Get close and fill the frame with one leaf and where it joins the stem. Other '
      + 'plants in the shot will confuse the result.',
    organ: 'leaf',
    required: true,
  },
  {
    key: 'feature',
    label: 'Detail',
    instruction: 'A flower, fruit or the most distinctive feature you can find.',
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

  const firstEmpty = SLOTS.find((slot) => !held[slot.key]);

  return (
    <div className="space-y-3">
      {/*
        THE ONE SENTENCE THAT MAKES THE SET MEAN ANYTHING. Both providers blend the images
        into a single answer, so photographs of two different plants produce a confident
        result about neither. It sits above the slots because it governs all of them.
      */}
      <p className="flex items-center gap-3 holo-border rounded-full px-4 py-2.5 text-sm leading-snug text-violet-100">
        <span aria-hidden="true" className="shrink-0 text-2xl text-violet-300">
          <PlantdexIcon name="scan" />
        </span>
        <span>
          Take <span className="font-semibold text-gold-300">2 or 3 photos of the same plant</span>{' '}
          &mdash; the same individual, not two plants of the same kind.
        </span>
      </p>

      <ol className="grid grid-cols-3 gap-3">
        {SLOTS.map((slot, index) => {
          const one = held[slot.key];
          const active = !one && firstEmpty?.key === slot.key;
          return (
            <li key={slot.key} className="flex flex-col items-center">
              <div className="relative w-full">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => inputs.current[slot.key]?.click()}
                  aria-label={`${one ? 'Replace' : 'Add'} photo: ${slot.label}. ${slot.instruction}`}
                  className={`relative block aspect-square w-full overflow-hidden rounded-2xl border-2 bg-plum-800/60 transition-colors disabled:opacity-60 ${
                    one
                      ? 'border-gold-400'
                      : active
                        ? 'holo-border'
                        : 'border-violet-500/50'
                  }`}
                >
                  {one ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={one.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-full w-full items-center justify-center text-4xl font-light text-violet-200"
                    >
                      +
                    </span>
                  )}
                </button>
                {one && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => put(slot, undefined)}
                    aria-label={`Remove photo: ${slot.label}`}
                    className="absolute -top-2 -right-2 flex h-11 w-11 items-start justify-end"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-plum-950 bg-violet-200 text-xs font-extrabold text-plum-900"
                    >
                      &times;
                    </span>
                  </button>
                )}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-center text-xs leading-tight font-semibold text-violet-100">
                <span
                  aria-hidden="true"
                  className={`inline-block h-2.5 w-2.5 shrink-0 border-2 ${
                    one ? 'border-gold-400 bg-gold-400' : 'border-violet-400'
                  }`}
                />
                {slot.label}
              </p>
              {!slot.required && (
                <p className="text-[0.72rem] leading-tight text-violet-300">(optional)</p>
              )}
              <input
                ref={(node) => {
                  inputs.current[slot.key] = node;
                }}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                capture="environment"
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  // Reset first, or picking the same file twice never fires a change event.
                  event.target.value = '';
                  if (file) put(slot, file);
                }}
              />
              <span className="sr-only">
                {index + 1}. {slot.required ? 'Required' : 'Optional'}. {slot.instruction}
              </span>
            </li>
          );
        })}
      </ol>

      {duplicate && <p className="text-sm text-stat-temp">{duplicate}</p>}

      <p className="text-center text-xs font-semibold text-violet-300" aria-live="polite">
        {count} of {MAX_OBSERVATION_PHOTOS} added ·{' '}
        {ready ? (
          <span className="text-gold-300">ready to identify</span>
        ) : (
          <span>
            {MIN_OBSERVATION_PHOTOS} photos required · {MAX_OBSERVATION_PHOTOS} recommended
          </span>
        )}
      </p>
    </div>
  );
}
