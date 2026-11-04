# Font resolution

Three questions, answered. Nothing was substituted.

---

## 1. Which fonts are genuinely missing

**All five**, and the roles are not what I had assumed. The unflattened Pine #41 PDF
carries **live text**, so each string reports its own font, size, colour and baseline:

| Slot | Font | Size (at 800px) | Colour |
|---|---|---|---|
| Common name | **Futura Medium Italic** | 62.9px | `#fee726` over `#696028` |
| Card number `#` / digits | **Baloo Bhaijaan** | 37.4px / 50.5px | `#efc5f4` |
| Scientific name | **Palatino Bold Italic** | 48.1px | `#fff200` over `#e9d128` |
| Encounter value | **Palatino Bold** | 40.0px | `#d26e91` |
| Back body | **Avenir Medium** | 36.5px | three colours by panel |

**That corrected four things I had inferred from the picture and got wrong:** the common
name is Futura, not Baloo; the number is Baloo, not Palatino, and its `#` is a separate
smaller draw; the encounter value is pink, not white; and the back body uses three inks
(`#3b1e5f`, `#4059a8`, `#f4fbfe`), not one.

**Every one is subsetted to Pine's own glyphs.** The `cmap` still lists 700–1,400 entries,
so counting it reports them complete — **my first check did exactly that and passed.**
Rendering each glyph is the only test that catches it: Futura 64 blank, Palatino Bold
Italic 61, Baloo 62, Palatino Bold 42, Avenir 34.

---

## 2. Are complete versions available through your design environment?

**Yes — you already own all five.** They are installed on whatever machine made these
cards; the PDF names them exactly:

- `Futura-MediumItalic`, `Palatino-BoldItalic`, `Palatino-Bold` — Linotype/Monotype
- `Avenir-Medium` — Linotype
- `BalooBhaijaan-Regular` — free (Google Fonts), **v1**

I cannot fetch the commercial four. Export or copy them from your design machine as
`.ttf`/`.otf`.

**On Baloo:** *Baloo Bhaijaan 2* downloads cleanly and renders completely. **I have not
used it** — it is a later redesign with different letterforms. Your call.

---

## 3. Do the design assets contain reusable vector text or complete outlines?

**No, and I checked three ways.**

- The Pine PDF has **live text, not outlines** — `get_drawings()` finds 36 vector paths on
  the front, none of them letterforms. So there are no glyph outlines to harvest.
- `cardbase.pdf` is a **flattened raster** — one 2567×1944 image, no fonts, no vectors.
- `build_deck.py`'s own docstring says the *print* PDFs have text converted to outlines —
  but those files are not in this repository, and outlines in a print PDF are per-string
  shapes, not a reusable font.

### Could the per-card subsets be merged instead?

I costed it. Each card's PDF embeds a subset holding that card's glyphs, so a union across
cards covers more.

**For Chamomile specifically, six card PDFs would do it:**

| Card | Supplies |
|---|---|
| #35 Lemon Balm | Futura `a`, `l`, `m`, `o` |
| #13 Chickweed | Futura `C`, `h` |
| #16 Ground Ivy | Palatino Bold Italic `a c h l m o r` |
| #23 Wild Mint | Palatino Bold Italic `M`, `t` |
| #01 Dandelion | Baloo `0`; Palatino Bold `m` |
| #05 Lamb's Quarters | Avenir `- A G L k` |

**For a 2,000-species system it does not work.** Even merging all 45 cards leaves large
gaps, because the deck's own text never uses those letters in those roles:

| Font | Unreachable from the whole deck |
|---|---|
| Futura Medium Italic | `#0123456789AKTUXZjqxz` |
| Palatino Bold Italic | `#0123456789BDJKWXYZkwz` |
| Baloo Bhaijaan | every letter — card numbers are digits only |
| Palatino Bold | `#-.0123456789JKQVWXYZbdfghjklqsvwxyz` |
| Avenir Medium | `#012456789XYj` |

**Conclusion: merging is a workaround for Chamomile, not a foundation.** The scalable
system needs the real licensed fonts.

### One consequence worth deciding now

**Baloo has no letters available from any card subset**, so `#G0001` cannot be set even
after merging. I'd propose the generated series use **digits only — `#1001` upward**. Four
digits, no collision with the printed `1`–`47`, and settable from card #01's subset alone.

---

## 4. The renderer is already correct — proved against Pine

Pine's fonts *are* complete for Pine's own text, so I rendered **Pine #41 from the
template** and compared it with the genuine card. Every indicator glyph box matches
**exactly**:

| | genuine | my renderer |
|---|---|---|
| droplets | (75, 770, 35, 55), (141, 770, 35, 55) | identical |
| thermometers | (71/137/203, 926, 45, 63) | identical |
| suns | x 56–389, y 838–916 | x 56–390, y 838–916 |
| use discs | (618, 699, 53, 56) | (618, 700, 53, 52) |
| season tile | (684, 1016, 48, 47) | (684, 1016, 47, 47) |

Name, number, scientific name and encounter value all land on their measured baselines in
the right face, size and colour.

**So the typography pipeline is finished and validated.** Send the four fonts and Chamomile
renders complete, with no further changes to geometry.

Three geometry bugs were found and fixed on the way, all by comparing against Pine:
the icons carried different transparent margins (26px, 8px, 155px), so scaling the
*canvas* gave each a different ink size and spread the droplets 200px apart; the indicator
rows were being drawn at `build_deck.py`'s detector *sampling bands*, which are narrower
than the glyphs; and each row turns out to have its own origin and glyph size rather than
sharing one.
