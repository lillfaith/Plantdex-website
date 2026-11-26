# Shared Change Request: a session consumed before a provider failure strands the retry

- From lane: scan      Task: agents/ledger/scan/s6-edge-receipts.md
- Needs: contract (discoveries lane: `docs/discoveries/discovery-receipt-contract.md` 3.2, migration 0016)

## Why
Contract 3.2 consumes the session BEFORE the provider call, and the task fixes that order. If the provider then fails (502),
nothing is issued, the session and image digests are spent, and the client's natural retry (same session, same photographs) is
a *replay* with zero receipts. `identify-plant` handles it safely (it falls through to an ordinary identification with
`capture.code = capture_session_used`; no receipt, no second session use), but the player cannot collect from those photographs
and must open a new session and take new ones. It is a hardship, not a hole.

## Exact proposal (any one; none is made here)
a) 0016 gains a service-role-only `release_capture_session(p_user, p_session, p_observation_id)` that un-consumes a session and its
   digests when the provider call failed and no receipt was issued; `identify-plant` calls it on that path.
b) Or move the consume after a successful provider answer (digest uniqueness still holds; the cost is that a duplicate-image
   attacker spends a provider call before being refused, bounded by the 10/day quota).
c) Or accept it and say so in the camera screen's copy ("a scan that failed to reach the identifier needs new photographs").

## Who else depends on it
`identify-plant` (S6), `0016_verify.sql`, the contract. S5's client already treats `capture_session_used` as a plain refusal.

## Risk and rollback
(a)/(b) change the migration; TEST only until the owner reviews.

## Does this need the owner? (coordinator fills in)
Probably yes: it touches the trust boundary's wording.
