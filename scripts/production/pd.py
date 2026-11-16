#!/usr/bin/env python3
"""pd - the PlantDex production tool. PRIVATE; never imported by the site, never deploys.

  pd.py init --list evidence/production/species-83.json     build the queue from the APPROVED list
  pd.py status                                              where every card is
  pd.py package-next [--n 10] [--collect]                   the next 10 uncompleted species
  pd.py collect --request evidence/production/batches/batch-001.request.json
  pd.py import-selection selection.json --originals <originals.zip|folder> --by NAME
  pd.py import-assets 62 --main m.png --pixel p.png --tall t.png --by NAME   (any subset)
  pd.py validate FILE --asset pixel_icon                    check a file without importing it
  pd.py format 62                                           card-front preview + comparison board
  pd.py review 62 --asset main_image --verdict pass --by NAME --note "..."
  pd.py regenerate 62 --asset pixel_icon --reason "..." --by NAME
  pd.py approve 62 --by NAME                                a person, explicitly; nothing calls this

Photo search needs api.inaturalist.org, which the development sandbox blocks; `collect` is run
by the production-batch workflow (or anywhere with network access).
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from production import ledger as L  # noqa: E402

ASSETS_ROOT = L.ROOT / "production-assets"
WORK_ROOT = L.ROOT / "production-work"
OUT_ROOT = L.ROOT / "production-out"


def led_of(a) -> L.Ledger:
    led = L.Ledger(pathlib.Path(a.ledger))
    led.require()
    led.sync()
    return led


def cmd_init(a):
    led = L.Ledger.init(pathlib.Path(a.list), pathlib.Path(a.ledger), expect=a.expect_count)
    print(f"queue created: {len(led.data['cards'])} cards, all at 'pending' -> {a.ledger}")
    spec_path = L.PROD / "spec.json"
    if not spec_path.exists():
        from production import assets
        L.write_json(spec_path, assets.DEFAULT_SPEC)
        print(f"wrote default validation spec -> {spec_path} (tall_preview numbers are an UNCONFIRMED placeholder)")


def cmd_status(a):
    led = led_of(a)
    cards = led.cards()
    counts: dict[str, int] = {}
    for c in cards:
        counts[led.current(c)] = counts.get(led.current(c), 0) + 1
    print("QUEUE:", ", ".join(f"{k}={v}" for k, v in sorted(counts.items())), f"(total {len(cards)})")
    print(f"{'card':>4}  {'species':<34} {'current':<24} main/pixel/tall")
    for c in cards:
        if a.card and c["card"] not in a.card:
            continue
        short = "/".join(led.asset_status(c, x)[:8] for x in L.ASSETS)
        print(f"{c['card']:>4}  {c['common'][:34]:<34} {led.current(c):<24} {short}")
    open_ = [r for r in led.batch_requests() if not r["_complete"]]
    if open_:
        print(f"\nunfinished batch: {open_[-1]['batch']} ({open_[-1]['_file']}) - `pd package-next` resumes it")


def cmd_package_next(a):
    from production import batch
    led = led_of(a)
    path, req, resumed = batch.package_next(led, a.n, new=a.new, retry=a.retry)
    print(("RESUMING unfinished" if resumed else "wrote") + f" batch {req['batch']}: {path}")
    for s in req["species"]:
        print(f"   #{s['card']} {s['common']} ({s['scientific']})" + ("  [safety-flagged]" if s.get("safety_flag") else ""))
    if a.collect:
        return cmd_collect(argparse.Namespace(request=str(path), work=a.work, out=a.out, force=False, ledger=a.ledger))
    print("\nNext: commit and push this request file to start the collection workflow, or re-run with --collect on a "
          "machine that can reach api.inaturalist.org.")


def cmd_collect(a):
    from production import batch
    req = pathlib.Path(a.request)
    result = batch.run_request(req, pathlib.Path(a.work), pathlib.Path(a.out), force=a.force)
    resf = req.with_name(req.name.replace(".request.", ".result."))
    L.write_json(resf, result)
    # The ledger is NOT touched here: CI writes only the result file; `pd sync` (run by every
    # other command) applies it, so the machine that downloads and the one that decides never
    # write the same file.
    print(f"\nresult -> {resf}")
    for k, z in result["zips"].items():
        print(f"{k} ZIP: {pathlib.Path(a.out) / z['name']}  ({z['bytes'] / 1e6:.1f} MB)")


def cmd_import_selection(a):
    from production import batch
    led = led_of(a)
    done = batch.import_selection(led, pathlib.Path(a.selection), pathlib.Path(a.originals), pathlib.Path(a.assets_root),
                                  a.by, revise=a.revise, allow_partial=a.allow_partial)
    print("selection imported:", ", ".join(done))
    print(f"originals organised under {a.assets_root}/<card>_<species>/original_selected/")


def cmd_import_assets(a):
    from production import assets
    led = led_of(a)
    files = {}
    if a.dir:
        d = pathlib.Path(a.dir)
        for asset, stems in (("main_image", ("main", "main_image")), ("pixel_icon", ("pixel", "pixel_icon")),
                             ("tall_preview", ("tall", "tall_preview"))):
            for stem in stems:
                for pat in (f"{a.card}_{stem}.*", f"{stem}.*"):
                    hit = sorted(d.glob(pat))
                    if hit:
                        files[asset] = hit[0]
                        break
                if asset in files:
                    break
    for asset, val in (("main_image", a.main), ("pixel_icon", a.pixel), ("tall_preview", a.tall)):
        if val:
            files[asset] = pathlib.Path(val)
    if not files:
        raise L.LedgerError("no files given (--main / --pixel / --tall, or --dir)")
    bad = 0
    for asset, f in files.items():
        rec = assets.import_asset(led, pathlib.Path(a.assets_root), a.card, asset, f, a.by)
        v = rec["validation"]
        print(f"{asset} v{rec['n']}: {'ACCEPTED' if v['ok'] else 'REJECTED'}")
        for e in v["errors"]:
            print(f"    x {e}")
        for w in v["warnings"]:
            print(f"    ! {w}")
        bad += (not v["ok"])
    c = led.card(a.card)
    missing = [x for x in L.ASSETS if led.asset_status(c, x) == "needed"]
    print("still needed:", ", ".join(missing) if missing else "nothing; run `pd format` next")
    return 1 if bad else 0


def cmd_validate(a):
    from production import assets
    v = assets.VALIDATORS[a.asset](pathlib.Path(a.file))
    print(json.dumps(v, indent=1))
    return 0 if v["ok"] else 1


def cmd_format(a):
    from production import assets
    led = led_of(a)
    p = assets.build_board(led, pathlib.Path(a.assets_root), a.card)
    print(f"card-front preview: {a.assets_root}/{p['front']}\ncomparison board:   {a.assets_root}/{p['board']}")
    print("NOT approved. A person must review it, then `pd review` each asset, then `pd approve`.")


def cmd_review(a):
    from production import assets
    assets.record_review(led_of(a), a.card, a.asset, a.verdict, a.by, a.note or "")
    print(f"#{a.card} {a.asset}: review recorded ({a.verdict}) by {a.by}")


def cmd_regenerate(a):
    from production import assets
    assets.request_regeneration(led_of(a), a.card, a.asset, a.reason, a.by, a.confirm_unapprove)
    print(f"#{a.card}: {a.asset} marked for regeneration; the other assets are untouched.")


def cmd_approve(a):
    from production import assets
    assets.approve(led_of(a), a.card, a.by)
    print(f"#{a.card} approved by {a.by}. (Nothing was published or deployed.)")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ledger", default=str(L.LEDGER))
    ap.add_argument("--assets-root", default=str(ASSETS_ROOT))
    ap.add_argument("--work", default=str(WORK_ROOT))
    ap.add_argument("--out", default=str(OUT_ROOT))
    sub = ap.add_subparsers(dest="cmd", required=True)

    def add(name, fn, **kw):
        p = sub.add_parser(name, **kw)
        p.set_defaults(fn=fn)
        return p
    p = add("init", cmd_init); p.add_argument("--list", required=True); p.add_argument("--expect-count", type=int, default=L.EXPECTED_COUNT)
    p = add("status", cmd_status); p.add_argument("--card", type=int, action="append")
    p = add("package-next", cmd_package_next)
    p.add_argument("--n", type=int, default=10); p.add_argument("--new", action="store_true")
    p.add_argument("--retry", action="store_true"); p.add_argument("--collect", action="store_true")
    p = add("collect", cmd_collect); p.add_argument("--request", required=True); p.add_argument("--force", action="store_true")
    p = add("import-selection", cmd_import_selection)
    p.add_argument("selection"); p.add_argument("--originals", required=True); p.add_argument("--by", required=True)
    p.add_argument("--revise", action="store_true"); p.add_argument("--allow-partial", action="store_true")
    p = add("import-assets", cmd_import_assets)
    p.add_argument("card", type=int); p.add_argument("--main"); p.add_argument("--pixel"); p.add_argument("--tall")
    p.add_argument("--dir"); p.add_argument("--by", required=True)
    p = add("validate", cmd_validate); p.add_argument("file"); p.add_argument("--asset", required=True, choices=L.ASSETS)
    p = add("format", cmd_format); p.add_argument("card", type=int)
    p = add("review", cmd_review); p.add_argument("card", type=int); p.add_argument("--asset", required=True, choices=L.ASSETS)
    p.add_argument("--verdict", required=True, choices=["pass", "fail"]); p.add_argument("--by", required=True); p.add_argument("--note")
    p = add("regenerate", cmd_regenerate); p.add_argument("card", type=int); p.add_argument("--asset", required=True, choices=L.ASSETS)
    p.add_argument("--reason", required=True); p.add_argument("--by", required=True); p.add_argument("--confirm-unapprove", action="store_true")
    p = add("approve", cmd_approve); p.add_argument("card", type=int); p.add_argument("--by", required=True)
    a = ap.parse_args(argv)
    try:
        return a.fn(a) or 0
    except L.LedgerError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
