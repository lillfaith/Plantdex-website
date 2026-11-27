# PlantDex player-facing UI audit (read-only)

Subject: `integration` at `9a7c48c`, built locally (`npm run build`, static export, no Supabase configured) and driven with Playwright at 390px (DPR 2) and 1280px.
Everything here is a real screenshot of the real build, not a mockup. The "seeded" player is a local-storage state I wrote (16 finds, 8 learned, 4 mastered) so progression screens have content; no real user data is used.
Files: `contact-sheet-1-journey.png`, `contact-sheet-2-progression-and-world.png`, individual shots in `m/` (mobile) and `d/` (desktop). Tall pages are JPEG-compressed full-page captures; in full-page images the fixed bottom nav appears mid-image (capture artefact, not a bug). `capture-log*.txt` list what rendered.

**Could not be rendered, and not faked:** the identification result and candidate list (needs the Supabase `identify-plant` function and a signed-in session, absent from a local build); the live camera (not mounted); the Field Board with real standings; sign-in/out. I did not simulate them.

## 1. What the player sees today (contact sheets)
Sheet 1 is the journey: welcome intro, Home, Scan, empty Collection with "Make your first find", a locked card, the two-tap discovery, the reveal, a seeded Collection, and one card with its four tabs. Sheet 2: Profile, Garden (seeded and empty), Quests (Everywhere and Georgia), Field Research, Field Board, Journal, Seed Shelf, Learn.

## 2. The journey, transition by transition
| Step | Player sees / does | Feedback | Backend | Works today? | Missing or confusing |
|---|---|---|---|---|---|
| Open app | Full-screen purple intro, "Welcome to Plantdex", Start Collecting / Skip | Pixel meadow, progress dots | None (local flag) | Yes | Intro says "Every real find unlocks a card" but nothing yet enforces a real find |
| Onboard | Six scenes (welcome, collect, Field Board...), then "Show me around" spotlight tour of real pages (8 steps seen) | Dots, back/next | Local flag only | Yes | Does not teach camera scanning as the way to collect (it does not exist yet); tour lands on Garden, not Scan |
| Scan | Heading "Identify a Plant", Level 1 bar, daily scan goal 5/5, three photo slots (Whole plant, Leaf+stem, Detail), safety notices | Static | Edge function identify-plant (not exercised here) | Mounted; not exercised | OS camera / file picker, not live capture; no third-party sharing notice at the point of upload; heavy safety text below the fold |
| Identify / Review | Candidate list, confidence wording | Not rendered | Provider + matcher | Unverified in this audit | Needs a real-device pass |
| Confirm | Dialog "Add card #01 to your collection? Only if you actually found it outdoors... 100 XP, once." Yes / Cancel | Blurred backdrop | Local reducer, or server when signed in | Yes (shown via the card page path) | This honour-system step is exactly what V1 replaces with camera-required eligibility |
| Discover / Collect | Reveal modal: "Your Herbalist Journey Begins!", the card, +100 XP, Level bar, First Find, Roadside Botanist, Amber Ring unlocked | Modal with achievement tiles | Discoveries, achievements | Yes | Reveal is a static dialog; no card-flip or burst I could observe |
| Earn XP | Collection header: Lv, XP bar with Field Card diamond marker, 16/45, learned, mastered | Bar fill | Derived from records | Yes | Level names and XP numbers are dense for a first-timer |
| Learn / Master | Card page: card front, flip button, sprite, three stages, four tabs (Identify, Herbalism, Challenges, Progress) | Stage chips | Reducer / edge function | Yes | Long scrolling page; tabs sit below a tall card |
| Quest | /quests: region picker (Everywhere or Georgia); Georgia shows "31 plants confirmed" and a "Start here 0 of 5 found" group | None | Static data, device-local region | Partly | Not in the nav; no completable quest, no reward, no Habitats view, text-heavy |
| Garden | Grid of sprites by stage (Mastered / Learned / Discovered), "Find it again", "Learn its card" | Sprite stage art | Mirrors mastery | Yes | Not a placeable garden: a fixed grid you cannot arrange; no ambient life |
| Progress | Profile: avatar slot, Level 6, 36% ring, achievements 10/16, Field Cards 4/9, habitats bars, recent finds, growing-now strip, frames and titles cabinet | Rings and bars | Derived from records | Yes | Very long page (about 6,000px); "Unnamed" avatar slot empty by default |

