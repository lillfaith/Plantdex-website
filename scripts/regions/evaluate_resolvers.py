#!/usr/bin/env python3
"""Compare the simplified-polygon resolver and the 0.1 degree grid with the official polygons (PROPOSAL tooling).

  python3 -I scripts/regions/evaluate_resolvers.py --source <dir>/us_eco_l3 --points docs/regions/proposed/resolver-test-points.csv \
      --poly 50=a.bin,100=b.bin,200=c.bin --grid grid-0.1.bin --out docs/regions/proposed/v2/resolver-evaluation.json

Truth is ALWAYS the unsimplified EPA polygon mapped through mapping_v2_table.T. Part 1 scores the 245 blind points. Part 2 scores a 6 km
equal-area raster of the lower 48 (area-weighted). Part 3 checks the pure-Python lookup against shapely on the decoded geometry.
"""
import argparse, csv, json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, shapefile, shapely
from shapely.geometry import shape, Polygon
from shapely import STRtree
import polygon_resolver as PR
import region_grid as RG
from mapping_v2_table import T

def load_truth(src):
    rd = shapefile.Reader(src); geoms = []; codes = []
    for sr in rd.iterShapeRecords(): geoms.append(shape(sr.shape.__geo_interface__)); codes.append(int(sr.record['US_L3CODE']))
    return geoms, np.array(codes)

def decoded_shapely(res):
    out = []
    for u in res.units:
        g = None
        for ring in u['rings']:
            p = Polygon(ring).buffer(0) if len(ring) >= 3 else None
            if p is None: continue
            g = p if g is None else g.symmetric_difference(p)
        shapely.prepare(g); out.append((u['code'], g))
    return out

