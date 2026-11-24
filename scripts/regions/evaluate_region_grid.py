#!/usr/bin/env python3
"""Measure the lookup grids against the FULL polygons. PROPOSAL tooling; writes a JSON report and prints a summary.

  python3 -I scripts/regions/evaluate_region_grid.py --source <dir>/us_eco_l3 --mapping docs/regions/proposed/region-mapping.csv \
      --grids docs/regions/proposed --report docs/regions/proposed/region-grid-evaluation.json

Truth = the EPA Level III polygon containing a point, mapped through the CSV. Sample points are the centres of a 3 km equal-area raster
(Albers) cells that fall inside any polygon, so every statistic is AREA-WEIGHTED land share without extra weighting. Distance to a
boundary is the distance to the nearest 3 km cell of a DIFFERENT region (so coast and national borders are not 'boundaries'), accurate to ~3 km.
Needs scipy and pyproj (evaluation only; the generator needs neither).
"""
import argparse, glob, importlib.util, json, os
import numpy as np, shapely
from scipy import ndimage
from pyproj import Transformer

def load_gen():
    p=os.path.join(os.path.dirname(os.path.abspath(__file__)),'region_grid.py'); s=importlib.util.spec_from_file_location('region_grid',p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); return m

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--source',required=True); ap.add_argument('--mapping',required=True); ap.add_argument('--grids',required=True); ap.add_argument('--report',required=True)
    ap.add_argument('--cell-km',type=float,default=3.0); a=ap.parse_args(); g=load_gen()
    geoms,codes,mp=g.load_units(a.source,a.mapping); regions=g.region_polys(geoms,codes,mp); tree=shapely.STRtree(geoms)
    step=a.cell_km*1000.0; x0,x1,y0,y1=-2360000.0,2260000.0,270000.0,3175000.0
    xs=np.arange(x0+step/2,x1,step); ys=np.arange(y1-step/2,y0,-step); X,Y=np.meshgrid(xs,ys); sh=X.shape
    unit=g.classify_points(tree,codes,X.ravel(),Y.ravel()); r2u=np.zeros(1000,dtype=np.int64)
    for c,(p,s,u) in mp.items(): r2u[c]=p
    L=r2u[unit].reshape(sh); land=L>0; print('land cells',int(land.sum()),'area km2',int(land.sum()*a.cell_km**2),flush=True)
    # distance (km) to the nearest cell of each region; boundary distance for a cell of region A = min over B != A
    D=np.full((11,)+sh,np.inf)
    for r in range(1,11): D[r]=ndimage.distance_transform_edt(L!=r)*a.cell_km
    dother=np.full(sh,np.inf)
    for r in range(1,11): dother=np.where(L==r,np.minimum(dother,np.min(np.stack([D[b] for b in range(1,11) if b!=r]),axis=0)),dother)
    tr=Transformer.from_crs('+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs','EPSG:4326',always_xy=True)
    lon,lat=tr.transform(X[land],Y[land]); truth=L[land]; db=dother[land]; unitl=unit.reshape(sh)[land]
    # cross-check of the hand-written projection against pyproj
    px,py=g.albers(lon[:20000],lat[:20000]); proj_err=float(np.max(np.hypot(px-X[land][:20000],py-Y[land][:20000])))
    rep={'cell_km':a.cell_km,'land_cells':int(land.sum()),'land_area_km2':int(land.sum()*a.cell_km**2),'albers_vs_pyproj_max_error_m':round(proj_err,4),'regions':g.REGIONS,
         'land_share_by_region_pct':{g.REGIONS[r-1]:round(100*float((truth==r).mean()),2) for r in range(1,11)},
         'land_share_within_km_of_other_region_pct':{str(k):round(100*float((db<=k).mean()),2) for k in (5,10,25,50,100)},
         'land_share_by_unit_uncertainty_pct':{n:round(100*float(np.mean([mp[int(u)][2]==i for u in unitl])) if False else 100*float(np.isin(unitl,[c for c,v in mp.items() if v[2]==i]).mean()),2) for i,n in enumerate(['low','medium','high'])},
         'grids':[]}
    for fn in sorted(glob.glob(os.path.join(a.grids,'region-grid-*.bin')),key=lambda f:-float(os.path.basename(f)[12:-4])):
        buf=open(fn,'rb').read(); word,hdr=g.decode(buf); ru,lon0,lat1,cols,rows,band=hdr
        i=np.floor((np.round(lon*1e4)-lon0)/ru).astype(int); j=np.floor((lat1-np.round(lat*1e4))/ru).astype(int)
        ok=(i>=0)&(i<cols)&(j>=0)&(j<rows); w=np.zeros(len(lon),dtype=np.int64); w[ok]=word[j[ok],i[ok]]
        prim=w&15; wrong=prim!=truth; mask=(w>>4)&1023; tbit=(1<<(truth-1)); flagged=(mask&tbit)>0
        err=wrong; near=mask>0; sliver=err&(prim==0); swap=err&(prim>0)
        e={'file':os.path.basename(fn),'resolution_deg':ru/1e4,'bytes_rle':len(buf),'bytes_raw_uint16':cols*rows*2,'bytes_gzip9':len(__import__('zlib').compress(buf,9)),'cells':cols*rows,
           'accuracy_pct':round(100*(1-float(err.mean())),3),'wrong_land_share_pct':round(100*float(err.mean()),3),
           'wrong_resolves_no_region_pct':round(100*float((err&(prim==0)).mean()),3),
           'errors_wrong_region_land_share_pct':round(100*float(swap.mean()),3),'errors_coastal_sliver_no_region_land_share_pct':round(100*float(sliver.mean()),3),
           'wrong_region_boundary_distance_km':{'mean':round(float(db[swap].mean()),1),'p95':round(float(np.percentile(db[swap],95)),1),'max':round(float(db[swap].max()),1)},
           'wrong_region_errors_flagged_pct':round(100*float(flagged[swap].mean()),2),'sliver_errors_flagged_pct':round(100*float(flagged[sliver].mean()),2),
           'land_in_high_uncertainty_units_pct':round(100*float((((w>>14)&3)==2)[prim>0].mean()),2),
           'error_boundary_distance_km':{'mean':round(float(db[err].mean()),1) if err.any() else 0,'p95':round(float(np.percentile(db[err],95)),1) if err.any() else 0,'max':round(float(db[err].max()),1) if err.any() else 0},
           'errors_with_true_region_in_neighbour_flag_pct':round(100*float(flagged[err].mean()),2) if err.any() else 100.0,
           'errors_unflagged_land_share_pct':round(100*float((err&~flagged).mean()),4),
           'land_flagged_near_boundary_pct':round(100*float(near.mean()),2),
           'accuracy_pct_beyond_km_of_boundary':{str(k):round(100*float((~err[db>k]).mean()),3) for k in (5,10,25,50)}}
        rep['grids'].append(e); print(json.dumps(e),flush=True)
    json.dump(rep,open(a.report,'w'),indent=1,sort_keys=True); open(a.report,'a').write('\n')
if __name__=='__main__': main()
