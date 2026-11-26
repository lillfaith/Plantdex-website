# V1 QA report — persistence, security, identification, inventory (2026-11-26)

Branch `coord/v1-qa` from `integration@9a7c48c`. Verification work: two clear bugs were fixed, each with a pinned test; everything else is
a finding for the owner. **No production or test project was touched, no workflow dispatched, no credential used.** Where this report says
"verified" it names the evidence; where it could not verify something it says so.

Inputs read: `AGENTS.md`, `CLAUDE.md`, `agents/README.md`, `docs/agent-workflow/decisions.md`, `docs/release/v1-launch-gap-audit.md` (on
`origin/coord/v1-gap-audit`, not yet on integration), migrations 0001-0013 from this tree, drafts 0014 (`origin/coord/confirm-scan-rpc`) and
0015 (`origin/coord/expansion-progression-design`), all six edge functions, the workflows.

---

## 1. Persistence verification

### 1a. What was run

| Surface | Method | Result |
|---|---|---|
| Signed-out, real built export at **390x844**, Chromium (`docs/release/qa390-persistence.mjs`) | Open a card, "Log a Discovery", confirm, reload, then Herbdex, Garden, Profile and the profile editor | **Pass.** Before: empty v3 state. After confirm: `discoveries = [taraxacum-officinale]`, achievements `first-find` + `habitat-wayside`. After reload: identical. Profile reads **100 / 250 XP, Level 1, Discovered 1/45, Achievements 2/16, Collection 2%**. Garden shows Dandelion as a sprout ("Discovered / Learn its card"). **Amber Ring appears in the profile editor** after the first find. No horizontal overflow on Herbdex or Garden. 0 page errors. Screenshots were taken but are not committed. |
| Signed-out, through the real store + real local adapter over stubbed `localStorage` (`src/lib/persistence-signed-out.test.ts`, 11 tests) | reload = a second store on the same storage | **Pass.** XP, First Find, Amber Ring, garden stage, learned -> mastered -> flowering, mastery surviving the deletion of the sighting that earned it, two plants staying independent, corrupt JSON / unknown version / throwing storage |
| Signed-in, real remote adapter against an in-memory fake Supabase (`src/lib/persistence-signed-in.test.ts`, 4 tests) | fake models "a write is invisible until its request lands" | **One real bug found and fixed (F-01).** Round trip, idempotent re-save, and retry-after-failure otherwise pass |

### 1b. What could NOT be verified, and why

- **Signed-in persistence against a real Supabase project** (XP, mastery, First Find, Amber Ring, Garden after reload on a server-backed
  account). `e2e/supabase.e2e.test.ts` (60 tests) exists and needs credentials. I have none and must not ask for any. The fake above covers the
  adapter's logic, not Postgres, RLS or the edge function. **Owner action:** run `npm run verify:supabase` against the TEST project (never
  production) and paste the result; then do the manual 390px walkthrough on production after promotion (plan, step 9).
- **Garden "placement".** There is no placement action. A plant's stage is derived from mastery (`garden.ts`, no clock; owner decision
  2026-11-19). "Placement/save/reload" is therefore "the derived stage reads back unchanged", which is what the tests above pin.
- **Learned -> mastered in a browser.** The knowledge check is a dialog with randomised questions; mastery persistence is covered at the store level, not driven in a browser.
- **Locked frames** (Laurel etc.) were not visible in the editor in the browser run, and I did not establish why (hidden when locked, or below the fold). Unit-pinned only.

### 1c. Bugs found

