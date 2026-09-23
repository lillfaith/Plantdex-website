#!/usr/bin/env python3
"""Index the unpacked ad asset pack into a searchable manifest.

    python3 scripts/build_manifest.py

Writes two committed files:
  manifest/assets.json  every file in the pack, plus the structured views an ad spec
                        resolves against (plants -> cards -> sprite sequences, screens,
                        UI parts, product photography, brand tokens)
  manifest/ASSETS.md    the same, readable, with the shortlist for 9:16 video

THE MANIFEST IS THE ALLOW-LIST. A composition may only draw a file that appears under
`files` here, and `scripts/lint-ads.mjs` / `scripts/qc.mjs` both fail on anything else —
that is what "only the supplied assets" means mechanically. The per-file SHA-256 is what
lets QC tell a pack file from a different file that happens to share its name.

PLANT NAMES COME FROM THE APP'S OWN DATA, never from file names: `src/data/herbs.json`
(the printed deck, transcribed from the physical cards) and `src/lib/field-cards.ts` (the
digital-only Field Cards). A file stem is a scientific-name slug, and deriving a common
name from it would be inventing wording the card does not print.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from PIL import Image

VIDEO = Path(__file__).resolve().parent.parent
REPO = VIDEO.parent
PACK = VIDEO / "assets" / "plantdex-ad-assets"
OUT = VIDEO / "manifest"

# The scout is not in sprites.json (see src/components/scan/ScanScout.tsx); its timing is
# the `.scan-scout` rule in globals.css: 14 frames over 1.75s.
SCOUT_FPS = 8

SCREEN_ROUTES = {
    "home": "/",
    "start": "/start",
    "scan": "/scan",
    "herbdex": "/herbdex",
    "card-dandelion": "/herbdex/taraxacum-officinale",
    "garden": "/garden",
    "field-research": "/herbdex/research",
    "seed-shelf": "/seed-shelf",
    "profile": "/profile",
    "shop": "/shop",
}

UI_PART_NOTES = {
    "achievement-chips": "Achievement badges (profile)",
    "collection-grid": "Collection progress strip",
    "daily-tasks": "Field Research daily task list",
    "deck-cta": "Physical-deck call-to-action banner",
    "field-card-reward": "Field Card reward panel (XP unlocks)",
    "field-cards-held": "Field Cards held strip (profile)",
    "field-cards-row": "Unlocked Field Cards row",
    "field-record": "Field record counters (discovered / learned / mastered)",
    "garden-grid": "Garden plot of grown plants",
    "habitat-identity": "Habitat identity panel",
    "habitat-panel": "Habitat standings panel",
    "herbal-safety": "Herbal safety notice",
    "how-plants-grow": "How plants grow strip (found -> learned -> mastered)",
    "naturalist-card": "Field naturalist profile card",
    "observation-slots": "Scan observation slots (whole plant / close-up / feature)",
    "profile-xp-bar": "XP bar with Field Card milestone markers",
    "progress-panel": "Level + XP progress panel (Herbdex)",
    "recent-field-finds": "Recent field finds",
    "research-teaser": "Field Research teaser row",
    "safety-suggestion": "Identification-is-a-suggestion safety notice",
    "seed-packet-single": "A generated Seed Shelf packet",
    "seed-shelf-board": "Seed Shelf board with packets",
    "slot-whole-plant": "Single 'Whole Plant' scan slot",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path: Path) -> str:
    return path.relative_to(PACK).as_posix()


def field_cards() -> dict[str, dict]:
    """The digital-only cards, read out of field-cards.ts rather than restated here."""
    src = (REPO / "src/lib/field-cards.ts").read_text()
    out: dict[str, dict] = {}
    for block in re.findall(r"const \w+: Herb = \{(.*?)\n\};", src, re.S):
        def field(name: str) -> str | None:
            m = re.search(rf"\n  {name}: '?([^',\n]+)'?,", block)
            return m.group(1) if m else None
        hid = field("id")
        if hid:
            out[hid] = {
                "commonName": field("commonName"),
                "scientificName": field("scientificName"),
                "cardNumber": int(field("cardNumber") or 0),
                "rarity": field("rarity"),
                "collection": "field-cards",
                "printed": False,
                "printedWarning": None,
            }
    return out


def printed_cards() -> tuple[dict[str, dict], dict]:
    data = json.loads((REPO / "src/data/herbs.json").read_text())
    issues = data.get("knownCardIssues", {})
    out = {}
    for h in data["herbs"]:
        out[h["id"]] = {
            "commonName": h["commonName"],
            "scientificName": h["scientificName"],
            "cardNumber": h["cardNumber"],
            "rarity": h["rarity"],
            "collection": "collection-01",
            "printed": True,
            "printedWarning": h.get("warning"),
            "knownCardIssue": issues.get(str(h["cardNumber"])),
        }
    return out, data


def main() -> int:
    if not PACK.exists():
        raise SystemExit(f"{PACK} is missing — run scripts/unpack_assets.py first")
    sources = json.loads((VIDEO / "assets/sources.json").read_text())
    sprites_json = json.loads((REPO / "src/data/sprites.json").read_text())
    printed, _deck = printed_cards()
    catalogue = {**printed, **field_cards()}

    files: dict[str, dict] = {}
    for p in sorted(PACK.rglob("*")):
        if not p.is_file():
            continue
        entry = {"bytes": p.stat().st_size, "sha256": sha256(p)}
        if p.suffix.lower() in (".png", ".jpg", ".jpeg"):
            with Image.open(p) as im:
                entry["width"], entry["height"] = im.size
                entry["alpha"] = im.mode in ("RGBA", "LA")
        entry["category"] = rel(p).split("/")[0]
        files[rel(p)] = entry

    def have(path: str) -> str | None:
        return path if path in files else None

    plants: dict[str, dict] = {}
    for hid, meta in sorted(catalogue.items(), key=lambda kv: kv[1]["cardNumber"]):
        cards = {
            variant: have(f"01-cards/{folder}/{hid}.jpg") or have(f"01-cards/{folder}/{hid}.png")
            for variant, folder in [
                ("front", "front-800"), ("back", "back-800"), ("thumb", "thumb-400"),
                ("chip", "chip-112"), ("portrait", "portrait-276"),
            ]
        }
        sprite_meta = sprites_json.get(hid, {})
        stages = {}
        for stage, stem, smeta in [("adult", hid, sprite_meta)] + [
            (s, f"{hid}-{s}", m) for s, m in sorted((sprite_meta.get("stages") or {}).items())
        ]:
            frames = sorted(f for f in files if f.startswith(f"03-sprites/frames/{stem}/"))
            if not frames:
                continue
            if smeta.get("frames") not in (None, len(frames)):
                raise SystemExit(f"{stem}: sprites.json says {smeta['frames']} frames, pack has {len(frames)}")
            stages[stage] = {
                "frames": frames,
                "frameCount": len(frames),
                "fps": smeta.get("fps"),
                "frameWidth": files[frames[0]]["width"],
                "frameHeight": files[frames[0]]["height"],
                "personality": smeta.get("personality"),
                "content": smeta.get("content"),
                "sheet": have(f"03-sprites/sheets/{stem}.png"),
                "still": have(f"03-sprites/still-full-cell/{stem}.png"),
                "hero": {s: have(f"03-sprites/hero-trimmed/{s}/{stem}.png") for s in ("1x", "2x", "4x", "8x")},
            }
        plants[hid] = {**meta, "cards": cards, "sprites": stages}

    screens: dict[str, dict] = {}
    for f in files:
        if f.startswith("05-screens/"):
            _, framing, name = f.split("/")
            key = Path(name).stem
            screens.setdefault(key, {"route": SCREEN_ROUTES.get(key)})[framing] = f

    ui_parts = {
        Path(f).stem: {"file": f, "note": UI_PART_NOTES.get(Path(f).stem)}
        for f in files if f.startswith("06-ui-parts/")
    }
    scout_frames = sorted(f for f in files if f.startswith("04-scout/frames/"))
    manifest = {
        "$comment": "Generated by video/scripts/build_manifest.py from the unpacked ad asset pack. Do not hand-edit.",
        "packRoot": "assets/plantdex-ad-assets",
        "sources": sources,
        "plants": plants,
        "scout": {
            "note": "Scan-screen dressing creature. Not a species; never label it as a plant.",
            "frames": scout_frames, "frameCount": len(scout_frames), "fps": SCOUT_FPS,
            "frameWidth": files[scout_frames[0]]["width"] if scout_frames else None,
            "frameHeight": files[scout_frames[0]]["height"] if scout_frames else None,
            "hero": {s: have(f"04-scout/hero-trimmed/{s}/scout.png") for s in ("1x", "2x", "4x", "8x")},
        },
        "product": sorted(f for f in files if f.startswith("02-product/")),
        "screens": dict(sorted(screens.items())),
        "uiParts": dict(sorted(ui_parts.items())),
        "brand": {
            "palette": json.loads((PACK / "00-brand/palette.json").read_text()),
            "appIcon": have("00-brand/app-icon.svg"),
            "fonts": {"display": "Outfit", "serif": "Fraunces",
                      "note": "Google Fonts, as loaded by src/app/layout.tsx. Not in the pack."},
        },
        "files": files,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "assets.json").write_text(json.dumps(manifest, indent=1) + "\n")
    (OUT / "ASSETS.md").write_text(markdown(manifest))
    n_frames = sum(len(s["frames"]) for p in plants.values() for s in p["sprites"].values())
    print(f"{len(files)} files · {len(plants)} plants · {n_frames} sprite frames · "
          f"{len(screens)} screens · {len(ui_parts)} UI parts")
    return 0


def markdown(m: dict) -> str:
    L = ["# Plantdex ad asset manifest", "",
         "Generated by `scripts/build_manifest.py`. The machine-readable version is `assets.json`;",
         "search it with `npm run find -- <term>`.", "",
         "## Sources", ""]
    L += [f"- `{s['zip']}` — {s['files']} files, sha256 `{s['sha256'][:16]}…`" for s in m["sources"]]
    L += ["", "## Best for 9:16 video", "",
          "Ranked for vertical social. Every path is relative to `assets/plantdex-ad-assets/`.", "",
          "| Use | Asset | Why |", "|---|---|---|",
          "| Phone screen demo | `05-screens/phone-viewport/*.jpg` | 1170×2532, already ~9:19.5 — fills a 9:16 frame with a slight crop, 3× density |",
          "| Hero card | `01-cards/front-800/<id>.jpg` | 800×1295 card face; scale ≤1.4× on a 1080 frame to stay sharp |",
          "| Creature | `03-sprites/frames/<id>/` | real frame sequence at the manifest fps; scale by whole numbers, nearest-neighbour |",
          "| Creature still | `03-sprites/hero-trimmed/8x/<id>.png` | frame 0 trimmed to ink, already upscaled |",
          "| Real-world proof | `02-product/card-and-plant.jpg`, `deck-in-hand.jpg` | physical cards held outdoors; near-square, use as a pan/zoom plate |",
          "| UI callouts | `06-ui-parts/progress-panel.png`, `garden-grid.png`, `field-record.png`, `observation-slots.png` | cropped components at 3×, legible when placed full-width |",
          "| Avoid in vertical | `05-screens/desktop-*`, `*-full` | landscape, or 10k+ px tall — reference only |",
          "", "**Photography rights:** the pack README says the card-front and product photographs have no recorded licence. Confirm rights before paid placement.",
          "", "## Plants", "",
          "| # | Card | Scientific name | Collection | Sprite stages (frames @ fps) | Flags |", "|---|---|---|---|---|---|"]
    for hid, p in m["plants"].items():
        stages = ", ".join(f"{s} {v['frameCount']}@{v['fps']}" for s, v in p["sprites"].items())
        flags = []
        if p.get("printedWarning"):
            flags.append("prints a warning")
        if p.get("knownCardIssue"):
            flags.append("known card issue")
        if not p["printed"]:
            flags.append("digital-only Field Card")
        L.append(f"| {p['cardNumber']} | {p['commonName']} | *{p['scientificName']}* | {p['collection']} | {stages} | {'; '.join(flags)} |")
    L += ["", "## Screens", "", "| Key | Route | Framings |", "|---|---|---|"]
    for k, s in m["screens"].items():
        L.append(f"| {k} | `{s['route']}` | {', '.join(x for x in s if x != 'route')} |")
    L += ["", "## UI parts", "", "| Key | Size | What it is |", "|---|---|---|"]
    for k, u in m["uiParts"].items():
        f = m["files"][u["file"]]
        L.append(f"| {k} | {f['width']}×{f['height']} | {u['note']} |")
    L += ["", "## Product photography", ""] + [f"- `{p}`" for p in m["product"]]
    L += ["", "## Scout", "", f"- {m['scout']['frameCount']} frames @ {m['scout']['fps']} fps — {m['scout']['note']}", ""]
    return "\n".join(L)


if __name__ == "__main__":
    raise SystemExit(main())
