# History cleanup plan (STAGED; nothing here has been done)

Owner decisions (2026-11-19): remove the unneeded files from **active tracking first**; **no history rewrite and no
force-push yet**; keep `claude/production-system-v1` operational until its card-production work and outputs are
preserved; back up the personal photos **privately**. This document is the separate, comprehensive plan for the later
rewrite. It needs the owner's explicit approval at the points marked **GATE**.

## Stage 0: stop tracking (prepared, waits for the one-time authorization)
Removes 928 image files from the tree of the app lines (`integration` and, through promotion, the production branch):
48 personal photographs, 715 evidence photographs, 104 candidate previews, 61 segmentation images. Every JSON, text and
attribution file stays, as do the card drafts under `evidence/cards` and the boss-form photographs. Ignore rules stop
them returning. See `maintenance-authorization.md`. **It does not touch `claude/production-system-v1`.** It fixes
"agents and new clones see them", not "the public can download history".

## What exposure actually looks like (recomputed by content, 20 branches)
My first count compared commit ids and was wrong: `claude/production-system-v1` has a different root commit, so the same
files appear under different ids. By content (tree at each branch tip):

| Group | Branches | Photo folder (48) | Evidence photos |
|---|---|---|---|
| App line | production branch, `integration`, the Wave 0 and test branches (`coord/*`, `agent/*`), `claude/plantdex-v0-3-supabase-verify-iic8pz`, `prep-expansion`, `backup/pre-multi-agent-20261119` | yes | 715 |
| Catalog line | `claude/botanical-catalog-stage-1`, `claude/photo-collector-v1`, `exp` | yes | 1,402 |
| Card-production line | `claude/production-system-v1` | yes | 1,402 plus 240 batch outputs |
| Older, not exposed | `claude/hopeful-bardeen-0sipzk`, `add-claude-github-workflow`, `backup/pre-profile-redesign` | no | no |
| Photos but no evidence images | `claude/georgia-quest-mvp`, `claude/security-hardening-0009` | yes | 0 |

So **14 of 20 branches** carry the photographs. Commit metadata (author names, personal e-mail addresses, a local
computer name) is in every branch's history.

## Everything a rewrite has to account for
| Item | State | What a rewrite must do |
|---|---|---|
| Branches | 20 | Rewrite or delete every one that carries the files; the three groups above have **different roots** and need separate passes |
| Backup refs | `backup/pre-multi-agent-20261119`, `backup/pre-profile-redesign`, the local-only rollback tag | Contain the files: delete them, and keep the private mirror as the real backup |
| Pull-request refs | 31 PRs, all closed, none open; GitHub keeps their old commits reachable through hidden `refs/pull/*` | A force-push alone leaves them downloadable by hash; only GitHub Support can purge, or the history must move to a new repository |
| Forks | **0** (checked) | Nothing to chase outside the repository |
| Stars / watchers | 0 / 0 | Nothing lost by starting a new repository |
| Open issues | 3 | Re-create or export |
| Clones | the owner's machines; each cloud session's ephemeral container; CI caches | Re-clone everywhere after; sessions get a fresh clone anyway |
| Actions logs and artifacts | exist for 720+ runs | Separate retention; delete runs/artifacts that contain the files |
| Pages / domain | `plantdex.online` via Pages from the production branch | Preserved by Route 1; rebuilt by Route 2 |
| Commit metadata | every commit | Rewrite authorship in the same pass (a mailmap) |

## The card-production branch: when and how
`claude/production-system-v1` is **its own history** (root commit 2026-08-21, 765 commits: 606 by Claude sessions, 131
by `github-actions`, the rest by the owner; about 3 GB of objects; 2,381 files under `evidence/`). It has no common
ancestor with the production branch. It is also **live**: the card-production session was still queueing runs this
afternoon (33 of 85 cards finished) and the pipeline commits results to it.

Nothing may be done to it while it is producing. Proposed process, each step a **GATE** for the owner:
1. **Freeze point.** Choose it: either the 85-card run is finished, or the owner pauses it deliberately. Until then
   leave it alone. (I will not start this; the owner or that session says "done".)
2. **Preserve outputs first.** Everything the work *produced* (ranked candidates, contact sheets, `result.json`,
   attribution records, finished card artwork) is copied to a private archive: a `git bundle` of the branch plus
   an export of `evidence/photo-batches/**` and the finished cards, stored privately and verified by hash (the same
   `git hash-object` method as the manifest). Nothing is deleted from the branch in this step.
3. **Decide the branch's future.** It is unrelated history. Either (a) its card outputs are brought into the app
   repository as ordinary files (a normal PR, Tier 0, owner-approved), or (b) it becomes a separate private repository
   for the card pipeline. This is a product and architecture decision, not a cleanup detail.
4. **Rewrite or retire.** Only after 2 and 3: filter the personal photo folder and evidence binaries out of it, or
   leave it entirely in a private repository where public exposure no longer applies.
5. **Re-point the session** that queues work, and re-run one card end to end before retiring the old refs.

Why this order: the history is the only complete record of how each batch was produced, and several workflows
`git add` straight into it. Rewriting first would orphan in-flight runs; preserving first costs only disk.

## Routes (unchanged, restated with the corrected facts)
| | Route 1: rewrite in place, then ask GitHub Support to purge | Route 2: new repository from cleaned history |
|---|---|---|
| Completeness | Not complete until Support removes the hidden PR refs and caches | Complete: the old objects are not in the new repository |
| What it keeps | Pages, domain, environments, secrets, rulesets, issues, PR text | Nothing automatically |
| What it loses | Open clones and every commit id | PR history, issue history, run history; **0 forks and 0 stars, so none of the usual losses** |
| Cost now | Medium, dependent on a third party | Higher setup (domain, Pages, environments, rulesets, secrets, redirect allow-list), one-off |
| Reversibility | Private mirror restores it | Old repository stays private until you delete it |

With no forks, no stars and no open PRs, **Route 2 is cheaper than I first said** and is the only route that does
not rely on GitHub Support. Wave 0 and the protections are all in version control, so re-creating them is a checklist.
My recommendation is Route 2, done **after** the freeze point above and after the protections are verified here once
(so the new repository is built from a design that is already proven). Going private on the current repository is
**not** an option: on a free plan a private repository loses rulesets and Pages.

## The private backup
The owner's mirror (`git clone --mirror`) is the real backup, kept on private storage. The zip of the 48 photographs
sent in this conversation is a convenience copy, not placed anywhere public. **No backup is stored in the repository,
on any branch or tag, or in any workflow artifact.**

## GATES (decisions needed from the owner, later)
1. The freeze point for the card-production line (and who declares it).
2. Where card-production outputs live permanently (app repository, private card repository, or the asset bucket).
3. Route 1 or Route 2.
4. A quiet window with no card runs and no agent lanes.
5. Whether the evidence photographs are to be removed from history, or only the personal photographs and metadata.
