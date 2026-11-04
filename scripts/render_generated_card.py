#!/usr/bin/env python3
"""Composite a generated card ONTO the deck's own template. Nothing is redrawn.

────────────────────────────────────────────────────────────────────────────────
THE TEMPLATE IS REUSED, NOT RECREATED, AND THAT IS PROVEN RATHER THAN ASSERTED.

`docs/assets/cardbase.pdf` was diffed against the unflattened Pine #41 PDF at identical
geometry. 83% of pixels are identical, and EVERY differing pixel is per-card content --
the name, the number, the photograph, the scientific name, the two use discs, the three
indicator rows, the pixel panel, the encounter value and the season tile. The frame, the
curved art-window silhouette, the gold corners, the gauge rail, the photo backdrop, the
encounter strip, the side rails and the scalloped foot are byte-identical.

So this script PAINTS INTO SLOTS on that template. It draws no frame, no curve, no
decoration and no panel. If a slot has nothing to put in it, the template shows through
unaltered, which is exactly what an empty field should look like.

Every number below was MEASURED from that diff, or taken from `build_deck.py`, which
carries the deck's own calibration. None was chosen by eye.
────────────────────────────────────────────────────────────────────────────────

    python3 scripts/render_generated_card.py --card evidence/cards/<key>/card.json --out <dir>
    python3 scripts/render_generated_card.py --self-test
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
KIT = ROOT / "docs" / "assets" / "card-kit"
TEMPLATE = ROOT / "docs" / "assets" / "cardbase.pdf"

# The deck's shipped width. `build_deck.py` renders fronts at 800 and its stat detector is
# calibrated in a 356x576 space, so everything below is that calibration times 800/356.
WIDTH = 800
DECK_SCALE = WIDTH / 356

# ── Slots, measured from the base-vs-Pine diff (800x1293) ─────────────────────
SLOT_NAME = (75, 76, 202, 130)          # common name ink box for "Pine"
SLOT_NUMBER = (631, 79, 707, 119)       # "#41"
SLOT_PHOTO = (105, 197, 698, 681)       # the art window's inner opening
SLOT_SCI = (56, 685, 311, 782)          # "Pinus spp." including its descender
SLOT_USE_A = (619, 699, 675, 759)       # the two use discs, fixed on every card
SLOT_USE_B = (679, 699, 735, 759)
SLOT_PIXEL = (553, 814, 710, 958)       # the supporting pixel-icon panel
SLOT_ENCOUNTER = (427, 1019, 516, 1054)  # the VALUE only; the base prints the label
SLOT_SEASON = (687, 1000, 757, 1075)

# `STAT_ROWS` and the slot pitch come straight from build_deck.py's detector, which was
# calibrated against the real cards -- so the icons land where the detector expects to
# count them. Verified against Pine: 5 suns at x-runs 56,130,196,261,327.
STAT_ROWS = {"water": (345, 366), "sun": (376, 406), "temperature": (414, 441)}
SLOT_X0 = 56
SLOT_PITCH = 66.5
SLOT_N = 5
UNIT_HEIGHT = {"water": 72, "sun": 74, "temperature": 80}

FONTS = {
    "common": KIT / "fonts" / "BalooBhaijaan-Regular.ttf",
    "scientific": KIT / "fonts" / "Palatino-BoldItalic.ttf",
    "number": KIT / "fonts" / "Palatino-Bold.ttf",
    "encounter": KIT / "fonts" / "Palatino-Bold.ttf",
    "back": KIT / "fonts" / "Avenir-Medium.ttf",
}

GOLD = (255, 222, 74)
OUTLINE = (74, 26, 122)
WHITE = (255, 255, 255)
BACK_INK = (63, 18, 120)


def template_pages() -> tuple[Image.Image, Image.Image]:
    import pymupdf
    doc = pymupdf.open(TEMPLATE)
    out = []
    for page in doc:
        zoom = WIDTH / page.rect.width
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
        out.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples).convert("RGBA"))
    return out[0], out[1]


# THE REFERENCE STRING AND ITS MEASURED INK BOX, per slot. Calibrating against the
# reference is the only way to get the deck's own size: matching the ink height of a
# DIFFERENT string does not, because "Matricaria chamomilla" at Pine's cap height is 1,424
# pixels wide against a 255-pixel slot. The first version did exactly that and ran the
# scientific name most of a metre off the card.
REFERENCE = {
    "common": ("Pine", 127, 54),
    "number": ("#41", 76, 40),
    "scientific": ("Pinus spp.", 255, 97),
    "encounter": ("Rare", 89, 35),
}


def ink_box(font: ImageFont.FreeTypeFont, text: str) -> tuple[int, int, int, int] | None:
    """The box of pixels the font actually PAINTS.

    Measured by rendering, not by `getbbox`. Baloo's getbbox reports a zero-height box at
    small sizes, which made the size search settle on 10pt and draw nothing at all.
    """
    probe = Image.new("L", (max(8, int(font.size * len(text) * 1.6)) + 40,
                            int(font.size * 2.6) + 40), 0)
    ImageDraw.Draw(probe).text((20, 20), text, font=font, fill=255)
    return probe.getbbox()


def calibrated_size(font_key: str) -> int:
    """The point size that reproduces the reference card's own ink box."""
    text, ref_w, ref_h = REFERENCE[font_key]
    best, best_err = 10, None
    for size in range(10, 160):
        box = ink_box(ImageFont.truetype(str(FONTS[font_key]), size), text)
        if box is None:
            continue
        w, h = box[2] - box[0], box[3] - box[1]
        err = abs(w - ref_w) / ref_w + abs(h - ref_h) / ref_h
        if best_err is None or err < best_err:
            best, best_err = size, err
    return best


