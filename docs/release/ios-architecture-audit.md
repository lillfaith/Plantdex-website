# iOS architecture feasibility audit (2026-11-26)

Status: **audit and recommendation only. No native conversion has begun.** Written by the coordinator lane on `coord/ios-feasibility`.
Scope: owner-approved, limited. Nothing here changes `src/`, `next.config.ts`, the root `package.json`, workflows, credentials or any deployment.
Read with `docs/release/app-store-readiness.md` (which this answers) and `AGENTS.md`.

Legend: **[repo]** read from this repository (path cited). **[ran]** measured in this sandbox. **[web]** from a web search, source linked. **CHECK** = not verified; must be confirmed before relying on it. **[judgement]** my estimate, not a fact.

---

## 1. Recommendation (read this first)

**Wrap the existing static export in Capacitor, add a small set of real native features, and ship through TestFlight first. Do not rebuild. Do not load `plantdex.online` inside a thin WKWebView.**

Lowest-risk path, in order:

1. **Stage 0 (no purchase, no Mac): make the web app a good iPhone web app.** Add a PWA manifest and icons. It carries no review risk and is the fallback if Apple refuses the app. It is not an App Store listing.
2. **Stage 1 (owner decisions, section 11):** approve the $99/yr Developer Program, a Mac or cloud-build budget, and the purchase/UGC stances below.
3. **Stage 2 (a Mac for about 2 days):** spike the bundled export in a Capacitor shell on a real iPhone, answering the CHECK items in section 12 *before* committing to a plan.
4. **Stage 3:** TestFlight internal, then external, with the review-driven changes (consent for third-party identification, camera/offline behaviour, hiding or gating anything risky).
5. **Stage 4:** App Review with a demo account and notes.

**Why Capacitor over the alternatives** (detail in section 9): the codebase is already a pure static export with zero server dependency, so Capacitor is a packaging step rather than a port. The one alternative that beats it on risk, a PWA, is not an App Store app, so it is a fallback and a Stage 0, not a replacement. A thin WKWebView pointing at the live site is the worst on review risk (it is exactly what guideline 4.2 targets) and on offline behaviour.

**The three biggest risks are not technical:** (1) guideline 4.2 "repackaged website", (2) the physical-deck code that unlocks a digital entitlement (guideline 3.1.1), and (3) sending a user's plant photo to a third-party identifier with no explicit consent step (guideline 5.1.2(i)). All three have mitigations in the plan.

---

## 2. Next.js export, base path, routes, loading under `capacitor://`

| Finding | Evidence |
|---|---|
| Pure static export, no server runtime | `next.config.ts`: `output: 'export'`, `trailingSlash: true`, `images.unoptimized`. [repo] |
| No API routes, server actions or `revalidate` | grep of `src/app` for `use server`, `route.ts`, `revalidate`: none. [repo] |
| 28 page files; 2 dynamic segments, both pre-generated | `src/app/herbdex/[herbId]/page.tsx:17`, `.../challenge/page.tsx:15` use `generateStaticParams`. [repo] |
| Base path only exists when `GITHUB_PAGES=true` **and** `SITE_DOMAIN` is unset | `next.config.ts` (`const basePath = isGitHubPages && !siteDomain ? '/Plantdex-website' : undefined`). [repo] |
| A plain `npm run build` already produces a **domain-root** export | Built here: 84 HTML pages, **0** reference `/Plantdex-website/`, all 84 use root-relative `/_next/...`. [ran] (`native-poc/audit-export.mjs out`) |
| `SITE_DOMAIN` is live (`plantdex.online`) in production | `CLAUDE.md` "custom domain" section. It only changes the deploy workflow's build; a local/Capacitor build never sets it. [repo] |
| Size of what would ship in the app | **1,175 files, 34.3 MB** (410 `.txt` RSC payloads 12.6 MB; 298 `.webp` 9.3 MB; 84 `.html` 9.1 MB; 42 `.js` 1.7 MB; 330 `.png` 1.2 MB). [ran] |
| RSC prefetch files | **410** `.txt` files now, not the 276 recorded in `CLAUDE.md` (the site has grown). [ran] |
| No external hosts referenced from markup | The audit found none; fonts are self-hosted `.woff2` (8 files). [ran] |
| Runtime third-party script | Plausible, injected at runtime and only when `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_ID` is set (`src/components/analytics/PlausibleScript.tsx`). A native build can simply leave it unset. [repo] |

