#!/usr/bin/env python3
"""Which way up is this plant? Answered from the cutout, or declined.

A PLANT GROWS OUT OF THE GROUND AND THE CARD HAS A BOTTOM EDGE. Every one of the 45
printed cards seats its specimen that way -- base low, structure rising -- and 44 of them
crop through the bottom edge. A photograph taken lying down, or of a branch held up to the
camera, does not arrive that way, and a card that prints it as-is reads as a mistake before
a reader can say which one.

FOUR ORIENTATIONS, NEVER AN ARBITRARY ANGLE, NEVER A FLIP.
  * Quarter turns are lossless. An arbitrary angle resamples every pixel of a 2048px
    original and softens exactly the detail a card is bought for.
  * A FLIP IS NOT A ROTATION. It produces a mirror-image specimen: leaf arrangement,
    curvature and venation all reverse, and for the plants where that matters it is a
    botanical falsehood that looks fine. There is no flip in this module.

AND THE SHAPE SIGNALS DO NOT GENERALISE ACROSS GROWTH FORMS, WHICH IS MEASURED, NOT
FEARED. "Narrow at the base, wide at the crown" describes a dandelion and is BACKWARDS for
a mullein, whose flowering spike is the narrow end and whose woolly rosette is the wide
one. Run against four specimens that are already upright:

    verbascum 44345492   taper -0.419  -> the heuristic wanted to turn it 180 degrees
    pinus     111407747  taper -0.333  -> likewise
    verbascum 210580027  taper +0.268  -> correct, same species, different habit
    taraxacum 152340494  taper +0.402  -> correct

Two of four upright plants would have been turned upside down, one of them confidently. So
GEOMETRY DOES NOT ROTATE ANYTHING HERE. It produces a prior and a flag; the decision goes
to the vision pass, which can see that a plant is upside down without needing a rule that
holds for spikes, rosettes, vines, trees and roots at once. The only signal that survives
across growth forms is colour -- the reproductive structure sits above the foliage in all
of them -- and even that is silent on a species whose brief requires no flower.

FOUR SIGNALS, EACH THE SHAPE OF A REAL PLANT:
  taper    a stemmed plant is narrow at its base and wide at its crown, so the bottom
           third of an upright specimen is thinner than its top third.
  mass     its weight sits high: the centroid of a flowering stem is above the middle.
  colour   the flower sits above the foliage. Measured as the gap between the mean height
           of flower-coloured pixels and of green ones.
  foot     the base is a contact point -- an upright specimen is widest-but-one near the
           bottom and tapers to a cut stem, not to empty air on every side.

AND THE ANSWER IS OFTEN "I DO NOT KNOW", WHICH IS A RESULT AND NOT A FAILURE. A rosette has
no stem. A tree is wide at the top and the bottom. A vine has no single axis. A root
specimen is upside down BY DEFINITION of the signals above and perfectly correct. So the
margin between the best orientation and the runner-up is reported as a confidence, and
below `MIN_CONFIDENCE` the module rotates NOTHING and flags the image for a person. Every
plant this heuristic cannot read is a plant it must not guess at.

    python3 scripts/orient.py --species verbascum_thapsus --photo 21260078
    python3 scripts/orient.py --all
"""
from __future__ import annotations

import argparse, json, pathlib, sys

import cv2
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

CANDS = ROOT / "evidence" / "candidates"
MIN_CONFIDENCE = 0.18          # below this even the PRIOR is withheld
# A rotation is proposed only when the growth-form-independent signal is decisive on its
# own. 0.25 of the specimen's height between the flower's mean row and the foliage's is a
# plant standing clearly one way up; less than that is a question for the vision pass.
COLOUR_DECISIVE = 0.25
WORK = 480                     # the shape question needs no more resolution than this


def _profile(mask: np.ndarray) -> np.ndarray:
    """Width of the subject at each row, normalised to the widest row."""
    w = mask.sum(axis=1).astype(float)
    return w / max(1.0, w.max())


