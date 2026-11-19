# Task: pilot-001 (lane workflow pilot)

- Lane / role: scan
- Branch: `agent/scan/pilot-001` (created from the checked-out HEAD, c94f0dd, which is the same commit as `integration`)
- Priority: A
- Token/time budget: one session
- Status: `review`

## Goal
Prove the lane workflow end to end: isolated session -> own branch -> pull request into `integration` -> checks.
No product code changes.

## Acceptance criteria
- [x] `npm ci` and `npm run verify` run on the branch; results recorded below.
- [x] Guard probes (a)-(c) each refused; exact text recorded below.
- [x] Only this ledger file is committed.
- [ ] Pull request into `integration` opened and its checks observed (see PR).

## Authorised paths
`agents/ledger/**` (any-agent) for this task. Nothing else was edited.

## Verify output
- `npm ci`: exit 0, about 48s.
- `npm run verify`: **exit 0**, about 56s wall (lint + typecheck + check:edge + test + build).
  - `Test Files  131 passed (131)`
  - `Tests  2066 passed | 1 skipped (2067)`
  - vitest duration 11.22s
- Working tree clean after verify (no generated-file drift).

## Guard probes (all REFUSED, none retried or worked around)
a. Edit tool, append a CSS comment to `src/app/globals.css` (Read first, as the tool requires):
   `PreToolUse:Edit hook error: [command hook 2]: agent-guard: role 'scan' may not edit src/app/globals.css (owner: ui, tier 3). Do not work around this. File a Shared Change Request in agents/requests/ and continue with the rest of the task.`
   The file was not changed (`git status` clean afterwards).
b. `git push --dry-run origin HEAD:refs/heads/integration`:
   `PreToolUse:Bash hook error: [command hook 2]: agent-guard: blocked pushing to a protected branch. Ask the coordinator via a Shared Change Request.`
   The hook refused before git ran, so this proves the local hook only, not the GitHub ruleset.
c. `gh workflow run deploy.yml`:
   `PreToolUse:Bash hook error: [command hook 2]: agent-guard: blocked dispatching a workflow (several use production credentials). Ask the coordinator via a Shared Change Request.`
   Same caveat: the hook refused before `gh` ran.

## Timings
Roughly 2 minutes of tool time for install + verify + probes; total session a few minutes.

## Notes / friction
- A first attempt at probe (a) was an accidental no-op edit (identical old/new string), rejected by the Edit tool
  itself, not the guard. It was not the probe; the real probe followed.
- The task said to branch before reading; the branch was created from the current HEAD rather than
  `origin/integration` as README suggests. Both are the same commit here.
- Hook refusals are local only; whether GitHub rulesets block the same actions was not tested (and must not be).
