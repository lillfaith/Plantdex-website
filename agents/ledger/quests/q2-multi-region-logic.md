# Task: Multi-region selection logic (Q2)

- Lane / role: quests
- Branch: `agent/quests/q2-multi-region-logic` (from `coord/region-architecture-docs`, which carries the data contract)
- Priority: A
- Status: review

## Goal
Pure logic for the multi-region model in `docs/regions/ecoregion-data-contract.md` (sections 3, 4, 7), behind a
flag that is off. No UI, no location code, no region data.

## What changed (all under `src/lib/region*`, plus this file)
- `region-preference.ts`: `RegionPreference` (home, extras, homeSource, neighbours, locationAsk), `parsePreference`
  (rebuilds from validated parts, drops unknown keys), add/remove/change-home helpers, `multiRegionEnabled()`
  (true only for `NEXT_PUBLIC_MULTI_REGION=on`).
- `region-collection.ts`: `unionSpecies`, `countCollection` (total = unique species; habitat counts overlap),
  `applyStateFilter` (intersection, last), `speciesInView` (flag off / no region => today's behaviour).
- `region-preference-store.ts`: injectable-storage read/write, key `plantdex.region-pref.v1:<scope>`.
- `region-multi.test.ts`: 19 tests pinning the section 4 and 7 invariants against invented fixtures.

## Decisions to review
- `homeSource` is `null` when `home` is null (the contract lists only the three enum values). Alternative: default `manual`, which would claim a choice that was never made.
- Changing home drops the old home; keeping it is an explicit `addExtra`.
- A state with no list intersects to nothing (no record, not "unlikely").
- Own storage key, deliberately not `plantdex.region.v1`, so today's `/quests` never reads it. Under `plantdex.`, so account deletion sweeps it.
- Nothing imports the new modules; the flag is read nowhere yet.

## Not done / out of lane
No ecoregion data or ids (coordinator/Tier 0), no `next.config.ts` default for the flag, no UI, no server copy.
No Shared Change Request needed so far.
