#!/usr/bin/env python3
"""Why does BiRefNet delete stems and leaves, and which setting stops it?

THE SYMPTOM, MEASURED ON REAL CANDIDATES. Three of the owner's four pinned photographs came
back missing botany the photograph plainly contains: mullein 21260078 lost its entire stem
and woolly basal leaves and kept only the flower clusters; elderberry 424182823 and
424182835 lost every leaf and kept berries and pedicels; dandelion 152340494 kept a
fingertip and no foliage. These are not segmentation NOISE -- the cutouts are clean. They
are the model keeping one thing and discarding another.

THE HYPOTHESIS THIS TESTS. `birefnet-general-lite` is a SALIENT-object model: it answers
"what is the subject of this photograph", and in a photograph of a flowering plant the
salient object is the FLOWER. Leaves and stems are, to that question, context -- which is
exactly the distinction a trading card does not want. If that is right, the fix is not a
threshold anywhere in our code; it is a different model, or a mask that is grown back out
to the plant after the model has found it.

WHAT IT MEASURES, PER MODEL, PER PHOTOGRAPH:
  * `green_kept`      -- of the foliage-coloured pixels in the source, what share survived.
                         This is the number the symptom is about.
  * `subject_kept`    -- of all non-background pixels, what share survived, so a model that
                         simply keeps MORE of everything is not mistaken for a better one.
  * `thin_kept`       -- survival of thin structures only (the source mask eroded then
                         subtracted), which is where stems live. A model can score well on
                         green and still shave every stem.
  * `pieces`          -- connected components, because a cutout in fragments is its own
                         failure however much it retains.

It writes a side-by-side strip per photograph so the numbers can be checked by eye, and it
SELECTS NOTHING: the output is a comparison for a person to read.

    python3 scripts/segment_diagnose.py --species verbascum_thapsus --photo 21260078
    python3 scripts/segment_diagnose.py --pinned          # every candidate the owner pinned
"""
from __future__ import annotations

import argparse, json, os, pathlib, sys, time

import cv2
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import decisions                                      # noqa: E402

OUT = ROOT / "evidence" / "segmentation"
WORK = 1200

# The candidates to compare. `birefnet-general` is the full model the `-lite` in use is a
# distillation of, and is the first thing to try if the hypothesis above is right.
MODELS = os.environ.get(
    "PLANTDEX_DIAGNOSE_MODELS",
    "birefnet-general-lite,birefnet-general,isnet-general-use,u2net",
).split(",")

# A method is a model plus an optional post-step. `+grow` runs the seeded region grow below
# on that model's mask. Written as a suffix so the comparison stays one flat table.
GROW_SUFFIX = "+grow"


def masks(bgr: np.ndarray) -> dict:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    # Olive through blue-green, which is where stems and leaves both sit. Deliberately the
    # same window photo_pipeline uses after the hue-35 bug that lost the chamomile's stem.
    green = (h >= 22) & (h <= 95) & (s >= 40) & (v >= 25)
    return {"green": green}


def thin(mask: np.ndarray) -> np.ndarray:
    """Thin structures: what an erosion removes. Stems, petioles, pedicels."""
    k = np.ones((9, 9), np.uint8)
    return mask & ~cv2.erode(mask.astype(np.uint8), k, iterations=1).astype(bool)


def pieces(alpha: np.ndarray) -> int:
    n, _, st, _ = cv2.connectedComponentsWithStats(alpha.astype(np.uint8), 8)
    if n <= 1:
        return int(alpha.any())
    areas = st[1:, cv2.CC_STAT_AREA]
    return int((areas >= areas.max() * 0.05).sum())


