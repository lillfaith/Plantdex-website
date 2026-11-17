"""Stage A (hard rejection) and Stage B (ranking) for one photograph and one image role.

STAGE A rejects only what screen.py could detect RELIABLY. Anything it merely suspects is a flag
that travels with the photo; a flag never rejects.

STAGE B ranks the survivors in the order the owner set, and the weights ARE that order:

   1  botanical recognizability       0.25   a flowering plant that reads as THIS species
   2  completeness of the subject     0.25   nothing important cut off, room to extract
   3  ability to isolate cleanly      0.20   boundary contrast, tidy background, one coherent mass
   4  suitability for the role        0.15   main branch / single flower head / upright stalk
   5  natural perspective             0.05   cannot be measured: neutral, lowered only if suspect
   6  aesthetic appeal                0.05   exposure and colour
   7  resolution and sharpness        0.05

Attractiveness is deliberately worth a twentieth of the score and completeness a quarter, which is
the reverse of what iNaturalist's vote order rewards.

"Recognizability" is a PROXY. It combines how many identifiers agree, whether the observer marked
the plant as flowering, and whether flower colour is actually present in the subject. It is not a
botanical identification and says nothing about whether the plant IS the species; the contact sheet
and the botanical review do that.
"""
from __future__ import annotations

WEIGHTS = {"recognizability": 0.25, "completeness": 0.25, "isolability": 0.20, "role": 0.15,
           "perspective": 0.05, "aesthetic": 0.05, "quality": 0.05}
MIN_SCORE = 45.0
ROLES = ("main", "pixel", "tall")
EXPECTED_FLOWER = {"white": 0.10, "pink_purple": 0.07, "yellow": 0.05}


def id_confidence(obs: dict) -> tuple[float, list[str]]:
    agree = obs.get("identification_agreements") or 0
    dis = obs.get("identification_disagreements") or 0
    flags = []
    c = 0.5 if agree >= 2 else 0.3 if agree == 1 else 0.1
    if dis:
        c *= 0.5
        flags.append(f"id_disputed: {dis} identifier(s) disagreed at some point")
    if agree < 2:
        flags.append(f"id_thin: only {agree} agreeing identification(s); research grade is not proof")
    if obs.get("community_taxon_id") and obs.get("taxon_id") and obs["community_taxon_id"] != obs["taxon_id"]:
        flags.append("id_community_differs: the community taxon is not this species")
        c *= 0.5
    return min(1.0, c / 0.5), flags


def recognizability(ev, obs, kind) -> tuple[float, list[str]]:
    idc, flags = id_confidence(obs)
    flowering = 1.0 if obs.get("flowering_annotation") else 0.4
    share = ev["measure"].get("flower_share", 0.0)
    presence = min(1.0, share / EXPECTED_FLOWER[kind])
    return 0.35 * idc + 0.15 * flowering + 0.50 * presence, flags


def isolability(ev) -> float:
    m = ev["measure"]
    lc = m["largest"]
    return 0.4 * min(1.0, m["boundary_delta_e"] / 35) + 0.3 * (1 - min(1.0, m["bg_green_share"] / 0.8)) + 0.3 * lc["coherence"]


def aesthetic(ev) -> float:
    m = ev["measure"]
    expo = 1.0 - min(1.0, abs(m["exposure_v"] - 0.55) / 0.45)
    return 0.6 * expo + 0.4 * min(1.0, m["colourfulness"] / 0.5)


def quality(orig_long: int, lap_var: float) -> float:
    return 0.5 * min(1.0, orig_long / 3000) + 0.5 * min(1.0, lap_var / 300)


def reason(role: str, ev, obs) -> str:
    m, lc = ev["measure"], ev["measure"]["largest"]
    bits = []
    if role == "main":
        bits.append(f"complete subject, {lc['h_frac']:.0%} of frame height")
        bits.append(f"flower colour {m['flower_share']:.0%}, leaves {m['green_share']:.0%}")
        t = [k for k, v in lc["touch"].items() if v and k != "bottom"]
        bits.append("no top/side contact" if not t else f"touches {'/'.join(t)} edge")
    elif role == "pixel":
        fb = m["flower_blob"]
        if fb is None:
            bits.append("no flower head detected by the colour model (needs visual review)")
            return "; ".join(bits)
        bits.append(f"one head {fb['area']:.0%} of frame, not cropped" if not fb["cropped"] else "head touches frame")
        bits.append(f"stands out from surroundings (dE {fb['ring_delta_e']:.0f})")
        pt = ev.get("pixel_test")
        if pt:
            bits.append(f"24px test: {pt['colours']} colours, {pt['components']} piece(s)")
    else:
        bits.append(f"upright subject {lc['aspect_h_over_w']}:1, {lc['h_frac']:.0%} of frame height")
        bits.append("top intact" if not lc["touch"]["top"] else "top touches frame")
        bits.append(f"{m['stalk_like_components']} competing piece(s)")
    a = obs.get("identification_agreements") or 0
    bits.append(f"{a} agreeing ID(s)")
    if obs.get("flowering_annotation"):
        bits.append("marked flowering")
    return "; ".join(bits)


def score_role(role: str, ev: dict, obs: dict, orig_long: int, kind: str) -> dict:
    """Stage A then Stage B for one role. Always returns a dict; `rejected` says whether it survived."""
    if "error" in ev:
        return {"role": role, "rejected": True, "hard": [f"screen_error: {ev['error']}"], "flags": [], "score": 0.0, "parts": {}}
    r = ev["roles"][role]
    hard = list(ev["common_hard"]) + list(r["hard"])
    flags = list(ev["common_flags"]) + list(r["flags"])
    if hard:
        return {"role": role, "rejected": True, "hard": hard, "flags": flags, "score": 0.0, "parts": {}}
    rec, idflags = recognizability(ev, obs, kind)
    perspective = 0.2 if any(f.startswith("possible_overhead") for f in flags) else 0.5
    parts = {"recognizability": rec, "completeness": r["completeness"], "isolability": isolability(ev),
             "role": r["suitability"], "perspective": perspective, "aesthetic": aesthetic(ev),
             "quality": quality(orig_long, ev["measure"]["lap_var"])}
    score = 100 * sum(WEIGHTS[k] * max(0.0, min(1.0, v)) for k, v in parts.items())
    return {"role": role, "rejected": False, "hard": [], "flags": flags + idflags, "score": round(score, 1),
            "parts": {k: round(v, 3) for k, v in parts.items()}, "reason": reason(role, ev, obs)}


def shortlist(rows: list[dict], role: str, n: int = 12, min_score: float = MIN_SCORE, per_obs: int = 2,
              near_dup=None) -> list[dict]:
    """The best `n` survivors for a role. FEWER than n is correct when the rest are weak: a quota
    filled with poor photographs is exactly what this exists to stop.

    `rows` carry `photo`, `scores[role]` and optionally `hash`. At most `per_obs` per observation,
    and no near-duplicate of one already taken."""
    ok = [r for r in rows if not r["scores"][role]["rejected"] and r["scores"][role]["score"] >= min_score]
    ok.sort(key=lambda r: -r["scores"][role]["score"])
    out, per = [], {}
    for r in ok:
        o = r["photo"]["observation_id"]
        if per.get(o, 0) >= per_obs:
            continue
        if near_dup and r.get("hash") is not None and any(near_dup(r["hash"], q["hash"]) for q in out if q.get("hash") is not None):
            continue
        per[o] = per.get(o, 0) + 1
        out.append(r)
        if len(out) >= n:
            break
    return out
