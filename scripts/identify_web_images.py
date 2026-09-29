#!/usr/bin/env python3
"""
Run REAL photographs through the live identifier and report what comes back.

WHY THIS EXISTS. The 45-card survey used studio card art, cropped to the photo panel. That
is the easy case: one plant, filling the frame, lit properly. It reported 45/45 covered and
0 no-match, and I said so — then a field photograph of a violet came back "not one of the 45
cards", and broad-leaved dock was reported failing repeatedly. Card art is not evidence
about field photographs, and treating it as such is how both of those shipped.

So this pulls actual photographs — several per species, taken by different people in
different conditions — and puts each one through the deployed function. It answers the only
question that matters: given a real picture of this plant, does the deck find it?

WHERE THE IMAGES COME FROM. Wikimedia Commons, resolved through its own API. Stable URLs,
explicit licensing, no scraping of a search engine's result page, and reproducible — the
same category returns the same files, so a run can be repeated and compared.

────────────────────────────────────────────────────────────────────────────────────────
TWO MODES.

SIZE MODE (the original). Set CATEGORY and SIZES (e.g. "1280x82,1024x75,800x75", as edge x
quality) and each photograph is re-encoded at each setting and identified once per setting,
with the answers printed side by side. That is the ONLY honest way to choose what
`IDENTIFY_PROFILE` in `src/lib/image-prepare.ts` sends: the upload is usually the largest
term in the wait on a phone, smaller is faster, and whether smaller is also WORSE is a
question about the provider's model that nothing in this repository can answer by reasoning.

BENCHMARK MODE (new). Set MANIFEST to a JSON file of image SETS and this runs a condition
matrix over each one, writing a JSONL record per (set, condition). It answers three
questions the size mode cannot:

  1 photo vs 2 vs 3   Does the second and third photograph actually buy accuracy? The UI
                      requires two and offers three, and that was a design decision, not a
                      measurement.
  PlantNet vs plant.id  On the SAME images. Not two runs on two image sets, which measures
                      the image sets.
  Slot 3 tagged `auto` vs tagged with the real organ. The third slot is the only one the UI
                      leaves as `auto`. Whether that costs accuracy is measurable.

IT DOES NOT SCORE ANYTHING. This file talks to the network and writes down what came back.
Deciding whether an answer was RIGHT means applying `matchScientificName` and `outcomeFor`,
and a second implementation of those here would be free to disagree with the one that ships.
`benchmark/report.bench.test.ts` reads this file's JSONL and applies the real ones.

────────────────────────────────────────────────────────────────────────────────────────
WHAT IT COSTS, AND WHY THAT IS PRINTED BEFORE ANYTHING IS SPENT.

Every request is one PlantNet identification against the project's daily allowance. A
request made with a SIGNED-IN token belonging to an account in
`IDENTIFICATION_COMPARISON_USER_IDS` additionally costs one plant.id (Kindwise) credit,
because comparison mode asks both providers — that is how the provider axis is measured
without paying for two runs. Kindwise credits are bought, so `DRY_RUN=1` prints the exact
budget and makes zero identification calls. Run it first, every time.

Quotas are enforced by the function, not here: 5/day for an anonymous caller (per IP),
30/day for a signed-in one, 450/day globally. A 429 stops the run and the JSONL written so
far is still valid — re-running with ONLY set to what is missing resumes it.

────────────────────────────────────────────────────────────────────────────────────────
ENVIRONMENT.

  Both modes      PROJECT_REF, ANON_KEY
  Size mode       CATEGORY, LIMIT, SIZES
  Benchmark mode  MANIFEST, OUT, CONDITIONS, SIGNED_IN, ONLY, EDGE, QUALITY,
                  ACCESS_TOKEN or (USER_EMAIL and USER_PASSWORD) for the comparison account,
                  and optionally PLAIN_ACCESS_TOKEN or (PLAIN_USER_EMAIL and
                  PLAIN_USER_PASSWORD) for a second, ordinary account
  Read-back       COMPARISONS=1, OUT, COMPARISONS_OUT, and the same credentials
  Either          DRY_RUN=1 (budget only), RESOLVE=1 (list Commons files, no calls)

A full run is three commands and only the middle one costs anything:

  DRY_RUN=1  MANIFEST=scripts/benchmark/sets.json  ...  python3 scripts/identify_web_images.py
             MANIFEST=scripts/benchmark/sets.json  ...  python3 scripts/identify_web_images.py
  COMPARISONS=1                                    ...  python3 scripts/identify_web_images.py
  npx vitest run --config vitest.bench.config.ts
"""

