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
