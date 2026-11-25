# RTK check (botanical session) — 2026-11-25

Diagnostic only. Branch: `coord/rtk-check-botanical` (session started on `integration`; branch created before any commit).

## Verdicts
| Item | Verdict |
|---|---|
| Binary installed | YES — `/root/.local/bin/rtk`, `rtk 1.2.1`, 15.7M |
| Bash hook configured | YES — `~/.claude/settings.json` has `PreToolUse` / matcher `Bash` / `rtk hook claude` |
| `~/.claude/RTK.md` + `@RTK.md` include | YES — RTK.md (453B, mode 600) exists; `~/.claude/CLAUDE.md` contains `@RTK.md` |
| Hook ACTIVE for my Bash calls | PARTIALLY — simple `ls` / `git log` / `git status` calls were rewritten (`rtk ls docs`, `rtk git status`, `rtk git log --oneline -3`, `rtk ls -la ...`). Compound commands (`;`, `&&`, loops), `curl`, `node`, `npm`, `npx vitest` were NOT rewritten: after ~10 further commands `rtk gain` rose only 6 -> 7. |

## (1) Binary
- `which rtk` -> `/root/.local/bin/rtk`; `rtk --version` -> `rtk 1.2.1`
- `~/.local/bin` also holds uv tools (black, ruff, pyright, ...), `uv`, `uvx`; `~/.config/rtk/filters.toml` and `~/.local/share/rtk/{history.db,recall.db}` exist (install artefacts).

## (2) Hook / gain
- Hooks section: `{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"rtk hook claude"}]}]}`
- `git log --oneline -3`: 441c3f0 / 251c575 / 6b7c19c (messages truncated by RTK with `...`)
- `git status`: printed `* integration...origin/integration` + `clean — nothing to commit` (condensed form)
- `ls docs | head`: printed entries with trailing `/` for dirs (rtk ls format)
- `rtk gain` #1: 6 commands, 1.4K in / 599 out, 756 saved (55.8%). Entries: rtk ls docs (577 saved), rtk ls -la ~/.local/bin (156), rtk git status (13), rtk ls -la ~/.claude (8), rtk git log (2), rtk read (0).
- `rtk gain` #2 (after curl loop, node guard, npm ci, vitest x2, branch checkout): 7 commands, 608 out, 761 saved (55.6%). Count rises only for commands the hook rewrote.

## (3) Setup script outcome
Install succeeded (binary, config, history DBs present, hook and RTK.md present, `rtk init -g --auto-patch` evidently applied: settings.json hook + CLAUDE.md `@RTK.md`). No silent failure found.
Reachability (no `[agent-proxy]` lines appeared):
- `https://raw.githubusercontent.com` -> 301
- `https://github.com` -> 400
(Both reachable via proxy; non-200 is the bare-root response, not a block.)

## (4) Unaffected behaviour
- `ls /nonexistent; echo exit=$?` -> `ls: cannot access '/nonexistent': No such file or directory` / `exit=2` — unchanged.
- `node scripts/agent-guard.mjs diff --role coordinator` -> `agent-guard: role 'coordinator' changed only files it may change.` exit 0.
- node_modules was missing; `npm ci` ran (exit 0).
- `npx vitest run src/lib/ownership.test.ts` -> 1 file passed, 89/89 tests passed, exit 0.
- Deliberate failure (scratch test outside repo): reported `× deliberate`, `AssertionError: expected { a: 1, b: 'x' } to deeply equal { a: 2, b: 'y' }`, full diff, source frame, `Tests 1 failed`, exit 1 — full message and non-zero exit preserved. (Those commands were not rewritten by the hook, so this shows they pass through unmodified, not that RTK filtering preserves failures.)

## (5) Condensed output I needed in full
Nothing material. Minor: `git log` subjects truncated with `...`; `git status` showed a one-line summary. Neither blocked the task. Note the ownership/guard checks ran uncompressed, so RTK's effect on failing test output is untested here.
