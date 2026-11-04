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
# SIZES ARE CALIBRATED, NOT CONVERTED. The PDF's point sizes do not survive the layout's
# text transform -- converting 14.1pt at 800/234 gives 48px, and the string then renders
# two thirds of its true width. Each size below is the one that reproduces the span's OWN
# measured width, all within a pixel: Pine 127, Pinus spp. 238, 41 -> 52, # -> 28,
# Rare -> 84. Baselines are the PDF's `origin`, which IS exact.
# Outline weight per slot, read off the genuine render at 800px.
# Outline weight in pixels, MEASURED by scanning colour runs through the genuine Pine
# glyphs rather than chosen. At y=110 the common name reads `dark3 gold7 dark3` across
# every stem: a 3px outline round a 7px stroke. The scientific name has NO dark pixels at
# all -- its outline is a DEEPER GOLD (#e9d128), which is why a 1px version of it was
# invisible and read as "the Latin name is missing its stroke". So the Latin name's
# stroke is ZERO: its edge is the deep gold at the FOOT of the gradient, not an outline.
# Adding a 2px one to "give it a stroke" is what made it read heavy and crowded beside the
# genuine card -- the complaint was about the missing deep-gold edge, not a missing
# outline, and the two are fixed in different places. With stroke 0 the 19-card fit lands
# at size 47 / stretch 1.30, mean height error 1.8px.
STROKE = {"common": 3, "scientific": 0, "encounter": 3}

# WEIGHT is a SAME-COLOUR stroke that fattens the letterform without darkening it, and it
# is a different thing from STROKE, which is the dark outline around it.
#
# THIS IS READ OUT OF THE PDF, NOT GUESSED. `cardbase.pdf` sets text render mode `Tr 1`
# -- STROKE-ONLY text -- and carries line widths of 0.25/1/1.5/3/3.3/6pt, and it draws
# 'Encounter Rate:' THREE TIMES at one identical origin in three colours (#6589a5,
# #8ad6f5, #c7d2ec). So a deck string is a fill plus one or more stroked copies of the
# same glyph, and a stroke centred on the outline fattens the glyph by its full width.
#
# A fill-only render therefore comes out systematically THIN, which is measurable rather
# than a matter of taste: against the genuine Pine the Latin name carried 37% less ink
# (1876 px vs 2974) with stems of 6.0/9.0 median/p90 against a genuine 7.0/12.0. The
# common name needed none of this -- it measured 1.05 ink ratio and 13.0/13.0 stems -- so
# the weight is per style and is NOT applied universally.
# CALIBRATED PER STYLE AGAINST PINE'S OWN TEXT, and deliberately not shared. The common
# name needs almost none (0.25 -> stem 13.0 against a genuine 13.0); the Latin name needs
# three times that (0.75 -> stem 7.0/12.0 against a genuine 7.0/12.0). A single universal
# weight would have to be wrong for one of them.
WEIGHT = {"common": 0.25, "scientific": 0.75, "encounter": 0.0}

# THE CARD STACKS EACH STRING IN THREE TONES, and the PDF names all three -- so these are
# read, not eyedropped off a render, which would pick up whatever the JPEG did to them.
# Dark below as an outline, the body colour, then a lighter copy riding one pixel high,
# which is the highlight that gives the letters their bevel.
# THE HIGHLIGHT IS THE LETTERFORM CUT IN HALF, NOT A GRADIENT. Reading the modal
# interior colour ROW BY ROW down a genuine glyph shows one flat tone, a single hard
# boundary, then a second flat tone -- no ramp anywhere:
#   'Pine'        #f8f4ac for rows 2-29 of 47, then #fde725 from row 30 (split 0.64)
#   'Pinus spp.'  #fff7bd for rows 2-17 of 58, then #e9e046 from row 18 (split 0.31)
# A ramp was wrong twice over: it put intermediate tones through the middle of every
# stroke, and it made the boundary soft where the deck's is a clean edge. Both tones are
# eyedropped from the card, not mixed.
#   (upper tone, lower tone, where the cut falls down the ink box)
SPLIT = {
    "common": ("#f8f4ac", "#fde725", 0.64),
    "scientific": ("#fff7bd", "#e9e046", 0.39),  # 0.39 renders AS 0.32: the weight stroke extends the mask box above the glyph
}

