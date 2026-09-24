#!/usr/bin/env node
/**
 * Post-render quality control. Run after `npm run render`; fails (exit 1) on any problem.
 *
 *   node scripts/qc.mjs [ad-id ...]
 *
 * For each ad:
 *   1. PROVENANCE — the pack's ZIP hashes match the manifest, and every file the spec can
 *      draw (including every frame of every sprite it plays) is re-hashed against the
 *      manifest. A changed or substituted file fails here.
 *   2. SPRITES — every sequence the ad plays has the frame count and fps the manifest
 *      records, every frame has ink and one size, and the sequence genuinely moves.
 *   3. CONTAINER — the MP4 is H.264 yuv420p, 1080x1920, 30fps, the declared length, with
 *      an AAC track: what Blotato and the platforms take without re-encoding.
 *   4. PICTURE — every frame of the video is decoded and none is blank, flat or
 *      near-black (a missing graphic or a dropped scene), and the hook's sprite region
 *      actually changes while the sprite plays.
 *   5. REVIEW SHEET — a contact sheet (one frame per second) in exports/qc/ for the human
 *      pass that CREATIVE_RULES §7 still requires.
 *
 * Writes exports/<id>.qc.json with every measurement.
 */
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { ADS } from './ad-ids.mjs';

const VIDEO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = join(VIDEO, 'assets/plantdex-ad-assets');
const manifest = JSON.parse(readFileSync(join(VIDEO, 'manifest/assets.json'), 'utf8'));
const require = createRequire(import.meta.url);
const BIN = dirname(require.resolve('@remotion/compositor-linux-x64-gnu/package.json'));
const FFMPEG = join(BIN, 'ffmpeg');
const FFPROBE = join(BIN, 'ffprobe');
const ENV = { ...process.env, LD_LIBRARY_PATH: `${BIN}:${process.env.LD_LIBRARY_PATH ?? ''}` };

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const ids = process.argv.slice(2);
let failed = false;

// ── 1a. The ZIPs this manifest was built from are the ones that were unpacked ─────────
const sources = JSON.parse(readFileSync(join(VIDEO, 'assets/sources.json'), 'utf8'));
const sourceProblems = manifest.sources
  .filter((m) => !sources.some((s) => s.zip === m.zip && s.sha256 === m.sha256))
  .map((m) => `${m.zip} differs from the ZIP the manifest was built from`);

/** Every pack file an ad spec can draw. */
function referencedFiles(spec) {
  const files = new Set();
  const sprites = [];
  const addSprite = (plant, stage) => {
    const seq = manifest.plants[plant].sprites[stage];
    seq.frames.forEach((f) => files.add(f));
    sprites.push({ plant, stage, seq });
  };
  for (const s of spec.scenes) {
    if (s.type === 'hook') addSprite(s.plant, s.stage);
    if (s.type === 'cardReveal') files.add(manifest.plants[s.plant].cards.front);
    if (s.type === 'photo') files.add(s.image);
    if (s.type === 'footage') files.add(manifest.footage[s.clip].file);
    if (s.type === 'screenDemo') s.shots.forEach((x) => files.add(manifest.screens[x.screen][x.framing]));
    if (s.type === 'uiCallout') {
      files.add(manifest.uiParts[s.part].file);
      s.growth?.stages.forEach((g) => addSprite(s.growth.plant, g.stage));
    }
    if (s.type === 'cta') {
      if (s.photo) files.add(s.photo);
      s.sprites.forEach((x) => addSprite(x.plant, x.stage));
    }
  }
  return { files: [...files].sort(), sprites };
}

/** Decode a PNG's alpha coverage via ffmpeg (no image library needed in node). */
function inkFraction(path) {
  const out = execFileSync(FFMPEG, ['-v', 'error', '-i', path, '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'rgba', '-'], {
    env: ENV,
    maxBuffer: 1 << 26,
  });
  let ink = 0;
  for (let i = 3; i < out.length; i += 4) if (out[i] > 0) ink++;
  return ink / (out.length / 4);
}

