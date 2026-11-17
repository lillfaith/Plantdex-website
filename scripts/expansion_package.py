#!/usr/bin/env python3
"""Per-card packaging for expansion cards: the 2-page card file, and the sprite and profile PREPARATION.

PRIVATE DEVELOPMENT TOOL. For each card it writes, under expansion/cards/<nnn>_<id>/:

    front.png / back.png          the rendered faces (scripts/render_expansion_batch.py, 800px)
    <id>_<n>.pdf                  ONE two-page file, front then back, 234x378pt like the printed deck's per-card PDFs
                                  (the name ends in the card number, which is what build_deck.py recovers it from)
    sprite-brief.json             what an authored creature portrait needs: palette read from the APPROVED artwork,
                                  the plant's own botany, the growth stages, and the rules it must obey
    profile-draft.json            the Herb-shaped record the plant page would be built from, and what is still missing

It authors NO sprite and promotes NO card: a sprite is a creature designed by hand (see scripts/sprite_sources), and a
profile only exists on the site once a card is added to DIGITAL_ONLY_ENTRIES, which is a separate, reviewed act.

    python3 scripts/expansion_package.py --rendered <render out dir> --cards 57 58 59 60 61
"""
from __future__ import annotations

import argparse
import colorsys
import json
import pathlib
import shutil
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
CARDS = ROOT / "src" / "data" / "expansion-cards.json"
ASSETS = ROOT / "expansion" / "assets"
OUT = ROOT / "expansion" / "cards"
SPRITES = ROOT / "src" / "data" / "sprites.json"
PT_W, PT_H = 234.0, 378.0

# Creature ideas that come out of each plant's OWN botany, proposed for approval. None implies a medicinal effect, and none
# claims a pollinator relationship (the cards carry no pollinator data). `avoid` names the existing sprite the idea must not echo.
CONCEPTS = {
    "eupatorium-perfoliatum": {
        "hook": "PERFOLIATE: the leaf pairs are joined around the stem, so the stalk passes straight through them. The arms ARE the fused leaf pair, wrapped around the creature's own stalk like a collar.",
        "organ": "a flat-topped crowd of many tiny white flower heads (a corymb), not one round head: build it as a cluster of small bumps over a broad dome",
        "gesture": "threads itself: the leaf-collar slides up the stalk, the stalk visibly passes through, and the collar settles back with a satisfied look",
        "personality": "clasping", "avoid": "the generic 'white flower cluster' look shared with the other small-white-flower species; keep the joined leaves as the silhouette"},
    "eutrochium-fistulosum": {
        "hook": "FISTULOSUM means hollow-stemmed: a tall, tube-like stalk topped by a broad dome of pink-purple flower clusters, with leaves in rings (whorls) around the stalk.",
        "organ": "a tall domed cluster of many small pink-purple heads carried high on a long stalk",
        "gesture": "raps a knuckle on its own hollow stalk and tilts its head to listen to the echo, then nods as if it heard its own name",
        "personality": "echoing", "avoid": "Eupatorium's dome; separate them by height (this one is the tallest sprite) and by the pink-purple palette"},
    "ceanothus-americanus": {
        "hook": "A small shrub carrying many pom-pom clusters of tiny white flowers on long thin stalks; its leaves are broad with three prominent veins.",
        "organ": "several small round white clusters on thin stalks around one face, like pom-poms",
        "gesture": "the pom-pom stalks bob one after another like a ripple, then all settle; the face is the one still thing",
        "personality": "jaunty", "avoid": "any tea or drink gesture; the Tea use icon is on the card already and a sprite must not suggest an effect"},
    "rudbeckia-hirta": {
        "hook": "The coneflower composition from the deck's own notes: a dark domed disc in a ring of yellow rays; HIRTA means hairy, so the stem and leaves are bristly.",
        "organ": "two stacked heads: a wide yellow ray mane with no face of its own, and a smaller dark cone laid over its middle that carries the face SEATED LOW (the disc stands proud, which is a dome and not a picture frame)",
        "gesture": "the rays spin slowly like a pinwheel while the dark face stays put and blinks, then the rays catch up and stop",
        "personality": "bristly", "avoid": "Echinacea purpurea's coneflower sprite (same anatomy): differ in palette (gold and near-black, not pink and orange), ray count and the pinwheel gesture"},
    "pycnanthemum-tenuifolium": {
        "hook": "Very narrow needle-like leaves on a slender stem, with dense whitish flower clusters at the branch tips.",
        "organ": "small dense whitish clusters at the tips of a fine, many-branched stem; the narrow leaves are the arms",
        "gesture": "the narrow leaves bristle outward like pine needles and stand at attention, then relax flat",
        "personality": "prickly", "avoid": "Mentha's 're-renders itself in ice' gesture, and any scent or 'minty' effect; draw nothing that implies aroma or use"},
}


