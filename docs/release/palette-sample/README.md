# Lavender palette sample: Collection screen (supervised, NOT propagated)

Branch `ui/palette-sample`. Real build, real components, 390px screenshots: `collection-before-after.png` (top row BEFORE = integration `9a7c48c`, bottom row AFTER),
individual shots in `before/` and `after/`. Only the Collection page (`/herbdex`) changes; every other page is untouched. No card art, sprite, data, database or flag was touched.

## Card violet: sampled, not guessed
Sampled at six points on each of the 45 approved card thumbnails (`public/cards/thumb/*.webp`, 270 points). Dominant values: **#9820F8 / #9B21FA / #9D21F8** (134 points, the card field and border),
**#A838F8 / #AC3FF8** (lower panel), **#C868F0** (light ribbon), **#A94FD6** (title bar). The existing token `--color-violet-600: #9C21F8` already matches the dominant value, so no new violet was invented.

## Exact tokens used
| Role | Token / value | Where |
|---|---|---|
| Light lavender ground | `#C9A4F8` (`--pt-a`), lights `#E2CFFC` (`--pt-b`), `#B98CF2` (`--pt-c`) | Collection page ground (page-theme `collection`) |
| Card violet | `--color-violet-600` `#9C21F8` | Selected tab, chip, panel edges, heading plate edge, top dotted line |
| Card violet shadow | `--color-violet-800` `#56108A` | 3px pixel drop under plates, link ink |
| Dark plum | `--color-plum-900` `#211827`, `--color-plum-800` `#2B2033` | Heading plates, progress header, panels, footer, search field, tab bar |
| Ink on lavender | `--color-violet-900` `#3D0A63` | Subtitles, counts, "Filters" label |
| Pink | `--color-pink-accent` `#F280B3` | Selected tab bar (3px pixel), link underlines, ground glint |
| Gold | `--color-gold-500` `#FFD54A`, existing gold text | Heading text on plates, XP, safety notice border, CTA |
New utilities in `globals.css`: `ground-ink`, `plate-plum`, `edge-card-violet`, `chip-card-violet`, plus rules scoped to `[data-ground='lavender']` (opaque plum panels, safety notice plate, footer band, hidden dark scenery).

## Measured contrast (WCAG)
Ink `#3D0A63` on `#C9A4F8` 7.1:1; on `#E2CFFC` 10.2:1; on `#B98CF2` 5.7:1. Link `#56108A` on `#C9A4F8` 5.5:1. White on card violet 5.3:1. Gold on plum-900 10.8:1. All at or above 4.5:1.
Not run: the full browser contrast suite (needs the built export); `npm run verify` result is in the PR.

## Decisions I made that you should judge
1. Gold TEXT never sits directly on lavender (about 1.4:1): headings sit on dark plum plates with a card-violet edge.
2. Panels on lavender are opaque plum; translucent plum went muddy grey-purple.
3. The dark hills/stars scenery is hidden on this page (dark mounds ran behind dark ink). Lavender-tinted pixel scenery is the follow-up if you want it back.
4. Footer and safety notice become plum bands/plates; safety wording and placement are unchanged.
5. The selected tab changed from a pink-to-lilac gradient with dark text to card violet with white text and a pink pixel bar.

## Not in this sample (waiting for your approval)
Card profile pages, Scan, the Discovery reveal, and every other screen. Scan and the reveal share files with the running S5 camera work; they will go through the ownership process after you approve the balance here.

---
# v2 (owner feedback: lighter, one family, "UI cohesive to" the Habitats references)
`v2-collection-and-card-before-after.png`, `v2-habitats-preview.png`, individual shots in `v2/`.

## What changed from v1
Dark plum is now reserved for the bottom nav, primary CTAs and small emphasis. Panels, sheets, tiles, inputs, the progress header and the safety notice are pale lilac with deep-violet ink; headings are ink on the lavender (no plates); the selected tab is a light pill with a card-violet bar; the XP track and level pill are lilac.

