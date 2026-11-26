# Shared Change Request: /privacy wording for the in-flow photo notice and camera capture

- From lane: scan      Task: agents/ledger/scan/s5-camera-flow.md
- Needs: other (`src/app/privacy/**` and `src/lib/legal*` are Tier 0, owner-edited)

## Why
The scan flow now shows a notice before the first photo is sent (`src/lib/scan-consent.ts`) and, under the camera pilot, captures frames from the
live camera. `/privacy#plant-id` already names PlantNet and plant.id and says photos are re-encoded without EXIF/GPS, which the notice repeats and
links to. Three facts are not on the page yet. This lane cannot edit it, so it states the exact additions.

## Exact proposal (additions to the `plant-id` section, owner to word)
1. "Before your first identification Plantdex shows what is sent and to whom, and asks you to acknowledge it. Your acknowledgement is stored only in your
   browser (a version number and the list of services), per account, and is asked again if the wording or the services change. It is not sent to us."
2. "If you use the in-app camera, the page opens your camera only after you tap to open it and your browser allows it. The camera is switched off as soon as a
   photo is taken, you leave the page or hide it. The photo goes through the same resize-and-re-encode step as any other and is not stored by the camera step.
   Plantdex does not read your location. If you decline camera access Plantdex does not ask again; you can change it in your browser's settings."
3. "Photos taken with the in-app camera are what can unlock a new card. That says how the photo was taken, not where the plant was, and Plantdex cannot verify either."

## Tests to keep consistent
`src/lib/legal*.test.ts` (Tier 0) should assert the page still names both providers and contains section id `plant-id`. This lane's
`src/lib/scan-consent.test.ts` already asserts both of those against the page source, so a rename fails here first.

## Who else depends on it
`scan-consent.ts` links to `/privacy#plant-id`; if the id changes the test fails.

## Risk and rollback
Copy only.

## Does this need the owner? (coordinator fills in)
Yes: legal copy, Tier 0.
