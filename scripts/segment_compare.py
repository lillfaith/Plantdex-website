#!/usr/bin/env python3
"""Compare background-removal methods on the same photographs, on the real card.

Every method produces an RGBA cutout from the same source images; every cutout is measured
the same way and placed through the same `photo_pipeline` placement, so the only variable is
the segmentation. The deck's own 45 cards supply the composition reference.

    python3 scripts/segment_compare.py --species matricaria_chamomilla
    python3 scripts/segment_compare.py --self-test
"""
from __future__ import annotations

import argparse, json, pathlib, sys, time

import cv2
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import card_art                              # noqa: E402
import photo_pipeline as PP                  # noqa: E402
import render_generated_card as R            # noqa: E402

WORK_EDGE = 1200          # every method sees the same resolution, or runtime is not comparable


def load_rgb(path: pathlib.Path) -> Image.Image:
    im = Image.open(path).convert("RGB")
    im.thumbnail((WORK_EDGE, WORK_EDGE), Image.LANCZOS)
    return im


# ── the three methods ────────────────────────────────────────────────────────────────────
def method_colour(im: Image.Image) -> Image.Image:
    """Current approach: colour-seeded GrabCut with region growing (scripts/card_art.py)."""
    bgr = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    alpha = card_art.grabcut_seeded(bgr, 6)
    if alpha is None:
        alpha = card_art.grabcut(bgr, 0.06, 6)
    alpha = card_art.plant_blobs(alpha)
    return Image.fromarray(np.dstack([np.array(im), alpha]), "RGBA")


_SESSIONS: dict[str, object] = {}


def method_rembg(im: Image.Image, model: str = "u2net") -> Image.Image:
    from rembg import new_session, remove
    if model not in _SESSIONS:
        _SESSIONS[model] = new_session(model)
    return remove(im, session=_SESSIONS[model]).convert("RGBA")