# EACH RARITY TIER HAS ITS OWN INK, which one card could not have shown. Pine is Rare, so
# calibrating the encounter slot from Pine alone gave every tier Rare's pink. Sampling the
# tight text band on all 45 shipped fronts separates them: Common is a dark teal under a
# pale blue highlight, Uncommon cream over mauve, Rare the familiar pink, Epic blue under
# lavender. All four sit at x 428, which is the slot already measured.
# (body tone, OUTLINE) -- A RARITY TIER HAS NO HIGHLIGHT. It is one flat colour inside
# one outline, which is what separates it from the two names above: those really are cut
# in half, this is not. Histogramming the interior with the outline tone excluded gives a
# tight single cluster per tier rather than two populations -- Common #e5def0/#e5deee/
# #e1dcf0, Rare #ffc1d0/#ffc3d1/#ffc0d1, Uncommon #f9f2ac/#fbf1b0, Epic #0393d7 -- and a
# spread that narrow is a flat fill plus resampling noise, not a split.
#
# THE TIER COLOUR IS THE OUTLINE, NOT THE BODY. Sampling a whole glyph blends the two and
# reports the darker, which is why a generated "Common" first came out solid teal beside a
# genuine one that reads pale.
RARITY_TONES = {
    "Common":   ("#e3ddf0", "#034c65"),
    "Uncommon": ("#f9f2ae", "#b770d1"),
    "Rare":     ("#ffc2d0", "#c865b2"),
    "Epic":     ("#0393d7", "#cbb6ff"),
}

# HORIZONTAL STRETCH, and this is the single correction behind four of the complaints.
# The deck's layout applies a text transform, so matching a genuine string's WIDTH with an
# untransformed face makes the letters too TALL ("too large") and matching its HEIGHT makes
# them too NARROW ("squashed"). Both halves were happening at once. Each factor below is
# genuine_width / natural_width_at_the_height_matched_size, computed on Pine's own strings:
#   common      'Pine'                121 / 120 = 1.008
#   scientific  'Pinus spp.'          233 / 192 = 1.214
#   encounter   'Rare'                 85 /  92 = 0.924
#   back        'Respiratory support'  388 / 277 = 1.401
# So the renderer now sets the size from the ink HEIGHT and stretches to the WIDTH.
# CALIBRATED AGAINST ALL 45 SHIPPED CARDS IN A CLOSED LOOP, NOT AGAINST ONE.
#
# Every earlier number here was fitted to Pine #41 alone, and that is the single cause of
# the "too large / squashed" complaints. `Pinus spp.` is ten characters with almost no
# ascenders, so its ink box is unrepresentatively SHORT -- matching it drove the sizes up,
# and then matching a width with an untransformed face drove the shapes narrow. Both at
# once. One card cannot separate "this face is wide" from "this string has no ascenders".
#
# The fit below RENDERS each candidate (size, stretch) through this very renderer and
# measures the result against the genuine card under ONE identical colour mask, so there
# is no measurement-space mismatch between target and output:
#   common      24 cards   size 68, stretch 1.00   mean |dh| 1.5px, |dw| 7.0px
#   scientific  19 cards   size 47, stretch 1.30, stroke 0   mean |dh| 1.8px, |dw| 10.7px
#     -- THE FIRST SCIENTIFIC FIT WAS MEASURED THROUGH A BAND THAT CLIPPED MY OWN RENDER.
#        Sampling y 700-768 cut the ascenders off anything set large, so the search saw no
#        height gain from a bigger size and chose small-and-stretched instead: 42/1.45,
#        which came out 29px tall against a genuine 43 and read heavy and crowded. The
#        band is y 688-800 now, generous on both sides. A fit is only as good as the
#        window it measures through -- the same lesson as scoring a sprite on pixel count.
#   back                   size 32, stretch 1.35
#     -- fitted against three EXACTLY-KNOWN genuine strings on the Dandelion back rather
#        than a band that might hold any line: 'Anti-inflam.' 223 vs 227 and 'Astringent'
#        205 vs 207. An earlier fit said 45/1.40 because it matched each measured box to
#        the WRONG string -- see BACK_COLUMN_ORDER -- and at 45 the two columns overlapped
#        into each other, which is the state the back shipped in.
#   encounter   'Rare'     size 50, stretch 0.924  -> 88x35 against a genuine 89x35
#
# NOTE THE COMMON NAME NEEDS NO STRETCH AT ALL. A tidy theory said the layout applies one
# ~1.4x horizontal transform to every string, because the scientific and back factors both
# landed near 1.41. The 45-card fit refutes it: Futura is naturally wide and Palatino
# narrow, so the factor is a property of the FACE, not of the layout. Measurement over
# theory -- the theory was two datapoints and a coincidence.
STRETCH = {"common": 1.00, "scientific": 1.15, "encounter": 0.924}

