# Asset audit: the iCloud photo folder and `evidence/`

Read-only audit, 2026-11-19. **Nothing was deleted, untracked or rewritten.** Every action below is a
proposal that needs the owner's approval, and every one starts with a backup.

**The repository is public**, so everything tracked (and everything ever tracked) can be downloaded by
anyone. That is the reason this audit is urgent and the reason the folders are already denied to every
agent in `agents/ownership.json` (Tier 0).

## 1. The iCloud photo folder (48 files, 55 MB)

| Question | Finding |
|---|---|
| What is it? | 48 camera originals from one phone model, all taken within about 8 minutes on 2026-09-30. 24 are named `<n>plantimage<m>`, 24 are `IMG_02xx`. |
| Personal? | The **folder name is a personal name** (an iCloud export label), and the files are unprocessed camera originals. |
| Location data? | **No GPS block in any of the 48** (checked in the EXIF of every file). Other metadata (camera model, timestamps) is present. I did **not** look at the images; whether any show a person, a home or a plate number is for the owner to judge. |
| Used by PlantDex? | **No.** Nothing in code, scripts, docs or workflows references the folder. |
| Relation to the app's data | 24 of the 48 files are byte-identical to files elsewhere in the repository (the phone-collected `field/` set that the test workflows use). The other 24 have no copy. |
| Added when? | One commit (`bce9aa9`, 2026-11-12). It is therefore in history permanently unless history is rewritten. |

**Recommendation.** Treat as personal and not required by the app. Because 24 files already exist in
`field/`, only the extra originals are unique; the owner should confirm they have their own copy of those
before anything is removed.

## 2. `evidence/` (1,023 tracked files, about 1.3 GB, which is nearly the entire 1.28 GiB repository)

| Subdirectory | Files | Size | What it is | Needed at runtime? |
|---|---|---|---|---|
| `photos/` | 722 | 1.2 GB | Third-party photographs (iNaturalist-sourced) for 5 species, retrieved by workflows for candidate selection | No. The app never reads it. |
| `candidates/` | 124 | 77 MB | Review candidates and previews derived from `photos/` | No |
| `segmentation/` | 63 | 41 MB | Background-removal experiment output | No |
| `cards/` | 42 | 4.4 MB | Generated card drafts | No |
| `briefs/`, `drafts/`, `retrieved/`, `boss-form-photos/` | ~63 | under 1 MB | Text/JSON: briefs, retrieval records, decisions | No (they feed scripts) |
| top-level `*.json`, `*.txt`, `METRICS.md` | 9 | small | Species lists, audits, human decisions, art direction | Read by scripts and workflows |

No source file under `src/` reads `evidence/`; only Python scripts and five workflows do. The scripts show
that the intended home for the photo binaries is an external asset store (Cloudflare R2 or Dropbox, see
`docs/pipeline-2k.md`), with only text committed. Today the binaries are in git instead.

Open question for the owner: **licensing**. These are other people's photographs republished through a
public repository. `evidence/cc0-audit.json` suggests a licence audit exists; I did not evaluate it.

## 3. `field/` and `field-inat/` (35 JPEGs plus CSV/JSON)

Used by `field-run.yml` and the identification benchmark. Needed. Sampled files carry no GPS. Left alone.

## 4. Git history

- Searched all branches for key files (`.env`, `.pem`, private keys, service-account JSON): **none ever added**
  (only workflow and script files whose *names* contain "secret").
- Searched added lines for token-shaped strings (Supabase, Stripe, GitHub, AWS and private-key formats):
  **none found** (JSON data files and the lockfile excluded). The Supabase anon key is public by design.
- **Commit metadata is public**: author names, personal e-mail addresses and a local computer name appear in
  the history. That is separate from file content and is also fixed only by rewriting history.
- The photo folder and `evidence/photos` exist in history regardless of what the branch tip tracks.

## 5. Proposed plan (each step waits for approval)

| Step | Action | Reversible? | Needs approval |
|---|---|---|---|
| A | Owner confirms they hold their own copies of the 24 unique originals. A backup of everything exists today at `backup/pre-multi-agent-20261119`. | n/a | owner action |
| B | **Stop tracking** the photo folder (`git rm -r --cached`), add it to `.gitignore`. Files stay on every existing checkout's disk; fresh clones simply do not get them. History is unchanged. | Yes (one revert) | **Yes** |
| C | **Stop tracking `evidence/photos/`, `candidates/`, `segmentation/`** once the binaries are confirmed to exist in the asset store (or the owner decides they are disposable), keeping every JSON/text file. The retrieval workflows `git add` the photos, so they need a matching edit. | Yes | **Yes** |
| D | Decide whether to **purge history** (`git filter-repo`, force-push, delete the backup/rollback branches that contain the files, ask GitHub support to drop cached views). This is the only step that actually removes the files from the public record. It rewrites every commit hash, breaks open PRs and every clone, and cannot be undone once forks and caches exist. | **No** | **Yes, separately and explicitly** |
| E | If purging, choose the order: back up privately first, rewrite once, rotate nothing (no secrets found), then reset clones. | n/a | with D |

Steps B and C alone fix "agents can see it" and shrink every clone and worktree. They do **not** fix "the
public can download it", because history still has it; only D does, and D is the owner's call.

## 6. What is already done

- Both directories (and `field/`, `field-inat/`, `product-source/`, the card art) are **Tier 0 in
  `agents/ownership.json`**: no agent role may edit them, and `src/lib/ownership.test.ts` pins that.
- Worktrees and cloud sessions for agents should use a sparse checkout that omits them
  (`agents/README.md`). Until step B or C lands this keeps personal photographs out of agent working
  directories without changing the repository.
