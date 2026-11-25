#!/usr/bin/env python3
"""Blind validation points for the region resolvers (PROPOSAL tooling).

  python3 -I scripts/regions/make_test_points.py --source <dir>/us_eco_l3 --out docs/regions/proposed/resolver-test-points.csv

BLINDNESS. This script reads ONLY the official, unsimplified EPA polygons and the reviewed unit->region table. It imports neither the
0.1-degree grid nor the simplified-polygon builder, and it was written, run and committed before either polygon-resolver file existed.
Seed 20261124 (the research date) feeds Python's random.Random; the draws are in a fixed order, so the same inputs give the same CSV.

Strata (all points are public places or random geometry; no person's location is used):
  A  70  uniform random over the lower-48 bounding box, kept when the point is inside an official polygon (land)
  B  70  as A but kept only when an official unit carried in a DIFFERENT region lies within 12 km (boundary-biased)
  C1 25  land within 4 km of the edge of coverage (coast or national border)
  C2 25  OUTSIDE coverage within 6 km of the edge (sea, Canada, Mexico): truth is 'none'
  D  named places: known misclassifications, cross-border, coasts, islands, Alaska, Hawaii, Puerto Rico, offshore, lakes
Truth = the official polygon containing the point, mapped through mapping_v2_table.T (the polygon-in-unit test is exact; see make_mapping_v2.py).
"""
import argparse, csv, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, shapefile
from shapely.geometry import shape, Point
from shapely.ops import unary_union
from shapely import STRtree
from region_grid import albers
from mapping_v2_table import T

SEED = 20261124
NAMED = [  # label, lat, lon : approximate public coordinates, 2 decimals
 ('Memphis TN (known grid error)',35.15,-90.05),('Washington DC (known grid error)',38.90,-77.04),('Tijuana MX',32.53,-117.04),
 ('San Diego CA border at San Ysidro',32.55,-117.03),('Ciudad Juarez MX',31.69,-106.42),('El Paso TX',31.76,-106.49),
 ('Nogales Sonora MX',31.33,-110.94),('Nogales AZ',31.34,-110.93),('Matamoros MX',25.87,-97.50),('Brownsville TX',25.90,-97.50),
 ('Niagara Falls ON',43.09,-79.08),('Buffalo NY',42.89,-78.88),('Windsor ON',42.32,-83.04),('Detroit MI',42.33,-83.05),
 ('Vancouver BC',49.28,-123.12),('Blaine WA',48.99,-122.75),('Montreal QC',45.50,-73.57),('Sault Ste Marie ON',46.52,-84.35),
 ('Cape Hatteras NC',35.25,-75.53),('Key West FL',24.56,-81.78),('Dry Tortugas',24.63,-82.87),('Cape Cod Provincetown MA',42.05,-70.19),
 ('Nantucket MA',41.28,-70.10),('Block Island RI',41.17,-71.58),('Long Island Montauk NY',41.07,-71.86),('Mackinac Island MI',45.85,-84.62),
 ('Isle Royale MI',48.00,-88.85),('Galveston TX',29.30,-94.80),('Padre Island TX',27.10,-97.40),('Outer Banks Corolla NC',36.38,-75.83),
 ('Santa Catalina Island CA',33.39,-118.42),('San Francisco CA',37.77,-122.42),('Memphis west bank AR',35.13,-90.15),
 ('Little Rock AR',34.75,-92.29),('Philadelphia PA',39.95,-75.17),('Baltimore MD',39.29,-76.61),('Atlanta GA',33.75,-84.39),
 ('Anchorage AK',61.22,-149.90),('Fairbanks AK',64.84,-147.72),('Juneau AK',58.30,-134.42),('Honolulu HI',21.31,-157.86),
 ('Hilo HI',19.72,-155.09),('San Juan PR',18.47,-66.11),('Ponce PR',18.01,-66.61),('Charlotte Amalie VI',18.34,-64.93),
 ('Gulf of Mexico offshore',26.00,-90.00),('Atlantic offshore',33.00,-70.00),('Pacific offshore',37.00,-128.00),
 ('Lake Michigan mid-lake',43.50,-87.00),('Lake Superior mid-lake',47.50,-88.00),('Lake Erie mid-lake',42.20,-81.20),
 ('Toronto ON',43.65,-79.38),('Monterrey MX',25.67,-100.31),('Havana CU',23.13,-82.38),('Nassau BS',25.05,-77.35),
]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--source', required=True); ap.add_argument('--out', required=True); a = ap.parse_args()
    rd = shapefile.Reader(a.source); geoms = []; codes = []
    for sr in rd.iterShapeRecords():
        geoms.append(shape(sr.shape.__geo_interface__)); codes.append(int(sr.record['US_L3CODE']))
    tree = STRtree(geoms); cover = unary_union(geoms); edge = cover.boundary
    def proj(lon, lat):
        x, y = albers(np.array([lon]), np.array([lat])); return Point(float(x[0]), float(y[0]))
    def truth(p):
        for j in sorted(tree.query(p, predicate='intersects'), key=lambda j: codes[int(j)]):
            return codes[int(j)]
        return None
    def other_region_within(p, unit, km):
        reg = T[unit][1]
        return any(T[codes[int(j)]][1] != reg for j in tree.query(p.buffer(km * 1000), predicate='intersects'))
    rng = random.Random(SEED); rows = []
    def add(stratum, label, lon, lat):
        p = proj(lon, lat); u = truth(p)
        rows.append({'id': f'P{len(rows)+1:03d}', 'stratum': stratum, 'label': label, 'lon': f'{lon:.4f}', 'lat': f'{lat:.4f}',
                     'truth_unit': '' if u is None else u, 'truth_region': '' if u is None else T[u][1],
                     'truth_state': '' if u is None else T[u][0]})
    def draw(): return rng.uniform(-124.8, -66.9), rng.uniform(24.5, 49.4)
    n = 0
    while n < 70:
        lon, lat = draw(); p = proj(lon, lat)
        if truth(p) is not None: add('A uniform land', '', round(lon, 4), round(lat, 4)); n += 1
    n = 0
    while n < 70:
        lon, lat = draw(); p = proj(lon, lat); u = truth(p)
        if u is not None and other_region_within(p, u, 12): add('B near region boundary', '', round(lon, 4), round(lat, 4)); n += 1
    n = 0
    while n < 25:
        lon, lat = draw(); p = proj(lon, lat)
        if truth(p) is not None and edge.distance(p) < 4000: add('C1 land at coverage edge', '', round(lon, 4), round(lat, 4)); n += 1
    n = 0
    while n < 25:
        lon, lat = rng.uniform(-126.0, -65.5), rng.uniform(23.5, 50.5); p = proj(lon, lat)
        if truth(p) is None and cover.distance(p) < 6000: add('C2 outside, within 6 km', '', round(lon, 4), round(lat, 4)); n += 1
    for label, lat, lon in NAMED: add('D named place', label, lon, lat)
    with open(a.out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator='\n'); w.writeheader(); w.writerows(rows)
    print(len(rows), 'points')
if __name__ == '__main__': main()