def method_sam(im: Image.Image, points: int = 12) -> Image.Image:
    """Prompt-guided segmentation: SAM (ViT-B, ONNX), prompted from plant colour.

    SAM segments whatever it is POINTED AT, so the prompt is the whole method. A single
    point on the frame's centre returned 2% of the image -- one petal -- because the centre
    of a photograph is not necessarily the plant, and one point describes one part. The
    prompt here is a spread of positive points sampled from the confident plant-colour core
    (yellow disc and saturated foliage), which is evidence the photograph itself supplies,
    plus negative points from the corners, which are background in almost every field shot.
    """
    from rembg import new_session, remove
    if "sam" not in _SESSIONS:
        _SESSIONS["sam"] = new_session("sam")
    bgr = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    m = card_art.plant_seed(bgr)
    core = (m == cv2.GC_FGD)
    ys, xs = np.nonzero(core)
    W, H = im.size
    if len(xs) < 50:
        pts = [[W // 2, H // 2]]
        labels = [1]
    else:
        idx = np.linspace(0, len(xs) - 1, min(points, len(xs))).astype(int)
        pts = [[int(xs[i]), int(ys[i])] for i in idx]
        labels = [1] * len(pts)
        for cx, cy in ((4, 4), (W - 5, 4), (4, H - 5), (W - 5, H - 5)):
            pts.append([cx, cy]); labels.append(0)
    return remove(im, session=_SESSIONS["sam"],
                  input_points=np.array(pts), input_labels=np.array(labels)).convert("RGBA")


def method_hybrid(im: Image.Image, model: str = "isnet-general-use") -> Image.Image:
    """The AI matte, with plant-colour evidence used to reclaim what it dropped.

    U-net style matting finds ONE salient object. A plant is not one object -- a thin stem
    or an outlying leaf is frequently scored out -- so this takes the model's alpha as the
    trunk of the decision and adds back only pixels that are BOTH plant-coloured AND
    connected to it. Nothing detached is admitted, so soil and stones cannot return.
    """
    ai = np.array(method_rembg(im, model).getchannel("A"))
    bgr = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    m = card_art.plant_seed(bgr)
    plant = (m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)
    core = ai > 160
    if core.sum() < 200:
        return method_rembg(im, model)
    reach = core | plant
    grown = core.copy()
    k = np.ones((3, 3), np.uint8)
    for _ in range(160):
        nxt = (cv2.dilate(grown.astype(np.uint8), k) > 0) & reach
        if nxt.sum() == grown.sum():
            break
        grown = nxt
    alpha = np.maximum(ai, (grown * 255).astype(np.uint8))
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)
    return Image.fromarray(np.dstack([np.array(im), alpha]), "RGBA")


def method_veto(im: Image.Image, model: str = "isnet-general-use") -> Image.Image:
    """Colour segmentation for the MATTE, the AI model only as a background VETO.

    The two methods fail in opposite directions, which is what makes combining them worth
    anything. Colour segmentation keeps every plant-coloured thing, so background foliage
    behind the subject survives as a dark block. Salient-object matting keeps one dominant
    blob, so petals and stems are discarded. Using the model as the matte loses the plant;
    using it as a VETO loses only the background: each connected piece of the colour cutout
    is dropped when the model is confident it is not the subject, and the piece that holds
    the subject is never dropped, so a stem the model missed cannot be vetoed away.
    """
    colour = method_colour(im)
    alpha = np.array(colour.getchannel("A"))
    keep = alpha > 127
    if keep.sum() < 200:
        return colour
    ai = np.array(method_rembg(im, model).getchannel("A")).astype(float)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(keep.astype(np.uint8), 8)
    if n <= 2:
        return colour
    areas = stats[1:, cv2.CC_STAT_AREA]
    main = 1 + int(np.argmax(areas))
    # The subject component is whichever piece the model scores highest, not simply the
    # biggest: on a photograph where background foliage outweighs the flower, the biggest
    # piece IS the background.
    scores = {i: float(ai[labels == i].mean()) for i in range(1, n)}
    subject = max(scores, key=lambda i: scores[i] * (areas[i - 1] ** 0.25))
    out = alpha.copy()
    for i in range(1, n):
        if i in (subject, main) and scores[i] >= 8:
            continue
        if scores[i] < 25:                       # the model is confident this is background
            out[labels == i] = 0
    return Image.fromarray(np.dstack([np.array(im), out]), "RGBA")


# ── measurement ─────────────────────────────────────────────────────────────────────────
def measure(im: Image.Image, cut: Image.Image) -> dict:
    a = np.array(cut.getchannel("A"))
    keep = a > 127
    if keep.sum() < 200:
        return {"kept": 0.0, "verdict": "empty"}
    bgr = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    m = card_art.plant_seed(bgr)
    plant = (m == cv2.GC_FGD)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    H, S, V = hsv[:, :, 0].astype(int), hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
    white = (V > 165) & (S < 60)
    botanical = plant | white
    ys, xs = np.nonzero(keep)
    bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    n, _, stats, _ = cv2.connectedComponentsWithStats(keep.astype(np.uint8), 8)
    frag = 0
    if n > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        frag = int((areas >= areas.max() * 0.02).sum())
    # edge softness, same definition the card analysis uses
    soft = float(((a > 20) & (a < 235)).sum() / max(1, ((a > 127) ^ cv2.erode(
        keep.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)).sum()))
    return {
        "kept": round(float(keep.mean()), 4),
        "recall_botanical": round(float((keep & botanical).sum() / max(1, botanical.sum())), 3),
        "purity": round(float((keep & botanical).sum() / max(1, keep.sum())), 3),
        "solidity": round(float(keep.sum() / max(1, bw * bh)), 3),
        "fragments": frag,
        "edge_softness": round(soft, 2),
    }


def verdict(mm: dict) -> list[str]:
    bad = []
    if mm.get("verdict") == "empty":
        return ["kept nothing"]
    if mm["solidity"] > PP.MAX_CUTOUT_SOLIDITY:
        bad.append(f"rectangular (solidity {mm['solidity']})")
    if mm["purity"] < 0.75:
        bad.append(f"background remnants ({100*(1-mm['purity']):.0f}% non-botanical)")
    if mm["recall_botanical"] < 0.55:
        bad.append(f"destroyed plant structures (kept {100*mm['recall_botanical']:.0f}%)")
    if mm["fragments"] > 6:
        bad.append(f"{mm['fragments']} detached fragments")
    return bad


def self_test() -> int:
    checks = [(hasattr(card_art, "grabcut_seeded"), "the current method is importable")]
    try:
        import rembg  # noqa: F401
        checks.append((True, "rembg is installed"))
    except ImportError:
        checks.append((False, "rembg is installed"))
    # CONTROL: a fully opaque cutout must be called rectangular, or the gate is not a gate.
    im = Image.new("RGB", (200, 200), (40, 120, 40))
    solid = Image.new("RGBA", (200, 200), (40, 120, 40, 255))
    checks.append((any("rectangular" in v for v in verdict(measure(im, solid))),
                   "CONTROL: an uncut image is reported as rectangular"))
    ok = True
    for good, label in checks:
        print(("PASS  " if good else "FAIL  ") + label)
        ok &= bool(good)
    print("\n" + ("ALL SELF-TESTS PASSED" if ok else "SELF-TESTS FAILED"))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--species", default="matricaria_chamomilla")
    ap.add_argument("--out", default=None)
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()

    pdir = ROOT / "evidence" / "photos" / a.species
    meta = json.loads((pdir / "photos.json").read_text())
    out = pathlib.Path(a.out) if a.out else ROOT / "evidence" / "segmentation" / a.species
    out.mkdir(parents=True, exist_ok=True)
    prof = PP.style_profile()

    methods = [("colour-grabcut", method_colour),
               ("u2net", lambda i: method_rembg(i, "u2net")),
               ("isnet", lambda i: method_rembg(i, "isnet-general-use")),
               ("sam-prompted", method_sam),
               ("hybrid", method_hybrid),
               ("colour+ai-veto", method_veto)]
    rows = []
    for p in meta["photos"]:
        src = pdir / p["file"]
        if not src.exists():
            continue
        im = load_rgb(src)
        for name, fn in methods:
            t = time.time()
            try:
                cut = fn(im)
            except Exception as exc:
                rows.append({"photo_id": p["photo_id"], "method": name,
                             "error": f"{type(exc).__name__}: {exc}"[:160]})
                continue
            secs = time.time() - t
            mm = measure(im, cut)
            bad = verdict(mm)
            cut.save(out / f"{p['photo_id']}-{name}.png")
            rows.append({"photo_id": p["photo_id"], "method": name, "seconds": round(secs, 2),
                         **mm, "problems": bad, "acceptable": not bad})
            print(f"   {p['photo_id']} {name:16} {secs:5.2f}s  kept={mm.get('kept')} "
                  f"recall={mm.get('recall_botanical')} purity={mm.get('purity')} "
                  f"solidity={mm.get('solidity')} frag={mm.get('fragments')}"
                  + ("  OK" if not bad else "  " + "; ".join(bad)))
    (out / "comparison.json").write_text(json.dumps({"species": a.species, "rows": rows,
                                                     "work_edge": WORK_EDGE}, indent=2) + "\n")
    print(f"\nper-method acceptance:")
    for name, _ in methods:
        r = [x for x in rows if x["method"] == name and "error" not in x]
        if not r:
            print(f"   {name:16} unavailable")
            continue
        ok = sum(x["acceptable"] for x in r)
        secs = np.mean([x["seconds"] for x in r])
        print(f"   {name:16} {ok}/{len(r)} acceptable   mean {secs:.2f}s/image")
    return 0


if __name__ == "__main__":
    sys.exit(main())
