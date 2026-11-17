"""The production ledger: one record per card, every stage tracked on its own.

DESIGN RULES (each one exists because the alternative loses work):

* STAGES ARE FLAGS, NOT A SINGLE STATUS. A card can be `needs_revision` for its pixel icon
  while its main image is already reviewed, so "where is this card" is a set of facts with a
  derived `current` for display, never one overwritable field.
* ASSETS ARE INDEPENDENT. main_image, pixel_icon and tall_preview each carry their own
  versions, validation, review and attempt count. Regenerating one never touches the others.
* VERSIONS ARE APPEND-ONLY. An imported file is never overwritten; a new attempt is v2.
* APPROVAL IS A SNAPSHOT. It records which version of each asset was approved. Change any
  asset afterwards and the approval no longer matches, so an approved card cannot be altered
  by accident - it has to be explicitly un-approved first.
* NOTHING HERE APPROVES. `approve()` is only ever called by a person running the command.
* COLLECTION FACTS COME FROM CI RESULT FILES (see `sync`), so the machine that downloads
  photos and the machine that records decisions never write the same file.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import tempfile

STAGES = ["pending", "photos_collected", "photos_selected", "image_generation_needed",
          "assets_generated", "quality_review", "approved", "needs_revision"]
ASSETS = ["main_image", "pixel_icon", "tall_preview"]
ROLE_OF_ASSET = {"main_image": "main_photo", "pixel_icon": "pixel_source", "tall_preview": "tall_preview"}
ASSET_OF_ROLE = {v: k for k, v in ROLE_OF_ASSET.items()}
EXPECTED_COUNT = 85   # the corrected master: #57-141 (it was 86, then briefly mis-stated as 83)

ROOT = pathlib.Path(__file__).resolve().parents[2]
PROD = ROOT / "evidence" / "production"
LEDGER = PROD / "queue.json"
BATCHES = PROD / "batches"


class LedgerError(RuntimeError):
    pass


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def key_of(sci: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", sci.lower()).strip("_")


def sha256_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json(path: pathlib.Path, data) -> None:
    """Atomic: a crash mid-write must not leave half a ledger."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    with os.fdopen(fd, "w") as f:
        json.dump(data, f, indent=1, sort_keys=False, default=str)
        f.write("\n")
    os.replace(tmp, path)


def folder(card: dict) -> str:
    return f"{card['card']}_{card['key']}"


def _blank_asset() -> dict:
    return {"attempt": 0, "versions": [], "review": None, "regenerate": None}


def new_card(row: dict) -> dict:
    c = {"card": int(row["card"]), "common": row["common"], "scientific": row["scientific"],
         "key": key_of(row["scientific"]),
         **{k: row[k] for k in ("regions", "pdf_group", "regions_corrected", "habitat", "safety_flag") if k in row},
         "stages": {s: {"done": False} for s in STAGES}, "collection": None, "selection": None,
         "assets": {a: _blank_asset() for a in ASSETS}, "approval": None, "events": []}
    c["stages"]["pending"] = {"done": True, "at": now()}
    return c


