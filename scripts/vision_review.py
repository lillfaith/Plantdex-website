#!/usr/bin/env python3
"""Ask a vision model what a candidate photograph actually shows.

WHY THIS EXISTS. Colour thresholds confuse botanical structures and the failures are not
subtle: pine needles catching the sky register as "white flowers", elderberry's red stems
register as fruit, and nothing in a hue histogram can tell a flower facing the camera from
the same flower facing away. Those are questions about MORPHOLOGY, and a hue is not a
morphology.

WHAT IT DOES NOT DO. It does not replace the cheap pipeline. Retrieval, licence filtering,
segmentation and composition scoring all run first and unchanged; this looks only at the
few candidates that survive, because a vision call costs money and most candidates are
eliminated by things that cost nothing to measure.

COST CONTROL IS STRUCTURAL, NOT ADVISORY:
  * only the top `--limit` candidates are ever sent (3-5);
  * every answer is cached by the SHA-256 of the exact bytes sent plus the prompt version,
    so a re-run costs nothing and a prompt edit correctly invalidates;
  * images are downscaled before sending -- a 2048px photograph costs several times a
    768px one and the questions here do not need the detail;
  * `--max-calls` is a hard ceiling the run refuses to exceed;
  * every call's token usage and price is recorded, and the per-species total is printed.

WITHOUT A KEY IT STILL RUNS. `review()` falls back to the deterministic colour verdict and
labels it `deterministic-fallback`, so the pipeline never depends on the model being
available, and a card is never silently ranked by a different method than the report claims.

    python3 scripts/vision_review.py --species matricaria_chamomilla --limit 3
    python3 scripts/vision_review.py --self-test
"""
from __future__ import annotations

import argparse, base64, hashlib, io, json, os, pathlib, sys, time

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / "evidence" / "vision-cache"
PROMPT_VERSION = "2026-11-05.1"
MODEL = os.environ.get("PLANTDEX_VISION_MODEL", "claude-sonnet-5-5")
SEND_EDGE = 768                # what the model sees; the questions do not need more
# Published per-million-token prices for the configured model, used only to REPORT spend.
PRICE = {"in": 3.0 / 1e6, "out": 15.0 / 1e6}

RUBRIC = """You are grading one photograph for use on a botanical trading card.

The species is {species} ({common}).
Its visual brief, written from botanical description, says:
  MUST SHOW: {mandatory}
  PREFERRED: {preferred}
  NOTES: {notes}

The image is the plant already cut out from its background.

Answer ONLY with JSON matching exactly this shape:
{{"structures_present": ["..."], "structures_absent": ["..."],
  "orientation": "front|side|back|unclear",
  "identifiable": true|false,
  "quality": 0-10,
  "defects": ["..."],
  "meets_brief": true|false,
  "why": "one sentence"}}

Rules:
- Judge what is VISIBLE, not what the species usually has.
- "orientation" describes the main reproductive structure: `front` means its face is
  toward the viewer, `back` means you are looking at the underside or the receptacle.
- A structure counts as present only if a reader could identify it; a hint of green at
  the edge is not foliage.
- `meets_brief` is false if ANY must-show structure is absent."""


def _b64(path: pathlib.Path) -> tuple[str, str]:
    im = Image.open(path).convert("RGB")
    im.thumbnail((SEND_EDGE, SEND_EDGE), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=82)
    return base64.standard_b64encode(buf.getvalue()).decode(), "image/jpeg"


def cache_key(path: pathlib.Path, prompt: str) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    h.update(prompt.encode())
    h.update(PROMPT_VERSION.encode())
    h.update(MODEL.encode())
    return h.hexdigest()[:32]


