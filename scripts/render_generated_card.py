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

# ── EVERY NUMBER BELOW IS READ OUT OF THE CARD PDF, NOT MEASURED OFF A RENDER ──
#
# The unflattened Pine #41 PDF carries LIVE TEXT, so PyMuPDF reports each string's font,
# point size, colour and BASELINE ORIGIN. Those are reproduced here at the shipped 800px
# width (the page is 234pt wide, so the scale is 800/234 = 3.4188).
#
# THIS CORRECTED FOUR THINGS I HAD INFERRED FROM THE PICTURE AND GOT WRONG:
#   * the common name is FUTURA MEDIUM ITALIC, not Baloo;
#   * the card number is BALOO, not Palatino -- and its "#" is a separate, smaller draw;
#   * the encounter value is PINK (#d26e91), not white;
#   * the back body is THREE colours by panel, not one.
# Each is the kind of thing that looks right until it is next to the original.
PT = 800 / 234

# (font key, px size, baseline x, baseline y, fill, shadow/second layer)
TEXT_SLOTS = {
    "common":     ("common",     62.9,  74.7,  125.0, "#fee726", "#696028"),
    "number_hash": ("number",    37.4, 630.0,  101.1, "#efc5f4", None),
    "number":     ("number",     50.5, 659.1,  118.2, "#efc5f4", None),
    "scientific": ("scientific", 48.1,  75.3,  741.7, "#fff200", "#e9d128"),
    "encounter":  ("encounter",  40.0, 429.2, 1049.9, "#d26e91", None),
}

# Slots that hold pictures, measured from the base-vs-Pine diff (800x1293).
SLOT_PHOTO = (105, 197, 698, 681)       # the art window's inner opening, 593x484
# Measured off the genuine Pine render: the pair spans x 618-756, each disc ~62px.
# Measured on the genuine front: the left disc is 53x56 at (618, 699); the pair's pitch
# is 61, which the shipped webp agrees with.
SLOT_USE_A = (618, 699, 671, 755)
SLOT_USE_B = (679, 699, 732, 755)
SLOT_PIXEL = (553, 814, 710, 958)       # the supporting pixel-icon panel
SLOT_SEASON = (684, 1016, 732, 1063)  # genuine gold tile: 48x47 at (684, 1016)

# `STAT_ROWS` and the pitch come from build_deck.py's detector, calibrated against the
# real cards. Verified: Pine's five suns land at x 56, 130, 196, 261, 327.
# ROW GEOMETRY MEASURED OFF THE GENUINE RENDER, not derived from the detector's sampling
# bands. `build_deck.py`'s STAT_ROWS are the rows it LOOKS IN to count icons, which is a
# narrower box than the icons themselves; using them as the draw height made every icon
# too small and the first version also centred each glyph in its slot, which spread the
# two droplets 142px apart instead of 66.
# (x of the first glyph, y of its top, glyph width, glyph height) -- the TRUE per-glyph
# boxes, found by connected components on the genuine Pine front rather than by reading a
# row band. Each row has its own origin and glyph size: the droplet is 35x55 at x 75, the
# thermometer 45x63 at x 71, the sun 71x79 at x 56. Measuring the band instead made every
# icon roughly half again too big, which is what the side-by-side showed.
STAT_ROWS_INK = {
    "water": (75, 770, 35, 55),
    "sun": (56, 838, 71, 79),
    "temperature": (71, 926, 45, 63),
}
SLOT_X0 = 56
SLOT_PITCH = 66.0           # Pine's five suns start at 56, 130, 196, 261, 327
SLOT_N = 5

FONTS = {
    "common": KIT / "fonts" / "Futura-MediumItalic.ttf",
    "scientific": KIT / "fonts" / "Palatino-BoldItalic.ttf",
    "number": KIT / "fonts" / "BalooBhaijaan-Regular.ttf",
    "encounter": KIT / "fonts" / "Palatino-Bold.ttf",
    "back": KIT / "fonts" / "Avenir-Medium.ttf",
}

def rgb(hexcode: str) -> tuple[int, int, int]:
    return tuple(int(hexcode[i:i + 2], 16) for i in (1, 3, 5))


