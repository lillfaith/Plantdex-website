# V1 live gameplay rehearsal (2026-11-27): real backend, real provider, simulated device

TEST project only (`vgjehmwcpavflbfhbbrp`). Production (`vygiamigomwlvnwkryyl`) was not touched and its ref does not appear in the build.
Enforcement was **not** changed: the live `discovery_rules()` read by a signed-in account returned `enforcing: false`. Nothing here enables it publicly.
Backend suites were not re-run (no relevant backend change). About 6 PlantNet calls were spent in total (each throwaway account is capped at 10 a day; the shared daily pool was barely touched).

## Evidence labels (read this first)

| Label | Meaning |
|---|---|
| **REAL-BACKEND** | The app's real client code, in headless Chromium at iPhone 13 size, talking to the real TEST Supabase (auth, RLS tables, RPCs, edge functions) and the real identification provider (PlantNet) with a real field photograph of ragweed fed through Chromium's fake camera device. Nothing in the network path is stubbed. |
| **SIMULATED** | Anything the browser cannot genuinely reproduce: the iOS camera permission prompt, Safari/WebView behaviour, real handheld photography and lighting, touch targets under thumbs, safe areas, haptics, Dynamic Type, VoiceOver. These are **not** proven by this run and are listed as open on the real-iPhone checklist. |

The fake camera shows a still photograph, so it proves the app's capture flow and the server's receipt flow, not the quality of a handheld shot.

## 1. What works, what is disabled, what is missing (one list)

**Works (REAL-BACKEND unless noted)**
- Welcome intro, sign up (TEST has email confirmation off, so a new account is signed in at once), sign out and sign in again.
- In-app camera path, per-session consent ("Send your photo to identify?") before anything leaves the device, one camera photograph is enough, identification of a real ragweed photograph (top candidate 0.94, carries a receipt), candidate review (traits, easily confused with, habitat), confirm, receipt-backed claim (`claim_discovery`), sighting + discovery + achievements written, celebration dialog (+100 XP, First Find, Roadside Botanist, Amber Ring).
- Collection (1/45, 100 XP, recent finds), Profile (level, field record, achievements 2/16), Garden (planted, "Discovered", no timers), Georgia quests (region list marks Ragweed "Found").
- Everything above is identical after sign out and sign in (collection, XP, profile, garden restored from the server). Signed out, the same device shows 0 progress (nothing leaks between accounts).
- Library photos identify only: no collect offer, no XP, no claim call (two library photos of the same ragweed returned the same species and wrote nothing but a scan row).
- Failed identifications: a non-plant (flat grey) returns "Nothing was recognised" with a way forward; a species with no card offers the Seed Shelf, no XP, and saving it worked (`seed_shelf` row + `seed-packet` function 200); offline mid-identify says "The identification service could not be reached" and the button stays usable; consent "Not now" sends nothing (0 identification POSTs).
- Camera start failure (permission denied) leaves a usable screen: "Try the camera again" / "Use a library photo instead" / "Cancel".

**Disabled by configuration (committed defaults; the preview build turns the first three on)**
`NEXT_PUBLIC_CAMERA_CAPTURE`, `NEXT_PUBLIC_SCAN_CONSENT`, `NEXT_PUBLIC_CONFIRM_SCAN_RPC` (off in production builds), discovery enforcement (OFF on TEST, never public), Habitats preview, Boss Form challenges, plant-core prototypes, comparison mode.

**Missing / unproven**
- Any real iPhone run (camera permission prompt, Safari camera behaviour, handheld photos, safe areas, VoiceOver, Dynamic Type).
- A private HTTPS URL for the phone: none exists yet (needs a restricted action, see section 2).
- Provider outage recovery shown live; Goldenrod earns no receipt; representative field-photo evidence for the eligibility floor; shared provider budget abuse control; "see the same screen after the player leaves and returns to the camera" (see blocker 1).

## 2. Minimum steps for a private real-iPhone test

The camera needs HTTPS. Nothing in this environment is reachable from a phone, and the production host must not be used. Two routes; the first needs no account.

