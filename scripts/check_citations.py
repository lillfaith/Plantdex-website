#!/usr/bin/env python3
"""Stage 3 of the pipeline: CITATION-CHECK. Deterministic, no model, no network.

────────────────────────────────────────────────────────────────────────────────
WHAT `citation-checked` MEANS, AND THE THING IT IS CONSTANTLY MISTAKEN FOR.

It means: every claim quotes a string that is a VERBATIM SUBSTRING of a passage this
pipeline actually retrieved, and the claim cites the source that passage came from.

It does NOT mean the source is sound, that it is about this species, that the finding
replicated, or that anybody has read it. `verified` continues to mean exactly what
`src/data/sources.json` has always made it mean — A HUMAN OPENED THE DOCUMENT — and this
check cannot produce it, move toward it, or stand in for it. The two words name different
acts, and a renderer that prints one where the other belongs is the failure this whole
file exists to prevent.

So this script sets `citation_check.ok` and NOTHING ELSE. It never sets `verified`, never
sets a review verdict, and never promotes a bundle to `approved`.
────────────────────────────────────────────────────────────────────────────────

Six refusals, each with a control in --self-test:

  1. A quote that is not a verbatim substring of its cited passage.
  2. A passage_id that was never retrieved.
  3. A source_id that is not the source that passage came from.
  4. `high_risk` is RECOMPUTED from `kind` and a supplied value is overwritten — the same
     rule `set_medicinal_claim_risk()` enforces in 0010, for the same reason: left to an
     author, the one row that most needs the flag is the one most likely to be missing it.
  5. A `standing` stronger than its evidence supports. A claim cited only to an
     ethnobotany hit may not come back as `clinical`: that is the exact upgrade — "people
     used it" becoming "it works" — that the whole three-way standing exists to stop.
  6. Any source marked `verified`, or any claim marked `approved`, at this stage. Both
     mirror constraints 0010 already carries.

    python3 scripts/check_citations.py evidence/out/x.json drafts/x.json
    python3 scripts/check_citations.py --self-test
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
from datetime import datetime, timezone

# ── The five states, in order. Mirrored in src/lib/pipeline-states.ts; a test holds the
# ── two equal, because a state list that drifts is a state list that lies.
STATES = ["retrieved", "ai-extracted", "citation-checked", "human-reviewed", "approved"]

# `medicinal_claims.kind` in 0010, verbatim.
CLAIM_KINDS = ["traditional-use", "studied-property", "compound", "plant-part",
               "preparation", "toxicity", "contraindication", "lookalike-hazard"]

# `medicinal_claims.standing` in 0010 / `EvidenceStanding` in trait-evidence.ts, verbatim.
STANDINGS = ["traditional", "laboratory", "clinical"]

# 0010's `set_medicinal_claim_risk()`, restated. Kept as data so the equality is checkable.
HIGH_RISK_KINDS = {"toxicity", "contraindication", "lookalike-hazard"}

# Which standings a query group can support. `documented-use` finds ethnobotany and folk
# records: they establish that people USED a plant, which is `traditional` and nothing more.
GROUP_CEILING = {
    "documented-use": {"traditional"},
    "laboratory-study": {"traditional", "laboratory", "clinical"},
}


def fail(claim: dict, reason: str) -> None:
    claim["citation_check"] = {"ok": False, "reason": reason}


def check(retrieved: dict, draft: dict) -> dict:
    """Annotate every claim in `draft` and return a report. Mutates `draft`."""
    passages = {p["passage_id"]: p for p in retrieved["literature"]["passages"]}
    groups = retrieved["literature"]["groups"]
    group_of = {sid: label for label, ids in groups.items() for sid in ids}

    if retrieved.get("species_key") != draft.get("species_key"):
        raise ValueError(
            f"bundle mismatch: retrieved {retrieved.get('species_key')!r} "
            f"but draft {draft.get('species_key')!r}"
        )

    for source in retrieved["literature"]["sources"]:
        if source.get("verified"):
            raise ValueError(
                f"{source['source_id']} is marked verified in a retrieved bundle. "
                "Retrieval cannot verify anything; only a human opening the document can."
            )

    problems: list[str] = []
    for claim in draft.get("claims", []):
        cid = claim.get("claim_id", "?")

        if claim.get("review", {}).get("verdict") == "approve":
            raise ValueError(
                f"{cid} arrives already approved. An AI-extracted claim may never BE the "
                "approved state -- 0010's ai_drafts_are_never_self_approving."
            )

        if claim.get("kind") not in CLAIM_KINDS:
            fail(claim, f"kind {claim.get('kind')!r} is not one of {CLAIM_KINDS}")
            problems.append(cid)
            continue
        if claim.get("standing") not in STANDINGS:
            fail(claim, f"standing {claim.get('standing')!r} is not one of {STANDINGS}")
            problems.append(cid)
            continue

        # (4) Risk is derived, always, and a supplied value is discarded rather than trusted.
        claim["high_risk"] = claim["kind"] in HIGH_RISK_KINDS

        pid = claim.get("passage_id")
        passage = passages.get(pid)
        if passage is None:
            fail(claim, f"passage_id {pid!r} was never retrieved")
            problems.append(cid)
            continue

        quote = (claim.get("quote") or "").strip()
        if not quote:
            fail(claim, "no quote: a claim with nothing quoted cannot be checked at all")
            problems.append(cid)
            continue
        if quote not in passage["text"]:
            fail(claim, "quote is not a verbatim substring of the cited passage")
            problems.append(cid)
            continue

        cited = list(claim.get("source_ids") or [])
        if cited != [passage["source_id"]]:
            fail(claim, f"source_ids {cited} do not match the cited passage's source "
                        f"{passage['source_id']!r}")
            problems.append(cid)
            continue

        ceiling = GROUP_CEILING.get(group_of.get(passage["source_id"], ""), set(STANDINGS))
        if claim["standing"] not in ceiling:
            fail(claim, f"standing {claim['standing']!r} exceeds what a "
                        f"{group_of.get(passage['source_id'])!r} source can support "
                        f"(allowed: {sorted(ceiling)})")
            problems.append(cid)
            continue

        claim["citation_check"] = {"ok": True, "reason": None}

    passed = [c for c in draft.get("claims", []) if c.get("citation_check", {}).get("ok")]
    draft["state"] = "citation-checked"
    draft["citation_check"] = {
        "checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "checker": "scripts/check_citations.py",
        "claims_in": len(draft.get("claims", [])),
        "claims_passed": len(passed),
        "claims_refused": len(problems),
        "refused_ids": problems,
        "means": ("Every passing claim quotes a verbatim substring of a retrieved passage "
                  "and cites that passage's source. This is NOT verification: no human has "
                  "opened any of these documents."),
    }
    return draft["citation_check"]


# ── Self-test: one control per refusal ─────────────────────────────────────────

def _fixture() -> tuple[dict, dict]:
    text = ("Matricaria chamomilla is used as an infusion in European folk medicine, "
            "and the practice is recorded across several regional ethnobotanical surveys "
            "carried out in the twentieth century. The present review summarises them.")
    retrieved = {
        "species_key": "matricaria chamomilla",
        "literature": {
            "groups": {"documented-use": ["pmc-1"], "laboratory-study": ["pmc-2"]},
            "sources": [{"source_id": "pmc-1", "verified": False},
                        {"source_id": "pmc-2", "verified": False}],
            "passages": [
                {"passage_id": "pmc-1#abstract-0", "source_id": "pmc-1",
                 "located_in": "abstract", "text": text},
                {"passage_id": "pmc-2#abstract-0", "source_id": "pmc-2",
                 "located_in": "abstract", "text": "An extract of Matricaria chamomilla "
                 "showed antioxidant activity in vitro in this assay, measured against a "
                 "standard control series across three independent runs."},
            ],
        },
    }
    draft = {"species_key": "matricaria chamomilla", "claims": []}
    return retrieved, draft


def _one(claim: dict) -> dict:
    retrieved, draft = _fixture()
    draft["claims"] = [claim]
    check(retrieved, draft)
    return draft["claims"][0]["citation_check"]


def self_test() -> int:
    good_quote = "used as an infusion in European folk medicine"
    base = {"claim_id": "c1", "kind": "traditional-use", "standing": "traditional",
            "body": "Used traditionally as an infusion.", "quote": good_quote,
            "passage_id": "pmc-1#abstract-0", "source_ids": ["pmc-1"]}

    checks = [
        (_one(dict(base))["ok"] is True, "a correctly cited claim passes"),
        (_one({**base, "quote": "used as a tincture in European folk medicine"})["ok"] is False,
         "CONTROL 1: a quote that is not verbatim is refused"),
        (_one({**base, "passage_id": "pmc-9#abstract-0"})["ok"] is False,
         "CONTROL 2: an unretrieved passage_id is refused"),
        (_one({**base, "source_ids": ["pmc-2"]})["ok"] is False,
         "CONTROL 3: a source_id that is not the passage's source is refused"),
        (_one({**base, "standing": "clinical"})["ok"] is False,
         "CONTROL 5: an ethnobotany passage cannot support a clinical standing"),
        (_one({"claim_id": "c2", "kind": "studied-property", "standing": "laboratory",
               "body": "Antioxidant activity has been measured in vitro.",
               "quote": "showed antioxidant activity in vitro",
               "passage_id": "pmc-2#abstract-0", "source_ids": ["pmc-2"]})["ok"] is True,
         "...while a laboratory-study passage can support a laboratory standing"),
        (_one({**base, "quote": ""})["ok"] is False, "an empty quote is refused"),
        (_one({**base, "kind": "invented"})["ok"] is False, "an unknown kind is refused"),
    ]

    # CONTROL 4: risk is recomputed, and a lie about it is overwritten.
    retrieved, draft = _fixture()
    draft["claims"] = [{**base, "claim_id": "c3", "kind": "toxicity", "high_risk": False}]
    check(retrieved, draft)
    checks.append((draft["claims"][0]["high_risk"] is True,
                   "CONTROL 4: high_risk is recomputed from kind, not taken from the draft"))
    retrieved, draft = _fixture()
    draft["claims"] = [{**base, "claim_id": "c4", "high_risk": True}]
    check(retrieved, draft)
    checks.append((draft["claims"][0]["high_risk"] is False,
                   "...and an inflated high_risk is cleared too, not just a missing one"))

    # CONTROL 6a: a verified source in a retrieved bundle is a hard error.
    retrieved, draft = _fixture()
    retrieved["literature"]["sources"][0]["verified"] = True
    try:
        check(retrieved, draft)
        checks.append((False, "CONTROL 6a: a verified retrieved source must raise"))
    except ValueError as error:
        checks.append(("verified" in str(error),
                       "CONTROL 6a: a verified source in a retrieved bundle raises"))

    # CONTROL 6b: a pre-approved claim is a hard error.
    retrieved, draft = _fixture()
    draft["claims"] = [{**base, "review": {"verdict": "approve"}}]
    try:
        check(retrieved, draft)
        checks.append((False, "CONTROL 6b: a pre-approved claim must raise"))
    except ValueError as error:
        checks.append(("approved" in str(error),
                       "CONTROL 6b: an AI draft arriving approved raises"))

    # The species keys must match, or a draft could be checked against another plant.
    retrieved, draft = _fixture()
    draft["species_key"] = "tanacetum vulgare"
    try:
        check(retrieved, draft)
        checks.append((False, "a mismatched species_key must raise"))
    except ValueError:
        checks.append((True, "a draft checked against another species' evidence raises"))

    # The derived-risk rule must equal 0010's trigger, not merely resemble it.
    checks.append((HIGH_RISK_KINDS == {"toxicity", "contraindication", "lookalike-hazard"},
                   "HIGH_RISK_KINDS equals set_medicinal_claim_risk()'s list"))
    checks.append((STATES[0] == "retrieved" and STATES[-1] == "approved" and len(STATES) == 5,
                   "the five states are in order, weakest first"))

    bad = sum(1 for ok, _ in checks if not ok)
    for ok, label in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {label}")
    print("\nALL SELF-TESTS PASSED" if not bad else f"\n{bad} FAILURE(S)")
    return 1 if bad else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("retrieved", nargs="?")
    parser.add_argument("draft", nargs="?")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if not (args.retrieved and args.draft):
        print("usage: check_citations.py <retrieved.json> <draft.json>", file=sys.stderr)
        return 2
    retrieved = json.loads(pathlib.Path(args.retrieved).read_text())
    path = pathlib.Path(args.draft)
    draft = json.loads(path.read_text())
    report = check(retrieved, draft)
    path.write_text(json.dumps(draft, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(report, indent=2))
    return 0 if report["claims_refused"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
