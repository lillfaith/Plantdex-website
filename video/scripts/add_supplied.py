#!/usr/bin/env python3
"""Add owner-supplied photos and footage to the asset pack.

    python3 scripts/add_supplied.py <file> <name> [<file> <name> ...]

    python3 scripts/add_supplied.py IMG_9519.mov deck-fan-on-grass \\
                                    IMG_1234.jpg box-front

Photos land in `plantdex-ad-assets/08-photos/<name>.jpg` and videos in
`plantdex-ad-assets/07-footage/<name>.mp4`, then `npm run manifest` indexes them like any
other pack file, so the "only real assets" checks cover them too.

EVERYTHING IS RE-ENCODED, NEVER COPIED, and that is a privacy rule, not a format one. A
phone original carries its camera's GPS coordinates (EXIF in a photo, a QuickTime location
atom and metadata tracks in a video), and an ad asset gets uploaded to every platform the ad
runs on. The same reasoning as the app's own `prepareImage`: re-encoding is what drops the
metadata, so there is no path here that keeps the original bytes.

- photos: EXIF orientation applied, then JPEG q92 with no EXIF/XMP/ICC-borne location
- video:  rotation applied, capped at 2160 wide (never upscaled), H.264 CRF 16 yuv420p, no audio, no
          metadata (`-map_metadata -1`, video stream only)

`assets/sources.json` records the ORIGINAL file's name and SHA-256 next to the four ZIPs, so
provenance survives the re-encode.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageOps

VIDEO = Path(__file__).resolve().parent.parent
PACK = VIDEO / "assets" / "plantdex-ad-assets"
SOURCES = VIDEO / "assets" / "sources.json"
BIN = VIDEO / "node_modules/@remotion/compositor-linux-x64-gnu"
ENV = {**os.environ, "LD_LIBRARY_PATH": f"{BIN}:{os.environ.get('LD_LIBRARY_PATH', '')}"}
VIDEO_EXT = {".mov", ".mp4", ".m4v"}
PHOTO_EXT = {".jpg", ".jpeg", ".png", ".heic", ".webp"}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def add(src: Path, name: str) -> dict:
    ext = src.suffix.lower()
    if ext in VIDEO_EXT:
        dest = PACK / "07-footage" / f"{name}.mp4"
        dest.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [str(BIN / "ffmpeg"), "-v", "error", "-y", "-i", str(src),
             "-map", "0:v:0", "-map_metadata", "-1", "-an",
             # Keep up to 2160 wide: a 4K clip then survives a push-in without going soft,
             # and a 1080 clip is left at its own size (never upscaled here).
             "-vf", "scale='min(2160,iw)':-2:flags=lanczos,format=yuv420p",
             "-c:v", "libx264", "-crf", "16", "-preset", "slow",
             "-movflags", "+faststart", str(dest)],
            check=True, env=ENV,
        )
    elif ext in PHOTO_EXT:
        dest = PACK / "08-photos" / f"{name}.jpg"
        dest.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(src) as im:
            upright = ImageOps.exif_transpose(im).convert("RGB")
            # A fresh image object carries no EXIF; save without exif= and nothing is written.
            upright.save(dest, "JPEG", quality=92, subsampling=0, optimize=True)
    else:
        raise SystemExit(f"{src}: not a photo or video this script knows")
    original = src.name
    # Upload tooling prefixes a random id ("37d07a21-IMG_9519.mov"); keep the real name.
    if len(original) > 9 and original[8] == "-" and all(c in "0123456789abcdef" for c in original[:8]):
        original = original[9:]
    print(f"{original} -> {dest.relative_to(PACK)}")
    return {"zip": None, "file": original, "sha256": sha256(src), "dest": str(dest.relative_to(PACK))}


def main(argv: list[str]) -> int:
    if not argv or len(argv) % 2:
        print(__doc__)
        return 2
    sources = json.loads(SOURCES.read_text()) if SOURCES.exists() else []
    for src, name in zip(argv[::2], argv[1::2]):
        entry = add(Path(src), name)
        sources = [s for s in sources if s.get("dest") != entry["dest"]] + [entry]
    SOURCES.write_text(json.dumps(sources, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
