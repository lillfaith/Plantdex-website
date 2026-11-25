#!/usr/bin/env python3
"""Run docs/regions/proposed/validation-points.csv through the full polygons AND every grid. PROPOSAL tooling.
Public places only; no person's coordinates are used or stored anywhere.

  python3 -I scripts/regions/validate_points.py --source <dir>/us_eco_l3 --mapping .../region-mapping.csv --grids docs/regions/proposed
"""
import argparse, csv, glob, importlib.util, os
import numpy as np, shapely
def load_gen():
    p=os.path.join(os.path.dirname(os.path.abspath(__file__)),'region_grid.py'); s=importlib.util.spec_from_file_location('region_grid',p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); return m
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--source',required=True); ap.add_argument('--mapping',required=True); ap.add_argument('--grids',required=True); a=ap.parse_args(); g=load_gen()
    geoms,codes,mp=g.load_units(a.source,a.mapping); tree=shapely.STRtree(geoms)
    names={}
    import csv as c2
    for r in c2.DictReader(open(a.mapping,encoding='utf-8')): names[int(r['us_l3_code'])]=r['us_l3_name']
    grids=[]
    for fn in sorted(glob.glob(os.path.join(a.grids,'region-grid-*.bin')),key=lambda f:-float(os.path.basename(f)[12:-4])):
        w,h=g.decode(open(fn,'rb').read()); grids.append((os.path.basename(fn)[12:-4],w,h))
    print('| point | category | expected | full polygons (unit -> region) | '+' | '.join(f'grid {n}' for n,_,_ in grids)+' |'); print('|'+'---|'*(4+len(grids)))
    for r in csv.DictReader(open('docs/regions/proposed/validation-points.csv',encoding='utf-8')):
        lat,lon=float(r['lat']),float(r['lon']); x,y=g.albers(np.array([lon]),np.array([lat])); u=int(g.classify_points(tree,codes,x,y)[0])
        full=f"{names[u]} -> {g.REGIONS[mp[u][0]-1]}" if u else 'none'
        cells=[]
        for n,w,h in grids:
            q=g.lookup(w,h,lat,lon)
            cells.append('outside extent' if q is None else (f"{q['primary'] or 'none'}"+(f" (+{','.join(q['near'])})" if q['near'] else '')))
        print(f"| {r['name']} | {r['category']} | {r['expected_primary'] or 'none'} | {full} | "+' | '.join(cells)+' |')
if __name__=='__main__': main()
