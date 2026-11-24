<!-- PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW -->
# Task: Region membership research, 45 original cards

- Lane / role: coordinator
- Branch: `coord/region-membership-research` (from `integration`)
- Priority: A
- Token/time budget: one session

## Goal
Evidence, then proposed region membership, for the 45 original cards. Proposals only; nothing imported.

## Acceptance criteria
- [x] `docs/regions/membership/evidence-45.csv` and `evidence-summary.md` written (Phase 1)
- [ ] `proposed-membership-45.csv`, `method.md` (Phase 2): **blocked, boundaries branch does not exist**
- [ ] Full Georgia validation: needs Phase 2; Phase-1 cross-check done

## Authorised paths
`docs/regions/membership/**`, `scripts/regions/membership/**`, `agents/ledger/coordinator/**`

## Prohibited
Everything else (src, supabase, public, .github, package files, region-species.ts, herbs.json, legal pages, card text).

## Real command output
```
curl -o /dev/null -w '%{http_code} %{redirect_url}' https://powo.science.kew.org/ -> 403 
curl -o /dev/null -w '%{http_code} %{redirect_url}' https://efloras.org/ -> 403 
curl -o /dev/null -w '%{http_code} %{redirect_url}' https://plants.usda.gov/ -> 301 https://plants.sc.egov.usda.gov:443/
git ls-remote --heads origin coord/region-boundaries-research | wc -l -> 0
```

`node scripts/agent-guard.mjs diff --role coordinator --base origin/integration` ->
```
agent-guard: role 'coordinator' changed only files it may change.
```

Status: review (Phase 1 complete; Phase 2 blocked on the missing boundaries branch). `npm run verify` not run: no src/ or package change.
