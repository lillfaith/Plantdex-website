# PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW
"""Builds docs/regions/membership/evidence-summary.md from raw/summary-data.json (written by
collect_evidence.py). Reads src/lib/region-species.ts only to compare with the Georgia survey."""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
M = os.path.join(ROOT, 'docs/regions/membership')
data = json.load(open(os.path.join(M, 'raw/summary-data.json')))
D, WHEN = data['species'], data['retrieved_on']
names = json.load(open(os.path.join(M, 'raw/gadm-level1-names.json')))['names']
US = set(names['US'].values())
CA = set(names['CA'].values())
SPEC_MIN, OBS_MIN = 5, 100  # the Georgia survey's own thresholds, reused so results are comparable
ALIAS = {'Washington, D.C.': 'District of Columbia'}

ga = {}
for m in re.finditer(r"herbId: '([^']+)', occurrence: '(\w+)'", open(os.path.join(ROOT, 'src/lib/region-species.ts')).read()):
    ga[m.group(1)] = m.group(2)


def norm(a):
    return {ALIAS.get(x, x) for x in a}


def strong(c, basis_sp, basis_ob):
    out = {}
    for st in set(basis_sp) | set(basis_ob):
        sp, ob = basis_sp.get(st, 0), basis_ob.get(st, 0)
        if sp >= SPEC_MIN or ob >= OBS_MIN:
            out[st] = (sp, ob)
    return out


L = ['<!-- PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW -->', '',
     '# Evidence summary, 45 original cards (Phase 1)', '',
     f'**PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW.** Retrieved {WHEN}. Nothing here is authoritative. Row-level evidence: `evidence-45.csv`; raw API responses: `raw/`.', '',
     '## Sources: what was and was not reachable', '',
     '| Source | Result |', '|---|---|',
     '| POWO (powo.science.kew.org) | **Not retrieved.** HTTP 403, Cloudflare "Attention Required", on `/`, `/api/2/search` and `/taxon/...`. |',
     '| Flora of North America (efloras.org) | **Not retrieved.** HTTP 403, Cloudflare "Just a moment", on every path; `www.efloras.org` does not resolve. No FNA range or habitat quotes exist in this evidence set. |',
     '| USDA PLANTS (plants.usda.gov) | **Not retrieved.** HTTP 301 to `plants.sc.egov.usda.gov:443`, which the proxy refuses (CONNECT 403). The GBIF-hosted USDA PLANTS checklist (dataset 705922f7-5ba5-49ab-a75d-722e3090e690) returned zero name usages for the cards queried. No USDA native status or state distribution exists in this evidence set. |',
     '| **WCVP via GBIF** (dataset f382f0ce-323a-4091-bb9f-add557f3a9a2) | Retrieved. WCVP is the checklist POWO publishes, but this is GBIF\'s copy, **not** a POWO retrieval and not a TDWG-region statement from POWO\'s own pages. Distribution rows carry an area (US state or Canadian province, TDWG level 3/4) and `establishmentMeans`; WCVP has no native flag, so a row without `INTRODUCED` is read as native. Genus (`spp.`) cards have no WCVP range. |',
     '| GRIIS United States via GBIF (dataset 32ad19ed-6b89-447a-9242-795c0897f345) | Retrieved. Lists introduced/invasive taxa for "conterminous 48 United States" only; absence from it is **not** evidence of native status. |',
     '| GBIF occurrences | Retrieved. Facet `gadmLevel1Gid` (GADM level-1 unit) mapped to names from the records themselves. `PRESERVED_SPECIMEN` and `HUMAN_OBSERVATION`, `hasCoordinate=true`, `hasGeospatialIssue=false`, country US and CA. Species-level key (`speciesKey`); genus key for `spp.` cards. **Counts are recording effort, not range.** |', '',
     f'"Strong GBIF evidence" below reuses the Georgia survey\'s own thresholds so the two are comparable: at least {SPEC_MIN} preserved specimens or at least {OBS_MIN} human observations in the unit. That is a convenience threshold, not a botanical one.', '',
     '## Georgia cross-check (Phase 1 form)', '',
     'Phase 2 (region membership) was not run, because the boundaries branch does not exist. The full validation the task describes therefore could not be done. What can be checked now is whether this pipeline agrees with the Georgia survey on Georgia itself.', '',
     '| Card | Species | Survey class | GBIF GA specimens / obs (this run) | Would survey rule give | WCVP Georgia |', '|---|---|---|---|---|---|']
issues = []
for hid, e in D.items():
    if e['genus_only']:
        continue
    us = e['gbif']['US']
    sp, ob = us['PRESERVED_SPECIMEN'].get('Georgia', 0), us['HUMAN_OBSERVATION'].get('Georgia', 0)
    rule = 'confirmed' if sp >= SPEC_MIN or ob >= OBS_MIN else ('likely' if sp + ob else 'insufficient')
    w = e['wcvp']
    wg = 'native' if w and 'Georgia' in w['native'] else ('introduced' if w and 'Georgia' in w['introduced'] else 'not listed')
    sv = ga.get(hid, '-')
    flag = '' if sv == rule else ' **differs**'
    if sv != rule:
        issues.append((hid, sv, rule, sp, ob, wg))
    L.append(f'| {e["card_number"]} | {hid} | {sv} | {sp} / {ob} | {rule}{flag} | {wg} |')
