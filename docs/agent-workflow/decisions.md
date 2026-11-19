# Owner decisions, 2026-11-19

Recorded from the owner's reply to the architecture proposal. These are the standing instructions for
every agent session. If something here conflicts with `architecture-proposal.md`, this file wins.

## Approved

- **One repository, many isolated workspaces.** No split by priority. A/B/C are scheduling tiers.
- **Isolated cloud sessions are preferred**, with local worktrees as the fallback, provided sessions give
  persistent work, separate branches and reviewable PRs. Recommendation and evidence are in
  `rollout-status.md`. The owner should not have to manage terminals or coordinate agents by hand.
- **Wave 0 guardrails**, on an isolated branch (`coord/wave0-guardrails`), never pushed to the production branch.
- **Three Priority A lanes**, started only after Wave 0 passes its safety test:
  1. Scan and Identification (`agent/scan/*`)
  2. Quests, Regions and Challenges (`agent/quests/*`)
  3. Discoveries and Journal (`agent/discoveries/*`)
- **UI/design stays human-directed** in its own session (`ui/*`). No autonomous agent changes navigation,
  palette, type, layout, shared components, cards, animation or the overall look.
- **The production branch keeps its current name** (`claude/planning-session-61zwro`). No rename during
  Wave 0. Migration to `main` is a later, separately tested change.
- **Scan and Discoveries never both change the card-awarding, XP or progression contracts.** Those, and
  shared scoring and schema changes, belong to the coordinator. This is enforced in `agents/ownership.json`
  and pinned by `src/lib/ownership.test.ts`.

## Safety requirements

1. **Agents must not be able to publish to plantdex.online.** Separate development, integration and
   production. CI runs on pull requests before merging. A production release requires the owner's
   explicit approval.
2. **No implementation agent holds production credentials or deploy permission.** A local hook or an
   ownership manifest is NOT sufficient; the boundary must live in GitHub (rulesets, an environment
   approval gate, scoped credentials). See `github-protections.md` for what is in place, what is
   drafted, and what the owner still has to switch on.
3. **No deleting originals, rewriting git history, or removing required assets without approval.**
   Backups first. See `asset-audit.md`.
4. **Autonomous: low-risk setup (docs, tests, verified-safe configuration).**
   **Pause for approval before:** changing production deployment behaviour, applying database migrations,
   rewriting history, anything irreversible, merging features into production.
5. **Escalate to the owner only for:** UI decisions, major architectural choices, new expenses,
   safety/security-sensitive changes, production-affecting operations. Everything else proceeds.

## Product decisions recorded

### Discovery trust (updates the "progression is self-declared" decision)

The older decision ("every stage is a claim the player makes, nothing verifies it") was right for a game
with no competition. It stops being right once the Field Board ranks players. The new direction:

- **Competitive discoveries should eventually require in-app camera capture**, with practical anti-cheat
  measures and **server-side reward validation**.
- **Imported photos remain valid for educational identification** (looking a plant up) and do not, by
  themselves, award competitive progress.
- **Personal journal entries may remain self-reported.**
- **Existing collections, scores and accounts are preserved.** Nothing is revoked retroactively.
- **Multiple camera angles do not prove a real-world discovery.** Do not design anything that treats
  "two or three photographs" as evidence of presence.
- **No unnecessary EXIF collection and no invasive location tracking.** `prepareImage` keeps its
  "no path returns original bytes" rule.
- **Feature flags and a migration strategy are mandatory.** Old and new rules coexist; the new rules are
  inert until switched on.
- **NOTHING HERE IS ACTIVE.** No agent may switch on, or write code that changes the outcome of, a
  competitive rule until the owner has reviewed the design. The first task in the Discoveries lane is a
  written design for the owner to review, not code.

### Garden

The no-timers, no-idle-growth principle stands. Garden growth follows discoveries, learning and mastery,
never waiting or daily chores. "Mystery plants" outside the Garden may encourage outdoor discovery, but
must not create automatic growth timers.

## Rollout order (owner-specified)

1. Prepare and preserve a clean rollback point.
2. Verify repository permissions, deployment triggers, secrets and branch protections.
3. Establish safe branches, CI and the ownership/agent task ledger.
4. Test one isolated agent task through the complete PR and integration workflow.
5. Verify that this does not deploy to production.
6. Launch the three implementation lanes only after the test succeeds.
