# RTK check (this session's environment)

Diagnostic only. Date 2026-11-25. Branch `coord/rtk-check-region`.

## (1) Binary
- `which rtk` -> `/root/.local/bin/rtk`; `rtk --version` -> `rtk 1.2.1` (15.7M, mode 755).
- `~/.local/bin` also holds uv/uvx, ruff, black, flake8, pyright, poetry, conan etc.

## (2) Config
- `~/.claude/RTK.md` exists (453B). `~/.claude/CLAUDE.md` exists and contains `@RTK.md`.
- `~/.claude/settings.json` hooks: `PreToolUse` / matcher `Bash` / command `rtk hook claude`.
- Verdicts: BINARY installed = YES. BASH HOOK configured = YES. HOOK ACTIVE for my Bash calls = YES (partly).
  `rtk gain` after `git log --oneline -3`, `git status`, `ls docs`, `ls -la` and a file read: 6 commands, 763 tokens saved (55.7%),
  per-command rows `rtk ls docs` (577 saved), `rtk ls -la ...`, `rtk git status`, `rtk git log --oneline -3`, `rtk read`.
  So `ls`, `git`, `cat` are rewritten. Later calls to `node`, `npx`, `npm` were NOT rewritten: count only rose 6 -> 8
  (the extra ones being `ls /nonexistent` and one more ls/rtk call), savings stayed at 763.
  Hook is active but only rewrites commands RTK has a filter for.

## (3) Setup outcome
- Install succeeded (binary present). `rtk init -g --auto-patch` evidently succeeded: hook in settings.json, RTK.md present and included.
  Data exists in `~/.local/share/rtk` (history.db, recall.db) and `~/.config/rtk/filters.toml`.
- Reachability: `curl -sS -m 10 -o /dev/null -w '%{http_code}'`
  - https://raw.githubusercontent.com -> `301`
  - https://github.com -> `400`
  - No `[agent-proxy]` lines appeared. Both hosts reached (non-200 codes are bare-root responses, not blocks).

## (4) Unaffected behaviour
- `ls /nonexistent; echo exit=$?` -> `ls: cannot access '/nonexistent': No such file or directory` then `exit=2`. Unchanged.
- `node scripts/agent-guard.mjs diff --role coordinator` -> `agent-guard: role 'coordinator' changed only files it may change.` exit 0.
- node_modules was missing; ran `npm ci` (430 packages, exit 0). `npx vitest run src/lib/ownership.test.ts`:
  1 file passed, 89 tests passed, exit 0.
  (Before `npm ci`, npx fetched a mismatched vitest 5.1.2 and failed with `Cannot find module 'vitest/config'` - environmental, not RTK.)
- Deliberate failing test (scratch dir, outside repo): full assertion message, expected/received diff, source frame and
  `Tests 1 failed` all came through; exit code 1. Unchanged.

## (5) Condensed output I needed in full
Nothing material. `rtk ls` condensed listings (e.g. file modes shown as `777`/`755` with sizes) but I lost nothing needed.