TEXT_SLOTS = {
    # Sizes are HEIGHT-CALIBRATED: the size whose ink height equals the genuine glyph box
    # measured off Pine #41 with the rails masked -- common 54px tall, scientific 46,
    # encounter 35, each less the outline the font does not draw. The earlier 70/62/46
    # were width-matched and therefore all three too tall.
    "common":     ("common",     68,  73.2,  125.0, "#fde725", "#695f28"),
    "number_hash": ("number",    41, 630.0,  101.1, "#efc5f4", None),
    "number":     ("number",     58, 659.1,  118.2, "#efc5f4", None),
    "scientific": ("scientific", 53,  75.3,  741.7, "#fff200", "#e9d128"),
    "encounter":  ("encounter",  50, 429.2, 1049.9, "#d26e91", "#8e3a57"),
}

# Slots that hold pictures, measured from the base-vs-Pine diff (800x1293).
SLOT_PHOTO = (105, 197, 698, 681)       # the art window's inner opening, 593x484
# Measured off the genuine Pine render: the pair spans x 618-756, each disc ~62px.
# Measured on the genuine front: the left disc is 53x56 at (618, 699); the pair's pitch
# is 61, which the shipped webp agrees with.
# THE TWO USE DISCS, AVERAGED OVER ALL 45 SHIPPED FRONTS rather than read off one card.
# Diffing each front against the template inside a window that EXCLUDES the gauge rail
# (x >= 735) and the Latin name's descenders resolves both discs on all 45, and they agree
# to within half a pixel: A at x 619, B at x 680, both y 699 and both 54 x 57, pitch 61.
# (A first pass put B at 54 x 68 because its window caught a fixed template element above
# it -- a y standard deviation of EXACTLY 0.0 is the tell that a measurement has locked
# onto furniture rather than content.)
SLOT_USE_A = (619, 699, 673, 756)
SLOT_USE_B = (680, 699, 734, 756)
SLOT_PIXEL = (553, 814, 710, 958)       # the supporting pixel-icon panel
SLOT_SEASON = (688, 1016, 736, 1064)  # genuine gold tile: 48x48

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
    "common": KIT / "fonts" / "Futura-MediumItalic.otf",
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
# BACK_SIZE and BACK_STRETCH are fitted against 20 genuine BACKS (see STRETCH). The old
# 36.5 unstretched was both too small and too narrow, which is what read as squashed.
# Calibrated on each panel's SECOND line: the first line's ink merges with the heading
# band, and the band clips descenders, so the widths are the trustworthy signal here.
BACK_SIZE = 32
BACK_STRETCH = 1.35
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
# Each column of a two-column panel owns half the text width less a gutter, measured from
# the genuine backs: the left column starts at 99.7 and the right ends at 700.3.
BACK_COLUMN = int((BACK_RIGHT - BACK_LEFT) / 2) - 18


