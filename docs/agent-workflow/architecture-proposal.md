> **HISTORICAL COPY, preserved 2026-11-19 exactly as proposed (apart from one personal folder name replaced by a description).**
> The owner's decisions and every later change are in [`decisions.md`](./decisions.md); where the two
> disagree, `decisions.md` and the live files (`agents/ownership.json`, `docs/agent-workflow/*`) win.
> Notable corrections since this was written: the repository is **public** (not private), agents push under the
> owner's own GitHub identity, a clean `npm run verify` takes about 75 seconds, the production branch name is
> unchanged, and the lane is called "Discoveries and Journal".

# PlantDex multi-agent development architecture — audit and proposal

Status: PROPOSAL. Read-only audit done; nothing in the repository has been changed.
Evidence level: everything under "Audit" was measured from the checkout (git history, file
counts, import fan-in, workflows). Items marked **[unverified]** could not be checked from here.
Estimates in sections 9-10 are reasoned, not measured.

---

## 1. Audit: what the repository actually is

**Shape.** One Next.js 16 static export (GitHub Pages, custom domain plantdex.online) plus
Supabase (Postgres + Auth + Storage + 6 Deno edge functions). 2,490 tracked files, 134 test
files, 13 migrations (0001-0013), 30 GitHub workflows, 76 commits (all authored by Claude), and
**exactly one branch on the remote**.

**The single most important finding: the development branch IS the production branch.**
`deploy.yml` triggers on a push to `claude/planning-session-61zwro`; that push goes live at
plantdex.online. There is no `main`, no integration branch, no `CODEOWNERS`, and the only
pull-request-triggered workflow is `claude.yml` (answers `@claude` comments). The checks
(`lint`, `typecheck`, `test`) run inside the deploy job, i.e. after the push, not before a merge.
The only guard is a local `.githooks/pre-commit` that refuses commits on that branch; it is
installed by `npm install` (`prepare`) and is advisory, since nothing server-side enforces it.
Whether GitHub branch protection exists on it is **[unverified]**.
Multiple autonomous agents cannot safely start until this is fixed.

**Layout (actual, not idealised).**

| Area | Where | Notes |
|---|---|---|
| Routes | `src/app/*` | account, garden, herbdex, journal, leaderboard, learn, profile, quests, scan, seasons, seed-shelf, shop, start, legal pages. One folder per route already. |
| Components | `src/components/<feature>/` | 22 feature folders. `herbdex/` (31 files, 2.5k lines) and `profile/` (14) are the big ones; `scan/ScanPanel.tsx` is 1,226 lines; `DiscoveryCelebration.tsx` 705. |
| Logic | `src/lib/*` | **Flat**, ~230 modules + tests, grouped only by filename prefix (`identification-*`, `seed-*`, `card-*`, `leaderboard*`, `region*`, `remote-*`). |
| State | `src/state/*` | `AuthProvider`, `HerbdexProvider`, `herbdex-store`. The single injection point for progression. |
| Server | `supabase/migrations`, `supabase/functions/*`, `supabase/functions/_shared/herbdex/` | `_shared` is **generated** from `src/lib` by `npm run sync:edge-shared` (`PURE_MODULES` list). |
| Generated data | `src/data/herbs.json`, `sprites.json`, `public/cards/**`, `structures.tsx`, `_shared/**` | Never hand-edited. Built by Python scripts needing print masters. |
| Heavy non-code | `evidence/` (1,023 files, ~1.3 GB tracked), the iCloud photo folder (path in `agents/ownership.json`) (48 files, 55 MB), `field/`, `public/` (12 MB) | The git pack is 1.28 GiB. See risks. |

**What already works in our favour (the best asset).** The repo practises *architecture by
test*. Tests already pin boundaries: the seed-shelf modules may not import the reducer
(`seed-shelf.test.ts`), the walkthrough may import no store (`walkthrough.test.ts`), `/start`
imports no progression (`entry-point.test.ts`), exactly one writer per concern, contrast and
token checks on every colour, export/delete table parity, migration column lists vs. TypeScript.
`npm run verify` (lint + typecheck + deno check + tests + build) is a strong merge gate. We should
extend this style (ownership as a test) rather than invent a parallel mechanism.

**Churn hotspots (all-history commit count) = conflict points.**

