# Provider consent: exact copy for owner review (V1 requirement)

Status: implemented by S5 behind `NEXT_PUBLIC_SCAN_CONSENT` (default off in committed config and in current production; ON before public V1). Real
screenshots: `docs/scan-s5/01-consent-notice.png` (the notice) and `02-consent-declined.png` (after Not now), 390px, fake camera. Source: `src/lib/scan-consent.ts`.

## How it behaves (verified in code)
- The check sits inside `identifyPlant` (`scans.ts`), the ONLY in-app call to `identify-plant`, so the camera, the OS camera hand-off and the photo
  library all pass through it; nothing is sent before an acknowledgement. The Identify button is also blocked.
- Stored as `{stamp}` per account (or `device` when signed out); the stamp is `v<wording version>:<providers>`, so changing the wording version or the
  provider list asks again. Declining stores nothing and sends nothing. No tracking.
- Not yet verified on a real device or against TEST.

## Current copy (v1) and what I would change
| Part | Current | Proposed v2 |
|---|---|---|
| Heading | Before your first identification | Before we identify your photo |
| Who | "...sends your 2 or 3 photos to an outside identification service. It is PlantNet or plant.id (by Kindwise), depending on how this app is set up." | "To identify a plant, Plantdex sends your photo or photos to an outside plant-identification service: PlantNet or plant.id (by Kindwise). Plantdex chooses which one; you cannot choose." |
| What | "the photos, resized and re-encoded on your device so their location data (EXIF/GPS) is removed. No location, account details or device identifiers are added." | "Only the photo or photos, resized and re-saved on your device so camera location data (GPS) is removed. The service receives them from Plantdex's server, and we add no location, name, email or device details." |
| Why | (implied) | "Why: so the service can suggest which plant it might be. A suggestion is not a confirmation and says nothing about whether a plant is safe." |
| Choice | "This is optional. You can keep browsing the Herbdex without it, but identification needs it." | "You can say no. Without it you can still browse the Herbdex, but identifying and collecting by camera need it." |
| Accept | I understand, send my photos | Send my photo to identify |
| Decline | Not now | Not now |
| After decline | Nothing was sent. You can still browse the Herbdex, and you can change your mind here at any time. | unchanged |
| Link | Read the full privacy details -> /privacy#plant-id | Read how photos are handled -> /privacy#plant-id |
Why v2: the current text says "2 or 3 photos", which is wrong under the one-photo default; it never states the purpose or that a suggestion is not a safety check; and
"how this app is set up" is vague. Any change bumps `CONSENT_WORDING_VERSION`, so everyone is asked again.

## Things that are yours to confirm (Tier 0 /privacy)
`/privacy#plant-id` must say, accurately, what each provider does with images and how long (I have not read either provider's terms for this review and
cannot state them); that scan photos are not stored by Plantdex (the page says they are re-encoded and discarded after identification, which I read but
did not test); and that capture sessions and image digests exist once 0016 is enabled. Proposed additions are in `agents/requests/scan-s5-privacy-page-copy.md`.

## Release gate
Flag ON in the V1 release build; wording v2 approved by you; `/privacy` updated; a real-device pass that declines, accepts, reloads, changes wording
version (asks again) and confirms nothing was transmitted before acceptance.
