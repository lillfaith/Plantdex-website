import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IDENTIFY_PROFILE, KEEP_PROFILE, UnprocessableImageError, prepareImage } from './image-prepare';

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
     * The re-encode is what drops EXIF and its GPS. A profile may only choose how SMALL the
     * output is; a short-circuit returning the original bytes because they were "already
     * small enough" would be a plausible-looking optimisation that silently retains a
     * camera's coordinates. There is now no `blob: file` anywhere in this module at all — the
     * decode-failure fallback that used to justify the one remaining instance is gone.
     */
    expect(codeOnly(PREPARE).match(/blob:\s*file\b/g) ?? []).toHaveLength(0);
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

  it('refuses only once BOTH decoders have failed', () => {
    // `decode()` is the only caller of either decoder, and `prepareImage` has exactly one
    // catch — so there is no path that gives up while a decoder is still untried, and the
    // one exit from that catch is a throw rather than a payload.
    expect(PREPARE).toMatch(/async function decode\(file: File\)/);
    expect(PREPARE).toContain('throw new UnprocessableImageError');
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
    // Measured, back when a raw-bytes fallback still existed: Chromium cannot decode HEIC, so
    // the fallback fired and the bytes left with their GPS tags on them — while PlantNet
    // refused the file anyway. `prepareImage` now throws instead of returning those bytes, so
    // the refusal is the only reachable outcome rather than a guard somebody must remember.
    expect(SCANS).toContain('UnprocessableImageError');
    expect(SCANS).toContain("kind: 'error'");
    // The refusal must come BEFORE the request is built, not after.
    expect(SCANS.indexOf('UnprocessableImageError')).toBeLessThan(SCANS.indexOf('new FormData()'));
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

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULE, EXERCISED RATHER THAN READ.
 *
 * Everything above reads source, which is the right tool for a claim about copy and a poor
 * one for a claim about behaviour. "Plantdex does not upload or store camera location
 * metadata" is a behavioural claim, so these drive the REAL `prepareImage` against stubbed
 * browser globals — no jsdom, no new dependency, and no HEIC decoder.
 *
 * The stubs are deliberately thin: a canvas whose `toBlob` hands back a marked blob, so a
 * test can tell the CANVAS OUTPUT from the INPUT FILE by identity. That distinction is the
 * whole point — EXIF is stripped by the re-encode, so a stored blob that is the original file
 * is a stored blob with the coordinates still on it.
 * ─────────────────────────────────────────────────────────────────────────────
 */
type Globals = Record<string, unknown>;
const g = globalThis as unknown as Globals;

const CANVAS_OUTPUT = 'canvas-output';

/** Install fake browser globals; returns a restore function. */
function withBrowser(options: {
  bitmap?: 'ok' | 'throw' | 'absent';
  imgElement?: 'ok' | 'fail';
  encode?: 'ok' | 'null';
}) {
  const saved = {
    createImageBitmap: g.createImageBitmap,
    document: g.document,
    Image: g.Image,
    URL: g.URL,
  };
  const revoked: string[] = [];

  if (options.bitmap === 'absent') delete g.createImageBitmap;
  else
    g.createImageBitmap = async () => {
      if (options.bitmap === 'throw') throw new Error('cannot decode');
      return { width: 1600, height: 1200, close: () => {} };
    };

  g.Image = class {
    naturalWidth = 1600;
    naturalHeight = 1200;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      queueMicrotask(() => (options.imgElement === 'fail' ? this.onerror?.() : this.onload?.()));
    }
  };

  g.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toBlob: (cb: (b: Blob | null) => void) =>
        cb(options.encode === 'null' ? null : new Blob([CANVAS_OUTPUT], { type: 'image/jpeg' })),
    }),
  };

  g.URL = {
    createObjectURL: () => 'blob:fake',
    revokeObjectURL: (u: string) => revoked.push(u),
  };

  return { revoked, restore: () => Object.assign(g, saved) };
}

/** Stands in for a camera original: bytes that are NOT the canvas output. */
const cameraOriginal = () =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x45, 0x78, 0x69, 0x66])], 'IMG_0001.HEIC', {
    type: 'image/heic',
  });

async function bodyOf(blob: Blob): Promise<string> {
  return new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()));
}

describe('camera location metadata is never stored', () => {
  it('1. a processed JPEG is stored as the re-encoded canvas output, not the original', async () => {
    const env = withBrowser({ bitmap: 'ok' });
    try {
      const out = await prepareImage(cameraOriginal());
      // Identity is the assertion: the canvas output is the only thing that has been through
      // a re-encode, and the re-encode is the only thing that drops EXIF.
      expect(await bodyOf(out.blob)).toBe(CANVAS_OUTPUT);
      expect(out.contentType).toBe('image/jpeg');
      expect(out.extension).toBe('jpg');
    } finally {
      env.restore();
    }
  });

  it('2. the <img> fallback path also stores the canvas output, not the original', async () => {
    for (const bitmap of ['throw', 'absent'] as const) {
      const env = withBrowser({ bitmap, imgElement: 'ok' });
      try {
        const out = await prepareImage(cameraOriginal());
        expect(await bodyOf(out.blob)).toBe(CANVAS_OUTPUT);
        // The object URL the fallback minted must not outlive the call.
        expect(env.revoked).toContain('blob:fake');
      } finally {
        env.restore();
      }
    }
  });

  it('3. an undecodable file yields NO stored bytes at all — it throws', async () => {
    const env = withBrowser({ bitmap: 'throw', imgElement: 'fail' });
    try {
      await expect(prepareImage(cameraOriginal())).rejects.toBeInstanceOf(UnprocessableImageError);
      // Even on the failing path, nothing is left pinned in memory.
      expect(env.revoked).toContain('blob:fake');
    } finally {
      env.restore();
    }
  });

  it('4. the raw original is never a fallback — not even when the ENCODE fails', async () => {
    // The subtle one. Both decoders succeed here; only `toBlob` fails. There is no EXIF-free
    // blob to store, so the answer must still be a refusal rather than the file it was handed.
    const env = withBrowser({ bitmap: 'ok', encode: 'null' });
    try {
      const file = cameraOriginal();
      await expect(prepareImage(file)).rejects.toBeInstanceOf(UnprocessableImageError);
      // And the type makes it unrepresentable: a resolved PreparedImage has no variant that
      // could carry the original, which is what stops this being a guard somebody can forget.
      expect(codeOnly(PREPARE)).not.toMatch(/blob:\s*file\b/);
    } finally {
      env.restore();
    }
  });

  it('no storage path catches the refusal and writes the original instead', () => {
    // photo-store lets it propagate; remote-sightings skips the upload entirely. Neither may
    // reach for `input.photoFile` / `file` as a substitute payload.
    expect(codeOnly(PHOTO_STORE)).not.toMatch(/put\(\s*file/);
    expect(codeOnly(REMOTE_SIGHTINGS)).not.toMatch(/upload\([^)]*photoFile/);
    expect(REMOTE_SIGHTINGS).toContain('if (prepared) {');
  });
});