| File | Evidence | Why it conflicts |
|---|---|---|
| `src/app/globals.css` | 3,149 lines, #1 most-changed file (26 commits) | Every visual feature touches it. |
| `src/lib/types.ts` | imported by 102 modules | Contract for every domain. |
| `src/lib/deck.ts` | fan-in 85 | Card contract. |
| `src/lib/plant-match.ts` | fan-in 34 | Scan + shelf + collection all depend on it. |
| `src/lib/progression.ts`, `mastery.ts`, `research.ts`, `habitat.ts`, `garden.ts`, `catalogue.ts`, `field-cards.ts` | fan-in 18-30 each | XP/scoring/engine; several are mirrored into the server by the sync script. |
| `src/state/HerbdexProvider.tsx` | every feature plugs in here | Single integration point; has already grown to own research, unlocks, analytics. |
| `SiteNav.tsx`, `layout.tsx`, new `src/app/*` routes | navigation | Seven-label nav ceiling documented; each feature wants a slot. |
| `CLAUDE.md`, `AGENTS.md` | CLAUDE.md edited 7 times | Every agent appends lessons to it. |
| `package.json` / lockfile, `scripts/sync-edge-shared.mjs` | cross-cutting | Dependency and sync list changes. |
| `supabase/migrations/NNNN_*.sql` | sequentially numbered | Two agents both create `0014`. |
| `ScanPanel.tsx`, `DiscoveryCelebration.tsx`, `HerbDetail.tsx`, `ProfileTabs.tsx`, `GardenView.tsx` | 5-8 commits each, 400-1,200 lines | Large single files; two agents inside one = guaranteed conflict. |

**Context cost.** `CLAUDE.md` is several hundred dense lines loaded into *every* session at
start. With 5 sessions that is 5x the same large read, mostly irrelevant to each lane.

---

## 2. Single repo vs. three repos (the question you asked)

**Recommendation: one canonical repository. Do not split by priority.**

- A/B/C are *scheduling* tiers; code does not respect them. Priority A (quests, scan) and B
  (garden, profile) share `HerbdexProvider`, `types.ts`, `progression.ts`, the reducer, the
  Supabase schema and the design tokens. Three repos would force those into a fourth shared package,
  vendoring, or copy-and-drift: the exact failure mode the `_shared` sync script was written to
  prevent *within* one repo.
- The server mirrors `src/lib` modules byte-for-byte and a test fails on drift. That guarantee
  does not survive repo boundaries.
- One migration history, one deploy pipeline, one set of RLS tests. Splitting multiplies the
  production-protection work by three.
- What you actually need is *file ownership + isolated branches + a gated merge queue*, which a
  single repo with worktrees gives you, with no refactor.

**Do we need a big module refactor? No.** The component folders and route folders are already
feature boundaries. `src/lib` is flat, but ownership can be declared by glob (prefix) in a manifest,
without moving a single file. Moving ~230 files would itself be the highest-conflict operation in the
project. Revisit only if the manifest shows a prefix that cannot be cleanly assigned.

---

## 3. Recommended module boundaries (ownership by glob; no file moves)

Four tiers of ownership. A file belongs to exactly one.

**Tier 0 - Human-only (no agent may edit, ever).** Your approved identity.
`public/cards/**`, `public/product/**`, `public/reference/**`, `public/scan/**`, `public/boss-form/**`,
`product-source/**`, `the iCloud photo folder`, `field/**`, `field-inat/**`, `evidence/**`,
generated data (`src/data/herbs.json`, `sprites.json`, `structures.tsx`, `supabase/functions/_shared/**`
except via the sync script), `AGENTS.md`, legal and safety copy (`privacy`, `terms`, `terms-of-sale`,
`returns`, `shipping`, `safety` routes, `SafetyNotice.tsx`), XP/level threshold literals in `progression.ts`.

**Tier 1 - Coordinator-owned contracts (change only via a Shared Change Request).**
`src/lib/types.ts`, `herbdex-state.ts`, `herbdex-reducer.ts`, `storage.ts`, `deck.ts`, `catalogue.ts`,
`progression.ts`, `mastery.ts`, `research.ts` (engine), `achievements.ts`, `field-cards.ts`, `rng.ts`,
`src/state/**`, `supabase-client.ts`, `auth-redirect.ts`, `src/components/auth/**`,
`supabase/migrations/**`, `supabase/functions/**` and `_shared` plus `scripts/sync-edge-shared.mjs`,
`supabase/README`, `.github/**`, `.githooks/**`, `package.json`, `package-lock.json`, `next.config.ts`,
`tsconfig.json`, `eslint.config.mjs`, `vitest*.ts`, root `CLAUDE.md`, `src/app/layout.tsx`, the route
table (adding a *new* `src/app/<x>/page.tsx` is allowed in your own domain; changing existing routes is not).

