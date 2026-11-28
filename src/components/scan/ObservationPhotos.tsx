'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ACCEPT_ATTRIBUTE } from '@/lib/photo-input';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { isCameraCaptureEnabled } from '@/lib/scan-capture';
import { CameraCapturePanel } from './CameraCapturePanel';
import { channelForPhotos } from '@/lib/scan-flow';
import { MAX_OBSERVATION_PHOTOS, minPhotosFor, type ObservationPhoto } from '@/lib/scans';

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
  readonly source: 'camera' | 'import';
}

/** Cheap identity, at pick time. Catches the real case: the same file chosen twice. */
const fingerprint = (file: File): string => `${file.name}:${file.size}:${file.lastModified}`;

/** A recognisable camera, drawn as a chunky pixel-ish glyph so it reads as an action before any label is read. */
function CameraGlyph({ large }: { large: boolean }) {
  const size = large ? 56 : 32;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="photo-glyph" shapeRendering="crispEdges">
      <path d="M8 5h8l1.5 2H21v12H3V7h3.5L8 5Z" fill="currentColor" opacity="0.14" />
      <path d="M8 5h8l1.5 2H21v12H3V7h3.5L8 5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="miter" />
      <circle cx="12" cy="13" r="3.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="17.5" y="9" width="1.8" height="1.8" fill="currentColor" />
    </svg>
  );
}

