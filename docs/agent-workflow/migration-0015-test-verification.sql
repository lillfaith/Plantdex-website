-- Migration 0015 (expansion ids in the four card-id tables): TEST-ONLY verification. READ THE HEADER BEFORE RUNNING.
--
-- RUN ONLY in the Supabase SQL editor of the TEST project (ref vgjehmwcpavflbfhbbrp), and only AFTER 0015 has been applied there by the
-- owner-dispatched workflow. NEVER production. Do not edit it to point anywhere else. It is NOT a migration and is not under
-- supabase/migrations/.
--
-- SAFE BY CONSTRUCTION AND SELF-ROLLING-BACK: everything runs inside one DO block that ends by raising an exception, so Postgres rolls
-- back every row it created (one throwaway user and its rows). It never deletes or updates an existing row and leaves no data. The
-- "error" at the end IS the report: it starts with RESULT and lists PASS/FAIL per check. Copy that text back to the coordinator.
-- Zero FAIL lines and "ALL PASSED" means success.
--
-- IF YOU APPLIED A TRIMMED BATCH: edit `expansion_ids` below to the same list, or "permits every expansion id" reports FAIL for ids you
-- deliberately left out.
--
-- What it covers, in the four groups the owner asked for:
--   a. EXISTING RECORDS INTACT: row counts of the four tables are read and reported; no pre-existing row holds an id the new function
--      refuses; the four constraints are still NOT VALID (so nothing was re-scanned); the script itself writes only fixture rows that are
--      rolled back.
--   b. 0013 COMPATIBILITY: `is_catalogue_herb` still exists with its signature and attributes and still accepts exactly the 54 ids and
--      NONE of the 85; the sibling functions are unchanged.
--   c. NO NEW SCORING OR UNLOCK BEHAVIOUR: a participant who holds one printed card and one expansion card scores exactly 50 (one
--      discovery), not 100, through the real `leaderboard_standings()`; daily research tasks for an expansion id are still refused;
--      no standing task or achievement id was added.
--   d. THE NEW CAPABILITY: a discovery, learned, mastered and sighting row for an expansion id is accepted by the real constraints; an
--      unknown id and near-miss spellings are refused.
-- It reports (does not judge) who can execute the new functions. It CANNOT cover PostgREST, a signed-in session, the live leaderboard
-- suite, or the edge bundle.

