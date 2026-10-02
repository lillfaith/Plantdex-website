#!/usr/bin/env python3
"""Check a field-collected specimen set before anybody relies on it, and emit its manifest.

WHY THIS EXISTS. Phase 1 of the field benchmark is ten plants whose only job is to prove the
protocol and the pipeline work before somebody spends a weekend on fifty. A naming convention
with no checker is the thing that fails silently: thirty files land, three are `spec-01` rather
than `spec-001`, one is a screenshot, one specimen has no CSV row, and none of it surfaces
until a benchmark run reports a smaller set than was collected and nobody notices which.

It makes NO network calls and spends nothing. Run it before sending anything.

WHAT IT REFUSES, AND WHY EACH ONE IS A REAL MISTAKE:

  a directory that is not `spec-NNN`     the harness keys specimens by id; a stray folder is a
                                         specimen silently missing from the run
  a filename it cannot parse             position and organ come from the name, so an
                                         unparseable one is a photograph with no role
  position 1 that is not `habit`         photo 1 IS the p1 condition; if it is a close-up, the
                                         single-photograph arm measures something else entirely
  an organ outside PlantNet's vocabulary the endpoint silently rewrites an unknown organ to
                                         `auto`, so a typo would be accepted and invisible
  duplicate positions                    two `_2-` files means one of them is never sent
  a gap in the positions                 `1` and `3` with no `2` is not a 2-photo specimen
  fewer than 2 photographs               the endpoint's own floor on production; a 1-photo
                                         specimen can only run the p1 arm
  a CSV row with no directory            collected on paper, never transferred
  a directory with no CSV row            photographed, but no ground truth — and ground truth
                                         cannot be reconstructed later, which is the whole
                                         reason it is written down first
  organ3 disagreeing with the files      `none` beside a third photograph, or a third organ
                                         recorded for a specimen that has two files

FOUR OPTIONAL PROVENANCE COLUMNS, FOR A SET THAT WAS NOT PHOTOGRAPHED HERE. `source`,
`source_ref`, `verification` and `same_individual` are absent from the phone set and default
to exactly what that set is: photographs somebody took of one plant, with no external record
behind them. They exist because the second dataset is documented internet observations, and
three facts about such a record cannot be recovered later — WHICH record it was, HOW its
identification was established, and whether its photographs are one individual. The last is
the one that must never be assumed: `sameIndividual` was hard-coded `true` here, which is
true of a phone set by construction and is a claim about somebody else's photographs. A set
that had to combine two plants records `false` and is then excluded from the photo-count
question rather than quietly answering it.

WHAT IT DELIBERATELY DOES NOT CHECK. Whether the identification is right — that is the
benchmark's job, afterwards. Whether `truth_name` is a real species — it may legitimately be a
genus or a family, and validating binomials here would start inventing botany. Whether
`my_certainty` is honest, which nothing can check and which is why `unsure` exists.

Usage:  python3 scripts/check_field_set.py field/
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

SPEC_DIR = re.compile(r"^spec-\d{3}$")
PHOTO = re.compile(r"^(spec-\d{3})_([123])-([a-z]+)\.(jpe?g|png)$", re.I)

# PlantNet's own vocabulary, mirrored from `ORGANS` in supabase/functions/identify-plant.
# Anything outside it is rewritten to `auto` server-side, which is exactly why a typo here
# must fail loudly rather than be accepted.
ORGANS = {"habit", "leaf", "flower", "fruit", "bark", "auto"}

TRUTH_RANKS = {"species", "genus", "family"}
CERTAINTIES = {"certain", "probable", "unsure"}
# How the identification behind a specimen was established. `self` is the phone set: nobody
# but the collector stands behind it. The rest name an external record, and the distinction
# between them is the whole reason the column exists — "research grade" and "a specimen in a
# bag with a label" are not the same evidence.
VERIFICATIONS = {"self", "research-grade", "specimen-backed", "community", "unverified"}
OPTIONAL_COLUMNS = ["source", "source_ref", "verification", "same_individual"]
REQUIRED_COLUMNS = [
    "specimen_id",
    "date",
    "truth_name",
    "truth_rank",
    "my_certainty",
    "class",
    "organ3",
    "habitat",
    "notes",
]
# The app re-encodes every photograph to drop EXIF and its GPS. A benchmark that wrote
# coordinates back into a spreadsheet by hand would undo that, so the column is refused
# rather than ignored.
FORBIDDEN_COLUMNS = {"lat", "lon", "latitude", "longitude", "gps", "coordinates", "location"}


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "field")
    if not root.is_dir():
        print(f"::error::{root} is not a directory")
        return 2

    problems: list[str] = []
    notes: list[str] = []

    # ── The CSV ──────────────────────────────────────────────────────────────
    csv_path = root / "field-truth.csv"
    rows: dict[str, dict[str, str]] = {}
    if not csv_path.is_file():
        problems.append(f"{csv_path} is missing — ground truth is the one thing that cannot be reconstructed later")
    else:
        with csv_path.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            columns = [one.strip() for one in (reader.fieldnames or [])]
            missing = [one for one in REQUIRED_COLUMNS if one not in columns]
            if missing:
                problems.append(f"field-truth.csv is missing column(s): {', '.join(missing)}")
            forbidden = [one for one in columns if one.lower() in FORBIDDEN_COLUMNS]
            if forbidden:
                problems.append(
                    f"field-truth.csv carries location column(s) {', '.join(forbidden)} — the app "
                    "re-encodes photographs specifically to drop GPS; use the coarse `habitat` "
                    "column instead"
                )
            for line, raw in enumerate(reader, start=2):
                row = {key: (value or "").strip() for key, value in raw.items() if key}
                spec = row.get("specimen_id", "")
                if not SPEC_DIR.match(spec):
                    problems.append(f"field-truth.csv line {line}: specimen_id {spec!r} is not spec-NNN")
                    continue
                if spec in rows:
                    problems.append(f"field-truth.csv line {line}: {spec} appears twice")
                    continue
                if not row.get("truth_name"):
                    problems.append(f"{spec}: truth_name is empty")
                if row.get("truth_rank") not in TRUTH_RANKS:
                    problems.append(
                        f"{spec}: truth_rank {row.get('truth_rank')!r} must be one of "
                        f"{', '.join(sorted(TRUTH_RANKS))}"
                    )
                if row.get("my_certainty") not in CERTAINTIES:
                    problems.append(
                        f"{spec}: my_certainty {row.get('my_certainty')!r} must be one of "
                        f"{', '.join(sorted(CERTAINTIES))}"
                    )
                organ3 = row.get("organ3", "")
                if organ3 and organ3 != "none" and organ3 not in ORGANS:
                    problems.append(f"{spec}: organ3 {organ3!r} is not an organ or 'none'")
                verification = row.get("verification", "")
                if verification and verification not in VERIFICATIONS:
                    problems.append(
                        f"{spec}: verification {verification!r} must be one of "
                        f"{', '.join(sorted(VERIFICATIONS))}"
                    )
                same = row.get("same_individual", "")
                if same and same not in ("true", "false"):
                    problems.append(
                        f"{spec}: same_individual {same!r} must be 'true' or 'false' — it is a "
                        "claim about the photographs, so there is no default worth guessing"
                    )
                # A record you cannot go back to is not a source. Either both halves or neither.
                if bool(row.get("source")) != bool(row.get("source_ref")):
                    problems.append(
                        f"{spec}: source and source_ref must be given together — a source with no "
                        "identifier cannot be checked by anybody afterwards"
                    )
                rows[spec] = row

    # ── The directories ──────────────────────────────────────────────────────
    photos: dict[str, dict[int, tuple[str, str]]] = {}
    for entry in sorted(root.iterdir()):
        if entry.is_file():
            if entry.name != "field-truth.csv" and entry.name != "manifest.json":
                notes.append(f"ignored loose file {entry.name}")
            continue
        if not SPEC_DIR.match(entry.name):
            problems.append(f"directory {entry.name!r} is not spec-NNN — it would be silently skipped")
            continue

        found: dict[int, tuple[str, str]] = {}
        for file in sorted(entry.iterdir()):
            if file.name.startswith("."):
                continue
            match = PHOTO.match(file.name)
            if not match:
                problems.append(f"{entry.name}/{file.name}: cannot parse — expected spec-NNN_<1|2|3>-<organ>.jpg")
                continue
            owner, position, organ, _ = match.groups()
            if owner != entry.name:
                problems.append(f"{entry.name}/{file.name}: names a different specimen ({owner})")
                continue
            organ = organ.lower()
            if organ not in ORGANS:
                problems.append(
                    f"{entry.name}/{file.name}: organ {organ!r} is not one of "
                    f"{', '.join(sorted(ORGANS))} — the endpoint would silently rewrite it to 'auto'"
                )
                continue
            slot = int(position)
            if slot in found:
                problems.append(f"{entry.name}: two photographs in position {slot}; one would never be sent")
                continue
            if file.stat().st_size == 0:
                problems.append(f"{entry.name}/{file.name}: is empty")
                continue
            found[slot] = (file.name, organ)

        if not found:
            problems.append(f"{entry.name}: no usable photographs")
            continue
        if 1 not in found:
            problems.append(f"{entry.name}: no position 1 — photo 1 alone IS the p1 condition")
        elif found[1][1] != "habit":
            problems.append(
                f"{entry.name}: position 1 is tagged {found[1][1]!r}, not 'habit'. Photo 1 alone is "
                "the single-photograph arm, so a close-up here measures something else entirely."
            )
        if len(found) < 2:
            problems.append(
                f"{entry.name}: only {len(found)} photograph(s). The endpoint's own floor is 2 on "
                "any ordinary deployment, so this specimen could only run the p1 arm."
            )
        expected = set(range(1, len(found) + 1))
        if set(found) != expected:
            problems.append(
                f"{entry.name}: positions {sorted(found)} have a gap — a 2-photograph specimen is "
                "1 and 2, never 1 and 3"
            )
        photos[entry.name] = found

    # ── The two halves against each other ────────────────────────────────────
    for spec in sorted(set(rows) - set(photos)):
        problems.append(f"{spec}: in field-truth.csv with no photographs")
    for spec in sorted(set(photos) - set(rows)):
        problems.append(
            f"{spec}: photographed with no field-truth.csv row — ground truth cannot be added "
            "afterwards without it becoming agreement with the answer"
        )
    for spec in sorted(set(rows) & set(photos)):
        organ3 = rows[spec].get("organ3", "")
        has_third = 3 in photos[spec]
        if organ3 == "none" and has_third:
            problems.append(f"{spec}: organ3 is 'none' but a position-3 photograph exists")
        if organ3 and organ3 != "none" and not has_third:
            problems.append(f"{spec}: organ3 is {organ3!r} but there is no position-3 photograph")
        if has_third and organ3 not in ("", "none") and photos[spec][3][1] != organ3:
            notes.append(
                f"{spec}: organ3 says {organ3!r}, the file says {photos[spec][3][1]!r} — the file wins"
            )

    # ── Report ───────────────────────────────────────────────────────────────
    print(f"{len(photos)} specimen(s), {sum(len(one) for one in photos.values())} photograph(s)")
    counts: dict[int, int] = {}
    for found in photos.values():
        counts[len(found)] = counts.get(len(found), 0) + 1
    for size in sorted(counts):
        print(f"  {counts[size]} specimen(s) with {size} photograph(s)")
    by_class: dict[str, int] = {}
    for row in rows.values():
        by_class[row.get("class", "?")] = by_class.get(row.get("class", "?"), 0) + 1
    if by_class:
        print("  by class: " + ", ".join(f"{k} {v}" for k, v in sorted(by_class.items())))
    unsure = [spec for spec, row in rows.items() if row.get("my_certainty") == "unsure"]
    if unsure:
        print(f"  {len(unsure)} row(s) marked `unsure` — kept and reported separately: {', '.join(sorted(unsure))}")

    for note in notes:
        print(f"  note: {note}")

    if problems:
        print()
        for problem in problems:
            print(f"::error::{problem}")
        print(f"\n{len(problems)} problem(s). No manifest written.")
        return 1

    # Only the pairs that exist, in position order, so a 2-photograph specimen is
    # representable rather than a 3-photograph one with a hole in it.
    manifest = {
        "about": "Generated by scripts/check_field_set.py. One entry per specimen.",
        "specimens": [
            {
                "id": spec,
                "truth": {
                    "scientificName": rows[spec]["truth_name"],
                    "rank": rows[spec]["truth_rank"],
                },
                "certainty": rows[spec]["my_certainty"],
                "class": rows[spec].get("class", ""),
                "habitat": rows[spec].get("habitat", ""),
                "notes": rows[spec].get("notes", ""),
                # Defaults are the PHONE set's own facts, not neutral ones: photographs taken
                # here of one plant, standing on nobody's authority but the collector's.
                "sameIndividual": rows[spec].get("same_individual", "true") != "false",
                "source": rows[spec].get("source") or "field",
                "sourceRef": rows[spec].get("source_ref", ""),
                "verification": rows[spec].get("verification") or "self",
                "photos": [
                    {"position": slot, "file": f"{spec}/{photos[spec][slot][0]}", "organ": photos[spec][slot][1]}
                    for slot in sorted(photos[spec])
                ],
            }
            for spec in sorted(set(rows) & set(photos))
        ],
    }
    out = root / "manifest.json"
    out.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"\nEverything checks out. Wrote {out}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
