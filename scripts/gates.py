#!/usr/bin/env python3
"""Three independent gates. A candidate must pass all three; none compensates for another.

The gates answer different questions and a high score in one says nothing about the others:

  BOTANICAL     Is this the right species, showing the structures that identify it?
  SEGMENTATION  Was the plant actually isolated -- no remnants, nothing amputated?
  ART DIRECTION Does it look like it belongs in this deck -- healthy, well scaled, balanced?

They are deliberately NOT summed. A beautifully composed photograph of the wrong structure
is useless, and a botanically perfect one with a rectangle of lawn behind it cannot ship;
a single number lets either hide behind the other two, which is how a backward-facing
chamomile came top of a ranking while failing the only question that mattered.

When nothing passes all three the answer is NEEDS_REVIEW, not the least-bad candidate.

    python3 scripts/gates.py --species matricaria_chamomilla
    python3 scripts/gates.py --self-test
"""
from __future__ import annotations

import argparse, json, pathlib, sys

import cv2
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import visual_brief                                   # noqa: E402

STYLE = json.loads((ROOT / "docs" / "plantdex-photo-style.json").read_text())["profile"]

# Art-direction limits, taken from the 45 printed cards rather than chosen.
FILL_LO, FILL_HI = STYLE["frame_fill"]["p10"], STYLE["frame_fill"]["p90"]
CENTRE_TOL = 0.12
OPENNESS_LO = 0.18
# MEASURED FROM THE DECK, NOT CHOSEN. The printed cards run to 0.73 (Shepherd's Purse,
# which is mostly dry seed pods) with a median of 0.155 and a p90 of 0.388, so brown is
# normal on a PlantDex card -- bark, cones, pods, dry stems. A 0.30 limit, which is what
# this was, would reject Pine #41 and four other genuine cards. The gate now catches only
# genuine outliers, and the honest caveat is that this measurement cannot tell dying
# foliage from woody tissue: it is a weak signal and a human or the vision pass decides.
MAX_SENESCENCE = 0.45
MAX_SOLIDITY = 0.82
MIN_RETENTION = 0.05
MAX_FRAGMENTS = 8


def senescence(bgr: np.ndarray, alpha: np.ndarray) -> float:
    """Share of the subject that reads as dead, dying or autumn-yellowed tissue.

    A card shows a HEALTHY specimen. This is the measurement behind rejecting an elderberry
    whose drupes were right and whose leaves had already turned -- botanically correct, and
    not what the deck looks like. Brown and desaturated-yellow foliage, excluding the
    saturated yellows that are flowers and the dark tones that are fruit.
    """
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    H, S, V = hsv[:, :, 0].astype(int), hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
    brown = (H >= 8) & (H <= 30) & (S > 40) & (S < 190) & (V > 50) & (V < 205)
    pale = (H >= 20) & (H <= 40) & (S > 25) & (S < 110) & (V > 120)
    dead = (brown | pale) & alpha
    return float(dead.sum() / max(1, alpha.sum()))


def gate_botanical(brief: dict, shares: dict, vision: dict | None) -> dict:
    reasons = []
    if brief:
        v = visual_brief.check(brief, shares)
        if not v["ok"]:
            reasons.append("missing required structures: " + ", ".join(v["missing_mandatory"]))
    if vision:
        if vision.get("meets_brief") is False:
            reasons.append("vision: " + vision.get("why", "does not meet the brief"))
        if vision.get("identifiable") is False:
            reasons.append("vision: not identifiable as the species")
        if vision.get("orientation") == "back":
            reasons.append("vision: the identifying structure faces away from the camera")
    return {"gate": "botanical", "pass": not reasons, "reasons": reasons}


def gate_segmentation(row: dict, vision: dict | None) -> dict:
    reasons = []
    sol = row.get("cutout_solidity")
    if sol is not None and sol > MAX_SOLIDITY:
        reasons.append(f"cutout fills {100*sol:.0f}% of its box: a rectangle, not a plant")
    ret = row.get("green_retention")
    if ret is not None and ret < MIN_RETENTION:
        reasons.append(f"only {100*ret:.0f}% of the foliage survived: stems cut away")
    skin = row.get("skin_in_cutout")
    if skin is not None and skin > 0.04:
        reasons.append(f"{100*skin:.0f}% of the cutout is still skin")
    if vision:
        for d in vision.get("defects", []):
            if any(w in d.lower() for w in ("background", "sky", "remnant", "rectangul")):
                reasons.append("vision: " + d)
    return {"gate": "segmentation", "pass": not reasons, "reasons": reasons}


