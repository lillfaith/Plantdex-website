# Task: <short name>

- Lane / role: <scan | quests | discoveries | ui | lane-b | coordinator>
- Branch: `agent/<lane>/<task>` (from `integration`)
- Priority: A | B | C
- Token/time budget: <e.g. one session, stop and report at N turns>

## Goal
<What outcome, in the owner's terms.>

## Acceptance criteria
- [ ] <testable statement>
- [ ] <testable statement>

## Authorised paths
<Copy from `node scripts/agent-guard.mjs who <path>`; globs from agents/ownership.json for this role.>

## Prohibited
Everything not authorised. In particular: XP/scoring/reducer/schema/auth/routing/global styles, migrations,
dependencies, workflows, card and photo assets, any credential, any workflow dispatch.

## Contracts you may read but not change
<List.>

## Required checks
- `npm run verify` exits 0 on the branch (paste the tail)
- <new tests that fail without the change>

## Report format
Status (`in-progress | blocked | review | failed`), what changed, verify output, open questions, anything you
could not verify.