def grow_to_plant(bgr: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Take the model's mask as a SEED and grow it into the rest of the same plant.

    THIS IS THE FIX THE COMPARISON POINTS AT, and the comparison is why it is this and not a
    different model. Four architecturally different networks -- birefnet-general-lite,
    birefnet-general, isnet-general-use, u2net -- all kept mullein 21260078's flower
    clusters and all discarded its entire woolly rosette, which is the same plant, attached,
    in focus, in the middle of the frame. They agree because they are all SALIENT-object
    detectors answering "what is the subject of this photograph", and the subject of a
    photograph of a flowering plant is the flower. Swapping among them cannot help; that
    half of the hypothesis is refuted and the other half is confirmed.

    So the mask is treated as a seed rather than an answer. Plant-coloured regions that are
    CONNECTED to what the model found are part of the same plant; plant-coloured regions
    that touch it nowhere are a different plant, which is what the model was right about.
    Contact has to be substantial -- a few pixels of overlap is a leaf passing behind, and
    growing on that would swallow the background the model correctly removed.
    """
    import cv2
    g = masks(bgr)["green"]
    plant = g | alpha
    n, lab = cv2.connectedComponents(plant.astype(np.uint8), 8)
    # A band around the seed: contact is measured here rather than against the raw mask, so
    # a leaf whose stalk is one pixel wide still counts as attached.
    near = cv2.dilate(alpha.astype(np.uint8), np.ones((9, 9), np.uint8), 2).astype(bool)
    out = alpha.copy()
    for i in range(1, n):
        comp = lab == i
        touch = int((comp & near).sum())
        size = int(comp.sum())
        if size < 200:
            continue
        # Substantial contact: 2% of the component's own pixels, or 150 pixels, whichever
        # is smaller -- a big leaf meets the seed along a short join, a big background bush
        # meets it nowhere.
        if touch >= min(150, max(20, int(size * 0.02))):
            out |= comp
    return out


def run_model(model: str, im: Image.Image) -> tuple[np.ndarray, float]:
    from rembg import new_session, remove
    t0 = time.time()
    sess = new_session(model)
    out = remove(im, session=sess).convert("RGBA")
    return np.array(out.getchannel("A")) > 127, time.time() - t0


def diagnose(src: pathlib.Path, label: str) -> dict:
    im = Image.open(src).convert("RGB")
    im.thumbnail((WORK, WORK), Image.LANCZOS)
    bgr = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    m = masks(bgr)
    src_green = m["green"]
    src_thin = thin(src_green)
    rows, strips = [], [np.array(im)]
    for method in MODELS:
        grow = method.endswith(GROW_SUFFIX)
        model = method[:-len(GROW_SUFFIX)] if grow else method
        try:
            alpha, secs = run_model(model, im)
            if grow:
                t1 = time.time()
                alpha = grow_to_plant(bgr, alpha)
                secs += time.time() - t1
        except Exception as exc:                        # a missing model must not kill the run
            rows.append({"model": method, "error": str(exc)[:120]})
            continue
        gk = float((src_green & alpha).sum() / max(1, src_green.sum()))
        tk = float((src_thin & alpha).sum() / max(1, src_thin.sum()))
        sk = float(alpha.mean())
        rows.append({"model": method, "green_kept": round(gk, 3), "thin_kept": round(tk, 3),
                     "frame_kept": round(sk, 3), "pieces": pieces(alpha),
                     "seconds": round(secs, 1)})
        shown = np.array(im).copy()
        shown[~alpha] = (128, 128, 128)
        strips.append(shown)
    OUT.mkdir(parents=True, exist_ok=True)
    h = min(s.shape[0] for s in strips)
    strip = np.hstack([cv2.resize(s, (int(s.shape[1] * h / s.shape[0]), h)) for s in strips])
    Image.fromarray(strip).save(OUT / f"{label}-models.jpg", quality=86)
    return {"photo": label, "source": str(src.relative_to(ROOT)), "rows": rows}


def pilot() -> list[tuple[str, str]]:
    """One photograph per pilot species -- the gallery's leading distinct option.

    `--pinned` covers only what the owner has picked, and pine has no pick: its one
    candidate with a verdict was REJECTED. A comparison that silently omits a species is a
    comparison of four species.
    """
    import review_gallery
    out = []
    for d in sorted((ROOT / "evidence" / "candidates").iterdir()):
        if not (d.is_dir() and (d / "candidates.json").exists()):
            continue
        opts, _ = review_gallery.distinct_three(d.name, want=1)
        if opts:
            out.append((d.name, opts[0]["photo_id"]))
    return out


def pinned() -> list[tuple[str, str]]:
    out = []
    for pid, v in decisions.current().items():
        if v.get("decision") in ("approved", "preferred", "alternative"):
            out.append((v["species"], pid))
    return sorted(out)


def find_source(species: str, photo_id: str) -> pathlib.Path | None:
    pdir = ROOT / "evidence" / "photos" / species
    mf = pdir / "photos.json"
    if mf.exists():
        for e in json.loads(mf.read_text()).get("photos", []):
            if str(e.get("photo_id")) == str(photo_id) and (pdir / e["file"]).exists():
                return pdir / e["file"]
    hits = sorted(pdir.glob(f"inat-{photo_id}.*"))
    return hits[0] if hits else None


def main() -> int:
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--species")
    a.add_argument("--photo")
    a.add_argument("--pinned", action="store_true")
    a.add_argument("--pilot", action="store_true",
                   help="the leading distinct option of every species with candidates")
    a.add_argument("--self-test", action="store_true")
    args = a.parse_args()
    if args.self_test:
        g = np.zeros((60, 60), bool); g[20:40, 20:40] = True
        ok = [(thin(g).sum() > 0 and not thin(g)[30, 30], "thin() finds edges, not cores"),
              (pieces(g) == 1, "pieces() counts one blob as one"),
              (len(MODELS) >= 2, "more than one model is compared")]
        good = True
        for c, l in ok:
            print(("PASS  " if c else "FAIL  ") + l); good &= bool(c)
        print("\n" + ("ALL SELF-TESTS PASSED" if good else "SELF-TESTS FAILED"))
        return 0 if good else 1
    jobs = (pilot() if args.pilot else pinned() if args.pinned else
            ([(args.species, args.photo)] if args.species and args.photo else []))
    if args.pilot and args.pinned:
        jobs = sorted(set(pilot()) | set(pinned()))
    if not jobs:
        a.error("give --species and --photo, or --pinned, or --pilot")
    report = []
    for sp, pid in jobs:
        src = find_source(sp, pid)
        if not src:
            print(f"{sp} #{pid}: source original not on disk (retained? re-download needed)")
            continue
        print(f"\n=== {sp} #{pid} ===  {src.name}")
        r = diagnose(src, f"{sp}-{pid}")
        for row in r["rows"]:
            if "error" in row:
                print(f"   {row['model']:24} ERROR {row['error']}")
            else:
                print(f"   {row['model']:24} green_kept={row['green_kept']:.3f} "
                      f"thin_kept={row['thin_kept']:.3f} frame={row['frame_kept']:.3f} "
                      f"pieces={row['pieces']} {row['seconds']}s")
        report.append(r)
    (OUT / "model-comparison.json").write_text(json.dumps(report, indent=2) + "\n")
    print(f"\n{OUT / 'model-comparison.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
