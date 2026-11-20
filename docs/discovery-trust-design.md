# Discovery trust: design for owner review

- Status: **DRAFT FOR OWNER REVIEW. Nothing in this document is active, and nothing in the code depends on it.**
- Lane: Discoveries (`agent/discoveries/trust-design`). Docs only. No code, test, schema, scoring or flag was changed.
- Written: 2026-11-20. Standing direction: `docs/agent-workflow/decisions.md` ("Discovery trust") and CLAUDE.md
  ("Progression is self-declared (TODAY) - and the direction is changing", "The Field Board").

This is a proposal. Where it says "should", it is a recommendation the owner may reject. Where it says "is",
it describes the repository as read on the date above; each such claim names the file it came from.

---

## 0. Summary

1. **Today every stage is a claim.** A discovery is two taps (`DiscoverPanel`). `discoveries` rows are written by
   the client under RLS with only an id check (migration 0013), and the Field Board pays 50 points per row.
2. **The cheapest honest improvement is a server-issued receipt, not a better detector.** `identify-plant` already
   sees every photograph and already issues an HMAC attestation for the Seed Shelf (`species-attestation.ts`).
   The same pattern can bind *"this account's live identify call returned this species at this time"* into a
   signed token that a later, server-side step checks before a competitive point counts. It adds no coordinates,
   no retained originals and no second definition of "did this complete".
3. **The receipt proves less than people will assume.** It proves an identifier saw an image and named a species
   for this account. It does not prove the plant was outdoors, alive, in front of the player, or photographed by
   them. A photograph of a screen or of a printed card passes. Section 8 says this plainly.
4. **Only one signal is a real gate, and it is a gate on the *rule*, not on the *person*.** The recommended rule
   is: a competitive point counts if the record is older than a one-way cutover (grandfathered, forever) or is
   backed by a valid receipt. Everything else (hashes, velocity, review) is a *soft* signal that routes to
   review or a label, never to automatic denial, because a false positive denies a real find (CLAUDE.md,
   "Detecting the card from the image was considered and rejected").
5. **Almost every file this needs belongs to the coordinator.** The reducer, the schema, the leaderboard SQL,
   the remote storage adapter and the edge functions are Tier 1 or Scan-owned. This lane can change only
   sightings, journal, import and Field Board presentation. Section 6 lists each file, and section 6.4 lists the
   Shared Change Requests this design needs.
6. **Ten questions are the owner's** (section 10). The most consequential: whether a competitive find must use a
   live camera stream (`getUserMedia`) rather than the OS camera hand-off, and what happens on the Field Board to
   players who cannot or will not.

---

## 1. Constraints this design must satisfy

These are the owner's, restated so each later choice can be checked against them. Sources are in the header.

| # | Constraint | Where it bites in this design |
|---|---|---|
| C1 | Competitive discoveries should eventually require in-app camera capture | Section 4.1, 5 |
| C2 | Practical anti-cheat, and **server-side** reward validation, where the reducer already runs on the server | Section 6 |
| C3 | Imported photos stay valid for **educational identification**. Looking a plant up is not a find | Section 3, 5.2 |
| C4 | Journal entries may stay self-reported | Section 3 |
| C5 | Existing collections, scores and accounts preserved. No retroactive revocation or rescoring | Section 7.3 |
| C6 | Several camera angles are **not** evidence of presence. Build nothing that treats 2-3 photographs as proof | Section 4.9 |
| C7 | No unnecessary EXIF. `prepareImage` has no path returning original bytes. No signal may need retained coordinates | Section 4, 8 |
| C8 | Everything behind feature flags, old and new rules coexisting, new ones inert until switched on | Section 7 |
| C9 | A false positive denies a real find and is worse than the cheat it prevents | Section 4 (each signal carries its cost) |
| C10 | Nothing here is active, and no rule is activated or presumed until the owner has reviewed it | Whole document |

Also binding from the existing code, and easy to violate by accident:

- **`discoveries` stays card-level.** CLAUDE.md: "do not add confidence or taxonomic columns to `discoveries`".
  Evidence lives on the sighting and the scan. This design obeys that: no evidence field is proposed for
  `discoveries`.
- **XP is derived, never stored.** Nothing here adds an XP counter.
- **A discovery pays XP exactly once by primary key.** The design must not add a second path to XP.
- **The Seed Shelf cannot pay.** Receipts do not change that.
- **No invented botany.** No signal may claim a species grows in a place. The cards carry no range data.

---

## 2. What exists today (as read, not as remembered)

Each line is a fact a reviewer can check.

- **A discovery is written by the client.** `applyDiscovery` (`src/lib/herbdex-reducer.ts:70`) is pure. Signed in,
  the result is inserted straight into `public.discoveries` by `remote-herbdex-storage.ts`; the only server check is
  that `herb_id` is a real catalogue id (migration 0013, `is_catalogue_herb`).
- **`discoveries.discovered_at` is client-suppliable.** Column default is `now()` (0001), but nothing forces the
  server clock. `discover()` even takes an optional `at` so a claimed Seed Shelf packet keeps the date it was
  found. Consequence: **a client-supplied date cannot be used to decide which records are grandfathered.**
  `sightings.created_at`, by contrast, is forced to the server clock by a trigger in 0013. This matters in
  section 7.3.
- **Mastery and research completion are already server-recomputed.** `supabase/functions/herbdex-action` runs
  `reconcileMastery` and `reconcileResearch` (synced from `src/lib/herbdex-reducer.ts` by
  `npm run sync:edge-shared`) and is the only writer of `mastered` and `research_completions`; 0013 removed the
  client insert policy on both. This is the "recompute path" C2 refers to.
- **The Field Board is derived, not ledgered.** `leaderboard_standings()` (0011, hardened in 0013) computes
  `50 x discoveries + 15 x qualifying journal species (daily cap 4, UTC) + 100 x collection/seasonal challenges`.
  `leaderboard.ts` mirrors the SQL by hand; `leaderboard-schema.test.ts` compares the numbers.
- **The scan path.** `ScanPanel` -> `identifyPlant` (`scans.ts`) -> `identify-plant` edge function -> candidates.
  A signed-in `recordScan` writes a `scans` row (provider, `identification_observation_id`). Confirmation calls the
  ordinary `discover()`, writes a sighting with the observed taxon, and calls `confirmScan`.
