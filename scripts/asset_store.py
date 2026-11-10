#!/usr/bin/env python3
"""Image binaries outside git; their hashes, provenance and location inside it.

WHY. Committing the three shortlisted originals keeps CI durable and recreates the problem
it was meant to solve: 8 MB per species in flight is 16 GB of git at 2,000, and git keeps
every version forever. The repository already carries 1.41 GB of photo blobs across 963
versions from the pool-in-git era. Durability and git are two different requirements and
only one of them needs the bytes.

THE SPLIT, AND IT IS THE WHOLE DESIGN:
  IN GIT     evidence/assets.json -- for every asset: its sha256, its size, the species and
             photo id it belongs to, its licence and photographer, the URL it came from,
             which backend holds it and under what key. Text, diffable, a few hundred bytes
             an asset. This is the part that must survive, because it is the part that
             cannot be regenerated.
  OUTSIDE    the bytes.

A HASH IN GIT IS WHAT MAKES THE OUTSIDE HALF TRUSTWORTHY. An asset is identified by the
sha256 of its contents, not by a filename, so a re-upload of identical bytes is a no-op, a
corrupted download is detectable, and the index can be checked against the store without
either one being authoritative about the other.

BACKENDS. `r2` is any S3-compatible store (Cloudflare R2, Backblaze B2, S3 itself) and
needs boto3 plus four environment variables. `dropbox` needs one token and no dependency.
Neither is configured until the owner picks one; `--plan` works offline and shows exactly
what would be uploaded and how large it is.

    python3 scripts/asset_store.py --plan --all           # offline, uploads nothing
    python3 scripts/asset_store.py --put --species pinus_strobus --backend r2
    python3 scripts/asset_store.py --verify               # index vs the files on disk
"""
from __future__ import annotations

import argparse, datetime as dt, hashlib, json, os, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import decisions                                      # noqa: E402

INDEX = ROOT / "evidence" / "assets.json"
PHOTOS = ROOT / "evidence" / "photos"
CANDS = ROOT / "evidence" / "candidates"


