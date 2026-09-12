"""Purple Coneflower (Echinacea purpurea) - creature portrait sprite.

THE DESIGN HOOK: the name is the creature. `Echinacea` is Greek `echinos`, HEDGEHOG, and the
plant is named for its cone - a stiff, spiny, orange-brown dome that a mature coneflower
carries like a pincushion. Nothing else in the deck is named after an animal, and nothing
else has bristles that move.

TWO HEADS, STACKED, AND THAT IS THE WHOLE COMPOSITION. A coneflower is a ring of ray florets
around a raised disc, so it is drawn as the generator run TWICE: a wide pink-purple mane with
no face at all, and a smaller orange cone laid over its middle with the face carved into that.
The creature is then ray mane outside, spiny cone inside, face in the cone - which is the
plant's real anatomy rather than a daisy with a hat on.

An earlier version put the face on a single small dome and hung the rays beside it as a
separate part. The cone read as a headband and the rays read as pigtails. The mane has to BE
the flower head, the way the dandelion's is; anything sitting on top of it is a second part
layered over, never a substitute for it.

The rays are also drawn SWEPT: on a mature E. purpurea the ray florets reflex backward and
hang, which is why the cone stands so proud, and it is the thing most drawings get wrong.

WHERE THE FACE GOES: in the cone, which is the part the character lives in - and LOW in it,
which took three passes to get right. A cone the same size as the face leaves a 1px orange rim
that reads as a headband, and the sheet next to the dandelion's was a purple dandelion. Growing
the cone until the rim was even all round fixed that and introduced a worse thing: a uniform
band around a cream oval reads as a PICTURE FRAME, because two colour families stacked
concentrically is what a frame is. `face_dy` is the answer - the face sits 1.1px below the
cone's centre, so there are four rows of cone above it and one below, and the organ reads as a
dome RISING over the face rather than a ring around it. Which is also the plant: the thing that
separates a coneflower from a daisy is a disc that stands proud.

PERSONALITY: tingly. Its trademark gesture is THE TINGLE, and it comes off the card rather than
out of my head - the back prints TASTE: Bitter, Pungent, TINGLING against AROMATIC: Earthy,
Herbal, MILD. A quiet, unremarkable-smelling thing that turns out to be electric. The spines
snap up on one frame and then the creature buzzes, shivering a pixel either way while the
bristles hold. `Echinacea` is Greek `echinos`, HEDGEHOG, and the bristles are why; the jitter is
what makes them a tingle rather than a startle.

DELIBERATELY NOT THE HEALING TRAITS. The same back prints anti-inflammatory, immune aid and
respiratory support, and none of them appears here in any form. A gesture may illustrate what a
plant tastes and smells like; it may never illustrate a medicinal effect - the line self-heal
already keeps by mending a notch in its OWN leaf.

COLOUR: rays at ~320 deg, leaves at ~105 deg - far outside the 34 deg either side of its own
flower that the set forbids - with the cone at ~30 deg between them. Midtones stay under the
saturation cap; the pale highlight carries the brightness.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "R": (245, 186, 224, 255),   # ray highlight
    "r": (219, 129, 188, 255),   # ray mid
    "q": (171, 80, 145, 255),    # ray deep
    "Q": (117, 50, 103, 255),    # ray shadow
    "N": (246, 197, 122, 255),   # cone highlight
    "m": (214, 141, 66, 255),    # cone mid
    "b": (160, 94, 44, 255),     # cone deep
    "B": (106, 60, 34, 255),     # cone shadow
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


def _mane(rx=11.4, ry=9.5, light=(-0.85, -0.65)):
    return flower_head(
        MANE_W, MANE_H, MANE_CX, MANE_CY, rx, ry, 13, 0.22, 0, 0,
        light=light, trim_tail=False, chars="RrqQFo",
    )


MANE = _mane()
# The startle: the whole ring lifts and widens a little. Reflexed rays cannot fall further,
# so the only direction they have is up.
MANE_LIFT = _mane(rx=11.9, ry=10.2)

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
    "herbId": "echinacea-purpurea",
    "personality": "tingly",
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
            "variants": {"lift": MANE_LIFT},
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
        # UP AND A ROW WIDER. Spines that only rose would read as the cone growing; the third
        # row appearing is what makes it a bristle.
        "spines": {
            "art": [None, None, "up", "up", "up", "up", "up", "up", None, None,
                    None, None, None, None],
            # -3 on the very first frame of the zap: the snap is the point.
            "dy": [0, 0, -3, -3, -3, -3, -3, -2, -1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 1, -1, 1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        # The cone rises barely. A dome travelling as far as its own spines would read as the
        # head coming off the stem.
        "cone": {
            "art": [None, None, None, None, None, None, None, "left", None, None,
                    None, None, None, None],
            "dx": [0, 0, 0, 1, -1, 1, -1, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        # The mane lifts and widens with the startle, then settles.
        "mane": {
            "art": [None, None, "lift", "lift", "lift", "lift", "lift", None, None,
                    None, None, None, None, None],
            "dy": [0, 0, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            # Eyes WIDE on the zap, not shut. Something just happened to this plant.
            "art": [None, None, None, None, None, None, None, "half", None, None,
                    None, None, "blink", None],
            "dx": [0, 0, 0, 1, -1, 1, -1, L_DX, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, 0, 1, -1, 1, -1, L_DX, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "wide", "wide", "wide", "wide", "wide", None, None,
                    None, None, None, None, None],
            "dx": [0, 0, 0, 1, -1, 1, -1, L_DX, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        # The leaves flinch down half a beat after the spines go up, which is what sells the
        # startle as travelling through the plant rather than happening to the cone alone.
        "leafL": {"dy": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]},
        "leafR": {"dy": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
