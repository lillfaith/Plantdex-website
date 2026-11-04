#!/usr/bin/env python3
"""Three sprite-generation methods, one species, same checks. For INSPECTION, not shipping.

REQUIREMENT 4. The question is which of three ways to draw a generated card's creature is
worth committing to, and it cannot be settled by argument: the coneflower in this deck took
six rounds of tuning before anybody noticed the COMPOSITION was wrong rather than the
numbers. So all three are built, rendered, and put through the same geometric audit the
existing 162 sheets pass, and the result is looked at.

  A  procedural-archetype   Parameters only. Composition from `growth_form`, colours and
                            proportions seeded from the species key. Nothing about this
                            species is authored. This is the method that scales to 2,000.
  B  ai-authored            A species-specific module in the same shape as the 54 hand-
                            authored ones: real anatomy, a trademark gesture, authored
                            poses. Written by a model rather than by a person -- which is
                            what "AI-assisted pixel art" means here. NO IMAGE API IS
                            CALLED: an image model cannot satisfy `audit_sprites.py`,
                            which is a geometric contract (every feature pixel on a face,
                            frame 0 one connected piece), not a style preference.
  C  hybrid                 A's skeleton -- canvas, stem, leaves, stage ladder, motion
                            scaffold -- with exactly ONE authored organ: the thing that
                            identifies the species.

────────────────────────────────────────────────────────────────────────────────
WHAT THIS SCRIPT WRITES, AND WHAT IT REFUSES TO TOUCH.

It writes PNGs and a report into an output directory you name. It does NOT write
`src/data/sprites.json`, does NOT write `public/cards/animated/`, and does NOT add
anything to `scripts/sprite_sources/`. The 54 existing sheets are not read for mutation
and not re-rendered. `audit_sprites.py` REWRITES every sheet it audits, which is why this
has its own renderer rather than calling it.
────────────────────────────────────────────────────────────────────────────────

    python3 scripts/sprite_candidates.py --out /tmp/candidates
    python3 scripts/sprite_candidates.py --preview B --frame 0
"""

from __future__ import annotations

import argparse
import json
import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "sprite_sources"))

from _face import EYES, FACE_PALETTE, face_box, feature_parts  # noqa: E402
from _flowerhead import flower_head  # noqa: E402

import audit_sprites as auditor  # noqa: E402
from build_sprites import render_frame  # noqa: E402

# ── WHERE THE FEATURES SIT, AND WHY THE SECOND NUMBER IS DERIVED ───────────────
#
# `feature_parts` draws the eyes as TWO rows at `eye_dy` and `eye_dy + 1`, and seats the
# blush at `mouth_dy - 1`. So `mouth_dy = 4` puts the blush on the eyes' own second row,
# and it is then drawn straight through both pupils -- which the audit reports as the
# CHEEKS being off-face in every frame, naming the one part that is seated correctly.
#
# Measured, not reasoned: with eye_dy = 2 the cheeks landed at (13,9) and (18,9), and the
# eyes occupy y = 8 and y = 9 at x = 13..18. Exactly on top.
#
# The clearance is structural rather than a per-species choice, so it is DERIVED: the
# blush needs the first row below the eyes, which is `eye_dy + 2`, so `mouth_dy` is
# `eye_dy + 3`. Any organ carrying a face therefore needs `eye_dy + 5` rows of face, which
# is the seven-row floor the existing deck already records reaching for.
EYE_DY = 2
MOUTH_DY = EYE_DY + 3
MIN_FACE_ROWS = EYE_DY + 5

SIZE = (32, 28)          # The canvas every existing sprite uses. Not negotiable.
SCALE = 5                # build_sprites.py ships at 5x; matched so a preview is comparable.
FRAME_GUTTER = 2


# ── The seeded RNG, matching src/lib/rng.ts's contract: same key, same plant ────

def _hash(key: str) -> int:
    h = 2166136261
    for ch in key:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


class Seeded:
    """Deterministic, no clock, no Math.random -- the rule `seed-packet.test.ts` enforces."""

    def __init__(self, key: str) -> None:
        self.state = _hash(key) or 1

    def next(self) -> float:
        self.state = (self.state * 1103515245 + 12345) & 0x7FFFFFFF
        return self.state / 0x7FFFFFFF

    def between(self, low: float, high: float) -> float:
        return low + (high - low) * self.next()

    def pick(self, options: list):
        return options[int(self.next() * len(options)) % len(options)]