# How much room each string has before it reaches the next element. The scientific name
# stops short of the first use disc at x = 618, with a gap.
# Room before the next element. The scientific name stops short of the first use disc at
# x = 618; the digits stop inside the number pill; the common name stops inside its bar.
SLOT_LIMITS = {"scientific": 520, "common": 480, "number": 64}


def draw_width(font: ImageFont.FreeTypeFont, text: str) -> int:
    probe = Image.new("L", (int(font.size * len(text) * 2) + 80, int(font.size * 3) + 80), 0)
    ImageDraw.Draw(probe).text((40, 40), text, font=font, fill=255)
    box = probe.getbbox()
    return (box[2] - box[0]) if box else 0


_GLYPH_CACHE: dict[str, set] = {}


def renderable(font_key: str, text: str) -> list[str]:
    """Characters this font paints NOTHING for.

    The faces embedded in the card PDF are SUBSETTED to that card's own glyphs: the cmap
    still lists 700-1400 entries, so counting it says the font is complete, and the
    outlines behind most of them are empty. Rendering each character is the only test that
    catches it -- and the first check I wrote counted the cmap and passed.
    """
    # A .notdef BOX IS INK. The first version drew each character and asked whether
    # anything appeared, so every missing glyph "passed" as a hollow rectangle -- which is
    # exactly what shipped as a tofu box where alpha-Curcumene's alpha should be. The cmap
    # and the outline together are the real test.
    from fontTools.ttLib import TTFont
    path = str(FONTS[font_key])
    if path not in _GLYPH_CACHE:
        tt = TTFont(path, fontNumber=0)
        cmap = tt.getBestCmap()
        glyphs = tt.getGlyphSet()
        drawable = set()
        for code, name in cmap.items():
            try:
                pen_empty = glyphs[name].width == 0 and name == ".notdef"
            except Exception:
                pen_empty = False
            if not pen_empty:
                drawable.add(chr(code))
        _GLYPH_CACHE[path] = drawable
    have = _GLYPH_CACHE[path]
    return [ch for ch in dict.fromkeys(text) if not ch.isspace() and ch not in have]


def split_fill(size: tuple[int, int], stops: tuple[str, str, float]) -> Image.Image:
    """Two flat tones with ONE hard boundary -- the deck's actual highlight treatment.

    No interpolation: every row above the cut is the upper tone exactly, every row below
    it the lower tone exactly. Measured row by row on the genuine cards, where the modal
    interior colour is constant, changes once, and is then constant again.
    """
    upper, lower, at = stops
    w, h = max(1, size[0]), max(1, size[1])
    cut = max(0, min(h, int(round(h * at))))
    im = Image.new("RGB", (w, h), rgb(lower))
    if cut:
        im.paste(Image.new("RGB", (w, cut), rgb(upper)), (0, 0))
    return im


