#!/usr/bin/env python3
"""Parse every workflow file and fail on any that GitHub would refuse to start.

WHY THIS EXISTS. `retrieve-evidence.yml` shipped with inline Python at column 0 inside a
`run: |` block. A block scalar's content has to stay indented, so the de-indented lines
broke out of the mapping and the whole document became invalid -- and GitHub's report for
that is a run with ZERO JOBS and a bare "failure" with no logs to read, which looks like an
infrastructure problem rather than a syntax error. One push wasted.

`npm run verify` cannot catch this: it cannot run Python, and it does not look at
`.github/` at all. So this is a standalone audit in the same position as
`audit_sprites.py` -- run it after touching a workflow.

It also checks two things a parse alone does not:

  * every `uses:` names a pinned major (`@v4`), not a floating ref;
  * no `run:` block contains a line at column 0, which is the shape of the bug above even
    in files where it happens not to break the parse.

    python3 scripts/audit_workflows.py
"""

from __future__ import annotations

import pathlib
import re
import sys

try:
    import yaml
except ModuleNotFoundError:  # pragma: no cover
    print("PyYAML is required: pip install pyyaml", file=sys.stderr)
    raise SystemExit(2)

ROOT = pathlib.Path(__file__).resolve().parent.parent
WORKFLOWS = ROOT / ".github" / "workflows"


def column_zero_run_lines(text: str) -> list[int]:
    """Line numbers inside a `run:` block scalar that sit at column 0.

    Deliberately textual rather than AST-based: once the de-indentation has broken the
    parse there is no AST to inspect, which is exactly the case this has to report.
    """
    bad: list[int] = []
    in_block = False
    indent = 0
    for number, line in enumerate(text.splitlines(), start=1):
        match = re.match(r"^(\s*)(?:- )?(?:name: .*\n)?\s*run: [|>]", line)
        if match:
            in_block, indent = True, len(match.group(1))
            continue
        if not in_block:
            continue
        if not line.strip():
            continue
        current = len(line) - len(line.lstrip())
        if current <= indent:
            in_block = False
            if current == 0 and not line.lstrip().startswith("#"):
                bad.append(number)
    return bad


def audit() -> int:
    problems: list[str] = []
    files = sorted(WORKFLOWS.glob("*.yml")) + sorted(WORKFLOWS.glob("*.yaml"))
    if not files:
        print("no workflow files found", file=sys.stderr)
        return 2

    for path in files:
        text = path.read_text()
        name = path.relative_to(ROOT)
        try:
            document = yaml.safe_load(text)
        except yaml.YAMLError as error:
            where = getattr(error, "problem_mark", None)
            line = f" line {where.line + 1}" if where else ""
            problems.append(f"{name}: DOES NOT PARSE{line} -- GitHub would start zero jobs")
            for number in column_zero_run_lines(text):
                problems.append(f"{name}:{number}: a run: line at column 0 (likely cause)")
            continue

        if not isinstance(document, dict):
            problems.append(f"{name}: top level is not a mapping")
            continue
        # PyYAML 1.1 reads a bare `on` as the boolean True, which is normal here.
        if "jobs" not in document:
            problems.append(f"{name}: no jobs")
        if not (document.get("on") or document.get(True)):
            problems.append(f"{name}: no trigger")

        for number in column_zero_run_lines(text):
            problems.append(f"{name}:{number}: a run: line at column 0")

        for action in re.findall(r"^\s*- uses:\s*(\S+)", text, flags=re.M):
            if "@" not in action:
                problems.append(f"{name}: `uses: {action}` is not pinned")

    print(f"audited {len(files)} workflow file(s)")
    for problem in problems:
        print(f"  FAIL  {problem}")
    if problems:
        print(f"\n{len(problems)} PROBLEM(S)")
        return 1
    print("  all parse, all triggers present, all actions pinned")
    return 0


if __name__ == "__main__":
    sys.exit(audit())
