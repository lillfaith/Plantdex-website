"""Narrowleaf Mountain Mint (Pycnanthemum tenuifolium) - creature portrait sprite.

THE DESIGN HOOK: very narrow, needle-like leaves on a fine stem, and small dense whitish flower clusters at the branch tips (the tiny
flowers carry purple spots). So the creature is a pale round face ringed by a STARBURST of green needles - a little hedgehog-halo -
with three flecked white tufts perched on the tips of the upward needles. Its trademark gesture is THE BRISTLE: every needle
snaps outward at once, the creature stands at attention with a determined look, holds it, then lets them all relax.

NOT YARROW, AND NOT THE OTHER WHITE ONES. No hat, no body under a brim, no side fronds: the needles radiate in a full ring, the face
is the pale flower cluster itself, and the silhouette is a starburst rather than a cloud (boneset) or a row of pom-poms (New Jersey Tea).

NOT MENTHA. The deck's mint sprite re-renders itself in ice; nothing here is cold, shimmering or scented, and no aroma or use is drawn
or implied. The only thing that moves is posture.

PERSONALITY: prickly - but a bluff; the face is the softest thing on it.

COLOUR: cluster near-white with a green tint, needles ~75 deg olive-green, purple flecks ~285 deg.

SAFETY: a portrait, never an identification aid. Deliberately stylised.
"""

import math

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "H": (250, 252, 244, 255),   # cluster highlight
    "M": (232, 240, 226, 255),   # cluster mid
    "D": (192, 208, 186, 255),   # cluster deep
    "S": (120, 142, 118, 255),   # cluster shadow
    "p": (150, 96, 168, 255),    # the purple flecks
    "G": (184, 214, 130, 255),   # needle highlight
    "g": (136, 176, 98, 255),    # needle mid
    "d": (98, 132, 78, 255),     # needle tip / dark
    "n": (72, 100, 64, 255),     # needle shadow
}

BUD_PALETTE = {
    "K": (206, 218, 170, 255),   # bud highlight
    "k": (162, 180, 126, 255),   # bud mid
    "j": (120, 138, 94, 255),    # bud deep
    "J": (86, 100, 72, 255),     # bud shadow
}

W, H = 32, 28
BALL_W, BALL_H = 15, 14
BALL_AT = (9, 8)
CX, CY = 16.0, 14.6


def _ball(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        BALL_W, BALL_H, 7.0, 6.6, 6.8, 6.4, 13, 0.06, 5.2, 4.4,
        face_dx=face_dx, face_dy=0.3, light=light, trim_tail=False, chars="HMDSFo",
    )


BALL = _ball()
BALL_LEFT = _ball(face_dx=-1.4, light=(-0.35, -0.65))
BALL_RIGHT = _ball(face_dx=1.4, light=(-1.25, -0.65))
L_DX, _ = face_shift(BALL, BALL_LEFT)
R_DX, _ = face_shift(BALL, BALL_RIGHT)


def _needles(reach_x, reach_y, count=12, start=5.0, cx=CX, cy=CY, w=W, h=H):
    """A ring of one-pixel needles from the centre out, 4-connected so each is one piece, and tipped darker."""
    grid = [[" "] * w for _ in range(h)]
    tips = {}
    for k in range(count):
        a = 2 * math.pi * k / count - math.pi / 2
        prev = None
        steps = int(max(reach_x, reach_y) * 4)
        for i in range(steps + 1):
            t = i / steps
            r = start / max(reach_x, reach_y) + (1 - start / max(reach_x, reach_y)) * t
            x = round(cx + math.cos(a) * reach_x * r)
            y = round(cy + math.sin(a) * reach_y * r)
            if not (0 <= x < w and 0 <= y < h):
                continue
            if prev and prev != (x, y):
                px, py = prev
                if px != x and py != y and grid[py][x] == " ":
                    grid[py][x] = "g"           # bridge a diagonal so the needle stays one piece
            grid[y][x] = "g" if grid[y][x] == " " else grid[y][x]
            prev = (x, y)
        if prev:
            grid[prev[1]][prev[0]] = "d"
            tips[k] = prev
    return ["".join(r).rstrip() for r in grid], tips


NEEDLES, TIPS = _needles(11.6, 10.0, count=10)
NEEDLES_OUT, _ = _needles(13.8, 11.8, count=10)
UP = (0, 1, 9)                 # the needles pointing up, up-right and up-left carry the tufts

TUFT = [" ooo ", "oHMpo", "oMpDo", " ooo "]
BUD_TUFT = [" ooo ", "oKkjo", "okjJo"]


def _tufts(shape=TUFT, lift=0):
    grid = [[" "] * W for _ in range(H)]
    for k in UP:
        tx, ty = TIPS[k]
        top = ty - len(shape) + 1 - lift
        for dy, row in enumerate(shape):
            for dx, ch in enumerate(row):
                if ch != " " and 0 <= top + dy < H and 0 <= tx - 2 + dx < W:
                    grid[top + dy][tx - 2 + dx] = ch
        for y in range(top + len(shape), ty + 1):            # the needle runs up into the tuft
            if 0 <= y < H and grid[y][tx] == " ":
                grid[y][tx] = "d"
    return ["".join(r).rstrip() for r in grid]


TUFTS = _tufts()
TUFTS_UP = _tufts(lift=2)

# --- growth stages -----------------------------------------------------------------
YOUNG_W, YOUNG_H = 13, 13
YOUNG_AT = (10, 12)