**How it loads.** Capacitor serves `webDir` (`out/`) from a custom scheme (default `capacitor://localhost` on iOS; iOS cannot register `http`/`https`) [web: [Ionic forum](https://forum.ionicframework.com/t/capacitor-hostname-config-does-not-work-for-ios/218454)]. The root-relative assets therefore resolve, exactly as they do on the custom domain. No `next.config.ts` change is needed for a basic bundle: building without `GITHUB_PAGES` already yields the right export.

**What to verify on a device (CHECK):**
- `trailingSlash: true` emits `/herbdex/<id>/index.html`. Whether Capacitor's iOS scheme handler resolves a directory URL to its `index.html`, and what it does on an unknown path (a single-page-app style fallback to the root `index.html` would silently break deep routes), is **not verified**. This is the first question the spike must answer.
- Whether `next/link` prefetch of `/scan/__next._tree.txt` (the files `CLAUDE.md` measured as halving navigation latency) is served by the scheme handler. Likely, because they are plain files, but unverified.
- Whether a full reload on a deep route works.

**Do not** use Capacitor's `server.url` to load the live site: it recreates the thin-wrapper problem (section 9) and loads remote code into the app.

**Server dependencies that remain** (all external, none hosted by us): Supabase (Auth, Postgres, Storage, six Edge Functions: `identify-plant`, `seed-packet`, `herbdex-action`, `challenge-submit`, `delete-account`, `redeem-deck-code`), the identification providers behind `identify-plant`, Plausible, Stripe-hosted checkout. [repo: `supabase/functions/*`]

---

## 3. Supabase auth in a WKWebView

| Topic | Finding |
|---|---|
| Auth method | Email + password, sign-up, reset (`src/state/AuthProvider.tsx`: `signUp`, `signInWithPassword`, `resetPasswordForEmail`, `updateUser`). No social login, so **Sign in with Apple (4.8) is not triggered**. [repo] |
| Client | `createClient(url, anonKey)` with **default options** (`src/lib/supabase-client.ts`), i.e. session in `localStorage`, `detectSessionInUrl` on. [repo] |
| Redirects | `src/lib/auth-redirect.ts` builds the confirmation and reset URLs from `window.location.origin` + `NEXT_PUBLIC_BASE_PATH` + trailing slash. `AuthProvider.tsx:113,139` pass `window.location.origin`. [repo] |

**The problem.** Inside the app `window.location.origin` is `capacitor://localhost`. Supabase would be asked to email a link to `capacitor://localhost/account/reset/`. An email link tapped in Mail cannot open that origin; Supabase's own native guidance is a real deep link, and `capacitor://localhost` as `redirectTo` is a known failure pattern [web: [Supabase deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking.md), [Stack Overflow thread](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/75671811/supabase-google-auth-integration-with-capacitor-react-for-ios)]. A Supabase incident in Nov 2025 also affected bare-scheme email-link redirects on iOS/Android [web: [status.supabase.com](https://status.supabase.com/incidents/1hf115kd2qkt)]. So **both confirmation and password-reset break in a bundled app without a code change.**

**Required change (shared contract, so a Shared Change Request, not an edit here):**
- In native only, `auth-redirect.ts` must return a deep link: preferably a **Universal Link** on `https://plantdex.online/account/...` (so the same link works on web and opens the app when installed), or a custom scheme as a fallback.
- Handle the incoming URL with `@capacitor/app` `appUrlOpen`, then hand the fragment/token to supabase-js (`setSession` or `exchangeCodeForSession`). The token currently travels in the URL **fragment**; the doc comment in `auth-redirect.ts` already warns that dropped fragments break the flow, and a Universal Link hand-off must preserve it. [repo + web]
- The redirect URLs must be added to Supabase's allow-list (a dashboard setting, owner-held; `docs/custom-domain.md` explains why this fails silently).
- Universal Links need an `apple-app-site-association` file served from `https://plantdex.online/.well-known/`. The repo has no `public/.well-known/` and deploys to GitHub Pages; whether Pages serves a dot-directory (it ignores them under Jekyll unless `.nojekyll` is present) is **CHECK**. The deploy workflow writes `CNAME` after the build (`.github/workflows/deploy.yml:146`); the same pattern could write the AASA file.

**Session persistence (CHECK, not verified):** localStorage in WKWebView under a custom scheme persists across launches in normal use, but iOS can purge web storage under disk pressure and there is no guarantee comparable to the Keychain. Safer: a custom storage adapter backed by `@capacitor/preferences` or a Keychain plugin passed to `createClient({ auth: { storage } })`. This is a small change in one file (`supabase-client.ts`) but it is a security-sensitive shared change. `CLAUDE.md` and `app-store-readiness.md` item C6 both flag "keychain use for session".

**Edge-function CORS:** all six functions send `Access-Control-Allow-Origin: *` (`supabase/functions/*/index.ts`, e.g. `identify-plant/index.ts:175`), with allowed headers `authorization, x-client-info, apikey, content-type`. An origin of `capacitor://localhost` is therefore accepted. [repo; not exercised against a real device] Supabase's own Auth/PostgREST endpoints handle CORS themselves. `*` is acceptable only because auth is a bearer token, not a cookie; do not add credentialed CORS. The `OPTIONS` warm-up (`src/lib/scan-warmup.ts`) works the same.

---

## 4. Camera and the image pipeline

**What the app does today [repo]:**
- Default capture is `<input type="file" accept=... capture="environment">` (`src/components/scan/ObservationPhotos.tsx:234-236`), which hands off to the OS camera. `ScanPanel.tsx:436` says so in a comment.
- Live `getUserMedia` capture exists (`src/lib/scan-capture.ts`, `scan-capture-camera.ts`) but is **OFF** (`NEXT_PUBLIC_CAMERA_CAPTURE`, default `'off'` in `next.config.ts`) and has no UI. It fails closed to `insecure-context` / `unsupported` states if the page is not a secure context or lacks `getUserMedia`.
- Every photo, from any source, goes through `prepareImage` (`src/lib/image-prepare.ts`): decode (`createImageBitmap`, then `<img>` fallback) and re-encode to JPEG via canvas. There is **no path that returns original bytes**, so EXIF and GPS are dropped. Formats the browser cannot decode are refused, not stored. Profiles: `KEEP_PROFILE` 1280/0.82, `IDENTIFY_PROFILE` 1024/0.75. Pinned by `image-prepare.test.ts`, and the privacy page promises it (`src/app/privacy/page.tsx:154,187,393`).

**In WKWebView:**
- `<input type=file capture>` is expected to present the native camera/photo sheet inside WKWebView, subject to `NSCameraUsageDescription` (and possibly `NSPhotoLibraryUsageDescription`; the system picker may not need it) in `Info.plist`. **CHECK on device.**
- `getUserMedia` in a bundled WKWebView needs a secure context. Whether `capacitor://localhost` reports `window.isSecureContext === true` is **CHECK**. Because `scan-capture.ts` fails closed, the failure mode is "live capture unavailable", not a crash.
- iOS Safari decodes HEIC, so the HEIC refusal noted in `image-prepare.ts` (a non-Apple-browser problem) should not bite. **CHECK.**

**Recommendation:** keep the `<input capture>` path as the baseline (it already works and already passes through `prepareImage`). Add `@capacitor/camera` **only** if the owner wants in-app live capture, and then only as a *source of a `File`/`Blob` that is fed to `prepareImage`*. Rules that must hold: never upload the plugin's bytes directly, never enable save-to-gallery or location, never read EXIF. This also lines up with the owner's 2026-11-19 direction (competitive discoveries should eventually require in-app capture, server-validated) which is **not active** and is not designed here. The native camera does not "prove presence" and must not be treated as proof (`decisions.md`: multiple angles are not evidence).

**Permission strings** (owner/coordinator to approve wording; must match behaviour):
- `NSCameraUsageDescription`: "Plantdex uses the camera to photograph a plant so it can be identified. Photos are resized and stripped of location data before they are sent."
- `NSPhotoLibraryUsageDescription`: only if the plugin/picker path needs it (**CHECK**).
- No location, microphone, tracking (`NSUserTrackingUsageDescription`), or contacts strings. Region detection is OFF.

---

## 5. Native navigation, safe areas, performance

| Area | Finding |
|---|---|
| Bottom nav | `SiteNav.tsx:64`: `fixed inset-x-0 bottom-0 ... pb-[env(safe-area-inset-bottom)]` on mobile. Already inset-aware. [repo] |
| Viewport | `layout.tsx:43-48`: `viewportFit: 'cover'`, `themeColor: '#2a0845'`. [repo] |
| Top inset | No `safe-area-inset-top` use found in `src` (grep: only the nav and `AppWalkthrough.tsx:319`, both bottom). There is no fixed top bar on mobile, but with a Capacitor status-bar overlay, content would sit under the clock/notch. **CHECK on device**; a one-line top padding on the shell, or the StatusBar plugin's non-overlay mode, resolves it. |
| Back gesture / history | Next client routing uses the History API. Whether the edge-swipe works depends on `allowsBackForwardNavigationGestures` in the shell. **CHECK.** There is no native navigation stack, so this is a "feels like a website" risk for guideline 4.2. |
| External links | The only outbound payment link is `BuyButton` (`<a href=stripe...>`, `src/components/shop/BuyButton.tsx`). In a WKWebView a plain link could navigate the app's own web view away with no way back. Open it with `@capacitor/browser` (Safari view controller) instead. **CHECK** Capacitor's default for non-allowed hosts. |
| Sprite animation | CSS `steps()` frame sheets (`CLAUDE.md` "Animated plant portraits"); `prefers-reduced-motion` handled. Pure CSS, so WKWebView-compatible. Not benchmarked on a device. |
| 410 payload files | Local files, no network, so prefetch is cheaper than on the web. Memory/launch cost unmeasured (**CHECK**). 34 MB total is far below the 200 MB cellular limit (**CHECK** current limit). |
| Haptics | `src/lib/haptics.ts` is already written to prefer a Capacitor Haptics plugin and degrade to nothing. This is a ready seam and a legitimate "native feature" for 4.2. [repo] |
| Fonts/images | Self-hosted, bundled. No runtime font fetch. [ran] |

---

## 6. Offline and error behaviour (from code; **not tested on a device**)

| Surface | Behaviour |
|---|---|
| Signed-out collection, garden, journal text, seed shelf, card pages | Fully local (localStorage; photos in IndexedDB `plantdex-photos`, `src/lib/photo-store.ts`). Works offline once the app is bundled. This is the biggest offline gain over the website. |
| Scan / identification | Needs network (`supabase.functions.invoke('identify-plant')`, `src/lib/scans.ts:197`). Failures are surfaced as errors, never silent empties (`app-store-readiness.md` C3). Native UX for "offline" is untested. |
| Signed-in collection | `src/state/herbdex-store.ts` `hydrate()` retries with back-off, then stays `ready: false` and "not claiming an empty collection". There is **no offline cache of server data**, so a signed-in player cold-launching with no signal sees no collection. This is a real gap for a field app. A read-through cache is a design item for Stage 3, not a Stage 2 blocker. |
| Sync/writes | No write queue. A write made offline fails; the journal-write failure message is shown but the discovery is already recorded locally for signed-out play only. Behaviour for signed-in offline writes: **CHECK** before promising offline play. |
| Session refresh | `AuthProvider.tsx:73-83` already treats a failed `getSession` as signed out and does not hang. |
| IndexedDB photos | WKWebView storage can be evicted (see section 3). A user's *signed-out* photos have no copy elsewhere. Disclose, or move to a native file store (`@capacitor/filesystem`) later. |

---

## 7. App Store requirements

Guideline numbers below are from Apple's page (its own stated "last updated" October 16, 2026 per the fetch) <https://developer.apple.com/app-store/review/guidelines/>. **My fetch read the page only partially: 1.2, 1.4.1 and 2.1 were verbatim; 3.1.1, 3.1.3(e), 4.2, 4.8 and 5.1 came from a model summary of the page.** Quotes marked (S) are from that summary. **Re-read each on the live page before submission.**

| Guideline | What it says (short) | Where Plantdex stands | Rating |
|---|---|---|---|
| **4.2** Minimum functionality (S): "include features, content, and UI that elevate it beyond a repackaged website" | A wrapper of a website can be rejected. | A bundled, offline-capable shell with native camera/haptics/share and offline collection is defensible. The thin remote-URL wrapper is not. | **High risk if thin; Medium if bundled with real features** |
| **2.1(a)** (verbatim) | Provide demo account info if the app has a login; a built-in demo mode needs prior Apple approval. | A review account is required; scanning needs a plant, so supply a card-photo recipe and sample images, or request demo mode. | Medium, manageable |
| **5.1.1(v)** Account deletion (S): apps with account creation must offer deletion in-app | In-app deletion exists at the foot of `/profile` (`AccountDataSection`, `delete-account` function; `CLAUDE.md` "Player profile"), and it deletes photos, rows and the auth user. | **Meets, verify in the native build.** Apple's guidance says deletion within the app; a link-out to a web page is contested [web: [Apple help](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)] but not needed here. |
| **5.1.1 / privacy manifest** | App Store Connect rejects uploads whose privacy manifest does not describe required-reason API use (enforced since May 1, 2024; a valid manifest required since Nov 12, 2024) [web: [Apple](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files.md)]. Each SDK/plugin needs its own. | Not started. `PrivacyInfo.xcprivacy` for the app, plus check each Capacitor plugin ships one (**CHECK**). |
| **App Privacy "nutrition label"** | Declare data collected and linked to the user. | Collected: email (account), user content (photos, journal notes, sightings), identifiers (user id), product-interaction analytics (event names only, no props, cookieless; `analytics.ts`). Photos are also *transmitted to a third-party identifier*. Exact category mapping and ATT answer: **CHECK** (expected: no tracking, no ATT). |
| **5.1.2(i)** (S) Data sharing | Do not share personal data with third parties (including third-party AI) without disclosure and explicit permission. | The scan photo goes to PlantNet / plant.id via `identify-plant`. The privacy page says so (`privacy/page.tsx:393`) but I found **no consent step in the scan UI** (grep of `ScanPanel.tsx` for the providers returned nothing). **Likely needs an in-app, pre-scan disclosure and agreement.** | **Medium-High, easy fix** |
| **Camera usage description** | Required string, accurate. | See section 4. | Low |
| **1.2** User-generated content (verbatim): filtering, reporting, blocking, contact info | The only user-published text is an opt-in **display name** on the Field Board (`/leaderboard`; `is_safe_display_name` in migration 0013; no comments/feed/follow). Journal notes and photos are private. | There is a name filter but no report/block flow. Apple may treat the board as UGC. Options: ship the first release **without the board**, or add a report-a-name path. **CHECK** how Apple would classify it. | Medium |
| **1.4.1** Health/medical (verbatim): remind users to check with a doctor | `SafetyNotice` appears on the herb and Herbdex pages, traditional use is never a medical claim, and `/safety` holds the full text (`CLAUDE.md`). | Strong, but the native build must keep it (do not strip the web chrome). The 85 expansion cards fail safety review and must not ship (readiness doc C1). | Low-Medium |
| Plant-ID safety wording | Identification is uncertain; no edibility claims. | Pinned by `src/lib/plant-id-safety.test.ts` and `scan-result-ui.test.ts`; the wording must survive any native re-skin. | Low (if preserved) |
| **3.1.1** In-App Purchase (S): apps "may not use their own mechanisms to unlock content or functionality, such as license keys" (the list includes QR codes) | **Plantdex has such a mechanism:** `supabase/functions/redeem-deck-code` spends a code printed in a physical deck and writes a `collector` entitlement (`supabase/migrations/0008_collection_entitlements.sql`) that lifts a free-collection cap. Today the cap is **disabled** (`collection_paywall_enabled = false`, `docs/collection-entitlements.md`), and **no UI calls the function** (grep of `src` found only `deck-code.ts`). `/start` grants nothing (`entry-point.ts`). | **High risk if the cap is ever enabled in the iOS app.** Do not ship any redeem UI or enable the cap in the iOS build without a purchase-rules ruling. Keep the owner's documented interlock. |
| **3.1.3(e)** Goods and services outside the app (S): physical goods are paid for by non-IAP methods | The shop sells a **physical deck** via a Stripe Payment Link (`src/lib/shop.ts`, `BuyButton.tsx`); no digital good is sold. | Likely permitted as physical goods; **CHECK** exact wording and any rule on external links from the app (Apple's rules on linking out changed in the US in 2025; I did not verify the current state). Lowest-risk option: open it in a Safari view controller, or hide `/shop` in the first iOS build. XP-unlocked Field Cards are earned by play, not purchase, which is fine; never tie them to payment. |
| **4.8** Login services (S) | Required only if a third-party/social login is the primary login. | Email/password only. Not triggered. Adding Google/Facebook later would trigger it. | Low |
| **Age rating / export compliance** | Questionnaire; encryption declaration. | HTTPS only, standard exemption expected. **CHECK.** | Low |
| **Content rights** | Card art and photographs. | Provenance exists for the 85; licences for the live 54 must be confirmed (readiness doc B9). | Medium (owner) |
| Build SDK | Apple's news: from April 28, 2026 uploads need the iOS 26 SDK or later [web: [Apple news](https://developer.apple.com/news/?id=12346)] | Means a current Xcode, hence a recent macOS. Exact Xcode number: **CHECK**. | Constraint |

---

## 8. Build, TestFlight, signing, costs

**Cannot be done in this sandbox.** iOS builds require Xcode on macOS. This session is Linux; I did **not** install Capacitor, create an `ios/` project, or fake any native result. What I *could* run is the web half: `npm run verify` (passes) and the export audit above.

| Item | Detail |
|---|---|
| Apple Developer Program | **$99/year** [web: multiple 2026 summaries, e.g. [Adalo guide](https://studio.adalo.com/blog/apple-developer-program-guide)]; confirm on Apple's page. An *organization* enrolment needs a D-U-N-S number; individual is faster. Which entity owns the app is an **owner decision**. |
| Mac | A Mac with current Xcode, or a cloud builder. **Xcode Cloud** (included with the Developer Program, with a free monthly compute allowance; amount **CHECK**), or **Codemagic** / similar (pricing **CHECK**). Cloud builders still need signing assets uploaded; that is a credential. |
| Signing | Distribution certificate + provisioning profile, or automatic signing from a cloud service. **Agents never hold these** (`agents/README.md`, `decisions.md`). They are owner-held, per the release-repository design (#34). |
| Bundle ID | Reverse-DNS, owner-chosen, immutable once the app record exists. Placeholder in `native-poc/capacitor.config.example.json`. |
| Icons / launch screen | 1024x1024 App Store icon, asset catalogue, launch storyboard. The repo has `src/app/icon.png` and `public/plantdex-logo.png` only; no Apple-sized set. UI-lane decision. |
| Screenshots, metadata | Required sizes, subtitle, keywords, support URL, marketing URL, privacy policy URL (exists). |
| Capacitor | Current packages from the npm registry [ran]: `@capacitor/core` and `@capacitor/ios` **8.6.3**, `camera` 8.2.6, `haptics` 8.0.2, `app` 8.1.2, `preferences` 8.0.1, `browser` 8.0.5. Required Xcode/iOS minimum for v8: **CHECK**. |
| TestFlight | Internal testers: no review. External testers: a short beta review. Builds expire after 90 days (**CHECK**). |
| Money | Known: $99/yr. Unknown until owner decides: Mac purchase vs cloud build, design time for icons/screenshots. |
| Time [judgement] | Spike 2-3 days (needs a Mac and an iPhone); shell + auth deep links + consent + privacy manifest + metadata 2-3 weeks; Apple review is often 1-3 days but a 4.2 or 3.1.1 rejection can add weeks. |

---

## 9. Comparison of options

| | **A. Capacitor, bundled export (recommended)** | B. PWA / Safari only | C. Thin WKWebView of live site | D. Native rebuild (SwiftUI/React Native) |
|---|---|---|---|---|
| On the App Store | Yes | **No** | Yes, if approved | Yes |
| Review risk (4.2) | Medium; falls with real native features | None (no review) | **High**: the textbook "repackaged website" | Low |
| Offline | Good for local data; scan still online | Needs a service worker, none exists today (`app-store-readiness.md`) | **Poor**, needs network for everything | Best |
| Camera | `<input capture>` today; plugin optional | `<input capture>` works in Safari | Same as web, plus permission plumbing | Native |
| Auth links | **Needs deep-link work** (section 3) | Works as today | Works as today (same origin) | Native work |
| Reuses current code | ~95% | 100% | 100% | ~0-20% |
| Production web impact | None if kept in a separate dir | Small (manifest + SW in `src/` and `public/`) | None, but ships remote code | None |
| Maintenance | One codebase, two shells, plus a Mac pipeline | Lowest | Low, but live-site changes reach the app unreviewed (policy risk) | Two codebases forever |
| Cost | $99/yr + Mac/cloud | $0 | $99/yr + Mac/cloud | $99/yr + large dev cost |
| Time [judgement] | Weeks | Days | Days, high rejection odds | Months |

Why not D: the entire product (reducer, mastery, research, sprites, seed packets, Field Board) is TypeScript tested by 2,288 passing tests; a rebuild throws that away and doubles the surface that must stay in sync with the server-side copy of the reducer (`supabase/functions/_shared/herbdex`).
Why not C: it is cheaper than A by only a few days and fails on exactly the dimension Apple examines.
Why B still matters: it is the zero-risk fallback and costs little, and an installed home-screen web app is a legitimate iPhone experience while the App Store question is open.

---

## 10. Coexistence with the GitHub Pages deployment

- **No fork of the codebase.** One repo, one `src/`, two shells. The production Pages deploy (`.github/workflows/deploy.yml`, triggered only by pushes to the production branch) is untouched.
- **Build target switch:** none needed for the *bundle itself*. A local/CI build without `GITHUB_PAGES` and without `SITE_DOMAIN` produces a domain-root export (verified). The native pipeline would build into the same `out/` and copy it to the shell. If a separate output directory is wanted (so a native build cannot clobber a Pages build in one workspace), `distDir` can be set via an env var in `next.config.ts`, which is a coordinator-owned shared file and needs a request.
- **Native behaviour switches at runtime, not build time:** `window.Capacitor?.isNativePlatform()` (the pattern `haptics.ts` already uses), so one bundle cannot accidentally ship native-only paths to the web. Where a feature must be *absent* in the iOS build (shop, leaderboard, redeem), prefer a `NEXT_PUBLIC_*` flag default `'off'`, in the style of `NEXT_PUBLIC_CAMERA_CAPTURE` in `next.config.ts`, so the bundler drops it, and gate the native build only.
- **Keep native tooling out of the root.** Capacitor packages go in a separate `native/` directory with its own `package.json` and lockfile. **No dependency was added to the root `package.json`** in this work. The `ios/` Xcode project, signing and `Podfile`/SwiftPM state live there (or in the owner-held release repository).
- **Ownership:** `agents/ownership.json` makes anything unnamed coordinator-owned; `native-poc/` and this document fall to the coordinator. Anything in `src/` (auth redirect, storage adapter, consent screen) is a shared contract and needs a Shared Change Request first.
- **Two things to keep in lockstep:** the Supabase redirect allow-list (add the native deep-link URLs, dashboard-only), and `check_live_site.py`-style assertions that the app bundle points at the **production** Supabase project, since a test-project bundle that "works" is worse than none (`CLAUDE.md`, "check_live_site.py").

---

## 11. Ranked risk list

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **4.2 rejection as a repackaged website** | Medium (High if remote URL) | High (weeks) | Bundle the export; ship real native features (haptics seam exists, camera, share, offline collection, native browser for links); honest review notes. |
| 2 | **3.1.1: physical-deck code unlocks a digital entitlement** | Low today (cap off, no UI), High if enabled | High | Keep `collection_paywall_enabled = false` and no redeem UI in iOS; owner decision before any change. |
| 3 | **Auth links dead in the app** (confirm + reset use `window.location.origin`) | Certain without a fix | High (users cannot sign up/reset) | Universal Link + `appUrlOpen` + allow-list; test on device. |
| 4 | **5.1.2(i): photo sent to a third-party identifier without explicit consent** | Medium | High | Pre-scan disclosure and agreement, native-wide; update privacy label. |
| 5 | **Static-export routing under the scheme handler** (trailing-slash directories, fallback, prefetch) | Unknown | High (whole app) | First spike question; fall back to a tiny local server in the shell if needed. |
| 6 | **Safety/ID wording lost or softened in the native build** | Low | High (1.4.1, user harm) | Do not re-skin; run `plant-id-safety.test.ts`; keep `SafetyNotice`; exclude the 85 held cards. |
| 7 | **Session/photo storage eviction** in WKWebView | Medium | Medium | Preferences/Keychain adapter for the session; disclose or file-store signed-out photos. |
| 8 | **1.2 UGC on the Field Board** (display names) | Medium | Medium | Omit the board from v1 or add report/block. |
| 9 | **Privacy manifest / label mismatch** | Medium | Medium (upload rejection) | Generate the report from an archive before upload; reconcile with `/privacy`. |
| 10 | **Offline for signed-in cold launch** (no server-data cache) | Certain | Medium (quality, maybe 2.1 reviewer perception) | Read-through cache; state clearly. |
| 11 | **Stripe link inside the app** (3.1.3(e), navigation trap) | Low-Medium | Medium | Safari view controller, or hide `/shop` in v1. |
| 12 | **Reviewer cannot test scanning** (2.1(a)) | Medium | Medium | Demo account + sample images in notes; ask about demo mode. |
| 13 | **Xcode/SDK/macOS churn** | Certain over time | Low | Pin versions; cloud build. |
| 14 | **Cost and credentials**: agents must never hold signing keys | n/a | High | Owner-held release repo; agents write code only. |

---

## 12. Staged plan

**Stage 0: web-only (no cost):** PWA manifest and icons (UI/coordinator request); nothing else. *Exit: installable web app.*
**Stage 1: owner decisions (this doc):** approve Developer Program + build path; decide shop/leaderboard/redeem stance; entity and bundle id; whether live camera is wanted.
**Stage 2: spike (Mac + iPhone, ~2-3 days):** Capacitor shell in `native/`, `webDir: out`, built **without** Supabase env first, then with the test project. Answer, in order: directory URLs and unknown-path fallback; prefetch files; `isSecureContext`; `<input capture>`; auth deep link end-to-end on the test project; status-bar/safe-area; external link handling; back gesture. *Exit: a written pass/fail list. Stop here if routing fails.*
**Stage 3: build for TestFlight:** Shared Change Requests (auth redirect, storage adapter, scan consent screen, native-only flags); privacy manifest and label; icons/launch screen; demo account; internal TestFlight on real devices, including airplane-mode and low-storage passes.
**Stage 4: external TestFlight, then submission** with review notes. Production web stays unaffected throughout.

### Owner decisions required
1. Approve the $99/yr Developer Program, and under whose name (individual vs organization).
2. Mac purchase vs a cloud build service, and who holds signing assets.
3. Capacitor over PWA-only, or PWA only for now.
4. Ship the shop (`/shop`) in the iOS app: hide, or open in a Safari view controller.
5. Ship the Field Board in v1, or add report/block first.
6. Keep the collection cap and deck-code redemption **out of the iOS app** (recommended).
7. Add a third-party identification consent screen (recommended).
8. Live in-app camera: yes/no. Not required for v1 (the owner's direction on camera-gated competitive discoveries is not active).
9. Bundle id, app name and subtitle, and who designs icons/screenshots.

### New costs
Known: Apple Developer Program **$99/yr**. Unknown: Mac or cloud-build subscription (CHECK pricing), design time. Everything else uses existing infrastructure (Supabase, Stripe, Plausible); no new service is required.

---

## 13. What was NOT verified

- **Nothing native was built or run.** No Xcode, Simulator, device, Capacitor install, `ios/` project, TestFlight upload or App Review interaction.
- Every **CHECK** above, in particular: scheme-handler behaviour for `trailingSlash` routes and prefetch files; `isSecureContext` under `capacitor://`; `<input capture>` and HEIC in WKWebView; safe-area top inset; back-swipe; Capacitor's external-link default; storage persistence/eviction; Universal Link and AASA hosting on GitHub Pages; privacy-manifest coverage of each plugin; current Xcode/iOS minimums and Xcode Cloud / Codemagic pricing; TestFlight build lifetime and cellular size limit.
- **Apple's guidelines were only partly read verbatim.** 1.2, 1.4.1 and 2.1 are verbatim; 3.1.1, 3.1.3(e), 4.2, 4.8 and 5.1.x are from a summary. The effect of 2025 changes to external-purchase links for US apps on 3.1.x was not checked. Treat all section 7 wording as a lead to confirm, not a quotation.
- Web-search sources are mostly secondary (blogs, forums); only the Apple pages linked are primary.
- CORS with a real `capacitor://localhost` origin was read from source, not exercised.
- The 410-payload / 34 MB bundle was measured on a build **without** Supabase and Plausible configured; a configured build adds only a few bytes of JS.
- Time estimates are judgement, not measurement.
- `npm run verify` result: see the PR. The lint step reports one pre-existing warning.

## Appendix: the proof of concept

`native-poc/` contains two inert files (no dependencies, not imported by anything, not part of any build or test):
- `audit-export.mjs`: read-only audit of `out/` (file counts, base-path references, external hosts, baked Supabase URLs). Run: `npm run build && node native-poc/audit-export.mjs out`.
- `capacitor.config.example.json`: an illustrative config with placeholders. It is not read by Capacitor because Capacitor is not installed.
