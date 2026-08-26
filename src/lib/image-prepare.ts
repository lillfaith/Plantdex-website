'use client';

/**
 * Turn a chosen photo into what actually gets stored.
 *
 * ONE PIPELINE FOR BOTH BACKENDS. Downscaling used to live inside `photo-store.ts`, which
 * only the signed-OUT path uses — so a signed-in player uploaded the raw original to
 * Supabase Storage: an 8MB phone photo over mobile data, in a format the bucket then had to
 * serve back, with its extension taken from the filename (so a `.HEIC` renamed `.jpg`
 * uploaded as a lie). Signed in and signed out now produce the same thing, from the same
 * code: a JPEG no larger than 1280px on its longest edge.
 *
 * WHAT HAPPENS TO A FORMAT THE BROWSER CANNOT DECODE. HEIC is the case that matters — it is
 * the iPhone default, and Chrome and Firefox cannot decode it at all. `createImageBitmap`
 * throws there, and the honest answer is to store the ORIGINAL BYTES rather than lose the
 * photo: it is the player's own picture, their own phone renders it, and a note with an
 * unrenderable photo is still better than a note whose photo silently vanished. The result
 * says which happened so the caller can tell them.
 */

/** Longest edge of a stored photo. A field note does not need 12 megapixels. */
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;

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

export async function prepareImage(file: File): Promise<PreparedImage> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
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
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
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
