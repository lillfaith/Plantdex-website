#!/usr/bin/env python3
"""Deterministic lookup-grid generator for ecological regions. PROPOSAL tooling: nothing imports the output.

  python3 -I scripts/regions/region_grid.py --source <dir>/us_eco_l3 --mapping docs/regions/proposed/region-mapping.csv \
      --out docs/regions/proposed --resolutions 0.5,0.25,0.1 --band-km 25

Input : EPA Level III (CONUS) shapefile + the reviewed mapping CSV.   Output: region-grid-<res>.bin and region-grid-manifest.json.

Reproducibility rules (same spirit as the repo's other generated files):
  * cell coordinates are integers (1e-4 degree units) until the single division that turns them into a float;
  * projection is hand-written pure math (no pyproj), so the only libm dependence is sin/cos/log/sqrt on well-separated inputs;
  * every tie (a sample point on a shared edge, a cell with equal counts) breaks on a smaller integer, never on a coordinate;
  * the neighbour band radius is rounded to whole metres before comparing;
  * output is written with a fixed header and LEB128 run lengths, with no compressor in the loop and no timestamps.
Pinned toolchain for the committed bytes: see region-grid-manifest.json ("toolchain"). Cross-machine identity is verified by the
manifest sha256 and tests/eval, but a different GEOS build could in principle change a predicate on a point lying on an edge to
within floating-point noise; the manifest records the versions so any such drift is attributable.
"""
import argparse, csv, hashlib, json, math, os, struct, sys
import numpy as np, shapefile, shapely
from shapely.geometry import shape
from shapely import STRtree

REGIONS = ['NF','NE','AP','SE','GC','MW','GP','RM','SW','PC']          # index+1 is the stored code; 0 = no region
UNC = {'low':0,'medium':1,'high':2}
# grid extent in 1e-4 degree integer units: lon -125.0..-66.5, lat 24.5..49.5 (EPA CONUS bbox is -124.7..-66.9, 24.5..49.4)
LON0_U, LON1_U, LAT0_U, LAT1_U = -1250000, -665000, 245000, 495000

# GRS80 Albers (USGS CONUS): std parallels 29.5/45.5, origin lat 23, central meridian -96
A=6378137.0; F=1/298.257222101; E2=F*(2-F); E=math.sqrt(E2)
def _m(p): s=math.sin(p); return math.cos(p)/math.sqrt(1-E2*s*s)
def _q(p):
    s=math.sin(p); return (1-E2)*(s/(1-E2*s*s)-(1/(2*E))*math.log((1-E*s)/(1+E*s)))
_p1,_p2,_p0=map(math.radians,(29.5,45.5,23.0)); _l0=math.radians(-96.0)
_N=(_m(_p1)**2-_m(_p2)**2)/(_q(_p2)-_q(_p1)); _C=_m(_p1)**2+_N*_q(_p1); _R0=A*math.sqrt(_C-_N*_q(_p0))/_N
def albers(lon,lat):
    """vectorised forward projection; lon/lat in degrees (numpy arrays)."""
    p=np.radians(lat); l=np.radians(lon); s=np.sin(p)
    q=(1-E2)*(s/(1-E2*s*s)-(1/(2*E))*np.log((1-E*s)/(1+E*s)))
    rho=A*np.sqrt(_C-_N*q)/_N; th=_N*(l-_l0)
    return rho*np.sin(th), _R0-rho*np.cos(th)

def load_units(src, mapping):
    mp={}
    with open(mapping,newline='',encoding='utf-8') as f:
        for r in csv.DictReader(f):
            mp[int(r['us_l3_code'])]=(REGIONS.index(r['primary_region'])+1, REGIONS.index(r['secondary_region'])+1 if r['secondary_region'] else 0, UNC[r['uncertainty']])
    rd=shapefile.Reader(src); geoms=[]; codes=[]
    for sr in rd.iterShapeRecords():
        g=shape(sr.shape.__geo_interface__)
        if not g.is_valid: g=shapely.make_valid(g)
        geoms.append(g); codes.append(int(sr.record.as_dict()['US_L3CODE']))
    assert set(codes)==set(mp), 'mapping/unit set mismatch'
    return geoms, np.array(codes), mp