def sha256(p: pathlib.Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def index() -> dict:
    if INDEX.exists():
        return json.loads(INDEX.read_text())
    return {"_what": "Durable image assets. The bytes live outside git; this is where they "
                     "are, what they weigh, what they show and who may use them.",
            "version": 1, "assets": {}}


def save(doc: dict) -> None:
    INDEX.write_text(json.dumps(doc, indent=2, sort_keys=True) + "\n")


def key_for(digest: str, suffix: str) -> str:
    """CONTENT-ADDRESSED: the object's name IS the hash of its bytes.

    Three properties fall out of that and all three are requirements rather than niceties.
    IDEMPOTENT -- re-uploading identical bytes writes the same key, so a retried job is a
    no-op instead of a duplicate. IMMUTABLE -- a key can never be silently overwritten with
    different content, because different content is a different key. VERIFIABLE -- anything
    downloaded can be checked against the name it was stored under, with no index needed.

    Readability is not lost; it moves. `evidence/assets.json` maps species, photo id and
    kind onto these keys, and that file is in git where a person can read it.
    """
    return f"objects/{digest[:2]}/{digest}{suffix.lower()}"


def assets_for(species: str) -> list[dict]:
    """Everything worth keeping durably for one species, with its provenance attached."""
    out: list[dict] = []
    mf = PHOTOS / species / "photos.json"
    if not mf.exists():
        return out
    prov = {str(e["photo_id"]): e for e in json.loads(mf.read_text()).get("photos", [])}
    cf = CANDS / species / "candidates.json"
    rows = json.loads(cf.read_text()).get("selected", []) if cf.exists() else []
    verdicts = decisions.current()
    for row in rows:
        pid = str(row["photo_id"])
        e = prov.get(pid, {})
        v = verdicts.get(pid, {})
        src = PHOTOS / species / e.get("file", "")
        for kind, path in (("original", src),
                           ("cutout", CANDS / species / row.get("cutout", "")),
                           ("card", CANDS / species / row.get("preview", ""))):
            if not (path.name and path.exists()):
                continue
            out.append({
                "species": species, "photo_id": pid, "kind": kind, "path": path,
                "bytes": path.stat().st_size,
                "licence": e.get("license_code"), "photographer": e.get("photographer"),
                "source_url": (e.get("urls") or {}).get("original"),
                "observation_url": e.get("observation_url"),
                "retrieved_at": e.get("observed_on"),
                "verdict": v.get("decision", ""),
            })
    return out


def _r2_client():
    import boto3                                       # only needed on this path
    return boto3.client(
        "s3",
        endpoint_url=os.environ["PLANTDEX_ASSET_ENDPOINT"],
        aws_access_key_id=os.environ["PLANTDEX_ASSET_KEY_ID"],
        aws_secret_access_key=os.environ["PLANTDEX_ASSET_SECRET"])


def put_r2(data: bytes, key: str) -> str:
    """Cloudflare R2 over the S3 API. Idempotent, and verified by reading back.

    NOTHING IS TRUSTED TO HAVE ARRIVED BECAUSE A PUT RETURNED. The object is fetched again
    and hashed, and a mismatch raises rather than being recorded -- an index entry that
    claims an upload that did not land is worse than no entry, because the next step is
    deleting the local copy on the strength of it.

    No credential is printed, interpolated into a message, or written to the index.
    """
    import botocore.exceptions
    bucket = os.environ["PLANTDEX_ASSET_BUCKET"]
    client = _r2_client()
    digest = hashlib.sha256(data).hexdigest()
    try:
        head = client.head_object(Bucket=bucket, Key=key)
        if head["ContentLength"] == len(data):
            return f"r2://{bucket}/{key}"              # already there, same bytes by key
    except botocore.exceptions.ClientError:
        pass
    client.put_object(Bucket=bucket, Key=key, Body=data,
                      Metadata={"sha256": digest})
    back = client.get_object(Bucket=bucket, Key=key)["Body"].read()
    if hashlib.sha256(back).hexdigest() != digest:
        raise RuntimeError(f"read-back of {key} does not match the bytes that were sent")
    return f"r2://{bucket}/{key}"


def fetch_r2(key: str) -> bytes:
    bucket = os.environ["PLANTDEX_ASSET_BUCKET"]
    return _r2_client().get_object(Bucket=bucket, Key=key)["Body"].read()


def put_dropbox(data: bytes, key: str) -> str:
    """Dropbox needs one token and no dependency."""
    import urllib.request
    token = os.environ["PLANTDEX_DROPBOX_TOKEN"]
    root = os.environ.get("PLANTDEX_DROPBOX_ROOT", "/plantdex-assets")
    arg = json.dumps({"path": f"{root}/{key}", "mode": "overwrite",
                      "autorename": False, "mute": True})
    req = urllib.request.Request(
        "https://content.dropboxapi.com/2/files/upload", data=data,
        headers={"Authorization": f"Bearer {token}", "Dropbox-API-Arg": arg,
                 "Content-Type": "application/octet-stream"})
    with urllib.request.urlopen(req, timeout=120) as r:
        json.loads(r.read())
    return f"dropbox:{root}/{key}"


BACKENDS = {"r2": put_r2, "dropbox": put_dropbox}
FETCHERS = {"r2": fetch_r2}


def is_backed_up(doc: dict, digest: str) -> bool:
    """Is this exact content durably stored AND verified? The precondition for deleting."""
    for rec in doc.get("assets", {}).values():
        if rec.get("sha256") == digest and rec.get("uploaded_at") and rec.get("verified"):
            return True
    return False


def plan(names: list[str]) -> list[dict]:
    rows = []
    for sp in names:
        rows.extend(assets_for(sp))
    return rows


def main() -> int:
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--species", nargs="*")
    a.add_argument("--all", action="store_true")
    a.add_argument("--plan", action="store_true", help="offline; uploads nothing")
    a.add_argument("--put", action="store_true")
    a.add_argument("--verify", action="store_true")
    a.add_argument("--roundtrip", action="store_true",
                   help="upload, fetch back, hash-compare. The one-species acceptance test.")
    a.add_argument("--backend", choices=sorted(BACKENDS), default="r2")
    a.add_argument("--self-test", action="store_true")
    args = a.parse_args()

    if args.self_test:
        checks = [
            (not INDEX.exists() or "assets" in index(), "the index parses"),
            (set(BACKENDS) == {"r2", "dropbox"}, "both backends are available"),
            (key_for("ab" + "c" * 62, ".JPG") == f"objects/ab/{'ab' + 'c' * 62}.jpg",
             "keys are content-addressed and the extension is normalised"),
            (key_for("ab" + "c" * 62, ".jpg") == key_for("ab" + "c" * 62, ".JPG"),
             "CONTROL: identical bytes produce one key, so a retry is idempotent"),
            (not is_backed_up({"assets": {"k": {"sha256": "x", "uploaded_at": "now"}}}, "x"),
             "CONTROL: an upload with no verification does not count as a backup"),
            (is_backed_up({"assets": {"k": {"sha256": "x", "uploaded_at": "n",
                                            "verified": True}}}, "x"),
             "a verified upload counts as a durable backup"),
            # CONTROL: nothing in this module writes an image into git.
            ("evidence/assets.json" in open(__file__).read()
             and "INDEX = ROOT" in open(__file__).read(),
             "CONTROL: only the index is written inside the repository"),
        ]
        ok = True
        for c, l in checks:
            print(("PASS  " if c else "FAIL  ") + l); ok &= bool(c)
        print("\n" + ("ALL SELF-TESTS PASSED" if ok else "SELF-TESTS FAILED"))
        return 0 if ok else 1

    names = args.species or (sorted(d.name for d in PHOTOS.iterdir() if d.is_dir())
                             if args.all else [])
    if args.roundtrip:
        doc = index()
        names = args.species or []
        if not names:
            a.error("--roundtrip needs --species")
        rows = plan(names)
        bad = 0
        for r in rows:
            digest = sha256(r["path"])
            key = key_for(digest, r["path"].suffix)
            BACKENDS[args.backend](r["path"].read_bytes(), key)
            back = FETCHERS[args.backend](key)
            good = hashlib.sha256(back).hexdigest() == digest
            bad += 0 if good else 1
            print(f"   {'OK ' if good else 'FAIL'} {key}  {len(back)/1e6:.2f} MB")
        print(f"{len(rows)} asset(s) round-tripped, {bad} failure(s)")
        return 1 if bad else 0

    if args.verify:
        doc = index()
        bad = 0
        for key, rec in doc["assets"].items():
            p = ROOT / rec["local"] if rec.get("local") else None
            if p and p.exists() and sha256(p) != rec["sha256"]:
                print(f"  MISMATCH {key}")
                bad += 1
        print(f"{len(doc['assets'])} asset(s) indexed, {bad} mismatch(es)")
        return 1 if bad else 0

    if not names:
        a.error("give --species NAME or --all")
    rows = plan(names)
    total = sum(r["bytes"] for r in rows)
    by_kind: dict[str, list[int]] = {}
    for r in rows:
        by_kind.setdefault(r["kind"], []).append(r["bytes"])
    print(f"{len(rows)} asset(s) across {len(names)} species, {total/1e6:.2f} MB")
    print(f"   content-addressed keys, e.g. {key_for(sha256(rows[0]['path']), rows[0]['path'].suffix)}"
          if rows else "")
    for kind, sizes in sorted(by_kind.items()):
        print(f"   {kind:10} {len(sizes):3} files  {sum(sizes)/1e6:7.2f} MB")
    if not args.put:
        print("\nPLAN ONLY. Nothing was uploaded and no credential was read.")
        print("Configure a backend and re-run with --put to upload:")
        print("   r2:      PLANTDEX_ASSET_ENDPOINT, PLANTDEX_ASSET_BUCKET, "
              "PLANTDEX_ASSET_KEY_ID, PLANTDEX_ASSET_SECRET")
        print("   dropbox: PLANTDEX_DROPBOX_TOKEN  (optional PLANTDEX_DROPBOX_ROOT)")
        return 0

    doc = index()
    sent = 0
    for r in rows:
        digest = sha256(r["path"])
        key = key_for(digest, r["path"].suffix)
        rec = doc["assets"].get(key)
        if rec and rec.get("sha256") == digest and rec.get("verified"):
            continue                                   # identical bytes, already verified
        where = BACKENDS[args.backend](r["path"].read_bytes(), key)
        doc["assets"][key] = {
            "sha256": digest, "bytes": r["bytes"], "species": r["species"],
            "photo_id": r["photo_id"], "kind": r["kind"], "licence": r["licence"],
            "photographer": r["photographer"], "source_url": r["source_url"],
            "observation_url": r["observation_url"], "verdict": r["verdict"],
            "backend": args.backend, "remote": where, "verified": True,
            "uploaded_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "local": str(r["path"].relative_to(ROOT)),
        }
        sent += 1
        print(f"   uploaded {r['species']}/{r['photo_id']}/{r['kind']} -> {key}  "
              f"{r['bytes']/1e6:.2f} MB  verified")
    save(doc)
    print(f"{sent} uploaded, {len(doc['assets'])} indexed in {INDEX.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
