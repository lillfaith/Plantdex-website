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
import art_direction                                  # noqa: E402
import decisions                                      # noqa: E402
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


def clipping(front_png: pathlib.Path) -> dict:
    """Is the subject cut off by the ART WINDOW, checked on the FINISHED card?

    The source photograph can be perfectly framed and the CARD still amputate the plant:
    placement scales and seats the subject, and a spike taller than the window loses its
    tip. That is what happened to the mullein -- a complete flowering spike in the
    photograph, beheaded on the card -- so this is measured after composition, not before.
    The BOTTOM is exempt: 44 of the 45 printed cards crop there deliberately.
    """
    import render_generated_card as R
    tpl, _ = R.template_pages()
    x0, y0, x1, y1 = R.SLOT_PHOTO
    a = np.array(Image.open(front_png).convert("RGB")).astype(int)[y0:y1, x0:x1]
    b = np.array(tpl.convert("RGB")).astype(int)[y0:y1, x0:x1]
    m = np.abs(a - b).max(axis=2) > 40
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    H, W = m.shape
    if m.sum() < 500:
        return {"clipped": [], "touch": {}}
    edges = {"top": float(m[0:2].mean()), "left": float(m[:, 0:2].mean()),
             "right": float(m[:, W - 2:].mean()), "bottom": float(m[H - 2:].mean())}
    # A few pixels brushing an edge is contact; a wide band is a cut through the plant.
    clipped = [k for k in ("top", "left", "right") if edges[k] > 0.08]
    return {"clipped": clipped, "touch": {k: round(v, 3) for k, v in edges.items()}}


def contamination(cut_png: pathlib.Path) -> dict:
    """Did background survive segmentation? Straight alpha edges are the giveaway.

    A plant silhouette is irregular everywhere. A failed cutout keeps a RECTANGLE -- the
    photograph's own border -- so its alpha has long perfectly straight runs that no leaf
    produces. Pine 141313870 kept sky and a treeline exactly this way and still passed
    every numerical gate, which is the failure this function exists for.
    """
    im = Image.open(cut_png).convert("RGBA")
    a = np.array(im.getchannel("A")) > 127
    H, W = a.shape
    if a.sum() < 500:
        return {"straight_rows": 0.0, "straight_cols": 0.0, "fragments": 0, "suspect": True}
    # rows/columns that are almost entirely opaque: a rectangle has many, a plant few
    rows = float((a.mean(axis=1) > 0.92).mean())
    cols = float((a.mean(axis=0) > 0.92).mean())
    n, lab, st, _ = cv2.connectedComponentsWithStats(a.astype(np.uint8), 8)
    frags = 0
    if n > 1:
        areas = st[1:, cv2.CC_STAT_AREA]
        frags = int((areas >= areas.max() * 0.05).sum())
    return {"straight_rows": round(rows, 3), "straight_cols": round(cols, 3),
            "fragments": frags, "suspect": bool(rows > 0.12 or cols > 0.12)}


def scenery_split(cut_png: pathlib.Path) -> dict:
    """Two slabs at opposite edges with a void between them is scenery, not a plant.

    Pine 141313870 survived every other test as "one subject, 61% in its largest piece":
    what it actually is, is two vertical strips of BACKGROUND FOREST at the left and right
    margins with the middle correctly removed. No plant is shaped like that. The signal is
    the void -- a wide empty corridor through the middle while both outer edges are full.
    """
    im = Image.open(cut_png).convert("RGBA")
    a = np.array(im.getchannel("A")) > 127
    H, W = a.shape
    if a.sum() < 500:
        return {"split": False, "void": 0.0}
    colfill = a.mean(axis=0)
    rowfill = a.mean(axis=1)
    def worst(fill: np.ndarray) -> float:
        n = len(fill)
        edge = max(1, int(n * 0.12))
        if fill[:edge].mean() < 0.25 or fill[-edge:].mean() < 0.25:
            return 0.0                       # the outer edges are not both occupied
        mid = fill[edge:-edge]
        return float((mid < 0.04).mean()) if len(mid) else 0.0
    void = max(worst(colfill), worst(rowfill))
    return {"split": bool(void > 0.35), "void": round(void, 3)}