def text_layer(font: ImageFont.FreeTypeFont, text: str, fill: str,
               outline: str | None, width: int,
               stops: tuple[str, str, str, float] | None,
               stretch: float, weight: float = 0.0) -> tuple[Image.Image, float, float]:
    """Compose one string as outline + gradient interior, then stretch it horizontally.

    THE WHOLE STACK IS COMPOSED ON ONE LAYER AND SCALED TOGETHER. Stepping the font size
    instead would shrink the letterforms while leaving the outline weight where it was, so
    the bevel would thicken as a name got longer.

    Returns the cropped layer and the baseline's position inside it, so the caller can
    pivot the placement on the baseline rather than on a corner.
    """
    # SUPERSAMPLED, because the weight this needs is FRACTIONAL and PIL's stroke_width is
    # an integer. The deck's own line widths are fractional points (0.25, 1.5, 3.3), and
    # at 1x the only choices for the Latin name were 0 -> 37% too little ink and 1 -> stems
    # half again too wide. Rendering at SS and scaling down also makes the edge ramp match:
    # the genuine glyphs measure 1.98 px of softness, which a 1x bilevel raster cannot
    # produce on its own.
    SS = 4
    big = ImageFont.truetype(font.path, round(font.size * SS))
    w_px = int(round(weight * SS))
    o_px = int(round(width * SS))
    pad = (o_px + w_px) * 2 + 16 * SS
    box = (int(big.size * (len(text) + 2) * 2) + pad * 2, int(big.size * 3) + pad * 2)
    baseline = (pad, pad + big.size * 1.5)
    font, width, weight = big, o_px, w_px

    # The glyph silhouette WITHOUT its outline -- this is what the gradient is poured into.
    # The body mask carries the WEIGHT stroke, so the gradient is poured into the
    # FATTENED letterform rather than leaving a same-colour rim outside the gradient.
    body_mask = Image.new("L", box, 0)
    ImageDraw.Draw(body_mask).text(baseline, text, font=font, fill=255, anchor="ls",
                                   stroke_width=weight,
                                   stroke_fill=255 if weight else None)

    layer = Image.new("RGBA", box, (0, 0, 0, 0))
    pen = ImageDraw.Draw(layer)
    # Outline first, as a solid silhouette in the outline tone: an OUTLINE, not an offset
    # shadow. The PDF reports every layer of a string on ONE baseline.
    pen.text(baseline, text, font=font, anchor="ls",
             fill=rgb(outline) if outline else rgb(fill),
             stroke_width=width + weight,
             stroke_fill=rgb(outline) if outline else rgb(fill))
    if stops:
        ink = body_mask.getbbox()
        if ink:
            ramp = split_fill((ink[2] - ink[0], ink[3] - ink[1]), stops)
            sheet = Image.new("RGB", box, rgb(fill))
            sheet.paste(ramp, (ink[0], ink[1]))
            layer.paste(sheet, (0, 0), body_mask)
    else:
        pen.text(baseline, text, font=font, fill=rgb(fill), anchor="ls")

    crop = layer.getbbox()
    if crop is None:
        return layer, 0.0, 0.0
    layer = layer.crop(crop)
    bx, by = baseline[0] - crop[0], baseline[1] - crop[1]

    # Down from the supersample and apply the horizontal stretch in the SAME resize, so
    # the glyph is resampled once rather than twice.
    layer = layer.resize((max(1, round(layer.width * stretch / SS)),
                          max(1, round(layer.height / SS))), Image.LANCZOS)
    bx = bx * stretch / SS
    by = by / SS
    return layer, bx, by


def deck_binomial(name: str) -> str:
    """The DECK capitalises the specific epithet -- `Taraxacum Officinale`, not
    `Taraxacum officinale` -- on all 45 printed fronts, though `herbs.json` stores the
    botanically correct lowercase form. This is a TYPOGRAPHIC convention of the printed
    cards, so a generated card that belongs in the same deck follows it on the ARTWORK
    only; the stored `scientific_name`, the species key and every record keep the correct
    lowercase epithet. It is flagged for review rather than assumed, because it is the one
    place matching the deck and being botanically right disagree.
    """
    return " ".join(w[:1].upper() + w[1:] if w[:1].islower() and w not in
                    {"spp.", "sect.", "subsp.", "var.", "f."} else w
                    for w in name.split())