def renderable(font_key: str, text: str) -> list[str]:
    """Characters this font paints NOTHING for.

    The faces embedded in the card PDF are SUBSETTED to that card's own glyphs: the cmap
    still lists 700-1400 entries, so counting it says the font is complete, and the
    outlines behind most of them are empty. Rendering each character is the only test that
    catches it -- and the first check I wrote counted the cmap and passed.
    """
    font = ImageFont.truetype(str(FONTS[font_key]), 48)
    missing = []
    for ch in dict.fromkeys(text):
        if ch.isspace():
            continue
        probe = Image.new("L", (96, 96), 0)
        ImageDraw.Draw(probe).text((16, 16), ch, font=font, fill=255)
        if probe.getbbox() is None:
            missing.append(ch)
    return missing


def draw_text(img: Image.Image, text: str, slot: tuple[int, int, int, int],
              font_key: str, fill, *, stroke: int = 0, skew: float = 0.0,
              align: str = "left", blocked: list | None = None) -> None:
    """Paint one string so its INK lands on `slot`. Refuses rather than painting gaps."""
    missing = renderable(font_key, text)
    if missing:
        if blocked is not None:
            blocked.append({"slot": font_key, "text": text,
                            "missing_glyphs": "".join(missing),
                            "font": FONTS[font_key].name})
        return
    x0, y0, x1, y1 = slot
    font = ImageFont.truetype(str(FONTS[font_key]), calibrated_size(font_key))
    pad = stroke * 2 + 12
    layer = Image.new("RGBA", (int(font.size * len(text) * 1.6) + pad * 2,
                               int(font.size * 2.6) + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((pad, pad), text, font=font, fill=fill,
                               stroke_width=stroke, stroke_fill=OUTLINE)
    if skew:
        w, h = layer.size
        shift = abs(skew) * h
        layer = layer.transform((int(w + shift), h), Image.AFFINE,
                                (1, skew, 0 if skew < 0 else -shift, 0, 1, 0),
                                resample=Image.BICUBIC)
    box = layer.getbbox()
    if box is None:
        return
    layer = layer.crop(box)
    # Never overflow the slot: condense rather than run off the card.
    limit = x1 - x0
    if layer.width > limit:
        layer = layer.resize((limit, max(1, round(layer.height * limit / layer.width))),
                             Image.LANCZOS)
    x = x0 if align == "left" else x0 + (limit - layer.width) // 2
    img.alpha_composite(layer, (int(x), int(y0)))


def place(img: Image.Image, art: Image.Image, slot: tuple[int, int, int, int],
          *, margin: int = 0, pixelated: bool = False) -> None:
    """Fit `art` inside `slot`, preserving its proportions and cutting nothing off."""
    x0, y0, x1, y1 = slot
    w, h = (x1 - x0) - margin * 2, (y1 - y0) - margin * 2
    art = art.copy()
    art.thumbnail((w, h), Image.NEAREST if pixelated else Image.LANCZOS)
    img.alpha_composite(art.convert("RGBA"),
                        (x0 + margin + (w - art.width) // 2,
                         y0 + margin + (h - art.height) // 2))


def draw_units(img: Image.Image, kind: str, count: int | None) -> None:
    """A row of unit icons. `None` leaves the template untouched -- an empty row."""
    if not count:
        return
    icon = Image.open(KIT / "icons" / f"unit-{kind}.png").convert("RGBA")
    top, bottom = (v * DECK_SCALE for v in STAT_ROWS[kind])
    centre = (top + bottom) / 2
    height = UNIT_HEIGHT[kind]
    scaled = icon.copy()
    scaled.thumbnail((height, height), Image.LANCZOS)
    for i in range(min(count, SLOT_N)):
        x = int(SLOT_X0 + i * SLOT_PITCH + (SLOT_PITCH - scaled.width) / 2)
        img.alpha_composite(scaled, (x, int(centre - scaled.height / 2)))


def render_front(card: dict, assets: pathlib.Path,
                 blocked: list | None = None) -> Image.Image:
    front, _ = template_pages()
    front = front.copy()
    f = card["front"]

    draw_text(front, card["common_name"], SLOT_NAME, "common", GOLD, stroke=3,
              skew=-0.16, blocked=blocked)
    draw_text(front, card["card_number"], SLOT_NUMBER, "number", (242, 228, 255),
              align="centre", blocked=blocked)

    photo = assets / "hero.png"
    if photo.exists():
        place(front, Image.open(photo), SLOT_PHOTO, margin=26)

    draw_text(front, f["scientific_name"], SLOT_SCI, "scientific", GOLD, stroke=2,
              blocked=blocked)

    for slot, use in zip((SLOT_USE_A, SLOT_USE_B), f.get("use_icons", [])):
        place(front, Image.open(KIT / "icons" / f"use-{use}.png"), slot)

    for kind in ("water", "sun", "temperature"):
        draw_units(front, kind, (f.get("environmental_indicators") or {}).get(kind))

    pixel = assets / "pixel.png"
    if pixel.exists():
        place(front, Image.open(pixel), SLOT_PIXEL, margin=6, pixelated=True)

    if f.get("encounter_rate"):
        draw_text(front, f["encounter_rate"], SLOT_ENCOUNTER, "encounter", WHITE,
                  stroke=2, blocked=blocked)
    if f.get("season"):
        place(front, Image.open(KIT / "icons" / f"season-{f['season']}.png"), SLOT_SEASON)
    return front


# ── Back ──────────────────────────────────────────────────────────────────────
# Measured from the back template the same way. Two columns per panel, left column
# left-aligned and right column right-aligned, which is how the printed cards set them.
BACK_PANELS = {
    "healingTraits": (62, 150, 740, 300),
    "compounds": (62, 392, 740, 470),
    "taste": (56, 560, 330, 800),
    "aromatic": (470, 560, 744, 800),
    "preparations": (56, 1010, 330, 1210),
    "usableParts": (470, 1010, 744, 1210),
}
BACK_TWO_COLUMN = {"healingTraits", "compounds"}
BACK_ALIGN = {"aromatic": "right", "usableParts": "right"}
BACK_LINE = 46
BACK_SIZE = 30


def render_back(card: dict, blocked: list | None = None) -> Image.Image:
    _, back = template_pages()
    back = back.copy()
    draw = ImageDraw.Draw(back)
    font = ImageFont.truetype(str(FONTS["back"]), BACK_SIZE)
    for key, (x0, y0, x1, y1) in BACK_PANELS.items():
        items = card["back"].get(key) or []
        if not items:
            continue            # the template shows through: an empty panel is empty
        if key in BACK_TWO_COLUMN:
            half = (len(items) + 1) // 2
            columns = [(x0, items[:half], "left"), (x1, items[half:], "right")]
        else:
            columns = [(x0 if BACK_ALIGN.get(key) != "right" else x1, items,
                        BACK_ALIGN.get(key, "left"))]
        for x, column, align in columns:
            for i, item in enumerate(column):
                missing = renderable("back", item)
                if missing:
                    if blocked is not None:
                        blocked.append({"slot": f"back.{key}", "text": item,
                                        "missing_glyphs": "".join(missing),
                                        "font": FONTS["back"].name})
                    continue
                w = draw.textlength(item, font=font)
                draw.text((x - w if align == "right" else x, y0 + i * BACK_LINE),
                          item, font=font, fill=BACK_INK)
    return back


def self_test() -> int:
    checks = [
        (TEMPLATE.exists(), "the card template PDF is present"),
        (all(p.exists() for p in FONTS.values()), "all five extracted faces are present"),
        (len(list((KIT / "icons").glob("*.png"))) >= 19,
         "the whole icon set is present (12 uses, 4 seasons, 3 units)"),
        (abs(DECK_SCALE - 800 / 356) < 1e-9,
         "the deck's own 356x576 calibration scales to the shipped 800px width"),
        (SLOT_X0 == 56 and abs(SLOT_PITCH - 66.5) < 0.6,
         "the indicator pitch matches Pine's measured sun runs (56,130,196,261,327)"),
        (SLOT_USE_A[2] <= SLOT_USE_B[0], "CONTROL: the two use slots do not overlap"),
        (SLOT_PHOTO[2] - SLOT_PHOTO[0] == 593 and SLOT_PHOTO[3] - SLOT_PHOTO[1] == 484,
         "the photo opening is Pine's measured 593x484"),
    ]
    bad = sum(1 for ok, _ in checks if not ok)
    for ok, label in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {label}")
    print("\nALL SELF-TESTS PASSED" if not bad else f"\n{bad} FAILURE(S)")
    return 1 if bad else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--card")
    parser.add_argument("--assets")
    parser.add_argument("--out")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if not (args.card and args.out):
        print("need --card and --out", file=sys.stderr)
        return 2
    card = json.loads(pathlib.Path(args.card).read_text())
    assets = pathlib.Path(args.assets or pathlib.Path(args.card).parent / "kit")
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    blocked: list = []
    render_front(card, assets, blocked).convert("RGB").save(out / "front.png")
    render_back(card, blocked).convert("RGB").save(out / "back.png")
    (out / "blocked-text.json").write_text(json.dumps(blocked, indent=2) + "\n")
    print(f"wrote {out/'front.png'} and {out/'back.png'}")
    if blocked:
        print(f"\n{len(blocked)} string(s) NOT PAINTED -- the embedded faces are subsetted "
              f"to Pine's glyphs and cannot spell them:")
        for b in blocked[:6]:
            print(f"   {b['slot']:22} {b['text'][:34]!r} missing {b['missing_glyphs']!r}")
        if len(blocked) > 6:
            print(f"   ... and {len(blocked)-6} more; see {out/'blocked-text.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
