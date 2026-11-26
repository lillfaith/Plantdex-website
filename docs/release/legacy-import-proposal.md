# Legacy collections and imports: proposal for owner review (nothing here is chosen or built)

Owner constraints (2026-11-26): preserve existing collections and history; grandfathered local collections must not be erased when camera
enforcement begins; **no permanent alternative unlock** through local import, manual sightings or uploaded photos; signed-out players keep private
local progress; any legacy import is a limited migration of history, clearly distinguished from camera-earned discoveries, and it **must not
manufacture competitive scores, XP or newly eligible card unlocks**.

## What already exists (0016, draft, switch OFF)
- Every `discoveries` row on the server at apply time is grandfathered; at enable time every row recorded up to an owner-chosen cutoff is too
  (`recorded_at` is stamped from the server clock, so it cannot be back-dated). Rows after the cutoff are NOT.
- With enforcement ON a client cannot insert a card the account does not hold unless it claims a receipt. So the existing import
  (`import-local-progress.ts`) would be refused for any local card the server does not already hold.

## The real problem
A signed-out player's local collection is a file on their device. Its timestamps are client-claimed, so ANY use of it as authority can be forged:
whoever edits their own local file before importing could claim all 45 cards. So a legacy import is forgeable by design; what we control is what
it is worth.

## Options
**A. Device-only preservation (recommended for V1).** Local progress stays private on the device, exactly as today, and is never uploaded as
`discoveries`. A signed-in player sees their server collection; the local collection is shown beside it, labelled "From this device", for DISPLAY
ONLY. It earns nothing on the server: no Field Board points, no server XP, no Quest credit, no new unlocks. Nothing is erased and nothing is forgeable
because nothing is trusted. Cost: legacy progress does not sync across devices and does not count on the Board.
**B. One-time bounded migration of history (only if you want it synced).** A separate `legacy_collection` table (never `discoveries`), written by a
service function, once per account, only for the 45 printed-catalogue ids, only for accounts created before the announcement date, only inside a
window, rows marked `source = legacy_import`, excluded from `leaderboard_standings`, from server XP, from mastery and from Quest progress, shown with a
distinct "Imported history" mark, with a kill switch. Forgeable within the window, but worthless for anything competitive.
**C. Reject (not recommended).** Local collections stop being importable and are hidden on sign-in. Violates "preserve apparent progress".

## Proposed values (for you to confirm or change)
| Item | Proposal | Why |
|---|---|---|
| Server grandfather cutoff | the moment you switch enforcement on (rows recorded at or before it) | a later date lets people pre-stuff after the announcement; the setter already refuses a future cutoff |
| Announcement date | the date you tell players, recorded in the setter call | |
| Option B window | 30 days from the announcement, then closed for good | long enough for an infrequent player; short enough to bound forging |
| Option B eligibility | account created before the announcement date | stops a new account being created just to import |
| Option B cap | at most the 45 printed ids, once per account | |
| Option B XP/score | none on the server; display-only label | your constraint |

## Safeguards (A and B)
No import writes to `discoveries`, `learned` or `mastered`; no import path touches the Field Board; every legacy row is distinguishable in the
database and the UI; a count is logged per import; the account export and deletion include any new table (parity test); the migration is reversible
without deleting a player's own records.

## Decisions I need
1. A or B (my recommendation: A for V1, B later only if players ask for cross-device history).
2. If B: the announcement date and window length.
3. The wording shown next to device-only progress ("From this device").
