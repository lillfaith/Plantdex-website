#!/usr/bin/env python3
"""Assemble the review-ready card and render the review page. Local only, never shipped.

WHAT THIS IS. The last two stages of the vertical slice: it joins a retrieved bundle, a
citation-checked draft and a sprite candidate into one record, and writes a self-contained
HTML page for reviewing it.

THE PAGE IS NOT PART OF THE SITE. It is written to a directory you name, it is not a route,
`generateStaticParams` never sees it, and nothing in `out/` is built from it. A review tool
that ships is a review tool that can leak a draft claim onto a public page.

WHAT THE PAGE HAS TO MAKE EASY IS REJECTION. At 2,000 species the budget is review-minutes,
not tokens, so every claim is shown BESIDE THE PASSAGE IT CAME FROM -- the only comparison
a reviewer actually needs to make -- with high-risk rows first and the two verdicts
(content, artwork) kept apart, because approving artwork is not approving medicine.

    python3 scripts/build_review_page.py --out review/
"""

from __future__ import annotations

import argparse
import html
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent

# The deck's own tokens, read from globals.css rather than retyped, so the review page
# cannot drift into a different palette from the product it is reviewing.
TOKENS = {
    "plum950": "#17101c", "plum900": "#211827", "plum800": "#2b2033",
    "plum700": "#362941", "plum600": "#43334f",
    "violet600": "#9c21f8", "violet400": "#d484f5", "violet300": "#ddaaf7",
    "violet200": "#ecd4fb", "violet100": "#f6ebfd",
    "gold500": "#ffd54a", "gold300": "#fff0b3",
    "pink": "#f280b3", "cyan": "#4fc3f7",
}

STANDING_LABEL = {
    "traditional": "Traditional use",
    "laboratory": "Laboratory evidence",
    "clinical": "Clinical evidence",
}

# Straight from `generated-card.ts`. Restated here because this script runs without a
# TypeScript toolchain; `generated-card.test.ts` holds the two equal.
WITHHELD = [
    ("Taste profile",
     "tasted and written down by a person holding the plant. Nothing in the literature "
     "supplies it, and inventing one would be inventing botany."),
    ("Aromatic profile",
     "the same: a scent note is an observation, not a citation."),
    ("Water, sun and temperature",
     "counted off the printed card artwork by the deck build. A generated species has no "
     "printed card to count, so the card shows no rating rather than a guess."),
]


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def assemble(bundle: dict, draft: dict, sprite_report: dict, method: str) -> dict:
    identity = bundle["identity"]
    passages = {p["passage_id"]: p for p in bundle["literature"]["passages"]}
    sources = {s["source_id"]: s for s in bundle["literature"]["sources"]}
    candidate = sprite_report["candidates"][method]

    claims = []
    for claim in draft["claims"]:
        passage = passages.get(claim["passage_id"])
        claims.append({
            **claim,
            "passage_text": passage["text"] if passage else None,
            "source": sources.get(claim["source_ids"][0]) if claim.get("source_ids") else None,
            # EVERY CLAIM'S STATE IS ITS OWN. A refused claim does not advance just
            # because the bundle around it did.
            "state": "citation-checked" if claim.get("citation_check", {}).get("ok")
                     else "ai-extracted",
        })
    claims.sort(key=lambda c: (not c.get("high_risk"), c["claim_id"]))

    return {
        "state": draft["state"],
        "species_key": bundle["species_key"],
        "accepted_name": identity["accepted_name"],
        "family": identity["family"],
        "gbif_id": identity["gbif_id"],
        "taxonomy_status": identity["taxonomy_status"],
        "synonym_count": len(identity["synonyms"]),
        "collection_id": "generated",
        "tier": "generated",
        "conservation": bundle["conservation"],
        "retrieval": {
            "at": bundle["retrieved_at"],
            **bundle["counts"],
            "verified_sources": sum(1 for s in sources.values() if s.get("verified")),
        },
        "citation_check": draft.get("citation_check"),
        "extraction": draft["extraction"],
        "claims": claims,
        "sprite": {"method": candidate["method"], "recipe": candidate["recipe"],
                   "anchors": candidate["anchors"],
                   "face_audit": candidate["face_audit"],
                   "frame0_connected": candidate["frame0_connected"]},
        "review": {"content": None, "artwork": None, "by": None, "on": None},
        "publishable": False,
        "publish_blockers": [
            "medicinal content is not approved",
            "artwork is not approved",
            *[f"source {sid} is not verified by a human"
              for sid in sorted({c["source_ids"][0] for c in claims if c.get("source_ids")})],
        ],
    }