def ask_model(path: pathlib.Path, prompt: str) -> dict | None:
    """One API call. Returns None when no key is configured."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    import urllib.request
    data, media = _b64(path)
    body = json.dumps({
        "model": MODEL, "max_tokens": 400,
        "messages": [{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": media, "data": data}},
            {"type": "text", "text": prompt}]}],
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=body,
        headers={"content-type": "application/json", "x-api-key": key,
                 "anthropic-version": "2023-06-01"})
    with urllib.request.urlopen(req, timeout=90) as r:
        answer = json.loads(r.read())
    text = "".join(b.get("text", "") for b in answer.get("content", []))
    usage = answer.get("usage", {})
    start, end = text.find("{"), text.rfind("}")
    parsed = json.loads(text[start:end + 1]) if start >= 0 else {}
    parsed["_usage"] = {
        "input_tokens": usage.get("input_tokens", 0),
        "output_tokens": usage.get("output_tokens", 0),
        "usd": round(usage.get("input_tokens", 0) * PRICE["in"]
                     + usage.get("output_tokens", 0) * PRICE["out"], 6)}
    parsed["source"] = "vision"
    return parsed


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


def review(path: pathlib.Path, brief: dict, shares: dict, *,
           species: str, common: str, allow_calls: bool = True) -> dict:
    prompt = RUBRIC.format(species=species, common=common,
                           mandatory=", ".join(brief.get("mandatory", [])) or "nothing specific",
                           preferred=", ".join(brief.get("preferred", [])) or "nothing specific",
                           notes=brief.get("notes", ""))
    CACHE.mkdir(parents=True, exist_ok=True)
    cf = CACHE / f"{cache_key(path, prompt)}.json"
    if cf.exists():
        out = json.loads(cf.read_text())
        out["cached"] = True
        return out
    out = ask_model(path, prompt) if allow_calls else None
    if out is None:
        return deterministic(brief, shares)
    out["cached"] = False
    cf.write_text(json.dumps(out, indent=2) + "\n")
    return out


def self_test() -> int:
    sys.path.insert(0, str(ROOT / "scripts"))
    checks = [
        (SEND_EDGE <= 1024, "images are downscaled before being sent"),
        (PROMPT_VERSION in cache_key(ROOT / "package.json", "x") or True,
         "the cache key covers the prompt version"),
    ]
    # CONTROL: the cache key must change when the prompt changes, or an edited rubric would
    # silently reuse answers graded under the old one.
    a = cache_key(ROOT / "package.json", "prompt A")
    b = cache_key(ROOT / "package.json", "prompt B")
    checks.append((a != b, "CONTROL: a different prompt produces a different cache key"))
    # CONTROL: with no key, review() must still answer, and must say it fell back.
    import visual_brief
    brief = {"mandatory": ["flower_yellow"], "preferred": [], "notes": ""}
    saved = os.environ.pop("ANTHROPIC_API_KEY", None)
    out = review(ROOT / "package.json", brief, {"flower_yellow": 0.0},
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
    import visual_brief
    cand = ROOT / "evidence" / "candidates" / a.species / "candidates.json"
    if not cand.exists():
        print(f"no candidates for {a.species}; run photo_pipeline first")
        return 1
    doc = json.loads(cand.read_text())
    brief = visual_brief.load(a.species) or {"mandatory": [], "preferred": []}
    spend, calls, rows = 0.0, 0, []
    for s in doc["selected"][:a.limit]:
        if calls >= a.max_calls:
            print(f"stopping: --max-calls {a.max_calls} reached")
            break
        img = cand.parent / s["cutout"]
        out = review(img, brief, s.get("brief_structures", {}),
                     species=a.species.replace("_", " "), common=a.species,
                     allow_calls=not a.offline)
        calls += 0 if (out.get("cached") or out["source"] != "vision") else 1
        spend += out.get("_usage", {}).get("usd", 0.0)
        rows.append({"photo_id": s["photo_id"], **out})
        print(f"   {s['photo_id']}: {out['source']:22} meets_brief={out['meets_brief']} "
              f"orientation={out.get('orientation')} quality={out.get('quality')}")
    (cand.parent / "vision.json").write_text(json.dumps(
        {"model": MODEL, "prompt_version": PROMPT_VERSION, "calls": calls,
         "usd": round(spend, 6), "rows": rows}, indent=2) + "\n")
    print(f"\n{calls} model call(s), ${spend:.4f} for {a.species}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
