"""Milk Thistle (Silybum marianum) - creature portrait sprite.

THE DESIGN HOOK is the armour. A Silybum head is not simply spiny: its involucral bracts are
broad leathery plates that each taper into a long stiff spine, and they CURVE OUTWARD around
the flower like a collar of blades. Every other thistle is prickly; this one is built.

THE OTHER HALF OF THE IDENTITY IS THE MARBLING, and it is the single character that tells
this plant from every other thistle at a glance - glossy dark leaves veined and blotched
with milky white, which is what names the species in most languages. It is drawn as white
pixels ON the leaves rather than as a separate part, because a vein is not an organ.

WHERE THE FACE GOES: in the floret head, carved out of the generator. The bracts are a
SECOND part laid around it, not the thing carrying the face - the lesson the coneflower
learned twice over. An organ centred on the face reads as a picture frame, so the bracts sit
BELOW the head's middle and spread sideways, which is where they actually are on the plant.

PERSONALITY: guarded. Its trademark gesture is THE GUARD - the bracts sweep up and close
around the head, the creature narrows its eyes behind them, and after a beat the collar
settles back down. It is NOT a threat display. Nettle already bristles outward with its
brows down and calls it THE BLUFF; this one folds inward and covers something, which is the
opposite posture for the opposite reason.

THIS ILLUSTRATES A STRUCTURE AND NOT AN EFFECT. The card prints liver support,
anti-inflammatory, antioxidant and glucose regulation, and not one of them appears here in
any form - a gesture may show what a plant IS, never it treating anything, which is the line
self-heal keeps by mending a notch in its OWN leaf. The plant guards itself and nobody else.

Frame 0 has the collar DOWN and the eyes open. A gesture may close a plant up and this one
does, but at rest a plant is one plant and a permanently shut guard would be a different
creature.

COLOUR: leaves at ~159 deg, a glaucous blue-green in the gap between burdock and wild mint,
which is both an unoccupied part of the band and the true colour of this plant - Silybum
foliage is notably cool and waxy where most thistles are grey. The florets sit at ~312 and
the bracts at ~80, so the flower is 153 deg off the foliage, far outside the 34 deg either
side the set forbids. The marbling is near-white at very low saturation so it reads as
sheen rather than as a sixth colour. Midtones stay under the saturation cap.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits apart
from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "G": (122, 184, 162, 255),   # leaf highlight
    "g": (85, 155, 130, 255),    # leaf mid
    "d": (60, 114, 95, 255),     # leaf deep
    "n": (41, 76, 64, 255),      # leaf shadow
    "M": (225, 234, 231, 255),   # the milky marbling
    "P": (208, 108, 188, 255),   # floret, lit
    "p": (181, 64, 158, 255),    # floret, mid
    "q": (150, 47, 130, 255),    # floret, deep
    "Q": (112, 34, 97, 255),     # floret, shadow
    "b": (153, 174, 111, 255),   # bract
    "B": (111, 129, 75, 255),    # bract shadow
    "s": (196, 208, 150, 255),   # spine tip
}

# --- The head ----------------------------------------------------------------
#
# NINETEEN VERY SHALLOW LOBES. A thistle head is a dense brush of tiny florets, so the rim
# wants to be finely broken rather than scalloped: at amplitude 0.07 across 25 pixels that
# reads as texture, where the mallow's eleven at 0.09 read as a crimped leaf.
HEAD_W, HEAD_H = 25, 17


def _head(rx=10.6, ry=7.0, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 12.0, 8.0, rx, ry, 19, 0.07, 5.4, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="PpqQFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))

HEAD_AT = (3, 2)

L_DX, _ = face_shift(HEAD, HEAD_LEFT)
R_DX, _ = face_shift(HEAD, HEAD_RIGHT)

# --- The bracts --------------------------------------------------------------
#
# A COLLAR, NOT A RING. Drawn as two wings that meet under the head and spread outward and
# slightly down, each ending in a spine - which is the plant's own geometry and also what
# keeps this from being a frame around the face. Painted AFTER the head so the spines cross
# in front of it, and routed clear of the face so nothing lands on an eye.
BRACTS = [
    "s         s",
    "obo     obo",
    " obbo obbo ",
    "  obbbbbo  ",
    "   oBBBo   ",
]

# Swept up and closed in. The wings rise and the spines converge over the head's shoulders;
# the shape stays the same width so the collar reads as tilting rather than growing.
BRACTS_UP = [
    " s       s ",
    " obo   obo ",
    "  obbobbo  ",
    "  obbbbbo  ",
    "   oBBBo   ",
]

# Flared. The wings drop and the spines throw wide — the half-beat before the collar comes
# up, and the reason this reads as armour working rather than a hood being pulled on.
BRACTS_WIDE = [
    "s         s",
    "o         o",
    "obo     obo",
    " obbo obbo ",
    "  oBBBBBo  ",
]

BRACTS_AT = (11, 14)

# --- The leaves --------------------------------------------------------------
#
# THE MARBLING IS THE POINT OF THIS PART. Two lobed leaves flanking the stem, each carrying
# white along its veins. Without it they are just leaves and this is just a thistle.
LEAF_L = [
    "ogMgo ",
    "odMggo",
    "ogMMgo",
    " odggo",
    "  ooo ",
]

LEAF_R = [
    " ogMgo",
    "oggMdo",
    "ogMMgo",
    "oggdo ",
    " ooo  ",
]

LEAF_L_AT = (9, 19)
LEAF_R_AT = (18, 19)

# --- The stem ----------------------------------------------------------------
#
# ONE STEM, AND IT IS THICK. Silybum carries a heavy head on a single stout stalk; the
# multi-stemmed base that suits a shrub would read as a clump of grass under this weight.
STEM = [
    "oggo",
    "oggo",
    "oggo",
    "oggo",
    "oddo",
    "oooo",
]

STEM_AT = (14, 19)

# --- Growth stages -----------------------------------------------------------
#
#   sprout    a small marbled rosette leaf and nothing else. THAT IS THE TRUE FIRST YEAR OF
#             THIS PLANT: Silybum spends its first season as a flat rosette of marbled
#             leaves and sends up a stem only in the second, so a sprout with a flower head
#             on it would be inventing a stage the species does not have.
#   growing   a head has formed but the collar has not hardened - bracts present, no spines.
#   flowering full head, full armoured collar, and the guard.

YOUNG_W, YOUNG_H = 19, 12


def _young(rx=8.0, ry=5.0, light=(-0.85, -0.65)):
    return flower_head(
        YOUNG_W, YOUNG_H, 9.0, 5.8, rx, ry, 11, 0.10, 5.4, 3.4,
        face_dy=0.6, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG = _young()
YOUNG_AT = (6, 12)

YOUNG_STEM = [
    "oggo",
    "oddo",
    "oooo",
]

MID_W, MID_H = 21, 15


def _mid(rx=8.8, ry=6.2, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        MID_W, MID_H, 10.0, 7.0, rx, ry, 19, 0.07, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="PpqQFo",
    )


MID = _mid()
MID_LEFT = _mid(face_dx=-1.3, light=(-0.35, -0.65))
MID_RIGHT = _mid(face_dx=1.3, light=(-1.25, -0.65))

MID_AT = (5, 7)

G_L_DX, _ = face_shift(MID, MID_LEFT)
G_R_DX, _ = face_shift(MID, MID_RIGHT)

# No spine tips: a half-grown head has bracts that have not hardened yet.
MID_BRACTS = [
    "obo     obo",
    " obbo obbo ",
    "  obbbbbo  ",
    "   oBBBo   ",
]

S_BOB = [0, 0, -1, -1, 0, 0, 0, 0]
S_EYES = [None, None, "half", "half", None, None, "blink", None]

G_BOB = [0, 0, 1, -1, -1, -1, 0, 0, 0, 0]
G_HEAD = [None, None, None, "right", "right", "left", None, None, None, None]
G_DX = [0, 0, 0, G_R_DX, G_R_DX, G_L_DX, 0, 0, 0, 0]
G_EYES = [None, None, "half", None, None, None, None, "blink", None, None]


SPRITE = {
    "herbId": "silybum-marianum",
    "personality": "guarded",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "hide": ["bracts", "leafL", "leafR", "cheeks"],
            "swap": {
                "head": YOUNG,
                "stem": YOUNG_STEM,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "head": YOUNG_AT,
                "stem": (14, 23),
                **seat_young(YOUNG_AT, YOUNG, cheeks=False, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "head": {"dy": S_BOB},
                "eyes": {"dy": S_BOB, "art": S_EYES},
                "mouth": {"dy": S_BOB},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "hide": ["leafL", "leafR"],
            "swap": {
                "head": MID,
                "bracts": MID_BRACTS,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
                "cheeks": young_cheeks(face_box(MID)[2]),
            },
            "variants": {
                "head": {"left": MID_LEFT, "right": MID_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "head": MID_AT,
                "bracts": (11, 18),
                "stem": (14, 19),
                **seat_young(MID_AT, MID, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "head": {"dy": G_BOB, "art": G_HEAD},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_EYES},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
            },
        },
    },
    "size": (32, 28),
    "frames": 12,
    "fps": 8,
    # Stem and leaves behind, head over them, bracts LAST so the spines cross in front of
    # the head — which is what a collar standing proud of a flower actually does.
    "parts": [
        {"name": "stem", "origin": STEM_AT, "rows": STEM},
        {"name": "leafL", "origin": LEAF_L_AT, "rows": LEAF_L},
        {"name": "leafR", "origin": LEAF_R_AT, "rows": LEAF_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="narrow", mouth="line", eye_dy=1, mouth_dy=4),
        {
            "name": "bracts",
            "origin": BRACTS_AT,
            "rows": BRACTS,
            "variants": {"up": BRACTS_UP, "wide": BRACTS_WIDE},
        },
    ],
    #
    #  0    1    2      3      4      5      6      7     8     9    10    11
    # rest rest close  close  hold   hold   hold  open  settle rest blink rest
    #
    # THE GUARD. The collar comes up on 2-3, holds shut through 4-6 while the eyes narrow
    # behind it, opens on 7 and settles on 8. It is slow at both ends on purpose: a fast
    # snap would read as a trap closing, and this plant is covering something rather than
    # catching anything.
    #
    # The head DIPS a pixel as the collar rises, which is the creature drawing back into
    # its own armour rather than the armour arriving around a plant that has not noticed.
    "motion": {
        # FLARE, THEN CLOSE. The first pass raised the collar two pixels and called it a
        # gesture; a plate of armour that shifts by two pixels reads as a shrug. It now
        # drops and spreads on frame 2, sweeps up four pixels over 3-4, holds shut, and
        # opens in two stages rather than one so the release is as deliberate as the close.
        "bracts": {
            "art": [None, None, "wide", "up", "up", "up", "up", "up", "wide", None,
                    None, None],
            "dy": [0, 0, 1, -2, -4, -4, -4, -3, 1, 0, 0, 0],
        },
        # The head sinks INTO the collar as it rises. Two pixels down against four up is
        # six pixels of relative travel, which is what makes the creature look covered
        # rather than merely surrounded.
        "head": {
            "dy": [0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "wide", "half", "half", "half", "half", "half", "half",
                    None, "blink", None],
            "dy": [0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0],
        },
        "cheeks": {
            "dy": [0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, "frown", "frown", "frown", "frown", "frown", None,
                    None, None, None],
            "dy": [0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0],
        },
        # THE LEAVES STIFFEN AND LIFT, a frame behind the collar. A rosette going rigid is
        # the rest of the plant joining in; without it the armour is a hat and the body
        # underneath has not noticed.
        "leafL": {
            "dy": [0, 0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0],
            "dx": [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        },
        "leafR": {
            "dy": [0, 0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0],
            "dx": [0, 0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0],
        },
        # And the stout stem compresses by a pixel under the whole thing, which is the only
        # movement it is allowed: Silybum holds a heavy head on one thick stalk, and a stem
        # that swayed would make this a grass.
        "stem": {
            "dy": [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
        },
    },
    "palette": PALETTE,
}