**Tier 2 - Domain-owned (an agent works here freely).**

| Domain | Owns (globs) |
|---|---|
| **S: Scan & Identification** | `src/components/scan/**`, `src/components/seedshelf/**`, `src/app/scan`, `src/app/seed-shelf`; lib: `scans*`, `scan-*`, `plant-match*`, `plantnet-normalize`, `plantid-normalize`, `identification-*`, `observed-taxon*`, `taxon-*`, `species-*`, `seed-*`, `local-seed-shelf`, `remote-seed-shelf`, `image-prepare*`, `photo-*`, `findability*`, `plant-id-safety*`; `supabase/functions/identify-plant/**`, `seed-packet/**` *(function deploys = Tier 1 operation, coordinator runs it)* |
| **Q: Quests, Regions, Rewards, Challenges** | `src/components/quests/**`, `research/**`, `challenges/**`, `src/app/quests`, `seasons`; lib: `region*`, `quest-board*`, `research-board`, `habitat*`, `seasons*`, `challenge-*`, `boss-form*` (pilot, flag off), `field-board-access`; `catalog-*` |
| **D: Discoveries, Sightings, Journal (trust)** | `src/components/journal/**`, `src/components/herbdex/**` (non-visual logic only, see UI rule), `src/app/journal`; lib: `sightings*`, `remote-sightings*`, `import-local-progress*`, `observation-*`, `leaderboard*`, `remote-leaderboard*`, `board-view*`, `src/components/leaderboard/**` |
| **B-lane (Priority B, prototype-only for now): Garden / Profile / Social** | `src/components/garden/**`, `profile/**`, `game/**`; lib: `garden*`, `grow-track*`, `player-profile*`, `profile-*`, `remote-player-profile`, `field-frames`, `field-titles`, `cosmetics`, `plant-sprites*` |

**Tier 3 - Human-directed UI (the UI session; you approve).**
`src/app/globals.css`, `SiteNav.tsx`, `SiteFooter.tsx`, `SiteDecor.tsx`, `PageAtmosphere.tsx`,
`src/components/ui/**`, `icons/**`, `GrowthLoader.tsx`, `PlantSprite.tsx`, `page-themes*`, `pixel-*`,
`rarity-*`, `card-foil`, `card-ring`, `locked-card-art`, the design tokens, animation keyframes,
`scripts/sprite_sources/**`. Also the visual markup of anything user-facing (see rule below).

**The UI rule that keeps feature agents out of design:** a feature agent writes *logic hooks and a
plain-markup view inside its own folder*, using only existing `ui/` primitives and existing
Tailwind/deck tokens. It may not add a colour, class, keyframe, font, layout system or new shared
component. If it needs one it files a UI Request (queue below). Existing tests already enforce half
of this (every text colour must resolve to a deck token, `tailwind-candidates`, `no-emoji`, contrast).
Placeholder views carry a `data-ui-placeholder` attribute so the UI session can find every one that
still needs your design.

---

## 4. Agent roster, ownership and permissions

One coordinator, three implementation lanes for Priority A, one human-paced UI session.

| Role | Branch prefix | Writes | Never touches | Merges? |
|---|---|---|---|---|
| **Coordinator / integrator** (1 session; does not build features) | `coord/*`, owns `integration` | Tier 1 contracts (on request), CI, ownership manifest, migrations, sync, edge deploys | Tier 0, Tier 3 | Merges agent PRs into `integration` only, sequentially. **Cannot** push to production; promotion needs your approval. |
| **S - Scan & Identification** | `agent/s/<task>` | Domain S | Tiers 0, 1, 3, other domains | No |
| **Q - Quests/Regions/Challenges** | `agent/q/<task>` | Domain Q | Tiers 0, 1, 3, other domains | No |
| **D - Discoveries/Sightings/Trust** | `agent/d/<task>` | Domain D | Tiers 0, 1, 3, other domains | No |
| **UI session** (you + one session, not autonomous) | `ui/<slug>` | Tier 3, plus visual markup in any domain **after your approval** | Tiers 0, 1 logic | No (you approve; coordinator merges) |
| Priority B research agents | `proto/b/<slug>` | Docs and `prototypes/`-style throwaway branches only; never merged without a promotion decision | everything else | No |