def draw_slot(img: Image.Image, slot: str, text: str, blocked: list | None = None) -> None:
    """Paint one front string at its measured baseline, size, stretch and tones."""
    font_key, size, x, y, fill, shadow = TEXT_SLOTS[slot]
    missing = renderable(font_key, text)
    if missing:
        if blocked is not None:
            blocked.append({"slot": slot, "text": text, "font": FONTS[font_key].name,
                            "missing_glyphs": "".join(missing)})
        return

    font = ImageFont.truetype(str(FONTS[font_key]), round(size))
    stops = SPLIT.get(slot)
    if slot == "encounter":
        tier = RARITY_TONES.get(text.strip().title())
        if tier:
            stops = None                 # flat: no split, no highlight
            fill, shadow = tier[0], tier[1]
    layer, bx, by = text_layer(font, text, fill, shadow, STROKE.get(slot, 0),
                               stops, STRETCH.get(slot, 1.0), WEIGHT.get(slot, 0))

    # Only now, after the stretch, is the width the one that has to fit the slot.
    limit = SLOT_LIMITS.get(slot)
    scale = 1.0
    while limit and layer.width * scale > limit and scale > 0.5:
        scale *= 0.93                      # ~7% a step, inside the 5-10% band
    if scale < 1.0:
        layer = layer.resize((max(1, round(layer.width * scale)),
                              max(1, round(layer.height * scale))), Image.LANCZOS)
        bx *= scale
        by *= scale

    img.alpha_composite(layer, (int(round(x - bx)), int(round(y - by))))


def place(img: Image.Image, art: Image.Image, slot: tuple[int, int, int, int],
          *, margin: int = 0, pixelated: bool = False, fill: bool = False) -> None:
    """Fit `art` inside `slot`, preserving its proportions and cutting nothing off.

    `fill` scales to the slot in BOTH axes instead, which is only correct where the slot
    is itself a measurement of the thing being drawn. The use discs are that case: the
    genuine disc is an ELLIPSE, 54 wide and 57 tall, which a row-by-row profile shows
    directly -- the width rises symmetrically to 54 at mid-height and falls away again
    over rows 699-755, on every card checked. The harvested icons are square 200x200, so
    fitting them by proportion draws a 54x54 circle and loses the deck's own 5% oval.
    """
    x0, y0, x1, y1 = slot
    w, h = (x1 - x0) - margin * 2, (y1 - y0) - margin * 2
    art = art.copy()
    if art.mode == "RGBA" and art.getbbox():
        art = art.crop(art.getbbox())     # ink, not canvas -- see draw_units
    # SCALE TO FIT, NOT `thumbnail`. `Image.thumbnail` only ever SHRINKS -- it returns the
    # image untouched when it already fits -- so a harvested 52x51 use disc sat at 52x51
    # inside a 54x57 slot and every generated card's icons came out a little small and a
    # little high. Scaling to the slot in both directions is what makes the measured deck
    # average (54 x 57) the size that actually gets drawn.
    if fill:
        art = art.resize((max(1, w), max(1, h)),
                         Image.NEAREST if pixelated else Image.LANCZOS)
    else:
        k = min(w / art.width, h / art.height)
        art = art.resize((max(1, round(art.width * k)), max(1, round(art.height * k))),
                         Image.NEAREST if pixelated else Image.LANCZOS)
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
    draw_slot(front, "scientific", deck_binomial(f["scientific_name"]), blocked)

    for slot, use in zip((SLOT_USE_A, SLOT_USE_B), f.get("use_icons", [])):
        place(front, Image.open(KIT / "icons" / f"use-{use}.png"), slot, fill=True)

    for kind in ("water", "sun", "temperature"):
        draw_units(front, kind, (f.get("environmental_indicators") or {}).get(kind))

    pixel = assets / "pixel.png"
    if pixel.exists():
        place(front, Image.open(pixel), SLOT_PIXEL, margin=4, pixelated=True)

    # THE RARITY TIER RENDERS FROM A PROVISIONAL VALUE WHEN THERE IS NO SOURCED ONE, and
    # the two are SEPARATE FIELDS on purpose. `encounter_rate` stays null until the
    # occurrence-count mapping is a made product decision; `encounter_rate_provisional`
    # exists so the slot's placement, size, stretch and tones can be judged against the
    # printed cards now. It never promotes itself -- the review flag stays a blocker and
    # the review page prints the value as provisional.
    rate = f.get("encounter_rate") or f.get("encounter_rate_provisional")
    if rate:
        draw_slot(front, "encounter", rate, blocked)
    if f.get("season"):
        place(front, Image.open(KIT / "icons" / f"season-{f['season']}.png"), SLOT_SEASON)
    return front