L += ['', f'Survey class and this run\'s class differ for {len(issues)} of 36 binomials. Counts are largely identical to the survey\'s, which is **not independent confirmation**: both read the same GBIF index with the same rule. It shows the pipeline reproduces the survey, nothing more.', '']
wm = [(h, ga[h]) for h, e in D.items() if not e['genus_only'] and h in ga and e['wcvp'] and 'Georgia' not in (norm(e['wcvp']['native']) | norm(e['wcvp']['introduced']))]
L += ['### WCVP and the Georgia survey disagree', '']
for h, c in wm:
    L.append(f'- **{h}** (survey: {c}): WCVP lists no Georgia unit, native or introduced. Absence from a checklist is not absence from the state; flagged for a botanist.')
z = D['mentha-canadensis']
if 'Georgia' in norm(z['wcvp']['native']):
    L.append('- **mentha-canadensis** (survey: insufficient, zero GBIF records): WCVP lists Georgia as **native**. The survey comment calls it "a largely northern species"; the two sources point in opposite directions and neither is reconciled here.')
L.append('')
L += ['## Per species', '']
for hid, e in D.items():
    us = e['gbif']['US']; ca = e['gbif']['CA']
    st = strong(None, us['PRESERVED_SPECIMEN'], us['HUMAN_OBSERVATION'])
    stc = strong(None, ca['PRESERVED_SPECIMEN'], ca['HUMAN_OBSERVATION'])
    tot_sp, tot_ob = sum(us['PRESERVED_SPECIMEN'].values()), sum(us['HUMAN_OBSERVATION'].values())
    L.append(f'### {e["card_number"]}. {hid}')
    L.append('')
    L.append(f'- GBIF backbone: {e["backbone"]} ({e["backbone_status"]}); key {e["taxon_key"]}{" (GENUS key; card names a genus, no species)" if e["genus_only"] else ""}.')
    w = e['wcvp']
    if e['genus_only']:
        L.append('- WCVP: not applicable (genus card; any membership must come from a species-level decision the owner has not made).')
    elif w:
        nat, intro = norm(w['native']), norm(w['introduced'])
        n48 = sorted(nat & US); i48 = sorted(intro & US)
        L.append(f'- WCVP accepted name: {w["accepted"]}' + ('' if w['accepted'].startswith(e['backbone'].split(' ')[0] + ' ' + e['backbone'].split(' ')[1]) and False else ''))
        L.append(f'- WCVP native, US units ({len(n48)}): {", ".join(n48) or "none"}.')
        L.append(f'- WCVP introduced, US units ({len(i48)}): {", ".join(i48) or "none"}.')
        L.append(f'- WCVP Canadian provinces: native {", ".join(sorted(nat & CA)) or "none"}; introduced {", ".join(sorted(intro & CA)) or "none"}.')
        both = sorted((nat & intro) & US)
        if both:
            L.append(f'- **Conflict inside WCVP:** both native and introduced for {", ".join(both)}.')
        silent = sorted(set(st) - nat - intro)
        if silent:
            L.append(f'- **GBIF strong, WCVP silent** ({len(silent)}): {", ".join(f"{s} ({st[s][0]}/{st[s][1]})" for s in silent)}. Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.')
        zero = sorted(((nat | intro) & US) - set(us['PRESERVED_SPECIMEN']) - set(us['HUMAN_OBSERVATION']))
        if zero:
            L.append(f'- **WCVP lists, GBIF has no georeferenced record** ({len(zero)}): {", ".join(zero)}.')
    if 'griis' in e:
        L.append(f'- GRIIS US: {e["griis"]} (introduced-status claim).')
    L.append(f'- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).')
    L.append(f'- GBIF US totals: {tot_sp} specimens, {tot_ob} observations.')
    L.append(f'- GBIF strong US units ({len(st)}): ' + (', '.join(f'{s} ({a}/{b})' for s, (a, b) in sorted(st.items())) or 'none') + '.')
    if stc:
        L.append(f'- GBIF strong Canadian units: ' + ', '.join(f'{s} ({a}/{b})' for s, (a, b) in sorted(stc.items())) + '.')
    L.append('')
L += ['## Thin or conflicting evidence, flagged for review', '']
thin = []
for hid, e in D.items():
    us = e['gbif']['US']
    st = strong(None, us['PRESERVED_SPECIMEN'], us['HUMAN_OBSERVATION'])
    w = e['wcvp']
    if e['genus_only']:
        thin.append(f'- **{hid}**: genus card; no species-level range exists in this evidence; GBIF genus counts cover every species in the genus, so they say nothing about which species a player will meet.')
    elif len(st) < 8:
        thin.append(f'- **{hid}**: only {len(st)} US units clear the GBIF threshold.')
    if w and e['backbone'] and w['accepted'].split(' ')[0:2] != e['backbone'].split(' ')[0:2]:
        thin.append(f'- **{hid}**: WCVP accepted name differs from the card ({w["accepted"]}); card kept verbatim.')
    if w and (norm(w['native']) & norm(w['introduced']) & US):
        thin.append(f'- **{hid}**: WCVP lists the same US unit as both native and introduced.')
L += thin
L += ['', '## Not found, not guessed', '',
      '- No USDA PLANTS native status or state distribution for any card.', '- No Flora of North America text for any card.',
      '- No POWO page statement; WCVP (via GBIF) only.', '- No infraspecific, hybrid or cultivar analysis; GBIF `speciesKey` folds subspecies into the species.',
      '- No territories, Alaska/Hawaii or Mexico analysis beyond what appears in the CSV rows.', '']
open(os.path.join(M, 'evidence-summary.md'), 'w').write('\n'.join(L))
print(len(L), 'lines;', len(issues), 'Georgia class differences')
for i in issues: print(i)
