import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOGUE } from './catalogue';
import { CHIP_WIDTH, chipArt } from './card-art';

const PUBLIC = join(process.cwd(), 'public');

/** WebP's width, read off the VP8/VP8L/VP8X header. Enough to tell 112 from 400. */
function webpWidth(bytes: Buffer): number {
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
  expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP');
  const fourcc = bytes.subarray(12, 16).toString('ascii');
  if (fourcc === 'VP8X') return (bytes.readUIntLE(24, 3) & 0xffffff) + 1;
  if (fourcc === 'VP8L') {
    const bits = bytes.readUInt32LE(21);
    return (bits & 0x3fff) + 1;
  }
  // Lossy VP8: the 10-byte frame header sits after the 3-byte start code 0x9d012a.
  const start = bytes.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
  expect(start).toBeGreaterThan(0);
  return bytes.readUInt16LE(start + 3) & 0x3fff;
}

describe('chip card art', () => {
  /*
   * THE FILE, NOT A FIELD. The chip path is computed rather than stored, so nothing in the
   * data model would notice a card whose chip was never rendered — a new card, or a
   * `build_chips.py` that was not re-run. This is the check that would.
   */
  it('exists on disk for every catalogue entry', () => {
    const missing = CATALOGUE.filter((herb) => !existsSync(join(PUBLIC, chipArt(herb))));
    expect(missing.map((herb) => herb.id)).toEqual([]);
  });

  it('is rendered at the measured chip width, not the thumbnail width', () => {
    const wrong = CATALOGUE.map((herb) => ({
      id: herb.id,
      width: webpWidth(readFileSync(join(PUBLIC, chipArt(herb)))),
    })).filter((entry) => entry.width !== CHIP_WIDTH);
    expect(wrong).toEqual([]);
  });

  /*
   * The saving is the entire reason the variant exists, so it is asserted rather than
   * assumed: a chip regenerated at thumbnail quality would pass both checks above.
   */
  it('is a fraction of the thumbnail it replaces', () => {
    const thumbs = CATALOGUE.reduce(
      (sum, herb) => sum + readFileSync(join(PUBLIC, herb.thumb)).byteLength,
      0,
    );
    const chips = CATALOGUE.reduce(
      (sum, herb) => sum + readFileSync(join(PUBLIC, chipArt(herb))).byteLength,
      0,
    );
    expect(chips).toBeLessThan(thumbs / 3);
  });
});