**F-01 — signed-in: mastery can be missed because `reconcile` runs ahead of the `learned` write. FIXED.**
Reproduction (`persistence-signed-in.test.ts`, "reconcile waits for a save that is still in flight"): `save()` is fire-and-forget, and
`herbdex-action` derives mastery from rows it **reads from the database**. A player who passes the knowledge check triggers a save and, in the
same tick, the provider's reconcile effect. With the write still in flight the function was invoked and saw `learned: []`, returned nothing
mastered, and the store believed it. Before the fix the test failed with `reconcile ran ahead of the write it depends on: expected
[{ learned: [], discoveries: [] }] to have a length of +0 but got 1`. Effect: mastery (and the research it feeds) appears only after some later
state change or a reload; never lost. Fix: `createRemoteHerbdexStorage` tracks in-flight saves and `reconcile` awaits them with
`Promise.allSettled` first (`src/lib/remote-herbdex-storage.ts`). A failed save does not make reconcile throw and is still retried by the next save (pinned).
Severity: Medium (visible, self-healing, signed-in only). Not a redeploy: client code only.

**F-02 — signed-out: a save this build cannot read is erased by the first load. FIXED (latent).**
Reproduction (probe, then `persistence-signed-out.test.ts`): put `{version: STORAGE_VERSION + 1, discoveries: {...}}` in `plantdex.herbdex.v1`
and open the app. `parseState` returns an empty collection for an unrecognised version (by design) and hydration then **writes that empty
state straight back over the key**. The stored value afterwards was `{"version":3,"discoveries":{},...}`. Corrupt JSON behaves the same.
Why it matters for this release: the first `STORAGE_VERSION` bump followed by a production **rollback** (plan step 8) would wipe every
signed-out player's collection on their next visit. Today production and integration are both `STORAGE_VERSION = 3` (checked), so there is
**no live exposure**; it is a rollback hazard waiting for the next bump. Fix: before anything is overwritten, the local adapter copies an
unreadable raw value to `plantdex.herbdex.v1.unreadable` (once; never replaces an existing backup). The live key still resets, as before, so
no behaviour a player sees changes, but the bytes survive for a build that understands them. The `plantdex.` prefix means account deletion's local sweep removes it too. Pinned for newer-version, corrupt JSON, backup-not-replaced, and no backup for readable older versions (v1 migrates cleanly).
Severity: Medium, latent (Low today).

Not a bug, noted: the remote adapter's `lastKnown` can briefly regress when two saves overlap; the consequence is a redundant `on conflict do nothing` insert, never data loss.

---

## 2. Security audit (migrations 0001-0013, drafts 0014/0015, functions)

Method: read every migration and every edge function; replayed `create policy`/`drop policy` across 0001-0013 **in order** (earlier guards read one
file at a time and cannot see that 0013 removed two insert policies 0001 created); compared export/deletion table sets; no SQL was executed
against any database. "Frontend flag off" was never treated as a control. Pinned test for everything pinnable:
`src/lib/v1-security-audit.test.ts` (48 tests).

### Findings

