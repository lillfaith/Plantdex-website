# Agents: how work is divided, submitted and merged

Authoritative decisions: `docs/agent-workflow/decisions.md`. Protections: `docs/agent-workflow/github-protections.md`.
Ownership: `agents/ownership.json` (checked by `src/lib/ownership.test.ts` and `scripts/agent-guard.mjs`).

## Roles and branches

| Role | Branch prefix | Owns |
|---|---|---|
| coordinator | `coord/*` | shared contracts, CI, schema, merges into `integration` |
| scan | `agent/scan/*` | scanning, identification, Seed Shelf |
| quests | `agent/quests/*` | regions, quests, seasons, challenges |
| discoveries | `agent/discoveries/*` | sightings, journal, Field Board presentation |
| ui | `ui/*` | design surface; **human-directed, owner approves** |
| lane-b | `proto/b/*` | Priority B prototypes only |

A role is the lane your branch name declares. `node scripts/agent-guard.mjs who <path>` tells you who owns a path.

## Branch flow

`agent/*` -> pull request -> `integration` -> (owner-approved promotion PR) -> production branch.
Production is `claude/planning-session-61zwro`; **its name is unchanged**. Never push to it or to `integration`
directly, never merge your own work, never run a workflow, never use a credential for a deployed project.

## Rules every lane follows

1. Start from a task card (`agents/templates/task-card.md`), kept at `agents/ledger/<lane>/<task>.md`.
2. Edit only files your role owns. The hook refuses anything else; do not route around it.
3. Need a change in someone else's file, a migration, a dependency, XP/scoring/schema, auth, routing, global
   style or a card/photo asset? **Stop and file a Shared Change Request** (`agents/templates/request.md`, saved
   to `agents/requests/<lane>-<slug>.md`), then keep working on everything that does not depend on it.
   Contract first, feature second, never in the same branch.
4. Visual design is not yours. Build logic and plain markup with existing tokens and `ui/` primitives, mark
   any placeholder `data-ui-placeholder`, and file a UI request for anything that needs real design.
5. "Done" means a pull request with the real `npm run verify` output pasted in. A failed or abandoned task
   is recorded as `failed` with the error, not quietly dropped.
6. Keep changes small (aim for under 400 changed lines) and independently revertable.
7. No new network calls, paid-API use, secrets, or dependencies without a request.

## Escalate to the owner only for

UI decisions, major architectural choices, new expenses, safety/security-sensitive changes, production-affecting
operations. The coordinator decides what qualifies; everything else proceeds without interruption.

## Starting a lane session

Cloud sessions (preferred): one session per task, on a branch with the lane prefix, prompt =
the task card. The branch prefix selects the role for the hook. Local worktrees:

```bash
git clone --filter=blob:none --sparse <repo> pd-<lane>-<task>
cd pd-<lane>-<task>
git sparse-checkout set --no-cone '/*' '!/evidence/' '!/field/' '!/field-inat/' '!/iCloud Photos from*/' '!/product-source/'
git switch -c agent/<lane>/<task> origin/integration
export AGENT_ROLE=<lane>
```

The sparse checkout keeps the ~1.3 GB of evidence and the personal photo folder out of an agent's working
directory.