class Ledger:
    def __init__(self, path: pathlib.Path = LEDGER, batches: pathlib.Path | None = None):
        self.path = pathlib.Path(path)
        self.batches = pathlib.Path(batches) if batches else self.path.parent / "batches"
        self.data = json.loads(self.path.read_text()) if self.path.exists() else None

    # -- creation ----------------------------------------------------------------------
    @classmethod
    def init(cls, list_path: pathlib.Path, path: pathlib.Path = LEDGER, batches: pathlib.Path | None = None,
             expect: int = EXPECTED_COUNT) -> "Ledger":
        """Create the queue from an APPROVED list. Refuses anything else, on purpose: the
        older 86-card list must not become the production queue by accident."""
        raw = json.loads(pathlib.Path(list_path).read_text())
        if isinstance(raw, list):
            raise LedgerError(f"{list_path} is a bare list with no approval header. The production list must be an "
                              "object: {\"approved\": true, \"count\": N, \"species\": [...]}.")
        rows = raw.get("species") or []
        if raw.get("approved") is not True:
            raise LedgerError(f"{list_path} is not marked approved:true. Refusing to build a production queue from it.")
        if raw.get("count") != len(rows) or len(rows) != expect:
            raise LedgerError(f"{list_path} declares count={raw.get('count')} with {len(rows)} species; "
                              f"the production list must contain exactly {expect}.")
        nums = [int(r["card"]) for r in rows]
        sci = [key_of(r["scientific"]) for r in rows]
        if len(set(nums)) != len(nums) or len(set(sci)) != len(sci):
            raise LedgerError("duplicate card numbers or species in the list")
        if pathlib.Path(path).exists():
            raise LedgerError(f"{path} already exists; refusing to overwrite a ledger. Use `pd sync` / `pd status`.")
        led = cls.__new__(cls)
        led.path = pathlib.Path(path)
        led.batches = pathlib.Path(batches) if batches else led.path.parent / "batches"
        led.data = {"version": 1, "created": now(),
                    "list": {"file": str(list_path), "sha256": sha256_file(pathlib.Path(list_path)),
                             "count": len(rows), "approved_by": raw.get("approved_by"), "note": raw.get("note")},
                    "cards": {str(r["card"]): new_card(r) for r in rows}}
        led.save()
        return led

    def save(self) -> None:
        write_json(self.path, self.data)

    # -- access ------------------------------------------------------------------------
    def require(self) -> None:
        if self.data is None:
            raise LedgerError(f"no ledger at {self.path}. Create it with `pd init --list <approved list>`.")

    def card(self, n) -> dict:
        self.require()
        c = self.data["cards"].get(str(n))
        if c is None:
            raise LedgerError(f"card #{n} is not in the queue")
        return c

    def cards(self) -> list[dict]:
        self.require()
        return [self.data["cards"][k] for k in sorted(self.data["cards"], key=int)]

    def event(self, c: dict, action: str, **detail) -> None:
        c["events"].append({"at": now(), "action": action, **detail})

    # -- stage logic -------------------------------------------------------------------
    def current_asset_version(self, c: dict, asset: str) -> dict | None:
        vs = c["assets"][asset]["versions"]
        return vs[-1] if vs and vs[-1]["validation"]["ok"] else None

    def asset_status(self, c: dict, asset: str) -> str:
        a = c["assets"][asset]
        if a.get("regenerate"):
            return "regenerate_requested"
        v = self.current_asset_version(c, asset)
        if v is None:
            return "needed"
        r = a.get("review")
        if r and r.get("version") == v["n"]:
            return "review_passed" if r["verdict"] == "pass" else "review_failed"
        return "generated"

    def recompute(self, c: dict) -> None:
        """Set every derived stage flag from the facts. Idempotent."""
        st = c["stages"]
        def flag(name, on, **kw):
            if on and not st[name].get("done"):
                st[name] = {"done": True, "at": now(), **kw}
            elif not on and st[name].get("done"):
                st[name] = {"done": False, "cleared_at": now()}
        statuses = {a: self.asset_status(c, a) for a in ASSETS}
        collected = bool(c.get("collection") and c["collection"].get("candidates"))
        selected = bool(c.get("selection") and all(c["selection"].get(r) for r in ROLE_OF_ASSET.values()))
        have_all = all(s in ("generated", "review_passed", "review_failed") for s in statuses.values())
        board = c.get("preview") and c["preview"].get("versions") == self.versions(c)
        flag("photos_collected", collected)
        flag("photos_selected", selected)
        flag("image_generation_needed", selected and not have_all)
        flag("assets_generated", selected and have_all)
        flag("quality_review", selected and have_all and bool(board))
        revision = [a for a, s in statuses.items() if s in ("review_failed", "regenerate_requested")]
        flag("needs_revision", bool(revision), assets=revision)
        ap = c.get("approval")
        ok = bool(ap) and ap.get("versions") == self.versions(c) and all(s == "review_passed" for s in statuses.values())
        flag("approved", ok)
        if ap and not ok and not c.get("approval_void"):
            c["approval_void"] = {"at": now(), "was": ap}
            c["approval"] = None
            self.event(c, "approval_voided", reason="an asset changed after approval")

    def versions(self, c: dict) -> dict:
        return {a: (self.current_asset_version(c, a) or {}).get("n") for a in ASSETS}

    def current(self, c: dict) -> str:
        st = c["stages"]
        for name in ("approved", "needs_revision", "quality_review", "assets_generated",
                     "image_generation_needed", "photos_selected", "photos_collected"):
            if st[name].get("done"):
                return name
        return "pending"

    # -- collection results (authored by CI, applied here) -----------------------------
    def sync(self) -> list[str]:
        """Apply every batch result file to the ledger. Idempotent; never discards decisions."""
        self.require()
        changed = []
        for rf in sorted(self.batches.glob("batch-*.result.json")):
            res = json.loads(rf.read_text())
            for num, info in res.get("species", {}).items():
                c = self.data["cards"].get(str(num))
                if c is None or not info.get("candidates"):
                    continue
                prev = c.get("collection")
                if prev and prev.get("batch") == res["batch"] and prev.get("built_at") == res.get("built_at"):
                    continue
                if prev and c.get("selection"):
                    # A re-collection must not silently change what was chosen from.
                    old = {x["photo_id"] for x in prev["candidates"]}
                    new = {x["photo_id"] for x in info["candidates"]}
                    if not {c["selection"][r] for r in ROLE_OF_ASSET.values() if c["selection"].get(r)} <= (old | new):
                        continue
                c["collection"] = {"batch": res["batch"], "built_at": res.get("built_at"),
                                   "count": len(info["candidates"]), "shortfall": info.get("shortfall", False),
                                   "notes": info.get("notes", []), "candidates": info["candidates"]}
                self.event(c, "photos_collected", batch=res["batch"], count=len(info["candidates"]))
                self.recompute(c)
                changed.append(f"#{num}")
        if changed:
            self.save()
        return changed

    def batch_requests(self) -> list[dict]:
        out = []
        for rf in sorted(self.batches.glob("batch-*.request.json")):
            req = json.loads(rf.read_text())
            res = rf.with_name(rf.name.replace(".request.", ".result."))
            req["_complete"] = res.exists()
            req["_file"] = str(rf)
            out.append(req)
        return out
