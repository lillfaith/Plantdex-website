#!/usr/bin/env python3
"""Write one row per blind test point with truth, grid and polygon answers side by side (PROPOSAL tooling).
  python3 -I scripts/regions/point_table.py --points <csv> --poly <asset> --grid <bin> --out <csv>"""
import argparse, csv, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import polygon_resolver as PR, region_grid as RG
def main():
    ap = argparse.ArgumentParser(); [ap.add_argument(f'--{n}', required=True) for n in ('points', 'poly', 'grid', 'out')]; a = ap.parse_args()
    res = PR.Resolver(open(a.poly, 'rb').read()); gw, gh = RG.decode(open(a.grid, 'rb').read()); rows = []
    for p in csv.DictReader(open(a.points, encoding='utf-8')):
        lat, lon = float(p['lat']), float(p['lon']); r = res.lookup(lat, lon); g = RG.lookup(gw, gh, lat, lon)
        gp = '' if g is None else (g['primary'] or ''); truth = p['truth_region']
        rows.append({'id': p['id'], 'stratum': p['stratum'], 'label': p['label'], 'lat': p['lat'], 'lon': p['lon'], 'truth_unit': p['truth_unit'], 'truth_region': truth,
          'truth_unit_state': p['truth_state'], 'grid_region': gp, 'grid_near': ' '.join(g['near']) if g else '', 'grid_ok': 'yes' if gp == truth else 'NO',
          'poly_region': r['region'] or '', 'poly_unit': r.get('unit', ''), 'poly_unit_state': r.get('unitState', ''), 'poly_unit_alternatives': ' '.join(r.get('unitAlternatives', [])),
          'poly_neighbours_within_10km': ' '.join(r.get('neighbours', []) + r.get('nearRegions', [])), 'poly_near_coverage_edge_km': r.get('nearCoverageEdgeKm', ''),
          'poly_ok': 'yes' if (r['region'] or '') == truth else 'NO'})
    with open(a.out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator='\n'); w.writeheader(); w.writerows(rows)
    print(len(rows), sum(r['grid_ok'] == 'NO' for r in rows), 'grid wrong;', sum(r['poly_ok'] == 'NO' for r in rows), 'poly wrong')
if __name__ == '__main__': main()