def source_clipping(row: dict) -> dict:
    """Did the plant already run off the EDGE OF THE PHOTOGRAPH?

    Card-level clipping cannot see this. The mullein's spike is complete in neither sense:
    the photographer cropped it, so the tip never existed in the file, and the card then
    shows a spike with no apex. The bottom is exempt as always -- a stem leaving the frame
    at the foot is how the deck's own cards look.
    """
    t = row.get("source_edges") or {}
    bad = [k for k in ("top", "left", "right") if (t.get(k) or 0) > 0.08]
    return {"clipped_in_source": bad, "edges": t}


def coherence(cut_png: pathlib.Path) -> dict:
    """Do the surviving parts read as ONE substantial plant, or as leftovers?

    Berries with no branch behind them are botanically correct and artistically useless.
    A coherent specimen is mostly one connected mass; a scatter of fragments is not.
    """
    im = Image.open(cut_png).convert("RGBA")
    a = np.array(im.getchannel("A")) > 127
    if a.sum() < 500:
        return {"largest_share": 0.0, "pieces": 0, "coherent": False}
    n, lab, st, _ = cv2.connectedComponentsWithStats(a.astype(np.uint8), 8)
    if n <= 1:
        return {"largest_share": 1.0, "pieces": 1, "coherent": True}
    areas = st[1:, cv2.CC_STAT_AREA]
    share = float(areas.max() / areas.sum())
    pieces = int((areas >= areas.max() * 0.05).sum())
    return {"largest_share": round(share, 3), "pieces": pieces,
            "coherent": bool(share >= 0.55 and pieces <= 6)}


def human_decisions() -> dict:
    """{photo_id: the owner's verdict in force}, from scripts/decisions.py.

    A reviewer's judgement is evidence the pipeline cannot derive -- the elderberry's
    senescence measured BELOW the deck's own p90, so no threshold was ever going to catch
    it. The ledger lives in its own module because it has one property no other input has:
    it is append-only and REVISABLE. The owner may supersede his own verdict, and the
    superseded reading stays readable, so this function always returns the newest entry and
    never the whole trail -- a gate decides on what is in force, not on what once was.
    """
    return decisions.current()


# ── HARD FAILURES vs SOFT PREFERENCES ────────────────────────────────────────────────────
#
# A hard failure means the image cannot be used whatever else is true of it: the wrong
# species, a missing identifying structure, severe clipping, failed segmentation, retained
# background. A soft preference is a departure from the deck's habits -- a subject a little
# small, a little off centre -- which costs points and blocks nothing.
#
# Keeping them apart is the correction for two opposite mistakes made here. Treating the
# deck's 20-42% fill band as a hard limit rejected attractive specimens for being 0.17; and
# treating everything as a score let a cutout of two strips of background forest "pass".