export function ObservationPhotos({
  onChange,
  disabled = false,
  scope = null,
  onCameraOpen,
}: {
  onChange: (photos: ObservationPhoto[]) => void;
  disabled?: boolean;
  /** Account id for the remembered camera decline; null signed out. */
  scope?: string | null;
  /** Called when the live-camera screen opens (the capture session is opened then). */
  onCameraOpen?: () => void;
}) {
  /*
   * LIVE CAMERA PREVIEW, OFF BY DEFAULT. `cameraOn` is a build-time literal, so with the flag off
   * none of the capture UI is reachable and the slots behave exactly as before (the OS camera
   * hand-off via `capture="environment"`, or the library).
   */
  const cameraOn = isCameraCaptureEnabled();
  const [capturingSlot, setCapturingSlot] = useState<string | null>(null);
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
        return one ? [{ file: one.file, organ: slot.organ, source: cameraOn ? one.source : undefined }] : [];
      });
      onChange(photos);
    },
    [onChange, cameraOn],
  );

  const put = useCallback(
    (slot: Slot, file: File | undefined, source: 'camera' | 'import' = 'import') => {
      setHeld((current) => {
        const previous = current[slot.key];
        if (previous) URL.revokeObjectURL(previous.url);
        const next = { ...current };
        if (file) {
          next[slot.key] = { file, url: URL.createObjectURL(file), source };
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
  /*
   * THE FLOOR FOLLOWS THE CHANNEL. Every photograph from the in-app camera is a collect
   * observation, which needs ONE; add a library photo and it is a lookup, which keeps two.
   * Extra angles on a collect are optional and help accuracy only - never proof of presence.
   */
  const heldPhotos = Object.values(held).flatMap((one) => (one ? [{ source: one.source }] : []));
  const channel = channelForPhotos(heldPhotos);
  const minimum = minPhotosFor(channel);
  const ready = count >= minimum;
  const closeRequired = minimum > 1;
  /*
   * WHICH SLOTS ARE REQUIRED FOLLOWS THE FLOOR TOO. The leaf-and-stem slot is declared required for a two-photo lookup, but with ONE camera
   * photograph needed it said "Required" (to a screen reader) and showed no "(optional)" beside a footer reading "1 camera photo needed", so the
   * page contradicted itself. Only the whole-plant slot stays required in a collect; the close-up becomes optional with the rest.
   */
  const isRequired = (slot: (typeof SLOTS)[number]): boolean => (slot.key === 'close' ? closeRequired : slot.required);

  /* What the player is TOLD about each slot. With the live camera and nothing held yet, one camera photo is all that is needed, so the supporting
     angles read as optional; the floor itself (`minPhotosFor`) is untouched and still decides when the button enables. */
  const readsOptional = (slot: (typeof SLOTS)[number]): boolean =>
    !isRequired(slot) || (cameraOn && count === 0 && slot.key !== SLOTS[0]!.key);

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
        {cameraOn && channel === 'lookup' && count > 0 ? (
          <span>
            A library photo can <span className="font-semibold text-gold-300">identify</span> a plant but
            not collect it. Add <span className="font-semibold text-gold-300">2 or 3 photos of the same plant</span>,
            or use the camera to collect.
          </span>
        ) : cameraOn ? (
          <span>
            Take <span className="font-semibold text-gold-300">one photo</span> with the camera.
            More angles are optional &mdash; keep them to the same plant.
          </span>
        ) : (
          <span>
            Take <span className="font-semibold text-gold-300">2 or 3 photos of the same plant</span>{' '}
            &mdash; the same individual, not two plants of the same kind.
          </span>
        )}
      </p>

      <ol className="grid grid-cols-2 gap-3">
        {SLOTS.map((slot, index) => {
          const one = held[slot.key];
          const active = !one && firstEmpty?.key === slot.key;
          return (
            <li key={slot.key} className={`flex flex-col items-center ${index === 0 ? 'col-span-2' : ''}`}>
              <div className="relative w-full">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!cameraOn) return inputs.current[slot.key]?.click();
                    setCapturingSlot(slot.key);
                    onCameraOpen?.();
                  }}
                  aria-label={`${one ? 'Replace' : 'Add'} photo: ${slot.label}. ${slot.instruction}`}
                  data-slot-role={index === 0 ? 'primary' : 'optional'}
                  data-held={one ? 'true' : 'false'}
                  className={`photo-slot relative block w-full overflow-hidden transition-colors disabled:opacity-60 ${
                    index === 0 ? 'min-h-[9.5rem] sm:min-h-[11rem]' : 'aspect-[4/3]'
                  } ${active ? 'photo-slot-next' : ''}`}
                >
                  {one ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={one.url} alt="" className={`w-full object-cover ${index === 0 ? "h-[9.5rem] sm:h-[11rem]" : "h-full"}`} />
                  ) : (
                    <span aria-hidden="true" className="photo-slot-empty flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-center">
                      <CameraGlyph large={index === 0} />
                      {index === 0 ? (
                        <>
                          <span className="text-base font-extrabold">{cameraOn ? 'Take a photo' : 'Add a photo'}</span>
                          <span className="text-xs font-semibold">{slot.instruction}</span>
                        </>
                      ) : (
                        <span className="text-xs font-bold">Add photo</span>
                      )}
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
              <p className="mt-2 flex items-center gap-1.5 text-center text-xs leading-tight font-bold text-violet-100">
                <span
                  aria-hidden="true"
                  className={`inline-block h-2.5 w-2.5 shrink-0 border-2 ${
                    one ? 'border-gold-400 bg-gold-400' : 'border-violet-400'
                  }`}
                />
                {slot.label}
              </p>
              {readsOptional(slot) && (
                <p className="pd-badge mt-1 !min-h-0 !px-2 !py-0.5 !text-[0.72rem]">optional</p>
              )}
              <input
                ref={(node) => {
                  inputs.current[slot.key] = node;
                }}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                // With the live camera on, the input is the LIBRARY path (no `capture`), which
                // is what a fallback or an import means: identification only.
                capture={cameraOn ? undefined : 'environment'}
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
                {index + 1}. {readsOptional(slot) ? 'Optional' : 'Required'}. {slot.instruction}
              </span>
            </li>
          );
        })}
      </ol>

      {cameraOn &&
        capturingSlot &&
        (() => {
          const slot = SLOTS.find((one) => one.key === capturingSlot);
          if (!slot) return null;
          return (
            <CameraCapturePanel
              slotLabel={slot.label}
              scope={scope}
              onCaptured={(file) => {
                // The photograph is handed on NOW; the panel stays mounted only for the
                // shutter response and then reports `onShutterDone`.
                put(slot, file, 'camera');
              }}
              onShutterDone={() => setCapturingSlot(null)}
              onUseLibrary={() => {
                setCapturingSlot(null);
                inputs.current[slot.key]?.click();
              }}
              onCancel={() => setCapturingSlot(null)}
            />
          );
        })()}

      {duplicate && <p className="text-sm text-stat-temp">{duplicate}</p>}

      <p className="text-center text-xs font-semibold text-violet-300" aria-live="polite">
        {count} of {MAX_OBSERVATION_PHOTOS} added ·{' '}
        {ready ? (
          <span className="text-gold-300">ready to identify</span>
        ) : (
          <span>
            {minimum === 1 || (cameraOn && count === 0)
              ? `1 camera photo needed · extra angles optional (up to ${MAX_OBSERVATION_PHOTOS})`
              : `${minimum} photos required · ${MAX_OBSERVATION_PHOTOS} recommended`}
          </span>
        )}
      </p>
    </div>
  );
}