Every agent additionally may **not**: run or dispatch GitHub workflows (30 exist, several call paid
external APIs such as PlantNet/plant.id), hold the Supabase service-role key, hold provider keys, run
`verify:supabase` (live writes against a real project), run Python deck/sprite builders that need print
masters, or `git push` to anything but its own branch (enforced by token/ruleset, section 8).

**Per-agent task card (template the coordinator issues).**
Goal; acceptance criteria (testable); authorised paths (globs, copied from manifest); prohibited
paths; contracts it may *read* but not change; required checks (`npm run verify` clean, plus named new
tests); definition of done = PR opened with checklist filled and the verify output attached; blocker
protocol below. A task is *not complete* until the check output is in the PR; "done" claims without it
are rejected by the coordinator.

**Reporting protocol (file-based, so it survives sessions).** `agents/ledger/` (one markdown file per
task, in coordinator-owned space): status `queued | in-progress | blocked | review | merged | failed`,
last verify result with command and exit code, open questions. Agents append; the coordinator
transitions state. Failed tasks stay in the ledger as `failed` with the error, never silently dropped.

**Shared Change Request (SCR).** The only legal way to alter a Tier 1 file. The agent stops, writes
`agents/requests/<lane>-<slug>.md` (what, why, exact proposed diff or SQL, which tests it needs, who
else depends on it) and continues on any part of the task that does not depend on it. The coordinator
either (a) lands it as a small *contract PR* into `integration` first, after which the agent rebases,
or (b) rejects/escalates to you. Pattern: **contract PR first, feature PR second**. Never both in one
branch.

---

## 5. Dependency map: what runs in parallel

```
Wave 0 (serial, coordinator only, ~1 session) ── guardrails + integration branch + ownership manifest
   │
   ├── Wave 1 (parallel, no shared files)
   │     S: identification improvements, scan-flow logic          (Domain S only)
   │     Q: nearby species, regional quest *display*              (Domain Q only; reads catalog_regions, no schema change)
   │     D: trust design doc (no code until you decide - see Q3)  (docs only)
   │     UI: navigation + visual direction (your pace)            (Tier 3)
   │
   ├── Contract PRs (coordinator, serial, small)
   │     C1: weekly-challenge research kind in research.ts  → sync:edge-shared → redeploy herbdex-action
   │     C2: any new table/column (migration queue, one at a time)
   │
   └── Wave 2 (starts after its contract PR merges)
         Q: weekly challenges UI/logic   (needs C1)
         Q/D: any rewarded regional quest (needs C1, possibly C2, and your approval of any XP change)
         D: trust implementation          (needs your decision; may need C2)
```

Safe to run concurrently (disjoint owned globs): S, Q, D, UI, Priority B docs/prototypes.
Must be serialised: anything touching `types.ts`/reducer/progression/research, every migration,
every `sync:edge-shared` + edge-function deploy, `package.json`, nav, `globals.css`.

---

## 6. Priority queue (proposed; confirm against `docs/gameplay-roadmap.md`, which I did not exhaustively audit)

**Wave 0 - Foundations (coordinator; nothing else starts before items 1-4)**
1. Confirm/establish branch protection + create `integration` (section 7). *Needs your approval (production-affecting).*
2. `agents/ownership.json` manifest + `ownership.test.ts` (every tracked path has exactly one tier/owner) + path-guard script.
3. `pr-verify.yml` (PR gate running the full `npm run verify`) + `CODEOWNERS`.
4. Worktree bootstrap script (sparse: excludes `evidence/`, `field*/`, `iCloud*`) + split `CLAUDE.md` into nested per-domain files.
5. Migration ledger + isolated dev Supabase project/branch.

**Priority A (active)**
- S1 identification improvements (follow `docs/identification.md`; reliability/regression suites exist).
- S2 scan outcome/result logic polish (visual changes go to UI queue).
- Q1 nearby species by chosen region (`region-species`, `catalog_regions` already exist).
- Q2 regional quests (display and progress derived; no payout until C1).
- Q3 weekly challenges (blocked on C1).
- D1 trustworthy discoveries (blocked on your decision, see below).
- UI1 navigation (human-directed).

