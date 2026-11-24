# Discovery trust: design for owner review (revision 2)

- Status: **DRAFT FOR OWNER REVIEW. Nothing in this document is active, and nothing in the code depends on it.**
  Every flag it names defaults OFF. Stage 4 (enforcement) needs the owner's separate approval and is not designed here
  beyond the decision it needs.
- Lane: Discoveries (`agent/discoveries/trust-design`, PR #40). Docs only. No code, test, schema, scoring, flag,
  workflow, package or data was changed.
- Revision 1: 2026-11-20 (board points only). **Revision 2: 2026-11-24**, after the owner's product decision (below).
  Standing direction: `docs/agent-workflow/decisions.md` ("Discovery trust"), CLAUDE.md ("Progression is self-declared
  (TODAY) - and the direction is changing", "The Field Board").
- Shared Change Request drafts (not applied, not filed with anybody): `agents/requests/discoveries-*.md`, indexed in
  section 7.

Where this says "should", it is a recommendation the owner may reject. Where it says "is", it describes the repository
as read on 2026-11-24, naming the file. Wording rule used throughout: an in-app scan is **evidence of taking part in the
capture process, not proof the plant was outdoors or genuinely found**, and the word "verified" is never used for it.

---

## 0. What changed since revision 1, and the summary

**The owner's decision (2026-11-24).** Earning a NEW collectible plant CARD should eventually require an ELIGIBLE IN-APP
PLANT SCAN rather than simply marking the plant discovered. It applies to genuine collectible unlocks, not educational
browsing. It is NOT to be enforced yet: enforcement is staged, flags default OFF, Stage 4 needs separate approval.

This replaces revision 1's scope (gate only the Field Board's discovery points). That is a bigger change than it sounds,
for one structural reason found in the trace (section 4): **XP, levels, Field Cards, garden growth, achievements and
the board's discovery component are all derived from the same `discoveries` rows, and that table is written directly by
the client.** So there is exactly one place where "a scan is required to own a card" can be made true for everything at
once: the write to `discoveries`. A board-only gate (revision 1) leaves a self-reported card with full XP; a client-only
gate is not a gate at all.

Summary:

1. **Six different things are being discussed and the code already keeps most of them apart** (section 2): educational
   identification, an eligible scan-based discovery, card ownership, competitive credit, journal sightings, mastery.
   The design's job is to keep them apart while adding exactly one new fact, the **scan receipt**.
2. **The receipt is the smallest honest evidence.** `identify-plant` already sees every photograph and already signs
   an HMAC attestation for the Seed Shelf (`species-attestation.ts`). The same pattern can sign "this signed-in account's
   live identify call named this taxon for this card at this time". It carries no coordinates, no EXIF, no image and
   does not depend on how many photographs there were.
3. **What it proves is narrow, and the words say so** (sections 3 and 11). It proves an account took part in Plantdex's
   capture-and-identify process. It does not prove presence, outdoors, aliveness or authorship.
4. **Real enforcement can only live on the server, and only at the write** (section 4.3). Everything before that is
   measurement. That is why the plan is four stages and why Stage 4 is the owner's alone.
5. **Almost every file belongs to the coordinator or the Scan lane** (section 7). This lane drafts five Shared Change
   Requests and applies none of them.
6. **Nobody who cannot use a camera is stranded from the educational experience** (section 9) and nothing existing is
   revoked, rescored or rewritten (section 8).
7. **Seven decisions are the owner's** (section 13), each with a recommended default.

---

## 1. Constraints this design must satisfy

| # | Constraint | Source / where it bites |
|---|---|---|
| C1 | A NEW collectible card should eventually require an eligible in-app scan | Owner, 2026-11-24. Sections 3, 4.3, 10 |
| C2 | Not enforced yet. Staged, flags default OFF, Stage 4 needs separate approval | Owner. Section 10 |
| C3 | Preserve all existing collections and achievements | Owner. Section 8 |
| C4 | Preserve existing XP and leaderboard scores, **no retroactive penalty** | Owner. Section 8 |
| C5 | Educational photo-upload identification stays | Owner. Sections 2, 9 |
| C6 | Journal entries stay explicitly self-reported | Owner. Section 2 |
| C7 | Player privacy, accessibility, and the handling of uncertain identification are preserved | Owner. Sections 9, 13 |
| C8 | **No GPS, no EXIF, no "several photographs" as proof of presence** | Owner. `prepareImage` keeps "no path returns original bytes" |
| C9 | In-app scan = evidence of participating in capture, **not** proof the plant was outdoors or found. Never "verified" | Owner. Everywhere it matters |
| C10 | Server-side reward validation, through the existing server-side progression authority, never a second reward system | CLAUDE.md. Sections 4, 6 |
| C11 | A false positive denies a real find and is worse than the cheat it prevents | CLAUDE.md ("Detecting the card from the image was considered and rejected") |
| C12 | Nothing is active or presumed until the owner has reviewed it | `decisions.md` |

Binding from existing code, easy to violate by accident: **`discoveries` stays card-level** (no confidence, taxon or
evidence column; CLAUDE.md "Identification"); **XP is derived, never stored**; **a species pays once by primary key**;
**the Seed Shelf cannot pay**; **no invented botany** (no signal may say a species grows somewhere; the cards carry no
range data); **no `update` policy** on any progression or history table except `profiles`.

---

## 2. Six different things

These are six facts. Every bug this system has had is two of them being treated as one, so each gets a definition, an
author, a record and its readers. Section 2.7 shows which may exist without which.

### 2.1 Educational identification (a lookup)

**What it is.** Somebody asks "what is this plant?" with a photograph, from any source: the OS camera, the photo
library, a downloaded image, a photo of a card. The identifier answers and Plantdex shows the candidates and the card
page. It is learning, not a find. **Who writes it:** the player's request; the answer is written by `identify-plant`
(and returned, not stored). **Record:** none that matters. A signed-in player's history row in `scans` (client-inserted,
no evidential weight); signed out, nothing server-side. **Read by:** the scan UI only. Nothing derived from XP,
mastery, the board or the garden reads it. It stays always allowed, rewards nothing, and works signed out (5 a day,
signed in 10; `scan-allowance.ts`).

### 2.2 Eligible scan-based discovery