def poly_region_vector(units, lon, lat):
    """first unit (ascending code) containing each point wins; returns unit code array (0 none)"""
    best = np.zeros(len(lon), dtype=np.int64); lonu = np.round(lon * 1e4); latu = np.round(lat * 1e4)
    for code, g in sorted(units):
        m = (best == 0) & shapely.contains_xy(g, lonu, latu) ; best[m] = code
    return best

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--source', required=True); ap.add_argument('--points', required=True)
    ap.add_argument('--poly', required=True); ap.add_argument('--grid', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--raster-km', type=float, default=6.0); a = ap.parse_args()
    pts = list(csv.DictReader(open(a.points, encoding='utf-8')))
    polys = {}
    for spec in a.poly.split(','):
        tol, path = spec.split('=', 1); buf = open(path, 'rb').read(); polys[int(tol)] = (PR.Resolver(buf), len(buf), path)
    gword, ghdr = RG.decode(open(a.grid, 'rb').read()); gsize = os.path.getsize(a.grid)
    result = {'n_points': len(pts), 'methods': {}}
    def score(name, fn):
        per = {}; rows = []
        for p in pts:
            lat, lon = float(p['lat']), float(p['lon']); r = fn(lat, lon); truth = p['truth_region'] or None
            prim = r['primary']; near = set(r['near']); ok = prim == truth
            row = {'id': p['id'], 'stratum': p['stratum'], 'label': p['label'], 'truth': truth, 'got': prim, 'near': sorted(near), 'ok': ok,
                   'wrong_but_truth_in_flag': (not ok) and truth is not None and truth in near,
                   'false_region_outside': truth is None and prim is not None, 'missed_land': truth is not None and prim is None,
                   'wrong_region_on_land': truth is not None and prim is not None and prim != truth, 'flagged': bool(near) or r.get('uncertain', False)}
            rows.append(row)
        def agg(rs):
            n = len(rs); land = [r for r in rs if r['truth']]; out = [r for r in rs if not r['truth']]
            wrong = [r for r in rs if not r['ok']]
            return {'n': n, 'correct': sum(r['ok'] for r in rs), 'land_n': len(land), 'land_correct': sum(r['ok'] for r in land),
                    'outside_n': len(out), 'outside_correct': sum(r['ok'] for r in out),
                    'wrong_region_on_land': sum(r['wrong_region_on_land'] for r in rs), 'missed_land': sum(r['missed_land'] for r in rs),
                    'false_region_outside': sum(r['false_region_outside'] for r in rs), 'errors': len(wrong),
                    'errors_with_truth_in_neighbour_flag': sum(r['wrong_but_truth_in_flag'] for r in wrong),
                    'errors_not_flagged': [r['id'] + ' ' + (r['label'] or r['stratum']) + f" truth={r['truth']} got={r['got']}" for r in wrong if not r['wrong_but_truth_in_flag']],
                    'flagged_share_of_land_points': round(sum(r['flagged'] for r in land) / max(1, len(land)), 3)}
        strata = sorted({r['stratum'] for r in rows}); res = {'all': agg(rows)}
        for s in strata: res[s] = agg([r for r in rows if r['stratum'] == s])
        res['wrong_rows'] = [r for r in rows if not r['ok']]
        return res
    def grid_fn(lat, lon):
        r = RG.lookup(gword, ghdr, lat, lon)
        if r is None: return {'primary': None, 'near': []}
        return {'primary': r['primary'], 'near': r['near'], 'uncertain': r['unit_uncertainty'] == 'high'}
    result['methods']['grid_0.1'] = {'bytes': gsize, 'points': score('grid', grid_fn)}
    for tol, (res, size, path) in sorted(polys.items()):
        def fn(lat, lon, res=res):
            r = res.lookup(lat, lon)
            return {'primary': r['region'], 'near': r.get('neighbours', []), 'uncertain': r.get('unitState') == 'uncertain'}
        result['methods'][f'polygon_tol{tol}'] = {'bytes': size, 'tol_1e-4deg': tol, 'points': score('poly', fn)}
    # ---- part 2: raster, area weighted
    geoms, codes = load_truth(a.source); tree = STRtree(geoms)
    km = a.raster_km * 1000.0; xs = np.arange(-2360000 + km / 2, 2260000, km); ys = np.arange(270000 + km / 2, 3175000, km)
    X, Y = np.meshgrid(xs, ys); X = X.ravel(); Y = Y.ravel()
    ip, ig = tree.query(shapely.points(X, Y), predicate='intersects'); best = np.full(len(X), 10 ** 6); np.minimum.at(best, ip, codes[ig]); best[best == 10 ** 6] = 0
    land = best > 0; X, Y, best = X[land], Y[land], best[land]
    lonlat = np.array([PR.inverse_albers(float(x), float(y)) for x, y in zip(X, Y)]); lon, lat = lonlat[:, 0], lonlat[:, 1]
    reg_of = {c: T[c][1] for c in T}; truth_reg = np.array([reg_of[int(c)] for c in best]); truth_unc = np.array([T[int(c)][0] for c in best])
    n_land = len(X); result['raster'] = {'cell_km': a.raster_km, 'land_cells': int(n_land), 'land_area_km2': int(n_land * a.raster_km ** 2)}
    for tol, (res, size, path) in sorted(polys.items()):
        units = decoded_shapely(res); got = poly_region_vector(units, lon, lat); gr = np.array([reg_of.get(int(c), '') for c in got])
        wrong = gr != truth_reg; none = got == 0
        result['raster'][f'polygon_tol{tol}'] = {'land_correct_pct': round(100 * (1 - wrong.mean()), 3), 'wrong_region_pct': round(100 * ((wrong & ~none).mean()), 3),
            'no_region_on_land_pct': round(100 * none.mean(), 3), 'wrong_unit_pct': round(100 * (got != best).mean(), 3)}
    gl = []
    for la, lo in zip(lat, lon):
        r = RG.lookup(gword, ghdr, float(la), float(lo)); gl.append('' if r is None or r['primary'] is None else r['primary'])
    gl = np.array(gl); w = gl != truth_reg
    result['raster']['grid_0.1'] = {'land_correct_pct': round(100 * (1 - w.mean()), 3), 'wrong_region_pct': round(100 * ((w & (gl != '')).mean()), 3),
        'no_region_on_land_pct': round(100 * (gl == '').mean(), 3)}
    # ---- part 3: pure-Python lookup == shapely on the decoded geometry (largest tolerance and smallest)
    rng = np.random.default_rng(20261124); idx = rng.choice(n_land, size=min(1500, n_land), replace=False); mism = {}
    for tol, (res, size, path) in sorted(polys.items()):
        units = decoded_shapely(res); sh = poly_region_vector(units, lon[idx], lat[idx]); m = 0
        for k, i in enumerate(idx):
            u = res.unit_at(round(lon[i] * 1e4), round(lat[i] * 1e4)); c = 0 if u is None else u['code']
            m += (c != sh[k])
        mism[f'polygon_tol{tol}'] = int(m)
    result['lookup_vs_shapely_mismatches_of_1500'] = mism
    json.dump(result, open(a.out, 'w'), indent=1, sort_keys=True); print(json.dumps({k: v for k, v in result.items() if k != 'methods'}, indent=1))
    for k, v in result['methods'].items():
        al = v['points']['all']; print(k, v['bytes'], 'bytes', 'correct', al['correct'], '/', al['n'], 'land', al['land_correct'], '/', al['land_n'], 'outside', al['outside_correct'], '/', al['outside_n'],
                                       'errors', al['errors'], 'flagged-truth', al['errors_with_truth_in_neighbour_flag'])
if __name__ == '__main__': main()
