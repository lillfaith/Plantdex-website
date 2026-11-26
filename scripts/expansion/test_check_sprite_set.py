#!/usr/bin/env python3
"""Mutation tests for check_sprite_set.py: a checker that cannot fail proves nothing.

Run: python3 scripts/expansion/test_check_sprite_set.py

Takes one SHIPPED sprite (read-only), breaks it in one specific way in memory, and asserts
the matching rule goes FAIL while the unbroken sprite does not. Writes nothing, and touches
neither public/ nor any source, so it is safe to run beside `npm test`.
"""

from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_sprite_set as cs  # noqa: E402

BASE_ID = "plantago-major"


def base_entry():
    entries = cs.load_set(cs.SOURCE_DIR)
    stem = BASE_ID.replace("-", "_")
    entry = entries[stem]
    return stem, {"path": entry["path"], "text": entry["text"], "sprite": copy.deepcopy(entry["sprite"]), "error": None}


def run(mutate=None, text=None):
    stem, entry = base_entry()
    if mutate:
        mutate(entry["sprite"])
    if text is not None:
        entry["text"] = text(entry["text"])
    # Compared against the deck minus itself, as --control does.
    pool = {i: o for i, o in cs.load_existing(set()).items() if i != BASE_ID}
    ctx = {
        "fill": cs.frame_fill(),
        "existing_ids": set(),
        "existing_sprites": {i: o["sprite"] for i, o in pool.items()},
        "existing_personality": {i: o["sprite"]["personality"] for i, o in pool.items()},
        "existing_foliage": {},
        "set_sprites": {entry["sprite"].get("herbId", BASE_ID): entry["sprite"]},
        "set_personality": {entry["sprite"].get("herbId", BASE_ID): entry["sprite"].get("personality", "")},
    }
    return cs.check_card(stem, entry, ctx).results


class Mutations(unittest.TestCase):
    def test_unmodified_shipped_sprite_has_no_failures(self):
        failing = {k: v["detail"] for k, v in run().items() if v["status"] == cs.FAIL}
        self.assertEqual(failing, {})

    def test_unsupported_frame_count(self):
        self.assertEqual(run(lambda s: s.update(frames=15))["R04"]["status"], cs.FAIL)

    def test_loop_longer_than_three_seconds(self):
        self.assertEqual(run(lambda s: s.update(fps=4, frames=14))["R04"]["status"], cs.FAIL)

    def test_missing_stage(self):
        self.assertEqual(run(lambda s: s["stages"].pop("sprout"))["R05"]["status"], cs.FAIL)

    def test_disconnected_frame_zero(self):
        def mutate(s):
            s["parts"].append({"name": "stray", "origin": (0, 0), "rows": ["o"]})
        self.assertEqual(run(mutate)["R08"]["status"], cs.FAIL)

    def test_eyes_off_the_face(self):
        def mutate(s):
            eyes = next(p for p in s["parts"] if p["name"] == "eyes")
            eyes["origin"] = (eyes["origin"][0] + 9, eyes["origin"][1] - 6)
        self.assertEqual(run(mutate)["R09"]["status"], cs.FAIL)

    def test_face_removed(self):
        def mutate(s):
            s["parts"] = [p for p in s["parts"] if p["name"] not in ("eyes", "mouth", "cheeks")]
            s["motion"] = {k: v for k, v in s["motion"].items() if k not in ("eyes", "mouth", "cheeks")}
        self.assertEqual(run(mutate)["R09"]["status"], cs.FAIL)

    def test_pixels_dropped_off_canvas_at_rest(self):
        def mutate(s):
            s["parts"].append({"name": "off", "origin": (31, 0), "rows": ["oo", "oo"]})
        self.assertEqual(run(mutate)["R07"]["status"], cs.FAIL)

    def test_colour_missing_from_palette(self):
        def mutate(s):
            s["palette"].pop(next(c for c in s["palette"] if c not in cs.FACE_CHARS))
        self.assertEqual(run(mutate)["R10"]["status"], cs.FAIL)

    def test_semi_transparent_palette_entry(self):
        def mutate(s):
            c = next(c for c in s["palette"] if c not in cs.FACE_CHARS)
            r, g, b, _ = s["palette"][c]
            s["palette"][c] = (r, g, b, 128)
        self.assertEqual(run(mutate)["R10"]["status"], cs.FAIL)

    def test_face_colour_drift_is_flagged(self):
        def mutate(s):
            s["palette"]["F"] = (200, 200, 200, 255)
        self.assertEqual(run(mutate)["R10"]["status"], cs.WARN)

    def test_duplicate_personality(self):
        other = next(
            o["sprite"]["personality"] for i, o in cs.load_existing(set()).items() if i != BASE_ID
        )
        self.assertEqual(run(lambda s: s.update(personality=other))["R13"]["status"], cs.FAIL)

    def test_medicinal_personality_label(self):
        self.assertEqual(run(lambda s: s.update(personality="soothing"))["R16"]["status"], cs.FAIL)

    def test_face_only_animation_has_no_gesture(self):
        def mutate(s):
            s["motion"] = {k: v for k, v in s["motion"].items() if k in ("eyes", "cheeks", "mouth")}
        self.assertEqual(run(mutate)["R14"]["status"], cs.FAIL)

    def test_forbidden_import(self):
        self.assertEqual(
            run(text=lambda t: "import random\n" + t)["R17"]["status"], cs.FAIL
        )


if __name__ == "__main__":
    unittest.main(verbosity=1)
