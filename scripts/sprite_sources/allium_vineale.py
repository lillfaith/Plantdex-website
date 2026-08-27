"""Field Garlic (Allium vineale) - creature portrait sprite.

THE DESIGN HOOK: field garlic does something genuinely strange. Instead of flowers it
usually produces a head of BULBILS - tiny bulbs, in the air, at the top of the stem - and
they sprout while they are still up there, sending out little green shoots in every
direction before they ever touch soil. The result is a plant standing in a lawn with a
head of green sprouts sticking straight up out of it.

That is a haircut, and it would be perverse to draw it as anything else.

WHERE THE FACE GOES: below the bulbil head, in the hollow tubular leaves. Field garlic
leaves are round in cross-section and floppy, quite unlike the flat blades everywhere
else in this deck.

PERSONALITY: startled-looking, which is entirely the fault of its own hair. Its trademark
gesture is THE SPROUT - the bulbil head puts out shoots one after another until they are
all standing on end, and it looks quite pleased with the result. It is the only sprite
with hair, and the only one whose gesture happens on top of its own head.

SAFETY: a portrait, never an identification aid, and this one matters: several plants
that look like field garlic are dangerous, and the smell test the card describes is not
something a drawing can do for you. The card's identification content is the reference.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (179, 221, 79, 255),   # leaf highlight
    "g": (130, 176, 48, 255),    # leaf mid
    "d": (84, 120, 33, 255),     # leaf deep
    "n": (72, 104, 38, 255),      # leaf shadow
    "B": (244, 221, 168, 255),   # bulbil highlight - papery, off-white
    "b": (207, 165, 81, 255),   # bulbil mid
    "u": (164, 118, 46, 255),   # bulbil deep
    "U": (114, 80, 32, 255),     # bulbil shadow
    "s": (162, 218, 60, 255),   # the sprouts, brighter than the leaves so hair reads
}

HEAD_W, HEAD_H = 17, 15
BULB_W, BULB_H = 13, 11


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 8.0, 7.0, 7.6, 6.6, 5, 0.10, 4.8, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


def _bulbils(amp=0.20):
    # Lumpy and faceless: a head of separate little bulbs, so the lobes are driven harder
    # than anywhere else in the deck except the burdock's burr.
    return flower_head(
        BULB_W, BULB_H, 6.0, 5.0, 5.6, 4.6, 9, amp, 0, 0,
        light=(-0.85, -0.75), trim_tail=False, chars="BbuUFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))
BULBILS = _bulbils()
BULBILS_TIGHT = _bulbils(amp=0.12)

# The hair, in three stages. Nothing, a few shoots, and every bulbil sprouting at once -
# which is what a real head of field garlic looks like by midsummer and is also, plainly,
# a fright wig.
SPROUTS_NONE = [
    " ",
]

SPROUTS_FEW = [
    "  s     s",
    "  s     s",
    "  o     o",
]

SPROUTS_ALL = [
    " s  s  s  s ",
    "s s ss s  s s",
    "o s ss s  s o",
    "  o oo o  o",
]

# The hollow tubular leaves. Drawn narrow and drooping, because a field garlic leaf is a
# tube that flops rather than a blade that arches.
TUBE_L = [
    "  oo",
    " ogo",
    " ogo",
    "ogGo",
    "ogGo",
    "oggo",
    "odgo",
    " odo",
    " oo",
]

TUBE_R = [
    "oo",
    "ogo",
    "ogo",
    "oGgo",
    "oGgo",
    "oggo",
    "ogdo",
    "odo",
    "oo",
]

STEM = [
    "ogGdo",
    "ogGdo",
    "ogGdo",
    " ooo ",
]

HEAD_AT = (7, 10)

# --- Growth stages -----------------------------------------------------------
#
# THE HAIRCUT ARRIVES LAST, and the middle stage is the one most people have never
# noticed. Field garlic's bulbil head does not simply appear: it comes up inside a
# PAPERY SPATHE, a single long-beaked hood that sheathes the whole umbel and splits open
# to release it. So the plant spends weeks looking like a green stem with a pale beak on
# top, which is a completely different silhouette from the fright wig it becomes.
#
#   sprout    the hollow tubular leaves and nothing above them. No scape, no bulbils, no
#             hair — the startled look with nothing yet to be startled by.
#   growing   the scape up carrying the SPATHE, shut. It is aware there is something on
#             its head. It does not yet know what.
#   flowering the bulbils, and every one of them sprouting. Unchanged.
#
# SAFETY NOTE CARRIED FORWARD: this species' docstring already says a drawing cannot do
# the smell test for you, and that matters more at the earlier stages rather than less —
# a field garlic without its bulbil head is exactly when it looks most like the things it
# is dangerous to confuse it with. Every stage of this sprite is a portrait, and the
# card's identification content stays the reference outdoors.

# --- Sprout: tubes, and nothing on top --------------------------------------
YOUNG_HEAD_AT = (9, 13)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 13, 7.0, 6.0, 7.2, 6.0, 5, 0.10, 5.4, 3.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

TUBE_L_YOUNG = [
    "  oo",
    " ogo",
    "ogGo",
    "oggo",
    " odo",
    " oo",
]

TUBE_R_YOUNG = [
    "oo",
    "ogo",
    "oGgo",
    "oggo",
    "odo",
    "oo",
]

# --- Growing: the spathe, shut ----------------------------------------------
MID_HEAD_AT = (8, 12)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        16, 14, 7.5, 6.6, 7.4, 6.4, 5, 0.10, 5.4, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))

# The papery hood, with the long beak this genus is known for. Smooth, closed and pale:
# nothing lumpy about it, which is the whole visual difference from what it opens into.
SPATHE = [
    "  o  ",
    " oBo ",
    " oBo ",
    "oBBbo",
    "oBbuo",
    " ooo ",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "allium-vineale",
    "personality": "startled",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(10, "sprout"),
            "hide": ["bulbils", "sprouts", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "tubeL": TUBE_L_YOUNG,
                "tubeR": TUBE_R_YOUNG,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "tubeL": (7, 17),
                "tubeR": (21, 17),
                "stem": (14, 23),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            "motion": {
                "head": {
                    "art": [None, "right", None, None, "left", None, None, None],
                    "dy": [0, 0, -1, -1, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, None, None, None, None, None, "blink", None],
                    "dx": [0, S_R_DX, 0, 0, S_L_DX, 0, 0, 0],
                    "dy": [0, 0, -1, -1, 0, 0, 0, 0],
                },
                "mouth": {
                    "dx": [0, S_R_DX, 0, 0, S_L_DX, 0, 0, 0],
                    "dy": [0, 0, -1, -1, 0, 0, 0, 0],
                },
                "tubeL": {"lean": [0, 1, 1, 0, -1, 0, 0, 0]},
                "tubeR": {"lean": [0, -1, -1, 0, 1, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(10, "growing"),
            # The spathe is a smooth hood, so `sprouts` has nothing to come out of yet.
            "hide": ["sprouts", "cheeks"],
            "swap": {
                "head": MID_HEAD,
                "bulbils": SPATHE,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "wide": YOUNG_EYES["wide"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"], "oh": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "bulbils": (13, 7),
                "tubeL": (6, 16),
                "tubeR": (22, 16),
                "stem": (14, 23),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # It looks up, and up, at a thing it cannot see the top of. The gag is the
            # same as the adult's — a creature reacting to its own head — with the hair
            # still inside the hood.
            "motion": {
                "head": {
                    "art": [None, "right", None, None, None, None, "left", "right",
                            None, None],
                    "dy": [0, 0, -1, -1, -1, -1, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, None, "wide", "wide", "wide", "wide", None, "happy",
                            "blink", None],
                    "dx": [0, G_R_DX, 0, 0, 0, 0, G_L_DX, G_R_DX, 0, 0],
                    "dy": [0, 0, -1, -1, -1, -1, 0, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, None, "oh", "oh", "oh", None, None, None, None, None],
                    "dx": [0, G_R_DX, 0, 0, 0, 0, G_L_DX, G_R_DX, 0, 0],
                    "dy": [0, 0, -1, -1, -1, -1, 0, 0, 0, 0],
                },
                "bulbils": {"dy": [0, 0, -1, -1, -1, -1, 0, 0, 0, 0]},
                "tubeL": {"lean": [0, 1, 1, 0, -1, -1, 0, 1, 0, 0]},
                "tubeR": {"lean": [0, -1, -1, 0, 1, 1, 0, -1, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "stem", "origin": (14, 23), "rows": STEM},
        {"name": "tubeL", "origin": (5, 15), "rows": TUBE_L},
        {"name": "tubeR", "origin": (23, 15), "rows": TUBE_R},
        {
            "name": "sprouts",
            "origin": (10, 0),
            "rows": SPROUTS_NONE,
            "variants": {"few": SPROUTS_FEW, "all": SPROUTS_ALL},
        },
        {
            "name": "bulbils",
            "origin": (9, 3),
            "rows": BULBILS,
            "variants": {"tight": BULBILS_TIGHT},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="small", eye_dy=2, mouth_dy=5,
            extra_mouths={"oh": ["oo", "FF"], "pleased": ["o  o", " oo "]},
        ),
    ],
    #
    #  0    1    2      3      4      5      6      7     8     9    10   11   12    13
    # rest tilt SPROUT SPROUT ALL    ALL    ALL   settle look look rest rest blink rest
    #
    # The sprout is frames 2-6 and it is this sprite's trademark: shoots come out of the
    # bulbil head in two waves and stand up, and the creature's eyes go wide underneath
    # them. The hair does not go back down within the loop - once a bulbil has sprouted it
    # has sprouted - so the last frames are it living with the result. Frame 0 is the rest
    # pose reduced motion freezes on: a plain head of bulbils, before any of this.
    "motion": {
        "head": {
            "art": [None, "right", None, None, None, None, None, None, "left",
                    "right", None, None, None, None],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "wide", "wide", "wide", "wide", "wide", None,
                    "happy", "happy", None, None, "blink", None],
            "dx": [0, 2, 0, 0, 0, 0, 0, 0, -2, 2, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, -1, 1, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "oh", "oh", "oh", "oh", None, "pleased", "pleased",
                    "pleased", None, None, None, None],
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, -1, 1, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        # Two waves, and the second is four times the first. Hair does not arrive
        # gradually; it arrives, and then there is a lot more of it.
        "sprouts": {
            "art": [None, None, "few", "few", "all", "all", "all", "all", "all",
                    "all", "all", "all", "all", None],
            "dy": [0, 0, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # The bulbil head swells as everything in it starts growing at once.
        "bulbils": {
            "art": ["tight", "tight", "tight", None, None, None, None, None, None,
                    None, None, None, None, "tight"],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "tubeL": {"lean": [0, 1, 1, 0, -1, -1, 0, 0, 1, 0, 0, 0, 0, 0]},
        "tubeR": {"lean": [0, -1, -1, 0, 1, 1, 0, 0, -1, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
