#!/usr/bin/env python3
"""Is this photograph CAPABLE of becoming the card? Asked before anything is cut.

THE CASE THAT FORCED THIS. Elderberry 424182823 is a good photograph of a berry cyme.
Segmented by four different models it keeps between 0.006 and 0.018 of the frame's
foliage; guided by hand with a box and hint points it comes out crisper and still has no
leaves. Nothing was wrong with the segmentation. The photograph is a close-up of fruit
against a wall of OTHER foliage, and the cyme's own leaves are not separably in it. No
method can extract a structure a photograph does not separate.

So the question moves earlier. A candidate is screened on its SOURCE, before BiRefNet runs
and before a human is asked to choose between three of them, and a photograph that cannot
become the card is marked UNSUITABLE and sent back to retrieval rather than down the
pipeline to be rescued.

WHAT IS ASKED, AND WHAT IS DELIBERATELY NOT:

  PRESENT    the species' defining structure is there, above a floor. Measured.
  COHERENT   that structure is ONE mass rather than scattered through the frame. A cyme
             spread as fifty specks across a hedge is a photograph of a hedge. Measured.
  COMPANION  at least one supporting structure -- foliage, stem, branch -- is also present.
             For elderberry that is the "fruit cluster plus at least one attached leaf or
             stem" rule, as far as a colour screen can carry it. Measured.

  ATTACHED   whether that leaf belongs to THIS plant is NOT measured here and cannot be.
             Attachment is a question about what is behind what, and a hue histogram has
             no opinion about it. A candidate that passes all three above is `needs_vision`
             rather than `suitable`, and the vision pass settles it looking at the frame.

A SCREEN THAT CANNOT SAY YES. This module can reject and can defer; it never certifies. The
failure it exists to prevent is a photograph reaching an art director as one of three
options when it was never a candidate, and that is a job you can do by ruling things out.

    python3 scripts/suitability.py --species sambucus_canadensis
    python3 scripts/suitability.py --all
"""
from __future__ import annotations

import argparse, json, pathlib, sys

import cv2
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import visual_brief                                   # noqa: E402

PHOTOS = ROOT / "evidence" / "photos"
WORK = 900

# Floors, per structure family rather than per species: a share this small is not a
# photograph OF that structure. Measured against the printed cards' own art windows, where
# the defining structure never falls below roughly a twentieth of the subject.
PRESENT_FLOOR = {"berry_dark": 0.030, "berry_red": 0.030, "flower_yellow": 0.025,
                 "flower_white": 0.030, "needles": 0.040, "foliage": 0.040}
DEFAULT_FLOOR = 0.030
# The defining structure must be ONE mass. 0.45 is the share of its own pixels the largest
# connected piece must hold -- below that it is scattered through the frame.
COHERENT_AT = 0.45
# Companion families that can satisfy "and at least one attached leaf or stem".
COMPANIONS = ("foliage", "needles")
# THE VERDICTS THIS SCREEN CAN REACH, AND "suitable" IS NOT AMONG THEM. It rules things
# out; certifying a photograph needs an eye on it. Declared as a constant so the control
# in the self-test can assert the set rather than grep for a word.
VERDICTS = ("unsuitable", "needs_vision", "unscreened")