def hsl_to_rgba(h: float, s: float, light: float) -> tuple[int, int, int, int]:
    c = (1 - abs(2 * light - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = light - c / 2
    r, g, b = {
        0: (c, x, 0), 1: (x, c, 0), 2: (0, c, x),
        3: (0, x, c), 4: (x, 0, c), 5: (c, 0, x),
    }[int(h // 60) % 6]
    return (round((r + m) * 255), round((g + m) * 255), round((b + m) * 255), 255)


def leaf_ramp(hue: float, sat: float) -> dict[str, tuple[int, int, int, int]]:
    """Four shades of one leaf colour.

    Midtone saturation is CAPPED, which is a rule the existing palette work established:
    a pastel highlight at 0.85 is pleasant and the same number at half lightness is a neon
    sign.
    """
    sat = min(sat, 0.66)
    return {
        "H": hsl_to_rgba(hue, min(sat + 0.14, 0.78), 0.57),
        "M": hsl_to_rgba(hue, sat, 0.43),
        "D": hsl_to_rgba(hue, sat, 0.30),
        "S": hsl_to_rgba(hue - 6, sat * 0.9, 0.25),
    }


# ── A BLUSH IS DROPPED BY MEASUREMENT, NEVER BY TASTE ──────────────────────────
#
# `feature_parts` seats the blush at `mouth_dy - 1`, which on a face only as wide as the
# eye art puts both dots straight THROUGH the eyes -- and the audit reports it as the
# CHEEKS being off-face in every frame, which is the right failure with a misleading
# subject. The existing deck records the same trap from the other direction ("a mouth at 3
# draws it through the eyes").
#
# A procedural generator meets this on whichever species the seeded parameters happen to
# make narrow, so it cannot be a thing an author remembers. The blush is therefore kept
# only when the face is measurably wider than the eye art it would sit beside, and
# dropped silently otherwise: a creature without a blush is fine, and a creature with two
# pink pixels in its pupils is not.
def _seat(origin: tuple[int, int], rows: list[str], **kwargs) -> list[dict]:
    _, _, face_w, face_h = face_box(rows)
    eye_w = max(len(r) for r in EYES["round"]["rows"])
    return feature_parts(
        origin, rows,
        eyes=kwargs.pop("eyes", "round"),
        mouth=kwargs.pop("mouth", "small"),
        eye_dy=kwargs.pop("eye_dy", EYE_DY),
        mouth_dy=kwargs.pop("mouth_dy", MOUTH_DY),
        cheeks=face_w >= eye_w + 2 and face_h >= MIN_FACE_ROWS,
        **kwargs,
    )


# ── Method A: procedural archetype ─────────────────────────────────────────────

ARCHETYPES = {
    # One entry per `catalog_species.growth_form`. Only the one this species needs is
    # filled in; the rest are declared so the gap is visible rather than implied.
    "erect-herb": {"head": (17, 13), "head_at": (7, 2), "leaf_row": 18},
    "rosette": None, "vine": None, "shrub": None, "tree": None,
    "grass": None, "fern": None, "succulent": None, "aquatic": None,
}

# The canvas column every archetype's stem runs down. A single constant because a leaf
# that has to FIND the stem is a leaf that will one day miss it.
STEM_X = 16

# ── EVERY LEAF CARRIES ITS OWN PETIOLE, AND THAT IS WHY. ───────────────────────
#
# The first archetype drew a blade beside the stem and the audit reported THREE
# DISCONNECTED PIECES in frame 0: one plant of 116px and two leaves of 14px each, floating
# free. It is invisible while authoring, because parts are a list and the gap only exists
# in the render -- which is exactly what this repository already records happening to
# twenty-five of the hand-drawn sprites.
#
# A procedural generator cannot be trusted to notice. So the petiole is part of the leaf's
# definition rather than something the placement is expected to achieve: the blade's inner
# edge IS the attachment point, and the origin is computed from `STEM_X` so it lands on the
# stem by construction.
LEAF_LEFT = ["  HMMH ",
             " HMDDMH",
             "  MDDMM"]
LEAF_RIGHT = [" HMMH  ",
              "HMDDMH ",
              "MMDDM  "]


def method_a(species_key: str, growth_form: str) -> dict:
    spec = ARCHETYPES.get(growth_form)
    if spec is None:
        raise SystemExit(
            f"growth_form {growth_form!r} has no archetype yet. Nine are declared and one "
            "is written; the others are deliberately empty rather than silently reusing "
            "erect-herb, which would draw the wrong plant."
        )
    rng = Seeded(species_key)
    # Hue spread over the deck's own yellow-green..blue-green band, plus a flower hue held
    # at least 34 degrees off the leaf -- the separation rule the existing set needed.
    leaf_hue = rng.between(74, 152)
    flower_hue = leaf_hue + rng.pick([44, -48, 58, -62])
    palette = {
        **FACE_PALETTE,
        **leaf_ramp(leaf_hue, rng.between(0.46, 0.62)),
        "P": hsl_to_rgba(flower_hue % 360, 0.60, 0.68),
        "p": hsl_to_rgba(flower_hue % 360, 0.58, 0.50),
    }

    hw, hh = spec["head"]
    lobes = int(rng.between(7, 13))
    head = flower_head(hw, hh, hw / 2, hh / 2 + 0.3, hw / 2 - 1.4, hh / 2 - 1.2,
                       lobes, rng.between(0.09, 0.15), 5.0, 4.5, face_dy=1.0,
                       trim_tail=False, chars="HMDSFo")
    head_at = spec["head_at"]
    head_bottom = head_at[1] + len(head)
    leaf_row = spec["leaf_row"]

    # The stem spans from INSIDE the head's last row to the foot of the lowest leaf, so
    # there is no gap to fall through at either end. Computed, never typed.
    stem_top = head_bottom - 1
    stem_rows = ["  M  "] * 2 + ["  D  "] * max(1, (leaf_row + 3) - stem_top - 2)
    parts = [
        {"name": "stem", "origin": (STEM_X - 2, stem_top), "rows": stem_rows},
        {"name": "leafLeft", "origin": (STEM_X - 6, leaf_row), "rows": LEAF_LEFT},
        {"name": "leafRight", "origin": (STEM_X, leaf_row), "rows": LEAF_RIGHT},
        {"name": "head", "origin": head_at, "rows": head},
        *_seat(head_at, head),
    ]
    breathe = [0, -1, 0, 0]
    return {
        "herbId": f"{species_key.replace(' ', '-')}-A",
        "personality": "generic",
        "method": "procedural-archetype",
        "size": SIZE, "frames": 4, "fps": 5,
        "parts": parts,
        "motion": {
            "head": {"dy": breathe},
            "eyes": {"dy": breathe, "art": [None, None, "blink", None]},
            "cheeks": {"dy": breathe},
            "mouth": {"dy": breathe},
        },
        "palette": palette,
        "recipe": {
            "method": "procedural-archetype", "growth_form": growth_form,
            "seed": species_key, "leaf_hue": round(leaf_hue, 2),
            "flower_hue": round(flower_hue % 360, 2), "lobes": lobes,
        },
    }


# ── Method B: AI-authored, species-specific ────────────────────────────────────
#
# German Chamomile. THE DESIGN HOOK IS ITS OWN DIAGNOSTIC FEATURE: the receptacle is a
# hollow CONE standing proud of the ray florets, and as the head ages the white rays
# REFLEX -- bend downwards and away. That is the character that separates this plant from
# every other white-and-yellow composite in a meadow, and it is also the one thing a
# person squinting at a mayweed is trying to decide.
#
# WHERE THE FACE GOES: in the gold cone, seated LOW in it. The existing coneflower note
# states the rule and the reason -- an inner organ centred on the face reads as a picture
# frame; an inner organ the face sits low in reads as a dome rising over it. Chamomile's
# cone stands higher than a coneflower's disc, so the seat is deeper.
#
# THE RAY MANE IS THE GENERATOR RUN WITH NO FACE IN IT (`face_rx = 0`), exactly as the
# dandelion's mane is: the lobes ARE the ray florets, not a ring drawn beside a head.

CHAMOMILE_PALETTE = {
    **FACE_PALETTE,
    "H": (168, 214, 128, 255),   # foliage highlight - feathery, light
    "M": (116, 178, 96, 255),    # foliage mid
    "D": (74, 132, 72, 255),     # foliage deep
    "S": (54, 100, 62, 255),     # foliage shadow
    "R": (250, 250, 244, 255),   # ray floret, lit
    "r": (214, 216, 206, 255),   # ray floret, shaded
    "Y": (252, 212, 84, 255),    # cone, lit
    "y": (214, 160, 40, 255),    # cone, shaded
    "k": (158, 112, 26, 255),    # cone, deep - the cone is tall enough to need three
}

# ── GEOMETRY MEASURED, NOT CHOSEN BY EYE ───────────────────────────────────────
#
# The first attempt guessed these and produced a 1-row face with the eyes, blush and mouth
# hanging in the air below the flower — `trim_tail` defaults to True and cut the bottom of
# the face off, which the parameters give no hint of. A sweep of 8,640 geometries was then
# filtered on what the composition actually has to be: a face at least 8px wide (the eyes
# need eight to sit in), at least 6 rows tall, FOUR OR FIVE ROWS OF CONE ABOVE IT and one
# or two below. 75 of the 8,640 qualify. These are the first of them.
#
# 5 above / 2 below is the coneflower rule applied to a taller organ: an inner organ
# centred on the face is a picture frame, an inner organ the face sits LOW in is a dome —
# and chamomile's receptacle is a hollow CONE standing proud, which is the whole difference
# between this plant and a scentless mayweed.
RAY_W, RAY_H = 29, 15
RAY_LOBES, RAY_AMP = 7, 0.24
CONE_W, CONE_H = 11, 15

CONE_RX, CONE_RY = 5.5, 7.5
CONE_FRX, CONE_FRY = 5.0, 4.5
CONE_FDY = 1.5

# The mane sits at the cone's WAIST, centred on the face's own middle row -- not at its
# foot, where it would read as a collar.
RAYS_AT = (2, 3)
CONE_AT = (11, 2)


def _rays(amp: float = RAY_AMP, squash: float = 0.0) -> list[str]:
    """The ray mane: the generator run with NO FACE IN IT, so the lobes ARE the florets.

    `squash` flattens it downwards, which is the reflexing -- M. chamomilla's rays bend
    down and away as the head ages, exposing the cone. That is the gesture.
    """
    return flower_head(
        RAY_W, RAY_H, RAY_W / 2, RAY_H / 2 + squash,
        RAY_W / 2 - 1.5, RAY_H / 2 - 1.2 - squash * 0.55,
        RAY_LOBES, amp, 0, 0, trim_tail=False, chars="RrrrFo",
    )


def _cone(face_dy: float = CONE_FDY) -> list[str]:
    return flower_head(
        CONE_W, CONE_H, CONE_W / 2, CONE_H / 2, CONE_RX, CONE_RY, 0, 0.0,
        CONE_FRX, CONE_FRY, face_dy=face_dy, trim_tail=False, chars="YykkFo",
    )


def method_b(species_key: str) -> dict:
    rays = _rays(0.17)
    rays_reflexed = _rays(0.10, squash=1.2)
    cone = _cone()
    rays_at, cone_at = RAYS_AT, CONE_AT

    # Bipinnate, thread-fine leaves -- the other half of the identification, and the
    # reason this cannot be the archetype's blunt oval leaf.
    frond = [" H H H ", "HMDMDMH", " D M D ", "  MDM  "]
    frond_tall = [" H H H ", "HMDMDMH", " DMMMD ", " M D M ", "  MDM  "]

    parts = [
        # The stem starts INSIDE the cone's foot (row 14 is its last row) so frame 0 is
        # one connected piece — the rule `audit_sprites.py` flood-fills for.
        # The stem starts INSIDE the head block (the cone's last row is 16) so frame 0 is
        # one connected piece -- the rule `audit_sprites.py` flood-fills for.
        {"name": "stem", "origin": (14, 15), "rows": ["  M  ", "  M  ", "  D  ",
                                                      "  D  ", "  D  ", "  S  "]},
        {"name": "frondLeft", "origin": (9, 20), "rows": frond,
         "variants": {"tall": frond_tall}},
        {"name": "frondRight", "origin": (16, 20), "rows": frond,
         "variants": {"tall": frond_tall}},
        {"name": "rays", "origin": rays_at, "rows": rays,
         "variants": {"reflexed": rays_reflexed}},
        {"name": "cone", "origin": cone_at, "rows": cone},
        *_seat(cone_at, cone, mouth="smile", extra_mouths={"calm": ["  oo  "]}),
    ]

    # TWELVE FRAMES: rest, the rays reflexing down, a beat with the cone fully exposed and
    # the creature blinking, then the rays lifting back. Frame 0 is the resting pose with
    # the rays UP and nothing detached -- what reduced motion freezes on.
    reflex = [None, None, "reflexed", "reflexed", "reflexed", "reflexed",
              "reflexed", "reflexed", None, None, None, None]
    nod = [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]
    return {
        "herbId": f"{species_key.replace(' ', '-')}-B",
        "personality": "serene",
        "method": "ai-authored",
        "size": SIZE, "frames": 12, "fps": 7,
        "parts": parts,
        "motion": {
            "rays": {"art": reflex},
            "cone": {"dy": nod},
            "eyes": {"dy": nod, "art": [None, None, None, None, "half", "shut",
                                        "shut", "half", None, None, "blink", None]},
            "cheeks": {"dy": nod},
            "mouth": {"dy": nod, "art": [None, None, None, "calm", "calm", "calm",
                                         "calm", "calm", None, None, None, None]},
            "frondLeft": {"art": [None, None, None, "tall", "tall", "tall",
                                  "tall", "tall", None, None, None, None]},
            "frondRight": {"art": [None, None, None, "tall", "tall", "tall",
                                   "tall", "tall", None, None, None, None]},
        },
        "palette": CHAMOMILE_PALETTE,
        "recipe": {"method": "ai-authored", "authored_organ": "rays+cone",
                   "gesture": "the reflex", "seed": None},
    }


# ── Method C: hybrid ───────────────────────────────────────────────────────────

def method_c(species_key: str, growth_form: str) -> dict:
    """A's skeleton, B's identifying organ, and nothing else authored.

    This is the one worth measuring carefully: if it reads nearly as well as B, it is the
    method that can be applied two thousand times, because the only per-species work is
    the one organ a person actually looks at.
    """
    base = method_a(species_key, growth_form)
    rays, cone = _rays(0.17), _cone()
    rays_at, cone_at = RAYS_AT, CONE_AT

    # The authored organ is TALLER than the archetype's head, so the skeleton's stem has
    # to be recomputed against it. That recomputation is the whole cost of the hybrid: one
    # organ swapped in, and the one measurement that depends on its height.
    cone_bottom = cone_at[1] + len(cone)
    leaf_row = cone_bottom + 2
    stem_top = cone_bottom - 1
    stem_rows = ["  M  "] * 2 + ["  D  "] * max(1, (leaf_row + 3) - stem_top - 2)
    parts = [
        {"name": "stem", "origin": (STEM_X - 2, stem_top), "rows": stem_rows},
        {"name": "leafLeft", "origin": (STEM_X - 6, leaf_row), "rows": LEAF_LEFT},
        {"name": "leafRight", "origin": (STEM_X, leaf_row), "rows": LEAF_RIGHT},
        {"name": "rays", "origin": rays_at, "rows": rays},
        {"name": "cone", "origin": cone_at, "rows": cone},
        *_seat(cone_at, cone),
    ]
    breathe = [0, -1, 0, 0]
    return {
        "herbId": f"{species_key.replace(' ', '-')}-C",
        "personality": "generic",
        "method": "hybrid",
        "size": SIZE, "frames": 4, "fps": 5,
        "parts": parts,
        # The skeleton keeps A's foliage ramp and takes B's two flower ramps, so the
        # per-species authoring is the organ and its colours and nothing more.
        "palette": {**base["palette"],
                    **{k: CHAMOMILE_PALETTE[k] for k in ("R", "r", "Y", "y", "k")}},
        "motion": {
            "cone": {"dy": breathe},
            "eyes": {"dy": breathe, "art": [None, None, "blink", None]},
            "cheeks": {"dy": breathe},
            "mouth": {"dy": breathe},
        },
        "recipe": {"method": "hybrid", "growth_form": growth_form, "seed": species_key,
                   "authored_organ": "rays+cone"},
    }


# ── Render and measure ─────────────────────────────────────────────────────────

def ascii_frame(sprite: dict, frame: int) -> str:
    return "\n".join("".join(row) for row in render_frame(sprite, frame))


def ink_box(sprite: dict) -> tuple[int, int, int, int]:
    grid = render_frame(sprite, 0)
    pts = [(x, y) for y, row in enumerate(grid) for x, c in enumerate(row) if c != " "]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return (min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1)


def measure(sprite: dict) -> dict:
    """Only what a machine can actually decide. Recognizability is not on this list."""
    problems = auditor.audit(sprite)
    grid = render_frame(sprite, 0)
    blobs = auditor.pieces(grid)
    palette_keys = set(sprite["palette"])
    used = {c for row in grid for c in row if c != " "}
    bx, by, bw, bh = ink_box(sprite)
    return {
        "herb_id": sprite["herbId"],
        "method": sprite["method"],
        "frames": sprite["frames"],
        "face_audit": "pass" if not problems else f"{len(problems)} problem(s)",
        "face_audit_detail": problems,
        "frame0_pieces": len(blobs),
        "frame0_connected": len(blobs) == 1,
        "palette_size": len(palette_keys),
        "undeclared_chars": sorted(used - palette_keys),
        "shares_face_palette": all(sprite["palette"].get(k) == v
                                   for k, v in FACE_PALETTE.items()),
        "ink_box": {"x": bx, "y": by, "w": bw, "h": bh},
        "ink_coverage_pct": round(100 * sum(1 for r in grid for c in r if c != " ")
                                  / (SIZE[0] * SIZE[1]), 1),
    }


def save_png(sprite: dict, out: pathlib.Path) -> pathlib.Path:
    from PIL import Image
    width, height = sprite["size"]
    frames = sprite["frames"]
    cell = width + 2 * FRAME_GUTTER
    sheet = Image.new("RGBA", (cell * frames * SCALE, height * SCALE), (0, 0, 0, 0))
    pixels = sheet.load()
    palette = {c: tuple(v) for c, v in sprite["palette"].items()}
    for frame in range(frames):
        grid = render_frame(sprite, frame)
        for y, row in enumerate(grid):
            for x, char in enumerate(row):
                if char == " ":
                    continue
                if char not in palette:
                    raise SystemExit(f"{sprite['herbId']}: '{char}' is not in the palette")
                colour = palette[char]
                bx = (frame * cell + FRAME_GUTTER + x) * SCALE
                for sy in range(SCALE):
                    for sx in range(SCALE):
                        pixels[bx + sx, y * SCALE + sy] = colour
    out.mkdir(parents=True, exist_ok=True)
    path = out / f"{sprite['herbId']}.png"
    sheet.save(path, "PNG", optimize=True)
    # Frame 0 alone, enlarged, because that is the still a card and a badge actually show.
    still = sheet.crop((FRAME_GUTTER * SCALE, 0,
                        (FRAME_GUTTER + width) * SCALE, height * SCALE)) \
        .resize((width * SCALE * 3, height * SCALE * 3), Image.NEAREST)
    still.save(out / f"{sprite['herbId']}-still.png", "PNG", optimize=True)
    return path


SPECIES_KEY = "matricaria chamomilla"
GROWTH_FORM = "erect-herb"


def candidates() -> dict[str, dict]:
    return {
        "A": method_a(SPECIES_KEY, GROWTH_FORM),
        "B": method_b(SPECIES_KEY),
        "C": method_c(SPECIES_KEY, GROWTH_FORM),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=None)
    parser.add_argument("--preview", choices=["A", "B", "C"])
    parser.add_argument("--frame", type=int, default=0)
    args = parser.parse_args()

    built = candidates()

    if args.preview:
        sprite = built[args.preview]
        print(f"{sprite['herbId']}  method={sprite['method']}  frame={args.frame}")
        print(ascii_frame(sprite, args.frame))
        return 0

    report = {"species_key": SPECIES_KEY, "growth_form": GROWTH_FORM, "candidates": {}}
    exit_code = 0
    for label, sprite in built.items():
        stats = measure(sprite)
        report["candidates"][label] = {**stats, "recipe": sprite["recipe"]}
        print(f"\n=== {label}  {sprite['method']} ({sprite['herbId']}) ===")
        print(f"  frames            {stats['frames']}")
        print(f"  face audit        {stats['face_audit']}")
        for problem in stats["face_audit_detail"]:
            print(f"      {problem}")
            exit_code = 1
        print(f"  frame 0 pieces    {stats['frame0_pieces']}"
              f"  {'(one plant)' if stats['frame0_connected'] else '(DISCONNECTED)'}")
        if not stats["frame0_connected"]:
            exit_code = 1
        print(f"  palette           {stats['palette_size']} chars, "
              f"face palette shared: {stats['shares_face_palette']}")
        if stats["undeclared_chars"]:
            print(f"  UNDECLARED CHARS  {stats['undeclared_chars']}")
            exit_code = 1
        print(f"  ink box           {stats['ink_box']}  "
              f"coverage {stats['ink_coverage_pct']}%")
        if args.out:
            path = save_png(sprite, pathlib.Path(args.out))
            print(f"  wrote             {path}")

    if args.out:
        out = pathlib.Path(args.out)
        (out / "report.json").write_text(json.dumps(report, indent=2) + "\n")
        print(f"\nreport -> {out / 'report.json'}")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
