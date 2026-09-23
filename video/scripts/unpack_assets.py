#!/usr/bin/env python3
"""Unpack the Plantdex ad asset pack ZIPs into video/assets/.

    python3 scripts/unpack_assets.py part1.zip part2.zip part3.zip part4.zip

The pack is 79MB of images and is never committed: it is gitignored here exactly as the
repo root ignores `plantdex-ad-assets*.zip`. What IS committed is the manifest built from
it (scripts/build_manifest.py), which records each ZIP's SHA-256 so a render can prove it
came from the same files.

Every part is standalone and they share one root folder, `plantdex-ad-assets/`. A path that
two parts both carry must be byte-identical, or the unpack fails rather than letting
whichever part happened to be extracted last decide what an ad shows.
"""

from __future__ import annotations

import hashlib
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "assets"
SOURCES = DEST / "sources.json"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    DEST.mkdir(parents=True, exist_ok=True)
    seen: dict[str, tuple[str, int]] = {}
    sources = []
    for arg in argv:
        zpath = Path(arg)
        with zipfile.ZipFile(zpath) as z:
            names = [n for n in z.namelist() if not n.endswith("/")]
            for name in names:
                if not name.startswith("plantdex-ad-assets/") or ".." in Path(name).parts:
                    raise SystemExit(f"{zpath.name}: unexpected path {name!r}")
                crc = z.getinfo(name).CRC
                if name in seen and seen[name][1] != crc:
                    raise SystemExit(f"{name} differs between {seen[name][0]} and {zpath.name}")
                seen[name] = (zpath.name, crc)
            z.extractall(DEST)
        # Upload tooling prefixes a random id ("496d477f-plantdex-…"); record the real name.
        name = zpath.name
        if "-plantdex-ad-assets" in name:
            name = name[name.index("plantdex-ad-assets"):]
        sources.append({"zip": name, "sha256": sha256(zpath), "files": len(names)})
        print(f"{name}: {len(names)} files")
    sources.sort(key=lambda s: s["zip"])
    SOURCES.write_text(json.dumps(sources, indent=2) + "\n")
    print(f"{len(seen)} unique files in {DEST / 'plantdex-ad-assets'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