from __future__ import annotations

import datetime
import io
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
UA = "plantdex-field-realism-check (https://github.com/lillfaith/Plantdex-website)"

# What `IDENTIFY_PROFILE` sends today. See the Performance notes in CLAUDE.md: 1024/0.75 is
# where three measured photographs supported stopping, and 800 needs more evidence than three.
DEFAULT_EDGE = 1024
DEFAULT_QUALITY = 75

# The function's own limits, repeated here only so the budget print can be honest about what
# will stop a run. They are NOT enforced here.
ANON_DAILY_LIMIT = 5
USER_DAILY_LIMIT = 30


# ── Commons ──────────────────────────────────────────────────────────────────


def commons_images(category: str, limit: int) -> list[tuple[str, str]]:
    """(title, direct url) for the first `limit` photographs in a Commons category."""
    params = {
        "action": "query",
        "generator": "categorymembers",
        "gcmtitle": f"Category:{category}",
        "gcmtype": "file",
        "gcmlimit": str(max(limit * 4, 20)),
        "prop": "imageinfo",
        "iiprop": "url|mime",
        "iiurlwidth": "1200",
        "format": "json",
    }
    return _commons_query(params, limit)


def commons_files(titles: list[str]) -> list[tuple[str, str]]:
    """(title, direct url) for explicitly named files, in the order given.

    THE HONEST MODE. A category returns photographs of DIFFERENT INDIVIDUALS by different
    people, which is a fine test of "does the deck find this species" and a poor test of
    "do three views of one plant beat two". Naming the files is how a set becomes three views
    of one specimen — and the manifest records which kind it is, because a benchmark that
    cannot say that is one whose photo-count result means nothing.
    """
    params = {
        "action": "query",
        "titles": "|".join(f"File:{one.removeprefix('File:')}" for one in titles),
        "prop": "imageinfo",
        "iiprop": "url|mime",
        "iiurlwidth": "1200",
        "format": "json",
    }
    found = dict(_commons_query(params, len(titles)))
    out: list[tuple[str, str]] = []
    for title in titles:
        want = f"File:{title.removeprefix('File:')}"
        if want in found:
            out.append((want, found[want]))
    return out


