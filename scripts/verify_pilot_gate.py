#!/usr/bin/env python3
"""Prove the gating works, from the pilot's own first set, before the other five run.

WHY THIS IS NOT A PREFLIGHT, AND WHY IT COULD NOT BE.

Three of the five checks the pilot must pass are claims about what a REQUEST does:

  1. a one-photograph request succeeds on TEST
  2. the comparison account makes the function ask BOTH providers
  3. the ordinary account makes it ask PlantNet only

None is answerable by reading configuration. Check 2 in particular is the claim "this
request costs a Kindwise credit", and the only way to establish it is to make a request that
costs a Kindwise credit. A separate preflight would therefore be a SEVENTH credit on a
six-credit budget.

So the first SET is the gate. Its four requests are the pilot's own first four — nothing
extra is sent and nothing extra is spent — and all three behavioural claims fall out of
them. If any fails, the run stops having spent ONE credit instead of six, and the remaining
five sets are never sent. That is the strongest guarantee available: the alternative is not
"verify for free", it is "verify for a credit you did not budget".

WHAT IT READS. The gate run's JSONL, and the `identification_comparisons` rows those
observations produced. Nothing here re-derives an identification or scores an answer; that
is `benchmark/report.bench.test.ts`'s job, on the whole run, afterwards.

Usage:  verify_pilot_gate.py <results.jsonl> <comparisons.json>
"""

from __future__ import annotations

import json
import sys


def main() -> int:
    results_path = sys.argv[1] if len(sys.argv) > 1 else ""
    comparisons_path = sys.argv[2] if len(sys.argv) > 2 else ""

    records = []
    with open(results_path, encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                records.append(json.loads(line))
    with open(comparisons_path, encoding="utf-8") as handle:
        comparisons = json.load(handle)

    # observation id -> the providers that wrote a row for it
    providers: dict[str, set[str]] = {}
    for row in comparisons:
        providers.setdefault(row["observation_id"], set()).add(row["provider"])

    failures: list[str] = []

    def check(label: str, ok: bool, detail: str) -> None:
        print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
        if not ok:
            failures.append(f"{label} — {detail}")

    print(f"gate: {len(records)} request(s) from the first set")

    by_condition = {record["condition"]: record for record in records}

    # ── 1. One photograph is accepted on TEST ────────────────────────────────
    one = by_condition.get("p1")
    if one is None:
        check("the 1-photograph condition ran", False, "no p1 record in the gate run")
    else:
        code = (one.get("response") or {}).get("code")
        check(
            "a 1-photograph request is accepted on TEST",
            one["http"] == 200,
            f"HTTP {one['http']}"
            + (
                " with code 'tooFewImages' — IDENTIFY_MIN_IMAGES is not reaching the "
                "function. A secret change needs a REDEPLOY; edge functions read their "
                "environment at boot."
                if code == "tooFewImages"
                else ""
            ),
        )
        check(
            "it really sent one image",
            len(one.get("images") or []) == 1,
            f"{len(one.get('images') or [])} images were sent, so this measures nothing",
        )

    # ── 2. The comparison account asks BOTH providers ────────────────────────
    comparing = [record for record in records if record.get("comparing")]
    check(
        "exactly one request was made as the comparison account",
        len(comparing) == 1,
        f"{len(comparing)} were — each one costs a Kindwise credit, so this is the budget",
    )
    for record in comparing:
        observation = (record.get("response") or {}).get("observationId")
        got = providers.get(observation or "", set())
        check(
            f"the comparison account triggered BOTH providers ({record['condition']})",
            got == {"plantnet", "plantid"},
            f"rows came from {sorted(got) or 'nobody'} — one side missing is not a "
            "comparison, and the run would report a provider result that does not exist",
        )

    # ── 3. The ordinary account asks PlantNet ONLY ───────────────────────────
    #
    # THE CHEAPER HALF OF THE BUDGET DEPENDS ENTIRELY ON THIS. Eighteen of the pilot's
    # twenty-four requests are meant to cost no credit, which is true only while the plain
    # account is outside the allow-list. A row here means it is inside it, and the real
    # cost of the run is 24 credits rather than 6.
    plain = [
        record
        for record in records
        if not record.get("comparing") and record.get("http") == 200
    ]
    check(
        "the ordinary account made the other requests",
        len(plain) >= 1,
        "no successful non-comparison request to check",
    )
    leaked = []
    for record in plain:
        observation = (record.get("response") or {}).get("observationId")
        if observation and providers.get(observation):
            leaked.append(f"{record['condition']} -> {sorted(providers[observation])}")
    check(
        "the ordinary account triggered PlantNet ONLY",
        not leaked,
        "comparison rows exist for requests that must cost no credit: "
        + "; ".join(leaked)
        + ". The plain account is on the allow-list, so the run would cost 24 credits.",
    )

    # ── 4. Every request is signed in ────────────────────────────────────────
    #
    # Not a safety check, a validity one: an anonymous request is capped at 5/day per IP,
    # so a run that silently fell back would die partway through and report a truncated
    # benchmark as a complete one.
    anonymous = [record for record in records if not record.get("signedIn")]
    check(
        "every request was signed in",
        not anonymous,
        f"{len(anonymous)} went out anonymously, which is a 5/day bucket",
    )

    if failures:
        for line in failures:
            print(f"::error::{line}")
        print("::error::GATE FAILED. The remaining five sets were not sent.")
        return 1

    print("  gate passed; the remaining sets may run.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
