#!/usr/bin/env python3
"""Emit docs/regions/proposed/region-mapping.csv from the reviewed table below.

PROPOSAL tooling only: nothing imports this. The table is the hand-reviewed judgement; the script adds the
unit names, EPA Level I names and areas read from the EPA shapefile so a typo in a code or name fails loudly.

  python3 -I scripts/regions/make_mapping_csv.py --source /path/to/us_eco_l3 --out docs/regions/proposed/region-mapping.csv

Regions are the ten PlantDex codes. THEIR DEFINITIONS WERE NOT FOUND IN THE REPO; the working expansion in
region-mapping-methods.md s2 is an ASSUMPTION and every row inherits it.
"""
import argparse, csv, collections
import shapefile  # pyshp

REGIONS = ['NF','NE','AP','SE','GC','MW','GP','RM','SW','PC']
# code: (primary, secondary-or-'', uncertainty low|medium|high, rationale)
T = {
 1:('PC','', 'low','Coastal temperate rainforest range; Pacific coast.'),
 2:('PC','', 'low','Puget trough, Pacific maritime lowland.'),
 3:('PC','', 'low','Willamette valley, Pacific maritime lowland.'),
 4:('PC','RM','medium','Cascade crest and west slope are Pacific; the dry east slope is unit 9.'),
 5:('PC','RM','medium','Sierra Nevada is Pacific-slope California; east flank grades to Great Basin (RM by assumption).'),
 6:('PC','', 'low','Californian foothills and coastal ranges; card sheet places California in Pacific Coast.'),
 7:('PC','', 'low','Central Valley of California.'),
 8:('PC','SW','medium','Transverse/Peninsular ranges: coastal-facing slopes Pacific, desert-facing slopes Southwest.'),
 9:('PC','RM','high','Rain-shadow slopes; ecologically closer to the interior but inside the Cascade range. Coin-flip between PC and RM.'),
 10:('RM','PC','medium','Columbia Plateau sagebrush steppe: Intermountain West group; borders Pacific Northwest.'),
 11:('RM','PC','medium','Blue Mountains: Intermountain forests, close to the Cascades.'),
 12:('RM','', 'low','Snake River Plain: Intermountain West.'),
 13:('RM','SW','medium','Great Basin is Intermountain West by the sheet label; its southern end merges with the Mojave (SW).'),
 14:('SW','PC','medium','Mojave desert; the card sheet files California buckwheat under PC and SW.'),
 15:('RM','', 'low','Northern Rockies.'),
 16:('RM','', 'low','Idaho Batholith, Rocky Mountain forests.'),
 17:('RM','', 'low','Middle Rockies.'),
 18:('RM','GP','medium','Wyoming Basin: Intermountain basin, but its eastern edge opens onto the Great Plains.'),
 19:('RM','', 'low','Wasatch and Uinta mountains.'),
 20:('SW','RM','high','Colorado Plateau: desert plateau (SW) but part of the Rocky Mountain/Intermountain physiography; genuinely both.'),
 21:('RM','SW','low','Southern Rockies; southern end in New Mexico borders SW.'),
 22:('SW','RM','high','Arizona/New Mexico Plateau: high desert/woodland plateau; SW vs RM is a judgement.'),
 23:('SW','RM','medium','Arizona/New Mexico mountains (Mogollon Rim, Sacramento Mts): sky-island forests; SW by geography, RM by vegetation.'),
 24:('SW','GP','medium','Chihuahuan Desert; grades into Great Plains grassland on the Texas side.'),
 25:('GP','', 'low','High Plains.'),
 26:('GP','SW','medium','Southwestern Tablelands (Llano Estacado, Canadian breaks) blend into SW and RM foothills.'),
 27:('GP','', 'low','Central Great Plains.'),
 28:('GP','MW','medium','Flint Hills tallgrass prairie; is the eastern prairie edge, close to Midwest.'),
 29:('GP','SE','medium','Cross Timbers: oak savanna mosaic between prairie and eastern forest.'),
 30:('GP','SW','medium','Edwards Plateau: Texas Hill Country; transitions to Chihuahuan and Gulf flora.'),
 31:('GP','GC','high','South Texas brush country: subtropical, borders Gulf coast and Chihuahuan; no clean home.'),
 32:('GP','GC','medium','Blackland Prairies: tallgrass prairie remnant bordering the Gulf coastal plain.'),
 33:('SE','GC','medium','Post-oak woods of east-central Texas; EPA treats as Eastern Temperate Forest.'),
 34:('GC','GP','medium','Western Gulf Coastal Plain (coastal prairie, Houston): EPA Level I says Great Plains, but it is the Gulf coast.'),
 35:('SE','GC','medium','Piney woods of Arkansas/Louisiana/east Texas: inland coastal plain.'),
 36:('MW','SE','high','Ouachita Mountains. Interior Highlands have no natural home in a ten-region scheme; owner decision.'),
 37:('MW','SE','high','Arkansas Valley; Interior Highlands, as unit 36.'),
 38:('MW','SE','high','Boston Mountains; Interior Highlands, as unit 36.'),
 39:('MW','SE','medium','Ozark Highlands; Interior Highlands, as unit 36 but Missouri-side flora is Midwest-leaning.'),
 40:('MW','GP','medium','Central Irregular Plains (Missouri/Iowa/Kansas): tallgrass prairie and oak-hickory; Midwest/Plains edge.'),
 41:('RM','', 'low','Canadian Rockies (Montana/Idaho).'),
 42:('GP','', 'low','Northwestern Glaciated Plains.'),
 43:('GP','', 'low','Northwestern Great Plains.'),
 44:('GP','', 'low','Nebraska Sand Hills.'),
 45:('SE','', 'low','Piedmont: the "Southeast Piedmont" named in the product design.'),
 46:('GP','MW','medium','Northern Glaciated Plains: prairie pothole region.'),
 47:('MW','GP','medium','Western Corn Belt: EPA Level I = Great Plains, but the agricultural Midwest; tallgrass prairie history.'),
 48:('GP','NF','medium','Lake Agassiz Plain (Red River valley): prairie, bordering northern forest.'),
 49:('NF','', 'low','Northern Minnesota wetlands: boreal.'),
 50:('NF','', 'low','Northern Lakes and Forests.'),
 51:('MW','NF','medium','North Central Hardwood Forests: transition between Midwest and northern forest.'),
 52:('MW','', 'low','Driftless Area.'),
 53:('MW','', 'low','Southeastern Wisconsin till plains.'),
 54:('MW','', 'low','Central Corn Belt.'),
 55:('MW','', 'low','Eastern Corn Belt.'),
 56:('MW','', 'low','Southern Michigan / northern Indiana drift plains.'),
 57:('MW','NE','medium','Huron/Erie lake plains: Great Lakes lowland, borders northeastern units.'),
 58:('NF','NE','medium','Adirondacks, northern New England: northern forest; grades toward Northeast.'),
 59:('NE','', 'medium','Northeastern coastal zone (southern New England coast, Cape Cod).'),
 60:('AP','NE','medium','Northern Allegheny Plateau: dissected plateau, Appalachian; New York Southern Tier side is Northeast.'),
 61:('NE','MW','high','Erie Drift Plain: Great Lakes lowland between Northeast, Appalachia and Midwest.'),
 62:('AP','NF','high','North Central Appalachians (PA Wilds): EPA Level I Northern Forests; Appalachian geography.'),
 63:('GC','NE','medium','Middle Atlantic Coastal Plain (Delmarva to Carolinas): Atlantic coastal plain; northern part reads Northeast.'),
 64:('NE','SE','medium','Northern Piedmont (PA/MD/NJ): northern end of the Piedmont; Northeast vs Southeast Piedmont is the line the product must choose.'),
 65:('SE','GC','medium','Southeastern Plains: inland coastal plain, named "Inland Plains" in the product design; borders Gulf & Atlantic Coastal Plains.'),
 66:('AP','', 'low','Blue Ridge.'),
 67:('AP','', 'low','Ridge and Valley.'),
 68:('AP','', 'low','Southwestern Appalachians (Cumberland Plateau).'),
 69:('AP','', 'low','Central Appalachians.'),
 70:('AP','MW','medium','Western Allegheny Plateau: Appalachian plateau grading into Midwest in Ohio.'),
 71:('SE','MW','high','Interior Plateau (Nashville Basin, Pennyrile, cedar glades): neither Appalachian nor coastal; SE vs MW is a judgement.'),
 72:('MW','SE','medium','Interior River Valleys and Hills (southern IL/IN/MO).'),
 73:('GC','SE','medium','Mississippi Alluvial Plain: floodplain forests; Gulf-connected lowland, but runs north to Missouri.'),
 74:('SE','MW','medium','Mississippi Valley Loess Plains.'),
 75:('GC','', 'low','Southern Coastal Plain: "Gulf & Atlantic Coastal Plains" proper.'),
 76:('GC','', 'low','South Florida: subtropical coastal plain.'),
 77:('PC','RM','low','North Cascades.'),
 78:('PC','', 'medium','Klamath-Siskiyou and north coast range of California.'),
 79:('SW','', 'low','Madrean Archipelago: sky islands of southeast Arizona.'),
 80:('RM','SW','medium','Northern Basin and Range: Intermountain West.'),
 81:('SW','', 'low','Sonoran desert.'),
 82:('NF','NE','high','Acadian Plains and Hills (Maine, New Brunswick border): boreal-influenced; EPA Level I Eastern Temperate Forests.'),
 83:('NE','MW','medium','Eastern Great Lakes lowlands (Lake Ontario plain).'),
 84:('NE','GC','medium','Atlantic coastal pine barrens (NJ, Long Island, Cape Cod); coastal-plain flora.'),
 85:('PC','SW','medium','Southern California coast and Northern Baja.'),
}
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--source',required=True); ap.add_argument('--out',required=True); a=ap.parse_args()
    r=shapefile.Reader(a.source); area=collections.defaultdict(float); meta={}
    for rec in r.iterRecords():
        d=rec.as_dict(); k=int(d['US_L3CODE']); area[k]+=d['Shape_Area']; meta[k]=(d['US_L3NAME'],d['NA_L3CODE'],d['NA_L1NAME'])
    assert sorted(meta)==sorted(T), f'unit set mismatch: missing {set(meta)-set(T)}, extra {set(T)-set(meta)}'
    with open(a.out,'w',newline='',encoding='utf-8') as f:
        w=csv.writer(f,lineterminator='\n')
        w.writerow(['us_l3_code','us_l3_name','na_l3_code','epa_level1_name','area_km2','primary_region','secondary_region','straddles','uncertainty','rationale','status'])
        for k in sorted(T):
            p,s,u,why=T[k]; assert p in REGIONS and (s=='' or s in REGIONS) and u in ('low','medium','high') and p!=s
            w.writerow([k,meta[k][0],meta[k][1],meta[k][2],round(area[k]/1e6),p,s,'yes' if s else 'no',u,why,'PROPOSED-UNREVIEWED'])
    c=collections.Counter(v[0] for v in T.values()); print(len(T),'units',dict(sorted(c.items())))
if __name__=='__main__': main()
