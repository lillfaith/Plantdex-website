#!/usr/bin/env python3
"""PlantDex photo collector: 20-30 CC0 candidate photos per plant, labelled for comparison.

A PRIVATE COLLECTION TOOL, NOT AN EDITOR. It finds, checks, labels and packages. It does not
cut out, crop, rank, select or place anything, and it touches no card.

REUSES scripts/fetch_inat_photos.py (taxon matching, CC0-only, research-grade-only, per-photo
licence check, provenance, original-size download). What this adds on top:

  1. a SECOND, independent licence check: every photo is re-read from its observation record
     and dropped unless iNaturalist still says CC0 for THAT photo and the observation is
     still the species asked for;
  2. at most two photos per observation, so 30 candidates are not five plants photographed
     six times each;
  3. numbered, labelled contact sheets (e.g. "57-04") so a person or another AI can say
     "04 and 11 are the best" and mean something exact;
  4. one ZIP: sheets + original photos + licence/source metadata.

It never widens the licence set. If fewer than the minimum survive, it SAYS SO in the README
and the summary; it does not quietly accept CC-BY to make the number.

    python3 scripts/photo_collector.py --queue evidence/collector-queue.json --out out/
    python3 scripts/photo_collector.py --self-test
api.inaturalist.org is refused by the development sandbox, so real runs happen in Actions.
"""
from __future__ import annotations

import argparse, csv, datetime as dt, hashlib, io, json, pathlib, re, sys, tempfile, zipfile

from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fetch_inat_photos as F  # noqa: E402  (the existing, tested fetcher)

CELL = 420            # image box per photo on a sheet
CAPTION = 50
COLS, ROWS = 4, 3     # 12 per sheet: big enough to judge, few enough to compare
PAD = 10
HEADER = 54
MAX_PER_OBSERVATION = 2
MIN_EDGE_TIERS = (900, 700)   # try the strict size first; relax once and RECORD it


