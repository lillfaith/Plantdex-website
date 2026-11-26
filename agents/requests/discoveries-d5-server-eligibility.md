# Shared Change Request: server-authoritative camera eligibility (migration 0016 draft, contract, edge wiring)

- From lane: discoveries      Task: agents/ledger/discoveries/d5-server-eligibility.md      Branch: `agent/discoveries/d5-server-eligibility`
- Needs: migration | contract | edge function | owner approval (to ENABLE; nothing here enables anything)
- **To: coordinator** (placement, adapter, deploy to TEST), **scan lane** (`identify-plant`, camera flow). Supersedes the Stage-4 stub `discoveries-write-gate.md` for the technical design; the owner's FINAL decision (2026-11-26) is that V1 requires an eligible in-app camera capture for NEW collectible cards. **Every rule is behind a database switch that defaults OFF. Production is not authorised. Existing collections are grandfathered.**

## Why
`discoveries` is written by the browser under its own JWT, so a UI change is not enforcement (the Supabase URL and anon key are
public). Only the database can make "a new card needs an in-app capture" true for XP, levels, Field Cards, garden, achievements
and the Field Board at once, because they all read that table. 0013 is the precedent (it did this for `mastered`).

## What is delivered on this branch (all inert)
1. `docs/discoveries/discovery-receipt-contract.md` - the contract the Scan lane consumes. **Please mirror it to
   `docs/agent-workflow/discovery-receipt-contract.md`** (the path the owner named; the guard refuses it to this lane).
2. `docs/discoveries/sql/0016_discovery_capture_enforcement.sql` - **please place as `supabase/migrations/0016_discovery_capture_enforcement.sql`**
   (TEST project only; the owner dispatches it). With `0016_rollback.sql` (kept beside it, NOT in the migrations directory so it
   is never auto-applied) and `0016_verify.sql` (self-rolling-back, run by psql).
3. `docs/discoveries/sql/run-local.sh` + `local-supabase-stub.sql` - a throw-away PostgreSQL harness that applies 0001..0014 + 0016
   with pre-existing player data, runs the suite, re-applies, rolls back, re-applies, and (with `--mutate`) proves the suite fails
   when a protection is removed.
4. `src/lib/observation-capture-receipt.ts` (+test) - the shared constants, error codes, `receiptItemsFor`, `routeNewCard`.
   Pure; imports neither the reducer nor progression.
5. `docs/discoveries/d5-anti-cheat-and-measurements.md` and `measure-dhash.py` - the measures, what each costs an honest player,
   and the perceptual-hash investigation (measured, **not wired**).

## Exact changes requested of others (none made here)
**Coordinator**
- Place the migration (above). 0014 and 0015 are untouched; 0016 defines no object either defines and never alters `confirm_scan`.
- `scripts/sync-edge-shared.mjs`: add `observation-capture-receipt.ts` (and its two imports, already mirrored or pure) to `PURE_MODULES`
  if `identify-plant` imports `receiptItemsFor`; regenerate `_shared`; `edge-shared.test.ts` must pass.
- `USER_TABLES` in `delete-account` and `export-account-data.ts`: add `capture_sessions`, `capture_receipts`, `capture_image_digests`,
  `discovery_grandfathered` (all cascade from `auth.users`; `discovery_enforcement` is global config, holds nothing about a person,
  and is the one explained exception, like `species_packets`). `account-security.test.ts` pins both directions.
- `profile-schema.test.ts` (no second table grants an update): 0016 adds none; confirm the new tables are in its sweep.
- `remote-herbdex-storage.ts`: **sequence `discoveries` before `learned`** (today they are upserted in parallel; with ENFORCING a
  `learned` that lands first is refused). Route a NEW card through `rpc('claim_discovery')` when `discovery_rules().enforcing`.
  `HerbdexProvider.discover()` must not call the plain upsert for a collect-flow find once enforcing.
- Deploy to the TEST project only. The owner alone runs `set_discovery_enforcement(true, <cutoff>, 'ENFORCE NEW DISCOVERIES')`.

**Scan lane** (`agent/scan/s5-camera-flow`)
- `identify-plant`: accept `purpose`, `capture_session_id`, `capture_nonce`; SHA-256 each image part; call `consume_capture_session`
  then, after the unchanged provider call and matcher, `issue_capture_receipts(receiptItemsFor(...))`; return `captureReceipt` per
  candidate and `capture{accepted, code}`. A capture failure never fails the identification; no flag and no `purpose` is byte-identical
  to today. A receipt-code bug must be swallowed into a code (design P16).
- Camera screen: `open_capture_session` on open; the confirm tap calls `claim_discovery(receiptId)` for the CHOSEN candidate, then
  `confirm_scan` (0014, unchanged). Copy: "captured in the app", never "verified outdoors".

**Discoveries lane (follow-up task, mine)**: `import-local-progress` must stop writing NEW cards to an account while enforcing
(the database refuses them regardless). Not done here: it needs the coordinator's `discovery_rules` plumbing first.

**UI lane**: the Discover button on a locked card, when enforcing, routes to the camera (`routeNewCard`).

## Risk and rollback
Applying 0016 with the switch OFF changes no existing behaviour: it adds tables, a `recorded_at` column with a server default and three
triggers that return immediately. Verified against 3 pre-existing discoveries / 1 learned / 1 mastered / 2 users: row counts identical
before and after, before and after the rollback; OFF behaviour unchanged. Rollback (`0016_rollback.sql`) switches OFF, drops the gate
triggers and the new functions, and deletes nothing. The ONE way to harm players is to turn the switch on before the camera flow and
the adapter change are deployed, which is why the setter needs a confirmation phrase, a cutoff and the service role.

## Does this need the owner?
Yes, to ENABLE (production-affecting, trust-sensitive, first change that stops a player doing something), and for: the camera
accessibility stance (D6 has no camera-free path), the cutoff date, whether a Seed Shelf claim may unlock a card printed after the
capture, and the wording on `/privacy` (Tier 0) disclosing capture sessions, receipts and image digests.

## Revision 2026-11-26 (D6, owner decision: one photograph)
Settled by the owner: ONE mandatory in-app camera photograph (extra angles optional, max 3); no mandatory capture delay
(`min_capture_ms` = 0, still configurable); duplicate images are FLAGGED for review when seen under ANOTHER account and never
auto-refused (same-account repeats are retakes). Effect on this request: `capture_config()` becomes `min_images` 1 and
`min_capture_ms` 0; `capture_image_digests` is keyed `(user_id, digest)` with a digest index; `capture_sessions` gains a
`suspect_duplicate` column that no client can read and no response carries; `capture_duplicate_image` is removed from the codes.
Still no new grant, definer functions unchanged in shape with `search_path = ''`, switch OFF, nothing enabled. Capture is never
claimed to prove an outdoor sighting. Verified: 94 SQL checks plus mutation run (`run-local.sh --mutate`).
