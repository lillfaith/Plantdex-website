/**
 * Third-party photo disclosure and consent, BEFORE the first send to an identification provider.
 *
 * Pure: no DOM, no network, nothing that can be switched on by importing it. The screen is
 * `src/components/scan/ProviderConsent.tsx`.
 *
 * WHAT IS RECORDED. One acknowledgement per account (or per device, signed out): the wording
 * version and the provider set it named. Nothing else - no timestamp, no photo, no location.
 * It is local-only, so it is not account data on a server; account deletion's `plantdex.`
 * prefix sweep takes it with the rest of the device's keys.
 *
 * WHEN IT RE-PROMPTS. The stored stamp must equal the current stamp exactly. Bump
 * `CONSENT_WORDING_VERSION` when the notice's meaning changes; change `IDENTIFICATION_PROVIDERS`
 * when a provider is added or removed. Either one changes the stamp, so an old acknowledgement
 * of different terms never counts as agreement to the new ones.
 *
 * FLAG. Enforced when `NEXT_PUBLIC_SCAN_CONSENT` is 'on' or the camera pilot is on. Off, the
 * existing scan behaves exactly as before (the notice on /privacy still applies).
 *
 * WHAT IT IS NOT. Consent to send photos is not consent to anything about progression, and
 * accepting it unlocks nothing.
 */
import { isCameraCaptureEnabled } from './scan-capture';

export const CONSENT_WORDING_VERSION = 1;

/** Providers the identifier can be configured to use. The deployment picks one server-side. */
export const IDENTIFICATION_PROVIDERS = [
  { id: 'plantnet', name: 'PlantNet' },
  { id: 'plantid', name: 'plant.id (by Kindwise)' },
] as const;

export const CONSENT_STORAGE_KEY = 'plantdex.scan-consent.v1';
export const ANONYMOUS_CONSENT_SCOPE = 'device';

/** Where the full explanation lives. The section id exists on /privacy. */
export const CONSENT_PRIVACY_HREF = '/privacy#plant-id';

export const CONSENT_COPY = {
  heading: 'Before your first identification',
  body: [
    'To identify a plant, Plantdex sends your 2 or 3 photos to an outside identification service. It is PlantNet or plant.id (by Kindwise), depending on how this app is set up.',
    'What is sent: the photos, resized and re-encoded on your device so their location data (EXIF/GPS) is removed. No location, account details or device identifiers are added.',
    'This is optional. You can keep browsing the Herbdex without it, but identification needs it.',
  ],
  accept: 'I understand, send my photos',
  decline: 'Not now',
  declined: 'Nothing was sent. You can still browse the Herbdex, and you can change your mind here at any time.',
  privacyLink: 'Read the full privacy details',
} as const;

/** The current stamp. Changes when the wording version or the provider set changes. */
export function consentStamp(): string {
  return `v${CONSENT_WORDING_VERSION}:${IDENTIFICATION_PROVIDERS.map((p) => p.id).join('+')}`;
}

/** The only read of the flag: a literal comparison so the bundler can drop the branch. */
export function isConsentEnforced(): boolean {
  return process.env.NEXT_PUBLIC_SCAN_CONSENT === 'on' || isCameraCaptureEnabled();
}

export interface ConsentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function key(scope: string): string {
  return `${CONSENT_STORAGE_KEY}:${scope}`;
}

/** True only when the stored stamp equals the current one. Malformed or old reads as "no". */
export function hasAcknowledged(storage: ConsentStorage | null, scope: string): boolean {
  if (!storage) return false;
  try {
    const raw = storage.getItem(key(scope));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return !!parsed && typeof parsed === 'object' && (parsed as { stamp?: unknown }).stamp === consentStamp();
  } catch {
    return false;
  }
}

/** Returns whether the acknowledgement could be stored. A blocked store means asking again. */
export function acknowledge(storage: ConsentStorage | null, scope: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key(scope), JSON.stringify({ stamp: consentStamp() }));
    return true;
  } catch {
    return false;
  }
}

/** Browser storage, resolved only when called. */
export function browserConsentStorage(): ConsentStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The one gate. Not enforced: always allowed. Enforced: only with a current acknowledgement. */
export function mayTransmit(storage: ConsentStorage | null, scope: string): boolean {
  return !isConsentEnforced() || hasAcknowledged(storage, scope);
}
