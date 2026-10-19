# The collection cap and the deck entitlement — runbook

Migration 0008, `supabase/functions/redeem-deck-code`, `scripts/mint_deck_codes.py`.

**The cap is DISABLED. Phase 2 is backend only. Do not enable it — see the interlock below.**

---

## 🔴 INTERLOCK: THE CAP MUST NOT BE ENABLED YET

Enabling `collection_paywall_enabled` before the local-import redesign ships produces a
**permanent stuck dialog** for anybody signing in with more than ten local discoveries.

`importLocalProgress` sends every discovery in ONE upsert, so a single row over the cap
raises and **the whole batch fails** — a device holding thirty discoveries imports *zero*,
not ten. The dialog then reports failure and deliberately does not spend the offer (correct
existing behaviour for a failed write, since marking it done would strand that device's
progress), so every retry fails identically, forever. Nothing is deleted; it simply becomes
unreachable, which is the exact harm `import-local-progress.ts` was written to prevent.

**The approved fix, not yet built (Phase 3):**

1. Slice discoveries to the remaining headroom — import 10 of 30, not 0.
2. Report it plainly: *"10 of 30 discoveries imported. The other 20 are still on this
   device."*
3. **Say that local-only data is lost if browser storage is cleared.** It lives in
   `localStorage`, so clearing site data, a private window, or a new device takes it. A
   person deciding whether to buy a deck is entitled to know the pending half is not safe
   anywhere.
4. **Record the pending remainder explicitly and do NOT mark the account fully imported.**
   A partial import is not a completed one.
5. Spend the *offer* even so — a cap is not a failed write, and treating it as one is the
   stuck loop.
6. Re-run the import on successful redemption, or the remainder is stranded: the offer is
   once-per-account and there is no second prompt.

Until all six exist, the flag stays `false`.

---

## What is built

| Piece | Where |
|---|---|
| Tables, trigger, redemption function, grandfathering | `supabase/migrations/0008_collection_entitlements.sql` |
| Redemption endpoint | `supabase/functions/redeem-deck-code/index.ts` |
| Code minting | `scripts/mint_deck_codes.py` |
| Migration tests (31) | `supabase/tests/`, run by `scripts/test_migration.sh` |
| Normalisation drift guard | `src/lib/deck-code.test.ts` |

**Not built:** any UI. No redemption form, no silhouette treatment, no upgrade prompt, no
entitlement read in the client. Phase 3.

## What the cap does and does not touch

It is a trigger on **one table**, `discoveries`. At the cap a player keeps identifying
plants, keeps an unlimited journal of sightings, keeps scanning, keeps the Seed Shelf, keeps
XP, Field Research, achievements, the garden and XP-earned Field Cards. What stops is adding
an 11th card to the permanent cloud collection.

Signed out, nothing is capped at all — the local adapter is `localStorage` and there is no
server in that path. That is a deliberate consequence of the owner's decision that
identification and exploration stay free; it also means the cap is a property of *cloud
collections*, not of the app.

## Order of operations

1. **Test locally.** `./scripts/test_migration.sh` — needs `postgresql-16`, touches no
   Supabase project, drops its cluster on exit.
2. **Apply 0008** to production with the service role (`run-migration.yml`). Safe on a live
   project: the flag defaults false, the trigger returns on its first branch, and nothing is
   rewritten. It reads `auth.users` once to grandfather.
3. **Verify the grandfather pass.** `select count(*) from entitlements where granted_by =
   'grandfather'` must equal the number of accounts that existed, and `grandfather_cutoff`
   must be set. **Applying 0008 twice does not re-grandfather** — the cutoff being set is
   the guard, added after a real second run granted free access to accounts the first had
   correctly excluded.
4. **Deploy `redeem-deck-code`** (`deploy-function.yml`). It needs no new secret.
5. **Mint and register codes** for existing stock:
   ```
   python3 scripts/mint_deck_codes.py --count 50 --print-run 2026-01-initial --out ~/private
   ```
   Apply the `-claims.sql` with the service role. **Keep the `-codes.csv` and never commit
   it** — it is the only copy besides the printed cards, and a code cannot be recovered from
   the database.
6. **Phase 3**, including the six import items above.
7. **Only then** consider enabling the flag.

## Rollback

```sql
update public.app_settings set collection_paywall_enabled = false, updated_at = now() where id;
```

One statement, instant, no deploy, no row rewritten. The trigger returns on its first
branch. This is the tested path — section K of the test suite lifts the cap this way,
confirms a previously-refused insert now succeeds, and re-enables it.

**There is no down-migration that drops these tables.** `deck_claims` records which physical
decks were sold and spent; `entitlements` records what people bought. Dropping either to
"undo" the feature would destroy the record of real purchases and make every spent code
redeemable again. If the mechanism itself has to go, a later migration drops the **trigger**
and leaves every claim and entitlement where it is.

## Security summary

- **`deck_claims` is unreachable by any client.** RLS enabled with no policy, plus the grant
  revoked. The order matters: a table with RLS *disabled* and no policies is wide open,
  because Supabase grants the client roles table privileges by default.
- **Hashes only, never codes.** Plain SHA-256. A pepper was considered and rejected: 80 bits
  already makes a stolen hash useless offline, and a pepper must fail closed, so losing that
  one secret would brick every code ever printed.
- **Identity comes from the token, never the body.** Otherwise a service-role endpoint would
  let anybody redeem a code onto an account they control.
- **`invalid` covers unknown and already-claimed alike**, so the endpoint is not an oracle
  for which codes exist.
- **Single use is guarded on `claimed_at`, not `claimed_by`.** Account deletion nulls
  `claimed_by`; guarding on it would resurrect a code every time somebody closed an account.
- **One atomic statement** is the whole single-use guarantee, and the entitlement insert is
  in the same transaction — there is no window where a deck is spent and its owner has
  nothing.
- **Rate limit reuses `claim_scan`**, 20/account/day. Not an anti-brute-force measure — 80
  bits settles that — but an unlimited endpoint is free load and an infinite retry loop.
  Malformed input is rejected *before* the quota is spent, so a bad paste does not cost a
  buyer an attempt.
- **Nothing is hashed in the browser.** A client-side hash would become the credential.

## Live operational risks

- **A spent code cannot be transferred.** Post-reversal that means a second-hand buyer
  cannot collect past 10 cards — a materially worse outcome than the cosmetic-only loss the
  original design assumed. Print "this code can be claimed once" on the box, and expect to
  handle disputes by hand.
- **Lost CSV means re-minting that run.** There is no recovery path by design.
- **Manual delivery only.** Codes are emailed from the Stripe receipt by hand. There is no
  Stripe webhook and no new Stripe secret; automating it is a deliberate future decision.