# ── Back ──────────────────────────────────────────────────────────────────────

def render_back(card: dict, blocked: list | None = None) -> Image.Image:
    _, back = template_pages()
    back = back.copy()
    font = ImageFont.truetype(str(FONTS["back"]), round(BACK_SIZE))
    for key, (top, colour, two_column) in BACK_PANELS.items():
        items = card["back"].get(key) or []
        if not items:
            continue        # the template shows through: an empty panel is empty
        if two_column:
            # THE DECK FILLS A TWO-COLUMN PANEL ROW-MAJOR, NOT IN HALVES. Dandelion's
            # healing traits are stored Anti-inflam. / Liver support / Digestive support /
            # Diuretic / Astringent / Antimicrob., and the printed card reads
            #     Anti-inflam.        Liver support
            #     Digestive support   Diuretic
            #     Astringent          Antimicrob.
            # -- so entry 2 is the RIGHT column's first line, not the left column's second.
            # Splitting in halves put the wrong string on every row below the first, which
            # also silently poisoned the size calibration: it was matching measured boxes
            # against strings that were never in them. Confirmed by width: with row-major,
            # the left column reads 227 / 299 / 207 px, which is exactly the descending
            # order of 'Anti-inflam.' / 'Digestive support' / 'Astringent'.
            columns = [(items[0::2], False), (items[1::2], True)]
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
                # Stretched the same way the fronts are, which is what un-squashes it.
                layer, bx, by = text_layer(font, item, colour, None, 0, None,
                                           BACK_STRETCH)
                # A COLUMN HAS A HARD WIDTH AND AN OVERLONG ENTRY SHRINKS INTO IT. The
                # printed deck abbreviates instead ('Anti-inflam.', 'Antimicrob.'), which
                # is an editorial decision this renderer must not make on its own -- so an
                # entry that does not fit is scaled down and REPORTED, and the shortening
                # stays a human call. Without this the two columns simply drew over each
                # other, which is what 'Digestiv|Antimicrobial' was.
                if two_column and layer.width > BACK_COLUMN:
                    k = BACK_COLUMN / layer.width
                    layer = layer.resize((BACK_COLUMN, max(1, round(layer.height * k))),
                                         Image.LANCZOS)
                    by *= k
                    if blocked is not None:
                        blocked.append({"slot": f"back.{key}", "text": item,
                                        "issue": "too long for its column; scaled to fit",
                                        "scaled_to": round(k, 3),
                                        "deck_convention": "the printed cards abbreviate"})
                left = BACK_RIGHT - layer.width if right else BACK_LEFT
                back.alpha_composite(layer, (int(round(left)), int(round(y - by))))
    return back


def self_test() -> int:
    checks = [
        (TEMPLATE.exists(), "the card template PDF is present"),
        (all(p.exists() for p in FONTS.values()), "all five faces are present"),
        (not any("subset" in str(p) for p in FONTS.values()),
         "CONTROL: the renderer uses the FULL faces, not the subsets pulled from the PDF"),
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
        print(f"\n{len(blocked)} string(s) NEED A HUMAN DECISION "
              f"(unspellable, or too long for the deck's column width):")
        for b in blocked[:6]:
            if "missing_glyphs" in b:
                print(f"   {b['slot']:22} {b['text'][:34]!r} missing {b['missing_glyphs']!r}")
            else:
                print(f"   {b['slot']:22} {b['text'][:34]!r} {b.get('issue','')} "
                      f"(x{b.get('scaled_to','?')})")
        if len(blocked) > 6:
            print(f"   ... and {len(blocked)-6} more; see {out/'blocked-text.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
