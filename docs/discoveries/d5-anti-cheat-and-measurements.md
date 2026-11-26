# d5: anti-cheat measures, what each one costs an honest player, and what was measured

Branch `agent/discoveries/d5-server-eligibility`. Companion to `discovery-receipt-contract.md` and the draft migration
`docs/discoveries/sql/0016_discovery_capture_enforcement.sql`. **Nothing here is enabled.**

## 0. The honest ceiling

A static web app cannot prove an image came from a live camera, that the plant was outdoors, or that the person took it.
No measure below claims to. The goal the owner set is narrower and achievable: make a new card unobtainable **except
through the app's capture flow, server-recorded, bounded and replay-proof**, so that two taps, an import, a journal entry
or a hand-written API call stop being enough. Anyone willing to script the capture flow with their own account, point a
camera at a screen, or photograph a neighbour's garden still gets a receipt. The words "captured in the app" are chosen
to be true under all of those. (`discovery-trust-design.md` section 11 lists the rest.)

## 1. The measures, and who they stop

| # | Measure | Where | Stops | Does not stop | False-positive risk to an honest player |
|---|---|---|---|---|---|
| 1 | Database switch, default OFF, setter service-role only, confirmation phrase, cutoff required | `discovery_enforcement`, `set_discovery_enforcement` | accidental or UI-only enablement | n/a | none while OFF (verified: 90 checks) |
| 2 | Direct inserts into `discoveries` refused when ON, **including the service role** | `discoveries_capture_gate` (BEFORE INSERT) | public-API insert, import, Seed Shelf claim, manual Discover, delete-and-reinsert of a card never held | a claimed receipt | refuses an honest player only if the client has not been updated to route through `claim_discovery` (a release-coordination risk, section 4) |
| 3 | `learned` / `mastered` need a discoveries row | `progress_requires_discovery` | minting progress for an unheld card | n/a | **ordering race**: the adapter upserts `discoveries` and `learned` in parallel (`Promise.all`, `remote-herbdex-storage.ts:119`). A `learned` that lands first is refused. Fix is in the adapter (coordinator): sequence discoveries first. Dormant while OFF |
| 4 | Single-use capture session, nonce stored only as SHA-256, 10 min TTL | `capture_sessions` | replaying a captured request; pre-minting receipts | a script that opens a session | a player who opens the camera and returns after 10 minutes gets `capture_session_expired` and re-captures |
| 5 | ~~`min_capture_ms` = 2000~~ **OWNER DECISION 2026-11-26: not mandatory; set to 0** (key and check retained; a later owner decision needs no migration). Originally: refused **without** consuming the session | `consume_capture_session` | zero-latency scripted loops | an attacker who waits 2 s | see section 3: unmeasured on real traffic; proposed instrument below |
| 6 | 3 open sessions, 60 opens per UTC day, advisory-locked per account | `open_capture_session` | session farming | n/a | 60/day is 6x the existing 10-scans-a-day quota |
| 7 | Existing quota (`claim_scan_pair`: 450 global, 10 per account per day) | unchanged | mass minting: an account can create at most 10 observations a day, each a real provider call | many accounts | unchanged by this branch |
| 8 | SHA-256 of each received image, single use across accounts | `capture_image_digests` | resubmitting one file; one file shared by several accounts | a re-encoded, cropped or flipped copy; a new photo of a screen | section 2 |
| 9 | Replay of the identical request is accepted, not refused | `consume_capture_session` | n/a (it is the guard against measure 8 hurting an honest retry) | n/a | removes the lost-response false positive |
| 10 | Receipt single-claim, owner-only read, server-clock stamps, immutable once claimed | `claim_discovery`, triggers | double rewards, back-dating, editing evidence | n/a | none |
| 11 | Grandfathering: every existing row at migration time, plus rows recorded up to an owner-chosen cutoff at enable time | `discovery_grandfathered` | revocation; and **pre-stuffing** between announcement and enable | n/a | a player who earns a card between the cutoff and the enable moment is refused: choose the cutoff = the enable moment's date and announce the date |
| 12 | A claimed receipt never expires as evidence; an unclaimed one stops being claimable after 30 days | `claim_discovery` | stockpiling | n/a | someone who identifies and never confirms for 30 days re-scans |