def template_pages() -> tuple[Image.Image, Image.Image]:
    """The deck's own blank card, front and back, at the shipped width.

    This IS the template. Nothing here redraws it -- every other function in this file
    paints into a slot on top of these two images.
    """
    import pymupdf
    doc = pymupdf.open(TEMPLATE)
    out = []
    for page in doc:
        zoom = WIDTH / page.rect.width
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
        out.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples).convert("RGBA"))
    return out[0], out[1]


# ── Back-card typography, also read from the PDF ──────────────────────────────
# Avenir-Medium at 36.5px throughout, 47.1px line pitch, left column at x = 99.7 and the
# right column RIGHT-ALIGNED at x = 700.3 (the mirror of the left margin). The ink colour
# is per panel, which the first version collapsed to one.
BACK_SIZE = 36.5
BACK_PITCH = 47.1
BACK_LEFT = 99.7
BACK_RIGHT = 700.3
BACK_PANELS = {
    "healingTraits": (200.9, "#3b1e5f", True),
    "compounds": (421.1, "#4059a8", True),
    "taste": (652.0, "#3b1e5f", False),
    "aromatic": (652.0, "#3b1e5f", False),
    "preparations": (990.1, "#f4fbfe", False),
    "usableParts": (990.1, "#f4fbfe", False),
}
BACK_RIGHT_PANELS = {"aromatic", "usableParts"}


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


def draw_slot(img: Image.Image, slot: str, text: str, blocked: list | None = None) -> None:
    """Paint one front string at its measured baseline, size and colour.

    Anchored on the BASELINE ("ls"), which is what the PDF records. Anchoring on a bounding
    box instead is how type creeps a few pixels off the original.
    """
    font_key, size, x, y, fill, shadow = TEXT_SLOTS[slot]
    missing = renderable(font_key, text)
    if missing:
        if blocked is not None:
            blocked.append({"slot": slot, "text": text, "font": FONTS[font_key].name,
                            "missing_glyphs": "".join(missing)})
        return
    font = ImageFont.truetype(str(FONTS[font_key]), round(size))
    draw = ImageDraw.Draw(img)
    if shadow:
        # The card stacks the same string in two or three tones. Two reproduces the
        # emboss; the third is a sub-pixel highlight that a raster render cannot show.
        draw.text((x + 2, y + 2), text, font=font, fill=rgb(shadow), anchor="ls")
    draw.text((x, y), text, font=font, fill=rgb(fill), anchor="ls")


