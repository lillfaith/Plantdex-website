-- Migration 0015 (expansion catalogue ids): TEST-ONLY verification. READ THE HEADER BEFORE RUNNING.
--
-- RUN ONLY in the Supabase SQL editor of the TEST project (ref vgjehmwcpavflbfhbbrp), and only AFTER 0015 has been applied there by the
-- owner-dispatched workflow. NEVER production. Do not edit it to point anywhere else. It is NOT a migration and is not under
-- supabase/migrations/.
--
-- SAFE BY CONSTRUCTION: everything runs inside one DO block that ends by raising an exception, so Postgres rolls back every row it
-- created (one throwaway user and its rows). It leaves no data. The "error" at the end is the report: it starts with RESULT and lists
-- PASS/FAIL per check. Copy that text back to the coordinator. Zero FAIL lines and "ALL PASSED" means success.
--
-- IF YOU APPLIED A TRIMMED BATCH (the migration header says to apply only released ids): edit `expansion_ids` below to the same
-- trimmed list, or the "accepts every expansion id" check will report FAIL for the ids you deliberately left out.
--
-- What it covers: the function's definition (attributes, signature, search_path), every id accepted or refused as intended, near-miss
-- spellings refused, the five 0013 constraints still present and still NOT VALID, a new-id row accepted and an unknown-id row refused
-- by the real constraint, a daily task id for a new card accepted, the two sibling functions untouched, and that no existing row now
-- violates the list. It reports (does not judge) who can execute the function: 0013's posture is unchanged by 0015.
-- What it CANNOT cover: the Field Board standings for a real participant (needs a signed-in session; covered by the live leaderboard
-- suite on TEST, which refuses production), and the edge bundle (deployed separately).

do $verify$
declare
  ua uuid := gen_random_uuid();
  out text := '';
  fails integer := 0;
  n integer;
  r boolean;
  old_ids text[] := array[
    'taraxacum-officinale',
    'rumex-obtusifolius',
    'solidago-canadensis',
    'ambrosia-artemisiifolia',
    'chenopodium-album',
    'portulaca-oleracea',
    'alliaria-petiolata',
    'urtica-dioica',
    'oxalis-stricta',
    'trifolium-pratense',
    'lamium-purpureum',
    'viola-sororia',
    'stellaria-media',
    'plantago-major',
    'galium-aparine',
    'glechoma-hederacea',
    'acer-spp',
    'rubus-spp',
    'rumex-acetosella',
    'rhus-spp',
    'cichorium-intybus',
    'arctium-lappa',
    'mentha-canadensis',
    'nepeta-cataria',
    'capsella-bursa-pastoris',
    'prunella-vulgaris',
    'verbascum-thapsus',
    'equisetum-arvense',
    'allium-vineale',
    'fragaria-virginiana',
    'sambucus-spp',
    'hypericum-perforatum',
    'achillea-millefolium',
    'impatiens-capensis',
    'melissa-officinalis',
    'monarda-fistulosa',
    'rosa-spp',
    'salix-spp',
    'geranium-maculatum',
    'lonicera-japonica',
    'pinus-spp',
    'morus-spp',
    'passiflora-incarnata',
    'lactuca-serriola',
    'quercus-spp',
    'echinacea-purpurea',
    'typha-latifolia',
    'oenothera-biennis',
    'lindera-benzoin',
    'hamamelis-virginiana',
    'malva-neglecta',
    'silybum-marianum',
    'verbena-hastata',
    'callicarpa-americana'
  ];
  expansion_ids text[] := array[
    'eupatorium-perfoliatum',
    'eutrochium-fistulosum',
    'ceanothus-americanus',
    'rudbeckia-hirta',
    'pycnanthemum-tenuifolium',
    'eriogonum-fasciculatum',
    'parthenium-integrifolium',
    'pseudognaphalium-obtusifolium',
    'nelumbo-lutea',
    'erigeron-annuus',
    'rumex-crispus',
    'plantago-lanceolata',
    'artemisia-vulgaris',
    'leonurus-cardiaca',
    'vernonia-noveboracensis',
    'agastache-foeniculum',
    'claytonia-virginica',
    'polygonatum-biflorum',
    'mitchella-repens',
    'apios-americana',
    'dioscorea-villosa',
    'lepidium-virginicum',
    'potentilla-simplex',
    'trifolium-repens',
    'daucus-carota',
    'scutellaria-lateriflora',
    'monardella-odoratissima',
    'ulmus-rubra',
    'prunus-serotina',
    'juglans-nigra',
    'juniperus-virginiana',
    'asimina-triloba',
    'diospyros-virginiana',
    'cornus-florida',
    'cercis-canadensis',
    'liquidambar-styraciflua',
    'platanus-occidentalis',
    'comptonia-peregrina',
    'fagus-grandifolia',
    'tilia-americana',
    'ilex-vomitoria',
    'morella-cerifera',
    'aralia-spinosa',
    'amelanchier-canadensis',
    'vitis-rotundifolia',
    'eschscholzia-californica',
    'eriodictyon-californicum',
    'aralia-californica',
    'artemisia-douglasiana',
    'umbellularia-californica',
    'mahonia-aquifolium',
    'frangula-purshiana',
    'gaultheria-shallon',
    'scrophularia-californica',
    'ribes-sanguineum',
    'condea-emoryi',
    'sphaeralcea-ambigua',
    'simmondsia-chinensis',
    'opuntia-engelmannii',
    'prosopis-glandulosa',
    'chilopsis-linearis',
    'anemopsis-californica',
    'salvia-columbariae',
    'encelia-farinosa',
    'ephedra-trifurca',
    'cleomella-serrulata',
    'balsamorhiza-sagittata',
    'chamerion-angustifolium',
    'arctostaphylos-uva-ursi',
    'hibiscus-moscheutos',
    'populus-tremuloides',
    'artemisia-tridentata',
    'shepherdia-canadensis',
    'glycyrrhiza-lepidota',
    'grindelia-squarrosa',
    'amorpha-canescens',
    'dalea-purpurea',
    'echinacea-angustifolia',
    'artemisia-frigida',
    'serenoa-repens',
    'bidens-alba',
    'bacopa-monnieri',
    'smilax-bona-nox',
    'rhododendron-groenlandicum',
    'vaccinium-vitis-idaea'
  ];
  cn record;
