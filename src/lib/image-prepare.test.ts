import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IDENTIFY_PROFILE, KEEP_PROFILE } from './image-prepare';

const PREPARE = readFileSync('src/lib/image-prepare.ts', 'utf8');
const SCANS = readFileSync('src/lib/scans.ts', 'utf8');
const PHOTO_STORE = readFileSync('src/lib/photo-store.ts', 'utf8');
const REMOTE_SIGHTINGS = readFileSync('src/lib/remote-sightings.ts', 'utf8');
const SCAN_PANEL = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8');
const WARMUP = readFileSync('src/lib/scan-warmup.ts', 'utf8');
const PHOTO_FIELD = readFileSync('src/components/journal/PhotoField.tsx', 'utf8');
const PRIVACY = readFileSync('src/app/privacy/page.tsx', 'utf8');

/** Comments explain the decisions; the guards below are about the code that implements them. */
function codeOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * The prepare pipeline has two profiles because it serves two jobs, and the whole value of
 * the split is that one of them did NOT change. These are source-reading guards for the same
 * reason `analytics.test.ts` and `launch-loop.test.ts` are: `createImageBitmap`, `<canvas>`
 * and `toBlob` do not exist under vitest's environment, so the behaviour cannot be executed
 * here — but the decisions can be pinned, and a decision quietly reversed is the failure mode
 * that matters.
 */
describe('prepare profiles', () => {
  it('leaves the KEPT photograph at exactly the fidelity it always had', () => {
    // Not "some sensible value" — these two numbers are what every photo already stored was
    // written with, and a change here silently makes new sightings look different from old
    // ones in the same journal.
    expect(KEEP_PROFILE).toEqual({ maxEdge: 1280, quality: 0.82 });
  });

  it('sends less than it keeps, on both axes', () => {
    expect(IDENTIFY_PROFILE.maxEdge).toBeLessThan(KEEP_PROFILE.maxEdge);
    expect(IDENTIFY_PROFILE.quality).toBeLessThan(KEEP_PROFILE.quality);
  });

  it('defaults to the KEEP profile, so a caller that says nothing loses no fidelity', () => {
    // The direction of the default is the safety property. Defaulting the other way would
    // mean any future caller that forgot the argument quietly downgraded a stored photo.
    expect(PREPARE).toMatch(/profile:\s*PrepareProfile\s*=\s*KEEP_PROFILE/);
  });

  it('asks for the smaller profile only on the path that transmits and discards', () => {
    expect(SCANS).toContain('prepareImage(file, IDENTIFY_PROFILE)');
    for (const source of [PHOTO_STORE, REMOTE_SIGHTINGS]) {
      expect(source).not.toContain('IDENTIFY_PROFILE');
    }
  });

  it('never lets a profile turn the re-encode into a passthrough', () => {
    /*
     * The re-encode is what drops EXIF and its GPS, and the scan screen promises that in
     * words. A profile may only choose how small the output is; a short-circuit that returned
     * the original bytes when they were "already small enough" would be a plausible-looking
     * optimisation that breaks a stated promise, so the only `blob: file` in this module is
     * the decode-failure fallback the docstring argues for.
     */
    const passthroughs = PREPARE.match(/blob:\s*file\b/g) ?? [];
    expect(passthroughs).toHaveLength(1);
    expect(PREPARE).toContain("contentType: 'image/jpeg'");
  });
});