| ID | Sev | Finding | Evidence | Status / pinned test |
|---|---|---|---|---|
| F-03 | **High (owner decision)** | **Progress is self-declared at the database boundary, and the Field Board pays for it.** Any signed-in client can `insert` any of the 54 catalogue ids into `discoveries` and `learned`, and any number of `sightings` (24+ character note, or any uploaded image, qualifies a journal entry), by a direct REST call. `leaderboard_standings()` counts `finds` as **every discovery row** (50 pts each, no sighting or evidence requirement): 54 x 50 = **2,700 points**, plus 11 standing research tasks x 100 (derivable once `learned`+`sightings` are asserted) and 15/day of journal points, reachable by script in seconds. 0013 closed *invented* ids and derived-table inserts; it deliberately does not close *real ids asserted without evidence*. | `0013` `finds` CTE; `0001` insert policies; `CLAUDE.md` "Progression is self-declared" | **Open, by recorded design, and incompatible with calling the board competitive.** The board is opt-in and labelled provisional. Not changed: scoring is a coordinator/owner decision (`decisions.md`). See plan gate G5 |
| F-04 | **Medium (draft)** | **0014 `confirm_scan` is not a server boundary for "a scan happened".** `scans` rows are inserted **by the client** (`src/lib/scans.ts:314,477`) and the insert policy accepts any columns, so a client can insert a row already carrying `confirmed_herb_id`; write-once on *confirmation* does not make the *row* trustworthy. Any future rule "a collectible discovery requires a server-recorded scan" would be forgeable unless `identify-plant` (service role) becomes the only scan writer and the client insert policy is dropped. Also `confirm_scan` does not check `p_herb_id` against `is_catalogue_herb()` or against the scan's own candidates. The function itself is sound (definer, empty `search_path`, schema-qualified, `auth.uid()` ownership, null/blank/probability refusal, revoked from `public, anon`, idempotent same-card retry, different-card refusal). | `0014`; `scans.ts` | **Open before 0014 goes to production.** Recommended edits to the draft: add `and public.is_catalogue_herb(p_herb_id)` to the refusal guard. I did not edit it: it lives on `coord/confirm-scan-rpc`, held by the owner |
| F-05 | Low | **Global text primary keys let one account squat another's id.** `sightings.id`, `scans.id`, `seed_shelf.id` are `text primary key` with client-chosen ids. With `on conflict do nothing` a victim's insert is silently skipped if the attacker already holds that exact id. Ids are `<prefix>_<timestamp>_<random>` and not visible across accounts, so the attacker must guess the random part | `0001:56`, `0002`, `0004:23` | Open. Fix-forward migration `primary key (user_id, id)` after a duplicate check. Not made: schema change |
| F-06 | Low | **`herbdex-action` reads `sightings` with no paging.** PostgREST returns at most `max_rows` (platform default 1,000, project-configurable; not verified here). A player with more sightings than that could have a card's only sighting fall outside the page, so mastery waits | `herbdex-action/index.ts` `from('sightings').select('herb_id')` | Open. Fix is a distinct-herb query or paging; edge change, needs a redeploy |
| F-07 | Medium (availability) | **Sign-up farming exhausts the shared scan budget.** Per-account limit is 10/day, global backstop 450/day; ~45 accounts exhaust it for everybody. It is a denial, not a spend overrun: the cap bounds provider cost at 450 calls/day. Relies on email confirmation being on | `identify-plant` 168-170; `0009` | Mitigated by design. **Owner:** confirm "Confirm email" is ON in production (`check-auth-config.yml`) |
| F-08 | **High (V1 blocker)** | **No disclosure or consent at the point photos are sent.** `/privacy` is accurate (below), but `src/components/scan/*` contains no link to `/privacy` and no "your photos go to PlantNet/plant.id" line; the only wording near the action is "Sent for identification" **after** the tap (`ScanPanel.tsx:573`). Confirms the gap audit's suspicion by search | grep of `src/components/scan`, `src/app/scan` | **Open; UI/owner decision** (copy and placement). Proposed text in section 3 |
| F-09 | Low | **Derived rows are client-deletable.** 0001's `delete` policies on `mastered` and `research_completions` survive 0013. A player can delete their own mastery/completion rows (self-harm; reconcile re-derives them only while the sighting still exists), contradicting "recorded, never revoked" at the DB layer. No score can rise from it | replay test | Pinned as current behaviour; owner may want these two delete policies dropped (the delete-account function uses the service role and does not need them) |
| F-10 | Low | `deploy-function.yml` has no `challenge-submit` option, so `function=all` is the only way to deploy it. Deploying `all` would ship an unreferenced Boss Forms function | workflow options | Plan step 7 deploys the five functions individually |
| F-11 | Info/Medium | **Production `identify-plant` may not match this checkout.** The leaderboard checklist says the deployed function enforced 30/5 while the repo and client say 10/5 | `docs/leaderboard-production-checklist.md` | **Owner:** `function-identity.yml` |
| F-12 | Medium (if ever misapplied) | **0015 would let any signed-in client store 85 ids a build does not serve.** Self-described: TEST only; delete every id not live before any real project. Scoring correctly keeps asking the unchanged `is_catalogue_herb`, so these ids score nothing | `0015` header | **Never to production as written.** Plan section 1 |
| F-13 | Info | Edge functions answer `Access-Control-Allow-Origin: *`. Acceptable: authentication is a bearer token in a header, never a cookie | all `index.ts` | No action |
| F-14 | Info | `SCAN_QUOTA_SALT` falls back to a value derived from the service-role key (not a published default). Not fail-closed, deliberately | `identify-plant:151` | No action |

