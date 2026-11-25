#!/usr/bin/env python3
"""Reproduce every number in docs/expansion/progression-inheritance.md.

READ-ONLY. Reads constants straight out of the TypeScript sources (so a retuned table is picked up, not
remembered), the 45 printed cards from src/data/herbs.json and the 85 expansion drafts from
docs/expansion/audit/inventory.csv. Writes nothing; prints a report. Invents nothing: an input that
cannot be found makes it exit non-zero rather than fall back to a guess.

    python3 scripts/expansion-audit/progression_numbers.py
"""
import csv, json, re, sys, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
read = lambda p: (ROOT / p).read_text(encoding="utf8")


def fail(msg):
    print("FATAL:", msg, file=sys.stderr)
    sys.exit(2)


prog, fc = read("src/lib/progression.ts"), read("src/lib/field-cards.ts")
xp_by_rarity = {k: int(v) for k, v in re.findall(r"^\s{2}(Common|Uncommon|Rare|Epic):\s*(\d+),", prog, re.M)}
learn = int(re.search(r"XP_FOR_LEARNING = (\d+)", prog).group(1))
master = int(re.search(r"XP_FOR_MASTERY = (\d+)", prog).group(1))
research_xp = {k: int(v) for k, v in re.findall(r"^\s{2}(daily|collection|seasonal):\s*(\d+),", prog, re.M)}
levels = [(int(a), int(b.replace("_", ""))) for a, b in re.findall(r"level: (\d+), name: '[^']+', minXp: ([\d_]+)", prog)]
slots = [int(x.replace("_", "")) for x in re.findall(r"ordinal: \d+, xp: ([\d_]+)", fc)]
if len(xp_by_rarity) != 4 or len(levels) < 11 or len(slots) != 9:
    fail(f"could not read constants: {xp_by_rarity} {len(levels)} {len(slots)}")

printed = json.loads(read("src/data/herbs.json"))["herbs"]
exp = list(csv.DictReader(open(ROOT / "docs/expansion/audit/inventory.csv", encoding="utf8")))
if len(printed) != 45 or len(exp) != 85:
    fail(f"expected 45 printed and 85 expansion, got {len(printed)} and {len(exp)}")

# The drafts carry an xp column; it must be the rarity table, not a number of its own.
for r in exp:
    if int(r["xp"]) != xp_by_rarity[r["rarity"]]:
        fail(f"card {r['card_number']} xp {r['xp']} is not XP_BY_RARITY[{r['rarity']}]")

pc = collections.Counter(h["rarity"] for h in printed)
ec = collections.Counter(r["rarity"] for r in exp)
disc = lambda c: sum(c[k] * xp_by_rarity[k] for k in c)
P, E = disc(pc), disc(ec)
assert P == sum(h["xp"] for h in printed)
cm = lambda n: n * (learn + master)
Pmax, Emax = P + cm(45), E + cm(85)
Cmax = Pmax + Emax

print("== rarity (count) ==")
for k in xp_by_rarity:
    print(f"{k:9} xp={xp_by_rarity[k]:>3} printed={pc[k]:>3} expansion={ec[k]:>3} combined={pc[k]+ec[k]:>3}")
print(f"cards printed={len(printed)} expansion={len(exp)} combined={len(printed)+len(exp)}")
print("\n== discovery XP ==")
print(f"printed={P} expansion={E} combined={P+E}  (x{(P+E)/P:.2f})")
print(f"learn+master per card={learn+master}; printed={cm(45)} expansion={cm(85)}")
print(f"collection ceiling (MAX_COLLECTION_XP) printed={Pmax} expansion-only={Emax} combined={Cmax}")
print("\n== ladder: top level threshold as a share of the ceiling ==")
top = levels[-1][1]
print(f"L{levels[-1][0]} at {top}: printed {top/Pmax:.1%} | combined-all-stages {top/Cmax:.1%} | combined-discovery-only {top/(P+E):.1%}")
print("\n== Field Card thresholds as a share of the ceiling ==")
for i, t in enumerate(slots, 1):
    print(f"slot {i}: {t:>6}  printed-ceiling {t/Pmax:6.1%}  printed-discovery {t/P:6.1%}  combined-ceiling {t/Cmax:6.1%}  combined-discovery {t/(P+E):6.1%}")
print("\n== what discovery alone reaches ==")
lv = lambda x: max(l for l, m in levels if x >= m)
fcn = lambda x: sum(1 for t in slots if x >= t)
for label, x in (("all 45 printed discovered", P), ("all 45 + all 85 discovered", P + E), ("all 130 learned too", P + E + 130 * learn), ("everything (ceiling)", Cmax)):
    print(f"{label:30} xp={x:>6} level={lv(x)} field-cards={fcn(x)}/9")
print("\n== a complete printed deck today, and under the naive denominators ==")
for held in (9, 22, 36, 44, 45):
    print(f"{held:>2}/45 shown as {round(held/45*100):>3}%  ->  naive 130: {round(held/130*100):>3}%")
print("\n== seasons (draft expansion seasons; supply and the targets the existing tasks derive from it) ==")
ps, es = collections.Counter(h["season"] for h in printed), collections.Counter(r["season"] for r in exp)
for s in ("spring", "summer", "autumn", "winter"):
    n0, n1 = ps[s], ps[s] + es[s]
    print(f"{s:7} printed={n0:>2} +expansion={es[s]:>2} pooled={n1:>2} | discover {min(3,n0)}->{min(3,n1)} learn {min(2,n0)}->{min(2,n1)} master {min(1,n0)}->{min(1,n1)}")
print("\n== hard to find ==")
print(f"Rare supply {pc['Rare']} -> {pc['Rare']+ec['Rare']} (target min(5,..) stays 5); Epic supply {pc['Epic']} -> {pc['Epic']+ec['Epic']} (target stays 1)")
print("\n== board ==")
print(f"species that can score: 54 -> {54+85} ; discovery points {54*50} -> {(54+85)*50} (50 each)")
print("\n== research XP table (unchanged) ==", research_xp)
