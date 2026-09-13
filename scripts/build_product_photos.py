#!/usr/bin/env python3
"""
Product photographs for /shop, in the two sizes the page actually draws.

Same shape as `build_chips.py`, and for the same reason: `output: 'export'` forces
`images.unoptimized`, so `sizes` and `quality` do nothing and whichever file a component
names is the file that ships. Choosing the right variant at the call site is the only lever
there is, so the build has to produce the variants to choose between.

    display  1100px   the hero, drawn full width (390 CSS px at DPR 3 = 1170 device px)
    thumb     600px   the two-up row, drawn at about half width

Sources are ~1170px, so neither variant upscales.

─────────────────────────────────────────────────────────────────────────────
WHY THIS IS A SCRIPT AND NOT A RESIZE

**A phone writes GPS coordinates into EXIF, and these are photographs of a product taken
where its owner lives.** Publishing one unprocessed would put the coordinates of a house
into a public repository and onto a public website — and it would invert the app's own
promise, since /privacy tells players "Plantdex does not upload or store camera location
metadata" while `image-prepare.ts` refuses any photo it cannot re-encode. Stripping the
owner's metadata is the same rule as stripping a player's, and a storefront is the last
place it should lapse.

The three sources this was first run against arrived already clean — a browser had
re-encoded them to WebP on upload, which drops EXIF on the way. That is luck, not a
guarantee, and it is exactly the kind of luck that runs out the first time somebody drops a
file straight off a camera into `product-source/`. So the strip is unconditional and the
check is on the OUTPUT rather than the input:

    exif_transpose()  first, so a portrait photo is not baked in sideways;
    save() without `exif=`, so nothing carries over;
    re-open every written file and FAIL if any EXIF survived.

Verifying the output is what makes this real. Trusting the transform is how a leak ships.
`shop.test.ts` asserts the same property in CI, because a guarantee that lives only in the
script that wrote the files is a guarantee nobody re-checks.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "product-source"
OUT = ROOT / "public" / "product"

# (subdirectory, width). The page names one or the other; see the module docstring.
VARIANTS: list[tuple[str, int]] = [("", 1100), ("thumb", 600)]

QUALITY = 80


def exif_tag_count(path: Path) -> int:
    """How many EXIF tags survived. Zero is the only acceptable answer."""
    with Image.open(path) as img:
        exif = img.getexif()
        return len(exif) if exif else 0


def main() -> int:
    if not SOURCE.is_dir():
        print(f"No {SOURCE.relative_to(ROOT)}/ directory — nothing to build.")
        return 1

    sources = sorted(p for p in SOURCE.iterdir() if p.suffix.lower() in {".webp", ".jpg", ".jpeg", ".png"})
    if not sources:
        print(f"No images in {SOURCE.relative_to(ROOT)}/.")
        return 1

    written: list[Path] = []
    for source in sources:
        with Image.open(source) as raw:
            # Rotate FIRST, discard SECOND. The other order loses the orientation and leaves
            # a portrait photograph lying on its side with nothing left to say it should not.
            img = ImageOps.exif_transpose(raw).convert("RGB")

            for subdir, width in VARIANTS:
                target_dir = OUT / subdir if subdir else OUT
                target_dir.mkdir(parents=True, exist_ok=True)
                out_path = target_dir / f"{source.stem}.webp"

                scale = min(1.0, width / img.width)
                size = (round(img.width * scale), round(img.height * scale))
                # No `exif=` argument: nothing from the original travels into the output.
                img.resize(size, Image.LANCZOS).save(
                    out_path, "WEBP", quality=QUALITY, method=6
                )
                written.append(out_path)
                print(f"  {out_path.relative_to(ROOT)}  {size[0]}x{size[1]}  {out_path.stat().st_size // 1024}KB")

    # THE CHECK THAT MATTERS. Asserted against the bytes on disk, not against the intent of
    # the code above.
    leaked = [p for p in written if exif_tag_count(p) > 0]
    if leaked:
        for path in leaked:
            print(f"FAIL  {path.relative_to(ROOT)} still carries EXIF metadata")
        print("\nRefusing to leave metadata in a published image. Nothing else is written.")
        return 1

    total = sum(p.stat().st_size for p in written)
    print(f"\n{len(written)} files from {len(sources)} photographs, {total // 1024}KB total.")
    print("EXIF verified absent on every output.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
