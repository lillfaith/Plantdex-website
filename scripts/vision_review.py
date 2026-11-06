#!/usr/bin/env python3
"""Ask a vision model what a candidate photograph actually shows -- shown all three stages.

WHY THIS EXISTS. Colour thresholds confuse botanical structures and the failures are not
subtle: pine needles catching the sky register as "white flowers", elderberry's red stems
register as fruit, and nothing in a hue histogram can tell a flower facing the camera from
the same flower facing away. Those are questions about MORPHOLOGY, and a hue is not a
morphology.

THREE IMAGES, THREE INDEPENDENT JUDGEMENTS. The review used to see only the cutout, and
that single image cannot answer the questions this process keeps getting wrong, because
each failure lives at a different stage:

  SOURCE PHOTOGRAPH   -- was the plant complete before anything was cut? The mullein whose
                         spike was beheaded was beheaded by the PHOTOGRAPHER; the cutout
                         looks like a tidy plant, and the loss is invisible unless you can
                         see the original frame.
  BIREFNET CUTOUT     -- did segmentation keep the plant and drop the scene? The pine that
                         passed every number was two strips of background forest. Against a
                         flat grey ground, retained sky and retained scenery are visible as
                         what they are.
  FINISHED CARD       -- does it read as a PlantDex card? Scale, placement and whether the
                         identifying detail survives at card size are properties of the
                         card, not of the photograph.

Judging them separately is what stops one answer being traded against another: a beautiful
card does not excuse a beheaded specimen, and a perfect specimen does not excuse a cutout
with a rectangle of sky still in it.

HARD AND SOFT STAY APART. Cropping, segmentation and species identification are hard: they
decide whether the image is USABLE. Art direction -- composition, specimen quality, whether
this is the one that belongs in the deck -- is the owner's subjective preference, comes from
evidence/art-direction.json in his own words, and is reported as a soft note that blocks
nothing. gates.py enforces that split; this module simply answers the two kinds of question
in separate fields so they cannot be confused downstream.

COST CONTROL IS STRUCTURAL, NOT ADVISORY:
  * only the top `--limit` candidates are ever sent (3-5);
  * one call per candidate, carrying all three images, rather than three calls;
  * every answer is cached by the SHA-256 of the exact bytes of every image sent plus the
    prompt version and model, so a re-run costs nothing and a prompt edit invalidates;
  * images are downscaled before sending -- the questions here do not need 2048px;
  * `--max-calls` is a hard ceiling the run refuses to exceed;
  * every call's token usage and price is recorded, and the per-species total is printed.

WITHOUT A KEY IT STILL RUNS, and says so. `review()` falls back to the deterministic colour
verdict labelled `deterministic-fallback`, which gates.py will not promote past
NEEDS_REVIEW. Nothing can be AUTO_APPROVED without a genuine API verdict.

    python3 scripts/vision_review.py --species matricaria_chamomilla --limit 3
    python3 scripts/vision_review.py --self-test
"""
from __future__ import annotations

import argparse, base64, hashlib, io, json, os, pathlib, sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / "evidence" / "vision-cache"
PROMPT_VERSION = "2026-11-06.1"
MODEL = os.environ.get("PLANTDEX_VISION_MODEL", "claude-sonnet-5-5")
SEND_EDGE = 768                # what the model sees; the questions do not need more
CUTOUT_GROUND = (128, 128, 128)  # see _b64: a cutout needs a ground that is not black
# Published per-million-token prices for the configured model, used only to REPORT spend.
PRICE = {"in": 3.0 / 1e6, "out": 15.0 / 1e6}

