# Product decision record: optional, on-device ecological-region detection (DRAFT, awaiting owner approval)

**Nothing described here is active. Approving this record is a separate step from approving any UI.**

## The rule being changed
`src/lib/regions.ts` says: "A REGION IS CHOSEN, NEVER DETECTED. No GPS, no permission prompt, no IP lookup." The privacy page says Plantdex
"does not use your device's location", "never requests location permission" and "stores no coordinates". The region picker says "Plantdex never
asks for your location." These were deliberate: the same privacy posture that keeps `prepareImage` from ever returning original bytes.

## The proposed replacement (owner direction of 2026-11-24)
A region may be **detected on the device, only after an explicit tap and permission grant**, from a coordinate that is **coarsened immediately,
used once and discarded**, with **region ids as the only stored result**, **never uploaded, never public, never used as evidence of anything**,
and **never required**. Manual selection remains complete and equal. A refusal is respected and not repeated.

## What would change, if approved (each as its own reviewed change)
1. `regions.ts` header and `RegionPicker` copy updated to the new rule; the three "never" statements corrected.
2. `/privacy` (Location section and the "No location" row): replaced by accurate text. Draft: "If you choose Find my region, your device asks
   for permission and Plantdex uses your approximate position once, on your device, to pick one of ten ecological regions. The position is
   not sent anywhere, not stored and not shown to anyone; only the region name is kept so we can personalise plant lists and quests. You can
   change or remove your region at any time, and Plantdex works fully without location. Photos still have their location metadata removed before
   they are stored or sent." (`legal.test.ts` is updated in the same change; the older sentences are not silently deleted.)
3. New Plausible goals for the two or three event names, and their mention on `/privacy`.
4. A feature flag, default OFF, removing all location code from the bundle until switched on.

## Owner sign-off checklist (all required before any collection of coordinates)
- [ ] The replacement rule above is approved as stated (or amended).
- [ ] The privacy text is approved (or rewritten) by the owner.
- [ ] The precision threshold is approved after the boundary research reports accuracy and asset size.
- [ ] The no-re-prompt policy is approved.
- [ ] The ten-region boundary mapping is reviewed and accepted as the definition of the regions.
- [ ] The flag is switched on by the owner only.

## Explicitly not part of this decision
Verification of finds, competitive scoring, sighting provenance, anti-cheat, background location, any server-side coordinate, IP or timezone
inference. Those remain governed by the discovery-trust work, which already rejects coordinates as evidence.