def palette_from_art(path: pathlib.Path, k: int = 6) -> list[dict]:
    """Dominant colours of the APPROVED main art (opaque pixels only), named by role from hue, never invented."""
    im = Image.open(path).convert("RGBA")
    im.thumbnail((300, 300))
    a = np.asarray(im)
    px = a[a[..., 3] > 200][:, :3]
    if not len(px):
        return []
    q = Image.fromarray(px.reshape(-1, 1, 3).astype(np.uint8)).quantize(colors=k, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[: 3 * k]
    counts = np.bincount(np.asarray(q).ravel(), minlength=k)
    out = []
    for i in np.argsort(-counts):
        r, g, b = pal[3 * i: 3 * i + 3]
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        role = "foliage" if 0.17 < h < 0.48 and s > 0.2 else ("neutral" if s < 0.15 else "flower/other")
        out.append({"hex": f"#{r:02x}{g:02x}{b:02x}", "share": round(float(counts[i] / counts.sum()), 3), "role": role, "hue_deg": round(h * 360)})
    return out


def make_pdf(front: pathlib.Path, back: pathlib.Path, dest: pathlib.Path, title: str) -> None:
    import pymupdf
    doc = pymupdf.open()
    for img in (front, back):
        page = doc.new_page(width=PT_W, height=PT_H)
        page.insert_image(pymupdf.Rect(0, 0, PT_W, PT_H), filename=str(img))
    doc.set_metadata({"title": title, "subject": "PlantDex expansion card (draft; front then back)", "producer": "scripts/expansion_package.py"})
    doc.save(str(dest), deflate=True)


def sprite_brief(c: dict, art: pathlib.Path, taken: set[str]) -> dict:
    cn = CONCEPTS[c["id"]]
    return {
        "status": "BRIEF ONLY - no sprite has been authored", "herbId": c["id"], "cardNumber": c["cardNumber"], "commonName": c["commonName"],
        "concept": cn, "personality_label_free": cn["personality"] not in taken,
        "palette_from_approved_art": palette_from_art(art),
        "palette_rules": "Every species owns a hue; leaves never within 34deg of the flower; midtone saturation capped; the five FACE_PALETTE colours are shared and never recoloured.",
        "stages": {"sprout": "vegetative only - leaves and NO flower structure of any kind",
                   "growing": "in BUD - closed flower, a different organ from the open one",
                   "flowering": "the authored adult portrait; frame 0 is the resting pose and ONE connected piece"},
        "build": ["write scripts/sprite_sources/<snake_case_id>.py (authored module with a named gesture)", "python3 scripts/build_sprites.py", "python3 scripts/audit_sprites.py",
                  "regenerates public/cards/animated/* and src/data/sprites.json - do this ONLY when the card is being promoted"],
        "rules": ["a portrait, never an identification aid", "nothing may imply a medicinal effect", "no invented botany: only what the card and the plant support",
                  "part placement is measured from the assembled art, never inferred from parameters"],
        "needs_approval": True}


def profile_draft(c: dict, d: pathlib.Path) -> dict:
    from render_expansion_batch import apply_overrides
    c = apply_overrides(c)          # the owner's recorded text edits, so the draft matches the printed card
    rev = c.get("review", {})
    return {
        "status": "DRAFT - hidden; not in CATALOGUE, herbs.json or public/", "herb": {
            "id": c["id"], "cardNumber": c["cardNumber"], "commonName": c["commonName"], "scientificName": c["scientificName"],
            "rarity": c["front"]["rarity"], "xp": c["front"]["xp"], "season": c["front"]["season"], "uses": c["front"]["uses"], "stats": c["front"]["stats"],
            "back": c["back"], "sources": [{"sourceId": "plantdex-expansion-draft", "detail": f"Card #{c['cardNumber']} text from the owner-supplied master sheet; review pending"}]},
        "carried_from_the_record": {"regions": rev.get("regions"), "regionalConfidence": rev.get("regionalConfidence"), "researchLinks": c.get("researchLinks"),
                                    "cardSafetyWarning": rev.get("cardSafetyWarning"), "cardSafetyWarningStatus": rev.get("cardSafetyWarningStatus"),
                                    "guideCaution": (rev.get("editorial") or {}).get("guideCaution")},
        "artwork_on_disk": {k: (str(pathlib.Path("expansion/assets") / c["id"] / f"{k}.png") if (ASSETS / c["id"] / f"{k}.png").exists() else "NOT YET SUPPLIED") for k in ("main", "pixel", "tall")},
        "still_needed_before_promotion": [
            "final botanical / safety review (the record's own status says pending); the safety copy decides whether a SITE_CAUTIONS entry is needed",
            "collectionId (a card in DIGITAL_ONLY_ENTRIES must declare one) and the decision to promote at all",
            "web derivatives of the art: 800px front, 400px thumb, 112px chip, back (public/cards/...), built from the approved layers",
            "the animated sprite (see sprite-brief.json) and its sprites.json entry",
            "habitat and plant-page copy beyond the card (identification, habitat, facts) with sources; unsourced sections must say so",
            "scanner effect: promoting adds the species to the matcher; checked that no expansion species shares a genus with an existing spp. card"],
        "rendering_rules": ["Healing Traits always renders with its non-claim framing", "SafetyNotice at the right weight", "a warning printed on the card renders above the discovery CTA"]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rendered", required=True); ap.add_argument("--cards", nargs="+", type=int, required=True)
    a = ap.parse_args()
    cards = {c["cardNumber"]: c for c in json.loads(CARDS.read_text())["cards"]}
    taken = {v["personality"] for v in json.loads(SPRITES.read_text()).values()}
    for n in a.cards:
        c = cards[n]
        src = pathlib.Path(a.rendered) / f"{n:03d}_{c['id']}"
        d = OUT / f"{n:03d}_{c['id']}"
        d.mkdir(parents=True, exist_ok=True)
        for f in ("front.png", "back.png"):
            shutil.copy2(src / f, d / f)
        make_pdf(d / "front.png", d / "back.png", d / f"{c['id']}_{n}.pdf", f"{c['commonName']} (#{n})")
        # a sprite brief needs an approved concept AND the approved art to read a palette from; without them there is nothing to prepare yet
        if c["id"] in CONCEPTS and (ASSETS / c["id"] / "main.png").exists():
            (d / "sprite-brief.json").write_text(json.dumps(sprite_brief(c, ASSETS / c["id"] / "main.png", taken), indent=1) + "\n")
        (d / "profile-draft.json").write_text(json.dumps(profile_draft(c, d), indent=1) + "\n")
        print(n, c["commonName"], "->", d.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