RUBRIC = """You are grading one candidate photograph for a botanical trading card.

The species is {species} ({common}).

Its visual brief, written from botanical description, says:
  MUST SHOW: {mandatory}
  PREFERRED: {preferred}
  NOTES: {notes}

The card owner's art direction for this species, in his own words:
{art}

You are shown THREE images of the same candidate, in this order:
  1. SOURCE PHOTOGRAPH -- the original frame, background and all.
  2. CUTOUT -- the plant isolated by background removal, on a flat grey ground.
  3. CARD PREVIEW -- the finished card, with the cutout placed in the art window.

Judge the three INDEPENDENTLY and do not let one excuse another.

Answer ONLY with JSON matching exactly this shape:
{{"cropping": {{"complete": true|false, "lost": ["..."], "why": "one sentence"}},
  "segmentation": {{"clean": true|false, "defects": ["..."], "why": "one sentence"}},
  "art_direction": {{"meets": true|false,
                    "composition": "branch|single_plant|clump|whole_tree|habitat_scene|close_up|other",
                    "why": "one sentence"}},
  "structures_present": ["..."], "structures_absent": ["..."],
  "orientation": "front|side|back|unclear",
  "identifiable": true|false,
  "quality": 0-10,
  "meets_brief": true|false,
  "why": "one sentence"}}

Rules:
- Judge what is VISIBLE, not what the species usually has.
- "cropping" is about the SOURCE frame only: `complete` is false when an identifying
  structure runs off the edge of the original photograph and is therefore unrecoverable.
  A large subject that merely fills the frame is NOT incomplete.
- "segmentation" is about the CUTOUT only: `clean` is false when background survived
  (sky, soil, foliage that is not this plant, a straight-edged rectangle of scene) or when
  the plant itself was cut into disconnected fragments. Ignore the flat grey ground.
- "art_direction" is about the CARD PREVIEW and the directive above. It is a PREFERENCE:
  answer it honestly but never let it change `identifiable` or `meets_brief`.
- "orientation" describes the main reproductive structure: `front` means its face is toward
  the viewer, `back` means you are looking at the underside or the receptacle.
- A structure counts as present only if a reader could identify it; a hint of green at the
  edge is not foliage.
- `meets_brief` is false if ANY must-show structure is absent. It is about BOTANY: do not
  set it false because the composition is not to the owner's taste."""


def _b64(path: pathlib.Path) -> tuple[str, str]:
    """One image, downscaled, as base64 JPEG.

    A cutout is RGBA and `.convert("RGB")` composites it against BLACK -- which is the one
    ground that hides the defect this image exists to show, since retained dark scenery
    and a clean cut look identical against it. Flatten onto mid grey instead, and say so in
    the rubric so the ground is never read as part of the plant.
    """
    im = Image.open(path)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        ground = Image.new("RGBA", im.size, CUTOUT_GROUND + (255,))
        im = Image.alpha_composite(ground, im)
    im = im.convert("RGB")
    im.thumbnail((SEND_EDGE, SEND_EDGE), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=82)
    return base64.standard_b64encode(buf.getvalue()).decode(), "image/jpeg"


def cache_key(images: list[tuple[str, pathlib.Path]], prompt: str) -> str:
    h = hashlib.sha256()
    for label, p in images:
        h.update(label.encode())
        h.update(p.read_bytes() if p.exists() else b"missing")
    h.update(prompt.encode())
    h.update(PROMPT_VERSION.encode())
    h.update(MODEL.encode())
    return h.hexdigest()[:32]


