#!/usr/bin/env python3
"""Builds docs/regions/proposed/membership/occurrence-evidence-45.csv: ONE row per card, read from the
Phase 1 raw data (raw/summary-data.json). No region is assigned: region_assignment_status is always
'awaiting-boundaries' until docs/regions/proposed/region-mapping.csv exists on coord/region-boundaries-research.
Invents nothing: every field is a transcription of what a source returned, or an explicit 'not retrieved'."""
import csv, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
M = os.path.join(ROOT, 'docs/regions/proposed/membership')
d = json.load(open(os.path.join(M, 'raw/summary-data.json')))
checked = d['retrieved_on']
US_BOUND = lambda c: c
rows = []
for hid, e in d['species'].items():
    genus = e['genus_only'] in (True, 'True')
    w = e.get('wcvp')
    g = e['gbif']
    def strong(cc):
        sp = g.get(cc, {}).get('PRESERVED_SPECIMEN', {}); ob = g.get(cc, {}).get('HUMAN_OBSERVATION', {})
        return sorted(k for k in set(sp) | set(ob) if sp.get(k, 0) >= 5 or ob.get(k, 0) >= 100)
    us, ca = strong('US'), strong('CA')
    if genus:
        scope = 'genus'
        stmt = (f'GENUS-LEVEL ONLY: GBIF records for the whole genus ({e["backbone"]}) are strong in {len(us)} US and '
                f'{len(ca)} Canadian units. This is the range of the genus, not of any species the card might depict; '
                'no species is chosen and none is implied.')
        nat = 'not-applicable-genus'
        tax = f'{e["backbone"]} ({e["backbone_status"]}) GBIF key {e["taxon_key"]}; WCVP range not applicable to a genus card'
        wn = wi = ''
    else:
        scope = 'species'
        wn = '; '.join(w.get('native', [])) if w else ''
        wi = '; '.join(w.get('introduced', [])) if w else ''
        nn, ni = len(w.get('native', [])) if w else 0, len(w.get('introduced', [])) if w else 0
        nat = ('wcvp-native-in-some-units' if nn and not ni else 'wcvp-introduced-only' if ni and not nn else
               'wcvp-mixed-native-and-introduced' if nn and ni else 'wcvp-no-distribution')
        stmt = (f'WCVP (via GBIF, provisional): native in {nn} units, introduced in {ni} units, worldwide (TDWG level 3 and 4 units, including US states and Canadian provinces). '
                f'GBIF records strong in {len(us)} US and {len(ca)} Canadian units (recording effort, not range).')
        tax = f'GBIF {e["backbone"]} ({e["backbone_status"]}) key {e["taxon_key"]}; WCVP accepted name: {w.get("accepted") if w else "none found"}'
    rows.append({'card_number': e['card_number'], 'herb_id': hid, 'evidence_scope': scope, 'taxonomy': tax,
        'wcvp_native_units': wn, 'wcvp_introduced_units': wi, 'native_introduced_reading': nat,
        'gbif_strong_us_units': '; '.join(us), 'gbif_strong_ca_units': '; '.join(ca),
        'range_statement': stmt,
        'sources': 'GBIF backbone; WCVP via GBIF (provisional); GBIF occurrences' + ('' if genus else '; GRIIS US via GBIF (introduced-only listing)'),
        'not_retrieved': 'POWO; Flora of North America; USDA PLANTS (no county-level statement exists in this set)',
        'date_checked': checked, 'region_assignment_status': 'awaiting-boundaries', 'assigned_regions': ''})
rows.sort(key=lambda r: int(r['card_number']))
with open(os.path.join(M, 'occurrence-evidence-45.csv'), 'w', newline='') as f:
    f.write('# PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW. No region assigned to any card.\n')
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
print(len(rows), 'rows', sum(r['evidence_scope'] == 'genus' for r in rows), 'genus')