def hard_failures(brief, shares, row, vision, cutf, frontf) -> list[str]:
    bad = []
    if brief:
        v = visual_brief.check(brief, shares)
        if not v["ok"]:
            bad.append("BOTANY: missing required structures: " + ", ".join(v["missing_mandatory"]))
    if vision:
        if vision.get("meets_brief") is False:
            bad.append("BOTANY (vision): " + vision.get("why", "does not meet the brief"))
        if vision.get("identifiable") is False:
            bad.append("BOTANY (vision): not identifiable as the species")
        if vision.get("orientation") == "back":
            bad.append("BOTANY (vision): the identifying structure faces away")
        q = vision.get("quality")
        if q is not None and q <= 3:
            bad.append(f"ART (vision): quality {q}/10")
        # THE THREE STAGES ARE JUDGED SEPARATELY AND TWO OF THEM ARE HARD. Cropping is a
        # property of the SOURCE frame: a structure that ran off the edge of the original
        # photograph is unrecoverable, which is exactly what happened to the mullein, and
        # no placement can put it back. Segmentation is a property of the CUTOUT. Both
        # decide whether the image is usable at all, so both are hard. Art direction is the
        # owner's preference and is handled in soft_notes -- never here.
        crop = vision.get("cropping") or {}
        if crop.get("complete") is False:
            lost = ", ".join(crop.get("lost", [])) or crop.get("why", "")
            bad.append(f"CROPPING (vision): the source photograph cuts the plant: {lost}")
        seg = vision.get("segmentation") or {}
        if seg.get("clean") is False:
            bad.append("SEGMENTATION (vision): "
                       + (", ".join(seg.get("defects", [])) or seg.get("why", "")))
        for d in vision.get("defects", []):
            if any(w in d.lower() for w in ("background", "sky", "remnant", "rectangul")):
                bad.append("SEGMENTATION (vision): " + d)
    sol = row.get("cutout_solidity")
    if sol is not None and sol > MAX_SOLIDITY:
        bad.append(f"SEGMENTATION: cutout fills {100*sol:.0f}% of its box; a rectangle")
    # A HAND IS A LARGE SMOOTH REGION ACROSS THE PLANT, NOT A WARM HUE. This read the raw
    # warm-hue share and rejected 13 of 20 elderberry candidates as hands -- every fruiting
    # one among them -- because ripe pedicels are red and cropping to the plant inflates
    # the share of a smaller frame. It now reads the blob measurement the pipeline records,
    # and a row that carries only the old raw share is NOT rejected on it: that number is
    # demonstrably wrong for red-stemmed and brown-barked species, and a gate is worth
    # nothing if it refuses the only photographs that show the fruit.
    sfrac = row.get("skin_blob_in_cutout")
    if (sfrac is not None and sfrac > 0.045
            and (row.get("skin_blob_gradient") or 99.0) < 9.0
            and row.get("skin_obstructs")):
        bad.append(f"SEGMENTATION: a smooth skin region covers {100*sfrac:.0f}% of the "
                   f"subject and sits across it; a hand survived")
    if cutf.exists():
        sp = scenery_split(cutf)
        if sp["split"]:
            bad.append(f"SEGMENTATION: separated slabs with a {100*sp['void']:.0f}% void "
                       f"between them; retained scenery, not a plant")
        con = contamination(cutf)
        if con["suspect"]:
            bad.append(f"SEGMENTATION: straight alpha edges "
                       f"(rows {con['straight_rows']}, cols {con['straight_cols']}); "
                       f"an uncut rectangle survived")
        coh = coherence(cutf)
        if not coh["coherent"]:
            bad.append(f"COHERENCE: largest piece is only {100*coh['largest_share']:.0f}% "
                       f"across {coh['pieces']} fragments; not one substantial specimen")
    if frontf.exists():
        cl = clipping(frontf)
        if cl["clipped"]:
            bad.append("CLIPPING: the card cuts the subject at the "
                       + "/".join(cl["clipped"]) + " of the art window")
    return bad


def soft_notes(row, comp, dead, vision) -> list[str]:
    soft = []
    # EDGE CONTACT IS A FLAG FOR THE VISION PASS, NOT A VERDICT, and the measurements say
    # why plainly: the preferred chamomile touches 95% of its top edge and its bloom is
    # COMPLETE -- a large flower simply fills the frame -- while the mullein whose spike is
    # genuinely beheaded touches only 41%. The harmful case scores LOWER than the benign
    # one, so no threshold on this number can separate them. Whether a clipped edge cost
    # the plant an identifying structure is a question about morphology, and only the
    # vision step can answer it. Card-level clipping stays hard: there the card itself cuts
    # the subject, which is unambiguous.
    sc = source_clipping(row)
    if sc["clipped_in_source"]:
        soft.append("touches the " + "/".join(sc["clipped_in_source"])
                    + " edge of the source photograph; vision must confirm no identifying "
                      "structure was lost")
    fill = (comp or {}).get("placed_fill")
    if fill is not None and not (FILL_LO <= fill <= FILL_HI):
        soft.append(f"subject covers {fill:.2f}; the deck usually sits {FILL_LO:.2f}-{FILL_HI:.2f}")
    cx = (comp or {}).get("placed_centroid_x")
    if cx is not None and abs(cx - STYLE["centroid_x"]["median"]) > CENTRE_TOL:
        soft.append(f"off centre at {cx:.2f}")
    if dead > MAX_SENESCENCE:
        soft.append(f"{100*dead:.0f}% brown or yellowed tissue")
    q = (vision or {}).get("quality")
    if q is not None and 3 < q < 6:
        soft.append(f"vision quality {q}/10")
    # ART DIRECTION IS A PREFERENCE AND STAYS ONE. A whole-tree pine is a real problem with
    # a real card and it is still not a safety or a botany failure: the species is correct
    # and the cutout is clean. It belongs here, where it costs the candidate its place in
    # the ranking and blocks nothing -- and where the owner can overrule it, which is the
    # one thing a hard failure does not allow.
    ad = (vision or {}).get("art_direction") or {}
    if ad.get("meets") is False:
        comp = ad.get("composition")
        soft.append("ART DIRECTION (vision): "
                    + (f"{comp}; " if comp else "")
                    + (ad.get("why") or "does not match the owner's directive"))
    return soft