**Priority B (research / prototype only, must not slow A)**
Garden expansion, profiles, sharing, botanical avatar customization, cosmetic rewards, retention
systems. Output: design notes and throwaway prototypes. Two things need *your* decision before any
build, because they contradict current documented decisions:
(a) retention/idle mechanics contradict the garden rule "no clock, no watering, no idle growth"
(`CLAUDE.md`, which notes this is *our* product decision, not an AGENTS.md requirement);
(b) sharing contradicts "profile is owner-only"; the opt-in showcase is already drafted in
`docs/leaderboard-showcase-proposal.md`.

**Priority C (planning only)**
Mushrooms (identification safety is the highest-risk area in the product; needs its own safety design,
not an extension of the 45-card deck invariants), recipes (AGENTS.md forbids edibility/medical claims),
trading and advanced multiplayer (progression is self-declared and unverified, so trading is trivially
farmable and needs a server-trust model first), mystery packs (commerce/regulatory review).

---

## 7. Git, worktree and merge strategy

**Branches**
- `production` = whatever `deploy.yml` deploys. Today that is `claude/planning-session-61zwro`.
  *Renaming it/moving deploy to `main` means editing `deploy.yml`, `.githooks/pre-commit`, Pages
  environment rules and `check-live-site`; do it as one coordinated, reversible change, not now.*
  Interim: leave it, protect it.
- `integration` (new, from the current production tip). Only the coordinator merges into it.
- `agent/<lane>/<task>`, `ui/<slug>`, `coord/<slug>`, `proto/b/<slug>`: short-lived, one task each,
  ideally under ~400 changed lines so each is independently revertable.

**Worktrees (when agents run on a local machine).**
`git worktree add ../pd-s-<task> -b agent/s/<task> origin/integration`. One worktree per task, never
shared, never edited by another agent. Sparse checkout excludes the ~1.4 GB of evidence/photos so
five worktrees are not 7 GB. Each worktree gets its own `node_modules` (or a read-only shared cache),
its own `.env` with *no* production secrets, and its own `PORT` for `next dev`.
*In cloud sessions every session already has its own container and clone, so worktrees are
unnecessary there; the same branch rules apply.*

