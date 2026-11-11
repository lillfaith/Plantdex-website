#!/usr/bin/env python3
"""Print what a retrieved bundle actually contains, for a workflow log or a terminal.

A separate file rather than a heredoc inside the workflow: a block scalar's content has to
stay indented, and inline Python at column 0 silently breaks the whole YAML document --
which it did, producing a run with zero jobs and a bare "failure".
"""

from __future__ import annotations

import json
import pathlib
import sys


def summarise(path: pathlib.Path) -> None:
    data = json.loads(path.read_text())
    identity, conservation = data["identity"], data["conservation"]
    print(f"--- {path}")
    print(f"  state        {data['state']}")
    print(f"  species_key  {data['species_key']}")
    print(f"  accepted     {identity['accepted_name']}  [{identity['gbif_status']}]"
          f"  match={identity['match_type']} conf={identity['match_confidence']}")
    print(f"  gbif_id      {identity['gbif_id']}  rank={identity['rank']}"
          f"  family={identity['family']}")
    print(f"  synonyms     {len(identity['synonyms'])}")
    print(f"  iucn         {conservation['iucn_category']}"
          f"  at_risk={conservation['at_risk']}"
          f"  promotable={conservation['promotable']}")
    print(f"  counts       {data['counts']}")
    for label, ids in data["literature"]["groups"].items():
        print(f"    {label:<18} {len(ids)} source(s)")
    verified = [s["source_id"] for s in data["literature"]["sources"] if s.get("verified")]
    print(f"  verified     {verified or 'none (correct: retrieval cannot verify)'}")


def main() -> int:
    paths = [pathlib.Path(a) for a in sys.argv[1:]]
    if not paths:
        print("usage: summarise_evidence.py <bundle.json> [...]", file=sys.stderr)
        return 2
    for path in paths:
        summarise(path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
