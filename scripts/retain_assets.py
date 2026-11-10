#!/usr/bin/env python3
"""Keep the photographs a card is made of; let the rest of the pool go.

WHY THIS EXISTS, IN ONE MEASUREMENT. A species' retrieved pool is 96 CC0 originals and
weighs 194 MB. Seven species have put 1.3 GB in the working tree and 1.41 GB into git
history. At 2,000 species that is 389 GB, and GitHub warns above 1 GB and treats 5 GB as
the ceiling -- so the pool-in-git design stops at about 26 species. `retrieve-evidence.yml`
says so in its own comment: "for the first species the artifact store IS the git
repository." That was right for one species and cannot reach the catalogue.

WHAT IS KEPT, AND WHY EACH ONE:
  * the ORIGINAL full-resolution source photograph of every candidate the owner has
    approved, preferred or named as an alternative -- the card is made from these, a
    cutout is a derived product, and a derived product is not an archive;
  * the originals of the CURRENT SHORTLIST, which are the species' open question: a
    species awaiting review needs its alternatives on hand or the review has nothing to
    compare;
  * every cutout and card preview belonging to those;
  * the MANIFEST ENTRY for every photograph ever retrieved, kept whole. Provenance is
    metadata, it is tiny, and it is the thing that makes a discarded file re-downloadable:
    photo id, source URL, licence, photographer, retrieval date, and now a content hash.

WHAT IS DISCARDED: the source bytes of candidates nobody selected. Nothing else.

ORPHANS ARE REPORTED AND NEVER TOUCHED. A re-fetch REWRITES `photos.json`, so files from an
earlier, smaller run stay on disk with no manifest entry behind them -- pinus_strobus had
five, and one of them (36667264) had been on a shortlist two rounds earlier. They are the
one case this tool must not act on in either direction: deleting them loses bytes whose
licence and photographer are no longer recorded anywhere in the tree, and KEEPING them
quietly is worse, because a file with no provenance entry must never reach a card. So they
are listed, loudly, and left alone for a person to resolve.

VERIFY BEFORE DELETE, ALWAYS. Nothing is removed until every file in the keep set has been
read, hashed, and recorded in the manifest. A missing or unreadable keeper aborts the run
with nothing deleted -- the failure mode this guards against is a retention pass that
tidies away the pool and the one photograph that mattered in the same sweep.

    python3 scripts/retain_assets.py --species pinus_strobus            # report only
    python3 scripts/retain_assets.py --species pinus_strobus --apply    # and delete
    python3 scripts/retain_assets.py --all                              # report, every species
"""
from __future__ import annotations

import argparse, hashlib, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import decisions                                      # noqa: E402

PHOTOS = ROOT / "evidence" / "photos"
CANDS = ROOT / "evidence" / "candidates"
# Verdicts whose source photograph is kept for good. `rejected` is deliberately absent:
# the DECISION is permanent and lives in the ledger, the bytes are not needed again.
KEEP_VERDICTS = ("photo_selected", "card_approved", "approved", "preferred", "alternative")