def gate_art(row: dict, comp: dict, dead: float, vision: dict | None) -> dict:
    reasons = []
    fill = (comp or {}).get("placed_fill")
    if fill is not None and not (FILL_LO <= fill <= FILL_HI):
        reasons.append(f"subject covers {fill:.2f} of the window; the deck sits "
                       f"{FILL_LO:.2f}-{FILL_HI:.2f}")
    cx = (comp or {}).get("placed_centroid_x")
    if cx is not None and abs(cx - STYLE["centroid_x"]["median"]) > CENTRE_TOL:
        reasons.append(f"off centre: {cx:.2f} against the deck's {STYLE['centroid_x']['median']:.2f}")
    sol = row.get("cutout_solidity")
    if sol is not None and sol < OPENNESS_LO:
        reasons.append(f"silhouette is {sol:.2f} solid: too sparse to read as a specimen")
    if dead > MAX_SENESCENCE:
        reasons.append(f"{100*dead:.0f}% of the subject is brown or yellowed: not a healthy "
                       f"specimen")
    if vision:
        q = vision.get("quality")
        if q is not None and q < 6:
            reasons.append(f"vision quality {q}/10: " + (vision.get("defects") or ["unattractive"])[0])
    return {"gate": "art_direction", "pass": not reasons, "reasons": reasons}


REJECTED = ROOT / "evidence" / "rejected-photos.json"


def rejected_photos() -> dict:
    """Photographs a human has ruled out, with the reason, honoured as a hard gate.

    A reviewer's decision is evidence the pipeline cannot derive. Recording it here means a
    re-run cannot quietly re-select something already rejected, and the reason travels with
    it instead of living in a chat message.
    """
    return json.loads(REJECTED.read_text()) if REJECTED.exists() else {}


def evaluate(species: str) -> dict:
    base = ROOT / "evidence" / "candidates" / species
    doc = json.loads((base / "candidates.json").read_text())
    vis = {}
    vf = base / "vision.json"
    if vf.exists():
        vis = {r["photo_id"]: r for r in json.loads(vf.read_text())["rows"]}
    brief = visual_brief.load(species) or {}
    out = []
    for s in doc["selected"]:
        cutf = base / s["cutout"]
        dead = 0.0
        if cutf.exists():
            cut = Image.open(cutf).convert("RGBA")
            a = np.array(cut.getchannel("A")) > 127
            dead = senescence(cv2.cvtColor(np.array(cut.convert("RGB")), cv2.COLOR_RGB2BGR), a)
        v = vis.get(s["photo_id"])
        rej = rejected_photos().get(str(s["photo_id"]))
        gates = [gate_botanical(brief, s.get("brief_structures", {}), v),
                 gate_segmentation(s, v),
                 gate_art(s, s.get("composition", {}), dead, v)]
        out.append({"photo_id": s["photo_id"], "score": s["score"],
                    "senescence": round(dead, 3),
                    "vision_source": (v or {}).get("source", "none"),
                    "human_rejected": rej,
                    "gates": gates,
                    "selectable": all(g["pass"] for g in gates) and not rej})
    passed = [r for r in out if r["selectable"]]
    return {"species": species, "candidates": out,
            "verdict": "PASS" if passed else "NEEDS_REVIEW",
            "selected": passed[0]["photo_id"] if passed else None}


def self_test() -> int:
    checks = [(FILL_LO < FILL_HI, "the art-direction fill band comes from the 45 cards")]
    # CONTROL: a candidate failing one gate is NOT selectable however well it does elsewhere.
    row = {"cutout_solidity": 0.95, "green_retention": 0.9, "skin_in_cutout": 0.0}
    g = [gate_botanical({}, {}, None), gate_segmentation(row, None),
         gate_art(row, {"placed_fill": STYLE["frame_fill"]["median"],
                        "placed_centroid_x": STYLE["centroid_x"]["median"]}, 0.0, None)]
    checks.append((g[0]["pass"] and not g[1]["pass"],
                   "CONTROL: a rectangular cutout fails segmentation while botany passes"))
    checks.append((not all(x["pass"] for x in g),
                   "CONTROL: passing two gates does not make a candidate selectable"))
    # CONTROL: vision saying the flower faces away fails botany on its own.
    gb = gate_botanical({}, {}, {"orientation": "back", "meets_brief": True})
    checks.append((not gb["pass"], "CONTROL: a back-facing flower fails the botanical gate"))
    ok = True
    for good, label in checks:
        print(("PASS  " if good else "FAIL  ") + label)
        ok &= bool(good)
    print("\n" + ("ALL SELF-TESTS PASSED" if ok else "SELF-TESTS FAILED"))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--species", nargs="+")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    for sp in a.species or []:
        try:
            r = evaluate(sp)
        except FileNotFoundError:
            print(f"\n=== {sp} ===\n  NEEDS_REVIEW: no candidates were produced")
            continue
        print(f"\n=== {sp} ===  {r['verdict']}"
              + (f" -> {r['selected']}" if r["selected"] else ""))
        for c in r["candidates"]:
            marks = " ".join(("OK " if g["pass"] else "FAIL") + "=" + g["gate"][:4]
                             for g in c["gates"])
            print(f"   {c['photo_id']:>10} {c['score']:6.1f}  {marks}"
                  f"  senescence={c['senescence']}  vision={c['vision_source'][:9]}")
            for g in c["gates"]:
                for why in g["reasons"]:
                    print(f"        {g['gate']}: {why}")
        (ROOT / "evidence" / "candidates" / sp / "gates.json").write_text(
            json.dumps(r, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
