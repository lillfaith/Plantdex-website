#!/usr/bin/env python3
"""Audit the benchmark's CI workflows for secret exposure and project scoping.

WHY IT IS A SCRIPT AND NOT A CAREFUL READ. Both properties it checks are ones a reviewer
confirms once and a later edit quietly breaks: a dispatch input added for convenience, a
`jq` put back into a sign-in response, a project ref parameterised "just for testing". The
first version of `comparison-account.yml` took a password as a dispatch input and SAID SO in
its own description, and that survived review because the description read like a warning
rather than a finding.

WHAT IT CANNOT DO. It reads YAML and shell text; it cannot prove a script three files away
does not print a token. It catches the shapes that have actually gone wrong here, and the
scripts those workflows call are small enough to read — which is why they are small.

Usage:  python3 scripts/audit_pilot_workflows.py
"""

from __future__ import annotations

import re
import sys

import yaml

TEST_REF = "vgjehmwcpavflbfhbbrp"
PRODUCTION_REF = "vygiamigomwlvnwkryyl"

WORKFLOWS = [
    ".github/workflows/comparison-account.yml",
    ".github/workflows/test-identification-config.yml",
    ".github/workflows/identification-pilot.yml",
]

# Secrets that must never be echoed, and the expressions that would echo one.
SECRET_NAMES = ["TEST_ACCOUNT_PASSWORD", "SUPABASE_ACCESS_TOKEN"]


def load(path: str) -> tuple[dict, str]:
    raw = open(path, encoding="utf-8").read()
    return yaml.safe_load(raw), raw


def audit(path: str) -> list[str]:
    doc, raw = load(path)
    problems: list[str] = []
    on = doc.get(True) or doc.get("on") or {}
    inputs = (on.get("workflow_dispatch") or {}).get("inputs") or {}
    env = doc.get("env") or {}

    print(f"\n=== {path}")
    print(f"  dispatch inputs            : {', '.join(inputs) or '(none)'}")

    # ── Project scoping ──────────────────────────────────────────────────────
    ref_named = [n for n in inputs if re.search(r"project|_ref\b|^ref$", n, re.I)]
    if ref_named:
        problems.append(f"input(s) could name a project: {ref_named}")
    print(f"  input that could name a ref: {ref_named or 'none'}")

    ref_valued = [n for n, spec in inputs.items() if TEST_REF in yaml.dump(spec) or PRODUCTION_REF in yaml.dump(spec)]
    if ref_valued:
        problems.append(f"input(s) carry a project ref in a default or option: {ref_valued}")
    print(f"  input carrying a ref value : {ref_valued or 'none'}")

    if env.get("PROJECT_REF") != TEST_REF:
        problems.append(f"env.PROJECT_REF is {env.get('PROJECT_REF')!r}, not the test project")
    print(f"  env.PROJECT_REF            : {env.get('PROJECT_REF')}")

    if "Refuse to run against anything but the test project" not in raw:
        problems.append("no runtime scope guard")
    print(f"  runtime scope guard        : {'present' if 'Refuse to run against anything but the test project' in raw else 'MISSING'}")

    # Every WRITE must be built from PROJECT_REF, never from a literal production ref.
    writes = [
        line.strip()
        for line in raw.splitlines()
        if re.search(r"-X\s+(POST|PUT|PATCH|DELETE)", line)
    ]
    bad_writes = [w for w in writes if PRODUCTION_REF in w]
    if bad_writes:
        problems.append(f"a write names the production ref: {bad_writes}")
    print(f"  write calls                : {len(writes)}, none naming production" if not bad_writes else f"  write calls              : PRODUCTION NAMED")

    # Where the production ref appears at all, and whether each is read-only.
    prod_lines = [
        (i + 1, line.strip())
        for i, line in enumerate(raw.splitlines())
        if PRODUCTION_REF in line and not line.strip().startswith("#")
    ]
    print(f"  production ref appears     : {len(prod_lines)} line(s)")
    for number, line in prod_lines:
        writey = bool(re.search(r"-X\s+(POST|PUT|PATCH|DELETE)", line))
        print(f"      L{number}: {'WRITE' if writey else 'read/assert'}  {line[:76]}")

    # ── Secret exposure ──────────────────────────────────────────────────────
    cred_inputs = [n for n in inputs if re.search(r"pass|secret|token|key|cred", n, re.I)]
    if cred_inputs:
        problems.append(f"credential-shaped dispatch input(s): {cred_inputs}")
    print(f"  credential-shaped input    : {cred_inputs or 'none'}")

    # An `echo` of a secret expression, in any form.
    for name in SECRET_NAMES:
        pattern = re.compile(rf"echo[^\n]*(secrets\.{name}|\${{?{name}}}?)")
        hits = [line.strip() for line in raw.splitlines() if pattern.search(line)]
        # Writing to $GITHUB_ENV is not printing; an `echo ... >> "$GITHUB_ENV"` is fine.
        hits = [h for h in hits if "GITHUB_ENV" not in h and "GITHUB_OUTPUT" not in h]
        if hits:
            problems.append(f"{name} may be echoed: {hits}")
    print(f"  secret echoed              : {'YES' if any('may be echoed' in p for p in problems) else 'none found'}")

    # A sign-in response must never be piped into jq/cat: it carries both tokens.
    signin = [
        line.strip()
        for line in raw.splitlines()
        if "grant_type=password" in line or "auth/v1/token" in line
    ]
    if signin:
        problems.append(f"signs in inline rather than via test_account_id.py: {signin}")
    print(f"  inline sign-in             : {signin or 'none (uses test_account_id.py)'}")

    # The service-role key must not be FETCHED. Prose saying it never is, is not a finding —
    # the first version of this audit flagged exactly that and reported two false failures,
    # which is how a checker teaches people to ignore it. Comments are stripped, and what is
    # left must not name it in a secrets expression, an api-keys selector or an env binding.
    code = [
        line for line in raw.splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    fetches = [
        line.strip() for line in code
        if re.search(r"service[_-]?role", line, re.I)
        and re.search(r"secrets\.|api-keys|curl|SERVICE_ROLE_KEY\s*[:=]", line, re.I)
    ]
    if fetches:
        problems.append(f"fetches or binds the service-role key: {fetches}")
    print(f"  service-role key           : {'FETCHED' if fetches else 'never fetched'}")

    return problems


def main() -> int:
    all_problems: list[tuple[str, str]] = []
    for path in WORKFLOWS:
        for problem in audit(path):
            all_problems.append((path, problem))

    print("\n" + "=" * 72)
    if all_problems:
        for path, problem in all_problems:
            print(f"FAIL  {path}: {problem}")
        return 1
    print("ALL WORKFLOWS PASS: hard-scoped to TEST, no credential-shaped inputs,")
    print("no secret echoed, no inline sign-in, service-role key never fetched.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