def ask_model(images: list[tuple[str, pathlib.Path]], prompt: str) -> dict | None:
    """One API call carrying every stage of one candidate. None when no key is configured."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    import urllib.request
    content: list[dict] = []
    for label, p in images:
        data, media = _b64(p)
        content.append({"type": "text", "text": label})
        content.append({"type": "image",
                        "source": {"type": "base64", "media_type": media, "data": data}})
    content.append({"type": "text", "text": prompt})
    body = json.dumps({"model": MODEL, "max_tokens": 700,
                       "messages": [{"role": "user", "content": content}]}).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=body,
        headers={"content-type": "application/json", "x-api-key": key,
                 "anthropic-version": "2023-06-01"})
    with urllib.request.urlopen(req, timeout=120) as r:
        answer = json.loads(r.read())
    text = "".join(b.get("text", "") for b in answer.get("content", []))
    usage = answer.get("usage", {})
    start, end = text.find("{"), text.rfind("}")
    parsed = json.loads(text[start:end + 1]) if start >= 0 else {}
    parsed["_usage"] = {
        "input_tokens": usage.get("input_tokens", 0),
        "output_tokens": usage.get("output_tokens", 0),
        "images": len(images),
        "usd": round(usage.get("input_tokens", 0) * PRICE["in"]
                     + usage.get("output_tokens", 0) * PRICE["out"], 6)}
    parsed["source"] = "vision"
    parsed["stages_seen"] = [label for label, _ in images]
    return normalise(parsed)


def normalise(row: dict) -> dict:
    """Fill in the keys gates.py reads, without inventing a judgement.

    An older verdict is flat (`defects`, no per-stage blocks) and must keep working: a cache
    full of answers graded under the previous rubric is evidence, and silently discarding it
    would re-spend money to learn the same thing. A key the answer did not contain stays
    ABSENT rather than defaulting to true -- a missing judgement is not a pass.
    """
    seg = row.get("segmentation") or {}
    if "defects" not in row:
        row["defects"] = list(seg.get("defects", []))
    return row


def deterministic(brief: dict, shares: dict) -> dict:
    """The fallback: the colour verdict the pipeline already computed, labelled honestly."""
    import visual_brief
    v = visual_brief.check(brief, shares)
    return {"structures_present": v["preferred_present"],
            "structures_absent": v["missing_mandatory"],
            "orientation": "unclear", "identifiable": v["ok"], "quality": None,
            "defects": [], "meets_brief": v["ok"],
            "why": "colour thresholds only; no vision model was available",
            "source": "deterministic-fallback", "_usage": {"usd": 0.0}}


def stages(base: pathlib.Path, species: str, row: dict) -> list[tuple[str, pathlib.Path]]:
    """The three images for one candidate, skipping any that is not on disk."""
    src = ROOT / "evidence" / "photos" / species / row.get("file", "")
    want = [("SOURCE PHOTOGRAPH (original frame)", src),
            ("CUTOUT (background removed, flat grey ground)", base / row.get("cutout", "")),
            ("CARD PREVIEW (finished card)", base / row.get("preview", ""))]
    return [(l, p) for l, p in want if p.name and p.exists()]


def review(images: list[tuple[str, pathlib.Path]], brief: dict, shares: dict, *,
           species: str, common: str, art: str = "", allow_calls: bool = True) -> dict:
    prompt = RUBRIC.format(
        species=species, common=common,
        mandatory=", ".join(brief.get("mandatory", [])) or "nothing specific",
        preferred=", ".join(brief.get("preferred", [])) or "nothing specific",
        notes=brief.get("notes", ""), art=art or "  (nothing written down)")
    CACHE.mkdir(parents=True, exist_ok=True)
    cf = CACHE / f"{cache_key(images, prompt)}.json"
    if cf.exists():
        out = normalise(json.loads(cf.read_text()))
        out["cached"] = True
        return out
    out = ask_model(images, prompt) if allow_calls else None
    if out is None:
        return deterministic(brief, shares)
    out["cached"] = False
    cf.write_text(json.dumps(out, indent=2) + "\n")
    return out


def self_test() -> int:
    sys.path.insert(0, str(ROOT / "scripts"))
    import visual_brief  # noqa: F401  (imported for the fallback path below)
    pkg = ROOT / "package.json"
    checks = [(SEND_EDGE <= 1024, "images are downscaled before being sent")]
    a = cache_key([("S", pkg)], "prompt A")
    b = cache_key([("S", pkg)], "prompt B")
    checks.append((a != b, "CONTROL: a different prompt produces a different cache key"))
    # CONTROL: adding a stage must invalidate the cache. Without this, a cutout-only answer
    # would be served for a three-image question and reported as if it had seen the card.
    c = cache_key([("S", pkg), ("P", pkg)], "prompt A")
    checks.append((c != a, "CONTROL: a different set of images produces a different key"))
    # CONTROL: the rubric must ask for all three axes by name.
    checks.append((all(k in RUBRIC for k in ("cropping", "segmentation", "art_direction")),
                   "the rubric asks for cropping, segmentation and art direction separately"))
    # CONTROL: art direction must be told, in the rubric itself, that it cannot veto botany.
    checks.append(("never let it change" in RUBRIC,
                   "CONTROL: the rubric forbids art direction overruling identifiability"))
    # CONTROL: a cutout must not be flattened onto black, or retained dark scenery is hidden.
    checks.append((CUTOUT_GROUND != (0, 0, 0) and "alpha_composite" in open(__file__).read(),
                   "CONTROL: a cutout is flattened onto a non-black ground"))
    # CONTROL: a legacy flat verdict still normalises, and a missing judgement stays missing.
    n = normalise({"meets_brief": True, "identifiable": True, "source": "vision"})
    checks.append(("cropping" not in n and n["defects"] == [],
                   "CONTROL: an older verdict keeps working and gains no invented pass"))
    # CONTROL: with no key, review() must still answer, and must say it fell back.
    brief = {"mandatory": ["flower_yellow"], "preferred": [], "notes": ""}
    saved = os.environ.pop("ANTHROPIC_API_KEY", None)
    out = review([("S", pkg)], brief, {"flower_yellow": 0.0},
                 species="X", common="Y", allow_calls=True)
    if saved:
        os.environ["ANTHROPIC_API_KEY"] = saved
    checks.append((out["source"] == "deterministic-fallback",
                   "CONTROL: with no key it falls back and SAYS it fell back"))
    checks.append((out["_usage"]["usd"] == 0.0, "CONTROL: the fallback costs nothing"))
    ok = True
    for good, label in checks:
        print(("PASS  " if good else "FAIL  ") + label)
        ok &= bool(good)
    print("\n" + ("ALL SELF-TESTS PASSED" if ok else "SELF-TESTS FAILED"))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--species")
    ap.add_argument("--limit", type=int, default=3)
    ap.add_argument("--max-calls", type=int, default=5)
    ap.add_argument("--offline", action="store_true", help="never call; fallback only")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if not a.species:
        ap.error("--species is required")
    sys.path.insert(0, str(ROOT / "scripts"))
    import art_direction, visual_brief
    cand = ROOT / "evidence" / "candidates" / a.species / "candidates.json"
    if not cand.exists():
        print(f"no candidates for {a.species}; run photo_pipeline first")
        return 1
    doc = json.loads(cand.read_text())
    brief = visual_brief.load(a.species) or {"mandatory": [], "preferred": []}
    art = art_direction.as_prompt(a.species)
    if art:
        print(f"art direction for {a.species}:\n{art}\n")
    spend, calls, rows = 0.0, 0, []
    for s in doc["selected"][:a.limit]:
        if calls >= a.max_calls:
            print(f"stopping: --max-calls {a.max_calls} reached")
            break
        imgs = stages(cand.parent, a.species, s)
        out = review(imgs, brief, s.get("brief_structures", {}),
                     species=a.species.replace("_", " "), common=a.species,
                     art=art, allow_calls=not a.offline)
        calls += 0 if (out.get("cached") or out["source"] != "vision") else 1
        spend += out.get("_usage", {}).get("usd", 0.0)
        rows.append({"photo_id": s["photo_id"], "stages": [l for l, _ in imgs], **out})
        crop = (out.get("cropping") or {}).get("complete")
        segc = (out.get("segmentation") or {}).get("clean")
        adir = (out.get("art_direction") or {})
        print(f"   {s['photo_id']}: {out['source']:22} meets_brief={out['meets_brief']} "
              f"cropping_complete={crop} segmentation_clean={segc} "
              f"art={adir.get('meets')}/{adir.get('composition')} "
              f"quality={out.get('quality')} ({len(imgs)} images)")
    (cand.parent / "vision.json").write_text(json.dumps(
        {"model": MODEL, "prompt_version": PROMPT_VERSION, "calls": calls,
         "usd": round(spend, 6), "art_direction": art, "rows": rows}, indent=2) + "\n")
    print(f"\n{calls} model call(s), ${spend:.4f} for {a.species}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