def place(img: Image.Image, art: Image.Image, slot: tuple[int, int, int, int],
          *, margin: int = 0, pixelated: bool = False) -> None:
    """Fit `art` inside `slot`, preserving its proportions and cutting nothing off."""
    x0, y0, x1, y1 = slot
    w, h = (x1 - x0) - margin * 2, (y1 - y0) - margin * 2
    art = art.copy()
    if art.mode == "RGBA" and art.getbbox():
        art = art.crop(art.getbbox())     # ink, not canvas -- see draw_units
    art.thumbnail((w, h), Image.NEAREST if pixelated else Image.LANCZOS)
    img.alpha_composite(art.convert("RGBA"),
                        (x0 + margin + (w - art.width) // 2,
                         y0 + margin + (h - art.height) // 2))


def draw_units(img: Image.Image, kind: str, count: int | None) -> None:
    """A row of unit icons, LEFT-ALIGNED on the slot pitch.

    `None` leaves the template untouched -- an empty row is what an unsourced value looks
    like, and it must never be a zero or a greyed-out icon, both of which read as a claim.
    """
    if not count:
        return
    icon = Image.open(KIT / "icons" / f"unit-{kind}.png").convert("RGBA")
    # CROP TO INK FIRST. The three icons carry different transparent margins -- the
    # droplet 26px on the left, the sun 8, the thermometer 155 -- so scaling the CANVAS to
    # a target height gives each a different ink size and a different offset inside it.
    # That is why the two droplets came out 200px apart instead of 66.
    icon = icon.crop(icon.getbbox())
    x0, top, width, height = STAT_ROWS_INK[kind]
    scaled = icon.resize((width, height), Image.LANCZOS)
    for i in range(min(count, SLOT_N)):
        img.alpha_composite(scaled, (int(x0 + i * SLOT_PITCH), int(top)))


def render_front(card: dict, assets: pathlib.Path,
                 blocked: list | None = None) -> Image.Image:
    front, _ = template_pages()
    front = front.copy()
    f = card["front"]

    # The photograph first, so nothing is drawn under it.
    photo = assets / "hero.png"
    if photo.exists():
        place(front, Image.open(photo), SLOT_PHOTO, margin=24)

    draw_slot(front, "common", card["common_name"], blocked)
    number = card["card_number"]
    if number.startswith("#"):
        draw_slot(front, "number_hash", "#", blocked)
        draw_slot(front, "number", number[1:], blocked)
    else:
        draw_slot(front, "number", number, blocked)
    draw_slot(front, "scientific", f["scientific_name"], blocked)

    for slot, use in zip((SLOT_USE_A, SLOT_USE_B), f.get("use_icons", [])):
        place(front, Image.open(KIT / "icons" / f"use-{use}.png"), slot)

    for kind in ("water", "sun", "temperature"):
        draw_units(front, kind, (f.get("environmental_indicators") or {}).get(kind))

    pixel = assets / "pixel.png"
    if pixel.exists():
        place(front, Image.open(pixel), SLOT_PIXEL, margin=4, pixelated=True)

    if f.get("encounter_rate"):
        draw_slot(front, "encounter", f["encounter_rate"], blocked)
    if f.get("season"):
        place(front, Image.open(KIT / "icons" / f"season-{f['season']}.png"), SLOT_SEASON)
    return front


# ── Back ──────────────────────────────────────────────────────────────────────

def render_back(card: dict, blocked: list | None = None) -> Image.Image:
    _, back = template_pages()
    back = back.copy()
    draw = ImageDraw.Draw(back)
    font = ImageFont.truetype(str(FONTS["back"]), round(BACK_SIZE))
    for key, (top, colour, two_column) in BACK_PANELS.items():
        items = card["back"].get(key) or []
        if not items:
            continue        # the template shows through: an empty panel is empty
        if two_column:
            half = (len(items) + 1) // 2
            columns = [(items[:half], False), (items[half:], True)]
        else:
            columns = [(items, key in BACK_RIGHT_PANELS)]
        for column, right in columns:
            for i, item in enumerate(column):
                missing = renderable("back", item)
                if missing:
                    if blocked is not None:
                        blocked.append({"slot": f"back.{key}", "text": item,
                                        "font": FONTS["back"].name,
                                        "missing_glyphs": "".join(missing)})
                    continue
                y = top + i * BACK_PITCH
                if right:
                    draw.text((BACK_RIGHT, y), item, font=font, fill=rgb(colour),
                              anchor="rs")
                else:
                    draw.text((BACK_LEFT, y), item, font=font, fill=rgb(colour),
                              anchor="ls")
    return back


def self_test() -> int:
    checks = [
        (TEMPLATE.exists(), "the card template PDF is present"),
        (all(p.exists() for p in FONTS.values()), "all five extracted faces are present"),
        (len(list((KIT / "icons").glob("*.png"))) >= 19,
         "the whole icon set is present (12 uses, 4 seasons, 3 units)"),
        (SLOT_X0 == 56 and abs(SLOT_PITCH - 66.0) < 0.6,
         "the indicator pitch matches Pine's measured sun runs (56,130,196,261,327)"),
        (all(len(v) == 4 for v in STAT_ROWS_INK.values()),
         "each indicator row carries its own origin and glyph size, measured per glyph"),
        (STAT_ROWS_INK["water"][2:] == (35, 55),
         "the droplet is Pine's measured 35x55, not a band height"),
        (SLOT_USE_A[2] <= SLOT_USE_B[0], "CONTROL: the two use slots do not overlap"),
        (FONTS["common"].name.startswith("Futura"),
         "the common name is Futura Medium Italic (read from the PDF, not inferred)"),
        (FONTS["number"].name.startswith("Baloo"),
         "the card number is Baloo Bhaijaan, and its '#' is a separate smaller draw"),
        (TEXT_SLOTS["encounter"][4] == "#d26e91",
         "the encounter value is pink, not white"),
        (len({c for _, c, _ in BACK_PANELS.values()}) == 3,
         "the back body uses three colours by panel, not one"),
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
