# Page themes: one world, a different atmosphere in each place

Status: **Scan, Collection and Garden are applied. The other six are defined in `globals.css`
and `src/lib/page-themes.ts` and wait for their pages.** Nothing here recolours a component.

## How it works

- `PageAtmosphere` (server component) renders one fixed, `aria-hidden`, gradient-only layer.
  A page opts in with `<PageAtmosphere theme="scan" />`.
- It sits at `z-index: -20`: over the global body gradient, under `SiteDecor`'s hills and stars,
  so the existing scenery still stands in front.
- It is `position: fixed`, not `background-attachment: fixed` (which iOS Safari ignores), and it is
  plain HTML in the page, so there is no flash of the wrong world on navigation.
- Per theme, `globals.css` sets `--pt-a` (ground, dominates), `--pt-b` (light, upper third),
  `--pt-c` (light, lower third), `--pt-accent`, `--pt-accent-2`. Royal purple is washed into every
  theme so the blue and green worlds stay Plantdex. Collection adds a faint pink `--pt-glint`.
- No animation, filter, blur or large blobs. A 2px dotted accent line at the very top is the pixel touch.
- The bottom navigation is the same solid brand plum on every page (`nav-bar`): `#1C1033`, idle
  `#B8A4D3`, active `#F2C75C`, divider `#563B76`.

## Palettes (ground, light, light, accent, accent)

| Page | Status | Ground | Upper light | Lower light | Accents |
|---|---|---|---|---|---|
| Home | defined | #170D2B | #38205B | #512B86 | #F2A7CF, #F2C75C |
| Scan / Identify | **applied** | #14152F | #243D70 | #235B69 | #6FD5C2, #B9A1F2 |
| Collection / Herbdex | **applied** (index) | #170D2B | #34205F | #59308C | #F2C75C, #B786F1 (glint #F2A7CF) |
| Garden | **applied** | #171C2C | #294A42 | #40305F | #8CC78B, #C5A5E9 |
| Field Journal | defined | #24152E | #58304E | #744366 | #F2A7CF, #F5D58B |
| Learn | defined | #211B40 | #414C83 | #5A477E | #AFC3FF, #F2D58B |
| Quests | defined | #27152D | #663B57 | #89526B | #FFAA93, #F4CD75 |
| Field Board | defined | #190F30 | #43256C | #63418B | #FFD66B, #C6A4F5 |
| Boss Forms | defined | #220D38 | #572477 | #803C84 | #EF8AD0, #FFD86F |

## Strengths are set by contrast, not by taste

The spec's lighter colours are only allowed to be the ground's lighting, at low strength. The
lighting alphas (upper light 60% by default, lower light 75%, royal wash 25%, accent glow 9%, glint 11%, plus per-theme overrides and a vignette that keeps the edges dark) were
tuned so that the dimmest text colour used directly on a page (`violet-400`) stays at or above
4.5:1 over the brightest point of every applied background (4.84 to 5.96 measured). When applying
a new theme, re-measure: its lower light is brighter than the plum default.

## Not changed on purpose

Rarity, warning, success and safety colours; panels, buttons and cards (they stay the shared
Plantdex surfaces; the brand surface values `#30204D`, `#432B65`, `#7654A0`, `#8050C4` are not
applied and remain targets); photographs; pixel artwork.

## Applying a theme to another page

1. Add `<PageAtmosphere theme="journal" />` inside that page.
2. Add the id to `ACTIVE_PAGE_THEMES` and the route to `page-themes.test.ts`.
3. Measure contrast on the real page, then screenshot at 375 and 390.