def evaluate(species: str) -> dict:
    base = ROOT / "evidence" / "candidates" / species
    doc = json.loads((base / "candidates.json").read_text())
    vis = {}
    vf = base / "vision.json"
    genuine_api = False
    if vf.exists():
        vdoc = json.loads(vf.read_text())
        vis = {r["photo_id"]: r for r in vdoc["rows"]}
        genuine_api = any(r.get("source") == "vision" for r in vdoc["rows"])
    brief = visual_brief.load(species) or {}
    decisions = human_decisions()
    out = []
    for s in doc["selected"]:
        pid = str(s["photo_id"])
        cutf, frontf = base / s["cutout"], base / s["preview"]
        dead = 0.0
        if cutf.exists():
            cut = Image.open(cutf).convert("RGBA")
            a = np.array(cut.getchannel("A")) > 127
            dead = senescence(cv2.cvtColor(np.array(cut.convert("RGB")), cv2.COLOR_RGB2BGR), a)
        v = vis.get(s["photo_id"])
        hard = hard_failures(brief, s.get("brief_structures", {}), s, v, cutf, frontf)
        soft = soft_notes(s, s.get("composition", {}), dead, v)
        human = decisions.get(pid)

        # STATUS. AUTO_APPROVED REQUIRES A GENUINE API VERDICT. Numerical metrics cannot
        # authorize an approval -- that is the whole lesson of the pine, which passed every
        # number while being two strips of forest. A manually supplied verdict is evidence
        # and can never promote past NEEDS_REVIEW, because a human judgement recorded by
        # hand is not the automated system working.
        # `preferred` IS NOT AN APPROVAL. "Keep this one as my preferred candidate" pins a
        # photograph; it does not sign off on the finished card. Collapsing the two would
        # promote art the owner has not approved, so a preferred candidate stays
        # NEEDS_REVIEW -- it is merely protected from being ranked away, and from a hard
        # failure quietly rejecting the one photograph he asked to keep looking at.
        if human and human.get("decision") == "rejected":
            status = "REJECTED"
        elif human and human.get("decision") == "approved":
            status = "HUMAN_APPROVED"
        elif human and human.get("decision") in ("preferred", "alternative"):
            status = "NEEDS_REVIEW"
        elif hard:
            status = "REJECTED"
        elif v and v.get("source") == "vision" and v.get("meets_brief"):
            status = "AUTO_APPROVED"
        else:
            status = "NEEDS_REVIEW"

        out.append({"photo_id": s["photo_id"], "score": s["score"], "status": status,
                    "senescence": round(dead, 3),
                    "vision_source": (v or {}).get("source", "none"),
                    "genuine_api_vision": bool(v and v.get("source") == "vision"),
                    "human_decision": human, "hard_failures": hard, "soft_notes": soft,
                    "owner_preferred": bool(human and human.get("decision") == "preferred"),
                    "owner_alternative": bool(human and
                                              human.get("decision") == "alternative")})
    # STABLE: the owner's leader first, then the alternative he named, then the ranking.
    out.sort(key=lambda r: (not r["owner_preferred"], not r["owner_alternative"]))
    approved = [r for r in out if r["status"] in ("AUTO_APPROVED", "HUMAN_APPROVED")]
    reviewable = [r for r in out if r["status"] == "NEEDS_REVIEW"]
    verdict = ("APPROVED" if approved else
               "NEEDS_REVIEW" if reviewable else "REJECTED")
    return {"species": species, "verdict": verdict,
            "any_genuine_api_vision": genuine_api,
            "art_direction": art_direction.summary(species),
            "selected": approved[0]["photo_id"] if approved else None,
            "candidates": out}


