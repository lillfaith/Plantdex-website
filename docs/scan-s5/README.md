# scan-s5: camera capture in the scan flow (sandbox preview, flag-gated)

> Location note: the brief named `docs/agent-workflow/scan-s5/`, but `docs/agent-workflow/**` is coordinator-owned in `agents/ownership.json` and the guard refuses it to the scan lane, so this evidence lives in `docs/scan-s5/`. The coordinator may move it.

Branch `agent/scan/s5-camera-flow`. **Everything below is behind `NEXT_PUBLIC_CAMERA_CAPTURE=on` (default off).** The consent notice is additionally
switchable on its own with `NEXT_PUBLIC_SCAN_CONSENT=on` (default off; needs a `next.config.ts` line, see `agents/requests/scan-s5-flags-in-next-config.md`).
No flag is enabled by default and `NEXT_PUBLIC_CONFIRM_SCAN_RPC` is untouched. All UI is functional markup in existing tokens, tagged
`data-ui-placeholder`, **for owner review**; nothing was redesigned.

Owner rule implemented: with the pilot on, **only an observation whose every photo came from the in-app camera can unlock a NEW card**. An imported photo
still identifies (education) and is labelled "not eligible to collect". Cards already held are untouched (the reducer's `discover()` is still the only
awarding call and is still idempotent). Nothing says a capture proves where a plant was; the copy says the opposite.

## WORKING / MOCKED / DISABLED

| Step | Status | Notes |
|---|---|---|
| Provider notice before first send (names PlantNet / plant.id, what is sent, optional, link to /privacy#plant-id) | **WORKING** (flag-gated) | Blocks the Identify button; also enforced inside `identifyPlant` so no other caller can send first. Stored `{stamp}` per account / per device; re-asked when the wording version or provider list changes. No tracking. |
| Camera permission states (not-asked, prompting, granted, denied, no-device, in-use, insecure, unsupported, error) | **WORKING** | Fake-camera run shows not-asked then live feed; denied path simulated by the browser's own rejection (`NotAllowedError`). Other states covered by `scan-capture.test.ts` and `scan-flow.test.ts`. |
| Denied / unavailable / in-use fallback | **WORKING** | Says the choice is changed in browser settings; never asks twice (remembered per account, survives reload); library photo still identifies, labelled not eligible. |
| Multi-angle capture (2-3 frames), re-encode via `prepareImage` | **WORKING** | One slot per angle; stream released on shutter, cancel, unmount and page hide. No EXIF/GPS path (the existing `prepareImage` rule; the frame is drawn to a canvas and re-encoded). |
| Identify from captured frames | **WORKING** | Same `identifyPlant`; the provider is intercepted in the sandbox run (no network, no credit). |
| Review (candidates, traits comparison) | **WORKING** | Unchanged component; step indicator reads Review. |
| Confirm (collect) | **WORKING for camera observations; DISABLED for imported ones** | A lookup cannot reach `discover()` for a card not already held (guarded in the click handler and by removing the button). |
| Reveal (celebration dialog) | **WORKING** | Existing dialog, only for an awarded find. |
| Collect (outcome panel, collection written) | **WORKING** | Existing `ScanOutcome`; idempotent for a held card. |
| Open capture session / `purpose` + session fields on identify / per-candidate receipt / `claim_discovery` on confirm (client) | **WORKING against an intercepted fake server; WIRED to the draft contract** | Coded to `docs/discoveries/discovery-receipt-contract.md` (branch `agent/discoveries/d5-server-eligibility`; the contract's own placement note: the coordinator's path for it is `docs/agent-workflow/discovery-receipt-contract.md`, which that lane cannot write). `scan-capture-session.ts` (3 RPCs), `scans.ts` (request fields, response parsing), `scan-receipt.ts` (pure confirm decision). Claim goes BEFORE the ordinary `discover()`, as the contract's section 4 requires. Playwright runs C and D drive the whole signed-in path (open session, three form fields, receipt, claim, reveal; and an expired-receipt refusal with no unlock). |
| Server functions themselves (`open_capture_session`, `claim_discovery`, `discovery_rules`, migration 0016) | **NOT DEPLOYED / not mine** | Draft, TEST only, discoveries + coordinator. A database without them answers `PGRST202`/`42883`, which the client reports as `not-deployed` and handles by the **MOCK fallback**: the unlock then rests on the camera rule on this device and the screen says "Scan receipt: MOCK". It never presents a receipt that was not issued. |
| Server-side eligibility / write gate / enforcement | **DISABLED / not mine** | Nothing here changes the reducer, XP, schema or edge functions. `enforcing` unknown or true with no receipt blocks the unlock (fail safe, per the contract's section 3.5). Until enforcement exists the camera-only rule is a client preview, not anti-cheat. |
| Signed out | **WORKING (local only)** | Camera frames still collect to the device's own file (signed-out progress is out of server scope, contract section 6); no receipt, and the screen says so. |
| `/privacy` wording | **NOT DONE (Tier 0)** | Page already names both providers and `#plant-id`; exact additions are in `agents/requests/scan-s5-privacy-page-copy.md`. `scan-consent.test.ts` pins the page and notice together. |

## Evidence

`run-scan-s5.mjs` drives the built export at 390x844 in Chromium with `--use-fake-device-for-media-stream` (24 checks, all passing; runs A-D: signed-out camera flow, denied-camera fallback, signed-in contract path, refused claim). Screenshots:

1. `01-consent-notice` 2. `02-consent-declined` (nothing sent) 3. `03-camera-permission-prompt-state` 4. `04-camera-live-fake-feed` (Chromium's synthetic test pattern)
5. `05-two-camera-angles-eligible` 6. `06-review-candidates` 7. `07-reveal-celebration` 8. `08-collect-outcome` (incl. MOCK/signed-out receipt line)
9. `09-camera-denied-fallback` 10. `10-library-photos-not-eligible` 11. `11-lookup-only-result` (no confirm path) 12. `12-signed-in-receipt-claimed-reveal` 13. `13-signed-in-collect-receipt` 14. `14-claim-refused-safe-failure`

Reproduce: `NEXT_PUBLIC_CAMERA_CAPTURE=on NEXT_PUBLIC_SUPABASE_URL=https://fake-s5.supabase.test NEXT_PUBLIC_SUPABASE_ANON_KEY=fake npx next build && node docs/scan-s5/run-scan-s5.mjs`
(the fake Supabase host is never contacted; the identifier and every other Supabase call are intercepted).

## Known limits and what remains

- The camera-only rule is client-side. A camera frame is not proof of an outdoor sighting (a photo of a screen is the same), and the copy says so.
- A mixed observation (any imported photo) is a lookup by design, so an import cannot be laundered into a collect.
- The wording is mine and functional; the owner owns final copy (D7).
- Remaining: deploy the contract's server half (coordinator, TEST) and rerun the signed-in path against it instead of the intercepted fake; server acceptance (coordinator); `/privacy` additions (owner); `next.config.ts` line for `NEXT_PUBLIC_SCAN_CONSENT` (coordinator); owner decision to turn consent on independently of the camera pilot.
