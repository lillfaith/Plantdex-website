# V1 playable flow: what was walked, what is automatable, what needs the iPhone

Walked on 2026-11-27 against a local static build of `integration` (commit `370d9b0a`, which includes lavender V3 #79) at iPhone 13 emulation (390x844, DPR 3),
configured with the TEST Supabase URL and public key and the preview flags `NEXT_PUBLIC_CAMERA_CAPTURE=on`, `NEXT_PUBLIC_SCAN_CONSENT=on`,
`NEXT_PUBLIC_CONFIRM_SCAN_RPC=on` (committed defaults stay `off`). Evidence labels: **LOCAL-UI** = real app code in a real browser, backend responses mocked in the browser,
so it proves the front-end wiring and wording only; **LOCAL-REAL** = real app code with its real local-storage persistence, no backend; **LIVE** = the TEST backend (runs 2-4 of the live suite).
Nothing here touched production or spent a provider call.

## The flow, step by step
| Step | Result | Evidence |
|---|---|---|
| Onboarding: welcome intro (6 scenes, skip, "Start collecting") | renders, original pixel art, no overflow at 390px | LOCAL-REAL |
| Camera: permission, in-app capture, consent ("Send your photo to identify?" with Send photo(s) / Not now) | works with a fake camera; consent appears before any upload; library photos are labelled identify-only | LOCAL-UI |
| Identification: result panel, suggestion-not-identification caution | works; see findings 3 and 4 | LOCAL-UI |
| Review: trait checklist ("Check traits") then "This matches my plant" | works | LOCAL-UI |
| Collectible reveal: celebration with XP, level, achievements, frame, "Open its card" | works (+100 XP, First Find, Roadside Botanist, Amber Ring) | LOCAL-UI |
| Collection / XP / achievements after a reload | 1/45, 100 XP, level bar, recent finds correct after reload | LOCAL-REAL |
| Garden | the plant appears planted ("Discovered"), no timers; 1 of 45 | LOCAL-REAL |
| Georgia quests | Georgia region view works (31 confirmed species; "Start here 0 of 5", "The collection 0 of 6") | LOCAL-REAL; but see finding 1 |
| Persistence after signing out and back in, and across devices | NOT covered here: needs a real account | LIVE (backend proven in run 3); client untested |
| Server receipt + claim through the real client | the backend half is LIVE; the client sequence (claim, then upsert) is permitted by the 0016 gate when a receipt is claimed, but was not driven against TEST by the app itself | LIVE (backend) / unverified (client) |

## Findings (player-facing)
1. **Quests cannot be found.** `/quests` is not in the six-tab nav, and the only component that links to it (`RegionTeaser`) is not rendered anywhere. A player reaches the Georgia quests only by typing the URL. Needs an owner decision on placement (the nav ceiling is seven labels).
2. **Fixed in #110 (scan lane):** signed out, the camera note said "1 camera photo needed / ready to identify", then the failure blamed "the camera session". Now it says to sign in to collect. The leaf-and-stem slot also read "Required" beside "1 camera photo needed"; now optional in the one-photo flow.
3. A synonym match (*Taraxacum campylodes*, 0.45) is headed "Genus: Taraxacum, exact species uncertain" although the server accepted it as an exact synonym. Wording disagrees with the receipt; scan lane, copy decision.
4. After one confirm, both candidates that map to the same card show "Added". Harmless, slightly confusing.
5. Signed out the daily goal reads "5 of 5"; signed in "10 of 10". Fine if the deployed limits match; not verified against the deployed function.
6. The Scan, Home and Quests pages are still the older navy/plum themes by the owner's own decision ("no global roll-out until the owner approves the final screenshots", `decisions.md` item 5). The lavender V3 is on Collection, card profile and Garden only.

## What a browser can test and what needs the physical iPhone
- **Browser-automatable now (no device):** layout and overflow at 390px for every route; onboarding; consent gating (no upload before consent); the capture UI with a fake camera; result, review, confirm, celebration wording; XP, achievements and Garden after reload; refusals and error messages; contrast checks.
- **Backend (already automated live):** session, identify, receipt, claim, replay, forged/expired/cross-account, enforcement ON/OFF.
- **Needs the iPhone:** the real camera permission prompt and denial recovery, Safari/WebView camera behaviour (orientation, exposure, `getUserMedia` after backgrounding), real plant photographs and real provider scores, touch targets and the dynamic island/home-bar safe areas, haptics, Dynamic Type and VoiceOver, airplane-mode mid-identify, and the Capacitor/TestFlight shell (later).

## A TEST-connected preview
- Build: `NEXT_PUBLIC_SUPABASE_URL=https://vgjehmwcpavflbfhbbrp.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=<public TEST key> NEXT_PUBLIC_CAMERA_CAPTURE=on NEXT_PUBLIC_SCAN_CONSENT=on NEXT_PUBLIC_CONFIRM_SCAN_RPC=on npx next build`, then serve `out/` as static files. The anon/publishable key is public by design. (`npm run verify` also builds into `out/` with defaults; copy the preview build elsewhere first.)
- It cannot be opened on an iPhone from this environment: nothing here is publicly reachable, and the only public host wired up is the production deploy, which must not be used. Options for a phone-reachable private preview each need the owner's approval: a temporary non-production static host, or going straight to the Capacitor/TestFlight build.
- A preview signed in to TEST needs a real TEST account; sign-up requires email confirmation on TEST unless the owner decides otherwise, and an account created that way is not cleaned up by the live-run workflow.

## Launch issues still open
Goldenrod earns no receipt; `SPECIES_ATTESTATION_SECRET` unverifiable with the current token; provider-outage recovery not demonstrated live; shared daily provider budget (many cheap accounts); representative field-photo evidence for the eligibility floor; real-device camera testing; refuse-before-quota fix merged (#109) but not deployed to TEST.
