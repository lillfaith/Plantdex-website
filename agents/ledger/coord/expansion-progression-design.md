# Task: expansion progression inheritance (design, no activation)

Lane: coordinator. Branch: `coord/expansion-progression-design`. Status: **owner decisions 1-6 and TEST-only approval of migration 0015 received 2026-11-26 and applied; see `docs/expansion/progression-inheritance.md` ("Decided").**

Scope kept: no `src/` logic, reducer, progression, mastery or research code, no UI, no workflow, no `next.config.ts`, no generated data, no
flag, no database. Added: `docs/expansion/progression-inheritance.md`, `scripts/expansion-audit/progression_numbers.py` (read-only),
`supabase/migrations/0015_expansion_catalogue_ids.sql` (reviewed; approved for the TEST project only, NOT applied by this branch; production not authorised), `src/lib/expansion-ids-schema.test.ts`, `src/lib/expansion-gate.test.ts`, the rollback, `migration-0015-test-apply.md`,
verification SQL and test plan under `docs/agent-workflow/`, and `agents/requests/coord-expansion-progression-ui.md`.

Done means: `npm run verify` exit code recorded in the PR; remaining open items (D6, D8, D9, R1 release gate, R2 expansion research) answered before any implementation task is cut.