- **The photo input is `capture="environment"`** (`ObservationPhotos.tsx:236`). That attribute is a *hint*: on
  phones it opens the OS camera, but most browsers still offer the photo library, and desktop browsers ignore it.
  **So today "scan" is not an in-app capture, and nothing can distinguish a fresh photograph from an old file.**
  An observation requires 2-3 photographs (`MIN_OBSERVATION_PHOTOS = 2`), which is an accuracy rule for the
  identifier, not evidence of presence (C6).
- **`prepareImage` re-encodes everything**, dropping EXIF and GPS, and has no path that returns original bytes.
  The file explains why this was made unrepresentable rather than discouraged.
- **A mint-time attestation pattern already exists.** `identify-plant` signs `(canonical name, gbif_id, powo_id)`
  with HMAC-SHA-256 under `SPECIES_ATTESTATION_SECRET`; `seed-packet` verifies it with `crypto.subtle.verify`; an
  unset secret fails closed; replay is harmless because the verifier creates canon only when absent, so there is
  no nonce table. This is the closest existing precedent for a receipt.
- **The five trust levels** (`src/lib/entry-point.ts`): visited a URL, owns a deck, found a plant, verified a
  sighting, mastered a card. Level 4 "does not exist today."

---

## 3. Which surface gets which rule

The direction is not "make everything strict." It is that different surfaces make different claims.

| Surface | Claim it makes | Proposed rule | Reason |
|---|---|---|---|
| Looking a plant up (scan with any photo, card page) | "What is this?" | **Unrewarded, always allowed.** Imported photos and library files stay valid. | C3. Education is the product's reason to exist, and a lookup has no competitive stake. |
| Collection discovery, **non-competitive** (signed out, or not on the Field Board) | "I found this" | Unchanged: self-reported. | The Field Board is the only surface where a false record moves a number other people see (CLAUDE.md). A solo collection cheats only its author. |
| Collection discovery, **competitive** (counts toward the Field Board) | "I found this outdoors" | Counts only if grandfathered or backed by a valid receipt (section 5). | C1, C2. |
| Journal entry | "I wrote this down" | Unchanged: self-reported. Already bounded structurally: one payment per species, daily cap 4. | C4. |
| Mastery, research, achievements | Derived from the above | Unchanged. Whatever re-derives them keeps doing so. | A card in the collection still means "unlocked"; the board is what changes (section 5.4). |
| Seed Shelf | "I identified a species with no card" | Unchanged. Cannot pay. | Not competitive. |

**Design choice: the gate is on the Field Board's counting rule, not on whether a discovery is recorded.**

*Alternative A: refuse to record a discovery without a receipt.* This is what "require camera capture" can be read
as. Rejected as the first step because it breaks `/start`'s one-action promise, strands every signed-out player,
and changes the card-awarding path for everyone to fix a problem that exists only on the board. Cost of choosing
the board-only gate: a signed-in player's own collection, XP and garden still move on a self-reported find. That
is consistent with "existing collections preserved" and with the fact that a solo collection harms nobody; it is
inconsistent with a future where XP itself is competitive (the Field Board does not use XP: it counts species).