describe('two decoders before giving up', () => {
  /*
   * THE REGRESSION THIS PINS. Refusing to transmit anything that could not be re-encoded was
   * right for HEIC, but the flag it keys on is set by ANY decode or encode failure — so with
   * one decoder, `createImageBitmap` being absent (Safari before 15) or throwing, or `toBlob`
   * returning null under memory pressure, turned a perfectly good JPEG into a refused scan
   * with a message blaming its format. Measured across all four failure modes before this
   * second path was added.
   */
  it('tries createImageBitmap first and an <img> second', () => {
    expect(PREPARE).toContain('createImageBitmap(file)');
    expect(PREPARE).toContain('decodeViaImageElement');
    // Order matters: the bitmap path is the fast one and the fallback must not pre-empt it.
    expect(PREPARE.indexOf('createImageBitmap(file)')).toBeLessThan(
      PREPARE.indexOf('return decodeViaImageElement(file)'),
    );
  });

  it('reaches the raw-bytes fallback only when BOTH decoders have failed', () => {
    // `decode()` is the only caller of either decoder, and `prepareImage` has exactly one
    // catch — so there is no path that gives up while a decoder is still untried.
    expect(PREPARE).toMatch(/async function decode\(file: File\)/);
    expect(codeOnly(PREPARE).match(/blob: file\b/g) ?? []).toHaveLength(1);
  });

  it('always releases what a decoder was holding', () => {
    // A bitmap handle and an object URL both leak silently. The `finally` covers the success
    // path, the failure path and the raw-bytes path at once.
    expect(PREPARE).toContain('} finally {');
    expect(PREPARE).toContain('decoded?.release()');
    expect(PREPARE).toContain('URL.revokeObjectURL(url)');
  });

  it('sends both decoders through the same canvas, so neither can skip the re-encode', () => {
    // The EXIF/GPS guarantee is a property of the canvas step, not of either decoder. One
    // drawImage and one toBlob is what makes that true for both paths.
    expect(codeOnly(PREPARE).match(/drawImage\(/g) ?? []).toHaveLength(1);
    expect(codeOnly(PREPARE).match(/canvas\.toBlob\(/g) ?? []).toHaveLength(1);
  });
});

describe('what is promised about location data', () => {
  /*
   * THE DEFECT THESE PIN, and why there are three of them. `prepareImage` keeps the ORIGINAL
   * bytes when the browser cannot decode the format, and three separate places described that
   * world wrongly: the scan screen promised stripping unconditionally while `scans.ts`
   * forwarded a raw HEIC — GPS intact — to a third party; the journal made the same flat
   * promise on a path that really does keep the original; and /privacy claimed "the original
   * file is never sent" alongside a pixel size the scan path had stopped using.
   *
   * Nothing caught any of it: `legal.test.ts` checks the privacy page against the ANALYTICS
   * code in both directions and says nothing about photographs. Same guard shape, applied to
   * the claim that was actually drifting.
   */
  it('refuses to send a photograph it could not re-encode', () => {
    // The whole fix. Measured: Chromium cannot decode HEIC, the fallback fires, and the raw
    // bytes leave with their GPS tags on them — while PlantNet refuses the file anyway.
    expect(SCANS).toContain('if (!prepared.downscaled)');
    const guard = SCANS.slice(SCANS.indexOf('if (!prepared.downscaled)'));
    expect(guard.slice(0, 400)).toContain("kind: 'error'");
    // The refusal must come BEFORE the request is built, not after.
    expect(SCANS.indexOf('if (!prepared.downscaled)')).toBeLessThan(SCANS.indexOf('new FormData()'));
  });

  it('keeps the scan screen able to promise it', () => {
    // Only true because of the guard above. If the refusal is ever removed, this sentence
    // becomes a lie again, so the two are pinned together deliberately.
    expect(SCAN_PANEL).toContain('location data removed before it');
  });

  it('does not make the flat promise on the path that keeps originals', () => {
    // The sighting path deliberately stores what it cannot decode — losing somebody's
    // photograph is the worse failure there — so its copy has to name the exception.
    expect(PHOTO_FIELD).toMatch(/cannot read/i);
    expect(PHOTO_FIELD).toMatch(/HEIC/);
  });

  it('does not let /privacy state a resize the code has stopped doing', () => {
    // It said "re-encoded to 1280px" while the scan path had moved to 1024. A number in a
    // privacy policy is a promise, and this one is better made without a figure that two
    // profiles would have to agree on forever.
    expect(PRIVACY).not.toMatch(/re-encoded to \d+px/);
    expect(PRIVACY).toContain('The original file is never sent');
    expect(PRIVACY).toMatch(/refused rather than sent/);
  });
});

describe('the scan status', () => {
  it('reports only the boundary the code can actually observe', () => {
    // One callback, at the end of preparation. There is deliberately no "upload finished"
    // signal, because `fetch` does not give one — a third stage could only be invented.
    expect(SCANS).toContain('onPrepared?.();');
    expect(SCANS).not.toMatch(/onUploaded|setTimeout\(/);
    expect(SCAN_PANEL).toContain("identifyPlant(file, () => setStage('identifying'))");
  });

  it('shows the chosen photograph before any work starts', () => {
    // The object URL is created in the same synchronous block as the stage change, ahead of
    // the await — that ordering is the entire point, so pin it rather than just the call.
    const pick = SCAN_PANEL.slice(
      SCAN_PANEL.indexOf("setStage('preparing')"),
      SCAN_PANEL.indexOf('await identifyPlant'),
    );
    expect(pick).toContain('URL.createObjectURL(file)');
    expect(SCAN_PANEL).toContain('URL.revokeObjectURL');
  });

  it('never loops an animation while waiting', () => {
    /*
     * CLAUDE.md's Motion rule: every effect is 1 or 2 iterations, never `infinite`. A busy
     * indicator is the most tempting place in the app to break it, and `animate-pulse` is one
     * class away. The bar is determinate and reuses `path-fill` instead.
     */
    expect(SCAN_PANEL).not.toContain('animate-pulse');
    expect(SCAN_PANEL).not.toContain('animate-spin');
    expect(SCAN_PANEL).toContain('path-fill');
  });
});

describe('the identifier warm-up', () => {
  it('sends no image and spends no quota', () => {
    // OPTIONS is answered above the quota claims in the function, so this cannot consume an
    // identification. A POST here would spend one of five for an anonymous player.
    expect(WARMUP).toContain("method: 'OPTIONS'");
    expect(codeOnly(WARMUP)).not.toMatch(/\bPOST\b|FormData|body:/);
  });

  it('cannot fail the thing it exists to speed up', () => {
    expect(WARMUP).toContain('} catch {');
    expect(WARMUP).toMatch(/if \(warmed\) return;/);
  });
});