begin
  -- ---- the function ----
  perform 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and p.proname = 'is_catalogue_herb' and p.provolatile = 'i' and not p.prosecdef
     and pg_get_function_identity_arguments(p.oid) = 'p text';
  if found then out := out || E'\nPASS is_catalogue_herb(text) exists, IMMUTABLE, not security definer';
  else out := out || E'\nFAIL is_catalogue_herb(text) missing or its attributes changed'; fails := fails + 1; end if;

  perform 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and p.proname = 'is_catalogue_herb'
     and exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c = 'search_path=""');
  if found then out := out || E'\nPASS search_path is pinned to empty'; else out := out || E'\nFAIL search_path not pinned to empty'; fails := fails + 1; end if;

  -- ---- every id ----
  select count(*) into n from unnest(old_ids) q(id) where public.is_catalogue_herb(id);
  if n = array_length(old_ids, 1) then out := out || E'\nPASS all ' || n || ' pre-existing ids are still accepted';
  else out := out || E'\nFAIL only ' || n || ' of ' || array_length(old_ids, 1) || ' pre-existing ids accepted'; fails := fails + 1; end if;

  select count(*) into n from unnest(expansion_ids) q(id) where public.is_catalogue_herb(id);
  if n = array_length(expansion_ids, 1) then out := out || E'\nPASS all ' || n || ' expansion ids are accepted';
  else out := out || E'\nFAIL only ' || n || ' of ' || array_length(expansion_ids, 1) || ' expansion ids accepted (trimmed batch? edit expansion_ids)'; fails := fails + 1; end if;

  -- ---- refusals: unknown, near-miss spellings, hybrid sign, whitespace, empty ----
  select count(*) into n from unnest(array['not-a-card', 'Taraxacum-officinale', 'taraxacum officinale', 'taraxacum-officinale ',
                                           ' taraxacum-officinale', 'eupatorium-perfoliatum-x', 'rumex', '', 'acer-spp ']) q(id)
   where public.is_catalogue_herb(id);
  if n = 0 then out := out || E'\nPASS unknown ids and near-miss spellings are refused';
  else out := out || E'\nFAIL ' || n || ' near-miss or unknown ids were accepted'; fails := fails + 1; end if;

  r := public.is_catalogue_herb(null);
  if r is null then out := out || E'\nPASS null stays null (every herb_id column is NOT NULL, so no row can rely on it)';
  else out := out || E'\nFAIL null was answered ' || r::text; fails := fails + 1; end if;

  -- ---- the 0013 constraints are still there, still NOT VALID, still pointing at the function ----
  for cn in select * from (values ('discoveries', 'discoveries_valid_herb'), ('learned', 'learned_valid_herb'),
                                 ('mastered', 'mastered_valid_herb'), ('sightings', 'sightings_valid_herb')) v(t, k) loop
    perform 1 from pg_constraint k join pg_class t on t.oid = k.conrelid join pg_namespace s on s.oid = t.relnamespace
     where s.nspname = 'public' and t.relname = cn.t and k.conname = cn.k and not k.convalidated
       and pg_get_constraintdef(k.oid) like '%is_catalogue_herb%';
    if found then out := out || E'\nPASS ' || cn.k || ' present, NOT VALID, calls is_catalogue_herb';
    else out := out || E'\nFAIL ' || cn.k || ' missing, validated, or no longer calls the function'; fails := fails + 1; end if;
  end loop;

  -- ---- siblings untouched (0015 must not have reached them) ----
  select count(*) into n from unnest(array['seasonal:spring','seasonal:summer','seasonal:autumn','seasonal:winter','collection:backyard',
    'collection:hard-to-find','collection:habitat-woodland','collection:habitat-meadow','collection:habitat-wetland',
    'collection:habitat-wayside','collection:habitat-garden']) q(id) where public.is_scoring_task(id);
  if n = 11 and not public.is_scoring_task('collection:expansion') then out := out || E'\nPASS is_scoring_task still accepts exactly the 11 standing tasks';
  else out := out || E'\nFAIL is_scoring_task changed (accepted ' || n || ' of 11)'; fails := fails + 1; end if;

  if public.is_achievement('first-find') and public.is_achievement('habitat-sweep') and not public.is_achievement('expansion-explorer') then
    out := out || E'\nPASS is_achievement still holds the existing ids and no new one';
  else out := out || E'\nFAIL is_achievement changed'; fails := fails + 1; end if;

  -- ---- a daily task for a new card is accepted by the existing rule; for an unknown id it is not ----
  if public.is_research_task('daily:find:' || expansion_ids[1]) and not public.is_research_task('daily:find:not-a-card') then
    out := out || E'\nPASS daily:find:<new id> accepted through the existing rule; daily:find:<unknown> refused';
  else out := out || E'\nFAIL daily task acceptance is wrong'; fails := fails + 1; end if;

  -- ---- the real constraint, on a real row (rolled back) ----
  insert into auth.users (id, aud, role, email) values (ua, 'authenticated', 'authenticated', 'expansion-ids-' || ua || '@example.invalid');
  begin
    insert into public.discoveries (user_id, herb_id) values (ua, expansion_ids[1]);
    out := out || E'\nPASS a discovery of a new id is accepted by the real constraint';
  exception when others then
    out := out || E'\nFAIL a discovery of a new id was refused: ' || sqlerrm; fails := fails + 1;
  end;
  begin
    insert into public.discoveries (user_id, herb_id) values (ua, 'not-a-card');
    out := out || E'\nFAIL a discovery of an unknown id was accepted'; fails := fails + 1;
  exception when check_violation then
    out := out || E'\nPASS a discovery of an unknown id is refused (check_violation)';
  end;
  begin
    insert into public.sightings (id, user_id, herb_id, date) values ('t_exp_s1', ua, expansion_ids[1], current_date);
    out := out || E'\nPASS a sighting of a new id is accepted';
  exception when others then
    out := out || E'\nFAIL a sighting of a new id was refused: ' || sqlerrm; fails := fails + 1;
  end;

  -- ---- nothing that exists already is affected: no stored row holds an id the list no longer accepts ----
  select (select count(*) from public.discoveries x where not public.is_catalogue_herb(x.herb_id) and x.user_id <> ua)
       + (select count(*) from public.learned     x where not public.is_catalogue_herb(x.herb_id))
       + (select count(*) from public.mastered    x where not public.is_catalogue_herb(x.herb_id))
       + (select count(*) from public.sightings   x where not public.is_catalogue_herb(x.herb_id) and x.user_id <> ua)
    into n;
  if n = 0 then out := out || E'\nPASS no pre-existing row holds an id the new list refuses';
  else out := out || E'\nNOTE ' || n || ' pre-existing rows hold ids the list refuses (they predate 0013, or were written before; they were already unscored)'; end if;

  -- ---- reported, not judged: 0013 left this function executable by anon through PostgREST ----
  out := out || E'\nINFO is_catalogue_herb executable by anon=' || has_function_privilege('anon', 'public.is_catalogue_herb(text)', 'execute')::text
        || ', authenticated=' || has_function_privilege('authenticated', 'public.is_catalogue_herb(text)', 'execute')::text
        || ' (authenticated MUST stay true: CHECK constraints run as the inserting role)';

  raise exception E'RESULT %\n%', case when fails = 0 then 'ALL PASSED' else fails || ' FAILED' end, out;
end
$verify$;
