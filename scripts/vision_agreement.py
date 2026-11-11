#!/usr/bin/env python3
"""Does the automated review agree with the owner? Measured, per photograph.

This is the test the whole vision step exists to pass, and it is the one thing a run of the
pipeline cannot tell you about itself. A verdict that agrees with every metric and disagrees
with the person who owns the deck is not a working system; a verdict that agrees with him on
photographs he has already judged is evidence it may be trusted on ones he has not.

WHAT COUNTS AS AGREEMENT. The owner's verdicts and the model's are not the same vocabulary,
so they are compared on the one question both answer -- IS THIS PHOTOGRAPH USABLE:

  owner `rejected`              -> expects NOT usable
  owner `approved`              -> expects usable
  owner `preferred`             -> expects usable (he pinned it; he has not approved it)

  model usable  = meets_brief AND identifiable AND cropping.complete AND segmentation.clean
  art direction is EXCLUDED from that conjunction on purpose: it is his taste, and a model
  that learns to predict his taste from a sentence he wrote is measuring the sentence.
  It is reported beside each row instead, because an art-direction rejection the model also
  flagged is worth knowing about -- it just is not what "usable" means.

ONLY GENUINE API VERDICTS ARE SCORED. A `deterministic-fallback` row is the colour pipeline
wearing the vision field's clothes; counting one as agreement would report the thing this
script exists to detect as absent. Those rows are listed as NOT TESTED, and if that is all
there is, the summary says so and the agreement rate is undefined rather than 100%.

    python3 scripts/vision_agreement.py
    python3 scripts/vision_agreement.py --species pinus_strobus --json
"""
from __future__ import annotations

import argparse, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import decisions                                      # noqa: E402

BASE = ROOT / "evidence" / "candidates"
EXPECT_USABLE = {"approved": True, "preferred": True, "rejected": False}


def model_usable(v: dict) -> tuple[bool | None, list[str]]:
    """The model's answer to 'is this usable', with the reasons it is not.

    None when the verdict does not answer -- an older row that never saw the source frame
    cannot speak to cropping, and inferring a pass from its silence is how an untested claim
    becomes a tested one.
    """
    why = []
    if v.get("meets_brief") is False:
        why.append("does not meet the brief")
    if v.get("identifiable") is False:
        why.append("not identifiable")
    if v.get("orientation") == "back":
        why.append("identifying structure faces away")
    crop, seg = v.get("cropping") or {}, v.get("segmentation") or {}
    if crop.get("complete") is False:
        why.append("cropped in the source: " + (", ".join(crop.get("lost", [])) or "?"))
    if seg.get("clean") is False:
        why.append("segmentation: " + (", ".join(seg.get("defects", [])) or "?"))
    answered = any(k in v for k in ("meets_brief", "identifiable")) or crop or seg
    if not answered:
        return None, ["the verdict answers none of the usability questions"]
    return (not why), why


def rows(species: list[str] | None = None) -> list[dict]:
    owner = decisions.current()
    names = species or sorted(p.name for p in BASE.iterdir() if p.is_dir())
    out = []
    for sp in names:
        vf = BASE / sp / "vision.json"
        if not vf.exists():
            continue
        doc = json.loads(vf.read_text())
        for v in doc.get("rows", []):
            pid = str(v["photo_id"])
            o = owner.get(pid)
            if not o:
                continue
            genuine = v.get("source") == "vision"
            usable, why = model_usable(v) if genuine else (None, ["no genuine API verdict"])
            expect = EXPECT_USABLE.get(o["decision"])
            ad = (v.get("art_direction") or {})
            out.append({
                "species": sp, "photo_id": pid,
                "owner": o["decision"], "owner_reason": o.get("reason", ""),
                "genuine_api_vision": genuine, "model_usable": usable,
                "model_reasons": why, "expected_usable": expect,
                "art_direction_flagged": ad.get("meets") is False,
                "art_direction_why": ad.get("why", ""),
                "stages_seen": v.get("stages") or v.get("stages_seen") or [],
                "agreement": (None if usable is None or expect is None
                              else usable == expect),
            })
    return out


def report(data: list[dict]) -> int:
    tested = [r for r in data if r["agreement"] is not None]
    agree = [r for r in tested if r["agreement"]]
    for r in data:
        mark = ("AGREES   " if r["agreement"] else
                "DISAGREES" if r["agreement"] is False else "NOT TESTED")
        print(f"{mark}  {r['species']:24} #{r['photo_id']:<11} owner={r['owner']}")
        if r["stages_seen"]:
            print(f"            saw: {', '.join(s.split(' (')[0] for s in r['stages_seen'])}")
        for w in r["model_reasons"]:
            print(f"            model: {w}")
        if r["agreement"] is None and not r["genuine_api_vision"]:
            print("            (fallback row; this is NOT a test of the automated system)")
        if r["art_direction_flagged"]:
            print(f"            art direction also flagged: {r['art_direction_why'][:90]}")
        if r["agreement"] is False:
            print(f"            owner said: {r['owner_reason'][:110]}")
    print()
    if not tested:
        print(f"{len(data)} owner-judged photograph(s) have a vision row and NONE of them "
              f"carries a genuine API verdict.")
        print("AGREEMENT IS UNDEFINED, not 100%. Configure ANTHROPIC_API_KEY and run the "
              "vision-review workflow; until then the automated system is untested against "
              "the owner's judgement.")
        return 0
    print(f"{len(agree)}/{len(tested)} agree on usability "
          f"({len(data) - len(tested)} not tested for want of a genuine verdict)")
    return 0


def self_test() -> int:
    checks = []
    u, why = model_usable({"source": "vision", "meets_brief": True, "identifiable": True,
                           "cropping": {"complete": True}, "segmentation": {"clean": True}})
    checks.append((u is True and not why, "a clean three-stage verdict is usable"))
    u2, w2 = model_usable({"meets_brief": True, "identifiable": True,
                           "cropping": {"complete": False, "lost": ["spike top"]},
                           "segmentation": {"clean": True}})
    checks.append((u2 is False and any("spike top" in x for x in w2),
                   "CONTROL: a structure cut off in the source makes it unusable"))
    # CONTROL: art direction must not change usability -- the pine is identifiable and clean.
    u3, _ = model_usable({"meets_brief": True, "identifiable": True,
                          "cropping": {"complete": True}, "segmentation": {"clean": True},
                          "art_direction": {"meets": False, "composition": "whole_tree"}})
    checks.append((u3 is True, "CONTROL: an art-direction flag does not make it unusable"))
    # CONTROL: a verdict that answers nothing is NOT TESTED, never a pass.
    u4, _ = model_usable({"source": "vision"})
    checks.append((u4 is None, "CONTROL: a silent verdict is untested, not a pass"))
    # CONTROL: a fallback row can never count as agreement.
    r = [x for x in rows() if not x["genuine_api_vision"]]
    checks.append((all(x["agreement"] is None for x in r),
                   "CONTROL: no fallback row is ever scored as agreement"))
    ok = True
    for good, label in checks:
        print(("PASS  " if good else "FAIL  ") + label)
        ok &= bool(good)
    print("\n" + ("ALL SELF-TESTS PASSED" if ok else "SELF-TESTS FAILED"))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--species", nargs="*")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    data = rows(a.species or None)
    if a.json:
        print(json.dumps(data, indent=2))
        return 0
    if not data:
        print("no photograph has both an owner verdict and a vision row yet")
        return 0
    return report(data)


if __name__ == "__main__":
    sys.exit(main())
