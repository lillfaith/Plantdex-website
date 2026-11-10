#!/usr/bin/env python3
"""Three distinct photographs per species, shown at all three stages, for the art director.

WHAT THIS REPLACES. The contact sheet shows one leader per species and answers "which
species need attention". It cannot answer "which of these three", and it is too small to
show the thing that keeps going wrong: a cutout that has lost the plant's stem looks fine at
260px and is obvious at 600px.

THREE DISTINCT ORIGINALS, AND DISTINCT IS CHECKED RATHER THAN HOPED FOR:

  1. ONE PHOTOGRAPH PER OBSERVATION. Elderberry's shortlist offered 424182823 and 424182835
     as two options; they are the same observation, same day, same place. Two frames of one
     plant from one visit is ONE option, and offering it as two quietly halves the choice.
  2. A DIFFERENT PHOTOGRAPHER IS PREFERRED, NOT REQUIRED. One contributor often uploads
     the best several photographs of a species, at different growth stages and of different
     specimens, and a hard rule throws those away to satisfy a tidiness nobody asked for.
     So a same-photographer candidate is taken only after every distinct-photographer one
     has been, and the gallery says which options share a contributor.
  3. PERCEPTUALLY DIFFERENT -- a difference hash over the downscaled source, rejecting any
     candidate within a small Hamming radius of one already taken. This catches the same
     specimen uploaded as two observations, which rule 1 cannot see.

Fewer than three distinct survivors is reported as `needs_more_options`, never padded: a
third option that is the second one again is worse than two options, because it looks like
a choice.

SEGMENTATION QUALITY IS PRINTED BESIDE EACH OPTION, measured from that candidate's own
source and cutout with no model and no cost:
  green_kept  -- of the foliage-coloured pixels in the source, what share survived the cut
  thin_kept   -- survival of thin structures only, which is where stems and petioles live
Neither gates anything. They exist so the art director can see BEFORE choosing that an
option's cutout has lost its stem -- which is what happened to mullein 21260078, both
elderberries and dandelion 152340494, and was invisible at contact-sheet size.

    python3 scripts/review_gallery.py --all
    python3 scripts/review_gallery.py --species verbascum_thapsus --out /tmp/g.png
"""
from __future__ import annotations

import argparse, json, pathlib, sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import decisions                                      # noqa: E402
import orient                                         # noqa: E402

CANDS = ROOT / "evidence" / "candidates"
PHOTOS = ROOT / "evidence" / "photos"

CARD_W, CARD_H = 190, 307          # the rendered card, the thing being chosen
THUMB = 92                          # source and cutout, beside it
COL_W = CARD_W + THUMB + 26
TEXT = 90
PAD = 16
INK, PAPER, DIM = (26, 22, 34), (247, 245, 241), (108, 104, 116)
GREY, CHEQ = (128, 128, 128), (112, 112, 112)


def font(sz: int):
    p = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(p, sz) if pathlib.Path(p).exists() else ImageFont.load_default()


