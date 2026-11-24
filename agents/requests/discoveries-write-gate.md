# Shared Change Request: discoveries write gate (Stage 4) - DRAFT STUB, NOT FOR ACTION

- From lane: discoveries      Task: agents/ledger/discoveries/trust-design.md
- Needs: contract | migration | **owner approval**
- **To: coordinator. Stage 4 only. NOT AUTHORISED. D0-D7 (2026-11-24) do NOT approve enforcement; do not action until the owner approves Stage 4 in writing against the preconditions in `docs/discovery-trust-design.md` section 15.** A stub that names the surface, not a design. Nothing here is built, flagged or scheduled.

## Why
The owner's decision: earning a NEW collectible card should eventually require an eligible scan. Every system that matters
(XP, levels, Field Cards, garden, achievements, board) reads `discoveries`, and `discoveries` is written directly by the
client under RLS, so the only place the rule can be made true for all of them is the write (design section 4.3, layer L3).
Client-only enforcement is not enforcement: a signed-in player can insert the row with their own JWT.

## Exact proposal
**None is specified.** The surface that would be touched, so the owner can see its size before deciding:
- `discoveries` insert policy (the 0013 precedent for `mastered`), a server writer, a backstop trigger, a server-stamped
  `recorded_at` (and the stored one-way `cutover_at`), `remote-herbdex-storage.ts`, `herbdex-reducer.ts`/`HerbdexProvider`
  call sites, `import-local-progress`, the Seed Shelf claim, the board SQL, `/privacy`, `CLAUDE.md`.
- The `recorded_at` stamp alone is additive and may be split out and shipped EARLY (it is the only part that cannot be
  added retroactively for rows inserted after the rule is public): all existing rows are stamped with the migration's own time.

## Decisions it needs from the owner (design section 13)
Measurements acceptable (M1, M2, M4, M5, panel); which paths are gated; the cutover moment (set before any announcement);
D4 signed-out; D5 grandfathering and the import window; **D6 is decided: camera scan mandatory for NEW cards with NO camera-free alternative, so the camera experience readiness (accessibility, compatibility, the D1 pilot) is itself a precondition**; D7 copy and `/privacy`.

## Who else depends on it
Every consumer of `discoveries`. That breadth is the reason it is owner-gated.

## Risk and rollback
Highest in this design: it is the first change that stops a player doing something. Rollback is a flag flip while the
policy remains the old one; a dropped client policy is restored by migration. No row is revoked; `cutover_at` can only move earlier.

## Does this need the owner? (coordinator fills in)
**Yes. Production-affecting, architectural, and safety/trust-sensitive.**