def masks_for(bgr: np.ndarray) -> dict:
    """The structure masks themselves, not their shares -- coherence needs the pixels."""
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    H, S, V = hsv[:, :, 0].astype(int), hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
    out = {
        "flower_yellow": (H >= 18) & (H <= 32) & (S > 130) & (V > 120),
        "flower_white": (V > 165) & (S < 60),
        "berry_dark": (V < 125) & (S > 55) & (H >= 110) & (H <= 175),
        "berry_red": (((H <= 10) | (H >= 170)) & (S > 120) & (V > 70) & (V < 200)),
        "foliage": ((H >= 25) & (H <= 95) & (S > 35) & (V > 35)
                    & ~((H <= 32) & (S > 130) & (V > 120))),
    }
    green_any = (H >= 35) & (H <= 100) & (S > 40) & (V > 35)
    eroded = cv2.erode(green_any.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    out["needles"] = green_any & ~cv2.dilate(eroded.astype(np.uint8),
                                             np.ones((5, 5), np.uint8)).astype(bool)
    return out


def largest_share(mask: np.ndarray) -> float:
    """How much of this structure is in its single biggest piece."""
    m = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, _, st, _ = cv2.connectedComponentsWithStats(m, 8)
    if n <= 1 or m.sum() == 0:
        return 0.0
    areas = st[1:, cv2.CC_STAT_AREA]
    return float(areas.max() / max(1, areas.sum()))


def screen(src: pathlib.Path, brief: dict) -> dict:
    im = Image.open(src).convert("RGB")
    im.thumbnail((WORK, WORK), Image.LANCZOS)
    bgr = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    m = masks_for(bgr)
    n = float(bgr.shape[0] * bgr.shape[1])
    share = {k: float(v.sum() / n) for k, v in m.items()}

    required = list(brief.get("mandatory") or [])
    reasons, measured = [], {}
    for key in required:
        floor = PRESENT_FLOOR.get(key, DEFAULT_FLOOR)
        got = share.get(key, 0.0)
        coh = largest_share(m[key]) if key in m else 0.0
        measured[key] = {"share": round(got, 4), "largest_piece": round(coh, 3)}
        if got < floor:
            reasons.append(f"{key} covers {got:.3f} of the frame, below {floor:.3f} -- "
                           f"this is not a photograph of it")
        elif coh < COHERENT_AT:
            reasons.append(f"{key} is scattered: its largest piece holds {coh:.2f} of it, "
                           f"below {COHERENT_AT:.2f} -- spread through the frame, not one "
                           f"specimen")

    companion = None
    for key in COMPANIONS:
        if key in required:
            continue
        if share.get(key, 0.0) >= PRESENT_FLOOR.get(key, DEFAULT_FLOOR):
            companion = key
            break
    measured["companion"] = companion
    if required and companion is None:
        reasons.append("no supporting structure visible -- the defining structure is in "
                       "the frame with no leaf, stem or branch to attach it to")

    verdict = "unsuitable" if reasons else ("needs_vision" if required else "unscreened")
    return {"verdict": verdict, "reasons": reasons, "measured": measured,
            "shares": {k: round(v, 4) for k, v in share.items()},
            "note": ("ATTACHMENT IS NOT MEASURED HERE. A companion structure being present "
                     "is not the same as it belonging to this plant; the vision pass "
                     "decides that looking at the frame.")}


def brief_for(species: str) -> dict:
    herbs = json.loads((ROOT / "src" / "data" / "herbs.json").read_text())["herbs"]
    card = next((h["id"] for h in herbs if h["id"].replace("-", "_") == species), None)
    if card is None:
        genus = species.split("_")[0].lower()
        card = next((h["id"] for h in herbs
                     if h["scientificName"].split()[0].lower() == genus), None)
    return visual_brief.load(species, card, None) or {}


def run(species: str, limit: int | None) -> tuple[int, int]:
    mf = PHOTOS / species / "photos.json"
    if not mf.exists():
        print(f"{species}: no manifest")
        return 0, 0
    brief = brief_for(species)
    doc = json.loads(mf.read_text())
    rows = [e for e in doc["photos"] if (PHOTOS / species / e.get("file", "")).exists()]
    if limit:
        rows = rows[:limit]
    print(f"=== {species} ===  requires {brief.get('mandatory') or 'nothing specific'}")
    bad = 0
    for e in rows:
        r = screen(PHOTOS / species / e["file"], brief)
        bad += int(r["verdict"] == "unsuitable")
        tag = {"unsuitable": "UNSUITABLE", "needs_vision": "ok -> vision",
               "unscreened": "unscreened"}[r["verdict"]]
        print(f"   {str(e['photo_id']):>11}  {tag}")
        for why in r["reasons"]:
            print(f"                 {why}")
    print(f"   {bad}/{len(rows)} unsuitable")
    return bad, len(rows)


def self_test() -> int:
    checks = []
    # CONTROL: a scattered structure fails coherence even when plenty of it is present.
    scattered = np.zeros((300, 300), bool)
    scattered[::20, ::20] = True
    scattered = cv2.dilate(scattered.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    one = np.zeros((300, 300), bool)
    one[80:220, 80:220] = True
    checks.append((largest_share(scattered) < COHERENT_AT <= largest_share(one),
                   "CONTROL: one mass passes coherence, a scatter of specks does not"))
    checks.append(("attached" not in str(PRESENT_FLOOR),
                   "attachment is not a measured key"))
    checks.append(("suitable" not in VERDICTS,
                   "CONTROL: this screen can reject or defer, and never certifies"))
    # CONTROL: a real photograph gets one of the declared verdicts and nothing else.
    probe = sorted((PHOTOS / "sambucus_canadensis").glob("inat-*"))
    if probe:
        v = screen(probe[0], {"mandatory": ["berry_dark"]})["verdict"]
        checks.append((v in VERDICTS, f"a real photograph returns a declared verdict ({v})"))
    ok = True
    for c, label in checks:
        print(("PASS  " if c else "FAIL  ") + label)
        ok &= bool(c)
    print("\n" + ("ALL SELF-TESTS PASSED" if ok else "SELF-TESTS FAILED"))
    return 0 if ok else 1


def main() -> int:
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--species", nargs="*")
    a.add_argument("--all", action="store_true")
    a.add_argument("--limit", type=int)
    a.add_argument("--self-test", action="store_true")
    args = a.parse_args()
    if args.self_test:
        return self_test()
    names = args.species or (sorted(d.name for d in PHOTOS.iterdir() if d.is_dir())
                             if args.all else [])
    if not names:
        a.error("give --species NAME or --all")
    tb = tn = 0
    for sp in names:
        b, n = run(sp, args.limit)
        tb += b; tn += n
    print(f"\n{tb}/{tn} photographs unsuitable before segmentation")
    return 0


if __name__ == "__main__":
    sys.exit(main())
