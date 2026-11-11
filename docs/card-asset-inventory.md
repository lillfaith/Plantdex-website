# Card asset inventory, and the visual-difference report

What can be reused **exactly**, what must be approximated, and what I need from you.
Written after auditing the repository rather than from assumption.

---

## 1. The finding that changes the approach

**`build_deck.py` does not compose cards. It rasterises them.**

The 45 cards are designed outside this repository and arrive as two-page PDFs; the script
renders page 1 and page 2 to `.webp`, re-counts the stat icons to validate the manual
transcription, and writes `herbs.json`. There is no template, no layer source, no SVG and
no layout code anywhere in the repo.

So "reuse the template" could only mean one thing: **composite onto the real template
file**. And `docs/assets/cardbase.pdf` — the blank you sent — *is* that file.

**Proved, not assumed.** I rendered `cardbase.pdf` and the unflattened Pine #41 PDF at
identical geometry and diffed them. **83% of pixels are identical, and every differing
pixel is per-card content** — the name, number, photograph, scientific name, two use
discs, three indicator rows, pixel panel, encounter value and season tile. The frame, the
curved art-window silhouette, the gold corners, the gauge rail, the photo backdrop, the
encounter strip, the side rails and the scalloped foot are byte-identical.

`scripts/render_generated_card.py` now paints **into slots on that file**. It draws no
frame, no curve, no decoration, no panel. An empty field shows the template through,
untouched.

---

## 2. Reusable exactly — no approximation

| Asset | Source | Status |
|---|---|---|
| **Front frame, art-window silhouette, gold corners, gauge rail, photo backdrop, encounter strip, side rails, scalloped foot** | `docs/assets/cardbase.pdf` p1 | **Exact.** Rendered at 800px; the card is composited onto it. |
| **Back frame, all six panel shapes, every panel heading, the corner ornaments, the central botanical silhouette** | `docs/assets/cardbase.pdf` p2 | **Exact.** Never regenerated — the headings and silhouette are part of the template image. |
| **12 use icons** — digestive, edible, wound, energy, tea, lungs, topical, calm, bone, heart, immune, urinary | Harvested by `scripts/extract_card_icons.py` from the 54 fronts in `public/cards/` | **Exact.** Labelled by cross-reference with `herbs.json`; 85/90 discs agree with their medoid, all 12 verified by eye. |
| **4 season icons** — spring, summer, autumn, winter | Same | **Exact.** 45/45 agree. |
| **3 unit icons** — droplet, sun, thermometer | Extracted from the unflattened Pine PDF | **Exact.** |
| **Slot geometry** — photo opening, name boxes, disc slots, indicator rows and pitch, pixel panel, encounter value, season tile | Measured from the base-vs-Pine diff, cross-checked against `build_deck.py`'s own `STAT_ROWS`, `SLOT_X0`, `SLOT_PITCH`, `SPRITE_BOX` | **Exact.** The indicator pitch I measured (x0 = 56, pitch = 66.5) reproduces Pine's five suns at 56/130/196/261/327. |
| **Pixel-icon method** | Measured from the deck's own icon: 360px wide, 13px colour runs → a **28×28 mosaic**, nearest-neighbour | **Exact method**, reproduced by `scripts/card_art.py`. |

---

## 3. MISSING — and this is the blocker

### The five fonts are subsetted. None can spell "Chamomile".

The fonts embedded in the card PDF are **subsetted to that card's own glyphs**. The `cmap`
still lists 700–1,400 entries, so counting it says the font is complete — **my first check
did exactly that and passed.** Rendering each glyph is the only test that catches it: the
outlines behind most entries are empty.

