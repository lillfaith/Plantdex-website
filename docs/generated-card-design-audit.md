# Design audit: the Purslane card against the Chamomile prototype

Reference: `docs/assets/purslane-reference.pdf` (card #06, front and back).
The prototype being corrected is the one rendered earlier in this session.

**The root error, from which most of the rest follow.** I treated the pixel sprite as the
card's artwork. It is not. The herbalism card carries a **real botanical photograph**; the
sprite is a **separate asset** for the garden, the collections and anything built later.
Neither ever stands in for the other.

---

## Front

| # | The real card | My prototype | Severity |
|---|---|---|---|
| 1 | A **real botanical photograph**, cut out, on a soft violet→pink→violet backdrop inside the art window | A 32×28 pixel sprite | **Fundamental** |
| 2 | A **second supporting photograph** — a whole-plant habit shot — in a lilac rounded panel at lower right | Absent; I put a block of explanatory prose there | **Fundamental** |
| 3 | Common name in **gold bold italic**, dark-outlined, left-aligned in the lilac bar | Cream serif (Cinzel), no outline | Major |
| 4 | Scientific name in **large gold bold italic serif** under the art window | White italic sans, too small | Major |
| 5 | Two round **gold use icons** beside the scientific name — a heart-with-pulse (medicinal) and a fork-and-knife (edible) | Absent | Major |
| 6 | Environmental indicators drawn as **repeated icons**: 2 cyan droplets, 5 gold suns, 4 red thermometers, in three stacked rows | A vertical gauge reading "no rating" in sideways text | **Fundamental** |
| 7 | `Encounter Rate:` in outlined pale-blue serif, then the **value** (`Common`) in white serif, with a gold glyph tile at the right | "not rated", no value, no glyph | Major |
| 8 | Card number as `#06` in a lilac pill | `G01`, no hash | Minor |
| 9 | No development text anywhere | A footnote paragraph and a "counted off printed artwork; none exists" block | **Fundamental** |
| 10 | No overlay banner | A "GENERATED · NOT PUBLISHED" stamp drawn over the card | Major |

## Back

| # | The real card | My prototype | Severity |
|---|---|---|---|
| 11 | Entries are **one to three words**, set in **two columns** per panel — "Wound support / Nutrient-rich / Circulatory / Skin support" | Full sentences with trailing clauses | **Fundamental** |
| 12 | Body text is a **serif**, dark purple, centred in its column | Sans (Inter), left-aligned, small | Major |
| 13 | Panel headings are coloured per panel: pink (Healing Traits), dark purple (Signature Compounds), pink (Taste/Aromatic), **gold** (Preparations/Usable Parts) | Template headings left as-is, content laid over them | Major |
| 14 | No evidence badges on the card | `TRADITIONAL` / `LABORATORY` chips printed on the card face | **Fundamental** |
| 15 | No refusal or pipeline text | "Sesquiterpenoids: refused — source group too weak", "Pending — no approved claim yet" | **Fundamental** |
| 16 | An empty panel would simply be empty | Two paragraphs of explanation printed in Taste and Aromatic | **Fundamental** |
| 17 | Content clears every heading | Signature Compounds content overlapped its heading on the first render | Major |

---

## The rule the corrections follow

**A card shows botany. A review interface shows the pipeline.**

Everything in rows 9, 10, 14, 15 and 16 is real information that a reviewer needs and a
player must never see on a card. It all moves to the review package, where the evidence
standing, the refusal reasons, the licence record and the "no adequate evidence" flags
belong — stated once, in full, beside the thing they qualify.

That cuts the other way too: a field with no adequate evidence is **left blank on the card
and flagged in the review interface**. It is not filled with a hedge, an apology, or an
explanation of why it is empty.

## What stays true from before

- Taste and Aromatic genuinely cannot be sourced from literature, and the stats genuinely
  are counted off printed artwork that a generated species does not have. **The handling
  changes, not the fact**: those panels stay empty on the card and are flagged for the
  reviewer, rather than printing a paragraph about themselves.
- Every photograph carries its observation id, photographer, licence and original URL.
- Nothing is published, and no existing card is regenerated or replaced.
