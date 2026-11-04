#!/usr/bin/env python3
"""Attack a REAL draft against its REAL bundle, and fail if any attack gets through.

────────────────────────────────────────────────────────────────────────────────
A GUARD THAT PASSES IS A QUESTION ABOUT THE GUARD.

`check_citations.py --self-test` exercises its refusals against a hand-built fixture, and a
fixture is a thing written to make a test pass. This runs the same refusals against the
bundle actually retrieved from Europe PMC and the claims actually drafted from it, by
taking a passing claim and breaking exactly one thing about it.

Every mutation below is a real mistake an extractor makes:

  paraphrase        One word changed inside the quote -- the commonest failure by far, and
                    invisible to a reader comparing a claim with its source by eye.
  hallucinated      A quote that appears nowhere in the bundle.
  wrong-passage     A real quote, attributed to a different real passage.
  wrong-source      A real quote and passage, cited to a different real source.
  standing-upgrade  "People used it" re-filed as a clinical finding.
  risk-downgrade    A toxicity claim shipped with high_risk false.
  pre-approved      An ai-assisted claim arriving already approved.
  cross-species     This species' draft checked against another species' evidence.

    python3 scripts/adversarial_citations.py \\
        evidence/retrieved/matricaria_chamomilla.json \\
        evidence/drafts/matricaria_chamomilla.json
"""

from __future__ import annotations

import argparse
import copy
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from check_citations import check  # noqa: E402


def _passing(draft: dict) -> dict:
    for claim in draft["claims"]:
        if claim.get("citation_check", {}).get("ok"):
            return copy.deepcopy(claim)
    raise SystemExit("no passing claim to attack -- run check_citations.py first")


def attacks(retrieved: dict, draft: dict) -> list[tuple[str, dict, str]]:
    """(name, mutated draft, what must happen) -- `refuse` or `raise`."""
    good = _passing(draft)
    other = next(
        p for p in retrieved["literature"]["passages"]
        if p["passage_id"] != good["passage_id"]
        and p["source_id"] != good["source_ids"][0]
    )
    out: list[tuple[str, dict, str]] = []

    def one(name: str, claim: dict, expect: str = "refuse") -> None:
        out.append((name, {**draft, "claims": [claim]}, expect))

    # 1. One word changed inside the quote.
    words = good["quote"].split()
    swapped = dict(good)
    swapped["quote"] = " ".join(["Notably"] + words[1:]) if len(words) > 1 else "x"
    swapped.pop("citation_check", None)
    one("paraphrase (one word changed)", swapped)

    # 2. A quote that is nowhere in the bundle.
    invented = dict(good)
    invented["quote"] = ("Chamomile has been shown in randomised trials to cure "
                         "generalised anxiety disorder.")
    invented.pop("citation_check", None)
    one("hallucinated quote", invented)

    # 3. A real quote attributed to a different real passage.
    moved = dict(good)
    moved["passage_id"] = other["passage_id"]
    moved["source_ids"] = [other["source_id"]]
    moved.pop("citation_check", None)
    one("real quote, wrong passage", moved)

    # 4. A real quote and passage cited to a different real source.
    miscited = dict(good)
    miscited["source_ids"] = [other["source_id"]]
    miscited.pop("citation_check", None)
    one("real passage, wrong source", miscited)

    # 5. "People used it" re-filed as a clinical finding.
    upgraded = dict(good)
    upgraded["standing"] = "clinical"
    upgraded.pop("citation_check", None)
    one("standing upgraded to clinical", upgraded)

    # 6. A toxicity claim shipped with high_risk false. This one must be SILENTLY
    #    CORRECTED rather than refused -- the rule is that risk is derived -- so it is
    #    checked separately below.

    # 7. An ai-assisted claim arriving already approved.
    approved = dict(good)
    approved["review"] = {"verdict": "approve", "by": "nobody", "on": "2026-01-01",
                          "note": None}
    approved.pop("citation_check", None)
    one("pre-approved ai draft", approved, expect="raise")

    return out


def run(retrieved: dict, draft: dict) -> int:
    results: list[tuple[bool, str]] = []

    for name, mutated, expect in attacks(retrieved, draft):
        try:
            check(copy.deepcopy(retrieved), mutated)
            if expect == "raise":
                results.append((False, f"{name}: expected a hard refusal, got none"))
                continue
            ok = not mutated["claims"][0]["citation_check"]["ok"]
            why = mutated["claims"][0]["citation_check"]["reason"]
            results.append((ok, f"{name} -> {'REFUSED' if ok else 'ACCEPTED (BAD)'}"
                                f"{f': {why}' if ok else ''}"))
        except ValueError as error:
            results.append((expect == "raise", f"{name} -> raised: {error}"))

    # 6. Risk is DERIVED: a toxicity claim with high_risk false is corrected, not refused.
    good = _passing(draft)
    lied = {**good, "kind": "toxicity", "high_risk": False}
    lied.pop("citation_check", None)
    probe = {**draft, "claims": [lied]}
    check(copy.deepcopy(retrieved), probe)
    results.append((probe["claims"][0]["high_risk"] is True,
                    "toxicity claim with high_risk=false -> recomputed to true"))

    # 8. This draft checked against another species' evidence.
    foreign = copy.deepcopy(retrieved)
    foreign["species_key"] = "tanacetum vulgare"
    try:
        check(foreign, copy.deepcopy(draft))
        results.append((False, "cross-species check -> ACCEPTED (BAD)"))
    except ValueError:
        results.append((True, "cross-species check -> raised"))

    bad = sum(1 for ok, _ in results if not ok)
    for ok, line in results:
        print(f"{'PASS' if ok else 'FAIL'}  {line}")
    print(f"\n{len(results) - bad}/{len(results)} attacks were stopped"
          if not bad else f"\n{bad} ATTACK(S) GOT THROUGH")
    return 1 if bad else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("retrieved")
    parser.add_argument("draft")
    args = parser.parse_args()
    return run(json.loads(pathlib.Path(args.retrieved).read_text()),
               json.loads(pathlib.Path(args.draft).read_text()))


if __name__ == "__main__":
    sys.exit(main())
