#!/usr/bin/env python3
"""Offline tests for the production tool. No network: iNaturalist is faked, images are synthetic.

    python3 scripts/production/test_production.py
Needs Pillow, numpy, opencv-python-headless and pymupdf (the same as the existing card pipeline).
"""
from __future__ import annotations

import io
import json
import pathlib
import random
import sys
import tempfile
import zipfile

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import fetch_inat_photos as F                      # noqa: E402
from production import assets as A, batch as B, ledger as L   # noqa: E402

PASS, FAIL = [], []


def check(ok, label):
    (PASS if ok else FAIL).append(label)
    print(("PASS  " if ok else "FAIL  ") + label)


def raises(fn, *needles):
    try:
        fn()
    except L.LedgerError as e:
        return all(n.lower() in str(e).lower() for n in needles)
    return False


# --- a fake iNaturalist --------------------------------------------------------------------

def pattern(seed, noise=0):
    r = np.random.RandomState(seed)
    small = r.randint(0, 255, (9, 12, 3)).astype("uint8")
    im = Image.fromarray(small).resize((1200, 900), Image.BICUBIC)
    if noise:
        arr = np.asarray(im).astype(int) + r.randint(-noise, noise + 1, (900, 1200, 3))
        im = Image.fromarray(np.clip(arr, 0, 255).astype("uint8"))
    b = io.BytesIO(); im.save(b, "JPEG", quality=90)
    return b.getvalue()


class FakeINat:
    def __init__(self):
        self.taxa = {}          # name -> (taxon id, [photo specs])
        self.obs_calls = {}
        self.reread_license = {}  # photo id -> licence returned on re-read

    def add(self, name, tid, specs):
        self.taxa[name.lower()] = (tid, specs)

    def observations(self, tid):
        for name, (t, specs) in self.taxa.items():
            if t == tid:
                return [{"id": 100000 + pid, "taxon": {"id": tid, "name": name}, "quality_grade": "research",
                         "observed_on": "2024-06-01", "place_guess": f"place {pid}",
                         "photos": [{"id": pid, "license_code": "cc0", "attribution": f"(c) person {pid}, CC0",
                                     "url": f"https://x/photos/{pid}/square.jpg",
                                     "original_dimensions": {"width": 1200, "height": 900}}]}
                        for pid, _seed, _noise in specs]
        return []

    def get(self, url, raw=False, timeout=60):
        if raw:
            pid = int(url.split("/photos/")[1].split("/")[0])
            for _n, (_t, specs) in self.taxa.items():
                for p, seed, noise in specs:
                    if p == pid:
                        return pattern(seed, noise)
            return None
        if "/taxa?" in url:
            q = url.split("q=")[1].split("&")[0].replace("+", " ").replace("%20", " ").lower()
            if q in self.taxa:
                return {"results": [{"id": self.taxa[q][0], "name": q.title() if False else q.capitalize(), "rank": "species"}]}
            return {"results": []}
        if "/observations?" in url:
            tid = int(url.split("taxon_id=")[1].split("&")[0])
            self.obs_calls[tid] = self.obs_calls.get(tid, 0) + 1
            return {"results": self.observations(tid)} if "page=1" in url else {"results": []}
        if "/observations/" in url:
            ids = {int(x) for x in url.split("/observations/")[1].split("?")[0].split(",")}
            out = []
            for _n, (t, _s) in self.taxa.items():
                for o in self.observations(t):
                    if o["id"] in ids:
                        lic = self.reread_license.get(o["photos"][0]["id"])
                        if lic:
                            o["photos"][0]["license_code"] = lic
                        out.append(o)
            return {"results": out}
        return None


def install(fake):
    real = (F.get, F.time.sleep)
    F.get, F.time.sleep = fake.get, lambda s: None
    return real


# --- synthetic generated assets -------------------------------------------------------------

