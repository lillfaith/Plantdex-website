#!/usr/bin/env python3
"""Reproducible inventory of the 85 expansion cards (#57-141). READ-ONLY on the repo.

Usage:
  git fetch origin claude/plantdex-v0-3-supabase-verify-iic8pz
  mkdir -p $OUT/tree && git archive origin/claude/plantdex-v0-3-supabase-verify-iic8pz \
      expansion src/data/expansion-cards.json | tar -x -C $OUT/tree
  python3 -I scripts/expansion-audit/build_inventory.py --tree $OUT/tree \
      --branch origin/claude/plantdex-v0-3-supabase-verify-iic8pz --out docs/expansion/audit

The extracted tree is untrusted data: it is only read, never executed. Nothing here writes outside --out.

Statuses (exactly): PRESENT, APPROVED, MISSING, NEEDS REVIEW, BLOCKED, NOT YET LOCATED.
APPROVED only where a file or commit message records owner approval; the quote goes in the approval columns.
"""
import argparse, csv, glob, hashlib, json, os, re, subprocess, sys
from collections import Counter, defaultdict

ST = ("PRESENT", "APPROVED", "MISSING", "NEEDS REVIEW", "BLOCKED", "NOT YET LOCATED")
REPO = os.getcwd()


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def git(*a):
    return subprocess.run(["git", *a], cwd=REPO, capture_output=True, text=True).stdout


def png_size(p):
    try:
        from PIL import Image
        with Image.open(p) as im:
            return im.size
    except Exception:
        return None


