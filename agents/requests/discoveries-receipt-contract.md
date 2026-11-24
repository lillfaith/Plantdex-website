# Shared Change Request: scan receipt contract (inert) - DRAFT, NOT APPLIED

- From lane: discoveries      Task: agents/ledger/discoveries/trust-design.md
- Needs: contract | migration
- **To: coordinator.** Stage 2 (a). Design: `docs/discovery-trust-design.md` sections 6, 8, 14. **Revised 2026-11-24 after owner decisions D0-D7.** Authorised: planning, contracts and non-enforcing implementation behind disabled flags. **NOT authorised: Stage 4 enforcement.** Every flag defaults OFF; TEST project only until the owner approves production.

## Why
The owner's decision (2026-11-24) is that earning a NEW collectible card should eventually require an eligible in-app scan.
Stage 2 needs a place to record a server-validated scan receipt and one shared definition of "valid receipt", without
changing any existing behaviour. Contract first, feature second, never in the same branch.

## Exact proposal
1. **Migration** (next free number; applied to the TEST project only until the owner approves production):
   - `public.scan_receipts(user_id uuid references auth.users on delete cascade, herb_id text, observation_id text,
     observed_taxon_key text, observed_taxon_rank text, eligibility text, rank_position text, species_confidence text,
     issued_at timestamptz, recorded_at timestamptz not null default now(), receipt_version integer,
     primary key (user_id, herb_id))`.
   - CHECK constraints repeating the TypeScript enumerations (`TAXON_RANKS`, `SPECIES_CONFIDENCES`, eligibility,
     `rank_position in ('top','listed')`) and `is_catalogue_herb(herb_id)`; `identification-schema.test.ts` holds them equal.
   - RLS: `select` own only. **No client insert, update or delete policy.** Service role inserts with `on conflict do nothing`.
     A `before insert` trigger forces `recorded_at` to the server clock.
   - `eligibility` CHECK on `scan_receipts` allows `exact, synonym, acceptedGroup, curatedEquivalent, genusCard` only (D2: **never `legacyGenus`**).
   - `public.discovery_rules` single-row config: `receipts_issue`, `receipts_accept`, `shadow_report`, `legacy_import_open`
     (all false), `require_receipt_for_new_cards` and nullable `cutover_at`. **Stage 4 is not authorised, so a trigger must
     REFUSE to set `require_receipt_for_new_cards` true or to set `cutover_at` at all in this migration** (it is lifted only by
     a later, owner-approved migration). Later guard: `cutover_at` settable once, only ever earlier.
   - `public.legacy_imports(user_id uuid primary key references auth.users on delete cascade, imported_at timestamptz not null
     default now())`: write-once, select own, no update, insert only through the service role (D5). In `USER_TABLES` and the export.
   - `public.discovery_shadow_daily(day date, reason text, match_class text, n bigint, primary key (day, reason, match_class))`:
     **no user id or any per-person column**, CHECKs repeating the enums in `src/lib/observation-qualification.ts`
     (`qualifies|lookup|signedOut|notConfirmable|legacyGenusExcluded|alreadyHeld`; `exact|synonym|genusLevel|curatedGroup|uncertain|other`),
     no client access, service-role increment only. The one explained exception to "user tables are exported and deleted"
     (`account-security.test.ts` lists it). Reports suppress cells under 5; rows older than 90 days are housekeeping-deleted.
   - **No change to `discoveries`, `sightings`, `scans`, `mastered`, `research_completions`, `leaderboard_standings()`.**
2. **Pure module** `src/lib/herbdex-receipt.ts` (+ test): `signScanReceipt` / `verifyScanReceipt(token, {userId, herbId}, secret, now)`
   following `species-attestation.ts` (`v1.<body>.<sig>`, HMAC-SHA-256 via `crypto.subtle`, 30-day TTL, 60 s future margin,
   fail reasons `missing|unconfigured|malformed|badSignature|expired|mismatch|wrongUser`). Body: `u,o,h,k,r,e,b,c,iat`.
   **No coordinates, image, hash, photograph count or device value.** Property tests P8 to P15b of the design.
3. **`scripts/sync-edge-shared.mjs`**: add the module to `PURE_MODULES`; regenerate `supabase/functions/_shared/herbdex/herbdex-receipt.ts`
   (`edge-shared.test.ts` must pass; the sync rewrites relative imports to carry `.ts`).
4. **Export and deletion**: add `scan_receipts` to `export-account-data.ts` and to `USER_TABLES` in `delete-account`;
   `account-security.test.ts` and `*-schema.test.ts` pins updated in both directions.
5. **`.env.example` and `next.config.ts`**: `SCAN_RECEIPT_SECRET` (dedicated, never the service-role key); build flags
   `NEXT_PUBLIC_DISCOVERY_SHADOW=off` and `NEXT_PUBLIC_LIVE_CAMERA_PILOT=off` defaulting `'off'` in `next.config.ts` so the bundler drops
   the paths (the `NEXT_PUBLIC_BOSS_FORMS` precedent). Only the exact string `on` enables (`qualificationShadowEnabled`).
6. **Analytics (optional, later):** any new event name added to `PLAUSIBLE_GOALS`; `track()` keeps one parameter.

## Who else depends on it
`discoveries-receipt-issue.md` (Scan) and `discoveries-receipt-accept.md` (coordinator) cannot land before this.
`discoveries-presentation.md` needs the table and flags to exist. Server mirror: `sync:edge-shared`. Tests: `edge-shared`,
`account-security`, `identification-schema`, `profile-schema` (no second table grants an update), `leaderboard-schema` (unchanged).

## Risk and rollback
Low while inert: a new empty table and a pure module nobody calls. Wrong if a CHECK is narrower than the code's union (an
insert is refused and a claim is lost): the schema test prevents it. Rollback: leave the tables (inert) or drop them (`drop table` in
a down migration; nothing references them); no data exists in them. All flags off restores today's behaviour exactly.
No existing row is read, written or altered. The trigger refusing Stage 4 values means a typo cannot enable enforcement.

## Does this need the owner? (coordinator fills in)
Applying the migration to the production project is owner-gated ("pause for approval before applying database migrations").
Disclosing the stored receipt in `/privacy` is Tier 0 copy the owner edits (design D7). Otherwise: pending coordinator.
