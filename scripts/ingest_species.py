#!/usr/bin/env python3
"""Ingest botanical species records into the Layer A catalog, reproducibly.

WHAT THIS IS FOR. The catalog has to reach hundreds and then thousands of species without a
code change per species, and without anybody hand-typing a row. This is the thing that
turns a list of names into `catalog_species` rows — normalised, deduplicated, idempotent,
resumable, and auditable back to the source that supplied each field.

────────────────────────────────────────────────────────────────────────────────
IT WRITES NO DATABASE. EVER.

It emits artifacts: NDJSON for review and an idempotent `.sql` file of upserts. Applying
that file is a separate, deliberate human act. There is no `--apply`, no connection string
and no driver import, which is what makes "this script cannot touch production" a property
of the program rather than a promise in a comment. The same reason `species_packets` has no
client insert policy.

TWO SOURCES, AND ONLY ONE OF THEM NEEDS THE NETWORK.

  deck   Reads `src/data/herbs.json` — the 45 printed species, already verified, already in
         this repository. No network, so it runs anywhere including this sandbox, and it is
         how the pipeline is tested end to end without inventing a single fact.

  gbif   Resolves names against the GBIF backbone. api.gbif.org is BLOCKED from the
         development sandbox (`CONNECT tunnel failed, response 403` — see
         scripts/resolve_taxa.py, which measured it), so this mode runs in GitHub Actions.
         `.github/workflows/ingest-species.yml` is where. If it cannot reach GBIF it FAILS;
         it does not fall back to anything, because the only available fallback would be
         making the data up.

NOTHING HERE DECIDES THAT A SPECIES IS MEDICINAL. Every row is emitted `review_status =
'draft'` and `medicinally_relevant = false`. Promotion is a human act with a basis and a
source, which the schema enforces (`medicinal_relevance_states_its_basis`). An ingestion
script that could set that flag is an ingestion script that would eventually set it wrongly
at scale.
────────────────────────────────────────────────────────────────────────────────

    python3 scripts/ingest_species.py --source deck --out build/catalog
    python3 scripts/ingest_species.py --source deck --out build/catalog --dry-run
    NAMES_FILE=names.txt python3 scripts/ingest_species.py --source gbif --out build/catalog
    python3 scripts/ingest_species.py --self-test
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DECK = REPO / "src" / "data" / "herbs.json"

GBIF_MATCH = "https://api.gbif.org/v1/species/match"
GBIF_USAGE = "https://api.gbif.org/v1/species"
UA = "plantdex-catalog-ingest (https://github.com/lillfaith/Plantdex-website)"

# ── Identity ──────────────────────────────────────────────────────────────────
#
# These mirror `canonicalBinomial` and the species-key rule in
# `src/lib/species-identity.ts`, and they must keep mirroring them: a key derived
# differently here would mint a SECOND catalog row for a species the packet registry
# already knows under another key, and nothing would notice. `catalog-schema.test.ts`
# compares the two implementations on a shared fixture list for exactly that reason.
GENUS = re.compile(r"^[A-Z][a-z]{2,29}$")
EPITHET = re.compile(r"^[a-z][a-z-]{1,29}$")
RANK_MARKERS = {"subsp", "ssp", "var", "f", "subvar", "sect", "subg", "ser", "cv", "x"}
HYBRID_MARKS = "×✕"


def canonical_binomial(raw: str) -> str | None:
    """`Genus epithet` in ASCII Latin, or None. Rejects rather than transliterates."""
    value = (raw or "").strip()[:200]
    if not value:
        return None
    if not all(0x20 <= ord(c) <= 0x7E or c in HYBRID_MARKS for c in value):
        return None
    words = re.sub(r"\s+", " ", "".join(" " if c in HYBRID_MARKS else c for c in value)).strip().split(" ")
    if not words or not GENUS.match(words[0]):
        return None
    for word in words[1:]:
        if EPITHET.match(word) and word.rstrip(".") not in RANK_MARKERS:
            return f"{words[0]} {word}"
    return None


def species_key(binomial: str) -> str:
    return binomial.lower()


# ── Artifacts ─────────────────────────────────────────────────────────────────


class Run:
    """Collects rows, refuses duplicates, and records every failure with its reason.

    A record that cannot be ingested is a ROW IN `failures.ndjson`, never a dropped line and
    never a warning on stderr that scrolls past. At 2,000 species the difference between
    those two is whether anybody ever finds out.
    """

    def __init__(self) -> None:
        self.species: dict[str, dict] = {}
        self.synonyms: list[dict] = []
        self.cards: list[dict] = []
        self.failures: list[dict] = []

    def fail(self, name: str, reason: str, detail: str = "") -> None:
        self.failures.append({"input": name, "reason": reason, "detail": detail})

    def add_species(self, row: dict) -> bool:
        key = row["species_key"]
        if key in self.species:
            # DEDUPLICATION IS NOT A MERGE. Two inputs resolving to one key is a fact worth
            # recording — it is usually a synonym pair — and quietly keeping the first is
            # how a conflicting record disappears.
            self.failures.append(
                {"input": row["accepted_name"], "reason": "duplicate-key", "detail": key}
            )
            return False
        self.species[key] = row
        return True


def deck_rows(run: Run) -> None:
    """The 45 printed species, from this repository. No network, no invention."""
    data = json.loads(DECK.read_text())
    herbs = data["herbs"] if isinstance(data, dict) else data
    for herb in herbs:
        raw = herb.get("scientificName", "")
        binomial = canonical_binomial(raw)
        if not binomial:
            # Genus cards (`Rubus spp.`) are real deck entries and legitimately have no
            # binomial. They are not catalog species; they are recorded and skipped.
            run.fail(raw, "not-a-binomial", herb.get("id", ""))
            continue
        key = species_key(binomial)
        run.add_species(
            {
                "species_key": key,
                "accepted_name": binomial,
                "common_names": [herb["commonName"]] if herb.get("commonName") else [],
                "seasons": [herb["season"]] if herb.get("season") else [],
                "review_status": "draft",
                "medicinally_relevant": False,
                "source_ids": ["plantdex-deck-01"],
                "_origin": "deck",
            }
        )
        run.cards.append(
            {
                "species_key": key,
                "tier": "printed",
                "card_number": herb["cardNumber"],
                "collection_id": herb.get("collectionId"),
                "rarity": herb["rarity"],
                "xp": herb["xp"],
                "published": False,
            }
        )


def gbif_rows(run: Run, names: list[str], pause: float = 0.2) -> None:
    """Resolve names against the GBIF backbone. Network required; Actions only."""
    for name in names:
        try:
            url = f"{GBIF_MATCH}?{urllib.parse.urlencode({'name': name, 'strict': 'false'})}"
            request = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(request, timeout=45) as response:
                answer = json.load(response)
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            # NO FALLBACK. A network failure is a failure, recorded and resumable.
            run.fail(name, "gbif-unreachable", str(error)[:200])
            continue
        time.sleep(pause)  # Courtesy to a free API with no key. See its terms.

        if answer.get("matchType") in (None, "NONE"):
            run.fail(name, "gbif-no-match", json.dumps(answer)[:200])
            continue
        if answer.get("rank") != "SPECIES":
            run.fail(name, "not-species-rank", str(answer.get("rank")))
            continue

        accepted = answer.get("species") or answer.get("canonicalName") or ""
        binomial = canonical_binomial(accepted)
        if not binomial:
            run.fail(name, "unusable-accepted-name", accepted)
            continue

        status = str(answer.get("status", "")).upper()
        taxonomy = {
            "ACCEPTED": "accepted",
            "SYNONYM": "synonym",
            "HOMOTYPIC_SYNONYM": "synonym",
            "HETEROTYPIC_SYNONYM": "synonym",
            "DOUBTFUL": "conflicting",
        }.get(status, "unresolved")

        row = {
            "species_key": species_key(binomial),
            "accepted_name": binomial,
            "family": answer.get("family"),
            "gbif_id": str(answer["usageKey"]) if answer.get("usageKey") else None,
            "taxonomy_status": taxonomy,
            "review_status": "draft",
            "medicinally_relevant": False,
            "source_ids": ["gbif-backbone"],
            "_origin": "gbif",
            "_match_confidence": answer.get("confidence"),
        }
        if run.add_species(row) and canonical_binomial(name) and species_key(canonical_binomial(name)) != row["species_key"]:
            # The input name resolved to a DIFFERENT accepted name: that is a synonym
            # relationship GBIF asserted today, and it is recorded as one rather than
            # silently rewriting the input.
            run.synonyms.append(
                {
                    "species_key": row["species_key"],
                    "synonym": canonical_binomial(name),
                    "source_id": "gbif-backbone",
                }
            )


# ── SQL emission ──────────────────────────────────────────────────────────────


def sql_literal(value) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        inner = ", ".join(sql_literal(v) for v in value)
        return f"array[{inner}]::text[]" if value else "'{}'::text[]"
    return "'" + str(value).replace("'", "''") + "'"


SPECIES_COLUMNS = [
    "species_key", "accepted_name", "family", "gbif_id", "common_names",
    "seasons", "taxonomy_status", "review_status", "medicinally_relevant", "source_ids",
]
CARD_COLUMNS = ["species_key", "tier", "card_number", "collection_id", "rarity", "xp", "published"]


def emit_sql(run: Run) -> str:
    """Idempotent upserts, ordered deterministically so two runs diff cleanly.

    `on conflict do update` touches only the columns ingestion owns. It must never reset
    `review_status` on a row a human has already approved — re-running the pipeline after a
    review would otherwise un-approve the whole catalog, which is the kind of defect that is
    discovered months later by a reader seeing an empty page.
    """
    lines = [
        "-- Generated by scripts/ingest_species.py. Review before applying.",
        "-- Idempotent: safe to apply repeatedly. Never downgrades an approved review.",
        "begin;",
    ]
    for key in sorted(run.species):
        row = run.species[key]
        # A COLUMN WITH NO VALUE IS OMITTED, NOT SENT AS NULL. `taxonomy_status` is
        # `not null default 'unresolved'`, so an explicit null is a constraint violation
        # rather than "use the default" — and the deck source legitimately knows no
        # taxonomy. Caught by applying the generated file to a real database, which is the
        # only place it shows up.
        present = [c for c in SPECIES_COLUMNS if row.get(c) is not None]
        cols = ", ".join(present)
        vals = ", ".join(sql_literal(row.get(c)) for c in present)
        updates = ", ".join(
            f"{c} = excluded.{c}" for c in present
            if c not in ("species_key", "review_status", "medicinally_relevant")
        )
        lines.append(
            f"insert into public.catalog_species ({cols}, last_checked_on)\n"
            f"values ({vals}, current_date)\n"
            f"on conflict (species_key) do update set {updates}, last_checked_on = current_date;"
        )
    for row in sorted(run.synonyms, key=lambda r: (r["species_key"], r["synonym"])):
        lines.append(
            "insert into public.catalog_synonyms (species_key, synonym, source_id) values ("
            f"{sql_literal(row['species_key'])}, {sql_literal(row['synonym'])}, "
            f"{sql_literal(row['source_id'])}) on conflict (species_key, synonym) do nothing;"
        )
    for row in sorted(run.cards, key=lambda r: r["species_key"]):
        present = [c for c in CARD_COLUMNS if row.get(c) is not None]
        cols = ", ".join(present)
        vals = ", ".join(sql_literal(row.get(c)) for c in present)
        updates = ", ".join(f"{c} = excluded.{c}" for c in present
                            if c not in ("species_key", "published"))
        lines.append(
            f"insert into public.collectible_cards ({cols})\nvalues ({vals})\n"
            f"on conflict (species_key) do update set {updates};"
        )
    lines.append("commit;")
    return "\n".join(lines) + "\n"


def write_ndjson(path: Path, rows: list[dict]) -> None:
    path.write_text("".join(json.dumps(r, sort_keys=True) + "\n" for r in rows))


# ── Checkpointing ─────────────────────────────────────────────────────────────


def load_checkpoint(path: Path) -> set[str]:
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text().splitlines() if line.strip()}


# ── Entry point ───────────────────────────────────────────────────────────────


def self_test() -> int:
    """Checks the identity rules the whole catalog keys on. No network, no files."""
    checks = [
        ("Taraxacum officinale", "Taraxacum officinale"),
        ("Taraxacum officinale F.H.Wigg.", "Taraxacum officinale"),
        ("Plantago major subsp. intermedia", "Plantago major"),
        ("Mentha × piperita", "Mentha piperita"),
        ("Rubus spp.", None),
        ("Solidago", None),
        ("Taraxacum сfficinale", None),   # Cyrillic homoglyph: refused, not transliterated
        ("", None),
    ]
    failures = 0
    for raw, expected in checks:
        got = canonical_binomial(raw)
        ok = got == expected
        failures += 0 if ok else 1
        print(f"{'PASS' if ok else 'FAIL'}  canonical_binomial({raw!r}) -> {got!r}")
    key_ok = species_key("Taraxacum officinale") == "taraxacum officinale"
    failures += 0 if key_ok else 1
    print(f"{'PASS' if key_ok else 'FAIL'}  species_key lowercases the binomial")

    run = Run()
    run.add_species({"species_key": "a b", "accepted_name": "A b"})
    duplicated = not run.add_species({"species_key": "a b", "accepted_name": "A b"})
    failures += 0 if duplicated and len(run.failures) == 1 else 1
    print(f"{'PASS' if duplicated else 'FAIL'}  a duplicate key is refused and recorded")

    quoted = sql_literal("O'Donnell")
    ok = quoted == "'O''Donnell'"
    failures += 0 if ok else 1
    print(f"{'PASS' if ok else 'FAIL'}  sql_literal escapes quotes -> {quoted}")

    print(f"\n{'ALL SELF-TESTS PASSED' if not failures else f'{failures} FAILURE(S)'}")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", choices=["deck", "gbif"], default="deck")
    parser.add_argument("--out", default="build/catalog", help="artifact directory")
    parser.add_argument("--names-file", help="one name per line (gbif source)")
    parser.add_argument("--limit", type=int, help="process at most N inputs (batching)")
    parser.add_argument("--checkpoint", help="file of already-processed inputs; they are skipped")
    parser.add_argument("--dry-run", action="store_true", help="report, write nothing")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    run = Run()
    if args.source == "deck":
        deck_rows(run)
    else:
        if not args.names_file:
            return int(bool(sys.stderr.write("--names-file is required for --source gbif\n"))) or 2
        names = [n.strip() for n in Path(args.names_file).read_text().splitlines() if n.strip()]
        done = load_checkpoint(Path(args.checkpoint)) if args.checkpoint else set()
        names = [n for n in names if n not in done]
        if args.limit:
            names = names[: args.limit]
        if not names:
            print("nothing left to process — checkpoint covers every input")
            return 0
        gbif_rows(run, names)

    out = Path(args.out)
    print(f"source={args.source}  species={len(run.species)}  cards={len(run.cards)}  "
          f"synonyms={len(run.synonyms)}  failures={len(run.failures)}")
    for failure in run.failures[:10]:
        print(f"  SKIP {failure['reason']}: {failure['input']} {failure['detail']}".rstrip())
    if len(run.failures) > 10:
        print(f"  ... and {len(run.failures) - 10} more in failures.ndjson")

    if args.dry_run:
        print(f"\ndry run — nothing written. Would write to {out}/")
        return 0

    out.mkdir(parents=True, exist_ok=True)
    write_ndjson(out / "species.ndjson", [run.species[k] for k in sorted(run.species)])
    write_ndjson(out / "synonyms.ndjson", sorted(run.synonyms, key=lambda r: (r["species_key"], r["synonym"])))
    write_ndjson(out / "cards.ndjson", sorted(run.cards, key=lambda r: r["species_key"]))
    write_ndjson(out / "failures.ndjson", run.failures)
    (out / "upserts.sql").write_text(emit_sql(run))
    if args.checkpoint and args.source == "gbif":
        processed = {r["accepted_name"] for r in run.species.values()} | {f["input"] for f in run.failures}
        with Path(args.checkpoint).open("a") as handle:
            for name in sorted(processed):
                handle.write(name + "\n")
    print(f"\nwrote {out}/species.ndjson, synonyms.ndjson, cards.ndjson, failures.ndjson, upserts.sql")
    print("APPLY IS A SEPARATE HUMAN ACT. This script never connects to a database.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
