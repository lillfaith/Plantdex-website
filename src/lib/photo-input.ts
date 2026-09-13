/**
 * What counts as a photo you can attach to a sighting, and why each rule exists.
 *
 * Pure and free of DOM APIs so it can be unit-tested: the picker, the drop target, the
 * paste handler and both storage paths all ask the same questions of a file, and a rule
 * that lives in one of those four places is a rule the other three get wrong.
 *
 * WHY NOT JUST `accept="image/*"`. That is what was here before, and it is worse in both
 * directions. It lets through things nothing can render — SVG (which is a script vector,
 * not a photo), TIFF, BMP — and it tells the person nothing about what will work, so a
 * failure arrives after they have chosen, not before. Naming the formats lets the field say
 * something useful instead of nothing at all.
 */

/**
 * The formats a phone camera or a photo library actually produces.
 *
 * HEIC/HEIF earns its place in the PICKER: it is the iPhone default and by far the most
 * common thing a field app is handed, and Safari decodes it perfectly well.
 *
 * IT IS DELIBERATELY NOT IN THE ADVERTISED LABEL, and that gap is the point. Most non-Apple
 * browsers cannot decode HEIC, and since `image-prepare.ts` stopped returning raw bytes,
 * what it cannot decode it REFUSES — so a categorical "HEIC supported" is a promise the
 * device may break the instant it is taken up. Accepting it and naming it are two different
 * claims: the picker still tries, because on the phone where it is the default it works.
 *
 * SVG is deliberately absent. It is markup that can carry script, it is never a photograph,
 * and accepting it would put attacker-controlled markup in a bucket that later serves signed
 * URLs.
 */
export const ACCEPTED_IMAGE_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/avif',
];

/**
 * Extensions matching the types above.
 *
 * Checked alongside the MIME type because the type is not reliable: HEIC files routinely
 * arrive with an empty `type` on Windows and older Android, and a file dragged from some
 * archive tools has `application/octet-stream`. Judging on the type alone rejects real
 * photos; judging on the extension alone accepts anything renamed. Either passing is enough
 * to try, and what cannot be decoded is caught later with a message that says so.
 */
export const ACCEPTED_EXTENSIONS: readonly string[] = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.gif',
  '.avif',
];

/** The `accept` attribute for the file input, listing both so every picker filters well. */
export const ACCEPT_ATTRIBUTE = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_EXTENSIONS].join(',');

/**
 * What the field ADVERTISES — deliberately not the same as what the picker accepts.
 *
 * Naming only the formats every browser can re-encode keeps the sentence true on every
 * device; "and other browser-supported image formats" is what makes room for HEIC on the
 * phone that produced it, without promising it on the laptop that cannot read it.
 */
export const ACCEPTED_LABEL = 'JPEG, PNG, WebP and other browser-supported image formats';

/**
 * The ceiling on what will be accepted from the picker, before downscaling.
 *
 * Generous on purpose — a modern phone photo is 3-8MB and a 48MP one can reach 25 —
 * because everything is downscaled to a 1280px JPEG before it is stored either way. This
 * exists to reject a video someone chose by mistake, or a RAW file, with a message rather
 * than a stalled upload on a phone in a field.
 */
export const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;

export type PhotoRejection = { ok: false; reason: string };
export type PhotoAcceptance = { ok: true };

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

/** Whether a file looks like one of the accepted image formats, by type OR by extension. */
export function isAcceptedImage(file: { name: string; type: string }): boolean {
  const type = file.type.toLowerCase();
  if (ACCEPTED_IMAGE_TYPES.includes(type)) return true;
  // An empty or generic type is common for HEIC and for files out of archives; fall back
  // to the extension rather than rejecting a real photo.
  if (type === '' || type === 'application/octet-stream') {
    return ACCEPTED_EXTENSIONS.includes(extensionOf(file.name));
  }
  return false;
}

/** Round a byte count for a message a person reads, not a spec sheet. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Check a chosen file, with a message written to be acted on.
 *
 * Every rejection names the format or size it actually got, because "invalid file" leaves
 * someone guessing at which of the two rules they broke.
 */
export function validatePhoto(file: { name: string; type: string; size: number }):
  | PhotoAcceptance
  | PhotoRejection {
  if (!isAcceptedImage(file)) {
    const seen = file.type || extensionOf(file.name) || 'an unrecognised format';
    return {
      ok: false,
      // Not ACCEPTED_LABEL: that string ends in "and other browser-supported image
      // formats", which reads as a shrug in requirement form. A rejection has to name
      // something the person can actually go and pick.
      reason: `That looks like ${seen}. Plantdex needs a photo \u2014 a JPEG, PNG or WebP works everywhere.`,
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: `That photo is ${formatBytes(file.size)}. The limit is ${formatBytes(
        MAX_UPLOAD_BYTES,
      )} — try a smaller one, or a screenshot of it.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, reason: 'That file is empty. It may not have finished copying.' };
  }
  return { ok: true };
}

/**
 * Pick the first usable image out of a drop or paste, and say what happened otherwise.
 *
 * A drop can carry several files, a folder, or a screenshot alongside its own text/plain
 * flavour. Taking the first ACCEPTED one rather than the first one at all means dragging a
 * photo out of a mixed selection does the obvious thing instead of failing.
 */
export function firstUsablePhoto(files: readonly File[]):
  | { file: File }
  | PhotoRejection {
  if (files.length === 0) {
    return { ok: false, reason: 'Nothing was dropped. Try again, or use the browse button.' };
  }
  const image = files.find((file) => isAcceptedImage(file));
  if (!image) {
    // Report against the first file, so the message names something they recognise.
    return validatePhoto(files[0]!) as PhotoRejection;
  }
  const verdict = validatePhoto(image);
  return verdict.ok ? { file: image } : verdict;
}