No measure reads EXIF, GPS, a coordinate, a device identifier or a photograph. `capture_image_digests` holds a 32-byte
hash of a re-encoded image and the account id, is deleted with the account (cascade) and is pruned at 90 days
(`prune_capture_artifacts`, service role).

## 2. Perceptual hash: investigated, measured, **not wired**

Question: should `identify-plant` also refuse an image that is merely *similar* to one already seen (dHash, Hamming
distance), not only byte-identical?

Measured with `docs/discoveries/measure-dhash.py` on the real photographs in the repository (16 distinct photographs: the
`public/reference` and `public/boss-form` sets, almost all *Taraxacum* and look-alikes; `evidence/boss-form-photos` is
excluded because it holds copies of five of them, which measured distance 0 and are not false positives). 9x8 grayscale,
64 bits:

| Probe | Result |
|---|---|
| Distinct photographs, 120 pairs | min distance **17**, 1st percentile 22, median 32, max 40. Pairs within 12 bits: **0** |
| Same photograph, JPEG re-encode q85 / q60 | max distance **1** / **2** |
| Same photograph, downscaled 50% | max **2** |
| Same photograph, brightness +20% | max **3** |
| Same photograph, 5% crop on every edge | max **18**, mean 11.4 (crosses the closest distinct pair) |
| Same photograph, 15% crop / mirror / rotate 90 | max 34 / 41 / 38 (indistinguishable from distinct photographs) |

Reading. At a threshold of 8 bits the hash would have **zero false positives on this sample** and would catch a
re-encode, a downscale or a brightness change. It would **not** catch a 5% crop, a mirror or a rotation, each of which
costs an attacker one line. So the thing it adds over SHA-256 is catching a *re-saved* copy only, and the attacker's
cheapest evasion defeats it. The sample is small (16 photographs, one family of plants taken from one source) and says
nothing about two real photographers shooting the same plant from the same spot, which is where a perceptual hash would
produce false positives against honest players, and which this repository has no data to measure.

Cost of wiring it: a server-side JPEG decode in the edge function (a new dependency and CPU on a function that today
decodes nothing), plus a fuzzy-lookup structure instead of a primary key. Verdict: **not justified for V1.** The
measurement and script are kept so the owner can revisit it with field data; nothing in 0016 depends on it.

Exact-digest detection, by contrast, was measured in Chromium (Playwright, canvas `toBlob` at q0.75, 400x300):

- the same pixels re-encoded 5 times gave **1** distinct output (the encoder is deterministic), so the same source
  file chosen twice produces the same digest, which is exactly the resubmission measure 8 refuses;
- 50 distinct synthetic images gave **50** distinct digests (no collision, as expected of SHA-256);
- the same pixels drawn through a second canvas re-encoded to **identical** bytes.

So exact-digest refusal catches "pick the same file again" and costs a real in-app capture nothing, because each camera
frame is new. It also means a client retry sends identical bytes, which is why the replay path (measure 9) exists:
without it a lost response would strand an honest player behind their own digest.

## 3. What was NOT measured, and how to measure it in the shadow period

There is no field traffic for capture sessions, so two numbers are reasoned, not measured:

- **How long a real capture takes** (open camera, frame, shoot two or three photographs, submit). `2000 ms` is the
  floor below which two shutter presses plus a network round trip are implausible; a person is far slower. If the floor
  is too high it is a refusal that does not consume the session, so the cost of being wrong is a short wait, not a lost
  scan.
- **How often a player lets a session expire.** 10 minutes is generous for a camera screen.

Both are measurable from data 0016 already records, with no new logging and no personal data in the output. Run on the
TEST project after the Scan lane's flag is on:

```sql
-- Elapsed capture time, seconds (server clock both ends).
select percentile_cont(array[0.01, 0.05, 0.5, 0.95, 0.99])
         within group (order by extract(epoch from consumed_at - issued_at)) as p
  from public.capture_sessions where consumed_at is not null;

-- Share of sessions consumed under the floor can only be seen as `capture_too_fast` outcomes at identify-plant;
-- sessions that expired unconsumed:
select count(*) filter (where consumed_at is null and expires_at < now()) as expired_unused,
       count(*) filter (where consumed_at is not null) as consumed
  from public.capture_sessions;

-- Receipts issued vs claimed (the claim step is where an honest player might drop out).
select count(*) filter (where claimed_at is not null) as claimed, count(*) as issued from public.capture_receipts;
```

