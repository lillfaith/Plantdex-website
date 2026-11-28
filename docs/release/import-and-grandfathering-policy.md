# Import and grandfathering policy (Discoveries lane; for owner decision)

Owner decision (final, security blocker): every NEW collectible unlock comes from the in-app camera plus a server receipt. A signed-out
device's manual declarations must not become trusted collectibles on sign-in. Journal notes stay (they are the player's own record).

## What the code does now
`importLocalProgress` (src/lib/import-local-progress.ts) writes only `sightings` (with photos) and `seed_shelf`. It never writes
`discoveries`, `learned`, `mastered`, `research_completions` or `unlocked_achievements`; those stay on the device as local-only legacy progress
(never deleted, never stranded). Each sighting and shelf find is written on its own; a permanent refusal (PostgREST 42501) is reported as
`refused` and does NOT reopen the offer; only transient failures do. The result carries `leftOnDevice: { discoveries, learned, mastered, research }`.
`hasLocalProgressToImport` no longer counts local discoveries alone as worth an offer.

## Policy facts
| Record | Policy |
|---|---|
| Server `discoveries` rows existing at the enforcement cutoff (0016 `discovery_grandfathered`; `recorded_at` is the server clock) | Grandfathered: kept, still count, no revocation, no rescoring. |
| Server rows inserted after the cutoff without a claimed receipt | Refused by `discoveries_capture_gate` (42501). Not grandfathered. |
| Server rows self-declared BEFORE the cutoff | Kept (owner's standing rule). Unverifiable by design; they are the price of not revoking. |
| Local-only records never synced | Never trusted, never sent. Remain on the device, displayed as "From this device". |
| `learned` / `mastered` / `research` / achievements derived from local state | Same: device only. With enforcement ON the server refuses them anyway without a discovery (`progress_requires_discovery`). |
| Local sightings and shelf finds | Import as today (journal and archive). A sighting never calls `discover()`. |

## Options
- **A. Device-only legacy (implemented, recommended).** Nothing forgeable is trusted; no cross-device sync of legacy cards; no Board effect.
  A player who wants a card on their account scans the plant while signed in.
- **B. One-time bounded migration** into a separate `legacy_collection` table (see legacy-import-proposal.md): syncs history, forgeable inside
  the window, needs a migration, a kill switch and leaderboard exclusion. Not built.
- **C. Revoke or hide local collections.** Violates "preserve existing progress". Not recommended.
- **Grandfather cutoff:** the moment enforcement is switched on (recommended) versus a later date, which allows pre-stuffing after the announcement.

## Recommendation
A for V1, cutoff = enforcement switch-on moment, B only if players ask for cross-device history.

## Owner decisions needed
1. Confirm A (and that local-only cards are display-only, no XP anywhere server-side).
2. Cutoff date and announcement date for 0016.
3. Whether journal entries should earn Board points at all (see below; backend change).
4. Copy for the dialog (see report) and whether `/herbdex` shows a "From this device" label.

## Journal and the Field Board today (no change made)
`leaderboard_standings()` (0011) scores a journal entry (`journal_points`, 15 each, one per species, max 4 species per UTC day) only when the
sighting is qualifying (photo, or a note of at least 24 characters) AND the same user already has a SERVER `discoveries` row for that herb.
So an imported journal entry earns nothing for a card the account does not hold, and a sighting cannot create a card. Changing journal scoring
is a backend/leaderboard change requiring the owner's explicit approval; it was not touched.
