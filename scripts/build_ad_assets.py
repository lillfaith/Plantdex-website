#!/usr/bin/env python3
"""Build an ad-usable asset pack out of the shipped Plantdex graphics.

EVERY PIECE IS ITS OWN FILE. Ad tooling (Canva, Figma, Premiere, After Effects) wants one
element per file with an alpha channel, not a sprite sheet and not a screenshot of a page —
so sheets are split into frames, frame 0 is trimmed to its ink and upscaled, and the WEBP
card art is re-encoded to PNG, which every one of those tools reads without complaint.

PIXEL ART IS UPSCALED WITH NEAREST-NEIGHBOUR, never a smooth filter. The sprites are
authored on a 34x28 grid at SCALE 5; resampling them bilinearly turns crisp pixels into mush
and is the single fastest way to make this deck look cheap in a video. Same reason the app
sets `image-rendering: pixelated`.

Nothing here is generated or invented: it copies, crops, converts and scales artwork that
already ships in `public/`. See the pack's README for what is NOT included and why.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"


def save_png(im: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG", optimize=True)


def to_delivery(src: Path, dest_stem: Path) -> Path:
    """Re-encode for ad tooling: PNG where there is alpha, JPEG where there is not.

    THE CONTAINER FOLLOWS THE CONTENT. The card fronts and the product shots are opaque
    photographs; as PNG the pack came to 80MB, most of it spent losslessly encoding
    photographic noise that the source WEBP had already quantised. JPEG at 92 is visually
    indistinguishable from that source and roughly a fifth of the size. Anything carrying an
    alpha channel — every sprite — stays PNG, because that is the only reason to want PNG.
    """
    with Image.open(src) as im:
        has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
        if has_alpha:
            dest = dest_stem.with_suffix(".png")
            save_png(im.convert("RGBA"), dest)
        else:
            dest = dest_stem.with_suffix(".jpg")
            dest.parent.mkdir(parents=True, exist_ok=True)
            im.convert("RGB").save(dest, "JPEG", quality=92, subsampling=0, optimize=True)
        return dest


def trim(im: Image.Image) -> Image.Image:
    """Crop to the ink. A 170x140 cell is mostly empty sky above a seedling."""
    box = im.getbbox()
    return im.crop(box) if box else im


def scale(im: Image.Image, factor: int) -> Image.Image:
    # NEAREST, always. See the module docstring.
    return im.resize((im.width * factor, im.height * factor), Image.Resampling.NEAREST)


def split_sheet(sheet: Path, frame_w: int, frames: int, out_dir: Path, stem: str) -> int:
    with Image.open(sheet) as im:
        im = im.convert("RGBA")
        for index in range(frames):
            cell = im.crop((index * frame_w, 0, (index + 1) * frame_w, im.height))
            save_png(cell, out_dir / f"{stem}-frame-{index:02d}.png")
    return frames


def main() -> int:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "ad-assets"
    if out.exists():
        shutil.rmtree(out)
    counts: dict[str, int] = {}

    def bump(key: str, n: int = 1) -> None:
        counts[key] = counts.get(key, 0) + n

    # ── Card artwork, WEBP -> PNG ────────────────────────────────────────────
    for folder, label, note in [
        ("cards", "01-cards/front-800", "card fronts, 800px"),
        ("cards/back", "01-cards/back-800", "card backs, 800px"),
        ("cards/thumb", "01-cards/thumb-400", "thumbnails, 400px"),
        ("cards/chip", "01-cards/chip-112", "chips, 112px"),
        ("cards/sprite", "01-cards/portrait-276", "square portraits, 276px"),
    ]:
        for src in sorted((PUBLIC / folder).glob("*.webp")):
            to_delivery(src, out / label / src.stem)
            bump(note)

    # ── Product photography ─────────────────────────────────────────────────
    for src in sorted((PUBLIC / "product").glob("*.webp")):
        to_delivery(src, out / "02-product" / src.stem)
        bump("product photographs")
    for src in sorted((PUBLIC / "product/thumb").glob("*.webp")):
        to_delivery(src, out / "02-product/thumb" / src.stem)
        bump("product photographs (thumb)")

    # ── Sprites: sheets, stills, trimmed heroes, and every single frame ─────
    manifest = json.loads((ROOT / "src/data/sprites.json").read_text())

    def do_sprite(entry: dict, stem: str) -> None:
        sheet = PUBLIC / entry["src"].lstrip("/")
        if not sheet.exists():
            return
        shutil.copy2(sheet, _ensure(out / "03-sprites/sheets" / f"{stem}.png"))
        bump("sprite sheets")
        bump("sprite frames", split_sheet(sheet, entry["frameWidth"], entry["frames"],
                                          out / "03-sprites/frames" / stem, stem))
        still = PUBLIC / entry.get("still", "").lstrip("/")
        if still.exists():
            with Image.open(still) as im:
                rgba = im.convert("RGBA")
                save_png(rgba, out / "03-sprites/still-full-cell" / f"{stem}.png")
                cut = trim(rgba)
                save_png(cut, out / "03-sprites/hero-trimmed/1x" / f"{stem}.png")
                for factor in (2, 4, 8):
                    save_png(scale(cut, factor),
                             out / f"03-sprites/hero-trimmed/{factor}x" / f"{stem}.png")
            bump("sprite hero stills (x4 scales)")

    for herb_id, entry in sorted(manifest.items()):
        do_sprite(entry, herb_id)
        for stage, stage_entry in sorted((entry.get("stages") or {}).items()):
            do_sprite(stage_entry, f"{herb_id}-{stage}")

    # ── The scan scout ──────────────────────────────────────────────────────
    scout = PUBLIC / "scan/scout.png"
    if scout.exists():
        shutil.copy2(scout, _ensure(out / "04-scout/scout-sheet.png"))
        with Image.open(scout) as im:
            rgba = im.convert("RGBA")
            frames = rgba.width // 170
            bump("scout frames", split_sheet(scout, 170, frames, out / "04-scout/frames", "scout"))
            first = trim(rgba.crop((0, 0, 170, rgba.height)))
            save_png(first, out / "04-scout/hero-trimmed/1x/scout.png")
            for factor in (2, 4, 8):
                save_png(scale(first, factor), out / f"04-scout/hero-trimmed/{factor}x/scout.png")

    print(json.dumps(counts, indent=2))
    return 0


def _ensure(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


if __name__ == "__main__":
    raise SystemExit(main())