**What it is.** A *Collect* scan: an identify call made through Plantdex's own capture flow, signed in, that the
server answered, whose chosen candidate is `confirmable` for exactly one card under an owner-approved eligibility, and
for which `identify-plant` issued a **scan receipt**. It is a fact about an event ("this account took part in the capture
process and the identifier named this taxon"), not about the plant. **Who writes it:** `identify-plant` issues the
receipt; the server (`herbdex-action`, a new capture branch) validates and records it. The client may only carry the
token. **Record (new):** `scan_receipts`, write-once, no client insert, no update (section 8). **Read by (new):** the
claim path that Stage 4 would gate on; the shadow report in Stage 3; the board's label. **Exactly what makes a scan
eligible is in section 3.**

### 2.3 Collectible card ownership

**What it is.** `discoveries`: "this Plantdex card is unlocked for this player". `{herbId: timestamp}` and nothing
more. **Who writes it:** today the client, directly (`remote-herbdex-storage.ts` `upsertNew`), under RLS with only an
id check; signed out, `localStorage`. **Record:** `public.discoveries`, primary key `(user_id, herb_id)`. **Read by:**
everything that matters: XP, levels, Field Card thresholds, garden growth, achievements, collection percentage, mastery,
Field Research, the board's 50-point component, journal qualification. **It keeps meaning exactly what it means today
and gains no evidence field.** After Stage 4 it would additionally mean "unlocked either before the cutover or through an
eligible scan", but that is a property of the *write path*, not a new column on the row (section 8.2).

### 2.4 Competitive leaderboard credit

**What it is.** Points the Field Board shows to other people: `50 x species + 15 x qualifying journal species (daily cap
4, UTC) + 100 x collection/seasonal challenges`. **Who writes it:** nobody; it is derived at read time by
`leaderboard_standings()` (0011, hardened in 0013) from `discoveries`, `sightings` and `research_completions`. There is
no points column, by design (`leaderboard-schema.test.ts`). **Record:** the standings function's output, plus the opt-in
row in `leaderboard_participants`. **Read by:** `/leaderboard`. Every point is marked provisional on the page and
`PROVISIONAL` is the only value of `verification` in the type. It is the only surface where a false record moves a
number other people see.

### 2.5 Journal sightings (self-reported, allowed)

**What it is.** "I saw this again; here is my note and maybe a photo." **Who writes it:** the player, directly
(`sightings-store.ts`, then `remote-sightings.ts` signed in). **Record:** `public.sightings`, with a server-clock
`created_at` (0013) and optional observed-taxon columns (0006) when it came from a scan. **Read by:** the journal page,
mastery (a sighting count of at least `SIGHTINGS_FOR_MASTERY = 1`), Field Research, and the board's 15-point component
(only for a species already in `discoveries`). It stays self-reported and the page says so. A note about a walk is the
player's own record; this design never makes a journal entry require a scan.

### 2.6 Plant mastery

**What it is.** The third stage of a card: discovered, learned, mastered. **Who writes it:** the server only. 0013
removed the client insert policy; `herbdex-action` re-derives it (`reconcileMastery`) and inserts with the service role.
**Record:** `public.mastered`, write-once. **Read by:** the garden, achievements, Field Research, the profile.
Mastery reads discoveries, learned and sighting counts and is **not** a scan fact: this design does not ask a mastered
card to have been scanned. It inherits scan-gating only indirectly, because it needs a discovery row to exist.

### 2.7 Which may exist without which

"Can the row-thing exist without the column-thing?" Today (T) and after Stage 4 if the owner enables it (S4).

| May exist WITHOUT -> | 1 Lookup | 2 Eligible scan | 3 Card ownership | 4 Board credit | 5 Journal | 6 Mastery |
|---|---|---|---|---|---|---|
| **1 Lookup** | n/a | Yes | Yes | Yes | Yes | Yes |
| **2 Eligible scan** | **No** (it is an identification) | n/a | Yes (scanned, not claimed, or already owned) | Yes | Yes | Yes |
| **3 Card ownership** | T: Yes (two taps). S4: **No** for a NEW card | T: Yes. S4: **No** for a NEW card, **Yes** for any pre-cutover row | n/a | Yes | Yes | Yes |
| **4 Board credit** | Yes | T: Yes. S4: not for a post-cutover discovery point | **No** (every component joins `discoveries`, or needs server research completions) | n/a | Yes (discovery points alone) | Yes |
| **5 Journal** | Yes | Yes | Yes (a note may exist; it pays only with 3) | Yes | n/a | Yes |
| **6 Mastery** | Yes | T: Yes. S4: only via 3 | **No** | Yes | **No** (needs at least one sighting, and `learned`) | n/a |

What the table says in words:

- Educational identification and journal sightings are the two things that must **never** depend on a scan. They are
  independent of everything.
- Card ownership is the only thing the owner's decision changes, and only for a *new* card after a cutover.
- Everything downstream of ownership (board credit, mastery, XP, garden) inherits the rule from ownership and gains no
  rule of its own. That is the "no second reward system" requirement in structure.
- Journal sightings pay board points only for a species already owned. After Stage 4, a player with no scan receipt for
  a species and no pre-cutover discovery of it has no journal points for it either, because the join needs the
  discovery. That is a consequence to state in the page copy, not to hide.

---

## 3. What makes a scan ELIGIBLE

An **eligible scan** is one for which every one of the following holds. Each item names who checks it. Items 1 to 5 are
checked by the server at issue; 6 to 8 by the server at claim. None needs GPS, EXIF or a photograph count.

| # | Condition | Checked by | Notes |
|---|---|---|---|
| E1 | The caller is an **authenticated account** (`auth.getUser()` in `identify-plant`) | identify-plant | Signed out gets the identification and no receipt (decision D4) |
| E2 | The request declared `purpose: "collect"` (the Collect flow). A `lookup` request, or a request with no purpose (every existing client), never receives a receipt | identify-plant | This is the single switch that separates an educational upload from a scan. It is a **declaration** by the client, not something the server can observe (section 3.1) |
| E3 | The identify call **succeeded** at the provider and the answer was not `notAPlant` / `providerFoundNothing` | identify-plant | Already the existing control flow |
| E4 | The chosen candidate is `confirmable` for exactly one card, with an `eligibility` in the owner-approved set | identify-plant (re-derives with the shared matcher; the client's claim is not trusted) | The set is decision D2. `ambiguous` and `sameGenus` are never eligible, as today |
| E5 | The candidate's position and band satisfy the owner's rule (top-ranked only, or any listed candidate) | identify-plant | Decision D2. The receipt records `top` / `listed` truthfully either way |
| E6 | The receipt's HMAC verifies under a dedicated secret, is bound to **this** `user_id`, is within TTL, and the claimed card matches the signed card | herbdex-action | One shared pure predicate (section 6) |
| E7 | No `scan_receipts` row exists yet for `(user, card)` | herbdex-action | A second presentation is a no-op: replay needs no nonce table, the same argument that makes the mint attestation safe |
| E8 | Within the existing quota (`claim_scan`) | identify-plant | Unchanged: 450 global, 10 per account per day |

### 3.1 What "scan" can honestly mean, and the one thing the server cannot see

The server **cannot tell a live camera frame from an uploaded file.** An upload through the Lookup path and a photo
taken a second ago look identical to `identify-plant`: both arrive as 2 to 3 re-encoded JPEGs from `prepareImage`.
`capture="environment"` in `ObservationPhotos.tsx` is only a hint to the browser. So E2 is a client declaration. A
person scripting the API with their own token can declare `collect` over any image.

This is acknowledged, not hidden. The design's value is in four narrower things it does achieve:

1. The **two-taps path** (a card page's Discover button, `DiscoverPanel`) stops being enough, which is the actual
   problem today.
2. A competitive point requires a **round trip through the identifier**, which costs the cheater a real provider call
   from a shared 450 a day, and a per-account cap of 10 a day.
3. The record **names the species, the account and the time** at the server's clock, which makes the board's rule
   checkable and a shadow report possible.
4. The honest player is **not asked for anything new** beyond choosing the Collect entry point.

A live `getUserMedia` stream (section 5.1) would raise item 2's cost further for the casual case but has real exclusion
cost. It is an owner choice (D1), and the design works without it.

### 3.2 What an eligible scan is NOT

Not proof the plant was outdoors. Not proof it was alive, present, or photographed by the player. A photograph of a
screen, a printed card, a field guide page, a shop plant or a neighbour's garden produces the same receipt (CLAUDE.md
already records why detecting these was rejected). Not a safety statement: a correct identification is not a
safe-to-use identification and a receipt must never be presented as vouching for either. Not "verified": that word
stays reserved for trust level 4 (a third party corroborating), which does not exist. The word the UI may use, if the
owner approves one (D7), is **scan-recorded**.

---

## 4. The current server-authoritative progression path, traced from the code

Read 2026-11-24. File paths are real. "Server-side" below means code that runs where the player cannot edit it.

### 4.1 Who writes what today

| Record | Written by | Path | Server-authoritative? |
|---|---|---|---|
| `discoveries` | **Client** | `DiscoverPanel` / `ScanPanel.confirmCandidate` -> `discover()` (client `applyDiscovery`) -> `remote-herbdex-storage.ts` `upsertNew` -> PostgREST `insert ... on conflict do nothing` under the player's own JWT | **No.** RLS `insert with check (auth.uid() = user_id)`; the only added server check is `is_catalogue_herb(herb_id)` (0013, a `NOT VALID` constraint that applies to new rows). `discovered_at` is client-suppliable |
| `discoveries` delete | Client | RLS `own discoveries delete` (0001) | No. A player can delete and re-insert their own row |
| `learned` | Client | same adapter | No |
| `unlocked_achievements` | Client, and `herbdex-action` under the **caller's** session (not service role) | same adapter; `herbdex-action` | No (client-writable under RLS) |
| `sightings` | Client | `sightings-store.ts` -> `remote-sightings.ts`; `created_at` forced to the server clock by trigger `sightings_server_clock` (0013) | Partly: the time is trusted, the content is not |
| `scans` | Client | `recordScan` insert; `confirmScan` is **delete then insert** (no update policy) | **No.** `identification_observation_id` is a value the client writes. A `scans` row is not evidence |
| `mastered` | **Server only** | `herbdex-action`, service role; 0013 removed the client insert policy | **Yes**, but derived from client-written `discoveries`, `learned` and `sightings` |
| `research_completions` | **Server only** | `herbdex-action`, service role, same | **Yes**, same caveat |
| `species_packets` | **Server only** | `seed-packet`, after verifying the HMAC attestation `identify-plant` signed | **Yes**, and the only existing place where a *signed server fact* gates a write |
| `identification_comparisons` | **Server** | `identify-plant`, service role, detached | Yes (telemetry) |
| XP, level, Field Card unlocks, garden stage | **Nobody stores them** | Derived in the browser from `HerbdexState` (`progression.ts`, `field-cards.ts`, `garden.ts`) | **No** server computes them. Research XP is server-gated (it reads `research_completions`); discovery XP is not |
| Board standings | **Server, at read** | `leaderboard_standings()` (definer): counts valid-id rows in `discoveries`, qualifying `sightings`, scoring `research_completions` | **Yes** that it is computed server-side; **no** that its inputs are checked beyond id validity |

Three consequences, each important:

1. **Server-authoritative is true of `mastered` and `research_completions` and of the board's arithmetic. It is not true
   of the thing everything else is built on, which is `discoveries`.** `herbdex-action` reads discoveries under the
   caller's session and trusts them (`supabase/functions/herbdex-action/index.ts`, `discoveries` select, then
   `reconcileMastery`).
2. **The three writes a scan confirmation makes are independent and client-driven.** `confirmCandidate` calls
   `discover(herb)`, `addSighting(...)` and `confirmScan(...)`. None of them depends on another on the server, and none
   cites the observation that `identify-plant` minted. Nothing links a discovery row to a scan that happened.
3. **`identify-plant` already issues a server-signed fact and nothing consumes it for discoveries.** It returns a
   per-candidate `attestation` (HMAC over canonical name, GBIF id, POWO id, issue time) that only `seed-packet` verifies.
   It also mints a random `observationId` per request that is stored nowhere server-side except comparison rows.

### 4.2 The flow, as it stands

```
photos -> prepareImage -> identify-plant (quota, provider call, matcher, attestation)  -> candidates (+ observationId)
                                                                                           |
client ScanPanel.confirmCandidate --+--> discover()   -> RLS insert discoveries (client claim)
                                    +--> addSighting()-> RLS insert sightings (server clock)
                                    +--> confirmScan()-> delete+insert scans (client row)
client store.reconcile() -> herbdex-action (reads those rows, recomputes mastery + research, service-role writes)
board read -> leaderboard_standings() (definer SQL over the same rows)
```

### 4.3 Where a scan-required rule could be enforced, strongest to weakest

| # | Layer | What it can do | What it cannot do |
|---|---|---|---|
| L0 | **The UI** (hide the Discover button, add a camera screen) | Make the honest path obvious | **Not enforcement.** The app is a static export. The Supabase URL and anon key are public by design; any signed-in player can call PostgREST with their own JWT and insert `discoveries` directly. The browser build is readable; `localStorage` is editable. A rule that exists only where the player controls the code is a suggestion |
| L1 | **Read-time in `leaderboard_standings()`** (count a discovery point only if receipt-backed or grandfathered) | Fixes the board with no writes and no revocation | Leaves XP, levels, Field Cards, garden, achievements untouched. Does **not** satisfy C1 |
| L2 | **Read-time in `herbdex-action`** (refuse to derive mastery/research from discoveries lacking a receipt) | Gates the server-derived half of progression | Discovery XP and the garden are still client-derived from the rows |
| L3 | **Write-time on `discoveries`** (drop the client insert policy, as 0013 did for `mastered`; a new server writer inserts only against a valid receipt or a grandfathered basis; a trigger as a backstop) | The only layer that makes "a NEW card requires a scan" **true for XP, levels, Field Cards, garden, achievements and the board at once**, because they all read the same rows | Cannot gate a signed-out player's `localStorage` collection. Changes the card-awarding path: coordinator, owner-approved, **Stage 4** |
| L4 | **Signed-out device** | Nothing | Signed out, the record is the player's own local file. No server code runs. A rule cannot reach it. See D4 |

**Why client-only enforcement is not enforcement.** The client both holds the key and decides whether to use it. The
reducer in the browser (`applyDiscovery`) and the RLS insert are two independent routes to the same row; hiding or
disabling the first does nothing to the second. The existing proof in this repo is migration 0013 itself: `mastered` and
`research_completions` were client-insertable and the board paid for invented rows until the policy was removed and a
server writer replaced it. A scan requirement for cards has to follow that precedent, not a UI change.

**The enforcement point, stated once.** L3. Everything before it (Stages 1 to 3) exists to prove that L3 would not
deny honest players, and to build the evidence L3 would check. This design does not build L3.

---

## 5. Candidate signals (revision 1, condensed; verdicts unchanged)

Each signal: what it proves, what it costs an honest player, whether it can be beaten cheaply, whether it touches C8.

| Signal | Proves | Beaten by | Honest-player cost | Coordinates / originals | Role |
|---|---|---|---|---|---|
| 5.1 Live in-app capture (`getUserMedia`) | Pixels from a camera the page could see | Virtual camera, camera pointed at a screen | **Real**: no webcam, blocked permission, in-app browsers, assistive camera routes, worse photo quality than the OS camera | None | Optional; owner decides if ever required (D1) |
| 5.2 **Scan receipt (HMAC over the identify call)** | Account + identify call + card + time | A screen, a card, a web image, scripting the API with one's own token | Near zero | None | **Core** |
| 5.3 Capture-session nonce | Upload came after a session began | A live camera on a picture; meaningful only with 5.1 | Low (expiry on slow networks, backgrounding) | None | Deferred |
| 5.4 Perceptual fingerprint | Image reuse across accounts or species | Crop, filter, rephotography | **Real** (near-duplicate frames, shared specimens); stores a derived personal record | Derived fingerprint | Not built; label-only if ever |
| 5.5 Velocity heuristics | Implausible rate | Waiting | **High** (meadows, gardens, field classes) | None | No rule; aggregate measurement only |
| 5.6 Scan-to-confirm consistency | The claim matches what the identifier chose | As 5.2 | Low | None | Folded into 5.2; the receipt follows the **chosen** candidate, never the leading one |
| 5.7 Card or screen detection | (nothing the provider can confirm) | n/a | **High** (false positives deny real finds) | None | Rejected, restated |
| 5.8 GPS, EXIF, device motion, platform attestation | n/a | n/a | n/a | **Violates C8** / unavailable to a static export | Rejected |
| 5.9 Number of photographs | **Nothing** | Photograph a screen three times | n/a | None | **Forbidden as a signal** (C8) |
| 5.10 Human or community corroboration | Corroboration (the only thing that could be called verified) | Collusion | Moderation labour, a social surface the product avoids | None | Out of scope; named so nobody mistakes 5.2 for it |

The 2-3 photograph rule exists because both providers treat the set as one individual and answer better. It is an
accuracy rule. No receipt field, hash comparison or rule here depends on the photo count.

---

## 6. The proposed model

### 6.1 Two facts that stay separate

- **A discovery** says: *this card is unlocked for this player.* Unchanged. Card-level, write-once, no evidence field.
- **A receipt** says: *this account's Collect scan, at server time T, named a taxon that qualifies for this card.* It is
  evidence about an event and lives on the scan side (a new table), where CLAUDE.md already puts evidence.

The gate reads both. No new fact enters `discoveries`.

### 6.2 The receipt (Stage 2 builds this; it is inert)

- **Issued by** `identify-plant`, for each *confirmable* candidate it returns, **only if** `SCAN_RECEIPTS_ISSUE` is on,
  the caller is signed in, and the request declared `purpose: "collect"`. It writes nothing and stores nothing.
- **Format**, same family as `species-attestation.ts`: `v1.<base64url body>.<base64url HMAC-SHA-256>`. Body fields:
  `u` user id, `o` observation id, `h` card (herb) id, `k` observed taxon key, `r` rank, `e` eligibility,
  `b` `top` or `listed`, `c` species-confidence band (never the raw score), `iat`. It carries **no coordinates, no image,
  no hash, no photograph count and no device value.**
- **Secret:** a dedicated `SCAN_RECEIPT_SECRET`, never the service-role key and never `SPECIES_ATTESTATION_SECRET`
  (separate blast radius and separate rotation). Unset: no receipts are issued, and **nothing is denied** (section 8.5).
  This is deliberately the opposite of the mint attestation, which fails closed because it guards an immutable global
  table. Here a missing secret must not lock anyone out of anything.
- **TTL: 30 days.** A signed-in player may scan offline-adjacent and claim later; 90 days (the species attestation) was
  chosen for a signed-out-then-sign-in flow that does not exist for receipts.
- **Validated by** `herbdex-action` through one pure predicate `verifyScanReceipt(...)` placed beside the other pure
  modules (coordinator-owned `src/lib/herbdex-receipt.ts`, mirrored by `npm run sync:edge-shared`), so the client's
  display, the edge function and the tests call the same code. HMAC verification itself is server-only.
- **Recorded in** `scan_receipts`, write-once by the service role, primary key `(user_id, herb_id)` so a replay is a
  no-op and there is **no nonce table and no used-token table**.
- **Replay:** a receipt for another user fails E6; one with an edited card or taxon fails the signature; an expired or
  future-dated one fails the time check; presenting the same one twice does nothing.
- **Follows the chosen candidate** (never the top one), records `b` truthfully, and records `eligibility` truthfully.
  A `genusCard` or `legacyGenus` receipt says so; it is never rewritten into an exact one.

### 6.3 What stays untouched

`applyDiscovery`, `applyLearned`, `reconcileMastery`, `reconcileResearch`, `reconcileAchievements`, XP, levels, the
garden, Field Research, the knowledge check, the Seed Shelf and the leaderboard arithmetic are **not edited** in Stages 1
to 3. Their idempotence tests (`herbdex-reducer.test.ts`, `mastery.test.ts`) pass unmodified (property P6).

### 6.4 Vocabulary

A point or a card is **self-reported** (today, and forever for signed-out and for pre-cutover rows) or **scan-recorded**
(has a receipt). Neither word claims presence. `PROVISIONAL` stays the only `verification` value, and any UI or type
that says "verified" for a receipt-backed row is a defect (P28).

---

## 7. Every shared change needed, by owner

Checked with `node scripts/agent-guard.mjs who <path>` on 2026-11-24. Each row is a **draft Shared Change Request** in
`agents/requests/`, written with `agents/templates/request.md`. This lane applies none of them and files none with anyone.

### 7.1 Index

| Draft | Owner of the change | Stage | What it asks for |
|---|---|---|---|
| `discoveries-receipt-contract.md` | **Coordinator** | 2 | Inert migration (receipt table, flags config), the pure predicate and its mirror, export/delete/pin tests, `.env.example` flags |
| `discoveries-receipt-accept.md` | **Coordinator** | 2, 3 | `herbdex-action` capture branch (accept and record, behind a flag) and the shadow report |
| `discoveries-receipt-issue.md` | **Scan** | 2 | `identify-plant` issues receipts behind a flag; `purpose` request field; the client carries a token and shows nothing new |
| `discoveries-presentation.md` | **Discoveries** (this lane's own later work, plus the copy it needs from others) | 2, 3 | Board and sighting presentation, import carry-over, and the Tier 0 / UI copy requests |
| `discoveries-write-gate.md` | **Coordinator, owner-gated** | **4 only** | A stub that records the decision Stage 4 needs. **Not for action** until the owner approves Stage 4 |

### 7.2 Ownership map (for the reviewer)

| Area | Owner | Needed for |
|---|---|---|
| `supabase/migrations/**` (new migration) | coordinator | Receipt table, config row, later `discoveries.recorded_at` and the write gate |
| `supabase/functions/herbdex-action/**` | coordinator | Accept branch |
| `supabase/functions/_shared/herbdex/*` (generated) and `scripts/sync-edge-shared.mjs` (`PURE_MODULES`) | coordinator | Mirror the predicate. A new `_shared` file is coordinator-owned unless the coordinator adds it to the Scan lane's mirrored list in `ownership.json` |
| `src/lib/herbdex-receipt.ts` (+ test) | coordinator | The shared pure predicate. Placed under `herbdex-*` on purpose: it is a trust contract that Scan and Discoveries both consume and neither edits |
| `src/lib/*-schema.test.ts`, `account-security*`, `edge-shared*`, `export-account-data*`, `delete-account*`, `supabase/functions/delete-account/**` | coordinator | A new user-owned table must be in export and `USER_TABLES` in both directions |
| `.env.example`, `next.config.ts`, `package.json` | coordinator | Flag defaults (all OFF) |
| `src/lib/analytics*` (`PLAUSIBLE_GOALS`) | coordinator | Any new event, which must also exist as a Plausible goal |
| `CLAUDE.md`, `docs/agent-workflow/decisions.md` | coordinator | Recording the owner's decision once made |
| `supabase/functions/identify-plant/**`, `src/lib/scans*`, `src/lib/scan-*`, `src/components/scan/**`, `src/app/scan/**`, `src/lib/image-prepare*` | **scan** | Issuing and carrying receipts; the Collect and Lookup entry points |
| `src/lib/leaderboard*`, `src/components/leaderboard/**`, `src/lib/sightings*`, `src/lib/import-local-progress*`, `src/lib/board-view*` | **discoveries** | Board label, sighting carry, import carry |
| `src/lib/progression*`, `mastery.*`, `research.*`, `achievements*`, `field-cards*`, `herbdex-reducer.ts` | coordinator | **Not touched in any stage before 4**, listed so nobody assumes they are |
| `src/app/privacy/**`, `src/app/terms/**`, `src/app/safety/**`, `src/components/legal/**` | human (Tier 0) | Disclosing stored receipts; the owner writes this copy |
| `src/app/herbdex/**`, `src/app/globals.css`, `src/components/ui/**`, `src/lib/entry-point*`, `src/lib/first-run*` | ui (human-directed) | Any new capture screen design, `/start` wording |

---

## 8. Migration requirements

Everything here is a requirement the coordinator's migration must satisfy. None is applied by this lane. Applying a
migration to production is an owner-gated operation (`decisions.md`, safety requirement 4).

### 8.1 New objects (Stage 2, all inert)

- **`public.scan_receipts`** (write-once). Columns: `user_id uuid references auth.users on delete cascade`,
  `herb_id text`, `observation_id text`, `observed_taxon_key text`, `observed_taxon_rank text`, `eligibility text`,
  `rank_position text` (`top`/`listed`), `species_confidence text`, `issued_at timestamptz`,
  `recorded_at timestamptz not null default now()` (server clock, trigger-forced as `sightings.created_at` is),
  `receipt_version integer`. Primary key `(user_id, herb_id)`. CHECK constraints repeat every enumeration from the
  TypeScript arrays (`TAXON_RANKS`, `SPECIES_CONFIDENCES`, eligibility), as 0006 did, and `identification-schema.test.ts`
  holds them equal. `herb_id` carries `is_catalogue_herb` like the other progression tables.
- **RLS:** `select` own. **No client insert, update or delete policy.** The service role inserts, with
  `ignoreDuplicates`. It is therefore a derived table in the same class as `mastered`, and `profile-schema.test.ts`'s
  "no second table grants an update" still passes.
- **User-owned, so:** in `USER_TABLES` of `delete-account`, in `export-account-data.ts`, and the cascade on the foreign
  key takes it on account deletion. `account-security.test.ts` pins both sets equal.
- **A config row** (or equivalent) `discovery_rules`: `receipts_issue`, `receipts_accept`, `shadow_report`,
  `require_receipt_for_new_cards`, and a nullable **`cutover_at`**. All false / null. The standings function and the
  future gate read it; with everything off they behave byte-for-byte as today (P1).

### 8.2 What must stay write-once, and what must NOT be added

- **`discoveries`, `learned`, `mastered`, `research_completions`, `unlocked_achievements`, `sightings`, `scans`,
  `scan_receipts` keep no `update` policy.** `profiles` remains the single deliberate exception.
- **`discoveries` gains no evidence, confidence, taxon or provider column** (CLAUDE.md; P27). The one permitted
  addition, and only at Stage 3 or 4, is a **server-stamped `recorded_at`** (below). A timestamp that records *when the
  server saw the row* is not a claim about identification.
- **No cached points or "validated points" column** anywhere (it is the mutable number `leaderboard-schema.test.ts` bans).

### 8.3 What existing rows get

- **Every existing row in every table is left exactly as it is.** No delete, no rewrite, no re-score (P2).
- `scan_receipts` starts empty. Nothing backfills a receipt for a past discovery, because inventing one would be
  fabricating evidence.
- **`discoveries.recorded_at`** (separate, later migration, so the Stage 2 contract touches no existing table): added
  with `default now()`, so every existing row is stamped with the migration's own time, which is unambiguously "before".
  A `before insert` trigger forces the server clock on new rows (as 0013 did for `sightings.created_at`). It is
  required because **`discovered_at` is client-suppliable** (`discover()` takes an `at`, and the import writes client
  timestamps), so it can never decide who is grandfathered: a client could backdate a new find.

### 8.4 The one-way cutover and grandfathering

- **One stored value, `discovery_rules.cutover_at`, set once, never moved later.** The rule, if the owner ever enables it:
  *a discovery recorded at or before `cutover_at` is a legitimate unlock forever; one recorded after needs a receipt.*
- **Grandfathering is permanent.** Toggling every flag off and on again changes no row's status, because status is a
  comparison against a stored timestamp, not "when the flag was last on" (P3, P4).
- **The only permitted correction is earlier, never later** (later would revoke). If a cutover is set wrongly, the
  remedy is to treat it as earlier.
- **Choose `cutover_at` before the rule is announced.** An announced date invites a land rush of mass-inserted
  `discoveries` rows that would be grandfathered. The shadow phase (section 10, Stage 3) is also what would show one.
  Because the stamp is applied to every existing row at migration time, the migration should precede any public
  statement of the rule, and `cutover_at` should be that moment or earlier.
- **Signed-out progress imported later** (`import-local-progress`) becomes new server rows with a new `recorded_at`.
  This is a genuine fork (D5): treat as non-grandfathered, or open a **one-time import window** that grandfathers whatever
  a device held before a stated date. The existing import is already "one-time, explicit, additive, offered once per
  account", so the second option is a natural extension.
- **`discoveries.delete` exists** (RLS). A player deleting their own pre-cutover row and re-inserting it gets a new
  `recorded_at` and loses grandfathering on that row. That is harmless (it can only make the player's own record
  stricter) and needs no mitigation.

### 8.5 Rollback

- **Every phase is a flag flip, not a deploy and not a data change.** With flags off, `leaderboard_standings()` returns
  today's output exactly (P1).
- `scan_receipts` rows are inert when ignored; leaving the table after rollback costs storage only.
- `discoveries.recorded_at` and its trigger **stay** after rollback: harmless, and removing them would reopen the
  backdating hole for any later attempt.
- A rollback **never revokes a score or a card a player holds**. It can only make the system more permissive.
- **The only irreversible step is setting `cutover_at`.** That is why it is a stored value, why it can only move earlier,
  and why Stage 3 (shadow) exists before it.
- **A missing or rotated secret never denies.** Unset `SCAN_RECEIPT_SECRET` means no receipts issue and the gate (if on)
  cannot be satisfiable for new cards, so the gate flag must refuse to turn on while the secret is unset (a coordinator
  check in the migration or the function, listed in the SCR). Rotation invalidates unclaimed tokens; recorded rows remain.

---

## 9. Accessibility

The design must not strand anyone from the educational experience. The sentence that organises this section: **a
receipt is only ever issued for the Collect flow, and the Lookup flow is never worse for anyone than it is today.**

### 9.1 What every path gets, whatever the player can or cannot do

| Capability | Camera-capable | Camera-less (no webcam, blocked permission, in-app browser, cannot photograph) |
|---|---|---|
| Identify a plant from a photograph (Lookup) | Yes | **Yes**, upload a file (a friend's, a stored photo) |
| Read any card page, sources, safety notices, chemistry, seasons | Yes | **Yes** |
| Journal entries and notes (self-reported) | Yes | **Yes** |
| Seed Shelf entries from a Lookup of a species with no card (pays nothing) | Yes | **Yes** (decision D3) |
| Existing collection, XP, garden, achievements, board standing | Preserved | **Preserved** |
| Mastery of cards already owned (learn, knowledge check, sightings) | Yes | **Yes** |
| Field Research dailies and standing tasks for owned cards | Yes | **Yes** |
| **Unlocking a NEW collectible card** (after Stage 4 only) | Yes, through Collect | **No**, unless the owner chooses an alternative route (decision D6) |
| New board discovery points (after Stage 4 only) | Yes | No, same reason |

Said plainly, because a design that hides the cost is worse than one that states it: **the camera-less path keeps
everything educational and everything the player already has, and does not earn new collectible cards once the rule is
enforced.** Whether an alternative route exists is a product decision (D6), not a technical default.

### 9.2 Specific groups

- **Players who cannot use a camera at all** (no device, motor or vision limitation, no consent to a camera): Lookup by
  upload is complete for learning. Nothing existing is taken away. The new-card route is the open question D6. Options
  there include a non-scan study route that unlocks a card, which would change progression (coordinator, owner) and so is
  not assumed here.
- **Screen reader users (VoiceOver, TalkBack, NVDA, JAWS).** The existing scan screen announces state through
  `aria-live="polite"` regions (`ScanPanel`, `ObservationPhotos`). Any new surface follows the same pattern: Collect and
  Lookup are two ordinary labelled buttons (descriptive text, not an icon alone); a receipt outcome is announced in a
  status region and is the **same sentence** a sighted player reads; a rejected scan is a heading and a paragraph, not a
  toast that disappears. **The OS camera hand-off is often more accessible than any in-page viewfinder** (VoiceOver
  framing guidance, voice shutter, volume-button shutter, timers), which is the main reason D1's recommendation is not
  to require `getUserMedia`.
- **Switch, voice-control and keyboard users.** Every capture control is a button reachable in tab order with a visible
  focus state; no drag, hold, pinch or swipe-only gestures; no hold-to-capture; no auto-capture on a stability or timing
  detector (which also avoids a timing penalty for slow motor control). The shutter is a button, and where a live view
  exists it is operable by keyboard on desktop. Large targets, per AGENTS.md ("keyboard-accessible controls, clear focus
  states, descriptive button labels").
- **Low light.** Never reject an image for darkness or blur. Darkness shows up as lower identifier confidence and an
  `uncertain` outcome, which is already handled in words. Luminance is never a signal (it would deny real finds, C11).
  Where a live view exists, offer the torch where the device exposes it; the OS camera hand-off already has it.
- **Motion and reduced-motion.** No camera overlay, scanning animation or countdown loops forever (the Motion rules
  already forbid `infinite`). Under `prefers-reduced-motion` overlays are static. No flashing.
- **Permission denial.** If camera permission is denied or revoked, say so once in plain words and **offer Lookup in the
  same place immediately**; never loop the permission prompt, never present denial as an error. The scan is not lost: a
  photograph can still be identified.
- **Desktop and tablet players** without a rear camera: the OS file picker is the camera hand-off; Collect may offer the
  device camera if present. Nobody is required to use a particular device class for the educational path.
- **Slow networks, interrupted sessions, backgrounded apps** (the case `ScanPanel` already documents for the OS camera):
  a receipt's TTL is days, not seconds. A claim that fails to reach the server is retried silently and idempotently (a
  duplicate is a no-op). No time pressure is ever put on a player.
- **Cognitive load and plain language.** One sentence per state. No jargon (not "receipt", "attestation", "HMAC";
  those are internal). No accusation words ("invalid", "cheating", "suspicious") in any player-visible string.
- **Colour and sound.** State is never conveyed by colour or sound alone; every status has text.

### 9.3 What a rejected or uncertain scan looks and sounds like

Three different outcomes, which must never be collapsed into one. All three always show the identification the player
asked for; **the identification never fails because the receipt did** (P16).

| Situation | What the player is told (draft wording; the owner owns final copy, D7) | What it means for the collection |
|---|---|---|
| **Matched, receipt issued** | "Recorded. This scan can unlock the card." plus the existing card confirmation | The card can be claimed |
| **Uncertain** (a card is among the candidates but the identifier's best guess is something else; `outcomeFor` returns `uncertain`) | "Plantdex is not sure about this one. You can read about these possibilities. Pick the one you think matches, or try another photograph." | Depends on D2: either the listed candidate also qualifies (recommended) or only the top-ranked does |
| **Related only / genus-level** (`relatedOnly`, `genusCard`, `acceptedGroup`, `legacyGenus`) | "This looks like a relative of a plant in the deck. It can't unlock the card, but you can read about it." (or, if D2 admits the case, "This matches the group this card covers.") | Per D2. Never rewritten into an exact match |
| **No match** | "Plantdex has no card for this plant yet. You can save it to your Seed Shelf." | Unchanged from today; nothing unlocks |
| **Looked up from a file** (Lookup path) | "Here is what it might be. To unlock a card, use Scan a plant." | No receipt; no card |
| **Collect scan, receipt could not be recorded** (network, secret unset, old client) | "We couldn't record this scan for your collection, but here is what it is. Try again, or look it up without saving." | No loss: identification shown; retry is idempotent |

Each is rendered as a heading plus a paragraph inside the existing `aria-live="polite"` answer region, which the page
already scrolls into view, so a screen reader announces it once and it remains on the page to be re-read. Nothing is
an auto-dismissing toast. Retrying is a labelled button. The existing quota text ("7 of 10 left today") is unchanged.

---

## 10. The stages

All flags default OFF in the repository, in `.env.example` and in the config row. Each flag has exactly one effect and
can be turned off independently (P31, P32). **Switching to a later stage is the owner's decision at each step.**

### Stage 1 (this document): the design

Docs only. Deliverables: this document, five SCR drafts, the ledger entry. No rule is active or presumed.

### Stage 2: a NON-ENFORCING slice that issues and validates scan receipts

**Purpose.** Prove the receipt end to end on the TEST project with no player-visible change. It must not silently change
collection eligibility, XP, leaderboards, Garden growth or any existing user data.

**The smallest first slice, for the owner to authorise:**

| Piece | Owner | Files | Behaviour with flags OFF |
|---|---|---|---|
| (a) Contract | **coordinator** | New migration (inert `scan_receipts`, `discovery_rules`); `src/lib/herbdex-receipt.ts` + test (pure `verifyScanReceipt` / `signScanReceipt` shape, reusing the `species-attestation.ts` approach); `scripts/sync-edge-shared.mjs` (`PURE_MODULES`); regenerated `_shared/herbdex/herbdex-receipt.ts`; export and delete lists and their pin tests; `.env.example` | Table empty, no reader. Identical behaviour |
| (b) Issue | **scan** | `supabase/functions/identify-plant/index.ts`; `src/lib/scans.ts` (carry an opaque token alongside the result, `purpose` field); no UI | No `purpose` and no flag means no receipt: byte-identical response |
| (c) Accept | **coordinator** | `supabase/functions/herbdex-action/index.ts` capture branch | Inert unless `receipts_accept`; writes only `scan_receipts` |

**It touches none of:** `applyDiscovery`, `progression.ts`, `mastery.ts`, `research.ts`, `leaderboard_standings()`,
`discoveries`, `sightings`, the Seed Shelf, the garden. It adds no read of `scan_receipts` anywhere a player sees.

**The first reviewable PR** is (a) alone, from the coordinator: roughly 350 changed lines, of which the majority are
the pure module and its tests. It contains: the migration (applied to the TEST project only; applying to production is
the owner's), the predicate with property tests P8 to P15, the sync entry, the export/delete/schema pin updates, and
flags defaulting off. `npm run verify`, `npm run check:edge` and `edge-shared.test.ts` are the checks; the authoritative
run is the PR's `verify` check on GitHub's runner. (b) is a second PR from the Scan lane that cannot merge before (a);
(c) is a third. "Contract first, feature second, never in the same branch" (`agents/README.md` rule 3).

**Needs the owner:** the decisions that shape the receipt's fields (D1 whether live capture, D2 which eligibilities),
plus authorising the migration on the TEST project. Nothing in Stage 2 needs a decision about enforcement.

### Stage 3: shadow mode and the testing plan

**Purpose.** Learn what the rule *would* do, with real players, before anything depends on it. The public board and the
collection are unchanged throughout. Uses the **existing server-side authority** (`herbdex-action`, the standings
function's inputs); it creates no second reward system and no parallel ledger.

**What shadow mode is.** With `receipts_issue` and `receipts_accept` on and a shadow report available to the owner
(a service-role-only function or a saved query, not reachable by players): for every account, compute what the standings
and the collection **would be** if `require_receipt_for_new_cards` were on with a given `cutover_at`, and compare beside
the real ones. Report counts and distributions only, never names (D7).

**Scenarios that must be exercised (TEST project first, then a consented cohort):**

| Scenario | Expected outcome |
|---|---|
| Legitimate Collect scan, matched, top-ranked | Receipt issues; accept records it; shadow counts it as backed |
| Lookup by file upload | Identification returns; **no receipt**; shadow counts nothing; card page unaffected |
| Uncertain identification, chosen candidate not top-ranked | Receipt records `listed`; shadow reports it under the D2 rule in force; identification unaffected |
| Genus-only (`relatedOnly`, `genusCard`, `acceptedGroup`, `legacyGenus`) | `confirmable` false or eligibility recorded truthfully; never rewritten to exact |
| Duplicate submission (same receipt twice; two tabs; double tap) | One row; second is a no-op; same state as once (P8) |
| Replay (another account's token; edited card or taxon; expired; future-dated; wrong version) | Rejected with a reason code; nothing recorded; no player-visible accusation |
| Offline or network failure between scan and claim | Identification already shown; token retained; claim retried idempotently within the TTL |
| Provider failure | No receipt, no charge to the receipt system; existing error copy |
| Signed-out scan | Identification works; no receipt (E1); local collection unchanged |
| Secret unset or rotated | No receipts issue; **nothing denied**; shadow reports "unconfigured" as a separate bucket |
| Old client build (no `purpose`) | Treated as Lookup; counted separately, never as a failure |
| Clock skew | Tolerates the same 60-second future margin as the attestation verifier |
| Flags all off | Output byte-identical to today for any fixed set of rows (P1) |

**False-positive measurement.** Ground truth for "honest" does not exist (section 11, item 8), so the design measures
what it can, and separates operational false positives (measurable exactly) from behavioural ones (not measurable):

- **M1 coverage:** of discoveries made after receipts were issued, the share with a valid receipt. Anything under about
  99% among players using the current client is a **bug or a gap**, not cheating, and blocks Stage 4.
- **M2 reason histogram:** every refusal by code (no receipt, expired, mismatch, wrong user, unconfigured, old client).
- **M3 time from issue to claim**, to size the TTL.
- **M4 re-scan rate** after a Collect scan that did not produce a claimable card, per player-day, against the shared
  450/day budget.
- **M5 camera-less share:** how many players could not use Collect at all (no stream, no permission, no camera). A
  count of sessions only, using existing one-parameter `track()` events (each new event name must also be a Plausible
  goal; coordinator). **Never a property that identifies anyone** (`track()` takes no second parameter).
- **M6 land-rush check:** daily counts of new `discoveries` rows before and after any public statement of the rule.
- **A seeded panel:** owner-run field scans of known plants through Collect, to measure honest false rejections directly
  (the only true ground truth available).

If M1 is low, or the panel shows honest rejections, **that is the answer: do not proceed**. The shadow data is not
ground truth about honesty (item 8, section 11).

**Operating cost estimate** (estimates from the code's constants, not measurements; re-measure in Stage 3):

- **Identify calls:** a receipt is issued **inside the existing call**; no extra provider call. Limits are unchanged:
  450 per day globally, 10 per signed-in account, 5 per anonymous bucket (`identify-plant`, `scan-allowance.ts`). The
  only way the receipt design raises provider spend is **re-scans by players whose first Collect scan was not claimable**;
  that is M4, and is why the first move is measurement.
- **Compute:** at most 5 HMAC-SHA-256 signatures per Collect scan (the response already signs up to 5 species
  attestations) and one verification per claim. Microseconds each; negligible against a 2 second provider call.
- **Edge function invocations:** the claim piggybacks the existing `herbdex-action` reconcile invocation (one per
  discovery or reconcile), so **zero extra invocations** in the recommended shape.
- **Storage:** one row per `(user, card)`, about 250 bytes, at most 54 per account in a lifetime (the catalogue size).
  A thousand accounts holding every card is about 13 MB; typical use is a small fraction. No images, no hashes.
- **Database reads:** the shadow report is one extra aggregate query run on demand, not per page view.
- **Provider quota:** unchanged ceiling. The risk is the shared 450, not our compute.

**How a rejected or uncertain scan is explained to a player** is section 9.3: every state shows the identification first,
says in one plain sentence what happened to the collection, offers one next action, and never accuses.

### Stage 4: enforcement (owner approval required; not designed here)

Stage 4 is the first stage that changes what a player can do, and it is the owner's alone. **The only thing this
document specifies is the decision it needs**, which is a single approval covering:

1. That Stage 3's measurements are satisfactory (M1, M2, M4, M5 and the panel).
2. Which write paths are gated (the owner's decision is "a NEW collectible card"; the draft stub assumes layer L3 of
   section 4.3 and nothing else).
3. The cutover moment (section 8.4) and the answers to D4 and D5 (signed-out and import).
4. The accessible alternative, if any (D6), in place **before** the rule is switched on.
5. Public copy and `/privacy` text approved by the owner (D7).

Nothing past that is designed. The SCR stub `agents/requests/discoveries-write-gate.md` exists only to name the
coordinator-owned surface that would be touched, so the owner can see its size before deciding.

---

## 11. What this design cannot prove

Stated flatly, because a trust feature that overclaims is worse than none.

1. It cannot prove a plant was outdoors, alive or present. A screen, a card, a guide page, a shop plant or a neighbour's
   garden produces the same receipt.
2. It cannot prove the player took the photograph. A friend's photograph, a downloaded image or a virtual camera passes.
3. **It cannot distinguish a live frame from an uploaded file** (section 3.1). `purpose: collect` is a declaration. A
   person scripting the API with their own account can declare it over any image.
4. Live capture (5.1) narrows the casual file-replay case and closes nothing against an emulator or a camera pointed at a
   monitor; only platform attestation could, and a static web app cannot use it.
5. A correct identification is not a safe-to-use identification. Nothing here says anything about edibility or safety.
6. The identifier can be wrong, and a wrong species yields a valid receipt for a wrong card. The receipt records
   `eligibility`, rank position and the confidence band; it does not turn a low-confidence suggestion into a fact.
7. It does not detect collusion: two accounts can photograph the same real plant.
8. Shadow data is not ground truth: it shows how many scans would qualify, not how many were honest.
9. The Boss Form challenges, journal and Field Research stay as self-reported or client-derived as they are today.
10. If `SCAN_RECEIPT_SECRET` leaks, receipts are forgeable until it is rotated. Accepted rows remain.
11. **The honest claim** is "unlocking a new card now requires an action two taps cannot perform, and the record says
    so", never "the collection is verified".

---

## 12. Properties that must stay true (the test plan, as properties)

Properties only. None is code; the coordinator and Scan lane own the test files.

**Preservation (C3, C4)**
- P1. With every new flag off, standings and collection outputs are identical to today's for any fixed set of rows.
- P2. No row in `discoveries`, `sightings`, `scans`, `research_completions`, `mastered`, `learned` or
  `unlocked_achievements` is changed or deleted by any stage, including rollback.
- P3. A discovery recorded at or before `cutover_at` is a legitimate unlock under every flag setting, including after
  toggling flags off and on repeatedly.
- P4. `cutover_at`, once set, is never altered by any code path; "earlier" is the only permitted correction.
- P5. A client-supplied `discovered_at`, however old, cannot make a post-cutover discovery grandfathered.
- P5b. No XP, level, Field Card unlock, achievement or garden stage changes for any existing player when a stage ships.

**Idempotence; one authority**
- P6. `applyDiscovery`, `applyLearned`, `reconcileMastery` return the same object when nothing is new, unchanged.
- P7. XP is a pure function of `HerbdexState`; no receipt, flag or table changes it.
- P8. Presenting a receipt N times yields the same state as once.
- P9. The receipt predicate has one definition, shared by the edge mirror and the client; `edge-shared.test.ts` passes
  with it included.
- P9b. There is no second source of rewards: nothing but `discoveries` (and the server rows already derived from it)
  feeds XP, the board or the garden.

**Authenticity**
- P10. A receipt for user A is rejected for user B. P11. An edited card or taxon is rejected. P12. Expired and
  not-yet-valid receipts are rejected.
- P13. An unset secret never issues a receipt and never causes any denial of a grandfathered or flag-off row.
- P14. A receipt follows the **chosen** candidate, never the leading one.
- P15. A receipt is never issued for an unconfirmable result, and records `eligibility` and `rank_position` truthfully.
- P15b. No receipt is issued unless `purpose` is `collect` and the caller is signed in. A lookup never yields one.

**False-positive safety (C11)**
- P16. Under every flag, any scan that returns an identification returns it, whatever happens to the receipt.
- P17. A capture or receipt failure degrades to Lookup with a stated reason, never to a dead end.
- P18. No soft signal can reduce points or remove a card; it can add a label or queue a review.
- P19. Several near-identical frames of one plant are never penalised.

**Privacy and evidence (C8, C9)**
- P20. No receipt, table, column or signal holds coordinates, an image, EXIF, a device identifier or a hash of a photograph.
- P21. `prepareImage` still has no path returning original bytes; `image-prepare.test.ts` passes unchanged.
- P22. No rule's outcome depends on the number of photographs.
- P23. Every new user-owned table is in both the export and `USER_TABLES`, in both directions.
- P24. No table other than `profiles` grants an update policy; `scan_receipts` has no client insert, update or delete.
- P24b. No player-visible string uses "verified" for a receipt-backed row, or accuses a player.

**Trust levels and honesty**
- P25. `/start` imports no store, reducer or progression module and cannot yield a receipt.
- P26. The Seed Shelf remains unable to pay and `isShelfEligible` is unchanged.
- P27. `discoveries` gains no confidence, taxon or evidence column.
- P28. `PROVISIONAL` stays the only `verification` value.
- P29. When any rule is on, the board page states what counts and that earlier finds still count.
- P30. Dailies and the regional Quest Board still pay no board points.

**Accessibility (section 9)**
- P35. Lookup by file upload is available to every player, signed in or out, with a camera or without.
- P36. Every state in 9.3 is text in an `aria-live="polite"` region, never colour-only, never a vanishing toast.
- P37. No capture control requires a gesture other than activation of a button; no auto-capture; no timer.
- P38. No image is rejected for darkness, blur or size by anything but the existing validation.

**Rollout**
- P31. Each flag has exactly one effect and can be turned off alone. P32. Every flag defaults off in the repository, in
  `.env.example` and in the config row. P33. The shadow report never alters the public board and is unreachable by
  players. P34. A production build with all flags off contains none of the new client code paths.

---

## 13. Decisions the owner must make

Limited to product-level choices. Technical details (receipt format, key names, TTL, table keys, how flags are stored,
how the predicate is shared) are resolved above and are not asked about.

### D1. What counts as an in-app "scan"?

- **Options.** (a) Any identify call from the Collect entry point, however the photo was taken (OS camera hand-off
  included). (b) Only a page-controlled live camera stream (`getUserMedia`). (c) (a) now, decide (b) from Stage 3 data.
- **Recommended default: (c), starting at (a).**
- **Tradeoff.** (b) removes the old-library-file case for casual users but excludes in-app browsers, blocked or absent
  cameras, and players who rely on the OS camera app's accessibility features, and lowers photo quality. (a) cannot tell
  a file from a fresh photo.
- **Changes.** (b) adds a capture screen (UI-owned design), a session nonce and a larger exclusion count in M5.

### D2. Uncertain identifications and the genus-level cases: what may unlock a card?

Today `confirmable` already excludes `sameGenus`/`ambiguous`; `uncertain` (the identifier's top guess is something else
but a card is listed) is confirmable and `genusCard`, `acceptedGroup`, `legacyGenus` and `curatedEquivalent` are
confirmable with their eligibility recorded.

- **Options.** (a) Only `matched` (the card is top-ranked) with `exact`/`synonym`. (b) Any listed confirmable candidate
  with any current eligibility. (c) (b), but a below-confidence or non-top candidate unlocks only by an explicit
  confirmation tap, and `legacyGenus` is excluded.
- **Recommended default: (c).** It keeps today's behaviour (the player confirms a listed candidate), refuses the one
  explicitly temporary eligibility (`legacyGenus`, Goldenrod, still pending curation per CLAUDE.md), and records `top` or
  `listed` and the eligibility truthfully so the rule can tighten later without re-scanning anyone.
- **Tradeoff.** (a) is simplest and makes the rule meaningful but makes genus-level species (oak, rose, sumac, elder,
  maple, bramble, pine, willow, mulberry) hard to unlock, since the provider often resolves them only to genus. (b) is
  the most generous and the easiest to game with a loose photograph.
- **Changes.** Which receipts issue (E4/E5) and what the Seed Shelf offers for a relative; the explanation copy in 9.3.

### D3. What constitutes a collectible discovery?

Sub-questions, with a recommendation for each:

| Question | Options | Recommended default | Why / tradeoff |
|---|---|---|---|
| Does a scan **of a printed card or a screen** count? | Counts / refused | **Counts, and the copy never claims otherwise.** Plantdex cannot detect it (CLAUDE.md, rejected); a rule that pretends to would deny real finds | Refusing it is unenforceable; the honest wording is C9 |
| Is **one eligible scan per species** enough? | One / several | **One.** Several photographs of a moment are one sighting, and "several" is explicitly not evidence | More would punish players and prove nothing |
| **Re-scans** of an owned species | Pay again / no | **No.** A species pays once by primary key already; a re-scan is a lookup or a journal entry | Preserves "no repeat XP" |
| Species where **only the genus resolves** | See D2 | See D2 | Same decision |
| **Field Cards** (XP-unlocked, not found) | Gate / exclude | **The XP unlock is not a discovery and is not gated.** Finding a Field Card species outdoors is a discovery like any other and follows the same rule | The two facts must stay separate (CLAUDE.md "Field Cards") |
| **Seed Shelf** | Gate / exclude | **Not gated and cannot pay.** Saving a species with no card needs no receipt. When a card is later printed, claiming it is a discovery and follows the rule at that time; the shelf entry's date is preserved (`discover(at)`) | Keeps the shelf a pure archive; decide the "claim after printing" edge when it first occurs |

### D4. Signed-out players

- **Options.** (a) Signed-out scans are lookups only for the *account* collection; the local collection stays
  self-reported and private. (b) Anonymous, adoptable receipts with a first-claim-wins table. (c) Require an account to
  use Collect.
- **Recommended default: (a).**
- **Tradeoff.** (a) is honest: signed out there is no server-written record and no rule can reach it, and it adds no
  durable anonymous identifier (consistent with `/privacy` and the one-parameter `track()` rule). Its cost is that a
  signed-out player's *new* finds do not become account progress without a later decision (D5). (b) is friendlier but adds
  a global table and a farming surface (one token adopted by many accounts, solved only by first-claim-wins). (c) breaks
  `/start`'s single action.
- **Changes.** Whether the local collection ever syncs under the rule; the wording on the scan page for a signed-out player.

### D5. Grandfathering

- **Options.** (a) Everything in an account at the cutover is permanent; imports after it are treated as new. (b) (a) plus
  a **one-time import window**: whatever a device held before a stated date is grandfathered on its first import. (c)
  Imports always need receipts.
- **Recommended default: (b).** A player who has played signed out for months and then signs in would otherwise feel
  retroactively penalised even though no row changed, which C4 forbids in spirit.
- **Tradeoff.** (b) leaves a one-time hole (a device can be edited before import) bounded by the existing once-per-account
  offer and by the board's per-species cap; it is the price of not revoking anything.
- **Changes.** The import dialog's wording; the exact "before" date; whether the date is announced (land-rush risk, 8.4).

### D6. The camera-less path

- **Options.** (a) No new route: camera-less players keep everything and unlock no new cards once enforced. (b) A non-scan
  route that unlocks a card (for example a study-based route), clearly labelled as such. (c) Defer Stage 4 until a route
  is designed.
- **Recommended default: (c) as a condition, with (a) as the fallback the owner may accept explicitly.**
- **Tradeoff.** Any non-camera route is by definition not evidence, so it either confers no board credit (labelled
  accordingly) or undoes the rule. Doing nothing means a group of players permanently cannot grow their collection, which
  C7 asks the product not to do silently.
- **Changes.** (b) touches the progression contract and the card-awarding path (coordinator) and the profile copy. It is
  the largest open design in this document.

### D7. Copy and privacy

- **Options.** Wording: "scan-recorded" / "self-reported" labels, or no label beyond "provisional". Retention: how long
  `scan_receipts` rows are kept. Disclosure: whether `/privacy` and the export describe them. Telemetry: whether anonymous
  aggregate distributions during shadow mode are acceptable.
- **Recommended default.** Use "scan-recorded" and "self-reported" on the board only (never "verified"); keep rows for the
  life of the account and delete them with it; **name them in `/privacy` and the export before Stage 2 reaches any real
  player**; allow anonymous aggregate counts (no identifiers, no `track()` properties) during shadow mode only.
- **Tradeoff.** More disclosure is more honest and costs one more page edit. A stored receipt is a record kept about a
  player's scan, so it must be downloadable and deletable like every user table.
- **Changes.** Tier 0 pages (`/privacy`, possibly `/terms`) which only the owner edits; the board label (this lane).

### D0. Order of enforcement, if the owner approves Stage 4

- **Options.** (a) Board first (revision 1: read-time, no write change), then cards. (b) Cards directly (the owner's stated
  goal). 
- **Recommended default: (b), but only after Stage 3, and with (a) available as the reversible first move.**
- **Tradeoff.** (a) is reversible and cheap and fixes only the visible number; (b) is the real goal and changes the
  card-awarding path.
- **Changes.** Which SCR the coordinator actions first.

---

## Appendix A. Alternatives considered and not recommended

- **Require a receipt to record any discovery from day one.** Breaks `/start`, strands signed-out and camera-less
  players, and changes the card-awarding path before a single measurement exists. This is Stage 4, not Stage 2.
- **Board-only gate (revision 1).** Cheap and reversible but leaves a self-reported card with full XP, which does not meet
  the owner's 2026-11-24 decision. Kept as the reversible first move in D0.
- **A "validated points" or "scan points" column.** Creates the mutable number the schema avoids.
- **Verify the HMAC inside Postgres.** A second implementation of the predicate and a secret in the database.
- **Grandfather using the client `discovered_at`.** Forgeable.
- **Anonymous device-bound receipts.** A durable identifier with no account.
- **A row written by `identify-plant` at issue time** (instead of a signed token). Possible (it already writes comparison
  rows), but anonymous callers get nothing, it writes a row for every Collect scan though few are claimed, and it makes
  every scan a database write. A signed token written on claim stores only what was claimed.
- **Treat photograph count, EXIF presence, image freshness or darkness as evidence.** Forbidden (C8) or a false-positive
  generator.

## Appendix B. What was read

AGENTS.md (trust, discovery, accessibility and testing sections), CLAUDE.md, `agents/README.md`, `agents/ownership.json`,
`agents/templates/request.md`, `docs/agent-workflow/decisions.md`; `supabase/functions/herbdex-action/index.ts`,
`supabase/functions/identify-plant/index.ts`; `src/lib/species-attestation.ts`, `scans.ts`, `plant-match.ts`
(`outcomeFor`), `remote-herbdex-storage.ts`, `scan-allowance.ts`, `import-local-progress.ts`, `mastery.ts`;
`src/components/scan/ScanPanel.tsx`, `ObservationPhotos.tsx`; migrations 0001, 0002, 0006, 0011 and 0013. No credential,
secret, production endpoint or user data was read or needed. **Verification note:** this is a docs-only change; the
authoritative check is the pull request's `verify` check on GitHub's runner (it passed on this PR for revision 1). This
lane's container could not run `npm run build` locally (a container-only native-binary problem), and no workaround was
attempted.
