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

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "product-source"
OUT = ROOT / "public" / "product"

# Photographs dropped in here get their background removed and keep an alpha channel.
# Everything in product-source/ itself is treated as an ordinary opaque photograph.
CUTOUT_SOURCE = SOURCE / "cutout"

# (subdirectory, width). The page names one or the other; see the module docstring.
VARIANTS: list[tuple[str, int]] = [("", 1100), ("thumb", 600)]

QUALITY = 80


def remove_background(img: Image.Image, tolerance: int = 32) -> Image.Image:
    """Knock out a plain backdrop by flooding inward from the edges.

    ─────────────────────────────────────────────────────────────────────────────
    WHY A FLOOD FILL AND NOT A COLOUR THRESHOLD, and exactly how far that gets you.

    The quick version is "make every pixel within N of the backdrop transparent", and it
    punches holes through the subject wherever the subject happens to share that colour.
    Flooding from the border instead removes only what is CONNECTED to the edge, which is
    nearer to what "background" means.

    MEASURED, because the first version of this comment claimed more than was true. A white
    highlight fully ENCLOSED by the subject survives (alpha 255) where a threshold would
    delete it — that is the real win. But a white edge that TOUCHES the backdrop does not
    survive: against an off-white sheet, the white border of a trading card is within
    tolerance of the backdrop and continuous with it, so the flood walks straight in and
    takes it. Connectivity cannot separate two regions that are genuinely the same colour
    and genuinely adjacent.

    SO: SHOOT ON A CONTRASTING BACKDROP, NOT WHITE. Mid-grey paper, or any colour the
    product does not contain. On grey the same white-bordered card cuts out perfectly
    (border alpha 255, backdrop 0). This matters for exactly the items in BONUS_ITEMS —
    a trading card has a white border, stickers usually have a white die-cut edge, and a
    holographic pouch throws white glints. Photographed on white, all three lose their
    outline; photographed on grey, none of them do.

    WHY THE RESULT IS TRANSPARENT RATHER THAN FILLED WITH THE SITE'S PURPLE. Filling is
    the obvious way to make a cut-out blend in, and it does not work on this site: the
    panels are a translucent `color-mix` over a fixed radial gradient, so a flat fill
    lands as a visibly flatter rectangle exactly where the product is. Alpha composites
    against whatever is really behind it, anywhere it is placed, and costs nothing when
    the theme changes.

    This handles a plain, evenly-lit backdrop and nothing harder. It will not cut a product
    out of a cluttered kitchen table and does not pretend to.
    ─────────────────────────────────────────────────────────────────────────────
    """
    img = img.convert("RGB")
    width, height = img.size
    px = img.load()

    # The backdrop colour is sampled from the corners rather than assumed to be white —
    # a phone photograph of white paper is rarely 255,255,255 and often has a cast.
    corners = [px[0, 0], px[width - 1, 0], px[0, height - 1], px[width - 1, height - 1]]
    base = tuple(sum(c[i] for c in corners) // len(corners) for i in range(3))

    def near(c: tuple[int, int, int]) -> bool:
        return all(abs(c[i] - base[i]) <= tolerance for i in range(3))

    # Iterative flood from every border pixel. An explicit stack, not recursion: a 1100px
    # photograph is a million pixels and Python's recursion limit is a thousand.
    mask = Image.new("L", (width, height), 255)
    mp = mask.load()
    seen = bytearray(width * height)
    stack = [(x, 0) for x in range(width)] + [(x, height - 1) for x in range(width)]
    stack += [(0, y) for y in range(height)] + [(width - 1, y) for y in range(height)]

    while stack:
        x, y = stack.pop()
        if not (0 <= x < width and 0 <= y < height):
            continue
        idx = y * width + x
        if seen[idx]:
            continue
        seen[idx] = 1
        if not near(px[x, y]):
            continue
        mp[x, y] = 0
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    # A one-pixel blur on the mask only. Without it the edge is a hard staircase against a
    # dark page, which reads as a cheap cut-out rather than an object.
    mask = mask.filter(ImageFilter.GaussianBlur(0.8))

    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def exif_tag_count(path: Path) -> int:
    """How many EXIF tags survived. Zero is the only acceptable answer."""
    with Image.open(path) as img:
        exif = img.getexif()
        return len(exif) if exif else 0


def main() -> int:
    if not SOURCE.is_dir():
        print(f"No {SOURCE.relative_to(ROOT)}/ directory — nothing to build.")
        return 1

    exts = {".webp", ".jpg", ".jpeg", ".png"}
    sources = sorted(p for p in SOURCE.iterdir() if p.is_file() and p.suffix.lower() in exts)
    cutouts = (
        sorted(p for p in CUTOUT_SOURCE.iterdir() if p.is_file() and p.suffix.lower() in exts)
        if CUTOUT_SOURCE.is_dir()
        else []
    )
    if not sources and not cutouts:
        print(f"No images in {SOURCE.relative_to(ROOT)}/.")
        return 1

    written: list[Path] = []
    for source in sources + cutouts:
        cut = source.parent == CUTOUT_SOURCE
        with Image.open(source) as raw:
            # Rotate FIRST, discard SECOND. The other order loses the orientation and leaves
            # a portrait photograph lying on its side with nothing left to say it should not.
            img = ImageOps.exif_transpose(raw)
            img = remove_background(img) if cut else img.convert("RGB")

            for subdir, width in VARIANTS:
                target_dir = OUT / subdir if subdir else OUT
                target_dir.mkdir(parents=True, exist_ok=True)
                out_path = target_dir / f"{source.stem}.webp"

                scale = min(1.0, width / img.width)
                size = (round(img.width * scale), round(img.height * scale))
                # No `exif=` argument: nothing from the original travels into the output.
                resized = img.resize(size, Image.LANCZOS)
                # A cut-out saves LOSSLESS: WebP's lossy mode mangles a hard alpha edge
                # into a halo, which on a dark page is the one artefact you cannot unsee.
                if cut:
                    resized.save(out_path, "WEBP", lossless=True, method=6)
                else:
                    resized.save(out_path, "WEBP", quality=QUALITY, method=6)
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
    print(
        f"\n{len(written)} files from {len(sources)} photographs"
        f" and {len(cutouts)} cut-outs, {total // 1024}KB total."
    )
    print("EXIF verified absent on every output.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