**Merge workflow.**
1. Agent finishes -> pushes `agent/*` branch -> opens PR **into `integration`** with the checklist.
2. `pr-verify.yml` runs full verify + ownership check (diff touches only the author's globs).
3. Coordinator reviews Tier 1 adjacency, rebases the PR onto current `integration`, squash-merges
   **one PR at a time**, reruns the regression check after each merge (CI on `integration`).
4. Weekly or when you choose: promote `integration` -> production by a PR *you* approve. A promotion
   bundles several already-verified squash commits, so rollback = revert one PR.
5. If a merge breaks `integration`: coordinator reverts that squash commit first, investigates after.

**Conflict prevention (layered).** Disjoint ownership globs (primary); contract-PR-first; short-lived
small branches; rebase onto `integration` before opening the PR; `globals.css` and nav closed to
feature agents; migrations never authored by agents (they submit SQL in an SCR; the coordinator numbers
it, so no `0014` collision); `CLAUDE.md` lessons appended by the coordinator from task reports instead
of by seven agents at once.

---

## 8. Safeguards: the 12 requirements, and how hard each one is

"Hard" = a machine refuses. "Soft" = relies on instructions/review.

| # | Requirement | Mechanism | Strength |
|---|---|---|---|
| 1 | No agent edits another's worktree | One worktree per task; agents are started with only their path as cwd and a PreToolUse hook that denies Write/Edit outside it | Hard (hook) |
| 2 | No direct push/merge to protected branches | GitHub rulesets/branch protection on production and integration (PR + required checks + no direct push); agent credentials limited to pushing `agent/*` **[unverified: depends on your GitHub plan; private repos on the free plan do not support protected branches]** | Hard if available, otherwise a pre-push hook (Soft) plus a fine-grained token |
| 3 | Shared changes get coordinator review | `CODEOWNERS` for Tier 0/1/3 globs + required review + the SCR process | Hard (CODEOWNERS) |
| 4 | Unit, integration, type, lint, security checks | `pr-verify.yml` runs `npm run verify` (lint, tsc, deno check, 134 test files, build); existing guards (`account-security`, `profile-schema`, `scan-quota-security`, RLS tests) already encode security rules; add secret scan | Hard |
| 5 | Sequential merges with regression checks | Merge queue or coordinator-only merge, CI on `integration` after each | Hard (queue) / Soft (coordinator) |
| 6 | Small, reversible, documented | PR size check (warn >400 lines), squash merges, ledger entry, PR template | Soft + size warning |
| 7 | Serialized, tested migrations | Agents have no write path to `supabase/migrations/**` (path guard + CODEOWNERS); coordinator numbers, tests on an isolated dev project, forward-only plus documented rollback SQL; existing `run-migration.yml` stays coordinator-triggered | Hard |
| 8 | No shared writable DBs/accounts/temp/deploys | Implementers get **no** Supabase credentials; unit tests need none. Only the coordinator uses one dedicated test project for `verify:supabase` (it writes permanent rows to global tables, so it is not safe to run concurrently or from multiple agents). Separate `PORT`/tmp per worktree. No agent may dispatch deploy workflows | Hard (no creds) |
| 9 | Spend/token limits | Per-session turn/budget caps (headless mode supports `--max-turns` and a budget flag **[verify flag names on your version]**), workspace spend limits at the console/plan level, task-card token budget, ledger records usage; agents hold no PlantNet/plant.id keys and may not run provider-calling workflows | Hard (caps) / Soft (task budget) |
| 10 | Approved cards, photos, visuals untouched | Tier 0 path deny-list in the guard hook **and** CODEOWNERS to you **and** `ownership.test.ts`; generated files only change through the sync/build scripts you run | Hard |
| 11 | Production behavior and user data preserved | No agent credentials to production; migrations additive-only (the repo already enforces additive `STORAGE_VERSION` rules); promotion is yours; rollback by revert + redeploy | Hard / process |
| 12 | Failures reported, not marked done | Ledger status requires attached command output + exit code; coordinator independently re-runs verify on the branch before merging; a task claiming done without that is auto-rejected | Soft + independent re-run |

**The two enforcement artifacts to build** (both small, both testable in the repo's own style):
`agents/ownership.json` (path -> tier -> owner) and `scripts/agent-guard.mjs`, which reads it and an
`AGENT_ROLE` environment variable. It is invoked three ways: as a Claude Code PreToolUse hook on
Edit/Write (blocks at write time), as a pre-push hook, and as a CI step on the PR diff (cannot be
bypassed locally). `ownership.test.ts` fails the normal suite if any tracked file is unowned or
claimed twice, which keeps the manifest from rotting.

**Rollback / production protection.** Production only advances by approved promotion PR. Each
promoted unit is a squash commit; revert + redeploy restores the prior static build (Pages, no server
state). Database changes are forward-only and additive; each carries rollback SQL in the migration
request, tested on the dev project first. `check_live_site.py` (already runs after each deploy and
asserts the right Supabase project) stays as the post-deploy tripwire.

---

## 9. Approach comparison and recommendation

| | Subagents (Agent tool in one session) | Agent teams (experimental, teammates + shared task list) | Separate sessions in worktrees (or cloud sessions) |
|---|---|---|---|
| Isolation | Weak: shares the parent's checkout unless worktree-isolated; shares permissions | Medium: separate contexts, shared checkout unless you add worktrees | **Strong**: separate checkout, permissions, hooks, budget |
| Token cost | Lowest; results summarised back into parent | Highest: every teammate carries full context, plus message traffic | Medium: one context per session, no chatter |
| Human supervision | You see only the parent | One view, but harder to audit who did what | **Best**: each session is a visible, interruptible stream; fits your UI-supervision need |
| Reliability/maturity | Stable | Experimental **[verify current status in the docs before relying on it]** | Stable, plain git |
| Fit for long feature work | Poor (parent context becomes the bottleneck) | Fair | **Good** |
| Fit for review, search, test triage | **Excellent** | OK | Overkill |

**Recommendation: separate sessions, one per lane, each in its own worktree/branch, coordinated
through git + the ledger; use subagents *inside* a session** for read-only audits, code review and test
triage (cheap, no write risk). Do not make agent teams the foundation: the cost and maturity trade-off
does not buy anything the ledger plus git does not already give you, and it weakens per-lane
permissioning. Revisit if teams become stable and you want live back-and-forth between lanes.

---

## 10. Concurrency and overhead estimate (reasoned, not measured)

- **Useful ceiling: 3 implementation lanes + coordinator + UI session = 5 sessions**, of which at most 3-4
  generate merge pressure. A fourth implementer mostly queues behind the coordinator's sequential
  verify-after-every-merge step; the merge path, not agent capacity, is the bottleneck.
- **Realistic throughput gain: about 2x to 2.5x**, not 3x, because of the sequential merge queue, SCR
  stalls and your own review/UI approvals (your approval latency is likely the real limiter).
- **Token overhead (rough):** coordination (coordinator session, reviews, ledger, SCR handling, re-running
  verify) adds on the order of 20-35% on top of raw implementation tokens at 3 lanes. Cold-start context per
  session is the avoidable part: the current `CLAUDE.md` is loaded 5x; splitting it into nested domain files
  (loaded only when an agent works in that folder) should cut per-session startup noticeably. Cost is
  front-loaded in Wave 0; run a one-agent pilot and measure the real numbers before adding lanes.
- **Unmeasured and worth timing first:** wall-clock of `npm run verify` on a clean worktree (it includes
  `next build` of ~600 public files and a Deno check). If it exceeds ~5-8 minutes, the merge queue will
  throttle everything and we should split a fast PR gate (lint/tsc/tests) from the full gate at promotion.

---

## 11. Migration plan: minimal disruption

Each step is additive, reversible, and leaves current development untouched.

1. **Decisions (no code)**: answer the open questions below; I check branch-protection status via the
   GitHub API if you want.
2. **Docs-only PR**: `agents/` (ownership manifest, task-card template, SCR template, ledger README,
   this proposal condensed). No `src` changes.
3. **Guard PR**: `scripts/agent-guard.mjs`, `ownership.test.ts`, `pr-verify.yml`, `CODEOWNERS`,
   `.claude/settings.json` hook entries. Touches no product code.
4. **Branches**: create `integration` from the current production tip; enable protection/rulesets.
5. **Hygiene**: sparse-checkout worktree script; split `CLAUDE.md` into nested per-domain files by *moving*
   text (no rewriting; this is what keeps hard-won rules intact); decide the fate of `evidence/` and the
   personal-named photo folder (below).
6. **Pilot**: one lane (S), one small task, end to end through PR -> integration -> promotion. Measure
   cost, verify time, conflicts. Then add Q and D.
7. **Bring the UI session online** after the manifest exists so its scope is enforced from day one.

Work currently in flight on the production branch should be merged or paused before step 4; the
existing pre-commit hook already pushes people toward feature branches, so the cutover is small.

---

## 12. Risks and things I noticed that you should know

- **Production = dev branch** (above). Highest priority to fix.
- **Personal photo folder in the repo.** the iCloud photo folder (path in `agents/ownership.json`) (48 files, 55 MB) is tracked.
  If the repo is or becomes public, or is cloned into many agent environments, that is a privacy
  exposure; it is also Tier 0. Suggest confirming whether it should be in git at all (removing it from
  history is a separate, deliberate operation I will not do unasked).
- **1.3 GB of tracked `evidence/`** makes every clone and worktree heavy; sparse checkout mitigates it.
- **Trustworthy discoveries conflicts with a documented decision.** `CLAUDE.md` ("Progression is
  self-declared") records, with reasons, that verification is deliberately not built, that EXIF is
  never read, and that card-detection was rejected. Lane D cannot start coding until you decide which
  way that goes; I would treat it as a design task first.
- **`claude.yml` runs on any `@claude` comment** with read permissions; confirm who can trigger it.
- **30 workflows**, several calling paid external services; agents must not be able to dispatch them.
- The recorded history shows the repo's own hard-won rules are mostly in `CLAUDE.md`; whatever is
  split must preserve those lines verbatim.

---

## 13. Decisions I need from you (everything else the agents can do autonomously after approval)

1. **Where do agents run?** Local machine worktrees, or cloud sessions like this one (each has its own
   clone)? This changes the isolation details but not the architecture.
2. **GitHub plan / protected branches.** Can you enable branch protection or rulesets (needs a plan that
   supports them for a private repo)? If not, I will rely on hooks plus a limited-scope token.
3. **Trustworthy discoveries**: do you want verification-style features at all given the documented
   "self-declared" decision, or should Lane D focus on journal/sighting quality instead?
4. **Production branch rename** to `main` (small coordinated change) or keep the current name for now?
5. **Photo folder / evidence**: leave in git, or plan a separate removal?
6. **Approve Wave 0** as scoped in section 6, and the three Priority A lanes (S, Q, D) plus the UI session.
