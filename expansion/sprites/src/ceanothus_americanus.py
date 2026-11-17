"""New Jersey Tea (Ceanothus americanus) - creature portrait sprite.

THE DESIGN HOOK: the flowers sit in many ROUND CLUSTERS of tiny white blossoms on long thin stalks - pom-poms. So the creature wears
three white pom-poms on springy stalks that meet above its head like a tuft of hair, and its trademark gesture is THE RIPPLE: the
pom-poms bob one after another, left to right, like a wave passing along a row - each one lifts, then the next - and then it does it
once more. The ripple is three real parts' worth of motion in one crown, not a tilt of a single shape.

WHERE THE FACE GOES: a pom-pom this small cannot carry a pair of eyes, so the face sits immediately below, on a round leafy body -
the rule the deck applies wherever the flower is too small. The leaves are broad ovals with a vein, and they are the creature's feet.

NOT A TEA SPRITE. The card already carries a Tea use icon, and a sprite may never suggest a drink or an effect; the only thing that
moves is the flower clusters.

NOT YARROW. No hat over a face, and no feathery fronds: a round body, three separate pom-poms on stalks, broad oval leaves.

PERSONALITY: jaunty.

COLOUR: flowers near-white with a cool shadow, leaves ~110 deg mid green.

SAFETY: a portrait, never an identification aid. Deliberately stylised.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "W": (255, 255, 255, 255),   # pom highlight (and the eye glint)
    "M": (240, 243, 247, 255),   # pom mid
    "D": (204, 213, 224, 255),   # pom deep
    "S": (140, 152, 172, 255),   # pom shadow
    "T": (96, 142, 88, 255),     # stalk
    "G": (126, 214, 104, 255),   # leaf light
    "g": (80, 172, 82, 255),     # leaf mid
    "d": (52, 126, 66, 255),     # leaf deep
    "n": (40, 100, 58, 255),     # leaf shadow
    "v": (150, 220, 140, 255),   # leaf vein
}

BUD_PALETTE = {
    "K": (206, 230, 182, 255),   # bud highlight
    "k": (158, 196, 136, 255),   # bud mid
    "j": (112, 152, 98, 255),    # bud deep
    "J": (78, 110, 70, 255),     # bud shadow
}

# --- the crown: three pom-poms on stalks that meet above the head --------------------
CW, CH = 24, 13
JOIN = (11, 12)                   # where the stalks meet, bottom centre of the crown
POM = [" ooo ", "oWWMo", "oWMDo", "oMDSo", " ooo "]
BUD_POM = [" ooo ", "oKKko", "oKkjo", "okjJo", " ooo "]
CENTRES = (4, 11, 18)             # pom centre x
TOPS = (3, 0, 3)                  # pom top y at rest (the centre one stands tallest)


def _line(grid, x0, y0, x1, y1, ch):
    n = max(abs(x1 - x0), abs(y1 - y0))
    for i in range(n + 1):
        x = round(x0 + (x1 - x0) * i / max(1, n))
        y = round(y0 + (y1 - y0) * i / max(1, n))
        if 0 <= y < CH and 0 <= x < CW and grid[y][x] == " ":
            grid[y][x] = ch


def _crown(lift=(0, 0, 0), pom=POM, tops=TOPS):
    grid = [[" "] * CW for _ in range(CH)]
    for cx, top, up in zip(CENTRES, tops, lift):
        t = top - up
        _line(grid, cx, t + 5, JOIN[0], JOIN[1], "T")
        for dy, row in enumerate(pom):
            for dx, ch in enumerate(row):
                if ch != " ":
                    grid[t + dy][cx - 2 + dx] = ch
    return ["".join(r).rstrip() for r in grid]


CROWN = _crown()
# the ripple: the lift travels left to right
WAVE = [_crown((2, 0, 0)), _crown((1, 2, 0)), _crown((0, 1, 2)), _crown((0, 0, 1))]
# buds sit lower on shorter stalks - a plant in bud has not reached its full height yet
BUD_TOPS = (7, 6, 7)
BUD_CROWN = _crown(pom=BUD_POM, tops=BUD_TOPS)
BUD_WAVE = _crown((1, 0, 0), BUD_POM, BUD_TOPS)
CROWN_AT = (5, 1)

# --- the body: a round leafy ball that carries the face ------------------------------
BODY_W, BODY_H = 15, 14
BODY_AT = (9, 13)


def _body(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        BODY_W, BODY_H, 7.0, 6.6, 6.8, 6.4, 0, 0.0, 5.2, 4.4,
        face_dx=face_dx, face_dy=0.2, light=light, trim_tail=False, chars="GgdnFo",
    )


BODY = _body()
BODY_LEFT = _body(face_dx=-1.5, light=(-0.35, -0.65))
BODY_RIGHT = _body(face_dx=1.5, light=(-1.25, -0.65))
L_DX, _ = face_shift(BODY, BODY_LEFT)
R_DX, _ = face_shift(BODY, BODY_RIGHT)

# broad ovals with a vein - the plant's leaves are broad, with three prominent veins, not feathery
LEAF_L = [
    "  oooooo  ",
    " oGGGGGGoo",
    "oGGvgggggo",
    "oGvggdggdo",
    " oggvddddo",
    "  oooooo  ",
]
LEAF_R = [r[::-1] for r in LEAF_L]

# --- growth stages -----------------------------------------------------------------
YOUNG_W, YOUNG_H = 13, 16
YOUNG_AT = (10, 10)


def _young(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        YOUNG_W, YOUNG_H, 6.0, 7.6, 5.8, 7.4, 0, 0.0, 5.2, 4.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG = _young()
YOUNG_LEFT = _young(face_dx=-1.2, light=(-0.35, -0.65))
YOUNG_RIGHT = _young(face_dx=1.2, light=(-1.25, -0.65))
SEED_LEAF_L = [
    "  ooooo ",
    " oGGGGGo",
    "oGgvgggo",
    " oddddo ",
    "  oooo  ",
]
SEED_LEAF_R = [r[::-1] for r in SEED_LEAF_L]
GROW_AT = (9, 13)
SG_L, _ = face_shift(YOUNG, YOUNG_LEFT)
SG_R, _ = face_shift(YOUNG, YOUNG_RIGHT)

S_BOB = [0, 0, 0, -1, -1, 0, 0, 0]
S_ART = [None, None, "left", "left", "right", "right", None, None]
S_DX = [0, 0, SG_L, SG_L, SG_R, SG_R, 0, 0]
S_BLINK = [None, None, None, None, None, None, "blink", None]
G_BOB = [0, 0, -1, 0, -1, 0, -1, 0, 0, 0]
G_BLINK = [None] * 8 + ["blink", None]

SPRITE = {
    "herbId": "ceanothus-americanus",
    "personality": "jaunty",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "hide": ["crown"],
            "swap": {
                "body": YOUNG, "leafL": SEED_LEAF_L, "leafR": SEED_LEAF_R,
                "eyes": YOUNG_EYES["rows"], "mouth": YOUNG_MOUTH["rows"], "cheeks": young_cheeks(face_box(YOUNG)[2]),
            },
            "variants": {
                "body": {"left": YOUNG_LEFT, "right": YOUNG_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "body": YOUNG_AT, "leafL": (3, 20), "leafR": (21, 20),
                **seat_young(YOUNG_AT, YOUNG, mouth_dy=4),
            },
            "motion": {
                "body": {"dy": S_BOB, "art": S_ART},
                "eyes": {"dy": S_BOB, "dx": S_DX, "art": S_BLINK},
                "cheeks": {"dy": S_BOB, "dx": S_DX},
                "mouth": {"dy": S_BOB, "dx": S_DX},
                "leafL": {"dy": [0, 0, 0, 0, 1, 0, 0, 0]},
                "leafR": {"dy": [0, 0, 0, 1, 0, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": BUD_PALETTE,
            "swap": {"crown": BUD_CROWN, "eyes": YOUNG_EYES["rows"], "mouth": YOUNG_MOUTH["rows"],
                     "cheeks": young_cheeks(face_box(BODY)[2])},
            "variants": {
                "crown": {"wave": BUD_WAVE},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {"crown": CROWN_AT, **seat_young(BODY_AT, BODY, mouth_dy=5)},
            "motion": {
                "crown": {"art": [None, None, "wave", None, "wave", None, "wave", None, None, None], "dy": G_BOB},
                "body": {"dy": G_BOB},
                "eyes": {"dy": G_BOB, "art": G_BLINK},
                "cheeks": {"dy": G_BOB},
                "mouth": {"dy": G_BOB},
                "leafL": {"dy": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0]},
                "leafR": {"dy": [0, 0, 0, 1, 0, 0, 0, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "leafL", "origin": (3, 20), "rows": LEAF_L},
        {"name": "leafR", "origin": (19, 20), "rows": LEAF_R},
        {"name": "body", "origin": BODY_AT, "rows": BODY, "variants": {"left": BODY_LEFT, "right": BODY_RIGHT}},
        {"name": "crown", "origin": CROWN_AT, "rows": CROWN,
         "variants": {"w1": WAVE[0], "w2": WAVE[1], "w3": WAVE[2], "w4": WAVE[3]}},
        *feature_parts(BODY_AT, BODY, eyes="round", mouth="small", eye_dy=1, mouth_dy=5,
                       extra_eyes={"look_r": ["WE  WE", "EE  EE"]}, extra_mouths={"grin": ["o    o", " oooo "]}),
    ],
    #
    #  0    1    2    3    4    5    6    7    8    9    10   11   12   13
    # rest rest  w1   w2   w3   w4  rest rest  w1   w2   w3   w4  rest blink
    #
    # THE RIPPLE, twice: one pom-pom lifts, then the next, left to right, like a wave along a row. The face stays on
    # the body and grins while it happens - the body hops a pixel on the beat the wave passes the middle.
    "motion": {
        "crown": {"art": [None, None, "w1", "w2", "w3", "w4", None, None, "w1", "w2", "w3", "w4", None, None]},
        "body": {"dy": [0, 0, 0, -1, -1, 0, 0, 0, 0, -1, -1, 0, 0, 0]},
        "eyes": {"art": [None, None, None, "look_r", "look_r", "look_r", None, None, None, "look_r", "look_r", None, None, "blink"],
                 "dy": [0, 0, 0, -1, -1, 0, 0, 0, 0, -1, -1, 0, 0, 0]},
        "cheeks": {"dy": [0, 0, 0, -1, -1, 0, 0, 0, 0, -1, -1, 0, 0, 0]},
        "mouth": {"art": [None, None, None, "grin", "grin", "grin", None, None, None, "grin", "grin", "grin", None, None],
                  "dy": [0, 0, 0, -1, -1, 0, 0, 0, 0, -1, -1, 0, 0, 0]},
        "leafL": {"dy": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0]},
        "leafR": {"dy": [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0]},
    },
    "palette": PALETTE,
}
