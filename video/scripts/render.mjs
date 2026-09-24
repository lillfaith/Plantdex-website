#!/usr/bin/env node
/**
 * Render ads to exports/.
 *
 *   node scripts/render.mjs                       every ad in ads/
 *   node scripts/render.mjs wild-plant-appeared   one ad
 *   node scripts/render.mjs <id> --stills 0,60,200   PNG stills only, to exports/qc/<id>/
 *   node scripts/render.mjs <id> --iphone             4K HEVC .mov master for iPhone
 *
 * --iphone renders the same composition at 2x (2160x3840) — a real render, not an upscale,
 * so text and cards are sharp at iPhone Pro pixel density and pixel art stays whole-number
 * scaled — as HEVC in a QuickTime .mov tagged `hvc1`, which is what an iPhone records itself:
 * it saves to Photos and plays there. Colour is tagged BT.709 limited range and audio is
 * 48kHz stereo AAC, so nothing is re-interpreted on the phone. Output:
 * exports/<id>-iphone-4k.mov.
 *
 * Output is H.264 / yuv420p / AAC at 1080x1920 30fps — the profile TikTok, Reels, Shorts
 * and Blotato all accept without re-encoding. A silent AAC track is written on purpose:
 * several platforms reject or mis-handle a video with no audio stream, and the sound is
 * chosen in-platform (trending audio), not baked in here.
 */
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const stillsArg = args.indexOf('--stills');
const stills = stillsArg >= 0 ? args[stillsArg + 1].split(',').map(Number) : null;
const ids = args.filter((a, i) => !a.startsWith('--') && (stillsArg < 0 || i !== stillsArg + 1));
const iphone = args.includes('--iphone');

// Use the container's pre-installed headless shell when present rather than downloading one.
const SHELLS = [
  process.env.REMOTION_BROWSER_EXECUTABLE,
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
].filter(Boolean);
const browserExecutable = SHELLS.find((p) => existsSync(p)) ?? null;

const serveUrl = await bundle({
  entryPoint: join(ROOT, 'src/index.ts'),
  publicDir: join(ROOT, 'assets/plantdex-ad-assets'),
});

const { ADS_IDS } = await import('./ad-ids.mjs');
for (const id of ids.length ? ids : ADS_IDS) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  if (stills) {
    const dir = join(ROOT, 'exports/qc', id);
    mkdirSync(dir, { recursive: true });
    for (const frame of stills) {
      const output = join(dir, `still-${String(frame).padStart(4, '0')}.png`);
      await renderStill({ serveUrl, composition, frame, output, browserExecutable });
      console.log(output);
    }
    continue;
  }
  mkdirSync(join(ROOT, 'exports'), { recursive: true });
  if (iphone) {
    await renderIphone(composition, id);
    continue;
  }
  const output = join(ROOT, 'exports', `${id}.mp4`);
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    // PNG frames + bt709, not the default JPEG frames: those produce full-range yuvj420p,
    // which Instagram and TikTok re-encode with crushed/washed-out colour.
    imageFormat: 'png',
    colorSpace: 'bt709',
    crf: 16,
    audioCodec: 'aac',
    enforceAudioTrack: true,
    outputLocation: output,
    browserExecutable,
    concurrency: 4,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) {
        last = pct;
        console.log(`${id}: ${pct}%`);
      }
    },
  });
  console.log(`wrote ${output}`);
}

async function renderIphone(composition, id) {
  const { execFileSync } = await import('node:child_process');
  const { createRequire } = await import('node:module');
  const { rmSync } = await import('node:fs');
  const require = createRequire(import.meta.url);
  const bin = dirname(require.resolve('@remotion/compositor-linux-x64-gnu/package.json'));
  const env = { ...process.env, LD_LIBRARY_PATH: `${bin}:${process.env.LD_LIBRARY_PATH ?? ''}` };
  const tmp = join(ROOT, 'exports', `${id}-iphone-4k.tmp.mp4`);
  const output = join(ROOT, 'exports', `${id}-iphone-4k.mov`);
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: 'h265',
    scale: 2,
    crf: 18,
    pixelFormat: 'yuv420p',
    imageFormat: 'png',
    colorSpace: 'bt709',
    audioCodec: 'aac',
    audioBitrate: '192k',
    enforceAudioTrack: true,
    outputLocation: tmp,
    browserExecutable,
    concurrency: 4,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) {
        last = pct;
        console.log(`${id} (iPhone 4K): ${pct}%`);
      }
    },
  });
  // Remux (no re-encode) into QuickTime with the `hvc1` tag Apple requires for HEVC, 48kHz
  // stereo audio, moov atom up front, and no metadata beyond what the encoder wrote.
  execFileSync(
    join(bin, 'ffmpeg'),
    [
      '-v', 'error', '-y', '-i', tmp,
      '-map', '0:v:0', '-map', '0:a:0',
      '-c:v', 'copy', '-tag:v', 'hvc1',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-movflags', '+faststart', '-f', 'mov', output,
    ],
    { env },
  );
  rmSync(tmp);
  console.log(`wrote ${output}`);
}
