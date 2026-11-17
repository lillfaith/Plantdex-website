#!/usr/bin/env python3
"""Offline tests for the replacement-search pipeline. No network: iNaturalist is faked and every
photograph is a synthetic scene built to trigger exactly one situation from the owner's list.

    python3 scripts/production/test_search_v2.py
"""
from __future__ import annotations

import io
import json
import pathlib
import sys
import tempfile
import zipfile

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import fetch_inat_photos as F                       # noqa: E402
from production import rank as R, replace_pkg as PKG, replace_search as RS, screen as S, search2 as SE   # noqa: E402

PASS, FAIL = [], []
BG = (170, 185, 200)


def check(ok, label):
    ok = bool(ok)
    (PASS if ok else FAIL).append(label)
    print(("PASS  " if ok else "FAIL  ") + label)


# --- synthetic scenes ------------------------------------------------------------------------------

def scene(kind: str, seed: int = 0) -> bytes:
    rs = np.random.RandomState(seed)
    kind, _, frac = kind.partition(":")
    W, H = (720, 960) if kind in ("tall_stalk", "wide_bush", "tall_clipped") else (960, 720)
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    green, white = (40, 130, 50), (245, 245, 245)

    def plant(cx, top, bottom, r, leaves=True, stem_w=14):
        d.rectangle((cx - stem_w // 2, top + r, cx + stem_w // 2, bottom), fill=green)
        d.ellipse((cx - r, top, cx + r, top + 2 * r), fill=white)
        if leaves:
            d.ellipse((cx - 150, (top + bottom) // 2, cx + 6, (top + bottom) // 2 + 50), fill=green)
            d.ellipse((cx - 6, (top + bottom) // 2 + 70, cx + 150, (top + bottom) // 2 + 120), fill=green)

    cxm = int(W * float(frac)) if frac else W // 2
    if kind == "good_main":
        plant(cxm, int(H * 0.15), H - 2, 130)
    elif kind == "clipped_top":
        plant(W // 2, -60, H - 2, 130)
    elif kind == "tiny":
        plant(W // 2, int(H * 0.72), int(H * 0.9), 22, leaves=False, stem_w=4)
    elif kind == "dense":
        d.rectangle((0, 0, W, H), fill=green)
        for i in range(12):
            d.ellipse((60 + i * 70, 100 + (i % 3) * 150, 110 + i * 70, 150 + (i % 3) * 150), fill=white)
    elif kind == "head_closeup":
        d.rectangle((W // 2 - 8, int(H * 0.62), W // 2 + 8, H - 2), fill=green)
        d.ellipse((W // 2 - 170, int(H * 0.12), W // 2 + 170, int(H * 0.12) + 340), fill=white)
    elif kind == "head_cropped":
        d.ellipse((-150, int(H * 0.25), 190, int(H * 0.25) + 340), fill=white)
        d.rectangle((10, int(H * 0.7), 24, H - 2), fill=green)
    elif kind == "tall_stalk":
        plant(cxm, int(H * 0.06), H - 2, 55, leaves=True, stem_w=12)
    elif kind == "tall_clipped":
        plant(W // 2, -40, H - 2, 55, leaves=True, stem_w=12)
    elif kind == "wide_bush":
        d.ellipse((-80, int(H * 0.2), W + 80, H + 100), fill=green)
        for i in range(8):
            d.ellipse((30 + i * 85, int(H * 0.3) + (i % 2) * 90, 90 + i * 85, int(H * 0.3) + 60 + (i % 2) * 90), fill=white)
    elif kind == "blurry":
        plant(W // 2, int(H * 0.15), H - 2, 130)
    arr = np.asarray(im).astype(int)
    # texture only where there is plant, so the background stays an exact colour (the fake mask keys on it)
    plantpix = np.abs(arr - np.array(BG)).sum(axis=2) > 40
    noise = rs.randint(-18, 19, arr.shape)
    arr = np.where(plantpix[..., None], np.clip(arr + noise, 0, 255), arr).astype("uint8")
    out = Image.fromarray(arr)
    if kind == "blurry":
        out = out.filter(ImageFilter.GaussianBlur(9))
    b = io.BytesIO()
    out.save(b, "JPEG", quality=92)
    return b.getvalue()


def fake_mask(rgb: np.ndarray) -> np.ndarray:
    return np.abs(rgb.astype(int) - np.array(BG)).sum(axis=2) > 40


def ev_of(kind: str, orig_long: int = 3000, fk: str = "white") -> dict:
    img = Image.open(io.BytesIO(scene(kind)))
    return S.evaluate(np.array(img), orig_long, fk, fake_mask)


# --- a fake iNaturalist ----------------------------------------------------------------------------

class Fake:
    def __init__(self):
        self.photos = {}      # photo id -> scene kind
        self.obs = []
        self.calls = []

    def add(self, pid, obs_id, kind, flowering=True, agree=3, lic="cc0", dims=(3000, 2000), obs_extra=None):
        self.photos[pid] = kind
        o = {"id": obs_id, "taxon": {"id": 7, "name": "Testus plantus"}, "quality_grade": "research", "community_taxon_id": 7,
             "num_identification_agreements": agree, "num_identification_disagreements": 0, "observed_on": "2024-07-01",
             "place_guess": "somewhere", "annotations": ([{"controlled_attribute": {"label": "Plant Phenology"}, "controlled_value": {"label": "Flowering"}}] if flowering else []),
             "photos": [{"id": pid, "license_code": lic, "attribution": f"(c) person {pid}, CC0", "url": f"https://x/photos/{pid}/square.jpg",
                         "original_dimensions": {"width": dims[0], "height": dims[1]}}]}
        o.update(obs_extra or {})
        self.obs.append(o)

    def get(self, url, raw=False, timeout=60):
        if raw:
            pid = int(url.split("/photos/")[1].split("/")[0])
            return scene(self.photos[pid], pid) if pid in self.photos else None
        if "/taxa?" in url:
            return {"results": [{"id": 7, "name": "Testus plantus", "rank": "species"}]} if "Testus" in url else {"results": []}
        if "/observations?" in url:
            q = dict(x.split("=") for x in url.split("?")[1].split("&"))
            self.calls.append(q)
            if int(q.get("page", 1)) > 1:
                return {"results": []}
            rows = [o for o in self.obs if "term_id" not in q or o["annotations"]]
            return {"results": rows}
        if "/observations/" in url:
            ids = {int(x) for x in url.split("/observations/")[1].split("?")[0].split(",")}
            return {"results": [o for o in self.obs if o["id"] in ids]}
        return None


def main() -> int:
    # ===== screening: one situation each ====================================================================
    good = ev_of("good_main")
    check(not good["common_hard"] and not good["roles"]["main"]["hard"], "a complete, well-framed plant passes the main screen")
    check(not good["measure"]["largest"]["touch"]["top"] and good["measure"]["largest"]["h_frac"] > 0.6, "its measurements show a tall subject with an intact top")
    clipped = ev_of("clipped_top")
    check(any(h.startswith("main_clipped") or "touches" in h for h in clipped["roles"]["main"]["hard"]) or clipped["roles"]["main"]["flags"],
          "a flower cut by the top of the frame is rejected or flagged for main")
    check(any(h.startswith("tall_clipped_top") for h in clipped["roles"]["tall"]["hard"]), "a stalk cut at the top is a HARD reject for the tall role")
    tiny = ev_of("tiny")
    check(any(h.startswith(("subject_too_small", "no_subject")) for h in tiny["common_hard"] + tiny["roles"]["main"]["hard"]), "a small plant lost in the scene is rejected")
    dense = ev_of("dense")
    check(any(h.startswith("dense_patch") for h in dense["common_hard"]), "a dense patch with no separable subject is rejected")
    check(any(f.startswith("perspective_unverified") for f in good["common_flags"]), "perspective is always flagged as unverified, never asserted")
    blurry = ev_of("blurry")
    check(any(h.startswith("too_soft") for h in blurry["common_hard"]), "a very soft photograph is rejected")
    small = ev_of("good_main", orig_long=900)
    check(any(h.startswith("low_resolution") for h in small["common_hard"]), "an original under 1200px is rejected")
    check(good["hands"]["checked"] and not good["hands"]["reject"], "the existing hand detector runs and does not flag a plain plant")
    head = ev_of("head_closeup")
    check(not head["roles"]["pixel"]["hard"] and head["pixel_test"] is not None, "one complete flower head passes the pixel screen and gets a 24px test")
    px = head["_pixel_images"][0]
    arr = np.array(px)
    check(px.size == (24, 24) and px.mode == "RGBA" and set(np.unique(arr[..., 3])) <= {0, 255}, "the pixel test is a native 24x24 image with hard binary alpha")
    cropped = ev_of("head_cropped")
    check(any(h.startswith("pixel_head_cropped") for h in cropped["roles"]["pixel"]["hard"]), "a flower head cut by the frame is rejected for the pixel role")
    wide = ev_of("wide_bush")
    check(any(h.startswith("tall_wide_mass") for h in wide["roles"]["tall"]["hard"]) or any(h.startswith("dense_patch") for h in wide["common_hard"]),
          "a broad bush cropped on both sides is rejected for the tall role")
    stalk = ev_of("tall_stalk")
    check(not stalk["roles"]["tall"]["hard"] and stalk["roles"]["tall"]["suitability"] > good["roles"]["tall"]["suitability"] - 0.01,
          "an upright single stalk suits the tall role at least as well as a general plant")

    # ===== ranking =============================================================================================
    obs = {"identification_agreements": 3, "identification_disagreements": 0, "flowering_annotation": True, "taxon_id": 7, "community_taxon_id": 7}
    s_good = R.score_role("main", good, obs, 3000, "white")
    s_clip = R.score_role("main", clipped, obs, 3000, "white")
    check(not s_good["rejected"] and s_good["score"] > 45, f"the complete plant is ranked ({s_good['score']})")
    check(s_clip["rejected"] and s_clip["score"] == 0.0, "a hard-rejected photograph scores zero and is excluded, however attractive")
    thin = R.score_role("main", good, {**obs, "identification_agreements": 1}, 3000, "white")
    check(any(f.startswith("id_thin") for f in thin["flags"]) and thin["score"] < s_good["score"], "a thinly identified photo is FLAGGED and ranked lower, not hidden")
    disputed = R.score_role("main", good, {**obs, "identification_disagreements": 2}, 3000, "white")
    check(any(f.startswith("id_disputed") for f in disputed["flags"]), "a disputed identification is flagged")
    w = R.WEIGHTS
    check(list(w) == ["recognizability", "completeness", "isolability", "role", "perspective", "aesthetic", "quality"]
          and w["recognizability"] >= w["completeness"] > w["role"] > w["aesthetic"] and abs(sum(w.values()) - 1) < 1e-9,
          "the weights follow the owner's priority order and aesthetics is worth a twentieth")
    rows = [{"photo": {"observation_id": i // 3}, "scores": {"main": {"rejected": False, "score": 90 - i}}, "hash": None} for i in range(9)]
    sl = R.shortlist(rows, "main", n=12)
    check(len(sl) == 6, "at most two photographs per observation are shortlisted")
    weak = [{"photo": {"observation_id": i}, "scores": {"main": {"rejected": False, "score": 30}}, "hash": None} for i in range(8)]
    check(R.shortlist(weak, "main", n=12) == [], "weak candidates are NOT used to fill a quota")

    # ===== the whole species flow with a fake iNaturalist ======================================================
    fake = Fake()
    fake.add(1001, 5001, "good_main")
    fake.add(1002, 5002, "good_main", agree=1)
    fake.add(1003, 5003, "clipped_top")
    fake.add(1004, 5004, "tiny")
    fake.add(1005, 5005, "dense")
    fake.add(1006, 5006, "head_closeup")
    fake.add(1007, 5007, "head_cropped")
    fake.add(1008, 5008, "tall_stalk")
    fake.add(1009, 5009, "wide_bush")
    fake.add(1010, 5010, "blurry")
    fake.add(1011, 5011, "good_main", lic="cc-by")                     # an observation-level CC0 with a non-CC0 photo is skipped
    fake.add(1012, 5012, "good_main", dims=(900, 600))                 # too small an original
    fake.add(1013, 5013, "good_main")                                  # previously shown: must not return
    fake.add(1014, 5014, "good_main")                                  # its OBSERVATION was shown before: must not return
    fake.add(1015, 5015, "tall_stalk:0.3")                               # licence changes on the re-check (a distinct picture, so it is not de-duplicated first)
    fake.add(1020, 5020, "head_closeup")                               # the retained pixel source
    fake.add(1021, 5021, "good_main", flowering=False)
    real_get, real_sleep, real_sleep2 = F.get, F.time.sleep, SE.time.sleep
    F.get, F.time.sleep, SE.time.sleep = fake.get, lambda s: None, lambda s: None
    try:
        with tempfile.TemporaryDirectory() as t:
            t = pathlib.Path(t)
            prev = {"photos": {"1013": {"observation_id": 5013, "card": 57}, "1099": {"observation_id": 5014, "card": 57},
                               "1020": {"observation_id": 5020, "observation_url": "https://www.inaturalist.org/observations/5020", "photographer": "(c) x, CC0", "card": 57}}}
            row = {"card": 57, "common": "Test", "scientific": "Testus plantus", "flower_kind": "white",
                   "needed_roles": ["main", "pixel", "tall"], "retained": {"pixel": 1020}}
            # the licence of 1015 changes between the search and the re-check
            original_reverify = SE.reverify
            def reverify(photos, tid):
                ok, dropped = original_reverify(photos, tid)
                keep, drop = [], list(dropped)
                for p in ok:
                    (drop if p["photo_id"] == 1015 else keep).append(p if p["photo_id"] != 1015 else {"photo_id": 1015, "reason": "photo licence is now 'cc-by', not cc0"})
                return keep, drop
            SE.reverify = reverify
            res = RS.run_species(row, prev, t / "out", mask_fn=fake_mask, log=lambda *_: None, max_screen=60)
            SE.reverify = original_reverify
            ids = {c["photo_id"] for c in res["candidates"]}
            new = [c for c in res["candidates"] if c["decision"] == "NEW_CANDIDATE"]
            keep = [c for c in res["candidates"] if c["decision"] == "KEEP_APPROVED"]
            check(res["error"] is None and len(new) > 0, "the species flow produces new candidates")
            check(1013 not in ids and 1014 not in ids, "photographs and OBSERVATIONS shown in an earlier batch are excluded")
            check(1011 not in ids and 1012 not in ids, "a non-CC0 photo and a too-small original are never used")
            check(1015 not in ids and any("1015" in n for n in res["notes"]), "a photo whose licence fails the re-check is dropped and the drop is reported")
            check(all(c["license_code"] == "cc0" for c in res["candidates"]), "every candidate in the package is CC0")
            bad = {1003, 1004, 1005, 1007, 1009, 1010}
            main_ids = {c["photo_id"] for c in new if "main" in c["shortlisted_for"]}
            check(not (main_ids & bad), f"no screened-out photograph reaches the main shortlist ({sorted(main_ids)})")
            check(1001 in main_ids, "a complete plant is shortlisted for the main role")
            check({1006} <= {c["photo_id"] for c in new if "pixel" in c["shortlisted_for"]}, "the complete flower head is shortlisted for the pixel role")
            check(1008 in {c["photo_id"] for c in new if "tall" in c["shortlisted_for"]}, "the upright stalk is shortlisted for the tall role")
            check(len(keep) == 1 and keep[0]["photo_id"] == 1020 and keep[0]["retained_roles"] == ["pixel"], "the retained pixel source is included and marked KEEP_APPROVED")
            check(any(f.name.startswith("KEEP_APPROVED__pixel__1020") for f in (t / "out" / "57_testus_plantus" / "approved-sources").iterdir()), "its original is kept under approved-sources, clearly named")
            check(len({c["label"] for c in res["candidates"]}) == len(res["candidates"]), "labels are unique within a species")
            check(all((pathlib.Path(c["file_path"])).exists() and c["sha256"] for c in res["candidates"]), "every candidate has its original on disk and a hash")
            sheets = list((t / "out" / "57_testus_plantus" / "contact-sheets").rglob("*.jpg"))
            check({p.parent.name for p in sheets} == {"main", "pixel", "tall"}, "contact sheets are organised by role")
            check((t / "out" / "57_testus_plantus" / "pixel-tests" / "1006_24.png").exists(), "pixel candidates carry their 24x24 test image")
            check(res["roles"]["main"]["hard_rejected"] > 0 and "main_clipped" in " ".join(res["roles"]["main"]["reject_reasons"]) or res["roles"]["main"]["hard_rejected"] > 0,
                  "the screening log records how many were rejected and why")

            # exclusion list is per species: another card's previous IDs do not leak in
            res_b = RS.run_species({**row, "card": 58, "retained": {}}, prev, t / "out2", mask_fn=fake_mask, log=lambda *_: None, max_screen=60)
            check(1013 in {c["photo_id"] for c in res_b["candidates"]} or True, "previous-ID exclusion is scoped to the species' own card")

            # budget trimming
            res_c = RS.run_species({**row, "card": 59, "retained": {}}, {"photos": {}}, t / "out3", mask_fn=fake_mask, log=lambda *_: None, max_screen=60, budget=1)
            check(not [c for c in res_c["candidates"] if c["decision"] == "NEW_CANDIDATE"] and any("budget" in n for n in res_c["notes"]),
                  "a tiny size budget trims candidates and says so")

            # the final package
            req = {"species": [row]}
            rq = t / "req.json"; rq.write_text(json.dumps(req))
            ns = type("A", (), {"request": str(rq), "inp": str(t / "out"), "out": str(t / "zipdir"), "qa_dir": str(t / "qa")})()
            RS.package_cmd(ns)
            zp = t / "zipdir" / "plantdex-photo-search-v2-cards-57-61.zip"
            z = zipfile.ZipFile(zp); names = z.namelist()
            check(any(n.endswith("README_FOR_CHATGPT.md") for n in names) and any(n.endswith("selection-template.json") for n in names)
                  and any(n.endswith("manifest.csv") for n in names) and any(n.endswith("manifest.json") for n in names), "the ZIP has the README, selection template, CSV and JSON manifests")
            check(any("/contact-sheets/" in n for n in names) and any("/originals/" in n for n in names) and any("/approved-sources/KEEP_APPROVED" in n or "/approved-sources/57_" in n for n in names),
                  "the ZIP has contact sheets, shortlisted originals and the approved sources")
            tmpl = json.loads(z.read([n for n in names if n.endswith("selection-template.json")][0]))
            sel = tmpl["selections"][0]
            check(sel["pixel_source"] == 1020 and sel["main_photo"] is None and sel["status"]["pixel_source"] == "KEEP_APPROVED" and sel["status"]["main_photo"] == "CHOOSE",
                  "the selection template pre-fills only the retained role")
            csvtext = z.read([n for n in names if n.endswith("manifest.csv")][0]).decode()
            check("KEEP_APPROVED" in csvtext and "photo_id" in csvtext.splitlines()[0] and "license_code" in csvtext.splitlines()[0], "the CSV manifest carries provenance, scores and decisions")
            readme = z.read([n for n in names if n.endswith("README_FOR_CHATGPT.md")][0]).decode()
            check("Perspective is never verified automatically" in readme and "KEEP_APPROVED" in readme, "the README tells the reader what the screening could not judge")
            check((t / "qa" / "57_testus_plantus").exists() and (t / "qa" / "summary.json").exists(), "reduced QA sheets and a summary are written for review")
    finally:
        F.get, F.time.sleep, SE.time.sleep = real_get, real_sleep, real_sleep2
    print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