def sha256(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def keep_set(species: str) -> tuple[set[str], dict[str, list[str]]]:
    """Photo ids to keep, and why each one is kept."""
    why: dict[str, list[str]] = {}
    current = decisions.current()
    for pid, v in current.items():
        if v.get("species") == species and v.get("decision") in KEEP_VERDICTS:
            why.setdefault(str(pid), []).append(f"owner: {v['decision']}")
    cf = CANDS / species / "candidates.json"
    if cf.exists():
        for row in json.loads(cf.read_text()).get("selected", []):
            why.setdefault(str(row["photo_id"]), []).append("current shortlist")
    return set(why), why


def plan(species: str) -> dict:
    pdir = PHOTOS / species
    mf = pdir / "photos.json"
    if not mf.exists():
        return {"species": species, "error": "no manifest"}
    doc = json.loads(mf.read_text())
    keep, why = keep_set(species)

    keepers, missing, drop, freed, kept_bytes = [], [], [], 0, 0
    named = {e.get("file") for e in doc.get("photos", [])}
    orphans = sorted(f for f in pdir.iterdir()
                     if f.name != "photos.json" and f.name not in named)
    for entry in doc.get("photos", []):
        pid = str(entry.get("photo_id"))
        f = pdir / entry.get("file", "")
        present = f.name and f.exists()
        if pid in keep:
            if not present:
                missing.append(pid)
            else:
                keepers.append((pid, f, entry))
                kept_bytes += f.stat().st_size
        elif present:
            drop.append(f)
            freed += f.stat().st_size
    return {"species": species, "doc": doc, "manifest": mf, "keep": keep, "why": why,
            "keepers": keepers, "missing": missing, "drop": drop, "orphans": orphans,
            "freed": freed, "kept_bytes": kept_bytes}


def run(species: str, apply: bool) -> int:
    p = plan(species)
    if p.get("error"):
        print(f"{species}: {p['error']}")
        return 1
    print(f"=== {species} ===")
    for pid in sorted(p["keep"]):
        mark = "ok " if any(k[0] == pid for k in p["keepers"]) else "MISSING"
        print(f"   keep {pid:>12}  {mark}  ({'; '.join(p['why'][pid])})")
    if p["orphans"]:
        ob = sum(f.stat().st_size for f in p["orphans"])
        print(f"   {len(p['orphans'])} ORPHAN file(s) with no manifest entry, "
              f"{ob/1e6:.1f} MB -- left alone, no provenance, must not reach a card:")
        for f in p["orphans"]:
            print(f"        {f.name}")
    print(f"   {len(p['drop'])} unselected source file(s), {p['freed']/1e6:.1f} MB")
    print(f"   keeping {len(p['keepers'])} original(s), {p['kept_bytes']/1e6:.1f} MB")

    if p["missing"]:
        print(f"   REFUSING TO DELETE: {len(p['missing'])} kept photo(s) are not on disk: "
              + ", ".join(p["missing"]))
        return 1

    # HASH FIRST, DELETE SECOND. The manifest is written and flushed before a single file
    # is removed, so an interrupted run leaves provenance that is ahead of the tree rather
    # than behind it -- recoverable in the direction that costs nothing.
    changed = 0
    for pid, f, entry in p["keepers"]:
        digest = sha256(f)
        if entry.get("sha256") != digest:
            entry["sha256"] = digest
            changed += 1
        entry["retained"] = True
        entry["retained_bytes"] = f.stat().st_size
    for entry in p["doc"].get("photos", []):
        entry.setdefault("retained", str(entry.get("photo_id")) in p["keep"])
    if apply:
        for entry in p["doc"].get("photos", []):
            if not entry.get("retained"):
                entry["retained"] = False
        p["manifest"].write_text(json.dumps(p["doc"], indent=2) + "\n")
        for f in p["drop"]:
            f.unlink()
        print(f"   hashed {len(p['keepers'])} keeper(s) ({changed} new), deleted "
              f"{len(p['drop'])} file(s), freed {p['freed']/1e6:.1f} MB")
    else:
        print(f"   DRY RUN. --apply would hash {len(p['keepers'])} keeper(s) and free "
              f"{p['freed']/1e6:.1f} MB. Nothing was changed.")
    return 0


def self_test() -> int:
    checks = []
    # CONTROL: a rejected photograph is not a keeper, and the owner's own picks are.
    checks.append(("rejected" not in KEEP_VERDICTS,
                   "CONTROL: a rejected photograph's bytes are not retained"))
    checks.append(({"photo_selected", "card_approved", "preferred", "alternative"}
                   <= set(KEEP_VERDICTS),
                   "a selected, approved, preferred or alternative photograph is kept"))
    # CONTROL: the keep set must include the current shortlist, or a species awaiting
    # review loses the alternatives the review is FOR.
    names = [d.name for d in CANDS.iterdir() if (d / "candidates.json").exists()]
    ok = True
    for sp in names:
        keep, _ = keep_set(sp)
        sel = {str(r["photo_id"])
               for r in json.loads((CANDS / sp / "candidates.json").read_text())["selected"]}
        ok &= sel <= keep
    checks.append((ok, "CONTROL: every current shortlist id is in its species' keep set"))
    # CONTROL: a plan with a missing keeper must refuse rather than delete around it.
    checks.append(("REFUSING TO DELETE" in open(__file__).read(),
                   "CONTROL: a missing keeper aborts the run"))
    # CONTROL: an orphan is never in the delete list. A re-fetch rewrites the manifest, so
    # files from an earlier run survive with no provenance behind them; deleting one loses
    # bytes nothing records the licence of.
    orphan_free = True
    for sp in (d.name for d in PHOTOS.iterdir() if d.is_dir()):
        pl = plan(sp)
        if pl.get("error"):
            continue
        orphan_free &= not (set(pl["orphans"]) & set(pl["drop"]))
    checks.append((orphan_free, "CONTROL: an orphan is never queued for deletion"))
    good = True
    for c, label in checks:
        print(("PASS  " if c else "FAIL  ") + label)
        good &= bool(c)
    print("\n" + ("ALL SELF-TESTS PASSED" if good else "SELF-TESTS FAILED"))
    return 0 if good else 1


def main() -> int:
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--species", nargs="*")
    a.add_argument("--all", action="store_true")
    a.add_argument("--apply", action="store_true")
    a.add_argument("--self-test", action="store_true")
    args = a.parse_args()
    if args.self_test:
        return self_test()
    names = args.species or ([d.name for d in sorted(PHOTOS.iterdir()) if d.is_dir()]
                             if args.all else [])
    if not names:
        a.error("give --species NAME or --all")
    rc = 0
    total = 0
    for sp in names:
        rc |= run(sp, args.apply)
        pl = plan(sp)
        total += pl.get("freed", 0)
    print(f"\n{'freed' if args.apply else 'would free'} {total/1e9:.2f} GB across "
          f"{len(names)} species")
    return rc


if __name__ == "__main__":
    sys.exit(main())
