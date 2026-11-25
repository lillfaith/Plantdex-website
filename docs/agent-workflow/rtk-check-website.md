# RTK check (website session)

Diagnostic only; no settings, proxy or network config changed.

## 1. Binary
- `which rtk` -> `/root/.local/bin/rtk`; `rtk --version` -> `rtk 1.2.1` (15.7M, mode 755)
- `~/.local/bin` also holds uv tools (black, ruff, pyright, poetry, flake8), uv, uvx.
- **Verdict: binary INSTALLED.**

## 2. Hook / include / activity
- `~/.claude/RTK.md` exists (453B); `~/.claude/CLAUDE.md` contains `@RTK.md`.
- `~/.claude/settings.json` hooks: `PreToolUse` / matcher `Bash` / command `rtk hook claude`.
- **Verdict: hook CONFIGURED. ACTIVE** for my Bash calls: `rtk gain` went 4 -> 7 -> 13 commands
  while I ran `ls`, `git log`, `git status`, `ls docs` etc. (`rtk ls docs`, `rtk git status`,
  `rtk git log --oneline -3` appear in the per-command table). Savings 53.2% -> 57.2% -> 56.6%
  (1.0K tokens saved of 1.8K input at the last reading).
- Note: the session started on branch `integration`; I created `coord/rtk-check-website` before committing.

## 3. Setup script outcome
- Install succeeded: rtk binary present, `~/.local/share/rtk` has filters.toml, history.db, recall.db;
  hook present in settings.json, i.e. `rtk init -g --auto-patch` evidently succeeded (setup log not inspected).
- Reachability: `raw.githubusercontent.com` -> 301; `github.com` -> 400. No `[agent-proxy]` lines printed.
  Neither host was reported blocked (a 400 from the bare github.com root is not a proxy refusal message).

## 4. Unaffected behaviour through the hook
- `ls /nonexistent; echo exit=$?` -> `/usr/bin/ls: cannot access '/nonexistent': No such file or directory` and `exit=2`. Unchanged.
- `node scripts/agent-guard.mjs diff --role coordinator` -> `agent-guard: role 'coordinator' changed only files it may change.` exit 0.
- node_modules was missing; `npm ci` succeeded (exit 0).
- `npx vitest run src/lib/ownership.test.ts` -> 1 file, **89 passed (89)**, exit 0.
- Scratch failing test (outside repo): full diff output (Expected/Received, source line with caret), "1 failed", **exit 1**. Full message preserved.

## 5. Condensed output I needed in full
- Nothing material. `ls -la` was reformatted (octal-style mode, no owner/date) and some `~/.local/share/rtk`
  entries were hidden ("... (2 filtered)", with a recovery hint `rtk recall ...`); not needed.
- `git status` came back as a one-liner ("clean - nothing to commit").
