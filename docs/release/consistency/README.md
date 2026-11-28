# UI consistency pass: shared component rules (review branch, nothing merged)

Branches: `ui/consistency-pass` (styles, plant detail, Field Research) and `agent/scan/page-hierarchy` (Scan photo tiles; layout and wording only). The scan branch's classes are inert until the ui branch lands, so merge ui first. A combined local preview (`preview/consistency`) was built from both with TEST-only config.

## The rules (all from Palette V2 tokens; no new colours)
1. **Light surface, darker edge.** Every information panel is a light lavender/orchid/pink fill, a 2px edge in a darker tone of the same family, and a solid 3px "bevel" foot in the deepest tone of that family. Dark-plum ink (`#38204f`, soft `#5f2f94`) for all text on it.
2. **Deep tones are for emphasis only:** the selected tab (card violet, white ink), panel header pills (deep violet, cream ink, gold edge), primary buttons, and the connected mastery rail. Never a whole panel.
3. **Gold is an accent** (a foot, a badge, a pill edge), never a surface. Green and turquoise are small details; pink and orchid are the secondary tints.
4. **Components:** `.pd-panel`, `.pd-tile` (`data-tone` leaf | pink | gold), `.pd-badge`, `.pd-btn` (primary), `.pd-btn-quiet`; the older `herbal-frame/panel`, `pixel-tile`, `uses-tiles` and `photo-slot` are expressed in the same terms rather than duplicated.
5. **Width:** wide screens cap reading columns (Herbalism hero 28rem, Challenges and Progress 46rem); paired panels share a height; nothing sits as a narrow island in a wide frame.

## What changed
- Herbalism: dark plum data panels (unreadable dark-on-dark) are now light lavender/orchid with dark ink; pixel icons and gold accents kept; hero photo capped.
- Plant detail: selected tab is deep violet with white ink (it was pale with white ink); the grey Traditional Uses strip is three separate botanical tiles (leaf, pink, gold); note text is readable; mastery stages are one connected rail with a solid path and the primary "Log a sighting" action is a proper button.
- Scan: one obvious camera tile ("Take a photo", camera glyph, plain instruction) and two quieter dashed optional tiles; supporting angles read as optional when the camera needs one photo (display only; `minPhotosFor`, consent and collection eligibility untouched).
- Field Research joins the lavender ground (it was the old dark navy page).
- Three small texts that measured 4.34-4.37:1 now clear 4.5:1.

## Verified
- Full `vitest` (2710 passed), `tsc`, lint on touched files. Overflow checked at 320, 375, 390 and 1280 on plant detail (all tabs), Scan, Field Research, Collection, Garden, Learn, Journal: none.
- Contrast audit on the plant tabs, Scan, Research, Collection, Garden at 390 and 1280: no non-gradient failures (the audit flags text on gradients as approximate; the Herbalism pills are cream on deep violet, about 9:1).
- Live: the restyled build, configured for the TEST project, ran the camera regression (5 camera opens = 1 session, consent decline sends nothing, offline retry succeeds, one claim, repeat shows "Already in your collection") against the real backend: identical results. Throwaway account deleted.

## Not done yet (other lanes' files; same rules apply)
Seasons (quests lane), Leaderboard (discoveries lane), Account (coordinator) still use the older dark theme; Seed Shelf is intentionally the wooden wall. Garden, Learn, Journal, Collection and Home already use the lavender ground and were left as approved.
