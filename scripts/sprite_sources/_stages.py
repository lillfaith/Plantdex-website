"""Shared pieces for the growth stages of a creature portrait.

Exists for exactly the reason `_flowerhead.py` and `_face.py` do: the same few mistakes
were about to be made forty-five times. A stage reseats a whole face onto a different
organ, picks a calmer loop and redraws a younger body, and each of those has one right
way to do it that is easy to get subtly wrong by hand.

WHAT A STAGE MEANS, BOTANICALLY. The three stages are the plant's own life, not three
sizes of the same picture:

    sprout      vegetative only. Leaves, and NO flower structure of any kind — not a
                small flower, not a pale one. A seedling has not made one yet, and
                drawing one anyway is inventing botany.
    growing     in BUD. The flower exists and is closed: tight, usually green or only
                just showing its colour through the bracts. This is the stage that
                earns the sequence, because a bud is a different ORGAN from an open
                flower rather than a smaller copy of one.
    flowering   open. This is the authored adult portrait, unchanged.

WHAT A STAGE MEANS, AS A CHARACTER. The creature is the same creature throughout, so its
face never goes and its personality never changes — only its nerve and its strength. A
younger stage does the adult's own gesture with the follow-through taken out, slower, and
smaller. Growing up is the animation speeding up and the plant standing taller, which is
why `stage_fps` rises and `STAGE_HEIGHT` steps evenly.
"""

from _face import EYES, MOUTHS, on_face

# Round eyes, NOT the big pair, and this was learned the expensive way. Big eyes on a
# small head is the oldest shorthand for "young", but `big` needs ten pixels of face to sit
# in, and on a fifteen-pixel seedling that leaves the organ as a rim of green around a
# face. Four species drawn that way came out as four near-identical pale discs — which
# breaks the rule the whole deck rests on, that no two species may be interchangeable.
#
# Youth is carried by PROPORTION instead: a head that is large relative to its body, on a
# plant that is short. That reads just as young and leaves room for the leaf, the bud or
# the frond that says which plant this actually is.
YOUNG_EYES = EYES["round"]
YOUNG_MOUTH = MOUTHS["small"]

# Sized from the face, never from the eyes: a blush is by definition the thing nearest
# the rim, so it has no margin to give away. `_face.feature_parts` sizes the adult's the
# same way and for the same reason.
def young_cheeks(face_width: int) -> list[str]:
    return ["c" + " " * max(2, face_width - 4) + "c"]


# How tall each stage stands, as a fraction of the adult's own drawn height. Even steps,
# because uneven ones read as an accident rather than as growth — and measured from the
# INK, not the canvas, since every stage shares one canvas.
STAGE_HEIGHT = {"sprout": 0.60, "growing": 0.80, "flowering": 1.0}

# Frames per second by stage, as a fraction of the adult's. A young plant moves slowly
# and a mature one moves with conviction; speeding the loop up is how strength reads
# without changing what the creature does.
STAGE_FPS = {"sprout": 0.6, "growing": 0.8, "flowering": 1.0}


def stage_fps(adult_fps: int, stage: str) -> int:
    """The frame rate this stage runs at. Always at least 4 — below that it stutters."""
    return max(4, round(adult_fps * STAGE_FPS[stage]))


def seat_young(
    head_at,
    head_rows,
    eyes=None,
    mouth=None,
    cheeks=True,
    eye_dy=1,
    mouth_dy=5,
):
    """Origins for a young face, MEASURED off the head it sits on.

    Never computed from the radii that produced that head: `flower_head` trims empty rows
    and the shading moves the face patch, so the parameters do not tell you where the face
    landed. A stage swaps the organ under the face entirely, which is precisely where a
    guessed origin puts an eye in a leaf.

    `eyes` defaults to the round young pair, which needs eight pixels of face. A narrower
    organ than that cannot seat them — forcing it merges the pupils into one dark band — so
    the build fails here rather than shipping it. Widen the organ, or pick a narrower pair
    from `_face.EYES`, which exists so a species chooses from a shared vocabulary instead of
    hand-rolling a pair that comes out one pixel off centre.
    """
    from _face import face_box

    eyes = eyes or YOUNG_EYES
    mouth = mouth or YOUNG_MOUTH
    _, _, face_w, _ = face_box(head_rows)
    need = max(len(row) for row in eyes["rows"]) + 2
    if face_w < need:
        raise SystemExit(
            f"a {face_w}px face cannot seat {need - 2}px eyes — widen the organ or use a "
            f"narrower pair from _face.EYES"
        )
    seats = {
        "eyes": on_face(head_at, head_rows, eyes["rows"], dy=eye_dy),
        "mouth": on_face(head_at, head_rows, mouth["rows"], dy=mouth_dy),
    }
    if cheeks:
        seats["cheeks"] = on_face(
            head_at, head_rows, young_cheeks(face_w), dy=mouth_dy - 1
        )
    return seats


def timid(frames: int, rise: int = 1):
    """A loop for a plant that has not grown into itself yet.

    Gathers, lifts barely off the ground, checks both ways to see whether anyone noticed,
    settles. It is the adult's own gesture with the commitment removed, which is what
    reads as shy rather than merely slow — a seedling performing the adult's full
    performance is just the adult drawn small.

    Returns `(bob, head_art, face_dx_track, blink)` as plain lists, so a species can use
    them directly or take one and hand-write the rest.
    """
    bob = [0] * frames
    head = [None] * frames
    blink = [None] * frames
    bob[1] = 1                      # gather
    for i in range(2, frames - 2):
        bob[i] = -rise
    head[1] = "squash"
    peek_l = max(2, frames // 2 - 1)
    peek_r = peek_l + 1
    head[peek_l] = "left"
    head[peek_r] = "right"
    blink[frames - 2] = "blink"
    return bob, head, blink, (peek_l, peek_r)


def budding(frames: int, rise: int = 2):
    """A loop for a plant in bud: a real hop, and the beginnings of confidence.

    Everything up to the adult's trademark and not including it. Whatever a species does
    that nothing else in the set does — dandelion's full spin, clover's fourth leaflet —
    stays with the open flower, so mastery buys something the player can actually see.
    """
    bob = [0] * frames
    head = [None] * frames
    blink = [None] * frames
    bob[1] = 1
    head[1] = "squash"
    top = range(2, max(3, frames // 2))
    for i in top:
        bob[i] = -rise
    head[2] = "stretch"
    land = max(3, frames // 2)
    bob[land] = 1
    head[land] = "squash"
    blink[frames - 1] = "blink"
    return bob, head, blink, land
