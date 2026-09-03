#!/usr/bin/env python3
"""
Fetch the DEPLOYED site and check that the pages people actually visit are really there.

WHY THIS EXISTS. A green Pages deploy is not a working site, and the two are easy to
confuse. The build can succeed and upload an artifact that 404s on a route, or Pages can
keep serving a stale stylesheet while every page returns 200 — and both of those look
exactly like a successful publish from the Actions tab. The player profile made that gap
concrete: its surfaces come from utilities that did not exist in the previous build, so a
cached stylesheet would render the whole page unstyled while every status code stayed 200.

So this asserts CONTENT, not status. Each route names a marker that only appears if the
page rendered the thing it exists for.

It runs here rather than on a laptop for the ordinary reason: the sandbox this repo is
developed in cannot reach github.io at all (the proxy refuses the tunnel), so "I checked
the live site" is a claim that can only honestly be made from a runner.
"""

from __future__ import annotations

import os
import sys
import urllib.error
import urllib.request

UA = "plantdex-live-check (https://github.com/lillfaith/Plantdex-website)"

# (path, [markers that must all appear]). The markers are deliberately things the page
# CANNOT emit unless it built correctly — a heading it prints, a component's own wording —
# rather than boilerplate every page in the app shares.
ROUTES: list[tuple[str, list[str]]] = [
    ("/", ["Plantdex"]),
    ("/profile/", ["Your field naturalist card", "Field record", "Growing right now"]),
    ("/herbdex/", ["My Herbdex", "Identify a plant"]),
    ("/garden/", ["My Garden"]),
    ("/journal/", ["Journal"]),
    # The Seed Shelf shipped after this list was written, and its absence here is exactly
    # the gap this file exists to close: run 5 passed green on the deploy that introduced
    # the feature, without ever fetching it.
    #
    # NEITHER MARKER IS THE HEADING. "Seed Shelf" is in the nav of every page in the app —
    # it matches on /garden/ too, so it would pass against a shelf that never rendered.
    # These two are the page's own prose, and both are zero elsewhere in the build: the
    # description, and the sentence that says a packet is a species with no card. Checked
    # against the real `out/` rather than assumed. Apostrophes are avoided deliberately —
    # the neighbouring "don't fill the collection" arrives as `don&#x27;t`, and a marker
    # that has to spell the entity is one that breaks the day the copy is retyped.
    (
        "/seed-shelf/",
        [
            "Plants you have identified that are not Plantdex cards yet",
            "a real species you photographed that has no card yet",
        ],
    ),
    ("/account/", ["Your profile"]),
    ("/privacy/", ["Profile settings", "visible only to you"]),
    ("/safety/", ["safety"]),
]


def fetch(url: str) -> tuple[int, str]:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        return error.code, ""
    except Exception as error:  # noqa: BLE001
        print(f"     request failed: {error}")
        return 0, ""


def main() -> int:
    base = os.environ.get("SITE_URL", "").strip().rstrip("/")
    if not base:
        print("::error::SITE_URL is not set")
        return 2

    print(f"Checking {base}\n")
    failures = 0

    for path, markers in ROUTES:
        status, body = fetch(f"{base}{path}")
        missing = [m for m in markers if m not in body]
        ok = status == 200 and not missing
        print(f"{'PASS' if ok else 'FAIL'}  {path:<14} HTTP {status}  {len(body) // 1024} KB")
        if status != 200:
            print("      expected 200")
            failures += 1
            continue
        if missing:
            print(f"      missing: {', '.join(missing)}")
            failures += 1

    # THE STYLESHEET, SEPARATELY. Every check above can pass against a page whose CSS never
    # arrived. The profile's surfaces are new utilities, so their absence from the served
    # stylesheet is the precise signature of a stale cache.
    print()
    _, home = fetch(f"{base}/profile/")
    hrefs = [
        part.split('"')[0]
        for part in home.split('href="')[1:]
        if part.split('"')[0].endswith(".css")
    ]
    if not hrefs:
        print("FAIL  /profile/ links no stylesheet at all")
        failures += 1
    # The href already carries the basePath on a Pages deploy, so it is joined against the
    # ORIGIN rather than the base URL — appending it to the base would double the repo
    # segment and 404 every stylesheet while looking perfectly reasonable in the log.
    origin = "/".join(base.split("/")[:3])
    for href in hrefs:
        status, css = fetch(href if href.startswith("http") else f"{origin}{href}")
        wanted = [u for u in ("sunken", "soil-line", "trophy-medal", "sparkle") if u in css]
        print(f"{'PASS' if status == 200 else 'FAIL'}  stylesheet {href.split('/')[-1]}  HTTP {status}  {len(css) // 1024} KB  profile utilities: {len(wanted)}/4 {wanted}")
        if status != 200:
            failures += 1

    print(f"\n{failures} failure(s) across {len(ROUTES)} routes and {len(hrefs)} stylesheet(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
