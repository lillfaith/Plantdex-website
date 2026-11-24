# Shared Change Request: scan receipt contract (inert) - DRAFT, NOT APPLIED

- From lane: discoveries      Task: agents/ledger/discoveries/trust-design.md
- Needs: contract | migration
- **To: coordinator.** Stage 2 (a). Design: `docs/discovery-trust-design.md` sections 6, 8, 10. **Nothing here is active; every flag defaults OFF.** Not for action until the owner has reviewed the design and authorised Stage 2.

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
   - `public.discovery_rules` single-row config: `receipts_issue`, `receipts_accept`, `shadow_report`,
     `require_receipt_for_new_cards` (all false) and nullable `cutover_at`. A guard so `require_receipt_for_new_cards`
     cannot be set true while `SCAN_RECEIPT_SECRET` is unset, and so `cutover_at` can only be set once and only moved earlier.
   - **No change to `discoveries`, `sightings`, `scans`, `mastered`, `research_completions`, `leaderboard_standings()`.**
2. **Pure module** `src/lib/herbdex-receipt.ts` (+ test): `signScanReceipt` / `verifyScanReceipt(token, {userId, herbId}, secret, now)`
   following `species-attestation.ts` (`v1.<body>.<sig>`, HMAC-SHA-256 via `crypto.subtle`, 30-day TTL, 60 s future margin,
   fail reasons `missing|unconfigured|malformed|badSignature|expired|mismatch|wrongUser`). Body: `u,o,h,k,r,e,b,c,iat`.
   **No coordinates, image, hash, photograph count or device value.** Property tests P8 to P15b of the design.
3. **`scripts/sync-edge-shared.mjs`**: add the module to `PURE_MODULES`; regenerate `supabase/functions/_shared/herbdex/herbdex-receipt.ts`
   (`edge-shared.test.ts` must pass; the sync rewrites relative imports to carry `.ts`).
4. **Export and deletion**: add `scan_receipts` to `export-account-data.ts` and to `USER_TABLES` in `delete-account`;
   `account-security.test.ts` and `*-schema.test.ts` pins updated in both directions.
5. **`.env.example`** and any build default: `SCAN_RECEIPT_SECRET` (dedicated, never the service-role key), flags default off.
6. **Analytics (optional, later):** any new event name added to `PLAUSIBLE_GOALS`; `track()` keeps one parameter.

## Who else depends on it
`discoveries-receipt-issue.md` (Scan) and `discoveries-receipt-accept.md` (coordinator) cannot land before this.
`discoveries-presentation.md` needs the table and flags to exist. Server mirror: `sync:edge-shared`. Tests: `edge-shared`,
`account-security`, `identification-schema`, `profile-schema` (no second table grants an update), `leaderboard-schema` (unchanged).

## Risk and rollback
Low while inert: a new empty table and a pure module nobody calls. Wrong if a CHECK is narrower than the code's union (an
insert is refused and a claim is lost): the schema test prevents it. Rollback: leave the table (inert) or drop it; no data
exists in it. No existing row is read, written or altered.

## Does this need the owner? (coordinator fills in)
Applying the migration to the production project is owner-gated ("pause for approval before applying database migrations").
Disclosing the stored receipt in `/privacy` is Tier 0 copy the owner edits (design D7). Otherwise: pending coordinator.