do $verify$
declare
  ua uuid := gen_random_uuid();
  out text := '';
  fails integer := 0;
  n integer;
  r boolean;
  total_before bigint; rows_before bigint; total_after bigint; rows_after bigint;
  c_d bigint; c_l bigint; c_m bigint; c_s bigint;
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
  -- ---- b. 0013 compatibility: is_catalogue_herb is exactly what 0013 left ----
  perform 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and p.proname = 'is_catalogue_herb' and p.provolatile = 'i' and not p.prosecdef
     and pg_get_function_identity_arguments(p.oid) = 'p text'
     and exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c = 'search_path=""');
  if found then out := out || E'\nPASS b is_catalogue_herb(text): same signature, IMMUTABLE, not security definer, search_path pinned';
  else out := out || E'\nFAIL b is_catalogue_herb(text) missing or its attributes changed'; fails := fails + 1; end if;

  select count(*) into n from unnest(old_ids) q(id) where public.is_catalogue_herb(id);
  if n = array_length(old_ids, 1) then out := out || E'\nPASS b is_catalogue_herb still accepts all ' || n || ' of 0013''s ids';
  else out := out || E'\nFAIL b is_catalogue_herb accepts only ' || n || ' of ' || array_length(old_ids, 1); fails := fails + 1; end if;

  select count(*) into n from unnest(expansion_ids) q(id) where public.is_catalogue_herb(id);
  if n = 0 then out := out || E'\nPASS c is_catalogue_herb accepts NONE of the expansion ids (so the board and daily-task rule cannot see them)';
  else out := out || E'\nFAIL c is_catalogue_herb accepts ' || n || ' expansion ids; scoring would count them'; fails := fails + 1; end if;

  if public.is_scoring_task('seasonal:spring') and public.is_scoring_task('collection:habitat-garden') and not public.is_scoring_task('collection:expansion')
     and public.is_achievement('first-find') and public.is_achievement('habitat-sweep') and not public.is_achievement('expansion-explorer') then
    out := out || E'\nPASS b/c is_scoring_task and is_achievement unchanged: no standing task or achievement for the expansion';
  else out := out || E'\nFAIL b/c is_scoring_task or is_achievement changed'; fails := fails + 1; end if;

  if not public.is_research_task('daily:find:' || expansion_ids[1]) and public.is_research_task('daily:find:' || old_ids[1]) then
    out := out || E'\nPASS c a daily research task for an expansion id is still refused; for a printed card still accepted';
  else out := out || E'\nFAIL c daily research task acceptance changed'; fails := fails + 1; end if;

  -- ---- the two new functions ----
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and p.proname in ('is_expansion_herb', 'is_permitted_herb') and p.provolatile = 'i' and not p.prosecdef
     and pg_get_function_identity_arguments(p.oid) = 'p text'
     and exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c = 'search_path=""');
  if n = 2 then out := out || E'\nPASS d is_expansion_herb and is_permitted_herb exist, IMMUTABLE, not security definer, search_path pinned';
  else out := out || E'\nFAIL d the two new functions are missing or have the wrong attributes'; fails := fails + 1; end if;

  select count(*) into n from unnest(expansion_ids) q(id) where public.is_expansion_herb(id) and public.is_permitted_herb(id);
  if n = array_length(expansion_ids, 1) then out := out || E'\nPASS d all ' || n || ' expansion ids are permitted';
  else out := out || E'\nFAIL d only ' || n || ' of ' || array_length(expansion_ids, 1) || ' expansion ids permitted (trimmed batch? edit expansion_ids)'; fails := fails + 1; end if;

  select count(*) into n from unnest(old_ids) q(id) where public.is_permitted_herb(id) and not public.is_expansion_herb(id);
  if n = array_length(old_ids, 1) then out := out || E'\nPASS b/d all ' || n || ' original ids are still permitted, and are not in the expansion list';
  else out := out || E'\nFAIL b/d original ids not all permitted, or one is in the expansion list'; fails := fails + 1; end if;

  select count(*) into n from unnest(array['not-a-card', 'Taraxacum-officinale', 'taraxacum officinale', 'taraxacum-officinale ',
      ' taraxacum-officinale', 'eupatorium-perfoliatum-x', 'Eupatorium-perfoliatum', 'rumex', '', 'acer-spp ']) q(id)
   where public.is_permitted_herb(id);
  if n = 0 then out := out || E'\nPASS d unknown ids and near-miss spellings are refused';
  else out := out || E'\nFAIL d ' || n || ' near-miss or unknown ids were permitted'; fails := fails + 1; end if;

  r := public.is_permitted_herb(null);
  if r is null then out := out || E'\nPASS d null stays null (every herb_id column is NOT NULL)';
  else out := out || E'\nFAIL d null was answered ' || r::text; fails := fails + 1; end if;

  -- ---- the four constraints: present, NOT VALID (nothing re-scanned), now calling is_permitted_herb ----
  for cn in select * from (values ('discoveries', 'discoveries_valid_herb'), ('learned', 'learned_valid_herb'),
                                 ('mastered', 'mastered_valid_herb'), ('sightings', 'sightings_valid_herb')) v(t, k) loop
    perform 1 from pg_constraint k join pg_class t on t.oid = k.conrelid join pg_namespace s on s.oid = t.relnamespace
     where s.nspname = 'public' and t.relname = cn.t and k.conname = cn.k and not k.convalidated
       and pg_get_constraintdef(k.oid) like '%is_permitted_herb%';
    if found then out := out || E'\nPASS a ' || cn.k || ' present, NOT VALID, calls is_permitted_herb';
    else out := out || E'\nFAIL a ' || cn.k || ' missing, validated, or not pointing at is_permitted_herb'; fails := fails + 1; end if;
  end loop;

  perform 1 from pg_constraint k where k.conname = 'research_valid_task' and not k.convalidated and pg_get_constraintdef(k.oid) like '%is_research_task%';
  if found then out := out || E'\nPASS b research_valid_task untouched (still is_research_task, NOT VALID)';
  else out := out || E'\nFAIL b research_valid_task changed'; fails := fails + 1; end if;

  -- ---- a. existing records intact ----
  select (select count(*) from public.discoveries), (select count(*) from public.learned),
         (select count(*) from public.mastered), (select count(*) from public.sightings) into c_d, c_l, c_m, c_s;
  out := out || E'\nINFO a rows at start: discoveries=' || c_d || ', learned=' || c_l || ', mastered=' || c_m || ', sightings=' || c_s
        || ' (compare with the counts taken before applying; this script reads them and changes none)';

  select (select count(*) from public.discoveries x where not public.is_permitted_herb(x.herb_id))
       + (select count(*) from public.learned     x where not public.is_permitted_herb(x.herb_id))
       + (select count(*) from public.mastered    x where not public.is_permitted_herb(x.herb_id))
       + (select count(*) from public.sightings   x where not public.is_permitted_herb(x.herb_id))
    into n;
  if n = 0 then out := out || E'\nPASS a no pre-existing row holds an id the permitted list refuses';
  else out := out || E'\nNOTE a ' || n || ' pre-existing rows hold ids the list refuses (written before 0013; they were already unscored; 0015 did not change that)'; end if;

  -- ---- c. no new scoring: the real standings function, before and after a fixture participant (rolled back) ----
  select coalesce(sum(points), 0), count(*) into total_before, rows_before from public.leaderboard_standings(null, 200);
  insert into auth.users (id, aud, role, email) values (ua, 'authenticated', 'authenticated', 'expansion-ids-' || ua || '@example.invalid');
  insert into public.leaderboard_participants (user_id, region_id) values (ua, null);

  begin
    insert into public.discoveries (user_id, herb_id) values (ua, old_ids[1]);
    insert into public.discoveries (user_id, herb_id) values (ua, expansion_ids[1]);
    out := out || E'\nPASS d discoveries accepts a printed id and an expansion id through the real constraint';
  exception when others then
    out := out || E'\nFAIL d discoveries refused a fixture row: ' || sqlerrm; fails := fails + 1;
  end;
  begin
    insert into public.learned (user_id, herb_id) values (ua, expansion_ids[1]);
    insert into public.mastered (user_id, herb_id) values (ua, expansion_ids[1]);
    out := out || E'\nPASS d learned and mastered accept an expansion id';
  exception when others then
    out := out || E'\nFAIL d learned/mastered refused an expansion id: ' || sqlerrm; fails := fails + 1;
  end;
  begin
    insert into public.sightings (id, user_id, herb_id, date, notes) values ('t_exp_s1', ua, expansion_ids[1], current_date,
      'a note long enough to qualify as an observation for the journal rule');
    out := out || E'\nPASS d a sighting of an expansion id is accepted';
  exception when others then
    out := out || E'\nFAIL d a sighting of an expansion id was refused: ' || sqlerrm; fails := fails + 1;
  end;
  begin
    insert into public.discoveries (user_id, herb_id) values (ua, 'not-a-card');
    out := out || E'\nFAIL d a discovery of an unknown id was accepted'; fails := fails + 1;
  exception when check_violation then
    out := out || E'\nPASS d a discovery of an unknown id is refused (check_violation)';
  end;

  select coalesce(sum(points), 0), count(*) into total_after, rows_after from public.leaderboard_standings(null, 200);
  if rows_after = rows_before + 1 and total_after - total_before = 50 then
    out := out || E'\nPASS c the participant scores exactly 50 (the printed discovery); the expansion discovery, learned, mastered and sighting add 0';
  else
    out := out || E'\nFAIL c standings moved by ' || (total_after - total_before) || ' points over ' || (rows_after - rows_before) || ' new rows (expected 50 over 1; concurrent writes on TEST can disturb this: re-run once)'; fails := fails + 1;
  end if;

  -- ---- reported, not judged ----
  out := out || E'\nINFO new functions executable by anon=' || has_function_privilege('anon', 'public.is_permitted_herb(text)', 'execute')::text
        || ', authenticated=' || has_function_privilege('authenticated', 'public.is_permitted_herb(text)', 'execute')::text
        || ' (authenticated MUST stay true: CHECK constraints run as the inserting role; anon matches is_catalogue_herb''s 0013 posture)';

  raise exception E'RESULT %\n%', case when fails = 0 then 'ALL PASSED' else fails || ' FAILED' end, out;
end
$verify$;
