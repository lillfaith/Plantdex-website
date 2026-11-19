# Proposal: privacy-focused history cleanup (FOR REVIEW; nothing here has been done)

**Do not act on this document. It is a proposal that needs the owner's explicit approval.** Removing files
from the current branch (`untrack-private-assets`, prepared separately) does **not** remove the historical copies.
On a public repository anything ever pushed stays downloadable until history is purged and the hosting side is
cleaned.

## What is in history that you may want gone
| Item | Where | Size | Notes |
|---|---|---|---|
| The iCloud photo folder (48 camera originals; folder name is a personal name) | one commit, `bce9aa9`, 2026-11-12 | 55 MB | In: production branch, `integration`, `claude/plantdex-v0-3-supabase-verify-iic8pz`, the backup branch and my coordinator branches. **Not** in the other 10 branches. No GPS in the files (checked), but timestamps and camera model are. |
| `evidence/photos`, `candidates`, `segmentation` binaries | first added 2026-11-04/05 on the catalog branch lineage; also on the card-production branch | ~1.2 GB (the bulk of the 1.28 GiB repository) | Third-party photographs; licence audit not reviewed |
| Commit metadata | every commit | n/a | Author names, personal e-mail addresses and a local computer name appear in the history. Fixed only by a rewrite that also rewrites authorship (a mailmap). |
| Secrets | none found | n/a | No key file, no token-shaped string in any added line (JSON data and the lockfile excluded). No rotation is needed *because of history*. |

## What a rewrite touches
- **Branches (18):** the photo folder is in 8 of them (list above). The evidence binaries are on more, including
  `claude/production-system-v1`, where the card pipeline commits into `evidence/` continuously.
- **Commit hashes:** every commit after the first removed file gets a new hash, on every branch that carries it.
  All open work and every clone must be re-cloned or hard-reset.
- **Pull requests (29):** merged PRs keep their text but point at commits that no longer exist. GitHub also keeps
  the **old commits reachable through hidden `refs/pull/*` refs**, so a force-push alone does **not** make the
  files unreachable on GitHub.
- **Backups:** `backup/pre-multi-agent-20261119`, `backup/pre-profile-redesign` and my branches contain the
  files; they must be deleted or rewritten too, or the rewrite achieves nothing.
- **Forks, clones, caches:** if anyone forked or cloned, those copies remain. GitHub's cached views and the
  Actions logs/artifacts are separate. Search engines may hold copies. None of that is under our control.
- **The deployed site** is unaffected (it ships only `public/`), but note `public/` is not touched.

## Two routes

### Route 1: rewrite in place, then ask GitHub to purge
1. Take a private full mirror (`git clone --mirror`) and store it offline. This is the rollback.
2. In a fresh clone, run `git filter-repo` removing the photo folder and the evidence binary paths (keep
   `evidence/**/*.json|txt|md|html` and anything the pipeline reads), plus a mailmap for authorship.
3. Force-push every rewritten branch; delete the backup branches.
4. Contact GitHub Support and ask them to remove cached views and **garbage-collect the unreachable objects and
   hidden PR refs**. Only they can; without it the old commits stay fetchable by hash.
5. Everyone (including each agent session) re-clones. Re-protect branches afterwards.

| Pros | Cons |
|---|---|
| Keeps the repository, Pages, domain, environments, secrets, issues | Not complete until Support acts; the old objects remain reachable meanwhile |
| Keeps PR text | Breaks every open branch, every clone, and the card-production line's history if it is included |
| Smaller clone afterwards | Needs a quiet window; has to be rehearsed on a throwaway copy first |

### Route 2: start a clean repository from the cleaned tip (the only complete removal)
1. Build the cleaned history (steps 1-2 above) in a **new** repository; leave the old one private, then delete it
   after a cooling-off period.
2. Re-create Pages and the custom domain, environments, secrets, rulesets, variables and the Supabase redirect
   allow-list entries, and update the repository name wherever it is written (for example `check-live-site`'s
   default URL, the base path for the github.io fallback).

| Pros | Cons |
|---|---|
| Nothing old stays reachable on the new repository | Loses PR history, issues, stars, Actions history, run numbers |
| No dependency on Support | The whole setup (including everything built in Wave 0) is re-created; a full production re-verification |
| Natural moment to also move the card-production line | Longer outage risk on the custom domain if done carelessly |

**Recommendation:** Route 1 *if* the photo folder is the only thing that must disappear, because Route 2 costs
far more than the exposure justifies; **Route 2** if the owner wants the evidence photographs and the commit
metadata gone too and wants certainty. Either way: make the private mirror first, decide what `evidence/` should
be (text only in this repository, binaries in the asset store the pipeline already supports), and rehearse on a
copy.

## Rollback
The private mirror from step 1 restores every ref exactly (`git push --mirror` to an empty repository). Keep it
until the new state has been verified for at least a week.

## Decisions needed from the owner
1. Is the iCloud folder the only privacy concern, or also the evidence photographs and the commit metadata?
2. Route 1 or Route 2?
3. Does the card-production branch (`claude/production-system-v1`) stay in this repository? It is the largest
   carrier of `evidence/` and is still being written to every day.
4. Who holds the private mirror (it contains everything, including the files you want removed).
5. A date and a quiet window: no card-pipeline runs, no agent lanes active.
