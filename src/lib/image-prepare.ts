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
 * WHAT HAPPENS TO A FORMAT THE BROWSER CANNOT DECODE. It is REFUSED. This module used to
 * fall back to the original bytes — the player's own picture, rendering fine on their own
 * phone, and better than a note whose photo silently vanished. That reasoning was about
 * losing a photograph, and it quietly traded away something else: a camera original carries
 * EXIF, and EXIF carries GPS, so the fallback meant Plantdex knowingly retained the
 * coordinates of a person and a plant. The rule is now one sentence with no exceptions —
 * **Plantdex does not upload or store camera location metadata** — and the only way to keep a
 * rule like that is to make the exception unrepresentable.
 *
 * So there is no longer any path that returns `file`. `prepareImage` either hands back a
 * re-encoded JPEG or throws `UnprocessableImageError`, and every caller refuses rather than
 * storing what it was given. HEIC outside Safari is the case that reaches it; proper HEIC
 * conversion is a later job, deliberately not a pre-launch dependency.
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

/**
 * The browser could not decode-and-re-encode this file, so it cannot be stripped of its
 * metadata, so it does not get stored or uploaded.
 *
 * A named type rather than a bare `Error` because callers must be able to tell "we refuse
 * this photograph" from "something went wrong", and say so in different words.
 */
export class UnprocessableImageError extends Error {
  constructor(cause: string) {
    super(`Could not process this image safely: ${cause}`);
    this.name = 'UnprocessableImageError';
  }
}

/**
 * Always a re-encoded JPEG. There is deliberately no variant meaning "the original,
 * untouched" — see the note at the top of this file.
 */
export interface PreparedImage {
  blob: Blob;
  contentType: 'image/jpeg';
  extension: 'jpg';
}

/*
 * `EXTENSION_BY_TYPE` and `extensionFor` used to live here. They existed ONLY to name the
 * original file's extension when its bytes were stored as they came, and nothing stores
 * those bytes any more — the output is always `.jpg`. Deleted rather than left: a helper
 * that names a raw original is a loaded gun next to a rule that says we never keep one.
 */

/**
 * Anything that can be painted to a canvas, with its own dimensions.
 *
 * `ImageBitmap` and `HTMLImageElement` both satisfy this and both are valid `drawImage`
 * sources, which is what lets one resize-and-encode step serve two decoders.
 */
interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  /** Releases whatever the decoder is holding — a bitmap handle, or an object URL. */
  release: () => void;
}

/**
 * Decode through an `<img>` and an object URL.
 *
 * THE SECOND DECODER, AND WHY THERE HAS TO BE ONE. `createImageBitmap` is not universally
 * available — Safari only gained it for a `Blob` in 15, so iOS 14 has none — and it can also
 * simply throw. Until this existed, every one of those cases fell through to "keep the
 * original bytes", and on the scan path that now means REFUSED: a perfectly good JPEG the
 * identifier would have accepted, turned away with a message blaming its format.
 *
 * Anything a browser can display, it can draw. Measured against a JPEG carrying EXIF
 * orientation 6: this path reports 1200x1600, the exact dimensions `createImageBitmap` gives,
 * so a photo recovered here is not rotated relative to one that took the normal route — and
 * the re-encoded output carries no Exif marker, so the GPS promise holds on both paths
 * equally. That second property is what makes this a real fallback rather than a loophole.
 */
async function decodeViaImageElement(file: File): Promise<Decoded> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('img decode failed'));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('img decoded empty');
    // Released by the CALLER, once the pixels have been drawn — revoking here would pull the
    // source out from under `drawImage`.
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    // The one path where nothing downstream will revoke it.
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** `createImageBitmap` first, an `<img>` second, and only then give up. */
async function decode(file: File): Promise<Decoded> {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  } catch {
    return decodeViaImageElement(file);
  }
}

/**
 * @param profile How hard to compress. Defaults to `KEEP_PROFILE`, so a caller that says
 *   nothing gets the fidelity stored photos have always had; only `scans.ts` asks for less.
 */
export async function prepareImage(
  file: File,
  profile: PrepareProfile = KEEP_PROFILE,
): Promise<PreparedImage> {
  let decoded: Decoded | null = null;
  try {
    decoded = await decode(file);
    const scale = Math.min(1, profile.maxEdge / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context');
    context.drawImage(decoded.source, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', profile.quality),
    );
    if (!blob) throw new Error('encode failed');

    // Re-encoding to JPEG drops the original's EXIF wholesale, GPS included — which is the
    // whole mechanism behind the promise, not a side effect of resizing. It holds for BOTH
    // decoders, because the pixels go through this same canvas either way, and there is no
    // third path that could skip it.
    return { blob, contentType: 'image/jpeg', extension: 'jpg' };
  } catch (error) {
    // Both decoders failed, or the encode did. Either way the metadata cannot be stripped,
    // so the file is refused — never stored, never uploaded, never kept as it came.
    if (error instanceof UnprocessableImageError) throw error;
    throw new UnprocessableImageError(error instanceof Error ? error.message : 'unknown');
  } finally {
    // Runs on every path, so a bitmap handle is never leaked and an object URL never
    // outlives the draw that needed it.
    decoded?.release();
  }
}
