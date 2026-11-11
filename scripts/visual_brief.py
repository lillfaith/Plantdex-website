#!/usr/bin/env python3
"""What must a photograph of THIS species show? Derived from the printed card.

A scorer that knows nothing about the species cannot tell a Dandelion in flower from a
Dandelion's leaves, and the cross-test showed it picking the leaves. The missing input is a
statement of which structures identify each plant -- but writing 2,000 of those by hand is
not a plan, so the brief is DERIVED from the card the deck already printed and is then
editable.

HOW THE DERIVATION WORKS. The card's own photograph is the answer to the question. Measuring
the structure shares inside its art window says what the deck chose to feature:

    Dandelion    gold 0.383, green 0.354   -> a flower AND foliage
    Mullein      green 0.794, gold 0.056   -> foliage, with the flowering spike secondary
    Elderberry   berry 0.090, white 0.060  -> BERRIES, not the flower umbel
    Yarrow       white 0.584               -> a white umbel
    Plantain     green 0.709               -> foliage, no flower at all

NOTHING UNIVERSAL IS ASSUMED. There is no global "must show a flower" rule: Plantain's brief
requires none because its card shows none, and Elderberry's requires dark fruit rather than
the white flowers the same shrub also produces. Each brief comes from its own card.

EDITABLE AND REVIEWABLE. A derived brief is written to `evidence/briefs/<species>.json`; a
file carrying `"edited": true` is used as-is and never recomputed, so a human decision
survives regeneration.

    python3 scripts/visual_brief.py --derive-all
    python3 scripts/visual_brief.py --show taraxacum_officinale
    python3 scripts/visual_brief.py --self-test
"""
from __future__ import annotations

import argparse, json, pathlib, sys

import cv2
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import analyze_card_photos as A                        # noqa: E402

BRIEFS = ROOT / "evidence" / "briefs"
MANDATORY_AT = 0.08        # a structure holding this share of the card's subject identifies it
PREFERRED_AT = 0.02        # below mandatory but clearly present
PRESENT_AT = 0.015         # what counts as "this structure appears" in a candidate photograph