| Role | Token / value |
|---|---|
| Ground | `#C9A4F8` (lights `#E2CFFC`, `#B98CF2`) |
| Surface (panels, sheets, tiles) | `#EEE3FD` pale lilac; `#F7F0FF` lighter (inputs, selected tab, collected tiles) |
| Surface 2 (tracks, locked tiles) | `#DDC8FA` soft lavender |
| Edge / drop | `#8A5BD0` / `#B48AEE` (muted card purple) |
| Card violet (sampled) | `#9C21F8` (chips, selected-tab bar, top dotted line) |
| Ink | `#3D0A63` (headings, body), `#4F1D82`, `#5F2F94` (secondary) |
| Deep plum (emphasis only) | `#211827` nav + CTA; `#3D0A63` strong text |
| Pink | `#F9C9E6` habitat label pill; `#F280B3` underlines |
| Gold | `#FFD54A` collected check, progress fill, XP; deepened ink-gold `#7D4D08` for gold text on lilac |
| Rarity words on lilac | common `#2F5F8F`, uncommon `#8A5300`, rare `#A8326A`, epic `#0B6A96` |
Contrast (WCAG): ink on surface 12.0:1, on `#F7F0FF` 13.3:1, on ground 7.1:1; secondary ink 9.3 and 7.3:1; ink-gold 5.8:1; rarity words 4.9 to 5.4:1; white on deep plum 17:1; ink on pink pill 10.2:1; ink on gold 10.5:1. Browser contrast suite not run.

## Known leftovers for your call
- The "Field identification" section of a card page keeps its existing parchment-and-wood field-guide look; it now sits on lavender and is the one place the old identity shows through.
- The empty avatar slot is still a dark tile (component not touched); small, but dark.
- Hills/stars scenery stays hidden on lavender pages.
- Scan and the discovery reveal not yet restyled (shared with the S5 camera work; ownership process).

## Habitats: DEVELOPMENT PREVIEW, not on integration
Branch `ui/palette-sample-habitats` (not for merge: new files are Quests-lane territory and the real Q4 trail is separate). It renders from the real `habitatsViewModel` (poster carousel with thumbnail strip, "Explore" CTA, labelled three-column sprite grid with silhouettes, occasional section and legend, bottom sheet, About-this-data sheet), real sprites and the real data note. The five poster scenes are PLACEHOLDER rectangles, not approved art. The "Quests" tab is a label only. Nothing records a discovery or pays XP. Off unless `NEXT_PUBLIC_HABITATS_PREVIEW=on`.

---
# v3 (owner refinements A, B, C on top of lavender V2)
`v3-glow-and-recent-finds-before-after.png`, singles in `v3/`. Applies to Collection, card profile and Garden only; scoped by `data-ground="lavender"`.

**A. Glows, not shadows.** Dark card/sprite shadows are replaced by restrained outer glows (box-shadow and gradients drawn OUTSIDE the art, so pixel edges stay crisp; no filter on artwork). Tokens: `--glow-violet` rgb(156 33 248) for every found card and the profile hero card; `--glow-pink` rgb(242 128 179) for learned; `--glow-gold` rgb(255 213 74) for mastered, the one earned reward. Locked cards get only a soft light-plum lift (no glow). Panels and containers do not glow. Sprites (Garden, Recent Finds) sit in a soft radial pool of the same colour behind them. The hero card's `drop-shadow` is now `--hero-drop` (violet) on lavender pages and unchanged elsewhere.
**B. More card violet.** Selected profile tab and active filter chips (`#9C21F8`, white text, pink bar), the collectible number and stage markers on card tiles (`--color-violet-700`), a card-violet top bar on the progress header, pixel diamonds either side of "My Collection", glows above, and the Recent Finds node edge. Panels stay lilac.
**C. Recent Field Finds.** Sprite node 48px to 72px (+50%), a two-line grid (name, then date and status) so nothing wraps or crops at 390px, and a subtle card-violet pool behind each sprite (gold for mastered, pink for learned). Source art and pixel dimensions untouched; rendering stays pixelated. Scoped to the lavender Collection: the Profile page's copy of this list is unchanged.
**Garden sample** uses the same lavender ground (an override of the garden theme variables for this sample only; the stylesheet's garden palette and its test are untouched).
**Not done / for your call:** the sprites remain small inside their frames because the authored art leaves empty space; a measured ink-fit (as the avatar badge uses) would enlarge them further but is a bigger step than the +50% you asked for.

**v3b (owner: "still shading instead of glow").** A violet halo on a lavender ground only darkens it, which reads as shading. Glows are now LIGHT: a thin saturated ring (card violet, pink or gold) plus a luminous outer halo that is brighter than the ground (white-lilac for found cards, pastel pink for learned, pale gold for mastered). The profile hero card, the gallery tiles, the Recent Finds nodes, the Garden sprite pools and the selected tab all use it. Still box-shadow and gradients outside the art; pixel edges untouched.
