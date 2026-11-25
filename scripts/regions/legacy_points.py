#!/usr/bin/env python3
"""Re-run the 54 places from the first report's validation-points.csv through the v2 resolvers, with truth from the official polygons (PROPOSAL tooling).
  python3 -I scripts/regions/legacy_points.py --source <dir>/us_eco_l3 --points validation-points.csv --poly <asset> --grid <bin> --out <csv>
These coordinates were chosen in the first report AFTER seeing the grid's failures, so they are an adversarial regression set, not a blind one."""
import argparse, csv, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, shapefile
from shapely.geometry import shape, Point
from shapely import STRtree
import polygon_resolver as PR, region_grid as RG
from region_grid import albers
from mapping_v2_table import T
def main():
    ap = argparse.ArgumentParser(); [ap.add_argument(f'--{n}', required=True) for n in ('source', 'points', 'poly', 'grid', 'out')]; a = ap.parse_args()
    rd = shapefile.Reader(a.source); geoms = []; codes = []
    for sr in rd.iterShapeRecords(): geoms.append(shape(sr.shape.__geo_interface__)); codes.append(int(sr.record['US_L3CODE']))
    tree = STRtree(geoms); res = PR.Resolver(open(a.poly, 'rb').read()); gw, gh = RG.decode(open(a.grid, 'rb').read()); rows = []
    pts = list(csv.DictReader(open(a.points, encoding='utf-8'))); k = list(pts[0])
    for p in pts:
        name = p[k[0]]; lat = float(p.get('lat') or p.get('latitude')); lon = float(p.get('lon') or p.get('longitude'))
        x, y = albers(np.array([lon]), np.array([lat])); hit = sorted(codes[int(j)] for j in tree.query(Point(float(x[0]), float(y[0])), predicate='intersects'))
        truth = T[hit[0]][1] if hit else ''; r = res.lookup(lat, lon); g = RG.lookup(gw, gh, lat, lon); gp = '' if g is None else (g['primary'] or '')
        rows.append({'place': name, 'lat': lat, 'lon': lon, 'truth_unit': hit[0] if hit else '', 'truth_region': truth, 'grid': gp, 'grid_near': ' '.join(g['near']) if g else '',
                     'poly': r['region'] or '', 'poly_near': ' '.join(r.get('neighbours', []) + r.get('nearRegions', [])), 'grid_ok': 'yes' if gp == truth else 'NO', 'poly_ok': 'yes' if (r['region'] or '') == truth else 'NO'})
    with open(a.out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator='\n'); w.writeheader(); w.writerows(rows)
    for r in rows:
        if r['grid_ok'] == 'NO' or r['poly_ok'] == 'NO': print(r)
    print(len(rows), 'places;', sum(r['grid_ok'] == 'NO' for r in rows), 'grid wrong;', sum(r['poly_ok'] == 'NO' for r in rows), 'polygon wrong')
if __name__ == '__main__': main()
