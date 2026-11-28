# Daily Field Research: server-side validation proposal

Status: PROPOSAL, read-only audit. Nothing here is implemented; the edge function is untouched.
Owner lane for the change: coordinator (reward logic and `herbdex-action`).

## 1. What the server does today

`supabase/functions/herbdex-action/index.ts` reads the caller's own rows, then:

- takes `body.dailyTaskIds`, slices to `MAX_DAILY_TASK_IDS` (8), resolves each through
  `researchTaskById()`, and passes `[...STANDING_TASKS, ...resolvedDailies]` to `reconcileResearch`;
- `reconcileResearch` pays a task iff it has no row in `research_completions` and
  `progressForTask(task, world).qualifies` is true, i.e. its single step already measures 1;
- writes `(user_id, task_id)` with `ignoreDuplicates`, so each task id pays once per account.

There is NO check that an id was ever offered, offered today, or offered to this account. "Offered"
exists only as the client's own `plantdex.research-board.v1:<scope>` list.

## 2. What a hostile client can do today

Resolvable daily ids are `daily:<template>:<herbId>` for 4 templates (`find`, `learn`, `revisit`,
`master`) and the 45 printed cards (`RESEARCH_POOL = PRINTED_CARDS`; Field Cards and unknown ids
resolve to nothing): **180 ids, 25 XP each (`RESEARCH_XP.daily`) = 4,500 XP ceiling per account.**

Each id still has to be TRUE for the account's own server records (find = a discovery row, learn = a
learned row, revisit = a sighting row, master = a mastered row), so nothing unearned is paid, and
repeats are impossible (primary key). What is bypassed is the pacing and the "offered" rule:

- The honest ceiling is 3 dailies per local day = 75 XP/day, and a satisfied task is never offered
  (`pickDailyTasks` skips `template.satisfied`). A hostile client sends already-satisfied ids,
  8 per request, any number of requests, and collects up to 4,500 XP at once for any collection it
  has: a player with all 45 cards found, learned, sighted and mastered gets 4,500 XP immediately
  instead of 75 per day. 4,500 XP is level 5 and crosses four Field Card thresholds (600, 1,200,
  2,200, 3,600).
- No "offered today" check exists, and none against ids offered long ago. Dailies pay XP only, never
  Field Board points (`leaderboard.ts`), so the board is not moved directly; XP, level, frames/titles
  and Field Cards are.
- The same hole opens by accident: with the shared-browser leak (fixed on the client by the scoped
  board) account B received A's picks, which were already satisfied for B, and they paid at once.

## 3. Proposal A (no migration): recompute and cap

In `herbdex-action`, after building `world` from the server's own rows:

1. **Pickability window.** For each of the last N UTC date keys (N = 3 covers a client in any
   timezone plus a day of slack; a task stays open until done, see below) recompute the candidate
   set the same way `pickDailyTasks` does, but over the world as it would have been, which the server
   cannot reconstruct. Therefore use the cheaper superset: accept a daily id only if
   `template.available(herb, world)` holds now AND the task is not yet recorded. This rejects
   nothing a satisfied-then-claimed id needs, so on its own it is NOT sufficient.
2. **Cap per day (the part that actually bounds the loss).** Count today's UTC
   `research_completions` rows whose `task_id` starts `daily:` (`completed_at >= today 00:00Z`). Pay
   at most `DAILY_BOARD_SIZE - thatCount` dailies this request, in a deterministic order. Hostile
   ceiling falls from 4,500 XP to 75 XP per UTC day, equal to the honest ceiling.
3. **Prefer offered ids deterministically.** Order accepted ids by their position in the server's own
   `pickDailyTasks(worldBeforeToday, todayKey, exclude, DAILY_BOARD_SIZE)` result when present, so
   the legitimate board wins the slots over arbitrary claims.

Trade-offs: no schema change, deployable with the next function release, closes the bulk-claim
exploit. It cannot prove an id was offered; a hostile client can still pick which 3 satisfied ids to
cash each day (still 75 XP/day, so no faster than honest play). It also can underpay an honest player
whose local day differs from UTC (a day boundary): "today" is the UTC day, so a board refilled at
local 23:00 can complete after the UTC rollover and count against tomorrow's cap. Mitigation: cap by a
rolling 24h window rather than the calendar day. Count of dailies actually paid honestly is at most 3
per board refill, so the rolling cap never denies a normal player.

**Interaction with "satisfied tasks are never offered".** A task is offered while UNSATISFIED and
completes later, so at completion time it is satisfied by construction; the server therefore cannot
require "unsatisfied" at claim time, and cannot use `satisfied` to reject a claim. This is exactly why
an id-recompute check alone is weak and why a count cap is the reliable half.

## 4. Proposal B (migration): `daily_offers`

`daily_offers(user_id, task_id, offered_on date, primary key (user_id, task_id))`, insert-only RLS
like the other history tables, written by the function (service role) when it returns today's board
(or by a new "offer" action that runs `pickDailyTasks` server-side against the server-read world).
`reconcileResearch` then only receives dailies with an offer row, and the server owns the board.

Trade-offs: the only design that proves "offered" (and makes the local board a cache, which also
removes the client leak class entirely); but it needs a migration, an export/deletion entry
(`USER_TABLES`, `account-security.test.ts`), a new action or an extra round trip before play, offline/
signed-out parity decisions, and changes the contract that a board is a client scratchpad.

## 5. Recommendation

Ship A step 2 (rolling cap, daily-prefixed completions) first: smallest change, bounds the exploit
from 4,500 XP to 75 XP per day, no migration. Take B if the Field Board or an economy ever makes
dailies worth more than a nudge. Do not add a client-trust alternative (signed board tokens) without
the owner: it needs a secret and duplicates B.

Tests to add with the change: a hostile claim of 8 satisfied ids pays at most `DAILY_BOARD_SIZE`
(use `reconcileResearch` plus the cap function); replaying yesterday's completed ids pays 0; two
requests in one day share one cap; the legitimate three still complete on the same day they are
offered.