Decision rule proposed for the owner: raise `min_capture_ms` only if the 1st percentile of consumed elapsed time is more
than three times the current floor; never raise it on the argument that attackers are fast (they are, and it does not
matter), only on the argument that honest players never go below it.

## 4. The cost an honest player does pay, stated plainly

1. **Everyone who can only play without the camera loses the ability to earn new cards** (no camera, denied permission,
   accessibility needs). That is the owner's explicit decision (D6: no camera-free alternative). It is why readiness of the
   camera experience is a precondition of turning the switch on, not a property of this migration.
2. **A client that has not been updated is refused**, with a clear `42501 discovery_requires_capture_receipt`. The
   switch must not be turned on until the Scan lane's camera flow and the coordinator's adapter change are deployed and
   the shadow numbers look right. The SCR lists them.
3. **The Seed Shelf claim cannot add a new card** while ON, because it writes a back-dated discovery directly. A shelf
   entry came from a scan that had no card; whether a later-printed card should be claimable by a capture the player made
   before it existed is an owner decision, and the database fails closed until then.
4. **Local-progress import cannot add new cards** while ON (it can still import grandfathered-equivalent state only in
   the sense of re-inserting a card the account already holds). D5's limited-import window is not built.
5. Signed-out play is unchanged and unreachable by any server rule (design D4).

## 5. Security review notes on 0016 itself

- Every function is `security definer` with `search_path = ''`, fully qualified, with `EXECUTE` revoked from `public`
  **and** `anon` **and** `authenticated` where it is service-only (Supabase grants `anon` by default; `from public` does not
  remove a named grant, which 0013 learned the hard way). Pinned by `observation-capture-receipt.test.ts`.
- The gates are triggers, not RLS, so they bind the service role too: there is no legitimate service-role writer of
  `discoveries`, and a trigger is the only construct that stops one.
- The BEFORE triggers run ahead of the RLS `WITH CHECK`, so a foreign-user insert is refused by the gate before RLS speaks.
  Both are `42501`; verified.
- The switch table has RLS enabled with no policy, revoked grants, an update guard that only opens inside the setter, and a
  delete guard. A direct `update ... set enforce = true` fails (verified); the mutation run confirms the verification fails
  if that guard is bypassed.
- The only post-insert change anywhere is `capture_receipts.claimed_at` null to a time, enforced by a trigger that also
  refuses any other column change and any change to a claimed row.
- Re-running the migration after enabling cannot re-grandfather: the backfill is guarded by the switch.
- Not covered, deliberately: `species_packets`, the Seed Shelf, `leaderboard_standings()`, `herbdex-action`'s logic and the
  reducer. `leaderboard_standings()` counts `discoveries` rows, so once the gate holds, the board's discovery points follow
  it without a change there.

## 6. Acceptance evidence

Recorded in the pull request: `npm run verify`, `docs/discoveries/sql/run-local.sh --mutate` (real PostgreSQL 16, the
repository's migrations 0001 to 0014 plus 0016), and `D5_RUN_SQL=1 npx vitest run src/lib/observation-capture-receipt.test.ts`.


## Owner decisions 2026-11-26 (supersede the thresholds above)
1. **ONE mandatory in-app camera photograph; further angles optional (up to 3).** `min_images` = 1. The 2-to-3 photograph minimum is NOT adopted. Effect on honest players: one tap fewer; the provider has less to identify from, so a lone photograph can be less certain (the review screen words confidence honestly and the identifier never confirms a card alone). The existing minimum of two stays for LOOKUPS (imported photographs).
2. **No mandatory capture delay.** `min_capture_ms` = 0. The measured false-positive discussion above no longer applies to a threshold that is not enforced. If the owner later chooses one, it is a config change plus a re-run of the measurement.
3. **Duplicate images: flag, do not refuse.** Digests are kept per account. An identical image under the SAME account is a retry or retake and is accepted. An identical image already seen under ANOTHER account is accepted and the session is flagged (`capture_sessions.suspect_duplicate`) for review. Reasons not to auto-refuse: a shared or re-sent photograph, a household or classroom, and a refusal that denies a real find. What the flag does not do: prove anything (an edited copy has a different hash) or change the player's result.
4. Server-authoritative sessions, single-use nonces (stored as a digest), idempotent receipts (one per observation and card), the per-day and concurrent session limits, and the existing scan quota all stand. Nothing here proves a plant was photographed outdoors.