### Verified sound (each pinned by `v1-security-audit.test.ts`)

- After the **last** migration only `profiles` grants a client UPDATE; no `FOR ALL` anywhere. `discoveries`, `learned`, `sightings`, `unlocked_achievements`, `seed_shelf`, `scans`
  allow exactly select/insert/delete to the owner. **`mastered` and `research_completions` have no client insert.** `entitlements`, `challenge_completions`,
  `boss_forms` are select-only; `deck_claims` and `scan_quota` have no policy at all (RLS on = nobody); `species_packets` and `app_settings` are public-read only.
- Every public table created in 0001-0013 enables row level security.
- All seven `SECURITY DEFINER` functions pin `search_path`, and each is explicitly revoked from `anon` (the Supabase default grant to the named role that `revoke ... from public` does not touch). Only `leaderboard_standings` is granted to `authenticated`; `award_challenge` only to `service_role`.
- Every edge function resolves identity through `auth.getUser()` on the caller's token and never from the request body; `delete-account` reads no body at all; no `service_role` reference exists in browser-reachable `src/`.
- **Account deletion / export parity:** the 14 tables with a `user_id` column in 0001-0013 equal `USER_TABLES` in `delete-account` and every one is read by `export-account-data.ts`, in both directions (also held by the existing `account-security.test.ts`).
- Standings function: callable by `authenticated` only; returns counts, region and a name that passes `is_safe_display_name`; no herb ids, notes, photos, dates or scans; non-participants unreachable.
- The photo-exists check is owner-folder-scoped and the bucket is capped at 8 MiB, jpeg/png/webp (0013).

---

## 3. Third-party identification review

**Providers and what is sent** (`identify-plant/providers.ts`): PlantNet gets a multipart body of `images` + `organs` only (`my-api.plantnet.org/v2/identify/all?api-key=...`); plant.id gets `{ images: [base64] }` with `Api-Key` in a header and `details=common_names,taxonomy` (`PLANT_ID_DETAILS`, `plantid-normalize.ts:39`). No user id, email, name, location or coordinates in either request. The PlantNet key travels as a **query parameter** (provider-side request logs may hold it); the function redacts `api-key=` from every provider string it returns (`identify-plant:260`).

**Cost and quota.**

| Control | Value | Where | Note |
|---|---|---|---|
| Per signed-out caller | 5/day | `identify-plant:168`, mirrored `scan-allowance.ts:20` | bucket = salted daily hash of address; address from `cf-connecting-ip`, else the **last** `X-Forwarded-For` hop, else shared `unknown` |
| Per signed-in caller | 10/day | `identify-plant:169`, `scan-allowance.ts:19` | production's deployed value unverified (F-11) |
| Global backstop | 450/day | `identify-plant:170`, `0009` `claim_scan_pair` | refunds the per-caller unit if the global is spent; the reverse (global spent before the per-caller check) is a documented accounting trade-off |
| Comparison mode | doubles spend | two env switches plus a named account list | **must be off in production** (`check-function-secrets.yml` shows names) |
| Provider cost | PlantNet free tier "roughly 500/day" (code comment); plant.id is paid per call | not verified here: I did no external lookup | the 450 cap bounds either |

**Privacy statements vs code.**

