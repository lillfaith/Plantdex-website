# Discovery receipt contract (capture session -> receipt -> claim)

- Lane: discoveries. Task: `agents/ledger/discoveries/d5-server-eligibility.md`. Branch `agent/discoveries/d5-server-eligibility`.
- **Consumers:** the Scan lane (`agent/scan/s5-camera-flow`), the coordinator (edge functions, `HerbdexProvider`, storage adapter).
- **Status: DRAFT CONTRACT, NOTHING ENABLED.** Every server rule below is behind a database switch that defaults OFF.
  The migration that implements it (`0016`, TEST only) is delivered as a draft; production is not authorised.
- **Placement note.** The coordinator's path for this file is `docs/agent-workflow/discovery-receipt-contract.md`. The
  agent guard refuses that path to the discoveries lane, so this copy lives here and
  `agents/requests/discoveries-d5-server-eligibility.md` asks the coordinator to mirror it. This file is the source of truth.
- Wording rule for ALL copy: a card unlocked this way was **"captured in the app"**. Never "verified", never "found outdoors",
  never "confirmed in the wild". See section 9.

## 0. The decision this implements

V1 requires an eligible **in-app camera capture** to earn a NEW collectible card. Imported photos, manual entries (the card
page's two-tap Discover), the journal, and self-reported sightings keep working for education and the journal and **never
unlock a new card**. Existing collections are grandfathered: no revocation, no rescoring. A disabled frontend flag is not
authorisation: the rule is enforced by the database, not by the UI.

## 1. What the server can and cannot know (read this before building)

The server **cannot** prove an image came from a live camera. A static web app has no platform attestation, and a signed-in
person with their own JWT can script any request. What the server CAN establish, and what this contract therefore means by
"came from the in-app capture path", is the conjunction of:

1. a signed-in account (`auth.uid()`),
2. that opened a **server-issued, single-use capture session** (the in-app camera screen does this on open),
3. and, no sooner than `min_capture_ms` and no later than `ttl_s` afterwards,
4. submitted **2 to 3 images through that session** in one `identify-plant` call that the provider answered,
5. none of whose image digests the server has ever seen before,
6. receiving a **server-recorded receipt** for each eligible candidate,
7. which the account then **claims once**, server-side, producing the discovery row with the server clock.

That is "the player went through the app's capture flow", which is the honest, claimable thing. It is not "outdoors", not
"live", not "taken by this person". `capture.attestation` is **reserved** in the request for a future platform-attested
shell (Capacitor / App Attest / Play Integrity); in v1 it MUST be absent and the server ignores it.

## 2. Objects

### 2.1 Capture session (`capture_sessions`, server only)

| Field | Meaning |
|---|---|
| `id` uuid | Public handle. Safe to log client-side. |
| `nonce` | 64 hex chars, 244 bits, returned ONCE by `open_capture_session`. Only its SHA-256 is stored. Bearer secret for this session. |
| `issued_at`, `expires_at` | Server clock. `ttl_s = 600` (10 minutes). |
| `consumed_at`, `request_digest` | Set by `identify-plant`. `request_digest` is SHA-256 over the ordered image digests; it makes a retry idempotent. |

No coordinates, no EXIF, no device identifier, no image, no photograph count beyond the 2-3 rule is stored in a session.

### 2.2 Receipt (`capture_receipts`, server only; select-own for the client)

One row per **eligible candidate** of a successful capture identify call.

```ts
interface CaptureReceipt {
  id: string;                 // 'rcpt_' + 32 hex, unguessable; the claim handle
  herbId: string;             // the card (catalogue id) this candidate qualifies for
  observationId: string;      // identify-plant's observation id for this call
  observedTaxonKey: string;   // normalised key, a lookup key never the record (CLAUDE.md)
  observedTaxonRank: 'genus'|'subgenus'|'section'|'subsection'|'series'|'species'|'subspecies'|'variety'|'form'|'unknown';
  eligibility: 'exact'|'synonym'|'acceptedGroup'|'curatedEquivalent'|'genusCard';   // NEVER 'legacyGenus' (D2)
  rankPosition: 'top'|'listed';          // 'listed' = a non-leading candidate the player explicitly chose
  speciesConfidence: 'high'|'moderate'|'low'|'unresolved';  // a band, never the raw score
  receiptVersion: 1;
  issuedAt: string;           // ISO, server clock
  expiresAt: string;          // issued + 30 days
}
```

The receipt carries **no score, no coordinates, no image, no photograph count, no device value**. It follows the CANDIDATE,
not the card alone, so a `listed` receipt is distinguishable from a `top` one.

## 3. The API (four calls)

All calls are Supabase calls made with the signed-in player's session, except `identify-plant`'s internal use of the
service role, which the browser never sees.

### 3.1 `rpc('open_capture_session')` -> `jsonb`

Call when the in-app camera screen opens (not on app load, not on a timer). No arguments.

```jsonc
// success
{ "ok": true, "session_id": "uuid", "nonce": "64-hex", "issued_at": "ISO", "expires_at": "ISO",
  "ttl_s": 600, "min_capture_ms": 2000 }
// failure (HTTP 200; the body carries the code)
{ "ok": false, "code": "not_signed_in" | "too_many_open_sessions" | "daily_session_limit" }
```

Limits: at most **3** unexpired unconsumed sessions per account at a time; at most **60** opened per account per UTC day.
The client keeps `{session_id, nonce}` in memory only (never localStorage, never a log). Opening a new session never
invalidates an old one; unconsumed sessions simply expire.

### 3.2 `identify-plant` request (extends the existing multipart request)

Add three form fields. Nothing else about the request changes (2-3 `image` parts, `organ` parts, `IDENTIFY_PROFILE`).

| Field | Value |
|---|---|
| `purpose` | `collect` or `lookup`. Absent means `lookup`. Only `collect` can produce receipts. |
| `capture_session_id` | the uuid from 3.1. Required when `purpose=collect`. |
| `capture_nonce` | the nonce from 3.1. Required when `purpose=collect`. |

Server behaviour, in this order, only when the account is authenticated and `purpose=collect`:

1. compute SHA-256 of each received image part (the client's already re-encoded JPEG; no decode happens);
2. `consume_capture_session` (one transaction): session exists, belongs to the caller, nonce digest matches, unexpired, not
   already consumed by a **different** request, `now() - issued_at >= min_capture_ms`, image count in 2..3, **no digest
   previously recorded** (any account);
3. run the provider call and the matcher **exactly as today** (quota accounting `claim_scan_pair` is unchanged and counts
   once, whether or not a receipt results);
4. for each candidate whose server-side match is `confirmable` with `eligibility` in the five allowed values: insert a receipt.

**A capture failure never fails the identification.** Steps 1 and 2 failing means the player still receives the normal
identification (an education lookup) with `capture.accepted = false` and a code. Only step 3's own failures (provider down,
quota) fail the request, as today.

Retry idempotence: re-sending the **same** session and the **same** ordered image digests after a lost response is a
**replay** (`capture.replay = true`): the server does not call the provider again and spends no second quota unit; it returns
`capture.receipts` (the receipts already recorded for that observation) and **no candidates**. The client then lists or claims
those receipts (`capture_receipts` is readable by its owner under RLS) instead of re-showing the identification. Any other
re-use of a consumed session is `capture_session_used`.

### 3.3 `identify-plant` response additions (all additive; absent when `purpose` is not `collect`)

```ts
interface IdentifyResponseCaptureAdditions {
  capture?: {
    accepted: boolean;
    code?: CaptureCode;       // present when accepted is false, see section 5
    replay?: boolean;                 // true: no provider call was made; see receipts
    receipts?: Array<{ id: string; herbId: string; rankPosition: 'top' | 'listed' }>;   // replay only
    minCaptureMs?: number;
  };
  candidates: Array<{
    /* ...every existing field, unchanged... */
    captureReceipt?: { id: string; rankPosition: 'top' | 'listed'; expiresAt: string };  // only on eligible candidates
  }>;
}
```

A `lookup` call, an anonymous call, a failed capture, or `capture` absent from the server version: the field is simply
absent and the response is byte-identical to today's. The client must treat absence as "no receipt, nothing to claim".

### 3.4 `rpc('claim_discovery', { p_receipt_id })` -> `jsonb`

The only way, once enforcement is ON, to create a new card's discovery row. Call it on the player's explicit confirmation of
the chosen candidate (the existing confirm tap). It is safe and additive with enforcement OFF, so Scan can build against it
immediately.

```jsonc
{ "ok": true,  "status": "claimed",         "herb_id": "...", "discovered_at": "ISO" }   // new row written
{ "ok": true,  "status": "already_claimed", "herb_id": "...", "discovered_at": "ISO" }   // idempotent retry
{ "ok": true,  "status": "already_held",    "herb_id": "...", "discovered_at": "ISO" }   // card was already in the collection
{ "ok": false, "code": "not_signed_in" | "receipt_unknown" | "receipt_expired" | "receipt_ineligible" | "collection_limit_reached" }
```

- `herb_id` is read from the **receipt**; the client cannot name a card here.
- `discovered_at` is the **server clock**. (The Seed Shelf's `at` back-dating does not apply to this path.)
- `collection_limit_reached` is migration 0008's free-tier limit surfacing through the claim: the whole claim rolls back, the receipt stays claimable, and the UI says so (it is a collection-size message, not a capture failure).
- `receipt_unknown` covers a forged id AND another account's id, so nothing can be learned about other accounts.
- Idempotent: claiming the same receipt twice, or two receipts for the same card, writes one row and one award.
  XP is derived from rows (CLAUDE.md), so repeat XP stays structurally impossible.
- After a claim the client calls the existing `confirm_scan` (migration 0014, unchanged) to record the chosen candidate on
  the `scans` row, and writes the sighting as it does today. **`confirm_scan` alone unlocks nothing**: it writes
  `scans.confirmed_*` only, takes no receipt, and is verified in the SQL suite to leave `discoveries` untouched.

### 3.5 `rpc('discovery_rules')` -> `jsonb` (read only; for copy, never authorisation)

```jsonc
{ "enforcing": false, "ttl_s": 600, "min_capture_ms": 2000, "receipt_ttl_days": 30 }
```

`enforcing` tells the client which wording to show and whether to route a Discover tap to the camera. It is **not** a gate:
with it `true` the database refuses a direct insert whatever the client does, and with it `false` a client that wrongly
believes it is `true` merely takes the camera path unnecessarily. Fail safe: if the call fails, assume `enforcing = true`
for wording and route to the camera; the server decides regardless.

## 4. What the database does when enforcement is ON (`discovery_enforcement.enforce = true`)

| Attempt | Result |
|---|---|
| Direct `insert into discoveries` for a card the account does not hold, with no claimed receipt and no grandfather row | **Refused**: `42501`, message `discovery_requires_capture_receipt`. PostgREST HTTP 403. |
| Same insert for a card that is grandfathered, or whose receipt was claimed | Allowed (a re-insert after the player deleted their own row, or a no-op conflict). |
| Direct insert into `learned` / `mastered` for a card with no `discoveries` row | **Refused**: `42501`, `discovery_required_first`. (`mastered` is also service-role only since 0013; the trigger binds the service role too.) |
| `claim_discovery` with a forged, foreign, expired or ineligible receipt | `{ok:false, code}`; nothing written. |
| `confirm_scan` with anything | Cannot create a discovery or a receipt; unchanged from 0014. |
| `herbdex-action` | Derives `mastered`/`research_completions` only from rows that exist; cannot mint a discovery; unchanged. |
| Local-progress import, Seed Shelf claim, manual Discover, journal | Cannot unlock a **new** card (the insert is refused). They continue to work for everything else. Their UI copy is the consumers' task (section 8). |

With enforcement OFF **nothing changes for any existing flow**: the only server-visible differences are the additive
`discoveries.recorded_at` stamp and the new tables, none of which any current code reads.

## 5. Error codes (stable strings; the client switches on these, never on messages)

```ts
type CaptureCode =
  | 'capture_not_signed_in'        // anonymous call; identification works, no receipt
  | 'capture_purpose_missing'      // purpose=collect without session fields
  | 'capture_session_unknown'      // no such session for this account
  | 'capture_session_nonce'        // nonce digest mismatch
  | 'capture_session_expired'      // older than ttl_s
  | 'capture_session_used'         // consumed by a different request
  | 'capture_too_fast'             // submitted before min_capture_ms elapsed
  | 'capture_images_invalid'       // not 2..3 images
  | 'capture_duplicate_image'      // a digest was seen before (this or another account)
  | 'capture_unavailable'          // server not configured / switch off; identification still returned
  | 'no_eligible_candidate';       // accepted capture, but nothing mapped to a card (a Seed Shelf case)
type SessionCode = 'not_signed_in' | 'too_many_open_sessions' | 'daily_session_limit';
type ClaimCode = 'not_signed_in' | 'receipt_unknown' | 'receipt_expired' | 'receipt_ineligible' | 'collection_limit_reached';
```

User-facing copy per code is the UI lane's. None may say or imply the plant is verified, outdoors or safe.

## 6. Offline and flaky-network behaviour

- **A session needs the network to open.** Offline, the camera may still show a preview, but the screen must say that
  scanning to collect needs a connection; nothing is queued as an unlock. There is no local-only unlock path (it would be a
  claim the server never saw; with enforcement ON the database would refuse it anyway).
- **Open, then lose signal**: the session is valid for 10 minutes. A reconnect inside that window submits normally. After
  it, `capture_session_expired`: open a new session and re-capture. The photos were not stored for this purpose and are not
  re-submittable (digests are single-use), so the player takes new ones. This is deliberate.
- **Identify succeeded, claim not reached** (app killed, signal lost): the receipt is valid for **30 days**. The client may
  persist the opaque `receiptId` (it is useless to anyone but the account; it grants only that account's own claim) and call
  `claim_discovery` on next launch. Idempotent.
- **Lost identify response:** resend the identical request; it replays (3.2): no second quota unit, receipts returned, candidates not.
- **Signed out:** can scan for education (a lookup). Cannot collect to an account. Signed-out local collections are the
  player's own file and are out of server scope (design D4); with enforcement ON the card page and import still cannot add
  cards to an account.

## 7. Anti-cheat measures in this contract, and what each does NOT do

| Measure | Stops | Does not stop |
|---|---|---|
| Single-use session nonce, 10-minute TTL | replaying a captured request; pre-minting receipts days ahead | a script that opens a session and submits |
| `min_capture_ms` (2000 ms) | zero-latency scripted loops, submit-on-open | an attacker who waits 2 s |
| 3 open sessions, 60 opens/day | session farming | n/a (bounded) |
| Existing quota (`claim_scan_pair`: 450 global, 10 per account per day) | mass minting: at most 10 capture calls per account per day, each costing a real provider call | many accounts |
| Image digests (SHA-256 of the received re-encoded bytes), single use, any account | resubmitting one file, one file shared across accounts | a re-encoded or edited copy; a different photo of a screen |
| Receipt single-claim, server-clock stamps, owner-only | double rewards, back-dating | n/a |
| Grandfathering with a cutoff | pre-stuffing the collection between announcement and enforcement | n/a |

Perceptual-hash duplicate detection is **not** wired in v1; the measurement and the decision are in
`docs/discoveries/d5-anti-cheat-and-measurements.md`. No EXIF, GPS, coordinates or device fingerprint is read, stored or
required (CLAUDE.md "Progression is self-declared" stands).

## 8. What each consumer must do (all via Shared Change Request; this branch edits none of it)

- **Scan lane:** open a session when the camera screen opens; send `purpose`, `capture_session_id`, `capture_nonce`;
  show the `capture.code` outcomes honestly; on the confirm tap call `claim_discovery(receiptId)` for the **chosen**
  candidate's receipt; then `confirm_scan`. Never call `discover()` for a collect-flow find once `enforcing` is true.
  A Lookup (educational) entry point sends `purpose=lookup` or nothing.
- **Coordinator:** `herbdex-action`/`HerbdexProvider`/`remote-herbdex-storage.ts` route a new-card write through
  `claim_discovery` when `enforcing`; stop `import-local-progress` and the Seed Shelf claim adding **new** cards when
  `enforcing` (the database refuses them regardless); add the four new user tables to `USER_TABLES` and the export;
  deploy the edge-function change to the TEST project only.
- **UI lane:** the Discover button on a locked card page, when `enforcing`, routes to the camera instead of recording.

## 9. Words

Allowed: "captured in the app", "scan-recorded", "unlocked from an in-app capture".
Not allowed anywhere: "verified", "verified outdoors", "found in the wild", "proof", or any word that says the plant was
present, alive or outdoors, or that the identification is safe to act on. A correct identification is not a safe-to-use
identification; no receipt vouches for either.

## 10. Versioning

`receipt_version = 1`. A change to what a receipt means ships as `2` with the migration; version 1 rows stay valid for claim.
