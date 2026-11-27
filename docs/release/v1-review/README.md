# V1 mobile review set (clean builds, real components)

Everything here is rendered from the actual app, not mockups. Two clean builds (`rm -rf .next out`) of the merged candidate branches, served statically, driven by Playwright at 390px (iPhone 13 emulation, DPR 2) and 1280px. Build flags: camera pilot ON, consent ON, Habitats preview ON, TEST Supabase URL and public key. Network calls to Supabase are stubbed so the identification states render; that proves the UI wiring, not the live service (the live evidence is the run-5 report).

| file | shows |
|---|---|
| `1-scan-states.png` | start, camera, one photo, consent, result, candidate review, confirmed, library photo (identify only), library result |
| `7-scan-full-page.png` | the whole scrollable Scan page at start, result and confirmed |
| `2-home-quests-habitats.png` | Home, regional quest entry, onboarding intro (unchanged), Quests, Habitats overview/open/sheets/About this data |
| `3-journal-learn-profile.png` | Journal, Learn, Profile |
| `4-nav-390.png`, `5-nav-bars.png` | the two navigation alternatives at 390, 360 and 320px |
| `6-desktop.png` | desktop views |
| `individual/` | every capture as its own JPEG |

## Navigation, measured (real component, `NEXT_PUBLIC_NAV_LAYOUT`)
Tab cell widths in px (every tab is 48px tall; the label stays "Collection").

| width | A: seven tabs | B: six tabs + More |
|---|---|---|
| 390 | 51 (Collection 60) | 62 |
| 360 | 46 | 56 |
| 320 | **bar overflows by 9px, Scan tab 33px** | 48 |

Both: no page-level horizontal overflow; More opens a panel with Journal and Learn (166x48 targets), closes on Escape, on navigation and on an outside tap, shows aria-expanded, and shows the active state when Journal or Learn is the current page. The bar keeps `pb-[env(safe-area-inset-bottom)]` and the app sets `viewport-fit=cover`; Chromium emulation reports a 0 inset, so **the home-indicator spacing needs the real iPhone**.

## Scan photo rule, verified in the browser
- Camera pilot ON, one in-app photo: "1 of 3 added - ready to identify", button enabled once consent is acknowledged.
- Library photo: "2 photos required", "Identification only - not eligible to collect", button disabled until a second photo. With two library photos the button enables, the result offers no collect action and says why.
- Camera pilot OFF (the default build): "2 or 3 photos", unchanged. The earlier screenshots were this build.

## Contrast audit
Every text node on Home, Scan (before and after a result), Quests, Habitats, Journal, Learn and Profile against its composited background, 4.5:1 (3:1 for large text): no failures. The one item the script flags ("Common", inside the onboarding intro) sits on that intro's own dark purple. The audit found and fixed the Home deck button (1.49:1) and nine Profile labels.

## Not covered
Safari/WebKit (Chromium only), the real home indicator and camera on a device, live identification, and the Habitats poster artwork (placeholder scenes, labelled as such on screen).
