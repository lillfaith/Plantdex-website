import { describe, expect, it } from 'vitest';

import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPT_ATTRIBUTE,
  MAX_UPLOAD_BYTES,
  firstUsablePhoto,
  formatBytes,
  isAcceptedImage,
  validatePhoto,
} from './photo-input';

/**
 * What a sighting photo may be.
 *
 * These rules are checked in four places — the picker's `accept`, the drop target, the
 * paste handler, and validation before either storage path — so they are pinned once here
 * rather than trusted to stay in step across all four.
 */

const file = (name: string, type: string, size = 1024) => ({ name, type, size });
const asFile = (name: string, type: string, size = 1024) =>
  ({ name, type, size }) as unknown as File;

describe('accepted formats', () => {
  it('takes what a phone camera and a photo library actually produce', () => {
    for (const type of ACCEPTED_IMAGE_TYPES) {
      expect(isAcceptedImage(file('photo', type)), type).toBe(true);
    }
  });

  /**
   * The reason the extension is consulted at all: HEIC routinely arrives with no MIME type
   * on Windows and older Android, and a file out of an archive tool arrives as
   * `application/octet-stream`. Judging on the type alone would reject real iPhone photos.
   */
  it('accepts a typeless or generic file whose extension is an image', () => {
    expect(isAcceptedImage(file('IMG_0421.HEIC', ''))).toBe(true);
    expect(isAcceptedImage(file('nettle.jpg', 'application/octet-stream'))).toBe(true);
    expect(isAcceptedImage(file('nettle.JPEG', ''))).toBe(true);
  });

  it('rejects a typeless file that is not an image at all', () => {
    expect(isAcceptedImage(file('field-notes.pdf', ''))).toBe(false);
    expect(isAcceptedImage(file('archive', ''))).toBe(false);
  });

  /**
   * SVG is markup that can carry script, is never a photograph, and would end up in a
   * bucket that later hands out signed URLs. `image/*` used to let it through.
   */
  it('rejects SVG, and the other things `image/*` used to allow', () => {
    expect(isAcceptedImage(file('leaf.svg', 'image/svg+xml'))).toBe(false);
    expect(isAcceptedImage(file('scan.tiff', 'image/tiff'))).toBe(false);
    expect(isAcceptedImage(file('old.bmp', 'image/bmp'))).toBe(false);
  });

  it('rejects a video chosen by mistake', () => {
    expect(isAcceptedImage(file('IMG_0422.mov', 'video/quicktime'))).toBe(false);
  });

  it('offers both types and extensions to the picker', () => {
    expect(ACCEPT_ATTRIBUTE).toContain('image/jpeg');
    expect(ACCEPT_ATTRIBUTE).toContain('.heic');
  });
});

describe('validatePhoto', () => {
  it('accepts an ordinary phone photo', () => {
    expect(validatePhoto(file('IMG_0421.jpg', 'image/jpeg', 4 * 1024 * 1024))).toEqual({
      ok: true,
    });
  });

  /** Every rejection names what it actually got — "invalid file" leaves someone guessing. */
  it('names the format it was given when it refuses one', () => {
    const verdict = validatePhoto(file('clip.mov', 'video/quicktime'));
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.reason).toContain('video/quicktime');
    expect(verdict.reason).toContain('JPEG');
  });

  it('names the size when a file is too big, and says what the limit is', () => {
    const verdict = validatePhoto(file('huge.jpg', 'image/jpeg', MAX_UPLOAD_BYTES + 1));
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.reason).toContain('32.0 MB');
  });

  it('catches an empty file, which usually means a copy that never finished', () => {
    const verdict = validatePhoto(file('IMG_0421.jpg', 'image/jpeg', 0));
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.reason).toContain('empty');
  });
});

describe('firstUsablePhoto', () => {
  /**
   * A drop can carry several files at once. Taking the first ACCEPTED one rather than the
   * first one at all means dragging a photo out of a mixed selection does the obvious
   * thing instead of failing on whatever happened to be first.
   */
  it('finds the photo in a mixed drop', () => {
    const result = firstUsablePhoto([
      asFile('notes.txt', 'text/plain'),
      asFile('nettle.png', 'image/png'),
    ]);
    expect('file' in result && result.file.name).toBe('nettle.png');
  });

  it('reports against the first file when none of them is a photo', () => {
    const result = firstUsablePhoto([asFile('notes.txt', 'text/plain')]);
    expect('ok' in result && result.ok).toBe(false);
    if (!('ok' in result)) return;
    expect(result.reason).toContain('text/plain');
  });

  it('explains an empty drop rather than failing silently', () => {
    const result = firstUsablePhoto([]);
    expect('ok' in result && result.reason).toContain('Nothing was dropped');
  });

  it('still rejects an accepted format that is too large', () => {
    const result = firstUsablePhoto([
      asFile('huge.jpg', 'image/jpeg', MAX_UPLOAD_BYTES + 1),
    ]);
    expect('ok' in result && result.ok).toBe(false);
  });
});

describe('formatBytes', () => {
  it('reads like something a person would say', () => {
    expect(formatBytes(4 * 1024 * 1024)).toBe('4.0 MB');
    expect(formatBytes(240 * 1024)).toBe('240 KB');
    // Never "0 KB" for a file that exists.
    expect(formatBytes(12)).toBe('1 KB');
  });
});
