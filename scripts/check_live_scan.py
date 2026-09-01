#!/usr/bin/env python3
"""
Is Plant ID actually usable on the DEPLOYED site?

WHY THIS IS SEPARATE FROM EVERY OTHER CHECK. `npm test` proves the matcher is right.
`verify-plant-id.yml` proves the edge function answers. Neither proves the thing a player
touches, because the browser only reaches that function if the Pages build was given
NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY as repository *variables*. Those
are not in this repository and cannot be read from it. Left unset the build still succeeds,
`supabase` is null, and `identifyPlant()` returns `unconfigured` — so the feature ships,
deploys green, and tells every player "Plant identification is not available here yet".

That failure is invisible from the repository and invisible from CI. The only place it is
visible is the served bundle, so this reads the served bundle.

WHAT IT ASSERTS
  1. /scan/ is being served at all.
  2. The unconditional safety caution is in the prerendered HTML — a scan screen that
     reached a player without it would be a safety regression, not a layout bug.
  3. The bundle carries a Supabase project, and it is the project whose identify-plant
     function was verified.

WHAT IT NEVER PRINTS. The anon key is public by design but there is no reason to put it in
a workflow log, so only the 20-character project ref is ever echoed.
"""

from __future__ import annotations

import re
import sys
import urllib.error
import urllib.request

# Next inlines NEXT_PUBLIC_* into the client chunks, so the project ref appears as a literal
# origin. Supabase refs are 20 lowercase letters.
PROJECT_ORIGIN = re.compile(r"https://([a-z]{20})\.supabase\.co")
CHUNK_SRC = re.compile(r"""["']((?:/[A-Za-z0-9_.\-]+)*/_next/static/[^"']+?\.js)["']""")

CAUTION_MARKER = "A suggestion, not an identification"
PAGE_MARKER = "Identify a plant"

# Enough to cover the chunks /scan/ pulls in without fetching a whole site's worth of
# JavaScript on a check that runs on every verification.
MAX_CHUNKS = 60


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "plantdex-live-check"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read().decode("utf-8", "replace")


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: check_live_scan.py <site base url> <expected project ref>")
        return 2

    base = sys.argv[1].rstrip("/")
    expected = sys.argv[2].strip()
    scan_url = f"{base}/scan/"

    try:
        html = fetch(scan_url)
    except urllib.error.HTTPError as error:
        print(f"::error::{scan_url} returned HTTP {error.code}. Plant ID is not deployed.")
        return 1
    except Exception as error:  # noqa: BLE001 — any failure to reach the page is the answer
        print(f"::error::Could not reach {scan_url}: {error}")
        return 1

    print(f"{scan_url}  ->  200, {len(html):,} bytes")

    failed = False

    if PAGE_MARKER not in html:
        print("::error::The scan page did not render its own heading. Check the deploy.")
        failed = True

    if CAUTION_MARKER not in html:
        # Deliberately an error and not a warning. The caution takes no props precisely so
        # that nothing can make it quieter; it being absent from the served page would mean
        # something made it disappear entirely.
        print("::error::The safety caution is missing from the served scan page.")
        failed = True
    else:
        print("safety caution  ->  present in the prerendered HTML")

    # ── Which Supabase project does the served bundle actually talk to? ──
    refs: set[str] = set(PROJECT_ORIGIN.findall(html))
    # Chunk srcs are absolute paths that already carry the basePath, so they hang off the
    # site's ORIGIN rather than off `base`, which may include a project path.
    parts = base.split("/")
    origin = f"{parts[0]}//{parts[2]}"
    chunks = [origin + path for path in dict.fromkeys(CHUNK_SRC.findall(html))]

    for url in chunks[:MAX_CHUNKS]:
        try:
            refs.update(PROJECT_ORIGIN.findall(fetch(url)))
        except Exception:  # noqa: BLE001 — a chunk that will not load is not this check's story
            continue

    print(f"scanned {min(len(chunks), MAX_CHUNKS)} bundle files")

    if not refs:
        print(
            "::error::The deployed bundle carries no Supabase project, so Plant ID will "
            "report 'not available here yet' to every player. Set "
            "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY as repository "
            "VARIABLES (Settings -> Secrets and variables -> Actions -> Variables) and "
            "redeploy."
        )
        return 1

    print(f"bundle talks to  ->  {', '.join(sorted(refs))}")

    if expected not in refs:
        print(
            f"::error::The live site talks to {', '.join(sorted(refs))} but the function "
            f"was verified on {expected}. The verification proves nothing about what "
            "players will hit."
        )
        return 1

    print(f"live site and verified function agree on {expected}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
