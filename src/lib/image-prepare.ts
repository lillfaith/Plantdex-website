'use client';

/**
 * Turn a chosen photo into what actually gets stored.
 *
 * ONE PIPELINE FOR BOTH BACKENDS. Downscaling used to live inside `photo-store.ts`, which
 * only the signed-OUT path uses — so a signed-in player uploaded the raw original to
 * Supabase Storage: an 8MB phone photo over mobile data, in a format the bucket then had to
 * serve back, with its extension taken from the filename (so a `.HEIC` renamed `.jpg`
 * uploaded as a lie). Signed in and signed out now produce the same thing, from the same
 * code: a downscaled JPEG, sized by the profile the caller asks for (see `PrepareProfile`).
 *
 * THE RE-ENCODE IS NOT AN OPTIMISATION AND IS NEVER OPTIONAL. Writing the pixels back out as
 * a fresh JPEG is what drops the original's EXIF wholesale, GPS included — a promise the scan
 * screen makes to the player in words. A profile may make the output smaller; nothing may
 * make it a passthrough.
 *
 * WHAT HAPPENS TO A FORMAT THE BROWSER CANNOT DECODE. HEIC is the case that matters — it is
 * the iPhone default, and Chrome and Firefox cannot decode it at all. `createImageBitmap`
 * throws there, and the honest answer is to store the ORIGINAL BYTES rather than lose the
 * photo: it is the player's own picture, their own phone renders it, and a note with an
 * unrenderable photo is still better than a note whose photo silently vanished. The result
 * says which happened so the caller can tell them.
 */

/**
 * How hard to compress, and why there are two answers rather than one.
 *
 * The three callers of this module are doing two different jobs. `photo-store.ts` and
 * `remote-sightings.ts` prepare a photograph the player KEEPS — it is opened again later, on
 * whatever screen they happen to own, and its fidelity is the whole point of storing it.
 * `scans.ts` prepares a photograph that is TRANSMITTED ONCE AND DISCARDED: nothing in the app
 * ever displays it, no row keeps it, and the only consumer is an identification model.
 *
 * Those wanted the same number only because one number was all there was. Every byte in the
 * second case is a byte somebody standing in a field pushes up a mobile uplink before they
 * are told what they are looking at — and on that connection the upload is routinely the
 * largest single term in the wait.
 */
export interface PrepareProfile {
  /** Longest edge, in pixels, after downscaling. */
  maxEdge: number;
  /** JPEG quality, 0-1, as `canvas.toBlob` takes it. */
  quality: number;
}

/**
 * For a photograph that is kept and looked at again. A field note does not need 12
 * megapixels — but it does get re-opened, so this is deliberately UNCHANGED from the single
 * setting that preceded the split, and stored photos are byte-for-byte what they always were.
 */
export const KEEP_PROFILE: PrepareProfile = { maxEdge: 1280, quality: 0.82 };

/**
 * For a photograph sent to the identifier and then dropped.
 *
 * Measured on the deck's own photographic crops, this is ~1.6x fewer bytes than `KEEP_PROFILE`
 * — most of it from the pixel count, since bytes scale with area rather than with edge. A real
 * camera photo carries far more sensor detail than a card front does, so the absolute saving
 * on a phone is several times larger than that measurement's absolute numbers.
 *
 * WHY 1024 AND NOT 800, MEASURED. Three real Wikimedia field photographs were put through the
 * deployed function at 1280/1024/800 (`identify_web_images.py`, `SIZES=...`). The TOP
 * CANDIDATE was identical at every size for all three, and no photograph changed confidence
 * band between 1280 and 1024 — so `plant-match` resolves the same card and the UI says the
 * same words. What the scores did was NOT consistent, which is the finding:
 *
 *   dandelion  0.347 -> 0.440 -> 0.545   (362 -> 201 -> 132 KB)  rose
 *   plantain   0.838 -> 0.877 -> 0.886   (424 -> 210 -> 132 KB)  rose
 *   yarrow     0.305 -> 0.273 -> 0.196   (   - ->   - ->  87 KB)  FELL
 *
 * Smaller is therefore not uniformly better OR worse. At 1024 the worst movement is yarrow's
 * -0.032; at 800 it is -0.109, a third of that photograph's confidence — and confidence is what
 * this screen shows a player deciding whether to trust a suggestion. So 1024 is where the
 * evidence supports stopping. 800 remains available and would be ~2.7x smaller than 1280 on a
 * real photograph; it needs more than three pictures before it is worth that score.
 */
export const IDENTIFY_PROFILE: PrepareProfile = { maxEdge: 1024, quality: 0.75 };

export interface PreparedImage {
  blob: Blob;
  /** What to send as the content type, and what the stored file's extension follows. */
  contentType: string;
  /** File extension, with no dot. */
  extension: string;
  /**
   * False when the browser could not decode the original, so the bytes were stored as they
   * came. The photo is safe; it may not render in every browser.
   */
  downscaled: boolean;
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

/** Extension from the MIME type, falling back to the filename's own. */
function extensionFor(file: File): string {
  const byType = EXTENSION_BY_TYPE[file.type.toLowerCase()];
  if (byType) return byType;
  const dot = file.name.lastIndexOf('.');
  const fromName = dot === -1 ? '' : file.name.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(fromName) ? fromName : 'jpg';
}

/**
 * @param profile How hard to compress. Defaults to `KEEP_PROFILE`, so a caller that says
 *   nothing gets the fidelity stored photos have always had; only `scans.ts` asks for less.
 */
export async function prepareImage(
  file: File,
  profile: PrepareProfile = KEEP_PROFILE,
): Promise<PreparedImage> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, profile.maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      throw new Error('no 2d context');
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', profile.quality),
    );
    if (!blob) throw new Error('encode failed');

    // Re-encoding to JPEG drops the original's EXIF wholesale, GPS included. That is a
    // privacy win worth naming: /safety asks people not to record exact spots for wild
    // plants, and an untouched phone photo carries the coordinates whether they meant it or
    // not.
    return { blob, contentType: 'image/jpeg', extension: 'jpg', downscaled: true };
  } catch {
    return {
      blob: file,
      contentType: file.type || 'application/octet-stream',
      extension: extensionFor(file),
      downscaled: false,
    };
  }
}