def _young(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        YOUNG_W, YOUNG_H, 6.0, 6.2, 5.8, 6.0, 0, 0.0, 5.2, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG = _young()
YOUNG_LEFT = _young(face_dx=-1.2, light=(-0.35, -0.65))
YOUNG_RIGHT = _young(face_dx=1.2, light=(-1.25, -0.65))
SEED_NEEDLES, _ = _needles(8.2, 7.2, count=8, start=4.5, cx=16.0, cy=18.0)
MID_NEEDLES, MID_TIPS = _needles(9.6, 8.4, count=10, start=5.0, cx=CX, cy=CY)
SG_L, _ = face_shift(YOUNG, YOUNG_LEFT)
SG_R, _ = face_shift(YOUNG, YOUNG_RIGHT)


def _bud_tufts():
    grid = [[" "] * W for _ in range(H)]
    for k in UP:
        tx, ty = MID_TIPS[k]
        top = ty - len(BUD_TUFT) + 1
        for dy, row in enumerate(BUD_TUFT):
            for dx, ch in enumerate(row):
                if ch != " " and 0 <= top + dy < H and 0 <= tx - 2 + dx < W:
                    grid[top + dy][tx - 2 + dx] = ch
    return ["".join(r).rstrip() for r in grid]


BUD_TUFTS = _bud_tufts()
GROW_BALL_W, GROW_BALL_H = 15, 14

S_BOB = [0, 0, 0, -1, -1, 0, 0, 0]
S_ART = [None, None, "left", "left", "right", "right", None, None]
S_DX = [0, 0, SG_L, SG_L, SG_R, SG_R, 0, 0]
S_BLINK = [None, None, None, None, None, None, "blink", None]
G_BOB = [0, 0, -1, -1, 0, 0, 0, 0, 0, 0]
G_BLINK = [None] * 8 + ["blink", None]

SPRITE = {
    "herbId": "pycnanthemum-tenuifolium",
    "personality": "prickly",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "hide": ["tufts"],
            "swap": {
                "ball": YOUNG, "needles": SEED_NEEDLES,
                "eyes": YOUNG_EYES["rows"], "mouth": YOUNG_MOUTH["rows"], "cheeks": young_cheeks(face_box(YOUNG)[2]),
            },
            "variants": {
                "ball": {"left": YOUNG_LEFT, "right": YOUNG_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {"ball": YOUNG_AT, "needles": (0, 0), **seat_young(YOUNG_AT, YOUNG, mouth_dy=4)},
            "motion": {
                "ball": {"dy": S_BOB, "art": S_ART},
                "needles": {"dy": [0] * 8},
                "eyes": {"dy": S_BOB, "dx": S_DX, "art": S_BLINK},
                "cheeks": {"dy": S_BOB, "dx": S_DX},
                "mouth": {"dy": S_BOB, "dx": S_DX},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": BUD_PALETTE,
            "swap": {
                "tufts": BUD_TUFTS, "needles": MID_NEEDLES,
                "eyes": YOUNG_EYES["rows"], "mouth": YOUNG_MOUTH["rows"], "cheeks": young_cheeks(face_box(BALL)[2]),
            },
            "variants": {"eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]}},
            "origins": {"tufts": (0, 0), "needles": (0, 0), **seat_young(BALL_AT, BALL, mouth_dy=5)},
            "motion": {
                "tufts": {"dy": G_BOB},
                "needles": {"dy": [0] * 10},
                "ball": {"dy": G_BOB},
                "eyes": {"dy": G_BOB, "art": G_BLINK},
                "cheeks": {"dy": G_BOB},
                "mouth": {"dy": G_BOB},
            },
        },
    },
    "size": (W, H),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "needles", "origin": (0, 0), "rows": NEEDLES, "variants": {"out": NEEDLES_OUT}},
        {"name": "ball", "origin": BALL_AT, "rows": BALL, "variants": {"left": BALL_LEFT, "right": BALL_RIGHT}},
        {"name": "tufts", "origin": (0, 0), "rows": TUFTS, "variants": {"up": TUFTS_UP}},
        *feature_parts(BALL_AT, BALL, eyes="round", mouth="small", eye_dy=1, mouth_dy=5,
                       extra_mouths={"set": ["oooo"]}),
    ],
    #
    #  0    1    2     3    4     5     6     7     8     9    10   11   12   13
    # rest rest brace BRISTLE hold hold  hold  hold relax rest rest blink rest rest
    #
    # THE BRISTLE, frames 2-8: the ring of needles snaps outward on one frame - the whole creature standing at attention - holds with a
    # determined set mouth and narrowed eyes, then relaxes. It is a posture. Nothing is scented, cold or curative.
    "motion": {
        "needles": {"art": [None, None, None, "out", "out", "out", "out", "out", None, None, None, None, None, None]},
        "tufts": {"art": [None, None, None, "up", "up", "up", "up", "up", None, None, None, None, None, None],
                  "dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
        "ball": {"dy": [0, 0, 1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0]},
        "eyes": {"art": [None, None, None, "half", "half", "half", "half", "half", None, None, None, "blink", None, None],
                 "dy": [0, 0, 1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0]},
        "cheeks": {"dy": [0, 0, 1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0]},
        "mouth": {"art": [None, None, None, "set", "set", "set", "set", "set", None, None, None, None, None, None],
                  "dy": [0, 0, 1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
