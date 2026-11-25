#!/usr/bin/env python3
"""Build region-mapping-v2.csv (PROPOSAL): the reviewed table + computed facts (area, Level II group, outline shared with other regions).

  python3 -I scripts/regions/make_mapping_v2.py --source <dir>/us_eco_l3 --out docs/regions/proposed/region-mapping-v2.csv

Adjacency is computed, not asserted: each unit's outline is cut into quantised (1e-4 degree) edges; an edge owned by two units is shared.
For each unit the share of its outline that touches a unit carried in another region is reported, a geometric line of evidence beside the
reviewer's reading of the names. Fails if any of the 85 units has no reviewed row, or a row has an unknown region, state or basis.
"""
import argparse, csv, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shapefile
import polygon_resolver as PR
from mapping_v2_table import T

REGIONS = {'NF': 'Northern Forests & Boreal', 'NE': 'Northeast & Atlantic Woodlands', 'AP': 'Appalachian–Ozark Highlands',
 'SE': 'Southeast Piedmont & Inland Plains', 'GC': 'Gulf & Atlantic Coastal Plains', 'MW': 'Great Lakes & Central Woodlands',
 'GP': 'Great Plains & Prairie Transitions', 'RM': 'Rockies & Intermountain Highlands', 'SW': 'Southwest Deserts & Drylands',
 'PC': 'Pacific Forests & California'}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--source', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--v1', default='docs/regions/proposed/region-mapping.csv'); a = ap.parse_args()
    rd = shapefile.Reader(a.source); units = {}; rings = []
    for sr in rd.iterShapeRecords():
        d = sr.record.as_dict(); c = int(d['US_L3CODE']); sh = sr.shape
        units.setdefault(c, {'name': d['US_L3NAME'], 'l2': d['NA_L2NAME'], 'area': 0.0}); units[c]['area'] += float(d['Shape_Area'])
        parts = list(sh.parts) + [len(sh.points)]
        for x, y in zip(parts, parts[1:]):
            q = []
            for px, py in sh.points[x:y]:
                lo, la = PR.inverse_albers(px, py); pt = (round(lo * 1e4), round(la * 1e4))
                if not q or q[-1] != pt: q.append(pt)
            if len(q) > 1 and q[0] == q[-1]: q.pop()
            if len(q) >= 3: rings.append((c, q))
    missing = sorted(set(units) - set(T)); extra = sorted(set(T) - set(units))
    if missing or extra: raise SystemExit(f'table mismatch: missing {missing}, extra {extra}')
    for c, (st, p, alts, basis, why) in T.items():
        if p not in REGIONS or any(x and x not in REGIONS for x in alts.split(',')): raise SystemExit(f'bad region in row {c}')
        if st not in ('assigned', 'assigned-near', 'uncertain') or basis not in ('NAME', 'GEO', 'OWNER'): raise SystemExit(f'bad state/basis row {c}')
        if (st == 'assigned') == bool(alts): raise SystemExit(f'row {c}: assigned has no alternative, every other state needs one')
    v1 = {}
    if os.path.exists(a.v1):
        for r in csv.DictReader(open(a.v1, encoding='utf-8')): v1[int(r['us_l3_code'])] = r['primary_region']
    owners = {}
    for c, q in rings:
        for i in range(len(q)):
            e, f = q[i], q[(i + 1) % len(q)]; owners.setdefault((e, f) if e < f else (f, e), set()).add(c)
    outline = {c: 0.0 for c in units}; shared = {c: {} for c in units}
    for (e, f), ow in owners.items():
        L = math.hypot((e[0] - f[0]) * 1e-4 * math.cos(math.radians((e[1] + f[1]) / 2e4)), (e[1] - f[1]) * 1e-4) * 111.195
        for c in ow:
            outline[c] += L
            for o in ow:
                if o != c: shared[c][T[o][1]] = shared[c].get(T[o][1], 0.0) + L
    rows = []
    for c in sorted(units):
        st, p, alts, basis, why = T[c]; other = {k: v / outline[c] for k, v in shared[c].items() if k != p}
        edge = ';'.join(f'{k}:{v*100:.0f}%' for k, v in sorted(other.items(), key=lambda kv: (-kv[1], kv[0])) if v >= 0.02)
        alt_ok = all((x in other) for x in alts.split(',') if x)
        rows.append({'us_l3_code': c, 'us_l3_name': units[c]['name'], 'epa_level2': units[c]['l2'], 'area_km2': round(units[c]['area'] / 1e6),
          'state': st, 'primary_region': p, 'primary_region_name': REGIONS[p], 'alternatives': alts, 'basis': basis,
          'outline_shared_with_other_regions': edge, 'alternative_borders_unit': 'yes' if alt_ok else 'NO (alternative is a reading of character, not adjacency)',
          'v1_assumed_primary': v1.get(c, ''), 'changed_from_v1': 'yes' if v1.get(c, p) != p else '', 'rationale': why,
          'review_status': 'PROPOSED-UNREVIEWED (reviewer judgement, not verified against a floristic source)'})
    with open(a.out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator='\n'); w.writeheader(); w.writerows(rows)
    with open(os.path.join(os.path.dirname(a.out), 'region-legend.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n'); w.writerow(['code', 'name_exact_from_regionNames', 'source'])
        for k, v in REGIONS.items(): w.writerow([k, v, 'regionalModel.regionNames, commit a9953722'])
    print({s: sum(1 for r in rows if r['state'] == s) for s in ('assigned', 'assigned-near', 'uncertain')},
          'changed from v1:', sum(1 for r in rows if r['changed_from_v1']), 'alt not bordering:', [r['us_l3_code'] for r in rows if r['alternative_borders_unit'] != 'yes'])
if __name__ == '__main__': main()
