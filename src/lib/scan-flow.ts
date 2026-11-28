/**
 * The scan flow as data: which channel an observation is, what that allows, and where the
 * player is in Scan > Review > Confirm > Reveal > Collect. Pure.
 *
 * OWNER DECISION (V1): earning a NEW card requires an eligible in-app camera capture. Imported
 * photos, manual entry and self-reports cannot unlock a new card; an imported photo still
 * identifies, for education. Existing collections are untouched: nothing here removes or
 * re-checks anything already held.
 *
 * A CAMERA CAPTURE DOES NOT PROVE WHERE THE PLANT WAS. It says the photos were taken through
 * this page's camera. A photograph of a screen or a picture is indistinguishable, and nothing
 * here or in its copy may say otherwise.
 *
 * With `NEXT_PUBLIC_CAMERA_CAPTURE` off, `channelForPhotos` returns 'unspecified', which is
 * identification only: nothing can be proved to have come from the camera, so nothing collects.
 */
import { isCameraCaptureEnabled } from './scan-capture';

export type PhotoSource = 'camera' | 'import';
export type ObservationChannel = 'collect' | 'lookup' | 'unspecified';

/**
 * Collect only when EVERY photo came from the live camera. One imported photo makes the whole
 * observation a lookup: mixing must never be a way to launder an import into a collect.
 */
export function channelForPhotos(photos: readonly { source?: PhotoSource }[]): ObservationChannel {
  if (!isCameraCaptureEnabled()) return 'unspecified';
  if (photos.length === 0) return 'lookup';
  return photos.every((photo) => photo.source === 'camera') ? 'collect' : 'lookup';
}

/** May this observation unlock a NEW card? Held cards are never affected. */
export function collectAllowed(channel: ObservationChannel): boolean {
  return channel === 'collect';
}

export const FLOW_STEPS = ['Scan', 'Review', 'Confirm', 'Reveal', 'Collect'] as const;
export type FlowStep = (typeof FLOW_STEPS)[number];

export function currentStep(input: {
  hasResult: boolean;
  confirmed: boolean;
  celebrating: boolean;
}): FlowStep {
  if (input.celebrating) return 'Reveal';
  if (input.confirmed) return 'Collect';
  if (input.hasResult) return 'Review';
  return 'Scan';
}

export const LOOKUP_NOTICE = {
  heading: 'Identification only - not eligible to collect',
  body: 'This observation includes a photo from your library, so it can tell you what a plant might be but cannot unlock a new card. To collect, take every photo with the in-app camera.',
} as const;

export const CAMERA_OFF_NOTICE = {
  heading: 'Identification only',
  body: 'Collecting a card needs photos taken with the in-app camera, which is not available here. You can still identify this plant.',
} as const;

export const SIGNED_OUT_NOTICE = {
  heading: 'Sign in to collect',
  body: 'Scanning and identifying work without an account. Collecting a card needs an account and photos taken with the in-app camera.',
} as const;

export const COLLECT_NOTE =
  'Taken with the in-app camera. That makes it eligible to collect; it is not proof of where the plant was.';