**Route A (no account, about 10 minutes, owner's computer):**
1. `ANON_KEY=<public TEST anon key> docs/release/rehearsal/scripts/build-test-preview.sh` (refuses any non-TEST URL, refuses a service_role key, fails if the production ref is in the output, writes `robots.txt` Disallow-all).
2. `npx serve out -l 3000`
3. In a second terminal: `cloudflared tunnel --url http://localhost:3000` (prints a random `https://….trycloudflare.com` address; it stops when the terminal closes; nothing is published anywhere else).
4. Open that address on the iPhone in Safari. Create a throwaway account (any `@example.com` address; TEST needs no email confirmation).

**Route B (a stable private URL, needs the owner's Cloudflare login, free):** Cloudflare Pages direct upload of `out/` plus Cloudflare Access (one-time email PIN) so only listed addresses can open it. Needs a credential and an account, so I have not done it.

Cleanup afterwards: stop the tunnel; delete the throwaway account from Profile > Delete your account (export first if wanted).

## 3. PASS / FAIL checklist (reproducible)

Reproduce the browser column with `scripts/make-cameras.sh`, `scripts/journey.js` and `scripts/scen.js <scenario>` (instructions at the end). The "real iPhone" column is what still has to be done by hand.

| # | Player behaviour | Browser, REAL-BACKEND | Real iPhone |
|---|---|---|---|
| 1 | First launch shows the welcome intro; skipping it works | PASS (`01`, `02`) | open |
| 2 | Sign up creates an account and signs in | PASS (`04`; `POST /auth/v1/signup` 200) | open |
| 3 | Consent appears before any upload; "Not now" uploads nothing | PASS (`09`; 0 identify POSTs after Not now: `notnow.json`) | open |
| 4 | Camera opens, one photograph is enough | PASS (`07`, `08`) | open (real prompt) |
| 5 | Camera permission denied leaves a usable screen | PASS (`denied.json`: retry / library / cancel) | open (iOS wording, Settings path) |
| 6 | Identification returns candidates in seconds with honest wording | PASS (`11`; ragweed 0.94; "A suggestion, not an identification") | open |
| 7 | Candidate review shows traits and lookalikes; confirm is explicit | PASS (`12`) | open |
| 8 | Confirm records a find and plays the unlock celebration | PASS (`14`: +100 XP, First Find, Roadside Botanist, Amber Ring; calls: `claim_discovery`, `sightings`, `discoveries`, `confirm_scan`) | open |
| 9 | Collection, XP, achievements, Garden reflect the find | PASS (`15`, `16`, `17`) | open |
| 10 | Georgia quests reflect the find | PASS (`georgia-1`: Ragweed "Found") | open |
| 11 | Sign out then in restores everything | PASS (`20` empty signed out, `22`/`23`/`24` restored) | open |
| 12 | Library photos cannot unlock a card | PASS (`library.json`: no collect offer, 0 XP, no `claim_discovery`) | open |
| 13 | Repeating a find does not duplicate rewards | PASS (`repeat.json`: the same photo identified again shows "Already in your collection", offers no confirm, no `claim_discovery`, XP stays 100) | open |
| 14 | A non-plant gives a usable result, no reward | PASS (`blank.json`: "Nothing was recognised", 0 XP) | open |
| 15 | A species with no card offers the Seed Shelf, pays nothing | PASS (`offdeck.json`: packet saved, 0 XP) | open |
| 16 | Network loss during identify gives an honest message | PASS (message) / **FAIL (recovery)**: see blocker 2 | open |
| 17 | Reopening the camera repeatedly never locks the player out | **FAIL**: see blocker 1 | open |
| 18 | No horizontal overflow at 320px / 390px on Home, Collection, Garden | PASS (checked on the palette build) | open |
| 19 | Dynamic Type, VoiceOver, safe areas, thumb targets | not testable in a browser | open |

## 4. Launch blockers, ranked

1. **HIGH: abandoned camera sessions lock the player out of collecting for up to ten minutes (reproduced live).** Every time the camera panel opens, the app calls `open_capture_session`; the server allows 3 open sessions (TTL 600 s) and 60 a day, and the client never releases one it does not use. Denying the camera, tapping "Not now", or leaving the page each strand a session. After three, the next attempt shows "The camera session could not be started, so this photo can only look a plant up", and "try the camera again" cannot work until a session expires. This is what a first-time iPhone tester will do (deny, retry, cancel). Fix is client-side and small (reuse the session already open in this tab until it is used or expires, and open one only when a photo is actually taken); a server release call would need a migration, which is out of scope. Scan lane.
2. **MEDIUM: after a network failure the retry cannot collect.** Offline during identify, then back online, "Get Identification" again shows the same camera-session message and sends nothing, so the recovery is "take the photo again", but the message does not say so. Same area as blocker 1.
3. **MEDIUM (open, from earlier audits): provider-outage recovery is proven only by unit tests and a local database**, never live; the shared daily provider budget can be drained by many cheap accounts; Goldenrod (`legacyGenus`) can never be newly collected by camera once enforcement is on; the receipt confidence floor (a 1% hallucinated candidate can earn a receipt) needs the owner's decision before enforcement is ever turned on.
4. **LOW: TEST has "Confirm email" off** (observed `mailer_autoconfirm: true`). Right for rehearsal; it must be ON for production and the production auth check (`check-auth-config`) is the guard.
5. **LOW: the Seed Shelf mint wrote a permanent global row on TEST** (`magnolia grandiflora`). Intended behaviour of the registry (immutable, undeletable); harmless on TEST, listed so it is not a surprise.

## 5. Cleanup record

Eight throwaway accounts were used (all `rehearsal-<stamp>@example.com`). All eight were deleted through the app's own `delete-account` function (each returned `{ok:true}` and each sign-in afterwards was refused), which also shows that function works on TEST. The global `species_packets` row for Magnolia grandiflora cannot be deleted by design. No production resource was read or written.

## 6. How to reproduce the browser run

```
docs/release/rehearsal/scripts/make-cameras.sh            # fake camera feeds from field/ photographs + a grey frame
ANON_KEY=… docs/release/rehearsal/scripts/build-test-preview.sh && (cd out && python3 -m http.server 4300 &)
node docs/release/rehearsal/scripts/journey.js            # onboarding -> sign up -> consent -> camera -> identify -> confirm -> collection -> sign out/in
node docs/release/rehearsal/scripts/newstate.js x && STATE=/tmp/rehearsal/state-x.json node docs/release/rehearsal/scripts/scen.js library   # also: blank offdeck offline notnow denied repeat georgia
```
Each run signs up fresh throwaway accounts and spends about one PlantNet call per scenario that identifies. The scripts expect Playwright (global) and ffmpeg.
