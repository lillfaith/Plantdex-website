#!/usr/bin/env python3
"""Build region-mapping-v2.csv (PROPOSAL): the reviewed table + computed facts (area, Level II group, boundary adjacency by region).

  python3 -I scripts/regions/make_mapping_v2.py --source <dir>/us_eco_l3 --out docs/regions/proposed/region-mapping-v2.csv

Adjacency is computed, not asserted: for each unit, the share of its outline that touches a unit carried in another region
(1 km tolerance on shared edges). It is a second, geometric line of evidence beside the reviewer's reading of the names.
"""
import argparse, csv, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shapefile
from shapely.geometry import shape
from shapely import STRtree
from mapping_v2_table import T

REGIONS = {'NF':'Northern Forests & Boreal','NE':'Northeast & Atlantic Woodlands','AP':'Appalachian–Ozark Highlands',
 'SE':'Southeast Piedmont & Inland Plains','GC':'Gulf & Atlantic Coastal Plains','MW':'Great Lakes & Central Woodlands',
 'GP':'Great Plains & Prairie Transitions','RM':'Rockies & Intermountain Highlands','SW':'Southwest Deserts & Drylands',
 'PC':'Pacific Forests & California'}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--source', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--v1', default='docs/regions/proposed/region-mapping.csv'); a = ap.parse_args()
    rd = shapefile.Reader(a.source)
    units = {}
    for sr in rd.iterShapeRecords():
        d = sr.record.as_dict(); c = int(d['US_L3CODE']); g = shape(sr.shape.__geo_interface__)
        u = units.setdefault(c, {'name': d['US_L3NAME'], 'l2': d['NA_L2NAME'], 'l1': d['NA_L1NAME'], 'geoms': []}); u['geoms'].append(g)
    from shapely.ops import unary_union
    for c, u in units.items(): u['geom'] = unary_union(u['geoms'])
    missing = sorted(set(units) - set(T)); extra = sorted(set(T) - set(units))
    if missing or extra: raise SystemExit(f'table mismatch: missing {missing}, extra {extra}')
    for c, (st, p, alts, basis, why) in T.items():
        if p not in REGIONS or any(x and x not in REGIONS for x in alts.split(',')): raise SystemExit(f'bad region in row {c}')
        if st not in ('assigned', 'assigned-near', 'uncertain') or basis not in ('NAME', 'GEO', 'OWNER'): raise SystemExit(f'bad state/basis row {c}')
        if st == 'assigned' and alts: raise SystemExit(f'row {c}: assigned rows have no alternative')
        if st != 'assigned' and not alts: raise SystemExit(f'row {c}: {st} needs an alternative')
    v1 = {}
    if os.path.exists(a.v1):
        for r in csv.DictReader(open(a.v1, encoding='utf-8')): v1[int(r['us_l3_code'])] = r['primary_region']
    codes = sorted(units); tree = STRtree([units[c]['geom'] for c in codes])
    rows = []
    for c in codes:
        u = units[c]; g = u['geom']; bnd = g.boundary; tot = bnd.length; share = {}
        for j in tree.query(g.buffer(1000)):
            o = codes[int(j)]
            if o == c: continue
            L = bnd.intersection(units[o]['geom'].buffer(1000)).length
            if L > 0: share[T[o][1]] = share.get(T[o][1], 0) + L
        st, p, alts, basis, why = T[c]
        other = {k: v / tot for k, v in share.items() if k != p}
        edge = ';'.join(f'{k}:{v*100:.0f}%' for k, v in sorted(other.items(), key=lambda kv: (-kv[1], kv[0])) if v >= 0.02)
        alt_ok = all((x in other) or not x for x in alts.split(',')) if alts else True
        rows.append({'us_l3_code': c, 'us_l3_name': u['name'], 'epa_level2': u['l2'], 'area_km2': round(g.area / 1e6),
          'state': st, 'primary_region': p, 'primary_region_name': REGIONS[p], 'alternatives': alts, 'basis': basis,
          'outline_shared_with_other_regions': edge, 'alternative_touches_unit': 'yes' if alt_ok else 'NO (alternative does not border this unit)',
          'v1_assumed_primary': v1.get(c, ''), 'changed_from_v1': 'yes' if v1.get(c, p) != p else '', 'rationale': why,
          'review_status': 'PROPOSED-UNREVIEWED (reviewer judgement, not verified against a floristic source)'})
    with open(a.out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator='\n'); w.writeheader(); w.writerows(rows)
    leg = os.path.join(os.path.dirname(a.out), 'region-legend.csv')
    with open(leg, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n'); w.writerow(['code', 'name_exact_from_regionNames', 'source']); [w.writerow([k, v, 'regionalModel.regionNames, a9953722']) for k, v in REGIONS.items()]
    n = {s: sum(1 for r in rows if r['state'] == s) for s in ('assigned', 'assigned-near', 'uncertain')}
    ar = {s: sum(r['area_km2'] for r in rows if r['state'] == s) for s in n}; T_ = sum(ar.values())
    print(n, {s: f'{ar[s]/T_*100:.1f}%' for s in ar}, 'changed from v1:', sum(1 for r in rows if r['changed_from_v1']))
    print('alternative not bordering:', [r['us_l3_code'] for r in rows if r['alternative_touches_unit'] != 'yes'])
if __name__ == '__main__': main()
