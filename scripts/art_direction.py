#!/usr/bin/env python3
"""Loader for evidence/art-direction.json -- the owner's subjective preferences.

Separate from visual_brief.py on purpose. A brief is botanical and its failures are hard;
this is art direction and its failures are soft. One module each keeps a preference from
ever being read by the code that decides whether a photograph is usable at all.
"""
from __future__ import annotations

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
PATH = ROOT / "evidence" / "art-direction.json"


def document() -> dict:
    return json.loads(PATH.read_text()) if PATH.exists() else {"shared": [], "species": {}}


def for_species(species: str) -> dict:
    doc = document()
    d = dict(doc.get("species", {}).get(species, {}))
    d["shared"] = doc.get("shared", [])
    return d


def as_prompt(species: str) -> str:
    """The directive as the vision rubric sees it. Empty when nothing is written down."""
    d = for_species(species)
    if not (d.get("want") or d.get("avoid")):
        return ""
    lines = []
    if d.get("want"):
        lines.append(f"  WANTED: {d['want']}")
    if d.get("avoid"):
        lines.append(f"  AVOID: {d['avoid']}")
    for s in d.get("shared", []):
        lines.append(f"  DECK HABIT: {s}")
    return "\n".join(lines)


def summary(species: str) -> str:
    d = for_species(species)
    return (d.get("owner") or d.get("want") or "").strip()


if __name__ == "__main__":
    import sys
    for s in (sys.argv[1:] or sorted(document().get("species", {}))):
        print(f"=== {s} ===")
        print(as_prompt(s) or "  (nothing written down)")