def self_test() -> int:
    checks = [(FILL_LO < FILL_HI, "the art-direction fill band comes from the 45 cards")]
    base = {"cutout_solidity": 0.4, "skin_in_cutout": 0.0, "source_edges": {}}
    warm = {**base, "skin_in_cutout": 0.22, "skin_blob_in_cutout": 0.01,
            "skin_blob_gradient": 14.9, "skin_obstructs": False}
    hand = {**base, "skin_in_cutout": 0.22, "skin_blob_in_cutout": 0.30,
            "skin_blob_gradient": 3.1, "skin_obstructs": True}
    missing = pathlib.Path("/nonexistent.png")
    # CONTROL: clean numbers alone must NOT authorize approval.
    hard = hard_failures({}, {}, base, None, missing, missing)
    checks.append((not hard, "a clean candidate has no hard failures"))
    # CONTROL: a rectangle fails on segmentation however good everything else is.
    hard2 = hard_failures({}, {}, {**base, "cutout_solidity": 0.95}, None, missing, missing)
    checks.append((any("rectangle" in h for h in hard2),
                   "CONTROL: a rectangular cutout is a HARD failure"))
    # CONTROL: edge contact in the SOURCE is a SOFT flag, never a hard failure. The
    # preferred chamomile touches 95% of its top edge with a complete bloom; the mullein
    # whose spike is cut touches 41%. The harmful case scores lower than the benign one.
    hard3 = hard_failures({}, {}, {**base, "source_edges": {"top": 0.95}}, None,
                          missing, missing)
    soft3 = soft_notes({**base, "source_edges": {"top": 0.95}}, {}, 0.0, None)
    checks.append((not hard3 and any("source photograph" in x for x in soft3),
                   "CONTROL: source edge contact is a soft flag for vision, not a failure"))
    # CONTROL: being a little small or off centre is SOFT, never blocking.
    soft = soft_notes(base, {"placed_fill": 0.17, "placed_centroid_x": 0.70}, 0.0, None)
    checks.append((len(soft) >= 2 and not hard_failures({}, {}, base, None, missing, missing),
                   "CONTROL: small and off-centre are soft preferences, not failures"))
    # CONTROL: a back-facing flower is hard.
    hb = hard_failures({}, {}, base, {"orientation": "back", "meets_brief": True},
                       missing, missing)
    checks.append((bool(hb), "CONTROL: a back-facing flower is a HARD failure"))
    # CONTROL: a warm-stemmed cutout is not a hand; a smooth obstructing blob is. The raw
    # share is identical in both rows, which is exactly why it cannot be the test.
    checks.append((not hard_failures({}, {}, warm, None, missing, missing)
                   and any("hand survived" in h for h in
                           hard_failures({}, {}, hand, None, missing, missing)),
                   "CONTROL: red stems are not a hand; a smooth slab across the plant is"))
    # CONTROL: cropping lost in the SOURCE is hard -- that is the mullein, and it is the one
    # failure a finished card cannot show you.
    hc = hard_failures({}, {}, base,
                       {"meets_brief": True, "cropping": {"complete": False,
                                                          "lost": ["the top of the spike"]}},
                       missing, missing)
    checks.append((any("CROPPING" in h for h in hc),
                   "CONTROL: a structure cut off in the source photograph is HARD"))
    # CONTROL: art direction is SOFT in both directions -- it must never reject, and it must
    # still be reported. A whole-tree pine is the case: right species, clean cutout, wrong
    # picture for a card.
    av = {"meets_brief": True, "identifiable": True,
          "art_direction": {"meets": False, "composition": "whole_tree",
                            "why": "a tree portrait, not a branch"}}
    checks.append((not hard_failures({}, {}, base, av, missing, missing)
                   and any("ART DIRECTION" in x for x in soft_notes(base, {}, 0.0, av)),
                   "CONTROL: an art-direction failure is soft, never hard"))
    # CONTROL: a clean three-stage verdict must not become a hard failure for lacking the
    # older flat `defects` key.
    checks.append((not hard_failures({}, {}, base,
                                     {"meets_brief": True,
                                      "cropping": {"complete": True},
                                      "segmentation": {"clean": True}}, missing, missing),
                   "CONTROL: a passing three-stage verdict has no hard failures"))
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
        if r.get("art_direction"):
            print(f"   art direction: {r['art_direction']}")
        if not r["any_genuine_api_vision"]:
            print("   (no genuine API vision for this species, so nothing here can be "
                  "AUTO_APPROVED)")
        for c in r["candidates"]:
            print(f"   {c['photo_id']:>10} {c['score']:6.1f}  {c['status']:14}"
                  f" vision={c['vision_source'][:34]}")
            if c["human_decision"]:
                print(f"        HUMAN {c['human_decision']['decision'].upper()}: "
                      f"{c['human_decision']['reason'][:150]}")
            for why in c["hard_failures"]:
                print(f"        HARD  {why}")
            for why in c["soft_notes"]:
                print(f"        soft  {why}")
        (ROOT / "evidence" / "candidates" / sp / "gates.json").write_text(
            json.dumps(r, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