*Alternative B: two parallel collections ("verified" and "unverified").* Rejected. It doubles every count in the
UI, and "verified" is a word this product has refused to use (`PROVISIONAL` is in the type so a verified tier "has
to be added rather than assumed"). Section 5.3 uses a different, narrower word.

---

## 4. Candidate signals

Each signal is judged on the same four questions: what does it prove, what does it cost the player, can it be
beaten cheaply, and does it break C7. "False-positive cost" is what an honest player loses. Per C9, a signal whose
false positives are real is only ever allowed to *soften* (label or route to review), never to deny.

### 4.1 Live in-app capture (`getUserMedia`) instead of the OS camera hand-off

- **What it is.** The scan screen opens a camera stream inside the page and takes the frame from a `<video>` onto a
  canvas. The frame never exists as a user-selectable file. It is then re-encoded by `prepareImage` as today.
- **What it proves.** That the pixels came from a camera device the browser exposed *to this page, now*. It rules
  out an old file from the library, a saved web image, and a screenshot. It is the only signal that addresses
  "the file was not taken just now."
- **What it does not prove.** A virtual camera, an emulator, or a phone pointed at a monitor passes. A page cannot
  attest the integrity of the camera stack; only platform attestation (App Attest, Play Integrity) could, and a
  static export has no such thing.
- **False-positive cost: real.** It denies players whose browser lacks `getUserMedia`, who have blocked camera
  permission, who use an in-app browser (social app webviews often block it), who use an assistive or
  non-standard camera route, and anyone on a desktop with no webcam. It also moves the experience away from the
  OS camera app, which has better focus, HDR, stabilisation and macro. A blurry viewfinder frame can reduce
  identification accuracy, and `docs/identification.md` / CLAUDE.md show the project already measured that accuracy
  moves in both directions with image size.
- **Mitigation.** Failure of capture degrades to the unrewarded lookup path, with the plain-language reason shown,
  never to an error. The player still gets the identification.
- **C7.** No EXIF is read. Live frames have none. Compatible.
- **Recommendation.** Offer behind its own flag, optional at first (section 7), and decide the "required" question
  with data (section 10, Q1).

### 4.2 Server-issued receipt over the identify call (the core of the proposal)

- **What it is.** `identify-plant` already authenticates the caller, sees the images, gets a result and returns an
  `observationId`. It would additionally return a **receipt**: an HMAC over
  `(user_id, observation_id, confirmable herb_id, observed-taxon key, rank, issued_at, capture_kind, receipt_version)`
  under a dedicated secret. It writes nothing and stores nothing new. This is the mint attestation pattern applied
  to a find.
- **What it proves.** This authenticated account made a live identify request, the provider named this taxon and
  this card was `confirmable` for it, at this server time. It makes the *claim* "I scanned it" unforgeable *as a
  claim* and bounds it to the account and the time.
- **What it does not prove.** Presence, outdoors, aliveness or authorship of the photograph (section 8).
- **False-positive cost: near zero.** It is derived from a flow every honest scan already takes; the only honest
  player excluded is one whose provider call failed, who has no identification to claim anyway. Failure modes are
  operational (secret unset, clock skew), not behavioural; the secret-unset case should fail *open to the old
  rule*, not closed, so a misconfigured deployment cannot lock out players (opposite of the mint attestation, and
  deliberately: that secret protects a global immutable table, this one protects a point count).
- **Cheat cost.** Beaten by photographing a screen or a card. Raises the effort of cheating from "two taps" to
  "obtain an image of the species and scan it", with the identifier's own quota (450/day global, per-caller limits)
  and a real provider cost per attempt as the throttle.
- **Replay.** A receipt for `(user, observation_id)` can be presented twice; the second presentation does nothing
  because discoveries are already one row per `(user_id, herb_id)` by primary key. No nonce table is needed for
  the same reason the mint attestation needs none. A receipt for a *different user* fails the user_id check.
- **TTL.** Long (the mint attestation uses 90 days) because a signed-out player may scan now and sign in later,
  and the import is what presents the receipt. Section 7.4 discusses the signed-out case, which is the hard part.
- **C7.** Carries no coordinates, no image, no hash.
- **Recommendation.** This is the core. It is the smallest change that makes the board's rule *checkable*.

### 4.3 Capture-session challenge (fresh-frame binding)

- **What it is.** When live capture starts, the server issues a short-lived HMAC-signed nonce
  (stateless: `HMAC(user, nonce, expiry)`). The nonce travels with the upload; the receipt includes it. A file
  prepared earlier cannot carry a nonce that did not exist when it was made.
- **What it proves.** The upload was initiated after the session began. It is **only meaningful with 4.1**: with
  the OS file picker, the player can still choose an old photograph after starting a session.
- **False-positive cost: low but real.** Slow or dropped networks let the nonce expire (mitigation: generous
  window, retry mints a new one). A phone that backgrounds the page while the OS camera is open (this is exactly
  the case `ScanPanel` documents for `capture="environment"`) is the likeliest honest failure.
- **Cheat cost.** Still beaten by pointing the live camera at a picture. Adds a round trip, which CLAUDE.md
  measured as the thing the scan flow already suffers from (four serialized round trips were removed).
- **Recommendation.** Defer. Add only if 4.1 ships and replay of pre-made files proves to be a real pattern.

### 4.4 Perceptual fingerprint of the *prepared* image (cross-account and cross-species duplicates)

- **What it is.** A 64-bit difference hash computed on-device from the already downscaled, EXIF-free canvas, sent
  with the receipt request. The server can then tell whether the same picture was used by many accounts or for many
  species. **The image is not retained and the hash is not reversible to the image.**
- **What it catches.** The same web photograph reused by several accounts; one photograph claimed for several
  species; one photograph reused on many days.
- **What it does not catch.** Anything novel; any edit that changes enough bits (a crop and a filter defeat a
  dHash); a photograph of that photograph.
- **False-positive cost: real, and the reason it must never deny.** (a) A single player legitimately takes several
  near-identical frames of one plant: within-account near-duplicates are *expected* and must be neutral. (b) Two
  players at a labelled public specimen (a garden, a school plant, a trail marker) can produce near-identical
  frames. (c) Burst shots and photos of a stable scene collide more than people expect at low bit-depth.
- **Privacy cost.** A stored fingerprint of a person's photograph is a derived personal record: it would have to
  be in `USER_TABLES`, in the account export and in deletion (`account-security.test.ts` pins export and deletion
  to the same set in both directions). It also quietly reintroduces the thing C7 and the `prepareImage` comment
  work to avoid, a durable property of a person's photograph. This is a genuine cost, not a formality.
- **Recommendation.** Do not build in the first phase. If built, use it **only** to *reduce a label* (a find
  matched by many accounts is labelled "not independently captured") and **never** to remove points. Decision for
  the owner (Q6).

### 4.5 Velocity and shape heuristics (many species, very fast)

- **What it is.** Flag an account that confirms more than N distinct species in M minutes, or a sustained rate no
  walk could produce.
- **False-positive cost: high.** A meadow, a botanical garden, a plant sale, a field class, a foraging group and a
  day-long hike all produce bursts. Species counts per walk are naturally heavy-tailed. Any fixed threshold chosen
  without data will either miss cheating or accuse enthusiasts.
- **What the code already does.** The journal's daily cap and the one-row-per-species primary key already bound
  the worst case structurally, without judging anyone.
- **Recommendation.** Do not build as a rule. Log aggregate, anonymous distributions during any trial so the owner
  can see whether a threshold would be meaningful before there is one (Q7). Never auto-deny.

### 4.6 Scan-to-confirm consistency

- **What it is.** Require that the species being claimed was a *candidate in the same observation* (`scans.top_*`
  and `confirmed_*` columns already exist).
- **What it proves.** The claim matches what the identifier saw. This is already largely true on the scan path,
  and is the check the receipt makes unforgeable.
- **False-positive cost: low.** It excludes the "tap Discover on a card page" path from competitive credit, which
  is the intent. The scan's `top` vs `chosen` split is already stored because a player may legitimately pick the
  second candidate; the receipt must follow the **chosen** candidate, not the top one, or it would re-create the
  bug CLAUDE.md records ("the top candidate is not the chosen one").
- **Recommendation.** Part of 4.2, not separate.

### 4.7 Photographing a printed card (rejected, restated)

CLAUDE.md records this as considered and rejected: a high-contrast quadrilateral detector is easy to build, but a
false positive (a leaf against a window frame, a label at a botanical garden) *denies a real find*, and the
provider returns no signal for "photograph of a photograph". This design does not reopen it. The honest statement
is that a deck owner can scan a card and get a correct identification, which is the educational path (C3), and
under this design that scan alone confers no competitive credit if the capture was not live (4.1) and does so
only because of that rule, not because Plantdex tried to *detect* the card.

### 4.8 Coordinates, device motion, device attestation (rejected)

- **Geolocation / EXIF GPS.** Rejected by C7. Note that even an on-device "is this in a plausible region" check
  would need range data the cards do not carry, which would be inventing botany.
- **Device motion / orientation.** Rejected: permission prompt on iOS, no desktop equivalent, trivially spoofed, and
  it samples a person's movement for a gain this product does not need.
- **Platform attestation (App Attest, Play Integrity, WebAuthn-style hardware attestation).** Not available to a
  static GitHub Pages web app. If Plantdex ever ships a native shell this is the only signal that would meaningfully
  address virtual cameras, and it would be a separate design.

### 4.9 Multiple photographs of one observation (explicitly not a signal)

Per C6, **nothing in this design treats two or three photographs as evidence of presence.** The 2-3 photograph
rule exists because both providers treat the set as one individual and return a better answer. A cheater can
photograph a screen three times. No receipt field, hash comparison or rule here depends on the count. A test in
section 9 pins this.

### 4.10 Human or community verification (level 4)

- **What it is.** A second person corroborates a sighting: a reviewer, a nearby player, a naturalist, a school or
  club leader.
- **What it proves.** The only thing on this list that could honestly be called "verified".
- **Cost.** Moderation labour, a reporting and appeals path, and a social surface the product has deliberately not
  built (no feed, no followers). Reporting another player is a harm surface.
- **Recommendation.** Out of scope for this design; named so the trust ladder (section 5.3) has a place for it and
  nobody mistakes 4.2 for it.

### 4.11 Signal summary

| Signal | Proves | Beaten by | Honest-player cost | Coordinates / originals | Role in design |
|---|---|---|---|---|---|
| 4.1 Live capture | Fresh pixels from a page-visible camera | Virtual cam, screen | **Real** (devices, permissions, webviews, a11y) | None | Optional, then maybe required (Q1) |
| 4.2 Receipt | Account + live identify + species + time | Screen, card, web image | Near zero | None | **Core** |
| 4.3 Session nonce | Upload came after session start | Live camera on a picture | Low | None | Deferred |
| 4.4 Fingerprint | Image reuse across accounts/species | Edits, rephotography | **Real** (near-dupes, shared specimens) | Stores a derived fingerprint | Not first phase; label-only |
| 4.5 Velocity | Implausible rate | Waiting | **High** | None | No rule; measure only |
| 4.6 Consistency | Claim matches the scan | Same as 4.2 | Low | None | Folded into 4.2 |
| 4.7 Card detection | (nothing the provider can confirm) | n/a | **High** | None | Rejected (already) |
| 4.8 GPS / motion / attestation | n/a | n/a | n/a | Violates C7 / unavailable | Rejected |
| 4.9 Photo count | **Nothing** (C6) | Trivially | n/a | None | Explicitly forbidden |
| 4.10 Human | Corroboration | Collusion | Moderation burden | None | Out of scope |

---

## 5. The proposed model

### 5.1 Two facts that must stay separate

- **A discovery** says: *this card is unlocked for this player.* Unchanged, card-level, write-once, no evidence.
- **A receipt** says: *this account's live identify call, at time T, named a taxon that qualifies for this card.*
  It is evidence about an event, held on the **sighting/scan side**, which is where CLAUDE.md already puts it.

The competitive count reads both. No new fact enters `discoveries`.

### 5.2 Where each new signal sits on the five trust levels

The trust levels must not collapse (`entry-point.ts`). The proposal adds **no sixth level and moves no existing
one.** It adds evidence *within level 3* and leaves level 4 empty.

| Level | Meaning | Today | With this design |
|---|---|---|---|
| 1 Visited a URL | A code or link was seen | `/start`, public pages. Grants nothing. | **Unchanged.** No receipt can be issued without a scan call, so a QR can never produce one. |
| 2 Owns a deck | Paid for the object | Unproven; `redeem-deck-code` exists for entitlements | **Unchanged.** A receipt says nothing about ownership. |
| 3 Found a plant | Someone was in front of a living thing | A tap | **Split into two recorded strengths, not two levels:** *self-reported* (a tap, as today) and *captured* (a valid receipt). Neither claims presence; `captured` claims "an identifier saw an image through our flow". |
| 4 Verified a sighting | A third party corroborated 3 | Does not exist | **Still does not exist.** Receipts must never be named "verified". |
| 5 Mastered a card | Earned through the collection's rules | Server-recomputed | **Unchanged.** Mastery reads discoveries, learned and sightings as before. |

Suggested vocabulary for the board, deliberately weaker than "verified": a point is **self-reported** or
**scan-recorded**. The word "verified" stays reserved for level 4 (Q4).

### 5.3 What the board counts

`leaderboard_standings()` keeps its three components. Only the **discovery** component gains a condition, behind a
flag, evaluated per row:

> A discovery row counts toward the 50-point component if **(a)** it was inserted at or before the one-way cutover
> (grandfathered), **or (b)** there is a valid receipt for that species on this account.

- Journal entries and challenges are unchanged (C4; challenges already server-recomputed).
- With the flag off the function is byte-for-byte today's behaviour (section 7.2).
- `photoBackedEntries` stays a separate informational count and is **not** reinterpreted as capture evidence: a
  photograph attached to a journal entry may be a library file. The two must not be conflated.
- The page's provisional labelling interacts as described in section 7.5.

**Choice: per-row condition in SQL, not a stored "verified points" column.** Reason: CLAUDE.md bans a cached
`points` column on the board for the same reason it bans one on profiles, and derived scoring "falls out of set
membership rather than being enforced". *Alternative: a `points_validated` ledger.* Rejected: it creates the
mutable number the schema was designed not to have. *Cost of the choice:* the SQL grows a join and a hand-written
TypeScript mirror must change in lockstep (`leaderboard.ts` is mirrored by hand and pinned by
`leaderboard-schema.test.ts`).

### 5.4 What a competitive find does *not* change

- XP, levels, Field Cards, garden growth, mastery, achievements and research continue to follow the collection,
  exactly as now. A self-reported find still unlocks the card and still pays the printed-card XP.
- This is a deliberate narrowness: **only the Field Board's discovery component becomes conditional.** If the
  owner decides XP itself is competitive, that is a larger change touching `progression.ts` and every system fed
  by XP, and it should be a separate design (Q2).

---

## 6. Server-side validation: how it plugs in, and which files

### 6.1 Principle: one definition, reused

The reducer is the server (CLAUDE.md, "V0.3 accounts"): `src/lib/herbdex-reducer.ts` is copied into
`supabase/functions/_shared/herbdex/` by `npm run sync:edge-shared` and used by `herbdex-action`. This design adds
**no second implementation of "did this complete".** The receipt check is a *pure predicate*
`hasValidReceipt(receipt, user, herbId, now)` placed beside the other pure modules, so the client mirror, the edge
function and the tests call the same function. HMAC verification itself happens on the server only; the client can
display a receipt's state but cannot establish it.

### 6.2 The flow (all behind flags; nothing runs until switched on)

1. `identify-plant` (Scan lane) returns the existing answer plus, **only if** `RECEIPTS_ISSUE` is on, a receipt for
   each *confirmable* candidate it returned. It writes nothing.
2. The client keeps the receipt for the chosen candidate beside the pending confirm, exactly as it keeps the Seed
   Shelf attestation on a local find.
3. On confirm the client calls the ordinary `discover()` and `addSighting()` as today **and** stores the receipt
   with the sighting (a nullable column, additive, like the observed-taxon columns in 0006).
4. A server-side step records the receipt as accepted. Two options:
   - **4a (recommended): `herbdex-action` gains a `capture` branch.** It already runs under the caller's own session
     for reads, uses the service role for exactly two writes, and is the established place where "a client claim
     cannot be taken on faith." It would verify the HMAC and insert one write-once row into a new
     `capture_receipts` table (no update policy, same as `mastered`), using the same pure predicate.
   - **4b: the leaderboard SQL verifies in-database.** Rejected: HMAC secrets would live in Postgres, and the
     pure TypeScript predicate could not be shared, which is precisely a second implementation.
5. `leaderboard_standings()` reads `capture_receipts` when `FIELD_BOARD_REQUIRE_CAPTURE` is on (section 7).

### 6.3 What stays untouched, and why that is the point

`applyDiscovery`, `applyLearned`, `reconcileMastery`, `reconcileResearch`, `reconcileAchievements`, XP, levels,
the garden, Field Research and the knowledge check are **not edited.** Their idempotence tests
(`herbdex-reducer.test.ts`, `mastery.test.ts`) must pass unmodified; section 9 makes that a property.

### 6.4 File ownership (checked against `agents/ownership.json` and `node scripts/agent-guard.mjs who <path>`)

**Files this lane may change (Discoveries, Tier 2).** Per `agents/ownership.json`:
`src/components/journal/**`, `src/components/leaderboard/**`, `src/app/journal/**`, `src/app/leaderboard/**`,
`src/lib/sightings*`, `src/lib/remote-sightings*`, `src/lib/import-local-progress*`, `src/lib/observation-*`,
`src/lib/leaderboard*`, `src/lib/remote-leaderboard*`, `src/lib/board-view*`, `src/lib/field-board-access*`,
`src/lib/local-date*`, plus anything under `docs/**` and `agents/ledger/**` / `agents/requests/**`.
In this design that covers: the board's labelling and copy, the sighting's *optional receipt field on the client
side* (once the schema exists), the client mirror in `leaderboard.ts` (once the SQL is agreed), and
`import-local-progress` carrying a stored receipt across sign-in.

**Files that belong to the COORDINATOR (Tier 1) and therefore need a Shared Change Request, not an edit here:**

| File / area | Why it is touched | Owner per manifest |
|---|---|---|
| `supabase/migrations/**` (new migration: receipts table, nullable receipt column on `sightings`, **server-stamped insert time on `discoveries`**, leaderboard function update, config row) | Schema and RLS | coordinator (`supabase/**`) |
| `supabase/functions/herbdex-action/**` | Verify and record receipts | coordinator |
| `supabase/functions/_shared/herbdex/*` (generated mirror of the pure predicate) | Sync target | coordinator, and Scan for the listed mirrored modules |
| `scripts/sync-edge-shared.mjs` (add the new pure module to `PURE_MODULES`) | Keeps the mirror honest | coordinator |
| `src/lib/herbdex-*` (only if a pure predicate is placed beside the reducer) | Shared pure logic | coordinator |
| `src/lib/types.ts` (only if a shared receipt type is needed) | Shared contract | coordinator |
| `src/lib/remote-herbdex-storage.ts` | Persists records; the discovery insert path | coordinator |
| `src/lib/leaderboard-integrity.test.ts`, `src/lib/*-schema.test.ts`, `src/lib/account-security.test.ts`, `src/lib/edge-shared.test.ts` | Pins that must grow with the schema | coordinator (`*-schema.test.ts`, `account-security*`, `edge-shared*`) |
| `src/lib/export-account-data*` and `delete-account*`; `supabase/functions/delete-account/**` | New user table must be in export and deletion | coordinator |
| `.env.example`, `next.config.ts`, `package.json` | Flag definitions, build-time defaults | coordinator |
| `CLAUDE.md` | Record the final decision | coordinator |
| `docs/agent-workflow/decisions.md` | Standing decisions | coordinator |
| `src/lib/progression.*`, `src/lib/mastery.*`, `src/lib/research.*`, `src/lib/achievements*`, `src/lib/field-cards*` | **Not touched by this design.** Listed so nobody assumes they are. | coordinator |

**Files that belong to the SCAN lane (Tier 2) and need a request to *them*, not an edit here:**
`supabase/functions/identify-plant/**` (issue the receipt), `src/lib/scans*` and `src/lib/scan-*` (carry it),
`src/components/scan/**` and `src/app/scan/**` (live-capture UI, if 4.1 is built),
`src/lib/image-prepare*` (any change near the "no original bytes" rule), `src/lib/species-attestation.ts` (the
pattern to follow), `src/lib/plant-match*`.

**UI-owned, needing a UI request:** any new capture screen design, board copy that changes the look, and
`src/app/herbdex/**`. This lane may supply plain markup with existing tokens and `data-ui-placeholder` only.

### 6.5 Shared Change Requests this design would file (not filed by this lane)

Per `agents/README.md` rule 3, "Contract first, feature second, never in the same branch." Proposed, in order, using
`agents/templates/request.md`:

1. **Contract:** migration adding `capture_receipts` (write-once, owner-select, service-role insert only), a
   nullable `sightings.capture_receipt` column, a server-clock trigger on `discoveries` for a new
   `recorded_at`, and a config row for the cutover. *All inert; nothing reads them.*
2. **Contract:** the pure `hasValidReceipt` predicate and its mirror, plus `PURE_MODULES` entry.
3. **Contract:** `identify-plant` issues a receipt behind `RECEIPTS_ISSUE`. Scan lane.
4. **Feature:** `herbdex-action` capture branch behind `RECEIPTS_ACCEPT`.
5. **Feature:** leaderboard SQL and mirror behind `FIELD_BOARD_REQUIRE_CAPTURE`. Needs the owner's review of this
   document first. This lane then writes the presentation.

This lane files **none** of these now. The task is the design.

---

## 7. Rollout, migration, rollback

### 7.1 Flags (all default OFF; none are added by this lane)

Two kinds are needed and they must not be confused: **client build flags** (the app is a static export, so the
value is baked in at build time, like `NEXT_PUBLIC_BOSS_FORMS` in `next.config.ts`, which defaults to `'off'` so
the bundler drops the dead code) and **server flags** (edge function secrets / a config row, switchable without a
redeploy of the site).

| Flag | Kind | Default | Controls | Dependencies |
|---|---|---|---|---|
| `RECEIPTS_ISSUE` | server (identify-plant) | off | The identify function returns a signed receipt. Writes nothing. | needs `DISCOVERY_RECEIPT_SECRET` (dedicated, never the service-role key) |
| `RECEIPTS_ACCEPT` | server (herbdex-action) | off | The function verifies and records a presented receipt. Inert if none are presented. | `RECEIPTS_ISSUE` meaningful first |
| `NEXT_PUBLIC_LIVE_CAPTURE` | client build | `off` | Live `getUserMedia` capture available on the scan screen. | none |
| `NEXT_PUBLIC_LIVE_CAPTURE_REQUIRED` | client build | `off` | A competitive find must use live capture. Meaningless unless the previous flag is on. | `LIVE_CAPTURE`, Q1 |
| `FIELD_BOARD_REQUIRE_CAPTURE` | server (config row read by the standings function) | off | The discovery component counts only grandfathered or receipt-backed rows. | all of the above; the cutover must be set |
| `NEXT_PUBLIC_FIELD_BOARD_SCORING_LABELS` | client build | `off` | The page shows the self-reported / scan-recorded split. | none for the label itself |

Names are proposals. Only the *defaults and ordering* are the substance. Each flag has exactly one effect, so any
one can be turned off without disabling the others.

**Choice: server-side flags for anything that changes who is counted.** A build-time client flag cannot change a
ranking, and a ranking that depends on which build a player has cached would be inconsistent. *Alternative:* keep
all flags client-side for simplicity. Rejected for the scoring flag only. *Cost:* the server flag needs a config row
(or secret) and a way to flip it that is not a deploy, which is the coordinator's decision (Q9).

### 7.2 Dual-running: old and new rules coexisting

Four phases. Each is independently shippable and independently reversible. **Switching to a later phase is the
owner's decision at each step**, and this document recommends none of them are automatic.

- **Phase 0, today.** Nothing issues or accepts a receipt. Board = today's rule.
- **Phase 1, issue only (`RECEIPTS_ISSUE`).** Receipts are produced and stored with sightings. Nothing reads them.
  Purpose: find out how many honest scans would have qualified. **Success condition is a measurement, not a
  decision:** what share of confirmed scans carry a valid receipt.
- **Phase 2, accept and shadow (`RECEIPTS_ACCEPT`).** The server records receipts. A **shadow board query** (a
  second function or a report, not the public board) computes what the standings *would be* under the new rule
  beside the real one. The public board is unchanged. Purpose: show the owner, before anything changes, exactly
  how many real players and how many points would move.
- **Phase 3, enforce for new records (`FIELD_BOARD_REQUIRE_CAPTURE`).** Only now does the public board change, and
  only for discoveries recorded after the cutover.
- **Phase 4 (optional, owner-only):** `LIVE_CAPTURE_REQUIRED`.

**Why shadow first.** A competitive rule that changes a visible ranking cannot be validated by unit tests; the
honest test is "who would this have moved." It costs one extra query and prevents the failure C9 names.

### 7.3 Preserving the existing record (C5)

- **No row is deleted, rewritten or re-scored.** The enforcement is a *read-time condition*, so the underlying
  records are exactly what they are today.
- **Cutover is a server timestamp, set once, never moved.** The rule is "recorded at or before the cutover counts as
  it always did." Because `discoveries.discovered_at` can be supplied by the client (section 2), it **cannot** be
  the grandfathering key: a client could backdate a new find to look old. The migration must add a **server-stamped**
  `recorded_at` (trigger, as 0013 did for `sightings.created_at`) to `discoveries`, and rows that exist when the
  migration runs are backfilled with the migration's own time, so they are unambiguously "before." Nothing else
  can be correct.
- **Grandfathering is permanent.** A pre-cutover discovery counts as long as the account lives. Switching the
  flag off and on again must not change which rows are grandfathered, which is why the cutover is a stored value,
  not "when the flag was last on."
- **Signed-out progress imported later.** `import-local-progress` carries discoveries into an account after the
  cutover. Those rows are *new* server records (their `recorded_at` is the import time), so under enforcement they
  would not be grandfathered. This is a real design fork, not a detail (Q5):
  - *Option 1:* treat imported signed-out finds as non-competitive unless they carry a stored receipt. Consistent
    with the rule, but a player who has played for months signed-out and then signs in loses board credit. That
    reads as retroactive revocation in spirit, even though no row changes.
  - *Option 2:* an **import window** that grandfathers whatever a device held before a stated date, offered once,
    which is an honest "everything you had before this rule" cutover. Cost: a one-time hole for backfilled
    claims.
  - The existing import is already "a one-time, explicit, additive merge, offered once per account", so Option 2
    has a natural mechanism. This lane recommends Option 2, but it changes how much of the board is checkable on
    day one, so it is the owner's call.
- **Accounts created before the cutover but not yet on the board** (no `leaderboard_participants` row): joining
  later does not change their grandfathered rows.

### 7.4 Signed-out play

A receipt is issued to an authenticated account (`user_id` is in the signed payload). A signed-out player has
no account, so cannot get one. Options:

1. Signed-out scans are lookups only for competitive purposes. Fully consistent; the board is account-only anyway.
2. Anonymous receipts bound to a device token. Rejected: creates a durable identifier with no account, which cuts
   against the privacy posture (`/privacy`) and the `track()` one-parameter rule.

Recommendation: option 1, with the local record keeping working as today for the *private* collection. A signed-out
player who later joins the board gets a receipt only for scans made while signed in; earlier finds fall under the
import decision in 7.3.

### 7.5 Interaction with the Field Board's provisional labelling

- `PROVISIONAL` stays and **every** point still reads provisional. A receipt does not make a point "verified"; it
  makes it *scan-recorded*, which the page may say in words (`NEXT_PUBLIC_FIELD_BOARD_SCORING_LABELS`).
  `leaderboard.ts` types `verification: typeof PROVISIONAL`; that stays the only value. Adding a second value is
  how a "verified" claim would sneak in, and is excluded.
- During Phase 2 the page is unchanged. During Phase 3 the page must say, above the table, in plain words, what
  counts now and that earlier finds still count. A rule change that the page does not state is the shape of the
  `/terms`-denies-the-shop bug this repo has shipped before.
- `leaderboard-schema.test.ts` and `legal.test.ts` must be extended by the coordinator, because the privacy and
  terms pages describe what the board publishes. A new stored thing (the receipt) must appear in `/privacy` and in
  the export (Tier 0, owner-edited copy).
- `photoBackedEntries` keeps its existing meaning and is not renamed.

### 7.6 Rollback

- **Every phase is a flag flip, not a deploy and not a data change.** Flag off returns the standings function to
  the exact current output, because no row was altered and the new conditions are guarded by the flag.
- **Receipt rows are inert when ignored.** Leaving the table in place after rollback costs storage only.
- **The server-stamped `discoveries.recorded_at` column and trigger stay** after rollback; they are harmless and
  removing them would re-open the backdating problem for any future attempt. Rolling back the *migration* is a
  coordinator decision and is not needed to roll back the *rule*.
- **The one irreversible step** is setting the cutover. That is why it is recorded, written once, and why Phase 2
  (shadow) exists before it. If a cutover is set wrongly, the remedy is "treat the cutover as earlier" (more rows
  grandfathered), never later, since later would revoke.
- **Rolling back never revokes a score a player already holds**; it can only make scoring more permissive.

---

## 8. What this design cannot prove

Stated flatly, because a trust feature that overclaims is worse than none.

1. **It cannot prove a plant was outdoors, alive, or present.** A receipt proves an identifier named a species from
   an image submitted by an account. A photograph of a screen, a printed card, a page of a field guide, a plant in
   a shop, a houseplant, or a neighbour's garden produces the same receipt.
2. **It cannot prove the player took the photograph.** A friend's photograph, a downloaded image through a virtual
   camera, or a recording played into a webcam all pass unless platform attestation exists, which a static web app
   cannot use.
3. **Live capture (4.1) narrows but does not close the file-replay hole.** It stops casual reuse of a library image.
   It does not stop an emulator or a camera pointed at a monitor.
4. **A correct identification is not a safe-to-use identification.** Nothing here says anything about edibility or
   safety, and the receipt must never be presented as vouching for either.
5. **The identifier can be wrong, and a wrong species yields a valid receipt for a wrong card.** The receipt follows
   the *chosen candidate* with its recorded confidence and eligibility. It does not turn a low-confidence suggestion
   into an established fact, and a receipt for a `genusCard` or `legacyGenus` match records that fact (the
   `eligibility` field) rather than hiding it.
6. **It does not detect collusion** (two accounts, one real plant, trading receipts is impossible because receipts
   are bound to `user_id`, but two people can photograph the same plant for two accounts).
7. **It does not make the board "fair"; it makes cheating cost something.** The honest claim is "the board now
   requires an action that two taps cannot perform", not "the board is verified."
8. **The shadow data is not ground truth.** Phase 2 shows how many scans would qualify, not how many were honest.
9. **The Boss Form challenges, journal and Field Research are unchanged and remain self-reported or client-derived
   where they are today.** This design does not claim to have closed those.
10. **It leans on the hosting of the secret.** If `DISCOVERY_RECEIPT_SECRET` leaks, receipts are forgeable until it
    is rotated, and rotation invalidates unaccepted receipts. Accepted receipts (stored rows) remain.

---

## 9. Test plan, as properties (what must stay true)

Properties only. None are code, and none are added by this lane. The coordinator and Scan lane own the test files.

**Preservation (C5)**
- P1. With every new flag off, the standings output is identical to today's for any fixed set of rows.
- P2. No row in `discoveries`, `sightings`, `scans`, `research_completions`, `mastered` or `learned` is changed or
  deleted by any phase, including rollback.
- P3. A discovery recorded at or before the cutover counts under any flag setting, including after flags are
  toggled off and on repeatedly.
- P4. The cutover value, once set, is never altered by any code path, and "earlier" is the only permitted
  correction.
- P5. A client-supplied `discovered_at`, however old, cannot make a post-cutover discovery grandfathered.

**Idempotence and non-duplication of rules**
- P6. `applyDiscovery`, `applyLearned`, `reconcileMastery` return the same object when nothing is new, unchanged.
- P7. XP is a pure function of `HerbdexState`; no receipt, flag or table changes it.
- P8. Presenting the same receipt N times produces the same state as presenting it once.
- P9. The receipt predicate has one definition, shared by the edge function mirror and the client, and
  `edge-shared.test.ts` still passes with it included.

**Authenticity**
- P10. A receipt for user A is rejected for user B.
- P11. A receipt whose species field was edited is rejected.
- P12. An expired receipt is rejected; a not-yet-valid one is rejected.
- P13. An unset secret never produces a receipt and never causes the board to deny a grandfathered or flagged-off
  row.
- P14. A receipt follows the **chosen** candidate, never the leading one.
- P15. A receipt is never issued for an unconfirmable result, and records `eligibility` truthfully.

**False-positive safety (C9)**
- P16. Under every flag, any scan that returns an identification returns it, whatever happens to the receipt. A
  receipt failure never turns into an identification failure.
- P17. Capture failures degrade to the unrewarded lookup path with a stated reason, never to a dead end.
- P18. No soft signal (hash, velocity) can reduce a player's points or remove a card. It can only add a label or
  queue a review.
- P19. The same player scanning several near-identical frames of one plant is never penalised.

**Privacy and evidence (C6, C7)**
- P20. No receipt, table, column or signal contains coordinates, an image, or EXIF.
- P21. `prepareImage` still has no path that returns original bytes; `image-prepare.test.ts` still passes unchanged.
- P22. No rule's outcome depends on the number of photographs in an observation (C6).
- P23. Any new user-owned table appears in both the account export and `USER_TABLES`, in both directions.
- P24. No new table other than the existing `profiles` grants an update policy; the receipt table has no update or
  client insert policy.

**Trust levels and honesty**
- P25. `/start` imports no store, reducer or progression module and cannot produce a receipt.
- P26. The Seed Shelf remains unable to pay, and receipts do not change `isShelfEligible`.
- P27. `discoveries` gains no confidence, taxon or evidence column.
- P28. No UI or type says "verified" for a receipt-backed point. `PROVISIONAL` remains the only `verification`
  value.
- P29. When the rule is on, the board page states what counts, and that earlier finds still count.
- P30. Dailies and the regional Quest Board still pay no board points.

**Rollout**
- P31. Each flag has exactly one effect and can be turned off independently without breaking any other.
- P32. Every flag defaults to off in the repository and in `.env.example`.
- P33. The shadow report never alters the public board.
- P34. A production build with all flags off contains none of the new client code paths (dead-code elimination, as
  `NEXT_PUBLIC_BOSS_FORMS` already does).

---

## 10. Questions for the owner

Each states a recommendation, and what the answer changes.

1. **Must a competitive find use a live camera stream, or is a receipt from any live identify call enough?**
   Live capture closes the "old library file" hole but locks out some devices and may reduce photo quality.
   *Recommendation:* ship live capture as optional first, measure, then decide. A receipt alone is cheap and
   safe; live capture is the part with real exclusion cost.
2. **Is the Field Board the only competitive surface, or will XP, levels or Field Cards ever be?** This design
   gates only the board's discovery points. Gating XP is a much larger change to `progression.ts` and everything
   downstream, and conflicts with the "the whole ladder is reachable without the scanner" property.
   *Recommendation:* board only, until there is a reason.
3. **Is a lookup-only experience for people who cannot use the camera acceptable, or must there be a
   non-camera path to competitive credit?** (Accessibility, no-camera devices, desktop players.) A non-camera path
   is by definition not evidence, so it either gets no board credit or the rule has an exception that undoes it.
4. **Wording.** Is "scan-recorded" acceptable, or is any label beyond "provisional" a step too far? The word
   "verified" is reserved for level 4. The owner owns the copy (privacy, terms and safety pages are Tier 0).
5. **Signed-out progress imported after the cutover** (7.3): Option 1 (needs a receipt) or Option 2 (one-time
   import window)? This decides whether long-time signed-out players keep board credit.
6. **May the server keep a perceptual fingerprint of a prepared photograph?** It helps catch cross-account reuse,
   adds a derived personal record to export and deletion, and reintroduces a durable property of a person's
   photograph. *Recommendation:* no, not in the first phases.
7. **May we collect aggregate, anonymous distributions (species per day, scans per hour) during shadow mode to learn
   whether any heuristic is meaningful?** No identifiers, counts only. If the answer is no, heuristic signals stay
   unbuilt.
8. **Human verification (level 4).** Is there any appetite for reviewer or peer corroboration, even later? If yes,
   it needs its own design (reporting, appeals, moderation load, a social surface the product has avoided).
9. **Who flips a server flag, and how?** A secret change, a config row, or a deploy. The coordinator decides the
   mechanism; the owner decides who may use it and whether flipping `FIELD_BOARD_REQUIRE_CAPTURE` needs a second
   approval.
10. **Is a board-visible rule change acceptable at all while the board is still in provisional launch?** The
    alternative is to leave the rule as is and ship only the labelling and measurement (Phases 1-2) until the
    board has real participants to protect.

---

## 11. Recommendation, in one paragraph

Do Phases 1 and 2 first, because they change nothing a player sees and tell the owner what the rule would do
before it does it. Treat live capture as an optional improvement to measure, not a gate to impose. Gate only the
Field Board's discovery component, leave XP and the collection alone, grandfather everything that exists by a
server-stamped, one-way cutover, and never describe the result as "verified." If the shadow numbers show that the
rule would move many honest players, that is the answer: do not switch it on.

## Appendix A. Alternatives considered and not recommended

- **Require a receipt to record any discovery.** Breaks `/start`'s single action, strands signed-out players,
  changes the card-awarding path. See section 3.
- **Server-side ledger of "validated points".** Creates the mutable number the schema avoids. See 5.3.
- **Verify the HMAC inside Postgres.** Second implementation of the predicate, secret in the database. See 6.2.
- **Backdate-proof grandfathering using the client `discovered_at`.** Forgeable. See 7.3.
- **Anonymous device-bound receipts for signed-out players.** A durable identifier without an account. See 7.4.
- **Treat 2-3 photographs, EXIF presence, or image "freshness" as proof.** Forbidden (C6, C7).

## Appendix B. What was read to write this

AGENTS.md (headings and trust/fabrication rules), CLAUDE.md, `agents/README.md`, `agents/ownership.json`,
`agents/templates/task-card.md`, `docs/agent-workflow/decisions.md`, `src/lib/entry-point.ts`,
`src/lib/herbdex-reducer.ts`, `src/lib/scans.ts`, `src/lib/leaderboard.ts`, `src/lib/image-prepare.ts`,
`src/components/scan/ObservationPhotos.tsx`, `supabase/functions/herbdex-action/index.ts`, and migrations 0001,
0002, 0011 and 0013. No credential, secret, production endpoint or user data was read or needed.
