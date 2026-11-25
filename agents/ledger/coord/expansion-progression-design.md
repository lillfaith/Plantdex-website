# Task: expansion progression inheritance (design, no activation)

Lane: coordinator. Branch: `coord/expansion-progression-design`. Status: **design delivered for owner review.**

Scope kept: no `src/` logic, reducer, progression, mastery or research code, no UI, no workflow, no `next.config.ts`, no generated data, no
flag, no database. Added: `docs/expansion/progression-inheritance.md`, `scripts/expansion-audit/progression_numbers.py` (read-only),
`supabase/migrations/0015_expansion_catalogue_ids.sql` (DRAFT, not applied), `src/lib/expansion-ids-schema.test.ts`, the rollback,
verification SQL and test plan under `docs/agent-workflow/`, and `agents/requests/coord-expansion-progression-ui.md`.

Done means: `npm run verify` exit code recorded in the PR; owner decisions D1-D9 answered before any implementation task is cut.
