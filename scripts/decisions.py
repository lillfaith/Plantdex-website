#!/usr/bin/env python3
"""The owner's own verdicts on candidate photographs -- the one input no automated step
may overturn, and the one input the owner must be able to CHANGE.

Those two requirements pull against each other and the first version only honoured the
first: a decision, once written, could never be rewritten. That is wrong in a specific and
foreseeable way. Judgement moves -- a candidate rejected because nothing better existed is
a different judgement once something better does, and a rejection made from a thumbnail is
a different judgement once the finished card is on a contact sheet. A ledger that cannot
record the second reading forces the owner to edit the file by hand, which loses the first.

So a decision is APPEND-ONLY, NOT IMMUTABLE. Every verdict ever recorded for a photo id is
kept in `history`, oldest first; the LAST entry is the current one. Superseding requires an
explicit `revise` and a reason, so a revision cannot happen by accident or by a re-run, and
the previous reading is still readable afterwards -- which is the part that matters, because
the reason a candidate was once rejected is evidence about the species even after the
verdict changes.

Three decision values, and the third exists because "I prefer this one" is not "I approve
this card":
  rejected   -- never use this photograph. Final: gates.py makes it REJECTED.
  approved   -- the owner approves this card. gates.py makes it HUMAN_APPROVED.
  preferred  -- pin this candidate as the leader and keep it out of the rejected pile, but
                do NOT call it approved. It stays NEEDS_REVIEW. This is what "keep it as my
                preferred candidate" means, and collapsing it into `approved` would quietly
                promote a photograph the owner has not signed off on.
  alternative -- the second one he wants kept in view. Also NEEDS_REVIEW, ranked below the
                preferred candidate and above everything unjudged. It exists because he
                named one, and folding it into `preferred` would lose which of the two he
                leads with -- while folding it into nothing would let the next re-rank drop
                a photograph he explicitly asked to keep.
"""
from __future__ import annotations

import datetime as _dt
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
PATH = ROOT / "evidence" / "human-decisions.json"
VALUES = ("approved", "rejected", "preferred", "alternative")


def _migrate(raw: dict) -> dict:
    """v1 was {photo_id: verdict}. Wrap each verdict as the first entry of its history."""
    if raw.get("version") == 2:
        return raw
    out = {"version": 2, "_what": "The owner's verdicts. history is oldest-first; the LAST "
                                 "entry is current. Nothing here is ever deleted.",
           "decisions": {}}
    for pid, v in raw.items():
        if not isinstance(v, dict) or "decision" not in v:
            continue
        out["decisions"][str(pid)] = {"species": v.get("species", ""), "history": [v]}
    return out


def document() -> dict:
    return _migrate(json.loads(PATH.read_text())) if PATH.exists() else {
        "version": 2, "decisions": {}}


def save(doc: dict) -> None:
    PATH.parent.mkdir(parents=True, exist_ok=True)
    PATH.write_text(json.dumps(doc, indent=2) + "\n")


def current() -> dict:
    """{photo_id: the verdict in force}, which is the newest entry of each history."""
    return {pid: d["history"][-1] for pid, d in document()["decisions"].items()
            if d.get("history")}


def history(photo_id: str | int) -> list[dict]:
    return document()["decisions"].get(str(photo_id), {}).get("history", [])


def rejected_ids() -> set[str]:
    return {p for p, v in current().items() if v.get("decision") == "rejected"}


def preferred_ids() -> set[str]:
    return {p for p, v in current().items() if v.get("decision") == "preferred"}


def kept_ids() -> set[str]:
    """Everything the owner asked to keep in view, whichever rank he gave it."""
    return {p for p, v in current().items()
            if v.get("decision") in ("preferred", "alternative", "approved")}