def region_polys(geoms, codes, mp):
    out={}
    for ri in range(1,11):
        parts=[g for g,c in zip(geoms,codes) if mp[int(c)][0]==ri]
        u=shapely.union_all(parts); out[ri]=u.simplify(500.0,preserve_topology=True); shapely.prepare(out[ri])
    return out

def classify_points(tree, codes, x, y):
    """unit code per point (0 = none). A point on a shared edge hits several parts: the smallest unit code wins."""
    pts=shapely.points(x,y); ip,ig=tree.query(pts,predicate='intersects')
    best=np.full(len(x),10**6,dtype=np.int64); np.minimum.at(best,ip,codes[ig]); best[best==10**6]=0
    return best

def build(res, band_km, tree, codes, mp, regions, sub=None):
    ru=int(round(res*10000)); cols=(LON1_U-LON0_U)//ru; rows=(LAT1_U-LAT0_U)//ru
    s=sub or max(3,int(round(res/0.05)))
    # sub-sample lattice offsets in integer 1e-4 units within a cell, row 0 = NORTH row
    off=[(ru*(2*k+1))//(2*s) for k in range(s)]
    ii=np.arange(cols,dtype=np.int64); jj=np.arange(rows,dtype=np.int64)
    unit=np.zeros((rows,cols),dtype=np.int64); region=np.zeros((rows,cols),dtype=np.int64); unc=np.zeros((rows,cols),dtype=np.int64)
    r2u=np.zeros(1000,dtype=np.int64)  # unit -> region lookup
    for c,(p,sec,u) in mp.items(): r2u[c]=p
    sub_units=[]
    for dy in off:
        for dx in off:
            lon=(LON0_U+ii[None,:]*ru+dx)/1e4+np.zeros((rows,1)); lat=(LAT1_U-jj[:,None]*ru-dy)/1e4+np.zeros((1,cols))
            x,y=albers(lon.ravel(),lat.ravel()); sub_units.append(classify_points(tree,codes,x,y).reshape(rows,cols))
    S=np.stack(sub_units)                       # (s*s, rows, cols) unit codes
    # dominant REGION by count, ties -> lowest region index; then dominant unit inside that region, ties -> lowest code
    cnt=np.zeros((11,rows,cols),dtype=np.int32)
    for k in range(S.shape[0]):
        for r in range(1,11): cnt[r]+= (r2u[S[k]]==r)&(S[k]>0)
    region=np.argmax(cnt[1:],axis=0)+1; region[cnt[1:].sum(axis=0)==0]=0
    ucnt={}
    for c in mp:
        ucnt[c]=sum((S[k]==c).astype(np.int32) for k in range(S.shape[0]))
    bestc=np.zeros((rows,cols),dtype=np.int32)
    for c in sorted(mp):                         # ascending code: strict > keeps the smallest on ties
        m=(r2u[c]==region)&(ucnt[c]>bestc); bestc=np.where(m,ucnt[c],bestc); unit=np.where(m,c,unit)
    sec=np.zeros(1000,dtype=np.int64); uu=np.zeros(1000,dtype=np.int64)
    for c,(p,sc,u) in mp.items(): sec[c]=sc if u>=1 else 0; uu[c]=u
    unc=uu[unit]*(region>0)
    # neighbour mask from distance of the CELL CENTRE to each region polygon, widened by the cell's half diagonal
    clon=(LON0_U+ii[None,:]*ru+ru//2)/1e4+np.zeros((rows,1)); clat=(LAT1_U-jj[:,None]*ru-ru//2)/1e4+np.zeros((1,cols))
    cx,cy=albers(clon.ravel(),clat.ravel()); halfdiag_m=0.5*np.hypot(res*111320.0*np.cos(np.radians(clat.ravel())),res*110570.0)
    rad=np.round(band_km*1000.0+halfdiag_m)      # whole metres
    mask=np.zeros(rows*cols,dtype=np.int64); P=shapely.points(cx,cy)
    for r in range(1,11):
        near=shapely.dwithin(P,regions[r],rad)
        mask|=np.where(near,1<<(r-1),0)
    mask=mask.reshape(rows,cols)
    for r in range(1,11): mask&=~np.where(region==r,1<<(r-1),0)       # never list your own region
    mask|=np.where(sec[unit]>0, 1<<(sec[unit]-1),0)                    # a medium/high-uncertainty unit always offers its partner
    mask&=~np.where(region>0,1<<(region-1),0)
    word=(region|(mask<<4)|(unc<<14)).astype(np.uint16)
    return word,cols,rows

def leb(n):
    o=bytearray()
    while True:
        b=n&0x7f; n>>=7
        if n: o.append(b|0x80)
        else: o.append(b); return bytes(o)
def encode(word,cols,rows,res,band_km):
    flat=word.ravel(); out=bytearray(b'PDRG'+struct.pack('<BBHiiHHH',1,0,int(round(res*10000)),LON0_U,LAT1_U,cols,rows,int(band_km)))
    i=0; n=len(flat); body=bytearray()
    while i<n:
        j=i
        while j<n and flat[j]==flat[i]: j+=1
        body+=struct.pack('<H',int(flat[i]))+leb(j-i); i=j
    return bytes(out+body)
def decode(buf):
    assert buf[:4]==b'PDRG'; ver,_,ru,lon0,lat1,cols,rows,band=struct.unpack('<BBHiiHHH',buf[4:4+18]); p=22; flat=[]
    while len(flat)<cols*rows:
        w=struct.unpack('<H',buf[p:p+2])[0]; p+=2; n=0; sh=0
        while True:
            b=buf[p]; p+=1; n|=(b&0x7f)<<sh; sh+=7
            if not b&0x80: break
        flat+= [w]*n
    return np.array(flat,dtype=np.uint16).reshape(rows,cols),(ru,lon0,lat1,cols,rows,band)
def lookup(word,hdr,lat,lon):
    ru,lon0,lat1,cols,rows,band=hdr; i=math.floor((round(lon*1e4)-lon0)/ru); j=math.floor((lat1-round(lat*1e4))/ru)
    if not(0<=i<cols and 0<=j<rows): return None
    w=int(word[j,i]); return {'primary':REGIONS[(w&15)-1] if w&15 else None,'near':[REGIONS[r] for r in range(10) if (w>>(4+r))&1],'unit_uncertainty':['low','medium','high'][(w>>14)&3] if w&15 else None}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--source',required=True); ap.add_argument('--mapping',required=True); ap.add_argument('--out',required=True)
    ap.add_argument('--resolutions',default='0.5,0.25,0.1'); ap.add_argument('--band-km',type=int,default=25); a=ap.parse_args()
    geoms,codes,mp=load_units(a.source,a.mapping)
    tree=STRtree(geoms)
    regions=region_polys(geoms,codes,mp)
    man={'format':'PDRG v1: 22-byte header + (uint16 LE word, LEB128 run) pairs, row-major, north row first',
         'word':'bits0-3 primary region (1..10 = REGIONS order, 0 none); bits4-13 neighbour mask (bit 4+i = REGIONS[i]); bits14-15 unit mapping uncertainty (0 low,1 medium,2 high)',
         'regions':REGIONS,'band_km':a.band_km,'grid_extent_1e-4deg':[LON0_U,LAT0_U,LON1_U,LAT1_U],
         'source':{'file':os.path.basename(a.source),'shp_sha256':hashlib.sha256(open(a.source+'.shp','rb').read()).hexdigest(),'dbf_sha256':hashlib.sha256(open(a.source+'.dbf','rb').read()).hexdigest()},
         'mapping_sha256':hashlib.sha256(open(a.mapping,'rb').read()).hexdigest(),
         'toolchain':{'python':sys.version.split()[0],'numpy':np.__version__,'shapely':shapely.__version__,'geos':shapely.geos_version_string,'pyshp':shapefile.__version__},'grids':[]}
    for r in [float(x) for x in a.resolutions.split(',')]:
        word,cols,rows=build(r,a.band_km,tree,codes,mp,regions); buf=encode(word,cols,rows,r,a.band_km)
        assert (decode(buf)[0]==word).all()
        name=f'region-grid-{r:g}.bin'; open(os.path.join(a.out,name),'wb').write(buf)
        man['grids'].append({'file':name,'resolution_deg':r,'cols':cols,'rows':rows,'bytes':len(buf),'sha256':hashlib.sha256(buf).hexdigest()})
        print(name,cols,rows,len(buf),flush=True)
    open(os.path.join(a.out,'region-grid-manifest.json'),'w',encoding='utf-8').write(json.dumps(man,indent=1,sort_keys=True)+'\n')
if __name__=='__main__': main()
