# Refused capture attempts and the scan allowance: findings (nothing changed yet)

Question (owner, 2026-11-27): in run 3 a refused session reuse and a cross-account attempt moved the quota counters. Whose allowance, was the shared
allowance charged, did a provider request happen, and can it be exploited?
Evidence labels: LIVE = run 3 (https://github.com/lillfaith/Plantdex-website/actions/runs/45944350118); CODE = read from `identify-plant/index.ts` on `integration`.

## What happened (LIVE counters, read by a privileged helper at checkpoints)
| Step | Caller | Caller's own quota | Shared (global) quota |
|---|---|---|---|
| first identify | Alice | 0 -> 1 | 6 -> 7 |
| replay (same request) | Alice | 1 -> 1 | 7 -> 7 |
| REUSE: same session, different image (refused) | Alice | 1 -> 2 | +1 |
| CROSS-ACCOUNT: Bob presents Alice's session (refused) | Bob | 0 -> 1 | +1 (7 -> 9 across both) |
| blank image, Bob's own fresh session | Bob | 1 -> 2 | 9 -> 10 |

## Answers
1. **Whose personal allowance is charged?** The CALLER's own, never the session owner's. Bob's attempt with Alice's session moved Bob's counter (0 -> 1) and left Alice's
   unchanged. The bucket is `user:<id from the verified JWT>`; the session id supplied in the request plays no part in it (CODE, confirmed LIVE).
2. **Is the shared allowance charged?** Yes: each refused attempt took one shared unit (LIVE, 7 -> 9). `claim_scan_pair` runs before capture validation (CODE).
3. **Did a real provider request happen?** By CODE, **yes**. A refused capture is deliberately downgraded to "an education lookup": `beginCapture` returns a failed
   state, nothing returns early, and the code goes on to `identifyWithPlantNet`/`plantid`; the failure only withholds receipts (`issueForCandidates` returns the candidates
   with `capture: {accepted: false}`). So a refused reuse or foreign-session request still spends a real provider call. Not directly measurable from outside; not separately
   proven LIVE.
4. **Can it be exploited?**
   - **Against another player's allowance: no.** The charge lands on the attacker's bucket only. Knowing or guessing a victim's session id does not let you charge or burn
     their allowance, and consuming it also needs the nonce (unguessable).
   - **Against the shared budget: no worse than an ordinary scan.** A refused attempt costs the attacker exactly what a normal lookup costs (one personal unit, one shared
     unit, one provider call), is limited by the same per-account daily cap, and gives them nothing. It adds no amplification. The pre-existing exposure remains: many
     cheap accounts x the per-account cap can exhaust the shared daily pool (`docs/identification-limits-audit.md`, item 3). That is an account-creation / abuse-control
     question, separate from capture, and still open.
   - So: **no genuine new exploit found. A waste, not a hole**: invalid capture requests are charged and still reach the provider.

## Recommended fix (not implemented; needs scan-lane change and a TEST redeploy, so awaiting approval)
For `purpose=collect` requests whose capture is refused for a reason that cannot be repaired by the same request (`capture_session_unknown`, session owned by someone else,
`capture_session_used` with a different image, expired), **return the refusal before the allowance claim and before the provider**, and charge nothing. Honest but
careful details: validate the session read-only first (no state change), then claim allowance, then `consume`; or, simpler, claim, fail the capture, and **skip the provider
and refund the caller's own unit** through the existing capped `refund_scan_claim`. The legitimate edge case (a real player whose 10-minute session expired mid-capture)
must get "start the capture again", not a charge. Add LIVE assertions: refused attempts leave both counters unchanged and no provider call happens.
Not to be bundled with the eligibility-policy work.
