#!/usr/bin/env python3
"""
Run REAL photographs of a species through the live identifier and report what comes back.

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

COMPARING UPLOAD SIZES. Set SIZES (e.g. "1280x82,1024x75,800x75", as edge x quality) and
each photograph is re-encoded at each setting and identified once per setting, with the
answers printed side by side. That is the ONLY honest way to choose what `IDENTIFY_PROFILE`
in `src/lib/image-prepare.ts` sends: the upload is usually the largest term in the wait on a
phone, smaller is faster, and whether smaller is also WORSE is a question about PlantNet's
model that nothing in this repository can answer by reasoning. Card art cannot answer it
either — see above — so it is asked of real field photographs, through the real function.

WHAT IT COSTS. One identification per image per size, against the project's daily allowance.
The anonymous bucket is 5/day per IP and a runner gets a fresh one per job, so keep batches
small: with three sizes that is ONE photograph per job, repeated across species as separate
runs.
"""

from __future__ import annotations

import io
import json
import os
import sys
import urllib.parse
import urllib.request

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
UA = "plantdex-field-realism-check (https://github.com/lillfaith/Plantdex-website)"


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


def identify(image: bytes, filename: str, project: str, key: str) -> dict:
    boundary = "----plantdexfieldcheck"
    body = b"".join(
        [
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'.encode(),
            b"Content-Type: image/jpeg\r\n\r\n",
            image,
            f"\r\n--{boundary}--\r\n".encode(),
        ]
    )
    request = urllib.request.Request(
        f"https://{project}.supabase.co/functions/v1/identify-plant",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "User-Agent": UA,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        return {"httpError": error.code, "body": error.read().decode("utf-8", "replace")[:300]}


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


def main() -> int:
    category = os.environ.get("CATEGORY", "").strip()
    project = os.environ.get("PROJECT_REF", "").strip()
    key = os.environ.get("ANON_KEY", "").strip()
    limit = int(os.environ.get("LIMIT", "4"))
    sizes = parse_sizes(os.environ.get("SIZES", ""))
    if not (category and project and key):
        print("set CATEGORY, PROJECT_REF and ANON_KEY")
        return 2
    if sizes:
        print(f"comparing {len(sizes)} upload sizes: " + ", ".join(f"{e}px q{q}" for e, q in sizes))
        print(f"budget: {limit} photograph(s) x {len(sizes)} sizes = {limit * len(sizes)} identifications\n")

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
            request = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(request, timeout=90) as response:
                blob = response.read()
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
            answer = identify(payload, "scan.jpg", project, key)
            print(f"   {label:<16} {len(payload) // 1024:>4} KB")

            if "httpError" in answer:
                print(f"     HTTP {answer['httpError']}: {answer['body']}")
                if answer["httpError"] == 429:
                    print("     quota reached — stopping")
                    stopped = True
                    break
                continue

            candidates = answer.get("candidates", [])
            if not candidates:
                print("     provider recognised nothing")
            for candidate in candidates:
                print(f"     {candidate['scientificName']:<34} {candidate['score']:.3f}")
            print(f"     remaining today: {answer.get('remaining')}")
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


if __name__ == "__main__":
    sys.exit(main())