def dhash(path: pathlib.Path, size: int = 8) -> int:
    im = Image.open(path).convert("L").resize((size + 1, size), Image.LANCZOS)
    a = np.array(im, dtype=int)
    bits = (a[:, 1:] > a[:, :-1]).flatten()
    out = 0
    for b in bits:
        out = (out << 1) | int(b)
    return out


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def green_mask(rgb: np.ndarray) -> np.ndarray:
    import cv2
    hsv = cv2.cvtColor(rgb[:, :, ::-1], cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    return (h >= 22) & (h <= 95) & (s >= 40) & (v >= 25)


def seg_quality(src: pathlib.Path, cut: pathlib.Path) -> dict:
    """What the cut kept, measured on the pair. No model, no network, no cost."""
    import cv2
    im = Image.open(src).convert("RGB")
    im.thumbnail((700, 700), Image.LANCZOS)
    s_rgb = np.array(im)
    g = green_mask(s_rgb)
    k = np.ones((7, 7), np.uint8)
    thin = g & ~cv2.erode(g.astype(np.uint8), k).astype(bool)

    c = Image.open(cut).convert("RGBA")
    # The cutout is cropped to the subject; put it back where it came from by matching the
    # source's size, which is the only honest way to compare the two masks pixel for pixel.
    c = c.resize(im.size, Image.LANCZOS)
    alpha = np.array(c.getchannel("A")) > 127
    return {"green_kept": round(float((g & alpha).sum() / max(1, g.sum())), 3),
            "thin_kept": round(float((thin & alpha).sum() / max(1, thin.sum())), 3)}


def provenance(species: str) -> dict:
    mf = PHOTOS / species / "photos.json"
    if not mf.exists():
        return {}
    return {str(e["photo_id"]): e for e in json.loads(mf.read_text()).get("photos", [])}


def distinct_three(species: str, want: int = 3) -> tuple[list[dict], list[str]]:
    """Up to `want` distinct options, best first, plus the reasons anything was dropped."""
    cf = CANDS / species / "candidates.json"
    gf = CANDS / species / "gates.json"
    if not cf.exists():
        return [], ["no candidates"]
    sel = json.loads(cf.read_text()).get("selected", [])
    status = {}
    if gf.exists():
        status = {str(r["photo_id"]): r for r in json.loads(gf.read_text())["candidates"]}
    prov = provenance(species)
    verdicts = decisions.current()
    taken, notes, seen_obs, seen_who, hashes = [], [], set(), set(), []
    for row in sel:
        pid = str(row["photo_id"])
        v = verdicts.get(pid, {})
        if v.get("decision") == "rejected":
            notes.append(f"{pid}: rejected by the owner")
            continue
        st = status.get(pid, {})
        if st.get("status") == "REJECTED" and not v:
            notes.append(f"{pid}: {(st.get('hard_failures') or ['failed a gate'])[0][:70]}")
            continue
        e = prov.get(pid, {})
        obs, who = e.get("observation_id"), e.get("photographer")
        if obs and obs in seen_obs:
            notes.append(f"{pid}: same observation ({obs}) as an option already shown")
            continue
        src = PHOTOS / species / row.get("file", "")
        if not (src.name and src.exists()):
            notes.append(f"{pid}: source original not retained; re-download needed")
            continue
        hv = dhash(src)
        near = [h for h in hashes if hamming(h, hv) <= 6]
        if near:
            notes.append(f"{pid}: perceptually near-identical to an option already shown")
            continue
        cut = CANDS / species / row.get("cutout", "")
        prev = CANDS / species / row.get("preview", "")
        q = seg_quality(src, cut) if cut.exists() else {"green_kept": None, "thin_kept": None}
        o = orient.orientation(cut) if cut.exists() else {}
        shared = bool(who and who not in ("no rights reserved", None) and who in seen_who)
        taken.append({"species": species, "shared_photographer": shared,
                      "photo_id": pid, "src": src, "cutout": cut,
                      "preview": prev, "observation": obs, "when": e.get("observed_on"),
                      "place": (e.get("place") or "")[:30], "licence": e.get("license_code"),
                      "status": st.get("status", "NEEDS_REVIEW"),
                      "verdict": v.get("decision", ""),
                      "orient_rotate": o.get("rotate", 0),
                      "orient_flagged": bool(o.get("flagged_for_review")),
                      "orient_vision": bool(o.get("needs_vision", True)), **q})
        seen_obs.add(obs); hashes.append(hv)
        if who:
            seen_who.add(who)
        if len(taken) >= want + 2:
            break
    # THE SOFT RULE IS APPLIED AS AN ORDERING, NOT A FILTER. Everything that passed the
    # hard rules is still a candidate; a shared contributor only costs an option its place
    # in the queue, so a same-photographer photograph is shown when there is room and
    # dropped when a distinct one would otherwise be displaced.
    taken.sort(key=lambda o: o["shared_photographer"])
    for o in taken[want:]:
        notes.append(f"{o['photo_id']}: held back -- shares a photographer and the three "
                     f"slots are filled")
    taken = taken[:want]
    if any(o["shared_photographer"] for o in taken):
        notes.append("some options share a photographer; distinct ones were preferred first")
    if len(taken) < want:
        notes.append(f"needs_more_options: {len(taken)} distinct option(s), wanted {want}")
    return taken, notes


def on_chequer(im: Image.Image, box: int) -> Image.Image:
    im = im.convert("RGBA")
    im.thumbnail((box, box), Image.LANCZOS)
    bg = Image.new("RGBA", im.size, GREY + (255,))
    d = ImageDraw.Draw(bg)
    for y in range(0, im.height, 14):
        for x in range(0, im.width, 14):
            if (x // 14 + y // 14) % 2:
                d.rectangle((x, y, x + 13, y + 13), fill=CHEQ + (255,))
    return Image.alpha_composite(bg, im).convert("RGB")


def draw(rows: list[tuple[str, list[dict], list[str]]], out: pathlib.Path) -> None:
    row_h = max(CARD_H, THUMB * 2 + 8) + TEXT + 44
    W = PAD + 3 * (COL_W + PAD)
    H = PAD + 44 + len(rows) * (row_h + PAD)
    sheet = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(sheet)
    d.text((PAD, PAD), "PlantDex art direction - three distinct options per species",
           font=font(20), fill=INK)
    d.text((PAD, PAD + 24),
           "choose one, reject one, or ask for more. green_kept / thin_kept measure what "
           "the cut KEPT of the source; low thin_kept means a lost stem.",
           font=font(12), fill=DIM)
    y = PAD + 44
    for species, opts, notes in rows:
        d.text((PAD, y), species.replace("_", " "), font=font(15), fill=INK)
        if notes:
            d.text((PAD + 230, y + 2), notes[-1][:92], font=font(11), fill=(150, 90, 10))
        for i, o in enumerate(opts):
            x = PAD + i * (COL_W + PAD)
            top = y + 20
            card = Image.open(o["preview"]).convert("RGB").resize((CARD_W, CARD_H),
                                                                  Image.LANCZOS)
            sheet.paste(card, (x, top))
            src = Image.open(o["src"]).convert("RGB")
            src.thumbnail((THUMB, THUMB), Image.LANCZOS)
            sheet.paste(src, (x + CARD_W + 10, top))
            if o["cutout"].exists():
                sheet.paste(on_chequer(Image.open(o["cutout"]), THUMB),
                            (x + CARD_W + 10, top + THUMB + 8))
            ty = top + CARD_H + 6
            tag = o["verdict"].upper() or o["status"]
            d.text((x, ty), f"#{o['photo_id']}  {tag}", font=font(12), fill=INK)
            gk, tk = o["green_kept"], o["thin_kept"]
            warn = tk is not None and tk < 0.45
            d.text((x, ty + 15),
                   f"green_kept {gk}   thin_kept {tk}" + ("   LOST STEMS?" if warn else ""),
                   font=font(11), fill=(160, 40, 40) if warn else DIM)
            ori = ("ORIENTATION: flagged for review" if o["orient_flagged"]
                   else f"ORIENTATION: rotate {o['orient_rotate']}" if o["orient_rotate"]
                   else "orientation: for the vision pass")
            d.text((x, ty + 30), ori, font=font(10),
                   fill=(160, 90, 20) if o["orient_flagged"] else DIM)
            d.text((x, ty + 43), f"obs {o['observation']}  {o['when'] or ''}",
                   font=font(10), fill=DIM)
            d.text((x, ty + 56),
                   f"{o['place']}  {o['licence'] or ''}"
                   + ("  shared photographer" if o["shared_photographer"] else ""),
                   font=font(10), fill=DIM)
        y += row_h + PAD
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)


def template(rows, out: pathlib.Path) -> None:
    out.write_text(json.dumps({
        "_how": "Set decision per species. Then: python3 scripts/review_gallery.py --record FILE",
        "_decisions": {
            "select_photo": "choose ONE option by photo_id. This triggers segmentation and "
                            "rendering and approves NO artwork.",
            "approve_card": "sign off the RENDERED CARD for the photo_id given. Separate "
                            "decision, made after looking at the render.",
            "prefer": "a leaning, short of a selection: pin it without triggering a render",
            "reject": "list photo_ids never to offer again; the rest stand",
            "more_options": "re-run retrieval for this species, excluding every rejected id",
            "open": "changes nothing",
        },
        "species": [{"species": sp, "decision": "open", "photo_id": "",
                     "reject": [], "reason": "", "revise": False,
                     "options": [o["photo_id"] for o in opts], "notes": notes}
                    for sp, opts, notes in rows],
    }, indent=2) + "\n")


def record(path: pathlib.Path) -> int:
    doc = json.loads(path.read_text())
    changed = 0
    for row in doc.get("species", []):
        sp, dec = row["species"], row.get("decision")
        for pid in row.get("reject", []):
            ok, msg = decisions.record(pid, sp, "rejected",
                                       row.get("reason") or "rejected in the art-direction gallery",
                                       by="owner, gallery", revise=bool(row.get("revise")))
            print(("  " if ok else "  -- ") + msg); changed += int(ok)
        verdict = {"select_photo": "photo_selected", "approve_card": "card_approved",
                   "prefer": "preferred"}.get(dec)
        if verdict and row.get("photo_id"):
            ok, msg = decisions.record(
                row["photo_id"], sp, verdict,
                row.get("reason", ""), by="owner, gallery", revise=bool(row.get("revise")))
            print(("  " if ok else "  -- ") + msg); changed += int(ok)
            if ok and verdict == "photo_selected":
                print(f"     -> segment and render {sp} #{row['photo_id']}; the CARD is a "
                      f"separate approval")
        elif dec == "more_options":
            print(f"  {sp}: more options requested -- re-run photo-candidates for it; "
                  f"rejected ids are already excluded from the pool")
    print(f"{changed} verdict(s) applied")
    return 0


def main() -> int:
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--species", nargs="*")
    a.add_argument("--all", action="store_true")
    a.add_argument("--out", default="evidence/candidates/art-direction.png")
    a.add_argument("--record", metavar="FILE")
    args = a.parse_args()
    if args.record:
        return record(pathlib.Path(args.record))
    names = args.species or (sorted(d.name for d in CANDS.iterdir()
                                    if (d / "candidates.json").exists()) if args.all else [])
    if not names:
        a.error("give --species NAME or --all")
    rows = []
    for sp in names:
        opts, notes = distinct_three(sp)
        if opts:
            rows.append((sp, opts, notes))
        print(f"{sp}: {len(opts)} distinct option(s)")
        for o in opts:
            print(f"   {o['photo_id']:>11}  green_kept={o['green_kept']} "
                  f"thin_kept={o['thin_kept']}  obs {o['observation']}  {o['verdict']}")
        for n in notes:
            print(f"      - {n}")
    if not rows:
        print("nothing to review")
        return 1
    out = ROOT / args.out
    draw(rows, out)
    template(rows, out.with_suffix(".decisions.json"))
    print(f"\n{out}\n{out.with_suffix('.decisions.json')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
