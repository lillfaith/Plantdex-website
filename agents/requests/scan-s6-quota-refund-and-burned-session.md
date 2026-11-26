# Shared Change Request: two server gaps the edge function cannot close alone (migration)

- From lane: scan      Task: agents/ledger/scan/s6-edge-receipts.md
- Needs: migration (coordinator) and a contract decision (discoveries)

## Why
Both are consequences of the contract's order of operations (quota claim, then `consume_capture_session`, then provider). Neither is fixable inside `identify-plant/**`.

1. **A replay still spends one scan-quota unit.** The contract says a replay "spends no second quota unit". `claim_scan_pair` runs at the top, before the multipart body can be read and
   so before the replay is known. Proposal: a service-role-only `refund_scan_pair(p_bucket text, p_day date, p_global_bucket text default 'global')` that decrements both buckets exactly
   as `claim_scan_pair` already does for its own `-2` refund, and which `identify-plant` calls on a replay. Until it exists a replay costs the player one of their 10 daily identifications and
   makes no provider call.
2. **A provider failure after `consume_capture_session` burns the session and its image digests.** The session is consumed before the provider call (contract 3.2 step 2 then 3), so a
   provider outage or `rateLimited` answer leaves nothing to retry with: the same photographs are `capture_duplicate_image`, and the same session with the same bytes replays an
   observation that has no receipts. The edge function reports `capture:{accepted:false, code:'capture_unavailable'}` on that failure so the client can say so and open a new session, but the
   photographs cannot be reused. Proposal (discoveries lane to decide): a service-role `release_capture_session(p_user, p_session)` that clears `consumed_at`, `request_digest`,
   `observation_id` and deletes that session's digests when no receipt was issued, called by `identify-plant` on a provider failure. Alternatively accept it as deliberate (contract
   section 6 already says photos are "not re-submittable ... the player takes new ones").

## Exact proposal
As above. Neither changes a receipt's meaning or any existing function; both are additive and service-role only.

## Who else depends on it
`0016` (discoveries lane draft), `identify-plant` (scan lane, one extra call each, guarded so a missing function is ignored).

## Risk and rollback
Each is an additive function; drop it to roll back. Without them the system is correct but costs a quota unit on replay and requires fresh photographs after a provider failure.

## Does this need the owner? (coordinator fills in)