def record(photo_id: str | int, species: str, decision: str, reason: str, *,
           by: str = "owner", revise: bool = False) -> tuple[bool, str]:
    """Append one verdict. Returns (changed, message).

    Refuses silently-destructive cases rather than guessing: a verdict that would replace
    an existing one needs `revise`, and anything but an approval needs a reason, because a
    rejection with no reason teaches the next search nothing.
    """
    pid = str(photo_id)
    if decision not in VALUES:
        return False, f"{pid}: '{decision}' is not one of {', '.join(VALUES)}"
    doc = document()
    entry = doc["decisions"].setdefault(pid, {"species": species, "history": []})
    prev = entry["history"][-1] if entry["history"] else None
    if prev and not revise:
        if prev["decision"] == decision:
            return False, f"{pid}: already {decision}; unchanged"
        return False, (f"{pid}: is {prev['decision']}; set \"revise\": true to supersede "
                       f"that (the old reading is kept in history)")
    if decision != "approved" and not reason.strip():
        return False, f"{pid}: a {decision} needs a reason"
    if prev and revise and not reason.strip():
        return False, f"{pid}: revising {prev['decision']} needs a reason"
    entry["species"] = species or entry.get("species", "")
    entry["history"].append({
        "species": entry["species"], "decision": decision, "reason": reason.strip(),
        "by": by, "at": _dt.date.today().isoformat(),
        **({"supersedes": prev["decision"]} if prev else {})})
    save(doc)
    verb = f"revised {prev['decision']} -> {decision}" if prev else f"recorded {decision}"
    return True, f"{pid}: {verb}"


def self_test() -> int:
    import copy
    global PATH
    keep, tmp = PATH, ROOT / "evidence" / ".decisions-selftest.json"
    live = copy.deepcopy(document())
    PATH = tmp
    try:
        save({"version": 2, "decisions": {}})
        checks = []
        ok, _ = record("1", "s", "rejected", "too small")
        checks.append((ok, "a first verdict records"))
        ok, msg = record("1", "s", "approved", "looks fine now")
        checks.append((not ok and "revise" in msg,
                       "CONTROL: a conflicting verdict refuses without revise"))
        ok, _ = record("1", "s", "approved", "the finished card is right", revise=True)
        checks.append((ok, "revise supersedes"))
        h = history("1")
        checks.append((len(h) == 2 and h[0]["decision"] == "rejected"
                       and h[-1]["decision"] == "approved",
                       "CONTROL: the superseded reading is still in history"))
        checks.append((current()["1"]["decision"] == "approved",
                       "the newest entry is the one in force"))
        ok, msg = record("2", "s", "rejected", "   ")
        checks.append((not ok and "reason" in msg,
                       "CONTROL: a rejection with no reason is refused"))
        record("3", "s", "preferred", "my preferred chamomile")
        checks.append((current()["3"]["decision"] == "preferred"
                       and "3" not in rejected_ids() and "3" in preferred_ids(),
                       "CONTROL: preferred is neither an approval nor a rejection"))
        record("4", "s", "alternative", "the other one worth keeping")
        checks.append((current()["4"]["decision"] == "alternative"
                       and "4" not in preferred_ids() and "4" in kept_ids()
                       and "4" not in rejected_ids(),
                       "CONTROL: alternative is kept and ranked, but is not the leader"))
        # CONTROL: the live v1 file must migrate without losing a verdict.
        mig = _migrate({"9": {"species": "x", "decision": "rejected", "reason": "r"}})
        checks.append((mig["decisions"]["9"]["history"][0]["reason"] == "r",
                       "CONTROL: a v1 file migrates with its reasons intact"))
        good = True
        for c, label in checks:
            print(("PASS  " if c else "FAIL  ") + label)
            good &= bool(c)
        print("\n" + ("ALL SELF-TESTS PASSED" if good else "SELF-TESTS FAILED"))
        return 0 if good else 1
    finally:
        tmp.unlink(missing_ok=True)
        PATH = keep
        assert document() == live, "the self-test must not touch the real ledger"


if __name__ == "__main__":
    import argparse, sys
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--history", metavar="PHOTO_ID")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--migrate", action="store_true",
                    help="rewrite the ledger in the current format, losing nothing")
    a = ap.parse_args()
    if a.self_test:
        sys.exit(self_test())
    if a.migrate:
        save(document())
        print(f"{PATH} is now version 2 with {len(document()['decisions'])} decision(s)")
        sys.exit(0)
    if a.history:
        for i, h in enumerate(history(a.history), 1):
            print(f"{i}. {h['at']}  {h['decision'].upper():10} by {h.get('by','?')}")
            print(f"   {h['reason']}")
        sys.exit(0)
    for pid, v in sorted(current().items()):
        print(f"{pid:12} {v['decision']:10} {v.get('species','')}")
        print(f"             {v['reason'][:110]}")
    sys.exit(0)