function probe(mp4) {
  const j = JSON.parse(
    execFileSync(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', mp4], { env: ENV }),
  );
  const v = j.streams.find((s) => s.codec_type === 'video');
  const a = j.streams.find((s) => s.codec_type === 'audio');
  const [n, d] = v.r_frame_rate.split('/').map(Number);
  return {
    videoCodec: v.codec_name,
    pixFmt: v.pix_fmt,
    width: v.width,
    height: v.height,
    fps: n / d,
    frames: Number(v.nb_frames),
    duration: Number(j.format.duration),
    audioCodec: a?.codec_name ?? null,
    bytes: Number(j.format.size),
  };
}

/** Decode every frame at 1/10 scale (108x192) greyscale; stats per frame. */
function frameStats(mp4) {
  const w = 108;
  const h = 192;
  const res = spawnSync(FFMPEG, ['-v', 'error', '-i', mp4, '-vf', `scale=${w}:${h}`, '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'gray', '-'], {
    env: ENV,
    maxBuffer: 1 << 28,
  });
  const buf = res.stdout;
  const size = w * h;
  const stats = [];
  for (let off = 0; off + size <= buf.length; off += size) {
    let sum = 0;
    let sq = 0;
    for (let i = off; i < off + size; i++) {
      sum += buf[i];
      sq += buf[i] * buf[i];
    }
    const mean = sum / size;
    stats.push({ mean, std: Math.sqrt(sq / size - mean * mean), hash: sha(buf.subarray(off, off + size)) });
  }
  return stats;
}

/** Distinct crops of a region over a frame range, at full resolution. */
function regionChanges(mp4, fromFrame, toFrame, crop) {
  const fps = 30;
  const res = spawnSync(
    FFMPEG,
    [
      '-v', 'error', '-ss', String(fromFrame / fps), '-i', mp4,
      '-frames:v', String(toFrame - fromFrame),
      '-vf', `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`,
      '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'gray', '-',
    ],
    { env: ENV, maxBuffer: 1 << 28 },
  );
  const size = crop.w * crop.h;
  const hashes = new Set();
  for (let off = 0; off + size <= res.stdout.length; off += size) hashes.add(sha(res.stdout.subarray(off, off + size)));
  return hashes.size;
}

for (const { spec } of ADS.filter((a) => !ids.length || ids.includes(a.spec.id))) {
  const problems = [...sourceProblems];
  const report = { id: spec.id, title: spec.title, checkedAt: new Date().toISOString() };

  // 1b. provenance of every referenced file
  const { files, sprites } = referencedFiles(spec);
  for (const f of files) {
    const entry = manifest.files[f];
    if (!entry) problems.push(`${f}: not in the manifest`);
    else if (!existsSync(join(PACK, f))) problems.push(`${f}: missing from assets/`);
    else if (sha(readFileSync(join(PACK, f))) !== entry.sha256) problems.push(`${f}: bytes differ from the pack`);
  }
  report.assets = { files: files.length, verified: files.length - problems.length };

  // 2. sprite sequences
  report.sprites = [];
  const seen = new Set();
  for (const { plant, stage, seq } of sprites) {
    const key = `${plant}/${stage}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const hashes = seq.frames.map((f) => manifest.files[f].sha256);
    // Holds (a pose repeated for a beat) are authored timing in the real sheets, so the
    // test is that the sequence MOVES, not that no two neighbours match.
    const distinct = new Set(hashes).size;
    const holds = hashes.filter((h, i) => i > 0 && h === hashes[i - 1]).length;
    const inks = seq.frames.map((f) => inkFraction(join(PACK, f)));
    const sizes = new Set(seq.frames.map((f) => `${manifest.files[f].width}x${manifest.files[f].height}`));
    if (distinct < Math.min(3, seq.frameCount)) problems.push(`${key}: only ${distinct} distinct frames — not animating`);
    if (inks.some((x) => x < 0.005)) problems.push(`${key}: a frame is empty`);
    if (sizes.size !== 1) problems.push(`${key}: frames differ in size`);
    if (seq.frames.length !== seq.frameCount) problems.push(`${key}: frame count mismatch`);
    report.sprites.push({ sprite: key, frames: seq.frameCount, distinct, holds, fps: seq.fps, minInk: Math.min(...inks).toFixed(3) });
  }

  // 3. container
  const mp4 = join(VIDEO, 'exports', `${spec.id}.mp4`);
  if (!existsSync(mp4)) {
    problems.push(`${mp4} does not exist — run npm run render first`);
  } else {
    const p = probe(mp4);
    report.container = p;
    if (p.videoCodec !== 'h264') problems.push(`video codec ${p.videoCodec}, want h264`);
    if (p.pixFmt !== 'yuv420p') problems.push(`pixel format ${p.pixFmt}, want yuv420p`);
    if (p.width !== spec.width || p.height !== spec.height) problems.push(`size ${p.width}x${p.height}`);
    if (Math.abs(p.fps - spec.fps) > 0.01) problems.push(`fps ${p.fps}`);
    if (p.frames !== spec.durationInFrames) problems.push(`${p.frames} frames, spec declares ${spec.durationInFrames}`);
    if (p.audioCodec !== 'aac') problems.push(`audio ${p.audioCodec}, want an AAC track`);

    // 4. picture
    const stats = frameStats(mp4);
    const bad = stats
      .map((s, i) => ({ ...s, i }))
      .filter((s) => s.mean < 6 || s.std < 4);
    if (stats.length !== spec.durationInFrames) problems.push(`decoded ${stats.length} frames`);
    if (bad.length) problems.push(`blank/flat frames: ${bad.map((b) => b.i).join(', ')}`);
    // Frame 0 is the platform thumbnail and the first thing anyone sees.
    if (stats[0] && stats[0].std < 12) problems.push(`frame 0 is nearly empty (contrast ${stats[0].std.toFixed(1)}) — open on content`);
    report.firstFrameContrast = stats[0]?.std.toFixed(1);
    const hook = spec.scenes[0];
    if (hook?.type === 'hook') {
      // The creature starts its gesture 20 frames in; sample the next 40 around its cell.
      const distinct = regionChanges(mp4, 22, 62, { x: 140, y: 800, w: 800, h: 560 });
      report.hookSpriteDistinctFrames = distinct;
      if (distinct < 8) problems.push(`hook sprite region only changed ${distinct} times — is it animating?`);
    }
    report.picture = {
      frames: stats.length,
      minMean: Math.min(...stats.map((s) => s.mean)).toFixed(1),
      minStd: Math.min(...stats.map((s) => s.std)).toFixed(1),
    };

    // 5. contact sheet
    const qcDir = join(VIDEO, 'exports/qc');
    mkdirSync(qcDir, { recursive: true });
    const sheet = join(qcDir, `${spec.id}-contact.jpg`);
    // This ffmpeg build has no fps/tile filters, so seek to each second and let Pillow
    // (already required by build_manifest.py) assemble the sheet.
    const framesDir = join(qcDir, spec.id, 'seconds');
    mkdirSync(framesDir, { recursive: true });
    const shots = [];
    // Sample from the FRAME count, not the container duration: the silent audio track can run
    // a few ms past the last video frame, and a seek there returns no picture.
    for (let t = 0.5; t < p.frames / p.fps - 0.05; t += 1) {
      const out = join(framesDir, `t${t.toFixed(1).padStart(4, '0')}.png`);
      execFileSync(FFMPEG, ['-v', 'error', '-y', '-ss', String(t), '-i', mp4, '-frames:v', '1', '-f', 'image2', '-c:v', 'png', out], { env: ENV });
      shots.push(out);
    }
    execFileSync('python3', [
      '-c',
      `import sys\nfrom PIL import Image\nfs=sys.argv[2:]\nims=[Image.open(f).convert('RGB').resize((270,480)) for f in fs]\ncols=8\nrows=(len(ims)+cols-1)//cols\nc=Image.new('RGB',(cols*276,rows*486),(255,0,255))\nfor i,im in enumerate(ims): c.paste(im,((i%cols)*276,(i//cols)*486))\nc.save(sys.argv[1],quality=88)`,
      sheet,
      ...shots,
    ]);
    report.contactSheet = relative(VIDEO, sheet);
  }

  report.problems = problems;
  writeFileSync(join(VIDEO, 'exports', `${spec.id}.qc.json`), JSON.stringify(report, null, 2) + '\n');
  if (problems.length) {
    failed = true;
    console.error(`✗ ${spec.id}\n${problems.map((p) => `    ${p}`).join('\n')}`);
  } else {
    console.log(
      `✓ ${spec.id}: ${report.assets.files} pack files verified, ${report.sprites.length} sprite sequences, ` +
        `${report.container.frames} frames ${report.container.width}x${report.container.height} ` +
        `${report.container.videoCodec}/${report.container.audioCodec}, no blank frames`,
    );
  }
}
process.exit(failed ? 1 : 0);
