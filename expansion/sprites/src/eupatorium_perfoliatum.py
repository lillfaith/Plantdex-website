"""Boneset (Eupatorium perfoliatum) - creature portrait sprite.

THE DESIGN HOOK: PERFOLIATE. The leaf pairs are joined around the stem, so the stalk passes straight through them. The creature
wears that as a COLLAR - a pair of big lance leaves fused across the stalk and cupped under the head - and its trademark gesture
is THE CLASP: the collar rises up the stalk and hugs the head, holds, and settles back down.

THE FACE IS ON THE FLOWER. Boneset's flat-topped cluster is broad (a corymb of many tiny cream-white heads), wide enough to carry
a pair of eyes, so the puffy white head IS the face - the way the dandelion's mane is - and not a hat on a body. That is what
separates it from yarrow, whose umbel is a brim over a face beneath it: here the fuzzy cloud is the character, the collar is its
scarf, and there are no feathery fronds at all.

PERSONALITY: clasping - it holds on. Nothing here illustrates a medicinal effect or a use; the card's name is a folk name and the
sprite makes no claim about it.

COLOUR: head ~50 deg warm cream, leaves ~85 deg yellow-green - 35 deg apart, just over the 34 deg floor.

SAFETY: a portrait, never an identification aid. Deliberately stylised.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "H": (255, 252, 236, 255),   # floret highlight
    "M": (243, 236, 204, 255),   # floret mid
    "D": (221, 210, 168, 255),   # floret deep
    "S": (166, 154, 114, 255),   # floret shadow
    "G": (176, 218, 100, 255),   # leaf light
    "g": (122, 180, 74, 255),    # leaf mid
    "d": (82, 132, 58, 255),     # leaf dark
    "n": (56, 102, 50, 255),     # leaf shadow
    "s": (196, 214, 120, 255),   # the stalk showing through the collar
}

# --- the head: a fuzzy cream cloud that carries the face -----------------------------
HEAD_W, HEAD_H = 24, 18


def _florets(rows):
    """Break the smooth cloud into a crowd of tiny florets: scatter deeper-cream flecks over the lit and mid tones, away from the
    face and the outline, so the head reads as a BUSHY flower cluster and not a plain white disc (a daisy)."""
    out = []
    for y, row in enumerate(rows):
        cells = list(row)
        for x, ch in enumerate(cells):
            if ch in "HM":
                if (x * 3 + y * 5) % 7 == 0:
                    cells[x] = "D"
                elif (x * 5 + y * 3) % 11 == 0:
                    cells[x] = "S"
        out.append("".join(cells))
    return out


# Seven pixels carved out of the cloud (made transparent) so it reads as an airy, many-flowered BUSH with gaps in it, not a solid
# white mass. Fixed positions, away from the face and the outline, so every pose carves the same holes.
AIRY = [(11, 3), (16, 4), (6, 6), (19, 7), (5, 10), (19, 11), (6, 12)]


def _airy(rows):
    out = [list(r.ljust(HEAD_W)) for r in rows]
    for x, y in AIRY:
        if y < len(out) and out[y][x] in "HMDS":
            out[y][x] = " "
    return ["".join(r).rstrip() for r in out]


def _head(face_dx=0.0, light=(-0.85, -0.65), rx=11.0, ry=8.2):
    # a smaller face patch (it was a big pale circle) inside a more irregular cloud: 11 deeper lobes rather than 17 shallow ones
    return _airy(_florets(flower_head(
        HEAD_W, HEAD_H, 12.0, 8.6, rx, ry, 11, 0.15, 4.5, 3.9,
        face_dx=face_dx, face_dy=1.0, light=light, trim_tail=False, chars="HMDSFo",
    )))


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))
HEAD_SQUASH = _head(rx=11.4, ry=7.6)
HEAD_AT = (4, 1)
L_DX, _ = face_shift(HEAD, HEAD_LEFT)
R_DX, _ = face_shift(HEAD, HEAD_RIGHT)


# --- the collar: two lance leaves fused around the stalk -----------------------------
def _collar(half):
    w = max(len(h) for h in half)
    rows = [h.ljust(w) + h.ljust(w)[::-1] for h in half]
    # the stalk passes straight through the join (the two middle columns)
    return [r[: w - 1] + "ss" + r[w + 1:] if i <= len(rows) - 2 else r for i, r in enumerate(rows)]


COLLAR = _collar([
    "oo        ",
    "oGGoo     ",
    " oGGGooo  ",
    "  oGGGggoo",
    "   odggggd",
    "    ooodd ",
])
COLLAR_AT = (6, 18)

STEM = [
    "osso",
    "osso",
    " oo ",
]
STEM_AT = (14, 24)

# --- growth stages -----------------------------------------------------------------
BUD_PALETTE = {
    "K": (214, 226, 168, 255),   # bud highlight
    "k": (176, 196, 126, 255),   # bud mid
    "j": (132, 158, 92, 255),    # bud deep
    "J": (92, 116, 70, 255),     # bud shadow
}

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

# the seedling's first leaf pair, already fused around the stalk: the one thing a seedling can show
SEED_COLLAR = _collar([
    "o     ",
    "oGoo  ",
    " oGGgoo",
    "  odggd",
    "   ooo ",
])
SEED_COLLAR_AT = (9, 22)
SEED_STEM_AT = (14, 26)
SEED_STEM = ["osso", " oo "]

BUD_W, BUD_H = 17, 14


def _bud(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        BUD_W, BUD_H, 8.0, 6.8, 7.6, 6.2, 11, 0.07, 5.2, 4.2,
        face_dx=face_dx, face_dy=0.7, light=light, trim_tail=False, chars="KkjJFo",
    )


BUD = _bud()
BUD_LEFT = _bud(face_dx=-1.3, light=(-0.35, -0.65))
BUD_RIGHT = _bud(face_dx=1.3, light=(-1.25, -0.65))
BUD_AT = (7, 6)
BUD_COLLAR_AT = (9, 18)
BUD_COLLAR = _collar([
    "o      ",
    "oGoo   ",
    " oGGgoo",
    "  odgdd ",
    "   ooo  ",
])
SG_L, _ = face_shift(YOUNG, YOUNG_LEFT)
SG_R, _ = face_shift(YOUNG, YOUNG_RIGHT)
GG_L, _ = face_shift(BUD, BUD_LEFT)
GG_R, _ = face_shift(BUD, BUD_RIGHT)

S_BOB = [0, 0, 0, -1, -1, 0, 0, 0]
S_ART = [None, None, "left", "left", "right", "right", None, None]
S_DX = [0, 0, SG_L, SG_L, SG_R, SG_R, 0, 0]
S_BLINK = [None, None, None, None, None, None, "blink", None]
G_BOB = [0, 0, -1, -1, -1, 0, 0, 0, 0, 0]
G_ART = [None, None, "left", "left", None, "right", "right", None, None, None]
G_DX = [0, 0, GG_L, GG_L, 0, GG_R, GG_R, 0, 0, 0]
G_BLINK = [None] * 8 + ["blink", None]

SPRITE = {
    "herbId": "eupatorium-perfoliatum",
    "personality": "clasping",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "swap": {
                "head": YOUNG, "collar": SEED_COLLAR, "stem": SEED_STEM,
                "eyes": YOUNG_EYES["rows"], "mouth": YOUNG_MOUTH["rows"], "cheeks": young_cheeks(face_box(YOUNG)[2]),
            },
            "variants": {
                "head": {"left": YOUNG_LEFT, "right": YOUNG_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "head": YOUNG_AT, "collar": SEED_COLLAR_AT, "stem": SEED_STEM_AT,
                **seat_young(YOUNG_AT, YOUNG, mouth_dy=4),
            },
            "motion": {
                "head": {"dy": S_BOB, "art": S_ART},
                "eyes": {"dy": S_BOB, "dx": S_DX, "art": S_BLINK},
                "cheeks": {"dy": S_BOB, "dx": S_DX},
                "mouth": {"dy": S_BOB, "dx": S_DX},
                "collar": {"dy": [0, 0, 0, -1, -1, 0, 0, 0]},
                "stem": {"dy": [0] * 8},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": BUD_PALETTE,
            "swap": {
                "head": BUD, "collar": BUD_COLLAR,
                "eyes": YOUNG_EYES["rows"], "mouth": YOUNG_MOUTH["rows"], "cheeks": young_cheeks(face_box(BUD)[2]),
            },
            "variants": {
                "head": {"left": BUD_LEFT, "right": BUD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "head": BUD_AT, "collar": BUD_COLLAR_AT, "stem": (14, 23),
                **seat_young(BUD_AT, BUD, mouth_dy=5),
            },
            "motion": {
                "head": {"dy": G_BOB, "art": G_ART},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_BLINK},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "collar": {"dy": [0, 0, 0, -1, -2, -1, 0, 0, 0, 0]},
                "stem": {"dy": [0] * 10},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stem", "origin": STEM_AT, "rows": STEM},
        {"name": "head", "origin": HEAD_AT, "rows": HEAD,
         "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT, "squash": HEAD_SQUASH}},
        {"name": "collar", "origin": COLLAR_AT, "rows": COLLAR},
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="small", eye_dy=1, mouth_dy=5,
                       extra_eyes={"happy": ["  EE  EE  ".replace("  EE  EE  ", "oo  oo")][:1] + ["EE  EE"]},
                       extra_mouths={"grin": ["o  o", " oo "]}),
    ],
    #
    #  0    1    2     3     4     5     6     7     8     9    10    11    12   13
    # rest rest gather CLASP CLASP CLASP hold  settle rest turn  turn  rest blink rest
    #
    # THE CLASP, frames 2-8: the collar rises up the stalk and hugs the head, and the creature beams while it does -
    # the join of the two leaves is the plant's own anatomy (perfoliate) shown as a movement. Then it lets go.
    "motion": {
        "collar": {"dy": [0, 0, -1, -2, -3, -3, -3, -2, -1, 0, 0, 0, 0, 0]},
        "head": {"art": [None, None, "squash", None, None, None, None, None, None, "left", "left", "right", None, None],
                 "dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
        "eyes": {"art": [None, None, None, None, "half", "half", "half", None, None, None, None, None, "blink", None],
                 "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, L_DX, L_DX, R_DX, 0, 0]},
        "cheeks": {"dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, L_DX, L_DX, R_DX, 0, 0]},
        "mouth": {"art": [None, None, None, "grin", "grin", "grin", "grin", "grin", None, None, None, None, None, None],
                  "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, L_DX, L_DX, R_DX, 0, 0]},
        "stem": {"dy": [0] * 14},
    },
    "palette": PALETTE,
}