def key_of(sci: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", sci.lower()).strip("_")


def font(size: int, bold: bool = True):
    names = ["DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"]
    for n in names:
        for base in ("/usr/share/fonts/truetype/dejavu/", ""):
            try:
                return ImageFont.truetype(base + n, size)
            except OSError:
                pass
    return ImageFont.load_default()


# --- 1. collect -------------------------------------------------------------------------

def diversify(photos: list[dict], cap: int) -> list[dict]:
    per: dict[int, int] = {}
    out = []
    for p in photos:
        n = per.get(p["observation_id"], 0)
        if n >= MAX_PER_OBSERVATION:
            continue
        per[p["observation_id"]] = n + 1
        out.append(p)
        if len(out) >= cap:
            break
    return out


def verify_licenses(photos: list[dict], taxon_id: int) -> tuple[list[dict], list[dict]]:
    """Re-read each photo's licence from its observation. Returns (kept, dropped)."""
    kept, dropped = [], []
    ids = sorted({p["observation_id"] for p in photos})
    truth: dict[int, dict] = {}
    for i in range(0, len(ids), 30):
        chunk = ids[i:i + 30]
        ans = F.get(f"{F.API}/observations/{','.join(map(str, chunk))}?per_page=30") or {}
        for obs in ans.get("results", []):
            truth[obs["id"]] = obs
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    for p in photos:
        obs = truth.get(p["observation_id"])
        why = None
        if obs is None:
            why = "observation could not be re-read"
        elif (obs.get("taxon") or {}).get("id") != taxon_id:
            why = "observation taxon changed since search"
        else:
            ph = next((x for x in obs.get("photos", []) if x.get("id") == p["photo_id"]), None)
            if ph is None:
                why = "photo no longer on the observation"
            elif (ph.get("license_code") or "").lower() != "cc0":
                why = f"photo licence is now {ph.get('license_code')!r}, not cc0"
        if why:
            dropped.append({"photo_id": p["photo_id"], "reason": why})
        else:
            p["license_verified_at"] = now
            p["license_verification"] = "re-read from /v1/observations/{id}: photo.license_code == cc0"
            kept.append(p)
    return kept, dropped


def collect(row: dict, orig_dir: pathlib.Path, lo: int, hi: int) -> dict:
    sci = row["scientific"]
    result = {"card": row["card"], "common": row["common"], "scientific": sci,
              "taxon": None, "photos": [], "dropped": [], "notes": [], "min_edge_used": None}
    photos: list[dict] = []
    taxon = None
    for edge in MIN_EDGE_TIERS:
        h = F.harvest(sci, ("cc0",), hi + 15, min_edge=edge)
        if h["taxon"] is None:
            result["notes"].append(h.get("note") or "taxon not found")
            return result
        taxon = h["taxon"]
        photos = diversify(h["photos"], hi + 6)
        photos, dropped = verify_licenses(photos, taxon["id"])
        result["dropped"] += dropped
        result["min_edge_used"] = edge
        if len(photos) >= lo:
            break
        result["notes"].append(f"only {len(photos)} survived at min edge {edge}px")
    result["taxon"] = taxon
    photos = photos[:hi]
    F.download(photos, orig_dir, prefer="original")
    good = []
    for p in photos:
        f = orig_dir / p.get("file", "")
        if not p.get("file") or not f.exists():
            result["dropped"].append({"photo_id": p["photo_id"], "reason": "download failed"})
            continue
        data = f.read_bytes()
        try:
            with Image.open(io.BytesIO(data)) as im:
                p["width"], p["height"] = im.size
        except Exception as e:  # noqa: BLE001
            f.unlink()
            result["dropped"].append({"photo_id": p["photo_id"], "reason": f"unreadable image: {e}"})
            continue
        p["sha256"] = hashlib.sha256(data).hexdigest()
        p["downloaded_from"] = (p.get("urls") or {}).get(p.get("downloaded_size"))
        good.append(p)
    for n, p in enumerate(good, 1):
        p["label"] = f"{row['card']}-{n:02d}"
    result["photos"] = good
    if len(good) < lo:
        result["notes"].append(f"SHORTFALL: {len(good)} CC0 photos available, wanted at least {lo}. "
                               "Licence set was NOT widened.")
    return result


# --- 2. contact sheets -------------------------------------------------------------------

def _short(s, n):
    s = (s or "").strip()
    return s if len(s) <= n else s[: n - 1] + "…"


def cell(p: dict, orig_dir: pathlib.Path) -> Image.Image:
    img = Image.new("RGB", (CELL, CELL + CAPTION), (246, 244, 249))
    try:
        with Image.open(orig_dir / p["file"]) as im:
            im.draft("RGB", (CELL * 2, CELL * 2))
            im = ImageOps.exif_transpose(im).convert("RGB")
            im = ImageOps.contain(im, (CELL, CELL))
            img.paste(im, ((CELL - im.width) // 2, (CELL - im.height) // 2))
    except Exception:  # noqa: BLE001
        pass
    d = ImageDraw.Draw(img)
    # Big, high-contrast label so it survives downscaling when another AI views the sheet.
    f = font(30)
    tw = d.textlength(p["label"], font=f)
    d.rectangle((0, 0, tw + 18, 42), fill=(40, 10, 80))
    d.text((9, 4), p["label"], fill=(255, 255, 255), font=f)
    d.text((6, CELL + 4), f"photo {p['photo_id']}   {p['width']}x{p['height']}   {p.get('observed_on') or 'date n/a'}",
           fill=(30, 30, 30), font=font(14, False))
    d.text((6, CELL + 27), _short(p.get("photographer") or "photographer n/a", 52),
           fill=(90, 90, 90), font=font(13, False))
    return img


def make_sheets(res: dict, orig_dir: pathlib.Path, out: pathlib.Path) -> list[pathlib.Path]:
    out.mkdir(parents=True, exist_ok=True)
    per = COLS * ROWS
    photos = res["photos"]
    n_sheets = max(1, -(-len(photos) // per))
    made = []
    for s in range(n_sheets):
        chunk = photos[s * per:(s + 1) * per]
        cw, ch = CELL + PAD, CELL + CAPTION + PAD
        sheet = Image.new("RGB", (COLS * cw + PAD, HEADER + ROWS * ch + PAD), (222, 218, 232))
        d = ImageDraw.Draw(sheet)
        first, last = (chunk[0]["label"], chunk[-1]["label"]) if chunk else ("-", "-")
        d.text((PAD, 8), f"#{res['card']}  {res['common']}  ({res['scientific']})", fill=(40, 10, 80), font=font(22))
        d.text((PAD, 33), f"sheet {s + 1} of {n_sheets}   labels {first} to {last}   "
                          f"CC0 research-grade iNaturalist   unedited originals, scaled to fit",
               fill=(70, 60, 90), font=font(13, False))
        for i, p in enumerate(chunk):
            r, c = divmod(i, COLS)
            sheet.paste(cell(p, orig_dir), (PAD + c * cw, HEADER + r * ch))
        path = out / f"{res['card']}_{key_of(res['scientific'])}_sheet{s + 1}.jpg"
        sheet.save(path, quality=85)
        made.append(path)
    return made


# --- 3. package --------------------------------------------------------------------------

CSV_FIELDS = ["label", "card", "scientific", "photo_id", "observation_id", "license_code", "photographer",
              "observed_on", "place", "width", "height", "bytes", "sha256", "file",
              "observation_url", "downloaded_from", "license_verified_at"]


def readme(batch: str, results: list[dict], stamp: str) -> str:
    lines = [f"PlantDex photo batch {batch}", f"Built {stamp} UTC by scripts/photo_collector.py", "",
             "WHAT THIS IS", "Unedited candidate photographs for comparison. Nothing is cropped, cut out, ranked or",
             "selected. Choose by label (for example 57-04).", "",
             "LICENCE", "Every photo is CC0 (public domain dedication) AS RECORDED BY iNaturalist FOR THAT PHOTO, and",
             "was checked twice: once in the search, once by re-reading its observation. Photographer and",
             "observation URL are kept in each folder's metadata.json and in licenses.csv anyway.",
             "Research grade means the community agreed on the species; it is not proof.", "",
             "SPECIES", ""]
    for r in results:
        lines.append(f"  #{r['card']} {r['common']} ({r['scientific']}): {len(r['photos'])} photos"
                     + (f"   [{'; '.join(r['notes'])}]" if r["notes"] else ""))
    lines += ["", "LAYOUT", "  <card>_<species>/contact-sheets/   labelled sheets, 12 photos each",
              "  <card>_<species>/originals/        the photos as downloaded (largest size iNaturalist serves)",
              "  <card>_<species>/metadata.json     source, licence, hashes, anything dropped and why",
              "  licenses.csv, manifest.json        the same across all species"]
    return "\n".join(lines) + "\n"


def package(batch: str, results: list[dict], work: pathlib.Path, zip_path: pathlib.Path) -> None:
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M")
    root = f"plantdex-photo-batch-{batch}"
    rows = []
    for r in results:
        for p in r["photos"]:
            rows.append({**{k: p.get(k) for k in CSV_FIELDS}, "card": r["card"], "scientific": r["scientific"]})
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as z:   # JPEGs do not compress
        z.writestr(f"{root}/README.txt", readme(batch, results, stamp))
        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=CSV_FIELDS)
        w.writeheader(); w.writerows(rows)
        z.writestr(f"{root}/licenses.csv", buf.getvalue())
        z.writestr(f"{root}/manifest.json", json.dumps(
            [{k: v for k, v in r.items() if k != "photos"} | {"count": len(r["photos"])} for r in results], indent=1))
        for r in results:
            folder = f"{r['card']}_{key_of(r['scientific'])}"
            base = work / folder
            z.writestr(f"{root}/{folder}/metadata.json", json.dumps(r, indent=1, default=str))
            for f in sorted((base / "contact-sheets").glob("*.jpg")):
                z.write(f, f"{root}/{folder}/contact-sheets/{f.name}")
            for f in sorted((base / "originals").glob("*")):
                z.write(f, f"{root}/{folder}/originals/{f.name}")


def run(queue: pathlib.Path, out: pathlib.Path, lo: int, hi: int) -> pathlib.Path:
    q = json.loads(queue.read_text())
    batch = str(q.get("batch", "001"))
    work = out / "work"
    results = []
    for row in q["species"]:
        base = work / f"{row['card']}_{key_of(row['scientific'])}"
        print(f"#{row['card']} {row['scientific']} ...", flush=True)
        res = collect(row, base / "originals", lo, hi)
        make_sheets(res, base / "originals", base / "contact-sheets")
        print(f"   {len(res['photos'])} photos, {len(res['dropped'])} dropped, notes={res['notes']}", flush=True)
        results.append(res)
    zip_path = out / f"plantdex-photo-batch-{batch}.zip"
    package(batch, results, work, zip_path)
    print(f"\nZIP: {zip_path}  ({zip_path.stat().st_size / 1e6:.1f} MB)")
    return zip_path


# --- self-test (no network) --------------------------------------------------------------

def self_test() -> int:
    """Drives the real code path with a fake iNaturalist so licence, diversity, sheets and
    packaging are all exercised without the network."""
    def fake_jpeg(seed):
        im = Image.new("RGB", (1200, 900), ((seed * 37) % 255, 120, 80))
        b = io.BytesIO(); im.save(b, "JPEG"); return b.getvalue()

    def photo(pid, lic="cc0"):
        return {"id": pid, "license_code": lic, "attribution": f"(c) person {pid}, CC0",
                "url": f"https://x/photos/{pid}/square.jpg", "original_dimensions": {"width": 1200, "height": 900}}

    # 3 observations x 3 photos (diversify must keep 2 each); one photo is NOT cc0 on re-read.
    obs = [{"id": 1000 + i, "taxon": {"id": 7, "name": "Aa bb"}, "quality_grade": "research",
            "observed_on": "2024-07-01", "place_guess": "somewhere",
            "photos": [photo(i * 10 + k) for k in range(3)]} for i in range(3)]
    reread = json.loads(json.dumps(obs)); reread[0]["photos"][0]["license_code"] = "cc-by"

    def fake_get(url, raw=False, timeout=60):
        if raw:
            return fake_jpeg(len(url))
        if "/taxa?" in url:
            return {"results": [{"id": 7, "name": "Aa bb", "rank": "species"}]}
        if re.search(r"/observations/\d", url):
            return {"results": reread}
        return {"results": obs} if "page=1" in url else {"results": []}

    real, F.get = F.get, fake_get
    sleep, F.time.sleep = F.time.sleep, lambda s: None
    try:
        with tempfile.TemporaryDirectory() as t:
            t = pathlib.Path(t)
            qf = t / "q.json"
            qf.write_text(json.dumps({"batch": "test", "species": [{"card": 99, "common": "Test", "scientific": "Aa bb"}]}))
            zp = run(qf, t / "out", lo=3, hi=30)
            names = zipfile.ZipFile(zp).namelist()
            meta = json.loads(zipfile.ZipFile(zp).read("plantdex-photo-batch-test/99_aa_bb/metadata.json"))
            kept = [p["photo_id"] for p in meta["photos"]]
            checks = [
                (len(meta["photos"]) == 5, f"2 per observation (3 obs = 6), minus 1 not-CC0 on re-read = 5, got {len(meta['photos'])}"),
                (0 not in kept, "the photo whose licence changed to cc-by was dropped"),
                (any("not cc0" in d["reason"] for d in meta["dropped"]), "the drop reason is recorded"),
                (all(p["license_code"] == "cc0" and p.get("sha256") for p in meta["photos"]), "every kept photo is cc0 with a hash"),
                (any(n.endswith("_sheet1.jpg") for n in names), "a contact sheet is in the zip"),
                (sum("/originals/" in n for n in names) == 5, "the originals are in the zip"),
                (any(n.endswith("licenses.csv") for n in names) and any(n.endswith("README.txt") for n in names), "csv and readme present"),
                (meta["photos"][0]["label"] == "99-01", "labels carry the card number"),
            ]
    finally:
        F.get, F.time.sleep = real, sleep
    bad = 0
    for ok, label in checks:
        print(("PASS  " if ok else "FAIL  ") + label); bad += (not ok)
    print("\nALL SELF-TESTS PASSED" if not bad else f"\n{bad} FAILURE(S)")
    return 1 if bad else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--queue"); ap.add_argument("--out", default="out")
    ap.add_argument("--min", type=int, default=20); ap.add_argument("--max", type=int, default=30)
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    run(pathlib.Path(a.queue), pathlib.Path(a.out), a.min, a.max)
    return 0


if __name__ == "__main__":
    sys.exit(main())