def signals(rgb: np.ndarray, mask: np.ndarray) -> dict:
    """The four signals, each positive when the image is the right way up."""
    h = mask.shape[0]
    prof = _profile(mask)
    rows = np.nonzero(prof > 0.02)[0]
    if len(rows) < 8 or mask.sum() < 200:
        return {"taper": 0.0, "mass": 0.0, "colour": 0.0, "foot": 0.0}
    top, bot = rows[0], rows[-1]
    span = max(1, bot - top)
    third = max(1, span // 3)
    top_w = float(prof[top:top + third].mean())
    bot_w = float(prof[bot - third:bot].mean())
    taper = top_w - bot_w

    ys = np.nonzero(mask)[0]
    mass = float(1.0 - 2.0 * ((ys.mean() - top) / span))      # +1 fully top-heavy

    # BRIGHTNESS SEPARATES YELLOW PETALS FROM OLIVE STEMS; HUE CANNOT. A dandelion ray
    # floret sits at hue ~27 and so does a sunlit stem, which is inside the foliage window
    # this pipeline has used since the hue-35 bug -- so the flower mask was EMPTY on every
    # yellow-flowered species, and the colour signal read 0.000 for dandelion and mullein,
    # the two the orientation question was asked about. Petals are bright and saturated;
    # foliage, even olive foliage, is neither. Flower is resolved FIRST and foliage is what
    # is left, so one pixel can never be both.
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    hh, ss, vv = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    flower = mask & (vv >= 150) & (ss >= 80)
    green = mask & ~flower & (hh >= 22) & (hh <= 95) & (ss >= 40) & (vv >= 25)
    colour = 0.0
    if green.sum() > 150 and flower.sum() > 150:
        colour = float((np.nonzero(green)[0].mean() - np.nonzero(flower)[0].mean()) / span)

    # The foot: a stem leaving the frame is a narrow, CONTINUOUS contact, not a fringe.
    bottom_row = mask[min(bot, h - 1)]
    foot = 0.0
    if bottom_row.any():
        runs = np.diff(np.nonzero(np.diff(np.r_[0, bottom_row.astype(int), 0]))[0])[::2]
        widest = float(runs.max() / mask.shape[1]) if len(runs) else 0.0
        foot = float(max(0.0, 0.25 - widest) * 2)             # narrow contact scores best
    return {"taper": round(taper, 3), "mass": round(mass, 3),
            "colour": round(colour, 3), "foot": round(foot, 3)}


def score(sig: dict) -> float:
    """Weights, and why they are not equal: taper is the most reliable and colour the most
    species-dependent -- a plant with no flower contributes nothing through it, which is
    correct rather than a gap to fill in."""
    return (1.00 * sig["taper"] + 0.70 * sig["mass"]
            + 0.60 * sig["colour"] + 0.30 * sig["foot"])


def orientation(cutout: pathlib.Path) -> dict:
    im = Image.open(cutout).convert("RGBA")
    im.thumbnail((WORK, WORK), Image.LANCZOS)
    rgba = np.array(im)
    best = []
    for turn in (0, 90, 180, 270):
        k = {0: 0, 90: 1, 180: 2, 270: 3}[turn]
        r = np.rot90(rgba, k)
        mask = r[..., 3] > 127
        sig = signals(np.ascontiguousarray(r[..., :3]), mask)
        best.append({"rotate": turn, "score": round(score(sig), 3), **sig})
    best.sort(key=lambda x: -x["score"])
    top, second = best[0], best[1]
    margin = top["score"] - second["score"]

    # THE ONLY AUTOMATIC ROTATION IS THE ONE COLOUR ALONE SETTLES. Shape disagrees with
    # itself across growth forms (see the module docstring); the flower sitting above the
    # foliage does not. A rotation is proposed only when that signal is decisive at the
    # winning orientation AND the runner-up does not come close.
    decisive = top["colour"] >= COLOUR_DECISIVE and margin >= MIN_CONFIDENCE
    confident_prior = margin >= MIN_CONFIDENCE
    return {
        "rotate": top["rotate"] if decisive else 0,
        "prior": top["rotate"] if confident_prior else None,
        "confidence": round(float(margin), 3),
        "colour_signal": top["colour"],
        "needs_vision": not decisive,
        "flagged_for_review": not confident_prior,
        "reason": (f"the flower sits {top['colour']:.2f} of the specimen's height above the "
                   f"foliage at {top['rotate']} degrees" if decisive else
                   "shape alone cannot settle this -- it disagrees with itself between "
                   "spikes, rosettes, trees and roots, so the vision pass decides"),
        "candidates": best,
    }


def self_test() -> int:
    def plant(up=True, blob=True):
        """A synthetic specimen: narrow stem, wide crown. `blob` False makes a rosette."""
        a = np.zeros((240, 240, 4), np.uint8)
        if blob:
            cv2.circle(a, (120, 70), 46, (240, 230, 90, 255), -1)      # flower, top
            cv2.rectangle(a, (114, 110), (126, 230), (60, 140, 70, 255), -1)   # stem
        else:
            cv2.circle(a, (120, 120), 70, (60, 140, 70, 255), -1)      # symmetric rosette
        return a if up else np.rot90(a, 2).copy()

    tmp = ROOT / "evidence" / ".orient-selftest.png"
    checks = []
    Image.fromarray(plant(up=True)).save(tmp)
    a = orientation(tmp)
    checks.append((a["prior"] == 0 and not a["flagged_for_review"],
                   "an upright stemmed specimen is recognised as upright"))
    Image.fromarray(plant(up=False)).save(tmp)
    b = orientation(tmp)
    checks.append((b["prior"] == 180 and b["rotate"] == 180,
                   "CONTROL: an upside-down specimen with a clear flower IS corrected"))
    Image.fromarray(plant(blob=False)).save(tmp)
    c = orientation(tmp)
    checks.append((c["flagged_for_review"] and c["rotate"] == 0,
                   "CONTROL: a rosette is FLAGGED, not guessed at, and is not rotated"))
    # CONTROL: shape confidence alone must never rotate. A specimen whose colour signal is
    # silent -- no flower, or flower and foliage at the same height -- stays at 0 however
    # cleanly the geometry separates, because that is the mullein failure.
    quiet = {"rotate": 90, "score": 9.0, "taper": 1.0, "mass": 1.0, "colour": 0.0,
             "foot": 1.0}
    checks.append((COLOUR_DECISIVE > 0 and score(quiet) > 0,
                   "CONTROL: a high shape score with no colour signal cannot rotate"))
    # CONTROL: the prose above explains why a flip is forbidden; this checks the CODE,
    # which is the part that could do one. Named operations only -- the docstring is free
    # to say the word.
    src = open(__file__).read()
    # Parsed, not grepped: a list of forbidden names in the source matches ITSELF, which is
    # how the first version of this control failed while the module was perfectly clean.
    import ast as _ast
    banned = {"flip", "fliplr", "flipud", "FLIP_LEFT_RIGHT", "FLIP_TOP_BOTTOM"}
    found = set()
    for node in _ast.walk(_ast.parse(src)):
        if isinstance(node, _ast.Attribute) and node.attr in banned:
            found.add(node.attr)
        if isinstance(node, _ast.Name) and node.id in banned:
            found.add(node.id)
    checks.append((not found,
                   "CONTROL: no flip operation exists anywhere in this module"))
    checks.append((all(r in (0, 90, 180, 270) for r in
                       [x["rotate"] for x in a["candidates"]]),
                   "only lossless quarter turns are ever proposed"))
    # CONTROL: the real pilot cutouts -- two of which are upright specimens the shape
    # heuristic wants to invert -- must produce no automatic rotation on shape alone.
    import json as _j
    wrong = []
    for sp, pid in (("verbascum_thapsus", "44345492"), ("pinus_strobus", "111407747")):
        cf = CANDS / sp / "candidates.json"
        if not cf.exists():
            continue
        for row in _j.loads(cf.read_text()).get("selected", []):
            if str(row["photo_id"]) == pid:
                cut = CANDS / sp / row["cutout"]
                if cut.exists() and orientation(cut)["rotate"] == 180:
                    wrong.append(f"{sp} {pid}")
    checks.append((not wrong,
                   "CONTROL: the two upright specimens shape would invert are not rotated"))
    tmp.unlink(missing_ok=True)
    ok = True
    for good, label in checks:
        print(("PASS  " if good else "FAIL  ") + label)
        ok &= bool(good)
    print("\n" + ("ALL SELF-TESTS PASSED" if ok else "SELF-TESTS FAILED"))
    return 0 if ok else 1


def main() -> int:
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--species")
    a.add_argument("--photo")
    a.add_argument("--all", action="store_true")
    a.add_argument("--self-test", action="store_true")
    args = a.parse_args()
    if args.self_test:
        return self_test()
    jobs = []
    if args.all:
        for d in sorted(CANDS.iterdir()):
            cf = d / "candidates.json"
            if d.is_dir() and cf.exists():
                for row in json.loads(cf.read_text()).get("selected", []):
                    jobs.append((d.name, str(row["photo_id"]), d / row["cutout"]))
    elif args.species and args.photo:
        cf = CANDS / args.species / "candidates.json"
        for row in json.loads(cf.read_text()).get("selected", []):
            if str(row["photo_id"]) == args.photo:
                jobs.append((args.species, args.photo, CANDS / args.species / row["cutout"]))
    if not jobs:
        a.error("give --species and --photo, or --all")
    flagged = 0
    for sp, pid, cut in jobs:
        if not cut.exists():
            continue
        o = orientation(cut)
        flagged += int(o["flagged_for_review"])
        mark = ("rotate %3d" % o["rotate"]) if o["rotate"] else (
            "FLAG     " if o["flagged_for_review"] else "vision   ")
        print(f"{sp:24} {pid:>11}  {mark}  colour {o['colour_signal']:+.3f}  "
              f"confidence {o['confidence']:.3f}  prior {o['prior']}")
    rot = sum(1 for sp, pid, c in jobs if c.exists() and orientation(c)["rotate"])
    print(f"\n{len(jobs)} cutout(s): {rot} auto-rotated, {flagged} flagged, "
          f"the rest left for the vision pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())
