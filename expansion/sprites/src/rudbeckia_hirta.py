"""Black-Eyed Susan (Rudbeckia hirta) - creature portrait sprite.

THE DESIGN HOOK: HIRTA means hairy, and the name is the face. A dark, domed disc carries the eyes - the "black eye" is the
creature's own - inside a pinwheel of golden rays. Same anatomy as the deck's coneflower (a ray ring with a raised disc standing
proud, drawn as the flower-head generator run twice), and deliberately NOT the same creature: its palette is gold and near-black
rather than pink and orange, its rays are fewer and broader, and its gesture is a pinwheel, not a zap.

THE PINWHEEL: the rays spin slowly around the still face. The mane is generated at four lobe phases; the loop steps through them,
so the ring turns while the dark disc, and everything in it, stays put and blinks. Then the rays catch up and stop. Nothing is
flung and nothing is claimed: it is a flower head being a flower head.

PERSONALITY: bristly - the stem and leaves are covered in coarse hairs, and that is where the temper is. Not a medicinal
gesture of any kind: nothing here illustrates anything the card's Healing Traits print.

COLOUR: rays ~45 deg, leaves ~100 deg (55 deg apart - clear of the 34 deg floor), disc ~25 deg near black. Midtones stay under
the saturation cap; the pale highlight carries the brightness.

SAFETY: a portrait, never an identification aid. Deliberately stylised.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "R": (255, 236, 150, 255),   # ray highlight
    "r": (244, 194, 52, 255),    # ray mid
    "q": (214, 146, 28, 255),    # ray deep
    "Q": (150, 92, 30, 255),     # ray shadow
    "N": (112, 80, 64, 255),     # disc highlight
    "m": (74, 50, 44, 255),      # disc mid
    "b": (50, 34, 36, 255),      # disc deep
    "B": (30, 20, 28, 255),      # disc shadow
    "G": (128, 202, 98, 255),    # leaf light
    "g": (88, 160, 76, 255),     # leaf mid
    "d": (58, 117, 59, 255),     # leaf deep
    "n": (40, 85, 47, 255),      # leaf shadow
}

# --- The ray mane -----------------------------------------------------------
#
# THIRTEEN NARROW LOBES, not the dandelion's eight broad ones: a coneflower carries many more
# rays and each is thinner, and that count is most of what separates the two silhouettes at
# thumbnail size. `face_rx = 0` draws no face — this organ is behind the cone and must stay a
# clean ring.
MANE_W, MANE_H = 29, 23
MANE_CX, MANE_CY = 14.0, 11.0


def _mane(rx=11.4, ry=9.5, light=(-0.85, -0.65), phase=0.0):
    return flower_head(
        MANE_W, MANE_H, MANE_CX, MANE_CY, rx, ry, 11, 0.24, 0, 0,
        light=light, trim_tail=False, chars="RrqQFo", phase=phase,
    )


MANE = _mane()
# The startle: the whole ring lifts and widens a little. Reflexed rays cannot fall further,
# so the only direction they have is up.
MANE_LIFT = _mane(rx=11.9, ry=10.2)
# the pinwheel: the same ring at four turns (one lobe is 2*pi/11, so these are quarter-lobe steps)
TURN = [_mane(phase=k * 0.1427) for k in (1, 2, 3, 4)]

MANE_AT = (1, 1)

# BUDDING: the same ring at a short radius. A coneflower does not open all at once — the
# green bud cracks and the rays push out as stubs, still short and still half-held by the
# bracts, before they lengthen and reflex. Generated from the same call rather than drawn
# again, so the adult's ray count and spacing are exactly what the bud grows into.
BUD_MANE = _mane(rx=6.4, ry=5.6)
BUD_MANE_AT = (2, 7)

# --- The cone ---------------------------------------------------------------
#
# Nine shallow lobes so the rim is bumpy rather than smooth — a cone is packed bracts, and a
# clean ellipse here reads as a berry. The amplitude stays low because the SPINES do the
# spiky work; a permanently jagged rim would leave the gesture nothing to add.
CONE_W, CONE_H = 18, 15


def _cone(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        CONE_W, CONE_H, 8.5, 6.7, 7.8, 6.6, 9, 0.10, 5.3, 4.2,
        face_dx=face_dx, face_dy=1.1, light=light, trim_tail=False, chars="NmbBFo",
    )


CONE = _cone()
CONE_LEFT = _cone(face_dx=-1.3, light=(-0.35, -0.65))
CONE_RIGHT = _cone(face_dx=1.3, light=(-1.25, -0.65))

CONE_AT = (6, 5)

L_DX, _ = face_shift(CONE, CONE_LEFT)
R_DX, _ = face_shift(CONE, CONE_RIGHT)

# --- The spines -------------------------------------------------------------
#
# Their own part, because the gesture is them moving against the cone. Flat at rest: a
# coneflower is prickly to touch and does not look it, which is the joke the bristle tells.
SPINES_FLAT = [
    " b b b b b b b ",
    "b b b b b b b b",
]

SPINES_UP = [
    "B B B B B B B B",
    " b b b b b b b ",
    "b b b b b b b b",
]

SPINES_AT = (8, 6)

# --- Leaves and stem --------------------------------------------------------
#
# COARSE AND ROUGH-TOOTHED rather than the soft ovals most of the deck carries: rough leaves
# are one of the three traits the card's own identification section leans on.
LEAF_L = [
    "  ooo  ",
    " oGGGo ",
    "oGGgggo",
    "oGgggdo",
    " ogddno",
    "  oddo ",
    "   oo  ",
]

LEAF_R = [
    "  ooo  ",
    " oGGGo ",
    "oggGGGo",
    "odgggGo",
    "onddgo ",
    " oddo  ",
    "  oo   ",
]

STEM = [
    "odgo",
    "odgo",
    "odgo",
    "odgo",
    " oo ",
]

# --- Growth stages -----------------------------------------------------------
#
#   sprout    a rough toothed leaf wearing the face. No cone, no mane, no spines: a
#             first-year coneflower is a rosette and nothing else, and the card's own
#             identification says the rough leaves are the giveaway.
#   growing   the head in BUD: a closed green cone, spines already there but flat, and the
#             first purple breaking at the crown. E. purpurea rays emerge upright from the
#             top of a developing head and only reflex later, so short stubs at the crown is
#             a real phase rather than a shrunken adult - and the prickle arriving before the
#             colour is what makes the stage worth drawing at all.
#   flowering mane, cone, and bristles that move.

BUD_PALETTE = {
    "N": (178, 216, 134, 255),   # green cone highlight
    "m": (128, 178, 100, 255),   # green cone mid
    "b": (86, 132, 74, 255),     # green cone deep
    "B": (58, 94, 58, 255),      # green cone shadow
}

# HAND-DRAWN, for the same reason the violet's is: `flower_head` makes rounded organs and a
# coneflower leaf is a long lance with a toothed edge. The teeth are the identification; a
# smooth oval here would be any seedling in the deck.
LEAF_HEAD_AT = (7, 11)

LEAF_HEAD = [
    "     ooooooo     ",
    "  oooGGGGGGGooo  ",
    " oGGoFFFFFFFFFoo ",
    "oGGoFFFFFFFFFFFGo",
    "oGGoFFFFFFFFFFFGo",
    " oGoFFFFFFFFFoGo ",
    " oGoooooooooooGo ",
    "  ogggggggggggo  ",
    "   odgdgdgdgdo   ",
]

SEED_LEAF = [
    " ooo ooo ",
    "oGGGoGGGo",
    " oGgggGo ",
    "  odgdo  ",
    "   ono   ",
]

SEED_STEM = [
    "odgo",
    "odgo",
    " oo ",
]

BUD_W, BUD_H = 15, 12
BUD_AT = (9, 11)


def _bud(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        BUD_W, BUD_H, 7.0, 5.6, 6.6, 5.2, 9, 0.10, 5.2, 3.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="NmbBFo",
    )


BUD = _bud()
BUD_LEFT = _bud(face_dx=-1.2, light=(-0.32, -0.66))
BUD_RIGHT = _bud(face_dx=1.2, light=(-1.34, -0.66))

G_L_DX, _ = face_shift(BUD, BUD_LEFT)
G_R_DX, _ = face_shift(BUD, BUD_RIGHT)

# A twitch rather than a bristle. The spines are there; the nerve is not.
S_BOB = [0, 0, -1, -1, 0, 0, 0, 0]
S_EYES = [None, None, "half", "half", None, None, "blink", None]

G_BOB = [0, 0, -1, -1, -1, 0, 0, 0, 0, 0]
G_HEAD = [None, None, "right", "right", None, "left", None, None, None, None]
G_DX = [0, 0, G_R_DX, G_R_DX, 0, G_L_DX, 0, 0, 0, 0]
G_EYES = [None, None, "half", "half", None, None, None, "blink", None, None]


SPRITE = {
    "herbId": "rudbeckia-hirta",
    "personality": "bristly",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(7, "sprout"),
            "hide": ["mane", "spines", "cheeks"],
            "swap": {
                "cone": LEAF_HEAD,
                "leafL": SEED_LEAF,
                "leafR": SEED_LEAF,
                "stem": SEED_STEM,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "cone": LEAF_HEAD_AT,
                "leafL": (8, 21),
                "leafR": (17, 21),
                "stem": (14, 19),
                **seat_young(LEAF_HEAD_AT, LEAF_HEAD, cheeks=False, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "cone": {"dy": S_BOB},
                "eyes": {"dy": S_BOB, "art": S_EYES},
                "mouth": {"dy": S_BOB},
                "leafL": {"dy": [0, 0, 0, 0, 0, 0, 0, 0]},
                "leafR": {"dy": [0, 0, 0, 0, 0, 0, 0, 0]},
                "stem": {"dy": [0, 0, 0, 0, 0, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(7, "growing"),
            "palette": BUD_PALETTE,
            "swap": {
                "cone": BUD,
                "mane": BUD_MANE,
                "spines": SPINES_FLAT,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
                "cheeks": young_cheeks(face_box(BUD)[2]),
            },
            "variants": {
                "cone": {"left": BUD_LEFT, "right": BUD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "cone": BUD_AT,
                "mane": BUD_MANE_AT,
                "spines": (11, 12),
                "leafL": (8, 20),
                "leafR": (17, 20),
                "stem": (14, 20),
                **seat_young(BUD_AT, BUD, mouth_dy=4),
            },
            "motion": {
                "cone": {"dy": G_BOB, "art": G_HEAD},
                "mane": {"dy": G_BOB},
                "spines": {"dy": G_BOB},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_EYES},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "leafL": {"dy": [0, 0, 0, -1, -1, 0, 0, 0, 0, 0]},
                "leafR": {"dy": [0, 0, 0, -1, -1, 0, 0, 0, 0, 0]},
                "stem": {"dy": [0] * 10},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 7,
    # Mane first so the cone sits in front of it; spines last so they read above both.
    "parts": [
        {"name": "stem", "origin": (14, 20), "rows": STEM},
        {"name": "leafL", "origin": (8, 19), "rows": LEAF_L},
        {"name": "leafR", "origin": (17, 19), "rows": LEAF_R},
        {
            "name": "mane",
            "origin": MANE_AT,
            "rows": MANE,
            "variants": {"lift": MANE_LIFT, "t1": TURN[0], "t2": TURN[1], "t3": TURN[2], "t4": TURN[3]},
        },
        {
            "name": "cone",
            "origin": CONE_AT,
            "rows": CONE,
            "variants": {"left": CONE_LEFT, "right": CONE_RIGHT},
        },
        {
            "name": "spines",
            "origin": SPINES_AT,
            "rows": SPINES_FLAT,
            "variants": {"up": SPINES_UP},
        },
        *feature_parts(CONE_AT, CONE, eyes="round", mouth="small", eye_dy=1, mouth_dy=5),
    ],
    #
    #  0    1     2      3      4      5      6      7      8      9   10   11   12    13
    # rest still ZAP   buzz   buzz   buzz   buzz  settle settle rest rest rest blink rest
    #
    # THE TINGLE, frames 2-8, and it comes off the card rather than out of my head. The back
    # prints TASTE: Bitter, Pungent, TINGLING — the alkamide buzz echinacea is known for, the
    # one that fizzes on the tongue and will not sit still. It also prints AROMATIC: Earthy,
    # Herbal, MILD, so the plant gives you no warning at all. That contrast is the whole
    # character: a quiet, unremarkable-smelling thing that turns out to be electric.
    #
    # So the spines do not merely rise. They snap up on ONE frame — the zap — and then the
    # creature buzzes, shivering a pixel left and right on alternating frames while the
    # bristles hold. A smooth rise was a hedgehog; the jitter is the tingle, and the two
    # together are the plant the card describes.
    #
    # DELIBERATELY NOT THE HEALING TRAITS. The same back prints anti-inflammatory, immune aid
    # and respiratory support, and none of them appears here in any form. A gesture may
    # illustrate what a plant tastes and smells like; it may never illustrate a medicinal
    # effect, which is the rule self-heal already keeps by mending a notch in its OWN leaf.
    #
    # Frame 0 is the rest pose reduced motion freezes on — spines down, rays swept, cone
    # proud — a complete coneflower that claims nothing untrue.
    "motion": {
        # THE PINWHEEL, frames 2-8: the ring steps through four turns and settles back; the face stays still.
        "mane": {
            "art": [None, None, "t1", "t2", "t3", "t4", "t3", "t2", "t1", None, None, None, None, None],
        },
        "spines": {"dy": [0] * 14},
        "cone": {"dy": [0] * 14},
        "eyes": {"art": [None, None, None, None, None, None, None, None, None, "blink", None, None, "half", None]},
        "cheeks": {},
        "mouth": {"art": [None, None, None, None, None, None, None, None, None, "wide", None, None, None, None]},
        # The leaves flinch down half a beat after the spines go up, which is what sells the
        # startle as travelling through the plant rather than happening to the cone alone.
        "leafL": {"dy": [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]},
        "leafR": {"dy": [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