def structures(bgr: np.ndarray, mask: np.ndarray | None = None) -> dict:
    """Share of the subject made up by each structure family.

    Deliberately coarse and colour-based: these are families a photograph can be screened
    for cheaply, not a botanical classification. `berry_dark` is the one that needed adding
    -- an elderberry cyme is dark, saturated and compact, and no flower test finds it.
    """
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    H, S, V = hsv[:, :, 0].astype(int), hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
    if mask is None:
        mask = np.ones(H.shape, bool)
    out = {}
    raw = {
        "flower_yellow": (H >= 18) & (H <= 32) & (S > 130) & (V > 120),
        "flower_white": (V > 165) & (S < 60),
        # V < 125 and a violet-blue hue: elderberries read H~137, S~98, V~61.
        "berry_dark": (V < 125) & (S > 55) & (H >= 110) & (H <= 175),
        "berry_red": (((H <= 10) | (H >= 170)) & (S > 120) & (V > 70) & (V < 200)),
        "foliage": ((H >= 25) & (H <= 95) & (S > 35) & (V > 35)
                    & ~((H <= 32) & (S > 130) & (V > 120))),
    }
    # NEEDLES: long, thin, green-to-blue-green. A conifer has no flower and no fruit, and
    # without this the only structure a pine could register is "white" -- which is what
    # made sunlit needles read as white flowers. Thinness is measured by erosion survival:
    # a needle disappears under a small erosion, a petal or a leaf does not.
    green_any = (H >= 35) & (H <= 100) & (S > 40) & (V > 35)
    eroded = cv2.erode(green_any.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    raw["needles"] = green_any & ~cv2.dilate(eroded.astype(np.uint8),
                                             np.ones((5, 5), np.uint8)).astype(bool)
    n = max(1, int(mask.sum()))
    for key, m in raw.items():
        m = m & mask
        # CLOSE BEFORE OPEN, because a cluster is compact as a CLUSTER. An elderberry cyme
        # is a mesh of small dark spheres separated by specular highlights, so opening it
        # straight away deletes every berry individually -- the share fell from 0.20 of the
        # card's subject to 0.01 and the species' defining structure vanished. Closing
        # merges the cluster first; opening then still removes genuinely scattered pixels,
        # which is what it is there for (sunlit leaf edges read as "white" and gave a
        # flowerless Dandelion a maximum flower score).
        o = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
        o = cv2.morphologyEx(o, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
        cnt, lab, st, _ = cv2.connectedComponentsWithStats(o, 8)
        if cnt > 1:
            areas = st[1:, cv2.CC_STAT_AREA]
            floor = max(150, int(0.0006 * m.size))
            keep = [i + 1 for i, v in enumerate(areas) if v >= floor]
            o = np.isin(lab, keep)
        else:
            o = np.zeros(m.shape, bool)
        # BERRIES MUST BE ROUND-ISH CLUSTERS, NOT RIBBONS. Elderberry's red PEDICELS are
        # the same hue as unripe fruit and are long and thin, so a colour-only test read
        # the stems as berries. A drupe cluster is bulky: it survives erosion, a pedicel
        # does not.
        if key.startswith("berry") and o.any():
            solid = cv2.erode(o.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
            o = cv2.dilate(solid.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & o
        # NEEDLES ARE THIN BY DEFINITION, so the compactness filter above would delete
        # them; they are measured on the raw thin-structure mask instead.
        if key == "needles":
            o = m
        out[key] = round(float(o.sum() / n), 4)
    return out


def card_structures(card_id: str) -> dict | None:
    """Structure shares inside a printed card's art window."""
    path = ROOT / "public" / "cards" / f"{card_id}.webp"
    if not path.exists():
        return None
    tpl = A.template_front()
    a = np.array(Image.open(path).convert("RGB").resize((A.WIDTH, A.HEIGHT), Image.LANCZOS))
    x0, y0, x1, y1 = A.SLOT_PHOTO
    sub, bs = a[y0:y1, x0:x1], tpl[y0:y1, x0:x1]
    m = np.abs(sub.astype(int) - bs).max(axis=2) > A.DIFF
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    if m.sum() < 2000:
        return None
    return structures(cv2.cvtColor(sub, cv2.COLOR_RGB2BGR), m)


def derive(species_key: str, card_id: str) -> dict | None:
    shares = card_structures(card_id)
    if shares is None:
        return None
    mandatory = sorted([k for k, v in shares.items() if v >= MANDATORY_AT],
                       key=lambda k: -shares[k])
    preferred = sorted([k for k, v in shares.items()
                        if PREFERRED_AT <= v < MANDATORY_AT], key=lambda k: -shares[k])
    return {"species_key": species_key, "card": card_id, "edited": False,
            "derived_from": "structure shares inside the printed card's art window",
            "card_shares": shares, "mandatory": mandatory, "preferred": preferred,
            "thresholds": {"mandatory_at": MANDATORY_AT, "preferred_at": PREFERRED_AT,
                           "present_at": PRESENT_AT}}


def derive_from_family(species_key: str, family: str) -> dict | None:
    """A brief for a species the deck does NOT carry, averaged over its family's cards.

    This is what makes the system usable for the 2,000 species that have no card: a new
    Asteraceae is told to show a flower and foliage because every Asteraceae card in the
    deck does, without anybody writing that down. It is a PRIOR, not a measurement of this
    species -- a family is not uniform, so the brief is marked `family_prior` and is exactly
    the kind a reviewer should expect to correct.
    """
    herbs = json.loads((ROOT / "src" / "data" / "herbs.json").read_text())["herbs"]
    fams = json.loads((ROOT / "evidence" / "card-families.json").read_text()) \
        if (ROOT / "evidence" / "card-families.json").exists() else {}
    kin = [h for h in herbs if fams.get(h["id"], "").lower() == (family or "").lower()]
    if not kin:
        return None
    acc: dict[str, list[float]] = {}
    for h in kin:
        sh = card_structures(h["id"])
        if not sh:
            continue
        for k, v in sh.items():
            acc.setdefault(k, []).append(v)
    if not acc:
        return None
    shares = {k: round(float(np.median(v)), 4) for k, v in acc.items()}
    mandatory = sorted([k for k, v in shares.items() if v >= MANDATORY_AT],
                       key=lambda k: -shares[k])
    preferred = sorted([k for k, v in shares.items()
                        if PREFERRED_AT <= v < MANDATORY_AT], key=lambda k: -shares[k])
    return {"species_key": species_key, "card": None, "edited": False,
            "family_prior": family, "kin_cards": [h["id"] for h in kin],
            "derived_from": f"median structure shares across {len(kin)} {family} cards",
            "card_shares": shares, "mandatory": mandatory, "preferred": preferred,
            "thresholds": {"mandatory_at": MANDATORY_AT, "preferred_at": PREFERRED_AT,
                           "present_at": PRESENT_AT}}


def load(species_key: str, card_id: str | None = None,
         family: str | None = None) -> dict | None:
    """An edited brief wins and is never recomputed; otherwise derive and cache."""
    path = BRIEFS / f"{species_key}.json"
    if path.exists():
        brief = json.loads(path.read_text())
        if brief.get("edited"):
            return brief
    if card_id is None and family is None:
        return json.loads(path.read_text()) if path.exists() else None
    brief = derive(species_key, card_id) if card_id else None
    if brief is None and family:
        brief = derive_from_family(species_key, family)
    if brief is not None:
        BRIEFS.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(brief, indent=2) + "\n")
    return brief


def check(brief: dict, shares: dict) -> dict:
    """Does a candidate carry what the brief requires?"""
    at = (brief.get("thresholds") or {}).get("present_at", PRESENT_AT)
    missing = [k for k in brief.get("mandatory", []) if shares.get(k, 0.0) < at]
    have = [k for k in brief.get("preferred", []) if shares.get(k, 0.0) >= at]
    return {"missing_mandatory": missing, "preferred_present": have,
            "ok": not missing,
            "preferred_score": round(len(have) / max(1, len(brief.get("preferred", []))), 3)}


def self_test() -> int:
    checks = [(MANDATORY_AT > PREFERRED_AT >= PRESENT_AT,
               "the thresholds are ordered mandatory > preferred >= present")]
    # CONTROL: a brief must be able to require NO flower. A universal flower rule would make
    # every foliage-only card -- Plantain, the conifers -- unsatisfiable.
    b = derive("plantago_major", "plantago-major")
    checks.append((b is not None and not any("flower" in k for k in b["mandatory"]),
                   "CONTROL: Plantain's derived brief requires no flower"))
    d = derive("taraxacum_officinale", "taraxacum-officinale")
    checks.append((d is not None and "flower_yellow" in d["mandatory"],
                   "Dandelion's brief requires its yellow flower"))
    e = derive("sambucus_canadensis", "sambucus-spp")
    checks.append((e is not None and "berry_dark" in e["mandatory"],
                   "Elderberry's brief requires dark berries"))
    checks.append((e is not None and "berry_dark" in e["mandatory"]
                   and "flower_white" not in e["mandatory"],
                   "CONTROL: Elderberry requires BERRIES, not the flower umbel"))
    # CONTROL: a blank frame satisfies nothing.
    blank = np.zeros((200, 200, 3), np.uint8)
    checks.append((not check(d, structures(blank))["ok"],
                   "CONTROL: an empty photograph fails a brief"))
    ok = True
    for good, label in checks:
        print(("PASS  " if good else "FAIL  ") + label)
        ok &= bool(good)
    print("\n" + ("ALL SELF-TESTS PASSED" if ok else "SELF-TESTS FAILED"))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--derive-all", action="store_true")
    ap.add_argument("--show")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if a.show:
        b = load(a.show)
        print(json.dumps(b, indent=2) if b else f"no brief for {a.show}")
        return 0 if b else 1
    if a.derive_all:
        herbs = json.loads((ROOT / "src" / "data" / "herbs.json").read_text())["herbs"]
        n = 0
        for h in herbs:
            key = h["id"].replace("-", "_")
            b = load(key, h["id"])
            if b:
                n += 1
                print(f"{h['commonName']:22} mandatory={b['mandatory']} preferred={b['preferred']}"
                      + ("  [edited]" if b.get("edited") else ""))
        print(f"\n{n} briefs in {BRIEFS}")
        return 0
    ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