| `/privacy` says (`src/app/privacy/page.tsx` 381-420) | Code | Verdict |
|---|---|---|
| Photos go to PlantNet or plant.id, only when you choose to identify | `scans.ts` / `identify-plant`, no background calls except an `OPTIONS` isolate warm-up that carries no photo | **Matches** |
| EXIF/GPS dropped; original never sent; refused if it cannot be re-encoded | `prepareImage` has no path returning original bytes; `image-prepare.test.ts` fails on any `blob: file` | **Matches** (pinned) |
| No account id, email or name sent to the provider | request bodies above | **Matches** |
| Signed-out counter is a salted one-way hash of the address | `callerAddress` + `QUOTA_SALT` + day | **Matches**; salt falls back to a key-derived value if unset |
| Scan history kept only with an account; suggested name stored as returned, separate from the card | `scans`, `sightings.observed_taxon_provider_name` | **Matches** |
| Both providers' answers recorded only while comparing | `IDENTIFICATION_COMPARISON` + allow-list | **Matches** if the switch is off |
| "An identification is never a statement that a plant is safe to eat, drink or apply" | `ScanCaution` rendered unconditionally; `plant-id-safety.test.ts` fails if a caution is gated on a score | **Matches** |
| *(missing)* a notice at the point of sending | none in `src/components/scan` | **Gap (F-08)** |

**Botanical safety.** Nothing identification-related asks for, stores or shows edibility, toxicity or medicinal claims: plant.id is asked only for `common_names,taxonomy`; `ScanCaution` states a photo "says nothing at all about whether the plant can be eaten, drunk, applied or handled without harm"; card membership never promotes a candidate (`outcomeFor` reads provider rank). No wording change recommended to the safety copy itself.

**Proposed in-flow notice for F-08 (wording only; placement/styling are the owner's/UI lane's):** *"To identify a plant, your photos are sent to PlantNet (or plant.id) with location data removed. Nothing that identifies you is sent. [How your photos are handled]"* linking to `/privacy#plant-id`, shown before the first upload and as a one-time acknowledgement, not a checkbox on the confirm button (`CLAUDE.md` forbids a second decision in front of the single-action flow; this sits before the *scan*, not the *find*).

---

## 4. Production inventory

Moved to `docs/release/production-promotion-plan.md` sections 1 and 3, because the read-only SQL and workflow names are part of the promotion gate:
which migrations and functions production SHOULD have (0001-0009 required; 0011+0013 together iff the Field Board ships; **0010, 0012, 0014, 0015 not for V1**; five
functions individually, `challenge-submit` absent), the exact probe SQL for "which migrations are applied" (there is **no ledger**: `run-migration.yml` posts raw SQL and does not
write `schema_migrations`), policy/privilege/RLS/settings queries, and the seven read-only workflow names. **None of it was executed.**

---

## 5. The one commit on `claude/planning-session-61zwro` that is not in `integration`

**`e3a5d4ed`**, "Promote integration to production: agent guardrails, PR gate, untracked private assets - OWNER MERGES (#38)", 2026-11-19. It is a **squash** of
nine integration PRs (#26, #28, #29, #30, #31, #32, #35, #36, #37): the ownership manifest and guard (`agents/ownership.json`, `scripts/agent-guard.mjs`,
`src/lib/ownership.test.ts`), the PR gate, `docs/agent-workflow/*`, the decision record, and the removal of 928 tracked private/evidence binaries from tracking (files stay on disk;
history untouched). 965 files: 35 added, 928 deleted, 2 modified.

Because it is a squash, `git log origin/integration..production` lists it as "missing" although its **content** is already there as the individual PRs. Measured: of the 37 paths it adds or
modifies, the only one whose integration content differs from the squash is `agents/ownership.json`, where **integration's is newer**; no `iCloud Photos` path is tracked on either side (I checked that folder only, not the evidence binaries individually).
It therefore carries **no unique content**, and cherry-picking it would *revert* newer ownership rules.

**Proposal:** do not cherry-pick. In the promotion PR (`integration -> claude/planning-session-61zwro`), if GitHub reports the branches diverged, first merge production into integration with
`git merge -s ours e3a5d4ed` through a reviewed PR: it records the squash as an ancestor and changes **no file**, so the later promotion fast-forwards cleanly. Owner merges (plan step 5). Not executed.

---

## 6. Verification

`npm run verify` (lint, typecheck, `check:edge`, vitest, build): **exit 0** on the final tree (see the PR for the pasted tail). New tests: `persistence-signed-in.test.ts` (4),
`persistence-signed-out.test.ts` (11), `v1-security-audit.test.ts` (48).
