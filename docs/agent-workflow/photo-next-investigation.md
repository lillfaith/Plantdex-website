# Investigation: the "photo-next" automation (2026-11-19)

**Verdict: intended card-production work, currently idle, no runaway loop, no secrets, no billed Actions
minutes. Nothing was disabled, cancelled or modified.** It does have one real side effect on the new
multi-agent system (runner contention), with a cheap mitigation below.

## What creates the pushes
- The pushes are the owner's own card-production session (titled "RTK check 2", pinned, on the
  `claude/production-system-v1` branch). It reports "33 of 85 cards finished". It is idle now and made its
  last update at about 21:34 UTC. Its recorded model spend is about $114 across three days of card work;
  that is the session's cost, not the workflow's.
- It queues work by committing `evidence/photo-batches/next/request.json` with `{"card": N}`. Each such push
  triggers `photo-next.yml` once. A burst of "Queue photo search for #N" commits roughly a minute apart is
  that session queueing cards, one commit per card. The commit that finishes a run is made by `github-actions`.
- Pushes are restricted to the one branch and one path, so a bot commit that changes other files cannot
  re-trigger it. There is no self-triggering loop: the finishing commits are made with the built-in
  `GITHUB_TOKEN`, which GitHub does not use to start further workflow runs.

## What a run is
One card: a pool job, 12 parallel shards (each allowed up to 5 hours), then a report job that commits the ranked
candidates and contact sheets to the branch. Usage record for run #110 (card 141): 14 jobs, 7,586 s wall clock,
**0 billable minutes** (public repository, standard runners).

## Did runs overlap, queue or cancel each other?
Yes, and that is the one real problem.
- No `concurrency:` group, so every push starts a run immediately. Between 09:47 and 17:10 UTC today, 30 runs
  (#81 to #110) were started, up to seven at once, each wanting 12 shard jobs: far more than the roughly 20
  concurrent jobs a free account gets. The excess queues.
- The first burst (#81 to #92) took about seven hours to finish; eight runs (#93 to #100) were **cancelled**
  after about seven hours (someone, or the session, cancelled them) and re-queued as #104 to #110, which finished
  between 18:45 and 19:16; one run failed (#83, card 124) and was re-queued as #103. Every card now has a
  successful run.
- All 14-job runs are complete. Nothing is in progress or queued at the time of writing.

## Cost
| Item | Finding |
|---|---|
| GitHub Actions minutes | 0 billable (public repository, standard runners). Not a cost, but a shared capacity limit. |
| Paid APIs | None. The workflow references no repository secret and no API key; it fetches openly licensed photographs. |
| Model spend | None from the workflow itself. The queueing session has its own usage. |
| Repository growth | Each run commits `result.json` and contact-sheet JPEGs to the branch. Not measured here; it adds binaries to that branch's history. |
| Third-party rate limits | Not measured. 12 shards x several runs hitting a public photo source could be throttled. |

## Are production secrets exposed?
No. `photo-next.yml` has no `secrets.*` reference. It does have `contents: write`, so it can push to the branch
it runs on. Its sibling card-pipeline workflows on that branch (about 30 of them, `pipeline-v*`, `photo-*`,
`production-batch` and similar, all push-triggered) likewise reference **no secrets**. See `secrets-audit.md`.

## Interference with the multi-agent system
1. **Runner contention (real).** A pull-request check from an agent lane queues behind card-production shards when
   a burst is in flight. Today's pilot ran after the bursts finished, so it did not see this.
2. **Branch scope (fine).** It lives on `claude/production-system-v1`, which is not production, not `integration`,
   and not an agent branch. Nothing in the ownership manifest or rulesets touches it.
3. **Future merge (plan for it).** That branch holds the real card-production line (60 workflows, evidence
   batches). When it merges back it will be a large Tier 0 change; it will need the owner, and it interacts with
   the evidence untracking in `history-cleanup-proposal.md`.

## Recommendation (no action taken)
- **Do not disable it.** It is intended, idle and secret-free.
- Queue **at most about three cards at a time** while agent lanes are active (3 x 14 jobs stays under the
  concurrency cap). That alone prevents the starvation. No code change needed.
- Optionally add `concurrency: { group: photo-next-${{ github.event.inputs.card || github.sha }}, cancel-in-progress: false }`
  so a duplicate push for the same card does not run twice. This is a workflow edit on a branch the owner
  controls and is left for the owner.
- If it ever must be paused: the safe pause is the *Actions* tab's "Disable workflow" on `photo-next.yml`. That
  stops new runs and loses nothing: finished outputs are already committed, and in-flight runs complete or can be
  cancelled individually.
