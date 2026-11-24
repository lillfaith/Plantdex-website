# PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW
"""Phase 1 evidence collection for the 45 original cards. Read-only; writes only under
docs/regions/membership/. Only api.gbif.org is used: POWO and efloras answer 403 (Cloudflare)
and plants.usda.gov redirects to a host the proxy refuses, so those are RECORDED AS BLOCKED, never
filled from memory. WCVP (the dataset behind POWO) and GRIIS are read as GBIF-hosted checklists and
labelled as such. Usage: python3 scripts/regions/membership/collect_evidence.py
"""
import csv, json, os, sys, time, urllib.parse, urllib.request, urllib.error, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT = os.path.join(ROOT, 'docs', 'regions', 'membership')
RAW = os.path.join(OUT, 'raw')
API = 'https://api.gbif.org/v1/'
WCVP = 'f382f0ce-323a-4091-bb9f-add557f3a9a2'
GRIIS_US = '32ad19ed-6b89-447a-9242-795c0897f345'
USDA_DS = '705922f7-5ba5-49ab-a75d-722e3090e690'
TODAY = datetime.date.today().isoformat()
BASES = ['PRESERVED_SPECIMEN', 'HUMAN_OBSERVATION']
STATUS = '# PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW'


def get(path, **params):
    url = API + path + ('?' + urllib.parse.urlencode(params, doseq=True) if params else '')
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return url, json.load(r)
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))


def save(name, obj):
    with open(os.path.join(RAW, name), 'w') as f:
        json.dump({'_status': 'PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW', **obj}, f, indent=1, sort_keys=False)


def herbs():
    d = json.load(open(os.path.join(ROOT, 'src/data/herbs.json')))
    rows = d['herbs'] if 'herbs' in d else d['cards']
    return rows


def gid_names(prefix, country, n):
    """Map GADM level-1 ids to names by reading one real record per id (not from memory)."""
    out = {}
    for i in range(1, n + 1):
        gid = f'{prefix}.{i}_1'
        _, r = get('occurrence/search', gadmLevel1Gid=gid, country=country, limit=1)
        if r['results']:
            out[gid] = r['results'][0].get('stateProvince') or r['results'][0].get('verbatimLocality') or '?'
    return out


