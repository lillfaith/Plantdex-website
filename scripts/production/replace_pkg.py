"""Contact sheets and the final ZIP for a replacement search. A VIEWER: it decides nothing.

Sheets are organised BY SPECIES AND BY ROLE, and each cell is large enough to inspect leaves and
flower structures (520px). Every cell shows the photo ID, the candidate label, the scientific name,
the role, the score and a short reason. Pixel-role cells also show the 24x24 suitability test at
native size and enlarged with nearest-neighbour; that test judges whether a candidate survives
reduction, it is NOT a finished sprite.
"""
from __future__ import annotations

import csv
import io
import json
import pathlib
import textwrap
import zipfile

from PIL import Image, ImageDraw, ImageFont, ImageOps

CELL = 520
COLS, ROWS = 3, 2
PAD = 12
HEAD = 78
CAPTION = 132
PIXEL_STRIP = 160

ROLE_NAME = {"main": "MAIN card photograph", "pixel": "PIXEL ICON source", "tall": "TALL preview"}


def font(size, bold=True):
    for base in ("/usr/share/fonts/truetype/dejavu/", ""):
        try:
            return ImageFont.truetype(base + ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"), size)
        except OSError:
            pass
    return ImageFont.load_default()


def _thumb(path: pathlib.Path) -> Image.Image:
    with Image.open(path) as im:
        im.draft("RGB", (CELL * 2, CELL * 2))
        im = ImageOps.exif_transpose(im).convert("RGB")
        im = ImageOps.contain(im, (CELL, CELL))
        base = Image.new("RGB", (CELL, CELL), (244, 242, 247))
        base.paste(im, ((CELL - im.width) // 2, (CELL - im.height) // 2))
        return base


def cell(item: dict, role: str, row: dict, pix_dir: pathlib.Path | None) -> Image.Image:
    retained = item.get("decision") == "KEEP_APPROVED"
    extra = PIXEL_STRIP if role == "pixel" else 0
    img = Image.new("RGB", (CELL, CELL + CAPTION + extra), (250, 248, 252))
    try:
        img.paste(_thumb(pathlib.Path(item["file_path"])), (0, 0))
    except Exception:  # noqa: BLE001
        pass
    d = ImageDraw.Draw(img)
    tag = item["label"]
    f = font(26)
    w = d.textlength(tag, font=f)
    d.rectangle((0, 0, w + 16, 38), fill=(20, 110, 60) if retained else (40, 10, 80))
    d.text((8, 4), tag, fill="white", font=f)
    if retained:
        d.rectangle((CELL - 250, 0, CELL, 30), fill=(20, 110, 60))
        d.text((CELL - 244, 4), "KEEP_APPROVED", fill="white", font=font(17))
    sc = item["scores"][role]
    y = CELL + 4
    d.text((6, y), f"photo {item['photo_id']}   {role.upper()} score {sc['score'] if not sc['rejected'] else 'n/a'}   "
                   f"{item.get('width', '?')}x{item.get('height', '?')}", fill=(30, 30, 30), font=font(14))
    d.text((6, y + 20), f"{row['scientific']} (#{row['card']})", fill=(70, 50, 100), font=font(13, False))
    why = item["reasons"].get(role) or ("; ".join(sc.get("hard", [])) if sc["rejected"] else "")
    if retained and sc["rejected"]:
        why = "current selection (would be screened out: " + "; ".join(sc["hard"])[:90] + ")"
    for i, line in enumerate(textwrap.wrap(why, 68)[:3]):
        d.text((6, y + 42 + i * 17), line, fill=(40, 40, 40), font=font(13, False))
    flags = [x.split(":")[0] for x in sc.get("flags", []) if not x.startswith("perspective_unverified")]
    if flags:
        d.text((6, y + 96), "check: " + ", ".join(flags)[:80], fill=(150, 70, 0), font=font(12, False))
    if role == "pixel" and pix_dir is not None:
        p24, p6 = pix_dir / f"{item['photo_id']}_24.png", pix_dir / f"{item['photo_id']}_x6.png"
        yy = CELL + CAPTION
        d.text((6, yy + 4), "24x24 test (native | enlarged)", fill=(60, 60, 60), font=font(12))
        if p24.exists():
            grey = (138, 146, 158)          # mid-grey, so white and yellow flower heads are visible
            bg = Image.new("RGB", (24, 24), grey)
            t = Image.open(p24).convert("RGBA")
            bg.paste(t, mask=t.getchannel("A"))
            img.paste(bg, (10, yy + 28))
            e = Image.open(p6).convert("RGBA")             # exactly 6x, nearest-neighbour: no smoothing
            ebg = Image.new("RGB", e.size, grey)
            ebg.paste(e, mask=e.getchannel("A"))
            img.paste(ebg, (60, yy + 8))
        else:
            d.text((10, yy + 40), "no flower head found for the test", fill=(150, 70, 0), font=font(12, False))
    return img


def role_sheets(row: dict, role: str, items: list[dict], out_dir: pathlib.Path, pix_dir=None) -> list[pathlib.Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    per = COLS * ROWS
    n = max(1, -(-len(items) // per))
    paths = []
    for s in range(n):
        chunk = items[s * per:(s + 1) * per]
        cw = CELL + PAD
        ch = CELL + CAPTION + (PIXEL_STRIP if role == "pixel" else 0) + PAD
        sheet = Image.new("RGB", (COLS * cw + PAD, HEAD + ROWS * ch + PAD), (222, 218, 232))
        d = ImageDraw.Draw(sheet)
        d.text((PAD, 6), f"#{row['card']}  {row['common']}  ({row['scientific']})", fill=(40, 10, 80), font=font(26))
        d.text((PAD, 40), f"{ROLE_NAME[role]}   sheet {s + 1} of {n}   ranked best first; KEEP_APPROVED = the current approved photo, shown for comparison",
               fill=(70, 60, 90), font=font(14, False))
        d.text((PAD, 58), "CC0 iNaturalist, unedited originals scaled to fit. Scores are automatic measurements of shape and colour, not botanical judgement.",
               fill=(110, 100, 130), font=font(12, False))
        for i, it in enumerate(chunk):
            r, c = divmod(i, COLS)
            sheet.paste(cell(it, role, row, pix_dir), (PAD + c * cw, HEAD + r * ch))
        p = out_dir / f"sheet-{s + 1}.jpg"
        sheet.save(p, quality=88)
        paths.append(p)
    if not items:
        sheet = Image.new("RGB", (900, 200), (250, 240, 240))
        ImageDraw.Draw(sheet).text((20, 70), f"#{row['card']} {row['scientific']}: NO suitable {role} candidates survived screening", fill=(150, 30, 30), font=font(22))
        p = out_dir / "sheet-1.jpg"
        sheet.save(p, quality=88)
        paths.append(p)
    return paths


CSV_FIELDS = ["card", "scientific", "label", "decision", "photo_id", "observation_id", "license_code", "photographer", "observed_on",
              "place", "width", "height", "bytes", "sha256", "file", "observation_url", "downloaded_from", "recommended_roles",
              "score_main", "score_pixel", "score_tall", "flags", "id_agreements", "id_disagreements", "flowering_annotation",
              "license_verified_at", "reason_main", "reason_pixel", "reason_tall"]


def manifest_rows(species_results: list[dict]) -> list[dict]:
    rows = []
    for sr in species_results:
        for it in sr["candidates"]:
            sc = it["scores"]
            rows.append({
                "card": sr["card"], "scientific": sr["scientific"], "label": it["label"], "decision": it["decision"],
                "photo_id": it["photo_id"], "observation_id": it["observation_id"], "license_code": it["license_code"],
                "photographer": it.get("photographer"), "observed_on": it.get("observed_on"), "place": it.get("place"),
                "width": it.get("width"), "height": it.get("height"), "bytes": it.get("bytes"), "sha256": it.get("sha256"),
                "file": it.get("zip_path"), "observation_url": it.get("observation_url"), "downloaded_from": it.get("downloaded_from"),
                "recommended_roles": ",".join(it.get("recommended_roles", [])),
                "score_main": sc["main"]["score"], "score_pixel": sc["pixel"]["score"], "score_tall": sc["tall"]["score"],
                "flags": " | ".join(sorted({f for r in sc.values() for f in r.get("flags", []) if not f.startswith("perspective_unverified")})),
                "id_agreements": it.get("identification_agreements"), "id_disagreements": it.get("identification_disagreements"),
                "flowering_annotation": it.get("flowering_annotation"), "license_verified_at": it.get("license_verified_at"),
                "reason_main": it["reasons"].get("main", ""), "reason_pixel": it["reasons"].get("pixel", ""), "reason_tall": it["reasons"].get("tall", "")})
    return rows


def readme(request: dict, species_results: list[dict], stamp: str) -> str:
    L = ["# PlantDex replacement photo search - cards #57-61", f"Built {stamp} UTC", "",
         "You are choosing SOURCE PHOTOGRAPHS. You will later do the background removal, upscaling, pixel icons and formatting.",
         "Nothing in this package is edited, generated or approved.", "",
         "## How to use it", "",
         "1. For each species, open `contact-sheets/<card>_<species>/<role>/sheet-N.jpg`. Candidates are ranked best first.",
         "   Cells are large on purpose: inspect the leaves, the flower structure and the edges.",
         "2. Open the full-resolution file for anything promising: `originals/<card>_<species>/<label>__<photo_id>.<ext>`.",
         "3. Photos marked **KEEP_APPROVED** are the current approved selection. Keep them unless you find a real problem",
         "   (their files are in `approved-sources/`).",
         "4. Fill in `selection-template.json` and return it. Use the label (e.g. `59-07`) or the photo id.", "",
         "## The three roles", "",
         "- **main_photograph** (`main_photo`): a complete, connected flowering branch or plant with intact leaves and stem, natural",
         "  front or side view, room to cut it out. Not top-down, not fisheye, nothing important cut off, no dense patch.",
         "- **pixel_source** (`pixel_source`): ONE complete flower head or cluster (or one distinctive fruit/leaf), whole, with a strong",
         "  silhouette and clear colour. The final icon is 21-24 px native with a transparent background. The pixel cells show a",
         "  24x24 test of each candidate; it is a suitability test only, and a high-resolution photo does not make a good icon.",
         "- **tall_preview** (`tall_preview`): one upright flowering stalk or vertical branch, well separated, top and lower structure intact.", "",
         "## What the automatic screening did and did not do", "",
         "- It removed only what it could detect reliably: low resolution, very soft focus, a hand over the plant, no separable subject,",
         "  a dense patch, a subject cut off by several edges, a flower head cut by the frame, a stalk cut at the top.",
         "- It could NOT judge viewing angle, lens distortion, whether a cluster is representative, or whether a plant is the right species.",
         "  Every candidate carries a `check:` line listing what to look at. **Perspective is never verified automatically.**",
         "- Scores rank by botanical recognizability, completeness, ease of isolating, role suitability, perspective, appeal, then resolution.",
         "  They are measurements of colour and shape, not botany. Trust your eyes over the numbers.",
         "- Identification: every photo is iNaturalist research grade, but some have only one agreeing identifier. That is flagged (`id_thin`).", "",
         "## Licensing", "",
         "Every photograph is CC0 on iNaturalist for THAT photo, checked twice (in the search and by re-reading its observation).",
         "Photographer, observation link, hash and download source are in `manifest.csv` / `manifest.json`.", "",
         "## Where candidates were short", ""]
    short = False
    for sr in species_results:
        for role, info in sr["roles"].items():
            if info["searched"] and info["shortlisted"] < 10:
                short = True
                L.append(f"- #{sr['card']} {sr['common']} / {role}: only {info['shortlisted']} strong candidate(s) "
                         + ("(none survived screening)" if info["shortlisted"] == 0 else "(the rest were weak; no quota was filled)"))
    if not short:
        L.append("- No role came up short.")
    L += ["", "## Species", ""]
    for sr in species_results:
        L.append(f"### #{sr['card']} {sr['common']} ({sr['scientific']})")
        for role in ("main", "pixel", "tall"):
            info = sr["roles"][role]
            keep = sr["retained"].get(role)
            L.append(f"- {role}: " + (f"KEEP_APPROVED photo {keep}" if keep else "needs a choice")
                     + (f"; {info['shortlisted']} new candidates" if info["searched"] else "; not searched"))
        L.append("")
    return "\n".join(L)


def selection_template(species_results: list[dict]) -> dict:
    out = {"batch": "search-v2", "instructions": "Fill each null with a label or photo id. KEEP_APPROVED entries are pre-filled; change one only for a real problem and say why in notes.", "selections": []}
    for sr in species_results:
        sel = {"card": sr["card"], "common": sr["common"], "scientific": sr["scientific"]}
        for role, key in (("main", "main_photo"), ("pixel", "pixel_source"), ("tall", "tall_preview")):
            sel[key] = sr["retained"].get(role)
        sel["status"] = {key: ("KEEP_APPROVED" if sr["retained"].get(role) else "CHOOSE")
                         for role, key in (("main", "main_photo"), ("pixel", "pixel_source"), ("tall", "tall_preview"))}
        sel["candidates"] = {role: [c["label"] for c in sr["candidates"] if role in c.get("shortlisted_for", [])] for role in ("main", "pixel", "tall")}
        sel["notes"] = ""
        out["selections"].append(sel)
    return out


def build_zip(request: dict, species_dirs: list[pathlib.Path], species_results: list[dict], out_zip: pathlib.Path, stamp: str) -> dict:
    root = "plantdex-photo-search-v2-cards-57-61"
    rows = manifest_rows(species_results)
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=CSV_FIELDS)
    w.writeheader()
    w.writerows(rows)
    summary = {"built": stamp, "species": [{k: v for k, v in sr.items() if k != "candidates"} | {"n_candidates": len(sr["candidates"])} for sr in species_results]}
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_STORED) as z:
        z.writestr(f"{root}/README_FOR_CHATGPT.md", readme(request, species_results, stamp))
        z.writestr(f"{root}/selection-template.json", json.dumps(selection_template(species_results), indent=1))
        z.writestr(f"{root}/manifest.csv", buf.getvalue())
        z.writestr(f"{root}/manifest.json", json.dumps({"built": stamp, "species": species_results}, indent=1, default=str))
        z.writestr(f"{root}/summary.json", json.dumps(summary, indent=1, default=str))
        for d in species_dirs:
            for sub in ("contact-sheets", "originals", "approved-sources", "pixel-tests"):
                for f in sorted((d / sub).rglob("*")):
                    if f.is_file():
                        z.write(f, f"{root}/{sub}/{d.name}/{f.relative_to(d / sub).as_posix()}")
    return summary