## 3. Frontend versus backend matrix (25 rows)
| Category | Rows |
|---|---|
| **Fully functional UI (13)** | Home and bottom nav; welcome intro and spotlight tour; Collection gallery; card page with four tabs; two-tap discovery and reveal; XP and levels; achievements and frames (First Find, Amber Ring); Profile; Field Research; Field Board page; Journal; Seed Shelf; Learn |
| **Functional but visually unfinished (3)** | Garden (a fixed grid, no placement); Georgia quest board (picker + groups, no completable quest); Scan screen (mounted, dense, OS camera hand-off; identification not exercised here) |
| **Frontend built but not connected (2)** | Live in-app camera logic (`scan-capture*.ts`, flag off, no screen); Boss Form challenges (built, flag off, draft bank) |
| **Backend complete, UI missing (2)** | Habitats view-model (imported by no component); `confirm_scan` server path (TEST only, client flag off) |
| **Prototype or placeholder (1)** | Five-card expansion pilot (data pipeline; preview on a branch) |
| **Not yet implemented (4)** | Third-party photo consent notice; a complete Georgia quest; Poster Carousel Habitats interface; native iOS shell |
Per-row detail (backend, components, mounted, flag, interactable, persistence, e2e, deployed): backend and components exist for every row except the last category; "mounted" is true for all but the two "not connected" and two "UI missing" rows; flags: camera, scan RPC, boss forms, multi-region and expansion are OFF; persistence is local storage signed out and Supabase signed in; end-to-end tests are unit tests plus the TEST-only scan RPC suite, with no recorded real-device run; **deployment to production is UNVERIFIED** (the deployed branch is 37 commits behind `integration`).

Rough share, with the rule stated: count the 25 rows above. Fully functional UI = 13/25 (52%); including functional-but-unfinished = 16/25 (64%). This is a count of rows, not effort, and the rows are my grouping, so treat it as coarse. Backend is further ahead than frontend for progression (XP, mastery, RLS, leaderboard integrity), but the product's defining backend piece, camera-required server eligibility, is on TEST only and its player-facing UI does not exist.

## 4. Visual design versus your approved direction
| Direction | What I see | Match |
|---|---|---|
| Light lavender / purple backgrounds | The app is a dark theme (`color-scheme: dark`): deep plum and near-black violet with glassy panels. Lavender appears as accents and text only | **No: the biggest gap** |
| Pixelated and gamified | Pixel sprites, pixel meadow, chunky gold buttons, XP bars, Field Card diamonds | Strong on sprites and intro; panels are modern rounded UI |
| Early-2000s Paint inspiration | Hard-edged pixel art yes; chrome is not Paint-like | Weak |
| Pokemon-style collection and progression | Card art, rarity chips, 16/45 counters, level bar, achievements, cabinet | Strong |
| Cute botanical Garden characters | Sprites are charming and distinct | Strong |
| Clear mobile navigation | Six labelled icon tabs, gold active state | Strong |
| Rewarding discoveries | Reveal modal with XP and achievements | Good content, modest spectacle |
| Habitats Poster Carousel | Not built. `/quests` is text panels | Not started |
Match list: intro, card art, sprites, nav, Collection header, achievements match well. Need supervised redesign: the overall theme (dark vs light lavender), Garden, Quests/Habitats, Scan, Profile length, Field Board and utility pages (Journal, Seed Shelf, Learn look like generic dark panels).

## 5. Experience from a newcomer's seat
Verified from the screenshots: the intro is clear and attractive; the empty Collection has an obvious primary action ("Make your first find", "Find my first plant"); the discovery dialog and reveal are readable and reward with XP, First Find, Roadside Botanist and Amber Ring; the Garden explains growth rules in one line and says nothing grows by waiting.
Hypotheses (needs a playtest): the Scan screen asks for a lot (three photos, daily goal, long safety text) before any reward; the first scan will feel less exciting than the two-tap find because the tap path is faster than photographing; Profile and Collection pack many counters; Quests is not discoverable and not yet a game; the app feels like a polished collection of pages more than one cohesive game loop because Scan, Garden and Quests do not hand the player forward.

## 6. Work in progress, labelled separately (none shown as working)
On `integration` today: everything in the screenshots. In progress, not captured: **D5** receipt contract pushed (`ea3f401f`, docs only); **P4** protected pilot preview pushed (`b8a10880`), screenshots to come from that session; **iOS audit** pushed (`96d2d61d`); **S5** (camera, consent) and **Q4** (Georgia quest) have pushed nothing yet. No development preview is shown here.

## 7. Missing screens and interactions
Live camera capture screen; capture permission and denied states; third-party sharing consent; review/confirm screen tied to a server receipt; "not eligible to collect" state for imported photos; a card reveal with animation; Habitats Poster Carousel; a completable Georgia quest with a reward; placeable Garden; a simpler Profile; first-run that ends in a scan; sign-in prompt before Field Board; native shell screens.

## 8. Prioritised UI and gameplay improvements
1. Decide the light-lavender theme direction (supervised session) before any more screens are built. 2. Capture screen and consent (S5), then review/confirm/reveal with receipt. 3. Make the reveal a real moment (flip, burst, sprite entrance), reduced-motion safe. 4. Quests: nav entry, completable Georgia quest, Poster Carousel. 5. Shorten Scan (progressive disclosure of safety text, one-photo path where the provider allows) and Profile. 6. Garden: arrangement and a little life, no timers. 7. Onboarding ends in a first scan. 8. Restyle utility pages to match the game.

## 9. Next supervised visual-design session
Agenda: (a) the lavender palette applied to one reference screen (Collection) and to the Scan capture screen, with a before/after at 390px; (b) the Poster Carousel for Habitats, using the Q3 view-model; (c) reveal moment storyboard. Bring: this contact sheet, S5 and Q4 previews, and your lavender palette file.