def _commons_query(params: dict[str, str], limit: int) -> list[tuple[str, str]]:
    request = urllib.request.Request(
        f"{COMMONS_API}?{urllib.parse.urlencode(params)}", headers={"User-Agent": UA}
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        data = json.load(response)

    out: list[tuple[str, str]] = []
    for page in (data.get("query", {}).get("pages") or {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        mime = info.get("mime", "")
        # Photographs only: the categories also hold botanical plates and diagrams, and an
        # engraving is not a test of whether this works on a phone.
        if mime not in {"image/jpeg", "image/png"}:
            continue
        url = info.get("thumburl") or info.get("url")
        if url:
            out.append((page.get("title", "?"), url))
    return out[:limit]


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read()


# ── The function ─────────────────────────────────────────────────────────────


def identify(
    images: list[tuple[bytes, str]],
    project: str,
    key: str,
    token: str | None = None,
) -> dict:
    """POST one observation — two or three photographs of one plant, each with an organ tag.

    `images` is [(jpeg bytes, organ)]. The parts are appended in matching order and read back
    with `getAll`, which is the shape `identify-plant` documents; an organ it does not
    recognise becomes `auto` server-side rather than an error.

    `token` is a user access token. Passing one is what makes the call SIGNED IN, which is
    what puts it in the larger quota bucket and — for an account in the comparison list —
    what makes the function ask plant.id as well and write both answers to
    `identification_comparisons`. That is the only way to get the alternate provider's answer:
    it is deliberately never returned in the response.
    """
    boundary = "----plantdexfieldcheck"
    parts: list[bytes] = []
    for index, (blob, organ) in enumerate(images):
        parts += [
            f"--{boundary}\r\n".encode(),
            (
                f'Content-Disposition: form-data; name="image"; '
                f'filename="scan{index}.jpg"\r\n'
            ).encode(),
            b"Content-Type: image/jpeg\r\n\r\n",
            blob,
            b"\r\n",
        ]
    for _, organ in images:
        parts += [
            f"--{boundary}\r\n".encode(),
            b'Content-Disposition: form-data; name="organ"\r\n\r\n',
            organ.encode(),
            b"\r\n",
        ]
    parts.append(f"--{boundary}--\r\n".encode())

    request = urllib.request.Request(
        f"https://{project}.supabase.co/functions/v1/identify-plant",
        data=b"".join(parts),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "apikey": key,
            "Authorization": f"Bearer {token or key}",
            "User-Agent": UA,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            return {"http": response.status, "body": json.load(response)}
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8", "replace")
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            body = {"raw": raw[:400]}
        return {"http": error.code, "body": body}


def fetch_comparisons(project: str, key: str, token: str, observation_ids: list[str]) -> list[dict]:
    """The alternate provider's answers, read back afterwards rather than during the run.

    They cannot come back in the response — the alternate's answer is recorded and DROPPED,
    deliberately, so that an allow-listed account is never silently using a different
    identifier from everybody else. So they are fetched here, through PostgREST, under the
    BENCHMARK ACCOUNT'S OWN TOKEN: `identification_comparisons` is user-scoped and its select
    policy is `auth.uid() = user_id`, so this reads exactly the rows this run wrote and
    nothing else. No service-role key is involved and none is needed.

    Run this AFTER the matrix, not inside it. The function hands the insert to
    `EdgeRuntime.waitUntil` and returns, so a row lands shortly after its response does;
    reading during the run would race it.
    """
    out: list[dict] = []
    for start in range(0, len(observation_ids), 40):
        chunk = observation_ids[start : start + 40]
        query = urllib.parse.urlencode(
            {
                "observation_id": f"in.({','.join(chunk)})",
                "select": "observation_id,provider,top_scientific_name,top_rank,"
                "top_probability,candidates,failure,created_at",
            }
        )
        request = urllib.request.Request(
            f"https://{project}.supabase.co/rest/v1/identification_comparisons?{query}",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "User-Agent": UA,
            },
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            out += json.load(response)
    return out


def sign_in(project: str, key: str, email: str, password: str) -> str:
    """Exchange a password for an access token, the same grant the app's client uses.

    The benchmark needs a REAL user token rather than the anon key: the comparison gate is
    `Boolean(userId) && COMPARISON_ON && COMPARISON_USER_IDS.has(userId)`, and the anon key
    carries no user id at all, so a run made with it silently measures PlantNet alone.
    """
    request = urllib.request.Request(
        f"https://{project}.supabase.co/auth/v1/token?grant_type=password",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={
            "Content-Type": "application/json",
            "apikey": key,
            "User-Agent": UA,
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)["access_token"]


# ── Images ───────────────────────────────────────────────────────────────────


def parse_sizes(raw: str) -> list[tuple[int, int]]:
    """["1280x82", "800x75"] -> [(1280, 82), (800, 75)]. Empty means "send as downloaded"."""
    out: list[tuple[int, int]] = []
    for part in raw.replace(" ", "").split(","):
        if not part:
            continue
        edge, _, quality = part.partition("x")
        out.append((int(edge), int(quality or 82)))
    return out


def reencode(blob: bytes, edge: int, quality: int) -> bytes:
    """What the browser sends: longest edge capped, re-encoded as JPEG at that quality.

    Mirrors `prepareImage` in src/lib/image-prepare.ts — cap the LONGEST edge, preserve the
    aspect ratio, write JPEG. Pillow's resampling is not the browser's, so this measures the
    SIZE the model is given rather than reproducing a browser's exact bytes; that is the
    variable being tested.
    """
    from PIL import Image  # imported here so the no-SIZES path needs no Pillow

    image = Image.open(io.BytesIO(blob)).convert("RGB")
    width, height = image.size
    scale = min(1.0, edge / max(width, height))
    if scale < 1.0:
        image = image.resize(
            (max(1, round(width * scale)), max(1, round(height * scale))), Image.LANCZOS
        )
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=quality)
    return buffer.getvalue()


# ── Benchmark mode ───────────────────────────────────────────────────────────

"""
THE CONDITION MATRIX.

Each entry is (how many photographs, how the organ tags are built). The organ tags matter as
much as the count: PlantNet takes one per image and the deck's own UI leaves the THIRD slot
as `auto`, so "three photographs" and "three photographs the way the app sends them" are not
the same request.

  p1       One photograph. Today the endpoint REFUSES this — `MIN_IMAGES` is 2 — so this
           condition only runs against a deployment where that floor has been lowered. It is
           in the matrix because "is the second photograph worth requiring?" is a question
           about a requirement the product already imposes, and it cannot be answered by a
           harness that is itself bound by it. NOT selected by default: against an unmodified
           deployment every p1 request is a 400, and a run that spends its quota recording
           the same refusal thirteen times has measured the floor, not the photographs.
  p2       Two, tagged from the manifest. The app's minimum.
  p3auto   Three, with the third tagged `auto`. EXACTLY what the app sends today.
  p3tag    Three, with the third tagged with the organ the manifest says it really is. The
           only difference from p3auto is that one word, which is what isolates it.
"""
CONDITIONS: dict[str, tuple[int, str]] = {
    "p1": (1, "manifest"),
    "p2": (2, "manifest"),
    "p3auto": (3, "auto-third"),
    "p3tag": (3, "manifest"),
}
DEFAULT_CONDITIONS = "p2,p3auto,p3tag"
DEFAULT_SIGNED_IN = "p3auto"


def organs_for(condition: str, manifest_organs: list[str]) -> list[str]:
    count, style = CONDITIONS[condition]
    tags = [(manifest_organs[i] if i < len(manifest_organs) else "auto") for i in range(count)]
    if style == "auto-third" and count == 3:
        tags[2] = "auto"
    return tags


def load_manifest(path: str) -> dict:
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def resolve_set(entry: dict, wanted: int) -> list[tuple[str, str]]:
    """The photographs for one set: explicit files if the manifest names them, else category."""
    files = entry.get("files") or []
    if files:
        return commons_files(files)[:wanted]
    category = entry.get("category")
    if not category:
        return []
    return commons_images(category, wanted)


def budget(
    sets: list[dict], conditions: list[str], signed_in: list[str], have_plain: bool
) -> dict[str, int]:
    """What the run will spend, before it spends any of it.

    THE ASYMMETRY IS THE WHOLE REASON THE PROVIDER AXIS IS AFFORDABLE. A request made with
    the COMPARISON account's token asks BOTH providers, so it costs one PlantNet
    identification and one Kindwise credit; every other request costs a PlantNet
    identification and nothing else. Running one condition per set as the comparison account
    therefore buys the entire provider comparison for one credit per set.

    THERE IS NO SIGNED-IN-WITHOUT-COMPARING FOR THAT ACCOUNT. The gate is
    `Boolean(userId) && COMPARISON_ON && COMPARISON_USER_IDS.has(userId)` — no request
    parameter, by design. So the unpaid conditions run either anonymously, at 5/day per IP,
    or as a SECOND signed-in account that is not on the allow-list, at 30/day. The second
    account is not a nicety: at 5/day a thirteen-set run takes the better part of a week.
    """
    paid = [one for one in conditions if one in signed_in]
    unpaid = len(sets) * (len(conditions) - len(paid))
    return {
        "sets": len(sets),
        "conditions": len(conditions),
        "requests": len(sets) * len(conditions),
        "plantnet": len(sets) * len(conditions),
        "kindwise": len(sets) * len(paid),
        "comparisonRequests": len(sets) * len(paid),
        "plainRequests": unpaid if have_plain else 0,
        "anonymousRequests": 0 if have_plain else unpaid,
    }


def print_budget(plan: dict[str, int]) -> None:
    def days(count: int, limit: int) -> int:
        return -(-count // limit) if count else 0

    print("BUDGET")
    print(f"  sets                 {plan['sets']}")
    print(f"  conditions per set   {plan['conditions']}")
    print(f"  total requests       {plan['requests']}")
    print(f"  PlantNet ids         {plan['plantnet']}")
    print(f"  Kindwise credits     {plan['kindwise']}   (paid; comparison-account requests only)")
    print()
    print("  against the function's quotas")
    comparison = plan["comparisonRequests"]
    plain = plan["plainRequests"]
    anon = plan["anonymousRequests"]
    print(
        f"    comparison account {comparison:>4}  at {USER_DAILY_LIMIT}/day = "
        f"{days(comparison, USER_DAILY_LIMIT)} day(s)"
    )
    if plain:
        print(
            f"    second account     {plain:>4}  at {USER_DAILY_LIMIT}/day = "
            f"{days(plain, USER_DAILY_LIMIT)} day(s)"
        )
    if anon:
        print(
            f"    anonymous          {anon:>4}  at {ANON_DAILY_LIMIT}/day per IP = "
            f"{days(anon, ANON_DAILY_LIMIT)} day(s) from one address"
        )
        print(
            "      Set PLAIN_USER_EMAIL / PLAIN_USER_PASSWORD to a second account that is NOT\n"
            "      on the comparison allow-list and these move to the 30/day bucket, for no\n"
            "      extra credit."
        )
    print()


def run_comparisons() -> int:
    """COMPARISONS=1 — read the alternate provider's rows back for a finished run.

    Spends nothing: no identification, no credit. It reads the observation ids out of the
    JSONL the matrix wrote and fetches the rows those requests produced.
    """
    project = os.environ.get("PROJECT_REF", "").strip()
    key = os.environ.get("ANON_KEY", "").strip()
    source = os.environ.get("OUT", "benchmark-results.jsonl").strip()
    target = os.environ.get("COMPARISONS_OUT", "benchmark-comparisons.json").strip()

    token = os.environ.get("ACCESS_TOKEN", "").strip() or None
    email = os.environ.get("USER_EMAIL", "").strip()
    password = os.environ.get("USER_PASSWORD", "").strip()
    if not token and email and password:
        token = sign_in(project, key, email, password)
    if not token:
        print("set ACCESS_TOKEN or USER_EMAIL/USER_PASSWORD — the rows are read as their owner")
        return 2

    ids: list[str] = []
    with open(source, encoding="utf-8") as handle:
        for line in handle:
            record = json.loads(line)
            observation = (record.get("response") or {}).get("observationId")
            if record.get("comparing") and observation:
                ids.append(observation)
    if not ids:
        print(f"{source} holds no comparing request with an observation id")
        return 0

    rows = fetch_comparisons(project, key, token, ids)
    with open(target, "w", encoding="utf-8") as handle:
        json.dump(rows, handle, indent=1)

    answered = {row["observation_id"] for row in rows}
    print(f"{len(rows)} row(s) for {len(answered)} of {len(ids)} observation(s) -> {target}")
    missing = [one for one in ids if one not in answered]
    if missing:
        print(
            f"{len(missing)} observation(s) have no row. Comparison writes are "
            "fire-and-forget; wait a moment and re-run, and if they stay missing the "
            "alternate provider's key is probably unset on that deployment."
        )
    return 0


def run_benchmark() -> int:
    project = os.environ.get("PROJECT_REF", "").strip()
    key = os.environ.get("ANON_KEY", "").strip()
    manifest_path = os.environ.get("MANIFEST", "").strip()
    out_path = os.environ.get("OUT", "benchmark-results.jsonl").strip()
    dry_run = os.environ.get("DRY_RUN", "").strip() == "1"
    resolve_only = os.environ.get("RESOLVE", "").strip() == "1"
    edge = int(os.environ.get("EDGE", str(DEFAULT_EDGE)))
    quality = int(os.environ.get("QUALITY", str(DEFAULT_QUALITY)))
    only = {one for one in os.environ.get("ONLY", "").replace(" ", "").split(",") if one}

    conditions = [
        one
        for one in os.environ.get("CONDITIONS", DEFAULT_CONDITIONS).replace(" ", "").split(",")
        if one
    ]
    unknown = [one for one in conditions if one not in CONDITIONS]
    if unknown:
        print(f"unknown condition(s): {', '.join(unknown)}")
        print(f"known: {', '.join(CONDITIONS)}")
        return 2
    signed_in = [
        one
        for one in os.environ.get("SIGNED_IN", DEFAULT_SIGNED_IN).replace(" ", "").split(",")
        if one
    ]

    manifest = load_manifest(manifest_path)
    sets = [one for one in manifest.get("sets", []) if not only or one.get("id") in only]
    if not sets:
        print("manifest selected no sets")
        return 2

    have_plain = bool(
        os.environ.get("PLAIN_ACCESS_TOKEN", "").strip()
        or (
            os.environ.get("PLAIN_USER_EMAIL", "").strip()
            and os.environ.get("PLAIN_USER_PASSWORD", "").strip()
        )
    )
    plan = budget(sets, conditions, signed_in, have_plain)
    print(f"manifest: {manifest_path}")
    print(f"conditions: {', '.join(conditions)}")
    print(f"signed in (and therefore comparing providers): {', '.join(signed_in) or 'none'}")
    print(f"upload profile: {edge}px q{quality}\n")
    print_budget(plan)

    if dry_run:
        print("DRY_RUN=1 — nothing was sent and nothing was spent.")
        return 0

    # ── Photographs, resolved before anything is spent ────────────────────────
    wanted = max(CONDITIONS[one][0] for one in conditions)
    resolved: dict[str, list[tuple[str, bytes]]] = {}
    for entry in sets:
        set_id = entry["id"]
        picked = resolve_set(entry, wanted)
        kind = "named files" if entry.get("files") else "category"
        same = "one individual" if entry.get("sameIndividual") else "DIFFERENT individuals"
        print(f"── {set_id}  ({kind}, {same})")
        if len(picked) < wanted:
            print(f"     only {len(picked)} of {wanted} photographs — set skipped")
            continue
        if resolve_only:
            for title, _ in picked:
                print(f"     {title}")
            continue
        blobs: list[tuple[str, bytes]] = []
        for title, url in picked:
            try:
                blobs.append((title, reencode(download(url), edge, quality)))
            except Exception as error:  # noqa: BLE001
                print(f"     could not prepare {title}: {error}")
        if len(blobs) < wanted:
            print("     preparation failed — set skipped")
            continue
        sizes = ", ".join(f"{len(blob) // 1024}KB" for _, blob in blobs)
        print(f"     prepared: {sizes}")
        resolved[set_id] = blobs

    if resolve_only:
        print("\nRESOLVE=1 — nothing was sent and nothing was spent.")
        return 0

    # ── The tokens, once ──────────────────────────────────────────────────────
    #
    # TWO IDENTITIES, BECAUSE COMPARISON IS A PROPERTY OF THE ACCOUNT, NOT THE REQUEST. The
    # first is the allow-listed one: every request it makes asks both providers and costs a
    # credit. The second is an ordinary account, used for the conditions that are only
    # measuring PlantNet — it buys the 30/day bucket instead of the anonymous 5/day, and
    # spends nothing extra. Absent, those conditions simply go out anonymously.
    def token_from(prefix: str) -> str | None:
        direct = os.environ.get(f"{prefix}ACCESS_TOKEN", "").strip()
        if direct:
            return direct
        email = os.environ.get(f"{prefix}USER_EMAIL", "").strip()
        password = os.environ.get(f"{prefix}USER_PASSWORD", "").strip()
        return sign_in(project, key, email, password) if email and password else None

    token = token_from("")
    plain_token = token_from("PLAIN_")
    if signed_in and not token:
        print(
            "\nNo ACCESS_TOKEN and no USER_EMAIL/USER_PASSWORD, so the conditions listed in\n"
            "SIGNED_IN would run ANONYMOUSLY — which spends no Kindwise credit and records no\n"
            "comparison row, so the provider axis would silently be missing. Stopping."
        )
        return 2

    # ── The matrix ────────────────────────────────────────────────────────────
    written = 0
    stopped = False
    with open(out_path, "w", encoding="utf-8") as handle:
        for entry in sets:
            set_id = entry["id"]
            blobs = resolved.get(set_id)
            if not blobs:
                continue
            for condition in conditions:
                count, _ = CONDITIONS[condition]
                tags = organs_for(condition, entry.get("organs", []))
                payload = [(blobs[i][1], tags[i]) for i in range(count)]
                comparing = condition in signed_in
                use_token = token if comparing else plain_token
                answer = identify(payload, project, key, use_token)
                record = {
                    "setId": set_id,
                    "condition": condition,
                    "truth": entry.get("truth", {}),
                    "sameIndividual": bool(entry.get("sameIndividual")),
                    "source": "files" if entry.get("files") else "category",
                    "signedIn": bool(use_token),
                    "comparing": comparing,
                    "profile": {"edge": edge, "quality": quality},
                    "images": [
                        {"title": blobs[i][0], "organ": tags[i], "bytes": len(blobs[i][1])}
                        for i in range(count)
                    ],
                    "http": answer["http"],
                    "response": answer["body"],
                    "at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                }
                handle.write(json.dumps(record) + "\n")
                handle.flush()
                written += 1

                body = answer["body"]
                if answer["http"] != 200:
                    note = body.get("code") or body.get("error") or body.get("raw", "")
                    print(f"   {set_id:<28} {condition:<7} HTTP {answer['http']}  {note}")
                    if answer["http"] == 429:
                        print("     quota reached — stopping; re-run with ONLY to resume")
                        stopped = True
                        break
                    continue
                top = (body.get("candidates") or [{}])[0]
                print(
                    f"   {set_id:<28} {condition:<7} "
                    f"{top.get('scientificName', '(nothing)'):<34} "
                    f"{top.get('score', 0):.3f}  left {body.get('remaining')}"
                )
            if stopped:
                break

    print(f"\n{written} record(s) -> {out_path}")
    print("Now: npx vitest run --config vitest.bench.config.ts")
    return 0


# ── Size mode (unchanged) ────────────────────────────────────────────────────


def run_sizes() -> int:
    category = os.environ.get("CATEGORY", "").strip()
    project = os.environ.get("PROJECT_REF", "").strip()
    key = os.environ.get("ANON_KEY", "").strip()
    limit = int(os.environ.get("LIMIT", "4"))
    sizes = parse_sizes(os.environ.get("SIZES", ""))
    token = os.environ.get("ACCESS_TOKEN", "").strip() or None
    if sizes:
        print(f"comparing {len(sizes)} upload sizes: " + ", ".join(f"{e}px q{q}" for e, q in sizes))
        print(
            f"budget: {limit} photograph(s) x {len(sizes)} sizes = "
            f"{limit * len(sizes)} identifications\n"
        )

    images = commons_images(category, limit)
    print(f"{len(images)} photographs from Commons category '{category}'\n")
    if not images:
        print("::warning::No usable photographs found. Check the category name.")
        return 0

    # A machine-readable block so the names can be replayed through the matcher offline,
    # without spending another identification to ask the same question twice.
    replay: dict[str, list] = {}

    for title, url in images:
        short = title.replace("File:", "")[:64]
        try:
            blob = download(url)
        except Exception as error:  # noqa: BLE001
            print(f"  SKIP  {short}: could not download ({error})")
            continue

        print(f"── {short}  (as downloaded: {len(blob) // 1024} KB)")

        # No SIZES: the original single-variant behaviour, unchanged.
        variants = [("as downloaded", blob)]
        if sizes:
            variants = []
            for edge, quality in sizes:
                try:
                    variants.append((f"{edge}px q{quality}", reencode(blob, edge, quality)))
                except Exception as error:  # noqa: BLE001
                    print(f"     could not re-encode at {edge}px: {error}")

        stopped = False
        for label, payload in variants:
            # TWO PARTS OF THE SAME PHOTOGRAPH. The endpoint requires two images and treats
            # the set as one individual, so sending one picture twice is the closest a
            # SIZE comparison can get to its original one-image shape without a deployment
            # that lowers `MIN_IMAGES`. It is a constant across every size, which is what
            # this mode is comparing — see BENCHMARK MODE for the photo-count question,
            # where a duplicated image would NOT be an honest answer.
            answer = identify([(payload, "habit"), (payload, "auto")], project, key, token)
            print(f"   {label:<16} {len(payload) // 1024:>4} KB")

            if answer["http"] != 200:
                print(f"     HTTP {answer['http']}: {json.dumps(answer['body'])[:300]}")
                if answer["http"] == 429:
                    print("     quota reached — stopping")
                    stopped = True
                    break
                continue

            candidates = answer["body"].get("candidates", [])
            if not candidates:
                print("     provider recognised nothing")
            for candidate in candidates:
                print(f"     {candidate['scientificName']:<34} {candidate['score']:.3f}")
            print(f"     remaining today: {answer['body'].get('remaining')}")
            # Keyed by size as well as photograph, so two runs of the same species at
            # different settings can be diffed rather than overwriting each other.
            key_name = short if label == "as downloaded" else f"{short} @ {label}"
            replay[key_name] = [[c["scientificName"], round(c["score"], 3)] for c in candidates]
        print()
        if stopped:
            break

    print("REPLAY_JSON_START")
    print(json.dumps(replay, indent=1))
    print("REPLAY_JSON_END")
    return 0


def main() -> int:
    project = os.environ.get("PROJECT_REF", "").strip()
    key = os.environ.get("ANON_KEY", "").strip()
    if not (project and key):
        print("set PROJECT_REF and ANON_KEY")
        return 2
    if os.environ.get("COMPARISONS", "").strip() == "1":
        return run_comparisons()
    if os.environ.get("MANIFEST", "").strip():
        return run_benchmark()
    if not os.environ.get("CATEGORY", "").strip():
        print("set MANIFEST (benchmark mode) or CATEGORY (upload-size mode)")
        return 2
    return run_sizes()


if __name__ == "__main__":
    sys.exit(main())