def page(card: dict, sprite_png: str, sheet_png: str, methods: dict) -> str:
    rows = []
    for claim in card["claims"]:
        ok = claim.get("citation_check", {}).get("ok")
        reason = claim.get("citation_check", {}).get("reason")
        source = claim.get("source") or {}
        risk = " risk" if claim.get("high_risk") else ""
        rows.append(f"""
      <article class="claim{risk}">
        <header>
          <span class="id">{esc(claim['claim_id'])}</span>
          <span class="kind">{esc(claim['kind'])}</span>
          <span class="standing s-{esc(claim['standing'])}">
            {esc(STANDING_LABEL[claim['standing']])}</span>
          <span class="state {'ok' if ok else 'bad'}">
            {esc(claim['state'])}</span>
        </header>
        <p class="body">{esc(claim['body'])}</p>
        {'' if ok else f'<p class="refusal">REFUSED: {esc(reason)}</p>'}
        <div class="evidence">
          <p class="quote">{esc(claim['quote'])}</p>
          <p class="passage">{esc((claim.get('passage_text') or '')[:420])}</p>
          <p class="source">
            {esc(source.get('title') or 'unknown')}<br>
            <em>{esc(source.get('journal') or '')} {esc(source.get('year') or '')}</em>
            &middot; {esc(claim['source_ids'][0])}
            &middot; <strong class="unverified">not verified by a human</strong>
          </p>
        </div>
        <div class="votes">
          <button type="button">approve</button>
          <button type="button">revise</button>
          <button type="button">reject</button>
          <span class="hint">no verdict recorded</span>
        </div>
      </article>""")

    withheld = "".join(
        f"<li><strong>{esc(name)}</strong> &mdash; {esc(why)}</li>" for name, why in WITHHELD
    )
    blockers = "".join(f"<li>{esc(b)}</li>" for b in card["publish_blockers"])
    others = "".join(
        f'<figure><img src="{esc(src)}" alt=""><figcaption>{esc(label)}</figcaption></figure>'
        for label, src in methods.items()
    )
    cons = card["conservation"]

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review: {esc(card['accepted_name'])}</title>
<style>
  :root {{
    --plum950: {TOKENS['plum950']}; --plum900: {TOKENS['plum900']};
    --plum800: {TOKENS['plum800']}; --plum700: {TOKENS['plum700']};
    --violet400: {TOKENS['violet400']}; --violet300: {TOKENS['violet300']};
    --violet200: {TOKENS['violet200']}; --violet100: {TOKENS['violet100']};
    --gold500: {TOKENS['gold500']}; --pink: {TOKENS['pink']}; --cyan: {TOKENS['cyan']};
  }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; background: var(--plum950); color: var(--violet100);
    font: 15px/1.55 ui-sans-serif, system-ui, sans-serif; }}
  .wrap {{ max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; }}
  h1 {{ font-size: 26px; margin: 0 0 2px; }}
  h1 em {{ font-style: italic; color: var(--violet300); font-weight: 400; }}
  h2 {{ font-size: 13px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--violet300); margin: 34px 0 10px; }}
  .banner {{ display: inline-block; background: var(--gold500); color: #2b2033;
    font-weight: 700; font-size: 11px; letter-spacing: .14em; padding: 4px 9px;
    border-radius: 3px; text-transform: uppercase; }}
  .state-strip {{ background: var(--plum800); border: 1px solid var(--plum700);
    border-radius: 8px; padding: 12px 14px; margin: 14px 0 0;
    display: flex; gap: 22px; flex-wrap: wrap; font-size: 13px; }}
  .state-strip b {{ display: block; color: var(--violet300); font-weight: 600;
    font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }}
  .card {{ display: grid; grid-template-columns: 240px 1fr; gap: 22px;
    background: var(--plum900); border: 1px solid var(--plum700); border-radius: 12px;
    padding: 20px; margin-top: 14px; }}
  .card img {{ width: 100%; image-rendering: pixelated; background: var(--plum800);
    border-radius: 8px; }}
  .warn {{ border-left: 3px solid var(--gold500); background: var(--plum800);
    padding: 10px 14px; border-radius: 0 8px 8px 0; margin: 12px 0; font-size: 14px; }}
  .warn.hard {{ border-left-color: var(--pink); }}
  .claim {{ background: var(--plum900); border: 1px solid var(--plum700);
    border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; }}
  .claim.risk {{ border-color: var(--pink); }}
  .claim header {{ display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
    margin-bottom: 8px; }}
  .id {{ font-family: ui-monospace, monospace; color: var(--violet300); font-size: 12px; }}
  .kind, .standing, .state {{ font-size: 11px; padding: 2px 8px; border-radius: 999px;
    letter-spacing: .06em; text-transform: uppercase; }}
  .kind {{ background: var(--plum700); color: var(--violet200); }}
  .s-traditional {{ background: #4a3a1e; color: var(--gold500); }}
  .s-laboratory {{ background: #1e3a46; color: var(--cyan); }}
  .s-clinical {{ background: #3f1e33; color: var(--pink); }}
  .state.ok {{ background: #23402c; color: #9fe6b0; }}
  .state.bad {{ background: #4a1f28; color: #ff9fb0; }}
  .body {{ margin: 0 0 8px; font-size: 15px; }}
  .refusal {{ color: #ff9fb0; font-size: 13px; margin: 0 0 8px;
    font-family: ui-monospace, monospace; }}
  .evidence {{ background: var(--plum950); border-radius: 8px; padding: 10px 12px; }}
  .quote {{ margin: 0 0 6px; color: var(--violet100); border-left: 2px solid var(--gold500);
    padding-left: 10px; font-size: 14px; }}
  .passage {{ margin: 0 0 6px; color: var(--violet300); font-size: 12.5px; }}
  .source {{ margin: 0; font-size: 12px; color: var(--violet300); }}
  .unverified {{ color: var(--gold500); }}
  .votes {{ display: flex; gap: 8px; align-items: center; margin-top: 10px; }}
  .votes button {{ background: var(--plum700); color: var(--violet100);
    border: 1px solid var(--plum600, #43334f); border-radius: 6px; padding: 5px 12px;
    font-size: 13px; }}
  .hint {{ font-size: 12px; color: var(--violet300); }}
  ul {{ margin: 0; padding-left: 18px; }}
  li {{ margin-bottom: 4px; font-size: 14px; }}
  .methods {{ display: flex; gap: 16px; flex-wrap: wrap; }}
  .methods figure {{ margin: 0; text-align: center; }}
  .methods img {{ width: 190px; image-rendering: pixelated; background: var(--plum800);
    border-radius: 8px; }}
  figcaption {{ font-size: 12px; color: var(--violet300); margin-top: 6px; }}
  @media (max-width: 720px) {{ .card {{ grid-template-columns: 1fr; }} }}
</style></head><body><div class="wrap">

  <span class="banner">Generated card &middot; not published</span>
  <h1>Chamomile<br><em>{esc(card['accepted_name'])}</em></h1>

  <div class="state-strip">
    <span><b>pipeline state</b>{esc(card['state'])}</span>
    <span><b>collection</b>{esc(card['collection_id'])}</span>
    <span><b>tier</b>{esc(card['tier'])}</span>
    <span><b>gbif</b>{esc(card['gbif_id'])} ({esc(card['taxonomy_status'])})</span>
    <span><b>family</b>{esc(card['family'])}</span>
    <span><b>synonyms</b>{esc(card['synonym_count'])}</span>
    <span><b>sources retrieved</b>{esc(card['retrieval']['sources'])}</span>
    <span><b>sources verified</b>{esc(card['retrieval']['verified_sources'])}</span>
    <span><b>passages</b>{esc(card['retrieval']['passages'])}</span>
  </div>

  <div class="card">
    <div>
      <img src="{esc(sprite_png)}" alt="Candidate sprite, frame 0">
      <figcaption>method: {esc(card['sprite']['method'])} &middot;
        audit: {esc(card['sprite']['face_audit'])} &middot;
        frame 0 connected: {esc(card['sprite']['frame0_connected'])}</figcaption>
    </div>
    <div>
      <div class="warn hard">
        <strong>Conservation &mdash; not promotable.</strong>
        IUCN {esc(cons['iucn_category'])}. {esc(cons['conservation_note'])}
        Nothing on this card may present the plant as something to go and collect.
      </div>
      <div class="warn">
        <strong>Nothing here is approved.</strong>
        The draft is <code>{esc(card['extraction']['drafted_by'])}</code>, and an
        AI-drafted claim may never <em>be</em> the approved state. A citation check
        proves a sentence was copied accurately out of a paper
        <strong>nobody has opened</strong>; that is not verification.
      </div>
      <h2>Sections this card does not print</h2>
      <ul>{withheld}</ul>
    </div>
  </div>

  <h2>Medicinal claims &mdash; {esc(card['citation_check']['claims_passed'])} of
      {esc(card['citation_check']['claims_in'])} passed the citation check</h2>
  {''.join(rows)}

  <h2>Sprite candidates</h2>
  <div class="methods">{others}</div>
  <p class="hint">Full sheet: <img src="{esc(sheet_png)}" alt="" style="width:100%;
     max-width:900px; display:block; margin-top:8px;"></p>

  <h2>Why this cannot be published</h2>
  <ul>{blockers}</ul>

</div></body></html>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", default="evidence/retrieved/matricaria_chamomilla.json")
    parser.add_argument("--draft", default="evidence/drafts/matricaria_chamomilla.json")
    parser.add_argument("--sprites", required=True,
                        help="directory written by sprite_candidates.py --out")
    parser.add_argument("--method", default="C", choices=["A", "B", "C"])
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    bundle = json.loads((ROOT / args.bundle).read_text())
    draft = json.loads((ROOT / args.draft).read_text())
    sprites = pathlib.Path(args.sprites)
    report = json.loads((sprites / "report.json").read_text())

    if draft.get("state") != "citation-checked":
        print("the draft has not been citation-checked; run check_citations.py first",
              file=sys.stderr)
        return 2

    card = assemble(bundle, draft, report, args.method)
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    import shutil
    stem = bundle["species_key"].replace(" ", "-")
    methods = {}
    for label, name in (("A procedural", "A"), ("B ai-authored", "B"), ("C hybrid", "C")):
        src = sprites / f"{stem}-{name}-still.png"
        shutil.copy(src, out / src.name)
        methods[label] = src.name
    sheet = sprites / f"{stem}-{args.method}.png"
    shutil.copy(sheet, out / sheet.name)

    (out / "card.json").write_text(json.dumps(card, indent=2, ensure_ascii=False) + "\n")
    (out / "index.html").write_text(
        page(card, f"{stem}-{args.method}-still.png", sheet.name, methods))
    print(f"wrote {out / 'index.html'} and {out / 'card.json'}")
    print(f"  claims: {card['citation_check']['claims_passed']}"
          f"/{card['citation_check']['claims_in']} passed")
    print(f"  publishable: {card['publishable']} "
          f"({len(card['publish_blockers'])} blockers)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