def main():
    os.makedirs(RAW, exist_ok=True)
    cards = herbs()
    fn = os.path.join(RAW, 'gadm-level1-names.json')
    if os.path.exists(fn):
        names = json.load(open(fn))
    else:
        names = {'US': gid_names('USA', 'US', 60), 'CA': gid_names('CAN', 'CA', 14)}
        # read the name from the record's own gadm block rather than its verbatim state string
        for cc, pre in (('US', 'USA'), ('CA', 'CAN')):
            for gid in list(names[cc]):
                _, r = get('occurrence/search', gadmLevel1Gid=gid, country=cc, limit=1)
                g = (r['results'][0].get('gadm') or {}).get('level1') or {}
                if g.get('name'):
                    names[cc][gid] = g['name']
        save('gadm-level1-names.json', {'retrieved_on': TODAY, 'names': names})
        names = json.load(open(fn))
    names = names.get('names', names)
    rows, summary = [], {}

    def add(c, source, url, ctype, value, notes=''):
        rows.append(dict(card_number=c['_n'], herb_id=c['id'], scientific_name=c['scientificName'], source=source,
                         url=url, retrieved_on=TODAY, claim_type=ctype, claim_text_or_value=value, notes=notes))

    blocked = [
        ('POWO', 'https://powo.science.kew.org/api/2/search?q=', 'HTTP 403 (Cloudflare "Attention Required") on every powo.science.kew.org path tried'),
        ('Flora of North America (efloras)', 'https://efloras.org/', 'HTTP 403 (Cloudflare "Just a moment") on efloras.org; www.efloras.org does not resolve'),
        ('USDA PLANTS', 'https://plants.usda.gov/', 'HTTP 301 to plants.sc.egov.usda.gov, which the proxy refuses (CONNECT 403); GBIF-hosted USDA PLANTS checklist holds no name usages for these taxa'),
    ]
    for i, c in enumerate(cards, 1):
        c['_n'] = c.get('cardNumber') or c.get('number') or i
        sci = c['scientificName']
        genus_only = sci.endswith(' spp.')
        q = sci.replace(' spp.', '')
        _, m = get('species/match', name=q, kingdom='Plantae', **({'rank': 'GENUS'} if genus_only else {}))
        save(f'{c["id"]}-match.json', {'query': q, 'result': m})
        murl = API + 'species/match?name=' + urllib.parse.quote(q)
        add(c, 'GBIF backbone', murl, 'backbone_match',
            f'{m.get("scientificName")} | rank={m.get("rank")} | status={m.get("status")} | matchType={m.get("matchType")} | confidence={m.get("confidence")}',
            'accepted-name check against the GBIF backbone')
        for s, u, why in blocked:
            add(c, s, u, 'source_unreachable', 'NOT RETRIEVED', why)
        key = m.get('genusKey') if genus_only else (m.get('speciesKey') or m.get('usageKey'))
        entry = {'card_number': c['_n'], 'backbone': m.get('scientificName'), 'backbone_status': m.get('status'),
                 'taxon_key': key, 'genus_only': genus_only, 'wcvp': None, 'gbif': {}}
        # WCVP via GBIF
        if genus_only:
            add(c, 'WCVP (via GBIF)', API + 'species?name=' + urllib.parse.quote(q) + '&datasetKey=' + WCVP,
                'wcvp_range', 'NOT APPLICABLE', 'card names a genus (spp.); WCVP distributions are per species and no species was chosen')
        else:
            url, r = get('species', name=q, datasetKey=WCVP, limit=100)
            hit = [x for x in r['results'] if x.get('canonicalName') == q]
            cand = '; '.join(f'{x["scientificName"]} [{x["taxonomicStatus"]}, key {x["key"]}, nub {x.get("nubKey")}]' for x in hit)
            bb = m.get('usageKey')
            pick = ([x for x in hit if x['taxonomicStatus'] == 'ACCEPTED' and x.get('nubKey') == bb]
                    or [x for x in hit if x['taxonomicStatus'] == 'ACCEPTED']
                    or [x for x in hit if x['taxonomicStatus'] == 'SYNONYM' and x.get('nubKey') == bb]
                    or [x for x in hit if x['taxonomicStatus'] == 'SYNONYM'])
            if not pick:
                add(c, 'WCVP (via GBIF)', url, 'wcvp_range', 'NOT FOUND', 'no usable name usage with this canonical name in the WCVP checklist on GBIF; candidates: ' + (cand or 'none'))
            else:
                x = pick[0]
                acc = x
                if x.get('taxonomicStatus') != 'ACCEPTED' and x.get('acceptedKey'):
                    _, acc = get(f'species/{x["acceptedKey"]}')
                    add(c, 'WCVP (via GBIF)', url, 'name_status',
                        f'{x["scientificName"]} is {x["taxonomicStatus"]} in WCVP; accepted = {acc["scientificName"]}',
                        'card name kept verbatim; accepted-name difference recorded, not applied. WCVP candidates with this name: ' + cand)
                else:
                    add(c, 'WCVP (via GBIF)', url, 'name_status', f'{x["scientificName"]} is ACCEPTED in WCVP',
                        'WCVP candidates with this name: ' + cand)
                durl, d = get(f'species/{acc["key"]}/distributions', limit=500)
                res = d['results']
                nat = sorted({y['locality'] for y in res if not y.get('establishmentMeans')})
                intro = sorted({y['locality'] for y in res if y.get('establishmentMeans') == 'INTRODUCED'})
                other = sorted({f'{y["locality"]}:{y.get("establishmentMeans") or y.get("status")}' for y in res
                                if y.get('establishmentMeans') not in (None, 'INTRODUCED')})
                save(f'{c["id"]}-wcvp.json', {'url': durl, 'accepted_key': acc['key'], 'results': res})
                entry['wcvp'] = {'accepted': acc['scientificName'], 'native': nat, 'introduced': intro, 'other': other,
                                 'count': len(res), 'complete': d.get('endOfRecords')}
                add(c, 'WCVP (via GBIF; the dataset POWO publishes - not retrieved from powo.science.kew.org)', durl,
                    'wcvp_native_areas', '; '.join(nat) or 'none listed', f'{len(nat)} areas; WCVP carries no flag for native areas, so absence of INTRODUCED is read as native')
                add(c, 'WCVP (via GBIF; the dataset POWO publishes - not retrieved from powo.science.kew.org)', durl,
                    'wcvp_introduced_areas', '; '.join(intro) or 'none listed', f'{len(intro)} areas flagged establishmentMeans=INTRODUCED')
                if other:
                    add(c, 'WCVP (via GBIF)', durl, 'wcvp_other_status', '; '.join(other))
            # GRIIS US
            u2, r2 = get('species', name=q, datasetKey=GRIIS_US, limit=5)
            if r2['results']:
                k2 = r2['results'][0]['key']
                _, d2 = get(f'species/{k2}/distributions', limit=50)
                v = '; '.join(f'{y.get("locality")}:{y.get("establishmentMeans")}:{y.get("status")}' for y in d2['results']) or 'listed, no distribution rows'
                save(f'{c["id"]}-griis-us.json', {'url': u2, 'name_usage': r2['results'][0], 'distributions': d2['results']})
                add(c, 'GRIIS United States (via GBIF)', u2, 'griis_listing', v, 'GRIIS lists introduced/invasive taxa; presence here is an introduced-status claim')
                entry['griis'] = v
            else:
                add(c, 'GRIIS United States (via GBIF)', u2, 'griis_listing', 'not listed', 'absence from GRIIS is not evidence of native status')
        # GBIF occurrences by state/province
        for cc in ('US', 'CA'):
            for basis in BASES:
                p = dict(country=cc, basisOfRecord=basis, hasCoordinate='true', hasGeospatialIssue='false', limit=0,
                         facet='gadmLevel1Gid', facetLimit=100)
                p['genusKey' if genus_only else 'speciesKey'] = key
                url, r = get('occurrence/search', **p)
                counts = {x['name']: x['count'] for x in (r['facets'][0]['counts'] if r['facets'] else [])}
                named = {names.get(cc, {}).get(k, k): v for k, v in counts.items()}
                entry['gbif'].setdefault(cc, {})[basis] = named
                top = sorted(named.items(), key=lambda kv: -kv[1])
                save(f'{c["id"]}-gbif-{cc}-{basis}.json', {'url': url, 'total': r['count'], 'counts_by_gadm_level1': counts})
                add(c, 'GBIF occurrence', url, f'gbif_{basis.lower()}_{cc.lower()}',
                    f'total={r["count"]}; ' + '; '.join(f'{k}={v}' for k, v in top),
                    f'{"genus-level key" if genus_only else "speciesKey"} {key}; counts are recording effort, not range; georeferenced, no geospatial issues; facet gadmLevel1Gid mapped to names via gadm-level1-names.json')
        summary[c['id']] = entry
        print(i, c['id'], 'ok', flush=True)

    fields = ['card_number', 'herb_id', 'scientific_name', 'source', 'url', 'retrieved_on', 'claim_type', 'claim_text_or_value', 'notes']
    with open(os.path.join(OUT, 'evidence-45.csv'), 'w', newline='') as f:
        f.write(STATUS + '\n')
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    with open(os.path.join(OUT, 'raw', 'summary-data.json'), 'w') as f:
        json.dump({'_status': 'PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW', 'retrieved_on': TODAY, 'species': summary}, f, indent=1)
    print('rows', len(rows))


if __name__ == '__main__':
    sys.exit(main())
