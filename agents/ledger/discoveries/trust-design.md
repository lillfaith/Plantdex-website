# Task: Discovery trust design (docs only)

- Lane / role: discoveries
- Branch: `agent/discoveries/trust-design` (from `integration`)
- Priority: A
- Token/time budget: one session
- **Status: `blocked`** (the design is written; the `npm run build` stage of `npm run verify` cannot run in this container; see "Verification")

## Goal
Write a design document for the owner to review on how competitive discoveries could eventually require in-app
capture with server-side reward validation, without revoking anything that exists. Docs only. Nothing in it is
active.

## Acceptance criteria
- [x] `docs/discovery-trust-design.md` covers: the owner's standing direction; the five trust levels and where each
      signal sits; candidate anti-cheat signals with false-positive cost; how server validation plugs into the
      existing recompute path and which files are coordinator-owned; a flagged rollout, dual-run, migration and
      rollback plan; what it cannot prove; open questions for the owner; a property-style test plan.
- [x] No application code, test, scoring, XP, progression, reducer, schema, migration, workflow, package file or
      data changed. No feature flag added in code.
- [x] `node scripts/agent-guard.mjs diff --role discoveries --base origin/integration` reports no out-of-lane file.
- [ ] `npm run verify` exits 0. **Not met: build stage fails for an environment reason, see below.**

## Authorised paths
`docs/**` and `agents/ledger/**` (rule `any-agent`, Tier 2). Files changed: `docs/discovery-trust-design.md`,
`agents/ledger/discoveries/trust-design.md`.

## Prohibited
Everything else. Not touched. No credential was read or needed. No workflow was dispatched. No PR into the
production branch.

## Contracts you may read but not change
`herbdex-reducer.ts`, `progression.ts`, `types.ts`, `supabase/**`, `leaderboard` SQL (migrations 0011, 0013),
`image-prepare.ts`, `ownership.json`.

## Verification (real output)

Environment: `node_modules` was absent, so `npm ci` was run first (exit 0; package files unchanged). Then
`npm run verify`:

| Stage | Result |
|---|---|
| `npm run lint` | pass (0 errors, 1 pre-existing warning: `'changedFiles' is defined but never used`, line 247 of a file outside this change) |
| `npm run typecheck` | pass |
| `npm run check:edge` | pass |
| `npm run test` | pass: `Test Files 131 passed (131)`, `Tests 2077 passed | 1 skipped (2078)` |
| `npm run build` | **FAIL** |

Build failure, verbatim (exit 1):

```
> Build error occurred
Error: Turbopack build failed with 1 error:
./src/app/globals.css
Error: Error evaluating Node.js code
Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
Require stack:
- /home/user/Plantdex-website/node_modules/lightningcss/node/index.js
- /home/user/Plantdex-website/node_modules/@tailwindcss/node/dist/index.js
- /home/user/Plantdex-website/node_modules/@tailwindcss/postcss/dist/index.js
```

Cause as far as it could be determined: `npm ci` in this container installed `lightningcss-linux-x64-musl`
and not `lightningcss-linux-x64-gnu` (the host is glibc), so the native CSS binary cannot be found. This is
unrelated to the change: the diff is two markdown files and cannot affect a CSS build.

One attempt at repair was made, kept out of the repository: `npm i --no-save lightningcss-linux-x64-gnu@1.30.1`
(installed, `git status` shows only the new doc; no package file changed). The build failed identically. No
further workaround was tried, per the brief ("if anything blocks you, record it as blocked and stop").

**What the owner/coordinator should do:** run `npm run verify` on a machine where the optional native binary
installs correctly (CI, or a clean `rm -rf node_modules && npm ci` on glibc). Expect lint, typecheck,
check:edge and test to match the table above; the build stage is independent of this change.

## Report
**What changed:** one design document (`docs/discovery-trust-design.md`), this ledger entry. Nothing else.

**Headline of the design:** a server-issued, HMAC-signed *receipt* from `identify-plant` (the existing species
attestation pattern), verified by `herbdex-action` through one shared pure predicate, gating only the Field Board's
discovery points, behind server flags defaulting OFF, with grandfathering by a new server-stamped time (because
`discoveries.discovered_at` is client-suppliable and cannot be trusted for that), a shadow-board phase before any
public change, and flag-flip rollback that revokes nothing.

**Coordinator-owned files it would need (Shared Change Requests, none filed):** a new migration, `herbdex-action`,
`_shared/herbdex/*`, `sync-edge-shared.mjs`, `remote-herbdex-storage.ts`, the schema/export/delete pin tests,
`.env.example`, `next.config.ts`, `CLAUDE.md`. Scan-owned: `identify-plant`, `scans*`, scan UI, `image-prepare`.

**Open questions:** ten, in section 10 of the document. Most consequential: must a competitive find use a live
`getUserMedia` stream (Q1); is the board the only competitive surface (Q2); how are long-time signed-out players
treated at the cutover (Q5).

**Could not verify:** the `next build` stage (above). No claim in the design about runtime behaviour was exercised;
every statement about the codebase is from reading the named files on 2026-11-20.

**PR:** not opened, because the task is `blocked`. The branch is pushed so the work is not lost.
