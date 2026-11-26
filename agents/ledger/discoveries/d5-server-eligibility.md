# Task: d5 server-authoritative camera eligibility (inert, behind a database switch)

- Lane / role: discoveries
- Branch: `agent/discoveries/d5-server-eligibility` (from `integration`)
- Priority: A
- Status: in-progress

## Goal
Owner decision (final, 2026-11-26): V1 requires an eligible in-app camera capture to earn a NEW collectible card.
Imported photos, manual entries and self-reported sightings never unlock a new card; existing collections are grandfathered.
Server-authoritative; a disabled frontend flag is not authorisation. Nothing is enabled by this branch.

## Deliverables
1. `docs/discoveries/discovery-receipt-contract.md` (first push; the Scan lane consumes it).
2. Draft migration 0016 (TEST only) + rollback + self-rolling-back SQL verification, delivered under
   `docs/discoveries/sql/` because `supabase/**` is coordinator-owned; the SCR asks for placement.
3. Anti-cheat measures and measurements: `docs/discoveries/d5-anti-cheat-and-measurements.md`.
4. Tests (unit + SQL run against a real Postgres).
5. Shared Change Request `agents/requests/discoveries-d5-server-eligibility.md`.

## Authorised paths
`docs/discoveries/**`, `agents/requests/**`, `agents/ledger/**`, `src/lib/observation-*`.

## Prohibited
Everything coordinator-owned (progression, reducer, `supabase/**`, `next.config.ts`, `docs/agent-workflow/**`).
Do not alter 0014 or 0015. Never enable enforcement. No production, no workflow dispatch, no credentials.