| Font | Role | Glyphs that paint nothing | Can it set Chamomile? |
|---|---|---|---|
| `BalooBhaijaan-Regular` | Common name | 65 — the whole alphabet bar Pine's letters | **No** (needs C, a, e, h, i, l, m, o) |
| `Palatino-BoldItalic` | Scientific name | 61 | **No** (needs M, a, c, h, l, m, o, r, t) |
| `Palatino-Bold` | Card number, encounter value | 42 — **every digit** | **No** (needs #, 0, 1, m) |
| `Avenir-Medium` | All back-card text | 34 | **No** (needs A, G, L, k, -) |
| `Futura-MediumItalic` | Role unidentified | 64 | n/a |

**Result: 10 of the card's strings are not painted at all.** The renderer refuses rather
than printing gaps — a card reading "ntimicrobial" is worse than one reading nothing.

### What I need you to upload

1. **`Palatino Bold Italic`** — scientific name
2. **`Palatino Bold`** — card number and encounter value
3. **`Avenir Medium`** — every word on the back
4. **`Baloo Bhaijaan` (the v1 cut your cards use)** — common name

Full `.ttf`/`.otf` files from the machine you designed on. Palatino, Avenir and Futura are
commercial (Linotype/Monotype); you licensed them, I can't fetch them.

**On Baloo specifically:** *Baloo Bhaijaan 2* is free and I downloaded it successfully —
it renders completely. **I have not used it**, because it is a later redesign with
different letterforms, and you asked me not to substitute visually similar typography. Say
the word and I'll swap it in, or send the v1 and it's exact.

5. **Optional but valuable: card #46, the Icon Cheat Sheet**, unflattened — it would let
   me verify my 12 icon labels against the deck's own legend instead of by eye.

### Also missing, lower priority

- **Letter-spacing, stroke weight and shadow offsets** for the two name treatments. I have
  the measured ink boxes (`Pine` 127×54, `Pinus spp.` 255×97) so size calibrates exactly,
  but tracking and the exact outline colour are inferred from the render, not read from a
  source file. A layered source (`.ai`/`.psd`/`.sketch`/Figma) would settle these — and the
  art-window silhouette as vector, which would end the raster-template dependency entirely.

---

## 4. Visual-difference report — Chamomile #G0001 vs Purslane #06

Both at 800×1293. Purslane ships at 800×1295 (a 233×377pt page); the template renders
234×378pt, so Purslane is resampled to match before differencing.

**Template agreement with content slots excluded: 89.7%.** The residual is a 1–2px edge
halo from that resample, plus Purslane's own content bleeding outside my slot rectangles
(the tail of "Purslane", "oleracea", "Common"). No structural element differs.

| # | Element | Purslane #06 | Chamomile #G0001 | Cause |
|---|---|---|---|---|
| 1 | Frame, curves, corners, rails, scallops | — | **identical** | composited onto the template |
| 2 | Back panels, headings, silhouette | — | **identical** | same |
| 3 | Photograph | cut-out on backdrop, breathing room | cut-out on backdrop, breathing room, nothing clipped | fixed |
| 4 | Two use discs | heart, edible | digestive, calm | exact assets, exact slots |
| 5 | Pixel panel | pixel mosaic | pixel mosaic (28×28) | exact method |
| 6 | **Common name** | "Purslane" gold, outlined | **absent** | **font subsetted** |
| 7 | **Card number** | "#06" | **absent** | **font subsetted — every digit is empty** |
| 8 | **Scientific name** | "Portulaca oleracea" | **absent** | **font subsetted** |
| 9 | **Back text** | 17 entries | 7 of 13 painted | **font subsetted** (A, G, L, k, -) |
| 10 | Water / sun / temperature | 2 / 5 / 4 icons | **absent** | no sourced values — flagged, not invented |
| 11 | Encounter value | "Common" | **absent** | no sourced value — flagged |
| 12 | Season tile | heat waves (summer) | **absent** | 8 observations across 5 countries, April–September, is not phenology |

Rows 6–9 are **one cause**. Send the four fonts and they close together.

---

## 5. The scalable system this leaves

The template is a file, not code. Per species the pipeline supplies only: two strings, a
number, two use keys, three integers, an encounter rate, a season key, a cut-out
photograph, a 28×28 pixel icon, and the back lists. Everything else is byte-identical on
every card by construction — which is the goal you set.
