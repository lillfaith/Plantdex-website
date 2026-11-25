#!/usr/bin/env python3
"""Consistency diagnostic: owner's DRAFT per-card regions vs where GBIF records of each species fall in the v2 map (PROPOSAL tooling).

  python3 -I scripts/regions/card_diagnostic.py --cards docs/regions/proposed/recovered-card-regions-139.csv --poly <asset>.bin \
      --out docs/regions/proposed/v2/card-diagnostic.csv --cache <dir>

LABEL: draft provisional, NOT evidence. The card regions are "EDITORIAL ESTIMATES: not verified state-by-state"; GBIF points are observer-effort
biased, include cultivated and escaped plants, and are sampled here, not complete. Agreement proves nothing about either side.
Only species names are sent to GBIF (api.gbif.org). Sampling: up to 3 pages of 300 human observations at offsets (capped at the first 9,000 records because GBIF deep paging stalls) drawn from random.Random(seed,
species) over the US record count; genus cards ('spp.') use the genus key. Results are cached as raw JSON so a re-run is offline.
"""
import argparse, csv, json, os, random, socket, sys, time, urllib.parse, urllib.request
socket.setdefaulttimeout(25)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import polygon_resolver as PR
API = 'https://api.gbif.org/v1/'
def get(path, params, cache):
    key = os.path.join(cache, (path.replace('/', '_') + '_' + urllib.parse.urlencode(sorted(params.items()))).replace('&', '_').replace('=', '-').replace('%20', '+')[:180] + '.json')
    if os.path.exists(key): return json.load(open(key))
    for k in range(4):
        try:
            d = json.load(urllib.request.urlopen(API + path + '?' + urllib.parse.urlencode(params), timeout=25).read().decode()) if False else json.loads(urllib.request.urlopen(API + path + '?' + urllib.parse.urlencode(params), timeout=25).read().decode()); json.dump(d, open(key, 'w')); return d
        except Exception as e: time.sleep(2 * (k + 1))
    return None
def main():
    ap = argparse.ArgumentParser(); [ap.add_argument(f'--{n}', required=True) for n in ('cards', 'poly', 'out', 'cache')]; ap.add_argument('--seed', type=int, default=20261124); a = ap.parse_args()
    os.makedirs(a.cache, exist_ok=True); res = PR.Resolver(open(a.poly, 'rb').read()); out = []; print('resolver loaded', flush=True)
    for c in csv.DictReader(open(a.cards, encoding='utf-8')):
        name = c['Scientific name'].replace(' spp.', '').strip(); genus = c['Scientific name'].endswith('spp.')
        listed = [x.strip() for x in c['Regions (codes)'].split(',')]
        m = get('species/match', {'name': name, 'kingdom': 'Plantae'}, a.cache)
        key = m.get('genusKey') if (m and genus) else (m or {}).get('usageKey') if m else None
        base = {'card': c['Card #'], 'set': c['Set'], 'name': c['Scientific name'], 'listed': ' '.join(listed), 'gbif_key': key or '', 'match': (m or {}).get('matchType', '')}
        if not key: out.append({**base, 'n_points': 0, 'note': 'no GBIF match'}); continue
        q = {'taxonKey': key, 'country': 'US', 'hasCoordinate': 'true', 'hasGeospatialIssue': 'false', 'basisOfRecord': 'HUMAN_OBSERVATION'}
        cnt = get('occurrence/search', {**q, 'limit': 0}, a.cache); total = (cnt or {}).get('count', 0)
        if total == 0: out.append({**base, 'n_points': 0, 'note': 'no US human observations'}); continue
        rng = random.Random(f'{a.seed}-{name}'); span = max(1, min(total, 9000) - 300); offs = sorted({rng.randrange(0, span) for _ in range(3)}) if total > 900 else [0]
        pts = []
        for o in offs:
            d = get('occurrence/search', {**q, 'limit': 300, 'offset': o}, a.cache)
            for r in (d or {}).get('results', []):
                if 'decimalLatitude' in r: pts.append((r['decimalLatitude'], r['decimalLongitude']))
        cover = {}; inside = 0
        for lat, lon in pts:
            u = res.unit_at(round(lon * 1e4), round(lat * 1e4))
            if u: inside += 1; cover[u['region']] = cover.get(u['region'], 0) + 1
        row = {**base, 'us_records': total, 'n_points': len(pts), 'n_inside_coverage': inside}
        if inside:
            row['share_in_listed'] = round(sum(v for k, v in cover.items() if k in listed) / inside, 3)
            row['observed_not_listed(>=5%)'] = ' '.join(f'{k}:{v/inside:.0%}' for k, v in sorted(cover.items(), key=lambda kv: -kv[1]) if k not in listed and v / inside >= 0.05)
            row['listed_not_observed(<1%)'] = ' '.join(k for k in listed if cover.get(k, 0) / inside < 0.01)
            row['observed_distribution'] = ' '.join(f'{k}:{v/inside:.0%}' for k, v in sorted(cover.items(), key=lambda kv: -kv[1]))
        out.append(row); print(c['Card #'], name, len(pts), row.get('share_in_listed'), flush=True)
    cols = ['card', 'set', 'name', 'listed', 'gbif_key', 'match', 'us_records', 'n_points', 'n_inside_coverage', 'share_in_listed', 'observed_not_listed(>=5%)', 'listed_not_observed(<1%)', 'observed_distribution', 'note']
    with open(a.out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=cols, lineterminator='\n', extrasaction='ignore', restval=''); w.writeheader(); w.writerows(out)
if __name__ == '__main__': main()