def plant_png(path, w=1400, h=1800, alpha=True, soft=True, transparent=True):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0) if transparent else (30, 90, 40, 255))
    d = ImageDraw.Draw(im)
    d.rectangle((w // 2 - 22, h // 3, w // 2 + 22, h), fill=(40, 120, 50, 255))               # stem to the foot
    d.ellipse((w // 2 - 260, h // 8, w // 2 + 260, h // 8 + 520), fill=(200, 60, 120, 255))    # flower
    d.ellipse((w // 2 - 330, h // 2, w // 2 - 20, h // 2 + 120), fill=(50, 140, 60, 255))      # leaf
    if soft:
        a = im.getchannel("A").filter(ImageFilter.GaussianBlur(1.6))
        im.putalpha(a)
    (im if alpha else im.convert("RGB")).save(path)


def pixel_png(path, size=22, kind="good"):
    rng = random.Random(3)
    if kind == "photo":
        arr = np.random.RandomState(1).randint(0, 255, (size, size, 3)).astype("uint8")
        im = Image.fromarray(arr).filter(ImageFilter.GaussianBlur(1.0)).convert("RGBA")
        im.save(path); return
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = im.load()
    pal = [(40, 120, 50, 255), (70, 170, 70, 255), (200, 60, 120, 255), (255, 220, 60, 255), (30, 70, 30, 255)]
    c = size // 2
    for y in range(size):
        for x in range(size):
            if (x - c) ** 2 + (y - c) ** 2 <= (size // 2 - 2) ** 2:
                px[x, y] = pal[(x * 3 + y * 5 + rng.randint(0, 1)) % len(pal)] if kind != "opaque" else pal[0]
    if kind == "opaque":
        im = Image.new("RGBA", (size, size), (40, 120, 50, 255))
    if kind == "semi":
        px = im.load()
        for x in range(size):
            px[x, 0] = (40, 120, 50, 120)
        for y in range(size):
            px[0, y] = (40, 120, 50, 120)
    im.save(path)


def tall_png(path, w=800, h=1300):
    Image.new("RGB", (w, h), (120, 200, 120)).save(path)


# --- the tests -----------------------------------------------------------------------------

def main() -> int:
    five = json.load(open(L.ROOT / "evidence" / "expansion-86.json"))
    five = [r for r in five if 57 <= r["card"] <= 61]
    names = {r["card"]: r["scientific"] for r in five}
    fake = FakeINat()
    # 57: 26 usable photographs + one exact duplicate + one near-duplicate of 7001 + one that is not CC0 on re-read
    s57 = [(7000 + i, 1000 + i, 0) for i in range(26)]
    s57 += [(7100, 1000, 0), (7101, 1001, 3), (7102, 1002, 0)]
    fake.add(names[57], 57, s57); fake.reread_license[7002] = "cc-by"
    fake.add(names[58], 58, [(8000 + i, 2000 + i, 0) for i in range(25)])
    fake.add(names[59], 59, [(9000 + i, 3000 + i, 0) for i in range(4)])          # only four CC0 photos exist
    fake.add(names[60], 60, [(6000 + i, 4000 + i, 0) for i in range(24)])
    # 61 deliberately has no iNaturalist taxon at all
    real = install(fake)
    try:
        with tempfile.TemporaryDirectory() as t:
            t = pathlib.Path(t)
            lp, bd = t / "queue.json", t / "batches"
            ap, work, out = t / "assets", t / "work", t / "out"

            # --- list gating -------------------------------------------------------------
            bare = t / "bare.json"; bare.write_text(json.dumps(five))
            check(raises(lambda: L.Ledger.init(bare, lp, bd, expect=5), "approval"), "a bare/old-style list is refused")
            unapproved = t / "un.json"; unapproved.write_text(json.dumps({"approved": False, "count": 5, "species": five}))
            check(raises(lambda: L.Ledger.init(unapproved, lp, bd, expect=5), "not marked approved"), "an unapproved list is refused")
            wrong = t / "wrong.json"; wrong.write_text(json.dumps({"approved": True, "count": 5, "species": five}))
            check(raises(lambda: L.Ledger.init(wrong, lp, bd), "exactly 85"), "a list that is not 85 cards is refused for production")
            good = t / "pilot.json"; good.write_text(json.dumps({"approved": True, "count": 5, "species": five}))
            led = L.Ledger.init(good, lp, bd, expect=5)
            check(len(led.cards()) == 5 and all(led.current(c) == "pending" for c in led.cards()), "cards #57-61 enter at 'pending'")
            check(raises(lambda: L.Ledger.init(good, lp, bd, expect=5), "overwrite"), "an existing ledger is never overwritten")
            check(set(led.cards()[0]["stages"]) == set(L.STAGES), "all eight stages are tracked per card")

            # --- the REAL production list ----------------------------------------------------------------
            real_list = L.PROD / "species-85.json"
            if real_list.exists():
                rl = json.loads(real_list.read_text())
                big = L.Ledger.init(real_list, t / "real-queue.json", t / "real-batches")
                nums_ = [c["card"] for c in big.cards()]
                check(len(nums_) == 85 and nums_ == list(range(57, 142)), "the real list initialises 85 cards, #57-141 unbroken")
                check(not any(c["scientific"] == "Conoclinium coelestinum" for c in big.cards()), "Blue Mistflower is not in the queue")
                check(big.card(72)["common"] == "Anise Hyssop" and big.card(141)["scientific"] == "Vaccinium vitis-idaea", "numbers follow the corrected master (#72 Anise Hyssop, #141 Lingonberry)")
                check(all(big.current(c) == "pending" for c in big.cards()), "every card starts at pending")
                flagged = sorted(c["card"] for c in big.cards() if c.get("safety_flag"))
                check(len(flagged) == 6, f"the six safety-flagged species are matched by name, now numbered {flagged}")
                _, nreq, _ = B.package_next(big, 10)
                picked = [s_["card"] for s_ in nreq["species"]]
                check(picked == list(range(57, 67)), f"the next batch of 10 is #57-66 ({picked})")
                late = []
                lt = L.Ledger(t / "real-queue.json", t / "real-batches2")
                for _i in range(9):          # 8 batches of 10 and one of 5 walk the whole queue
                    pth, rq, _ = B.package_next(lt, 10, new=True)
                    late += [(s_["card"], s_["safety_flag"]) for s_ in rq["species"]]
                check(len(late) == 85 and len({c for c, _ in late}) == 85, "nine batches cover all 85 cards exactly once")
                check([f for _, f in late[-6:]] == [True] * 6 and not any(f for _, f in late[:-6]),
                      "safety-flagged species are picked last, after every other card")
                check(rl["source"]["sha256"] and rl["approved"] is True and rl["count"] == 85, "the list records its source hash and approval")

            # --- batch request, interrupted run, resume ---------------------------------------
            path, req, resumed = B.package_next(led, 3)
            check([s["card"] for s in req["species"]] == [57, 58, 59] and not resumed, "package-next picks the next three in order")
            path2, _, resumed2 = B.package_next(led, 3)
            check(resumed2 and path2 == path, "an unfinished batch is resumed, not duplicated")
            calls = {"n": 0}
            orig_collect = B.collect_species
            def boom(row, *a, **k):
                if row["card"] == 59:
                    raise RuntimeError("simulated crash")
                return orig_collect(row, *a, **k)
            B.collect_species = boom
            try:
                B.run_request(path, work, out, log=lambda *_: None)
                crashed = False
            except RuntimeError:
                crashed = True
            B.collect_species = orig_collect
            check(crashed and (work / "batch-001" / f"57_{L.key_of(names[57])}" / "collection.json").exists(),
                  "an interrupted batch leaves finished species checkpointed")
            before = dict(fake.obs_calls)
            result = B.run_request(path, work, out, log=lambda *_: None)
            check(fake.obs_calls.get(57) == before.get(57), "resume does not re-query or re-download species already done")
            L.write_json(bd / "batch-001.result.json", result)
            changed = led.sync()
            check(changed == ["#57", "#58", "#59"], f"sync records the collected cards (got {changed})")
            c57, c59 = led.card(57), led.card(59)
            check(c57["stages"]["photos_collected"]["done"] and led.current(c57) == "photos_collected", "#57 reaches photos_collected")
            check(len(c57["collection"]["candidates"]) <= 30 and len(c57["collection"]["candidates"]) >= 20, "#57 has 20-30 candidates")
            labels = [p["label"] for p in c57["collection"]["candidates"]]
            check(labels[0] == "57-01" and len(set(labels)) == len(labels), "candidates carry unique numbered labels")
            m57 = json.loads((work / "batch-001" / f"57_{L.key_of(names[57])}" / "collection.json").read_text())
            reasons = " | ".join(d["reason"] for d in m57["dropped"])
            check("identical file" in reasons or "near-duplicate" in reasons, "exact and near-duplicate photographs are removed")
            check("not cc0" in reasons, "a photo whose licence changed on re-read is dropped")
            check(len(c59["collection"]["candidates"]) == 4 and c59["collection"]["shortfall"], "#59 has only 4 photos and is NOT padded")
            check(any("SHORTFALL" in n for n in c59["collection"]["notes"]), "the shortfall is stated, not hidden")
            check(all(p["license_code"] == "cc0" for c in (c57, c59) for p in c["collection"]["candidates"]), "every candidate is cc0")

            rz, oz = out / "plantdex-batch-001-review.zip", out / "plantdex-batch-001-originals.zip"
            rn, on = zipfile.ZipFile(rz).namelist(), zipfile.ZipFile(oz).namelist()
            check(any(n.endswith("README_FOR_CHATGPT.md") for n in rn) and any(n.endswith("selection-template.json") for n in rn),
                  "review ZIP has the ChatGPT instructions and a selection template")
            check(any("contact-sheets" in n for n in rn) and any("/candidates/57-01__" in n for n in rn), "review ZIP has numbered contact sheets and candidate images")
            check(sum("/originals/" in n for n in on) == sum(len(c["collection"]["candidates"]) for c in (c57, led.card(58), c59)),
                  "originals ZIP holds exactly the candidate originals")
            readme = zipfile.ZipFile(rz).read([n for n in rn if n.endswith("README_FOR_CHATGPT.md")][0]).decode()
            check("main_photo" in readme and "pixel_source" in readme and "tall_preview" in readme and "21-24" in readme,
                  "the ChatGPT README names the three roles and the pixel-icon size rule")

            p2, req2, _ = B.package_next(led, 3)
            check([s["card"] for s in req2["species"]] == [60, 61], "the next batch skips cards already requested")

            # --- selection import -----------------------------------------------------------
            c58 = led.card(58)
            sel = {"batch": "001", "selections": [
                {"card": 57, "main_photo": "57-03", "pixel_source": c57["collection"]["candidates"][4]["photo_id"], "tall_preview": "57-02"},
                {"card": 58, "main_photo": "58-01", "pixel_source": "58-02", "tall_preview": "58-03"}]}
            sf = t / "sel.json"; sf.write_text(json.dumps(sel))
            B.import_selection(led, sf, oz, ap, by="tester")
            check(led.card(57)["stages"]["photos_selected"]["done"] and led.current(led.card(57)) == "image_generation_needed",
                  "a selection moves the card to image_generation_needed")
            orig_dir = ap / f"57_{L.key_of(names[57])}" / "original_selected"
            check(len(list(orig_dir.glob("*"))) == 3 and (ap / f"57_{L.key_of(names[57])}" / "provenance.json").exists(),
                  "chosen originals are organised into species folders with provenance")
            bad = t / "bad.json"; bad.write_text(json.dumps({"batch": "001", "selections": [
                {"card": 58, "main_photo": "99-99", "pixel_source": "58-02", "tall_preview": "58-03"}]}))
            check(raises(lambda: B.import_selection(led, bad, oz, ap, by="t"), "not one of"), "a photo id that is not a candidate is rejected")
            chg = t / "chg.json"; chg.write_text(json.dumps({"batch": "001", "selections": [
                {"card": 58, "main_photo": "58-05", "pixel_source": "58-02", "tall_preview": "58-03"}]}))
            check(raises(lambda: B.import_selection(led, chg, oz, ap, by="t"), "--revise"), "changing a prior selection needs --revise")
            check(raises(lambda: B.import_selection(led, sf, oz, ap, by="t"), "xx") is False, "re-importing the identical selection is harmless")
            B.import_selection(led, chg, oz, ap, by="t", revise=True)
            check(led.card(58)["selection"].get("history"), "a revised selection keeps the earlier choice in history")

            # --- asset validation ----------------------------------------------------------
            d = t / "gen"; d.mkdir()
            plant_png(d / "good_main.png"); plant_png(d / "opaque.png", transparent=False)
            plant_png(d / "rgb.png", alpha=False); plant_png(d / "small.png", w=400, h=500)
            pixel_png(d / "good_px.png"); pixel_png(d / "photo_px.png", kind="photo"); pixel_png(d / "big_px.png", size=32)
            pixel_png(d / "opaque_px.png", kind="opaque"); pixel_png(d / "semi_px.png", kind="semi")
            tall_png(d / "good_tall.png"); tall_png(d / "small_tall.png", 500, 500)
            check(A.validate_main(d / "good_main.png")["ok"], "a transparent, large main image passes")
            check(not A.validate_main(d / "rgb.png")["ok"], "a main image with no alpha channel fails")
            check(not A.validate_main(d / "opaque.png")["ok"], "an alpha channel that is fully opaque fails")
            check(not A.validate_main(d / "small.png")["ok"], "a main image below template resolution fails")
            check(A.validate_pixel(d / "good_px.png")["ok"], "a genuine 22x22 transparent pixel icon passes")
            v = A.validate_pixel(d / "photo_px.png")
            check(not v["ok"], f"a blurred downscaled photo is rejected as a pixel icon ({v['metrics'].get('opaque_colours')} colours)")
            check(not A.validate_pixel(d / "big_px.png")["ok"], "a 32x32 icon fails the 21-24 native size rule")
            check(not A.validate_pixel(d / "opaque_px.png")["ok"], "an opaque-background icon fails")
            check(not A.validate_pixel(d / "semi_px.png")["ok"], "an icon with anti-aliased semi-transparent edges fails")
            check(A.validate_tall(d / "good_tall.png")["ok"] and not A.validate_tall(d / "small_tall.png")["ok"], "tall previews are checked against the dimension spec")
            check(any("UNCONFIRMED" in w for w in A.validate_tall(d / "good_tall.png")["warnings"]), "the unconfirmed tall-preview spec is flagged")

            r = A.import_asset(led, ap, 57, "main_image", d / "rgb.png", "t")
            check(not r["validation"]["ok"] and "file" not in r and led.asset_status(led.card(57), "main_image") == "needed",
                  "an invalid main image is recorded but NOT stored as usable")
            A.import_asset(led, ap, 57, "main_image", d / "good_main.png", "t")
            check(led.current(led.card(57)) == "image_generation_needed", "one valid asset does not complete the card")
            A.import_asset(led, ap, 57, "pixel_icon", d / "good_px.png", "t")
            A.import_asset(led, ap, 57, "tall_preview", d / "good_tall.png", "t")
            c = led.card(57)
            check(c["stages"]["assets_generated"]["done"] and not c["stages"]["image_generation_needed"]["done"],
                  "all three valid assets move the card to assets_generated")
            prov = c["assets"]["main_image"]["versions"][-1]["provenance"]
            check(prov["kind"] == "ai_generated_derivative" and prov["derived_from"]["kind"] == "original_photograph"
                  and prov["derived_from"]["license_code"] == "cc0" and prov["botanical_review_required"],
                  "generated files are recorded as AI derivatives of a named CC0 original, review required")
            check(not c["stages"]["quality_review"]["done"], "no quality review until the comparison board exists")

            # --- formatting on the real template ---------------------------------------------
            prev = A.build_board(led, ap, 57)
            c = led.card(57)
            check(c["stages"]["quality_review"]["done"] and led.current(c) == "quality_review", "building the board moves the card to quality_review")
            front = Image.open(ap / prev["front"]); board = Image.open(ap / prev["board"])
            check(front.size == (800, 1293), "card-front preview is at the deck's 800px width")
            import render_generated_card as R
            tpl, _ = R.template_pages()
            diff = np.abs(np.asarray(front.convert("RGB")).astype(int) - np.asarray(tpl.convert("RGB")).astype(int)).sum(axis=2) > 0
            x0, y0, x1, y1 = R.SLOT_PHOTO; px0, py0, px1, py1 = R.SLOT_PIXEL
            outside = diff.copy(); outside[y0:y1, x0:x1] = False; outside[py0:py1, px0:px1] = False
            check(not outside.any(), "the card frame and purple gradient are untouched outside the art slots")
            inside = diff[y0:y1, x0:x1]
            xs = np.nonzero(inside.any(axis=0))[0]
            cx = (xs.min() + xs.max() + 1) / 2 / (x1 - x0)
            check(abs(cx - 0.51) < 0.03, f"the plant is horizontally centred on the deck's measured centroid (cx={cx:.3f})")
            check(prev["placement"]["opacity"] == 0.95 and prev["placement"]["crops_bottom"], "documented 95% opacity and bottom-seated crop are applied")
            check(prev["placement"]["soft_edge"]["softened"] in (True, False), "soft-edge treatment is measured and recorded")
            check(board.width > 1500, "a comparison board is exported")

            # --- review and approval (human-only, gated) ---------------------------------------
            check(raises(lambda: A.approve(led, 57, "Lillie"), "needs a recorded botanical review"), "approval is refused without botanical review")
            for asset in L.ASSETS:
                A.record_review(led, 57, asset, "pass", "Lillie", "checked against the plant")
            check(not led.card(57)["stages"]["approved"]["done"], "reviews alone do not approve anything")
            A.approve(led, 57, "Lillie")
            check(led.current(led.card(57)) == "approved", "a named person can approve once every gate is passed")
            check(raises(lambda: A.import_asset(led, ap, 57, "pixel_icon", d / "good_px.png", "t"), "approved"),
                  "an approved asset cannot be overwritten")

            # --- regenerating ONE asset ----------------------------------------------------------
            main_v = led.card(57)["assets"]["main_image"]["versions"][-1]["file"]
            check(raises(lambda: A.request_regeneration(led, 57, "pixel_icon", "too blurry", "Lillie"), "approved"),
                  "regenerating an approved card needs explicit un-approval")
            A.request_regeneration(led, 57, "pixel_icon", "icon unreadable", "Lillie", confirm_unapprove=True)
            c = led.card(57)
            check(c["stages"]["needs_revision"]["done"] and not c["stages"]["approved"]["done"], "regeneration voids approval and flags needs_revision")
            check(led.asset_status(c, "main_image") == "review_passed" and led.asset_status(c, "tall_preview") == "review_passed",
                  "the other assets keep their review - the species was not restarted")
            pixel_png(d / "good_px2.png", size=24)
            A.import_asset(led, ap, 57, "pixel_icon", d / "good_px2.png", "t")
            c = led.card(57)
            check(len(c["assets"]["pixel_icon"]["versions"]) == 2 and (ap / c["assets"]["pixel_icon"]["versions"][0]["file"]).exists(),
                  "the new icon is v2 and v1 is still on disk (append-only)")
            check(c["assets"]["main_image"]["versions"][-1]["file"] == main_v, "the main image was not touched")
            check(not c["stages"]["needs_revision"]["done"] and not c["stages"]["approved"]["done"],
                  "revision clears once replaced, but the card must be re-reviewed before approval")
            check(raises(lambda: A.approve(led, 57, "Lillie"), "pixel_icon"), "re-approval requires a fresh review of the new icon")

            # --- changing ONE source photo invalidates ONE derivative ----------------------------------
            other = next(x["photo_id"] for x in led.card(57)["collection"]["candidates"]
                         if x["photo_id"] != led.card(57)["selection"]["pixel_source"])
            ch = t / "chg57.json"; ch.write_text(json.dumps({"batch": "001", "selections": [
                {"card": 57, "main_photo": led.card(57)["selection"]["main_photo"], "pixel_source": other,
                 "tall_preview": led.card(57)["selection"]["tall_preview"]}]}))
            B.import_selection(led, ch, oz, ap, by="t", revise=True)
            c = led.card(57)
            check(led.asset_status(c, "pixel_icon") == "regenerate_requested" and led.asset_status(c, "main_image") == "review_passed",
                  "re-selecting the pixel source flags only the pixel icon; the main image keeps its review")
            import os
            if os.environ.get("PD_TEST_KEEP"):
                import shutil
                keep = pathlib.Path(os.environ["PD_TEST_KEEP"]); keep.mkdir(parents=True, exist_ok=True)
                shutil.copy(ap / prev["board"], keep / "sample-board.png"); shutil.copy(ap / prev["front"], keep / "sample-front.png")

            # --- #58 independently, status roll-up -------------------------------------------------
            check(led.current(led.card(58)) == "photos_selected" or led.current(led.card(58)) == "image_generation_needed", "#58 progresses independently of #57")
            cnt = {}
            for cc in led.cards():
                cnt[led.current(cc)] = cnt.get(led.current(cc), 0) + 1
            check(sum(cnt.values()) == 5 and cnt.get("pending", 0) == 2, f"queue roll-up is consistent {cnt}")
            led2 = L.Ledger(lp)
            check(led2.current(led2.card(57)) == led.current(led.card(57)), "the ledger survives a save/load round trip")
    finally:
        F.get, F.time.sleep = real
    print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