def jl(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tree", required=True)
    ap.add_argument("--branch", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    T, B = a.tree, a.branch
    os.makedirs(a.out, exist_ok=True)

    data = jl(f"{T}/src/data/expansion-cards.json")
    cards = data["cards"]
    overrides = jl(f"{T}/expansion/text-overrides.json")
    spec = jl(f"{T}/expansion/asset-spec.json")
    branch_head = git("rev-parse", B).strip()

    # ---------- source hash verification ----------
    src_rows = []
    for ent in data["source"]["files"]:
        p = f"{T}/{ent['file']}"
        if not os.path.exists(p):
            src_rows.append((ent["file"], ent["sha256"], None, "MISSING"))
        else:
            actual = sha(p)
            src_rows.append((ent["file"], ent["sha256"], actual, "PRESENT" if actual == ent["sha256"] else "NEEDS REVIEW"))

    # ---------- collisions with integration ----------
    herbs = jl(f"{REPO}/src/data/herbs.json")["herbs"]
    sprites = jl(f"{REPO}/src/data/sprites.json")
    fc_src = open(f"{REPO}/src/lib/field-cards.ts", encoding="utf-8").read()
    fc_ids = re.findall(r"^\s*id: '([a-z0-9-]+)',\s*\n\s*cardNumber: (\d+),", fc_src, re.M)
    fc_sci = re.findall(r"scientificName: '([^']+)'", fc_src)
    taken_ids = {h["id"]: ("herbs.json", h["cardNumber"]) for h in herbs}
    taken_ids.update({i: ("field-cards.ts", int(n)) for i, n in fc_ids})
    taken_nums = defaultdict(list)
    for h in herbs:
        taken_nums[h["cardNumber"]].append(("herbs.json", h["id"]))
    for i, n in fc_ids:
        taken_nums[int(n)].append(("field-cards.ts", i))
    taken_sci = {h["scientificName"].lower(): h["id"] for h in herbs}
    for (i, _), s in zip(fc_ids, fc_sci):
        taken_sci[s.lower()] = i
    spp_genera = {h["scientificName"].split()[0].lower(): h["id"] for h in herbs if "spp" in h["scientificName"].lower()}
    all_genera = defaultdict(list)
    for s, i in taken_sci.items():
        all_genera[s.split()[0]].append(i)
    sprite_ids = set(sprites) if isinstance(sprites, dict) else set()

    # ---------- git provenance ----------
    def commits_for(path):
        out = git("log", "--format=%h|%cI|%an|%s", B, "--", path).strip().splitlines()
        return [l.split("|", 3) for l in out]

    # ---------- listing of branch tree (what exists in git, vs the extracted copy) ----------
    # other branches: file listings only (names, never contents); counts of files whose path names the species
    OTHER = ["claude/botanical-catalog-stage-1", "prep-expansion", "exp", "claude/production-system-v1", "backup/pre-multi-agent-20261119"]
    other_files = {}
    for ob in OTHER:
        fl = git("ls-tree", "-r", "--name-only", "origin/" + ob).splitlines()
        other_files[ob] = [x.lower() for x in fl if not x.startswith(("src/", "public/", "supabase/", ".github/"))]

    rarity_xp = {"Common": 100, "Uncommon": 175, "Rare": 300, "Epic": 500}
    seasons = {"spring", "summer", "autumn", "winter", "evergreen", "all"}

    rows, per_card_notes = [], {}
    nums = [c["cardNumber"] for c in cards]
    dup_nums = [n for n, k in Counter(nums).items() if k > 1]
    dup_ids = [n for n, k in Counter(c["id"] for c in cards).items() if k > 1]
    gaps = sorted(set(range(57, 142)) - set(nums))

    zip_missing = defaultdict(list)  # package -> cards
    zip_info = {}

    for c in sorted(cards, key=lambda x: x["cardNumber"]):
        n, cid = c["cardNumber"], c["id"]
        sci = c["scientificName"]
        cd = f"{T}/expansion/cards/{n:03d}_{cid}"
        cdb = f"expansion/cards/{n:03d}_{cid}"
        af = f"{cd}/approved_final"
        asd = f"{T}/expansion/assets/{cid}"
        notes, missing = [], []

        # identity level
        words = sci.split()
        if len(words) == 1 or "spp" in sci.lower() or "sp." in sci.lower():
            ident = "genus"
        elif len(words) >= 2:
            ident = "species"
        else:
            ident = "unknown"
        extra = [w for w in words[2:] if w in ("subsp.", "var.", "x", "×", "f.")] if len(words) > 2 else []
        if extra or "×" in sci or " x " in sci:
            notes.append(f"name carries a rank/hybrid marker ({sci}); level recorded as species-or-below")

        # provenance json
        prov = jl(f"{af}/provenance.json") if os.path.exists(f"{af}/provenance.json") else None
        approved_files = sorted(os.listdir(af)) if os.path.isdir(af) else []

        # ---- hash verification of approved_final
        hash_ok, hash_bad, hash_nofile = 0, [], []
        if prov:
            for fn, v in prov["files"].items():
                want = v["sha256"] if isinstance(v, dict) else v
                p = f"{af}/{fn}"
                if not os.path.exists(p):
                    hash_nofile.append(fn)
                elif sha(p) == want:
                    hash_ok += 1
                else:
                    hash_bad.append(fn)
            z = prov.get("source_zip") or "NOT RECORDED"
            zh = prov.get("source_zip_sha256")
            zip_info[z] = zh
            zip_missing[z].append(n)

        # ---- commits
        cc = commits_for(cdb)
        ac = commits_for(f"expansion/assets/{cid}")
        bc = commits_for(f"expansion/card-bases/{n:03d}_{cid}_front.png")
        sc = commits_for(f"expansion/sprites/src/{cid.replace('-', '_')}.py")
        allc = cc + ac
        appr = [x for x in allc if re.search(r"approv", x[3], re.I) and not re.search(r"sprite", x[3], re.I)]
        bc_sprite = commits_for(f"{cdb}/sprite-brief.json")
        spr_appr = [x for x in bc_sprite if re.search(r"owner approval", x[3], re.I)]
        appr_quote = "; ".join(f"{x[0]} {x[1][:10]}: \"{x[3]}\"" for x in appr[-2:])

        slug_u, slug_h = cid.replace("-", "_"), cid
        photo_ev = []
        for ob, fl in other_files.items():
            k = sum(1 for x in fl if slug_u in x or slug_h in x)
            if k:
                photo_ev.append(f"{ob}:{k}")

        # ---- main image
        main_p = None
        main_kind = ""
        if os.path.exists(f"{asd}/main.png"):
            main_p, main_kind = f"expansion/assets/{cid}/main.png", "assets/main.png"
        else:
            for fn in approved_files:
                if fn.startswith("main_") or fn.startswith("tall_") is False and fn.startswith("main"):
                    main_p, main_kind = f"{cdb}/approved_final/{fn}", fn
                    break
        assets_has_main = os.path.exists(f"{asd}/main.png")
        # approval for main
        asset_meta = jl(f"{asd}/assets.json") if os.path.exists(f"{asd}/assets.json") else None
        main_appr = ""
        if asset_meta:
            by = asset_meta["main"].get("imported_by", "")
            if "owner-approved" in by:
                main_appr = f"assets.json main.imported_by = \"{by}\""
        if main_p:
            main_status = "APPROVED" if main_appr or (appr and "approved_final" in main_p) else "PRESENT"
            if main_kind and ("ai_" in main_kind or "generated" in main_kind or "reconstruction" in main_kind):
                notes.append(f"main image is an AI derivative ({main_kind}); botanical review required")
        else:
            main_status = "MISSING"
            missing.append("main botanical image")

        # ---- tall
        tall_p, tall_status = None, "MISSING"
        if os.path.exists(f"{asd}/tall.png"):
            tall_p = f"expansion/assets/{cid}/tall.png"
            tall_status = "APPROVED" if main_appr else "PRESENT"
        elif "tall_cutout_used.png" in approved_files:
            tall_p = f"{cdb}/approved_final/tall_cutout_used.png"
            tall_status = "PRESENT"
        else:
            missing.append("tall/preview image as a standalone file (preview is baked into back.png only)")

        # ---- pixel
        pix_p, pix_status, pix_dim = None, "MISSING", ""
        for cand in (f"{asd}/pixel.png", f"{af}/pixel_icon_native_24x24.png"):
            if os.path.exists(cand):
                pix_p = cand.replace(T + "/", "")
                sz = png_size(cand)
                pix_dim = f"{sz[0]}x{sz[1]}" if sz else "unreadable"
                if sz and spec["pixel"]["min_px"] <= sz[0] <= spec["pixel"]["max_px"] and sz[0] == sz[1]:
                    pix_status = "APPROVED" if (main_appr and "assets/" in pix_p) else "PRESENT"
                else:
                    pix_status = "NEEDS REVIEW"
                    notes.append(f"pixel icon size {pix_dim} outside 21-24 square")
                break
        if pix_p is None:
            missing.append("native 21-24px pixel icon")

        # ---- assembled card
        def fstat(p):
            return "PRESENT" if os.path.exists(p) else "MISSING"
        front, back = fstat(f"{cd}/front.png"), fstat(f"{cd}/back.png")
        pdf = fstat(f"{cd}/{cid}_{n}.pdf")
        for k, s in (("front.png", front), ("back.png", back), ("pdf", pdf)):
            if s == "MISSING":
                missing.append("assembled card " + k)
        fin = fstat(f"{af}/front_final.png") == "PRESENT" and fstat(f"{af}/back_final.png") == "PRESENT"
        fsz = png_size(f"{cd}/front.png")
        card_status = "MISSING" if "MISSING" in (front, back, pdf) else ("APPROVED" if (appr and fin) else "PRESENT")
        base = {k: fstat(f"{T}/expansion/card-bases/{n:03d}_{cid}_{k}") for k in ("front.png", "back.png", "card.pdf")}
        base_status = "PRESENT" if all(v == "PRESENT" for v in base.values()) else "MISSING"
        if base_status == "MISSING":
            notes.append("no art-less card-base files (card-bases/ covers only some cards)")

        # ---- sprites
        spr_src = os.path.exists(f"{T}/expansion/sprites/src/{cid.replace('-', '_')}.py")
        spr_stages = [os.path.exists(f"{T}/expansion/sprites/_build/{cid}{s}.png") for s in ("-sprout", "-growing", "")]
        spr_sheet = os.path.exists(f"{T}/expansion/sprites/_build/{cid}-sheet.png")
        brief_p = f"{cd}/sprite-brief.json"
        brief = jl(brief_p) if os.path.exists(brief_p) else None
        prof = jl(f"{cd}/profile-draft.json") if os.path.exists(f"{cd}/profile-draft.json") else None
        spr_quote = ""
        if spr_src and all(spr_stages) and spr_sheet:
            file_says = bool(brief and "APPROVED by the owner" in brief.get("status", ""))
            if spr_appr:
                spr_status = "APPROVED"
                spr_quote = f"commit {spr_appr[0][0]} {spr_appr[0][1][:10]}: \"{spr_appr[0][3]}\""
                if not file_says:
                    notes.append(f"sprite approval recorded only in commit message; sprite-brief.json status now reads \"{brief.get('status') if brief else 'n/a'}\" (approval text was overwritten by a later commit)")
            else:
                spr_status = "PRESENT"
        else:
            spr_status = "MISSING"
            missing.append("Garden sprite + 3 growth stages")
        brief_status = ("PRESENT" if brief else "MISSING")
        if not brief:
            missing.append("sprite-brief.json")
        prof_status = "PRESENT" if prof else "MISSING"

        # ---- back fields: current (profile-draft = record + owner overrides) vs record
        rb = c["back"]
        pb = prof["herb"]["back"] if prof else None
        back_cur = pb or rb
        diffs = [k for k in rb if pb and rb[k] != pb.get(k)]
        ov = overrides.get(str(n), [])
        ovf = sorted({o["field"] for o in ov})
        if diffs:
            notes.append("profile-draft back differs from expansion-cards.json in: " + ", ".join(diffs) + " (owner text-overrides: " + (", ".join(ovf) or "none recorded") + ")")
            unexpl = [d for d in diffs if "back." + d not in ovf]
            if unexpl:
                notes.append("UNEXPLAINED back diff (no text-overrides entry): " + ", ".join(unexpl))
        back_status = "PRESENT" if all(back_cur.get(k) for k in ("healingTraits", "compounds", "taste", "aromatic", "preparations", "usableParts")) else "MISSING"

        # ---- identification / lookalikes / habitat
        blob = json.dumps(c).lower() + (json.dumps(prof).lower() if prof else "")
        ident_feat = "MISSING"
        lookalikes = "MISSING"
        habitat = "MISSING"
        missing += ["identification features", "lookalikes", "habitat (descriptive)"]
        # honest check: none of these keys exist anywhere in the record
        if re.search(r'"(identification|lookalike|lookalikes|look_alikes|lookAlikes|habitat)"\s*:', blob):
            notes.append("a habitat/identification/lookalike key exists: re-check manually")

        # ---- safety
        rev = c["review"]
        caution = rev.get("cardSafetyWarning", "")
        caution_status = rev.get("cardSafetyWarningStatus", "")
        cl = caution.strip().lower()
        generic = cl.startswith("identify positively") or cl == "daisy-family allergy possible."
        guide = rev["editorial"].get("guideCaution", "")
        safety_s = "NEEDS REVIEW" if "pending" in caution_status.lower() else ("PRESENT" if caution else "MISSING")
        if not caution:
            missing.append("safety caution")
        if generic:
            notes.append("caution is a generic line ('identify positively...' or family-level 'Daisy-family allergy possible.'), not a species-specific caution")

        # ---- refs
        refs = rev.get("references", {})
        ext = refs.get("existingExternalUrls") or []
        rl = c.get("researchLinks") or {}
        links = rl.get("links", []) if rl else []
        cites = [l for l in links if l.get("isCitation")]
        searches = [l for l in links if not l.get("isCitation")]
        if not rl:
            missing.append("researchLinks")
        ref_status = "NEEDS REVIEW" if (cites or ext) else "MISSING"
        if ref_status == "NEEDS REVIEW":
            pass
        else:
            missing.append("any citation (only search links or nothing)")
        ver = (rl or {}).get("verificationStatus", "")

        # ---- challenge fields
        f = c["front"]
        chk = []
        if rarity_xp.get(f["rarity"]) != f["xp"]:
            chk.append("xp/rarity mismatch vs deck table")
        if f["season"] not in seasons:
            chk.append(f"season '{f['season']}' not in app vocabulary")
        st = f["stats"]
        if not all(isinstance(st.get(k), int) and 1 <= st[k] <= 5 for k in ("water", "sun", "temperature")):
            chk.append("stats outside 1-5")
        if not f["uses"]:
            chk.append("no use icons")
        allowed = {i.lower() for i in data["master"]["allowedIcons"]}
        if any(u not in allowed for u in f["uses"]):
            chk.append("use icon outside allowed set")
        chal_status = "NEEDS REVIEW" if chk else "PRESENT"

        # ---- collisions
        coll = []
        if cid in taken_ids:
            coll.append(f"id collides with {taken_ids[cid][0]} (#{taken_ids[cid][1]})")
        for src, i in taken_nums.get(n, []):
            coll.append(f"number {n} collides with {src}:{i}")
        if sci.lower() in taken_sci:
            coll.append(f"scientific name already carried by '{taken_sci[sci.lower()]}'")
        g = sci.split()[0]
        if g in spp_genera:
            coll.append(f"shares genus with spp. card '{spp_genera[g]}'")
        elif g in all_genera:
            notes.append(f"same genus as existing card(s): {', '.join(all_genera[g])} (different species)")
        if cid in sprite_ids:
            coll.append("id already in sprites.json")

        # ---- provenance text
        prov_txt = ""
        if prov:
            prov_txt = f"zip={prov.get('source_zip')}; zip_sha256={prov.get('source_zip_sha256')}"
        if hash_bad:
            notes.append("HASH MISMATCH vs provenance.json: " + ", ".join(hash_bad))
        if hash_nofile:
            notes.append("provenance lists files absent from tree: " + ", ".join(hash_nofile))
        if prov and not prov.get("source_zip"):
            notes.append("source zip name not recorded")
        if prov and str(prov.get("source_zip_sha256", "")).startswith(("unknown", "unavailable")):
            notes.append("source zip hash not recorded (zip not on disk when provenance written)")

        qc = "NEEDS REVIEW" if (safety_s == "NEEDS REVIEW" or "pending" in str(rev["editorial"].get("publicationStatus", "")).lower()) else "PRESENT"
        impl = "BLOCKED"
        blockers = []
        if safety_s == "NEEDS REVIEW":
            blockers.append("safety/botanical review pending")
        if spr_status == "MISSING":
            blockers.append("no sprite")
        if main_status == "MISSING" or pix_status == "MISSING":
            blockers.append("artwork incomplete")
        blockers.append("no collectionId; not in CATALOGUE (by design: draft)")

        rows.append({
            "card_number": n, "id": cid, "common_name": c["commonName"], "scientific_name": sci,
            "identity_level": ident,
            "main_image_status": main_status, "main_image_path": main_p or "", "main_image_kind": main_kind,
            "tall_preview_status": tall_status, "tall_preview_path": tall_p or "",
            "pixel_icon_status": pix_status, "pixel_icon_path": pix_p or "", "pixel_icon_dim": pix_dim,
            "card_front_status": front, "card_back_status": back, "card_pdf_status": pdf,
            "card_front_size": f"{fsz[0]}x{fsz[1]}" if fsz else "",
            "approved_final_files": ";".join(approved_files),
            "card_assembled_status": card_status,
            "card_base_status": base_status,
            "sprite_files_status": spr_status, "sprite_three_stages": "yes" if all(spr_stages) else "no",
            "sprite_brief_status": brief_status, "profile_draft_status": prof_status,
            "back_fields_status": back_status,
            "healing_traits": " | ".join(back_cur.get("healingTraits", [])),
            "compounds": " | ".join(back_cur.get("compounds", [])),
            "taste": " | ".join(back_cur.get("taste", [])),
            "aromatic": " | ".join(back_cur.get("aromatic", [])),
            "preparations": " | ".join(back_cur.get("preparations", [])),
            "usable_parts": " | ".join(back_cur.get("usableParts", [])),
            "back_differs_from_record_in": ",".join(diffs),
            "identification_features": ident_feat, "lookalikes": lookalikes,
            "safety_caution": caution, "safety_caution_review_status": safety_s,
            "safety_caution_source_text": caution_status,
            "caution_is_generic": "yes" if generic else "no",
            "guide_caution": guide,
            "prep_safety_review": rev["editorial"].get("preparationSafetyReview", ""),
            "references_status": ref_status,
            "real_citations_n": len(cites), "search_links_n": len(searches),
            "carried_over_urls_n": len(ext),
            "research_links_verification": ver,
            "citation_urls": " ".join(l["url"] for l in cites),
            "habitat_status": habitat,
            "regions_PROVISIONAL": ",".join(rev.get("regions", [])),
            "regional_confidence": rev.get("regionalConfidence", ""),
            "rarity": f["rarity"], "xp": f["xp"], "season": f["season"], "uses": ",".join(f["uses"]),
            "stat_water": st.get("water"), "stat_sun": st.get("sun"), "stat_temperature": st.get("temperature"),
            "challenge_fields_status": chal_status, "challenge_field_issues": "; ".join(chk),
            "id_collisions_on_integration": "; ".join(coll),
            "missing_fields": "; ".join(dict.fromkeys(missing)),
            "qc_status": qc,
            "paths_naming_species_on_other_branches": "; ".join(photo_ev) or "none found",
            "provenance_source_package": prov_txt,
            "provenance_hashes_verified": f"{hash_ok} ok / {len(hash_bad)} mismatch / {len(hash_nofile)} absent" if prov else "no provenance.json",
            "provenance_first_commit": (cc[-1][0] + " " + cc[-1][1][:10] + " " + cc[-1][2]) if cc else "",
            "provenance_last_commit": (cc[0][0] + " " + cc[0][1][:10] + " " + cc[0][2] + ': "' + cc[0][3] + '"') if cc else "",
            "owner_approval_quote": appr_quote or (main_appr or ""),
            "sprite_approval_quote": spr_quote,
            "owner_text_edits": ",".join(ovf),
            "implementation_status": impl, "implementation_blockers": "; ".join(blockers),
            "notes": " || ".join(notes),
        })

    # ---------- write CSV ----------
    cols = list(rows[0].keys())
    with open(f"{a.out}/inventory.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)

    # ---------- summary json for the md ----------
    cnt = lambda k: Counter(r[k] for r in rows)
    summ = {
        "branch": B, "branch_head": branch_head, "count": len(rows), "dup_numbers": dup_nums, "dup_ids": dup_ids, "gaps": gaps,
        "source_hashes": src_rows,
        "statuses": {k: dict(cnt(k)) for k in (
            "main_image_status", "tall_preview_status", "pixel_icon_status", "card_front_status", "card_back_status",
            "card_pdf_status", "card_assembled_status", "card_base_status", "sprite_files_status", "sprite_brief_status",
            "profile_draft_status", "back_fields_status", "safety_caution_review_status", "references_status",
            "challenge_fields_status", "qc_status", "implementation_status")},
        "zips": {z: {"sha256": zip_info[z], "cards": sorted(v)} for z, v in zip_missing.items()},
        "collisions": [(r["card_number"], r["id"], r["id_collisions_on_integration"]) for r in rows if r["id_collisions_on_integration"]],
        "generic_caution": [r["card_number"] for r in rows if r["caution_is_generic"] == "yes"],
        "no_citation": [r["card_number"] for r in rows if r["references_status"] == "MISSING"],
        "citation_totals": [sum(r["real_citations_n"] for r in rows), sum(r["search_links_n"] for r in rows)],
        "missing_main": [r["card_number"] for r in rows if r["main_image_status"] == "MISSING"],
        "missing_pixel": [r["card_number"] for r in rows if r["pixel_icon_status"] == "MISSING"],
        "nonstandard_pixel": [(r["card_number"], r["pixel_icon_dim"]) for r in rows if r["pixel_icon_status"] == "NEEDS REVIEW"],
        "no_card_base": [r["card_number"] for r in rows if r["card_base_status"] == "MISSING"],
        "approved_cards": [r["card_number"] for r in rows if r["card_assembled_status"] == "APPROVED"],
        "hash_issues": [(r["card_number"], r["notes"]) for r in rows if "HASH MISMATCH" in r["notes"] or "absent from tree" in r["notes"]],
        "unexplained_back": [r["card_number"] for r in rows if "UNEXPLAINED" in r["notes"]],
        "challenge_issues": [(r["card_number"], r["challenge_field_issues"]) for r in rows if r["challenge_field_issues"]],
        "genus_level": [r["card_number"] for r in rows if r["identity_level"] != "species"],
        "rarity": dict(cnt("rarity")), "season": dict(cnt("season")),
        "field_cards": fc_ids, "herb_numbers": sorted({h["cardNumber"] for h in herbs}),
        "non_herb_cards": jl(f"{REPO}/src/data/herbs.json")["nonHerbCards"],
    }
    json.dump(summ, open(f"{a.out}/summary.json", "w"), indent=1, default=str)
    print(json.dumps({k: summ[k] for k in ("count", "dup_numbers", "dup_ids", "gaps", "statuses", "collisions", "hash_issues", "nonstandard_pixel", "missing_main", "missing_pixel", "no_card_base", "approved_cards", "citation_totals", "unexplained_back", "challenge_issues", "genus_level")}, indent=1, default=str))
    print(src_rows)
    print({z: v for z, v in summ["zips"].items()})


if __name__ == "__main__":
    main()
