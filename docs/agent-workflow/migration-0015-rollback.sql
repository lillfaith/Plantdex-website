-- Rollback for 0015_expansion_catalogue_ids.sql. TEST PROJECT ONLY. Not a migration; not under supabase/migrations/.
-- Run in the Supabase SQL editor of the TEST project as ONE paste.
--
-- IT REFUSES, AND IT NEVER DELETES. The whole script is one DO block, which Postgres runs in one transaction. Step 1 counts the rows in
-- the four tables that hold an id outside the 54 of 0013; if ANY count is non-zero it raises an exception and NOTHING is changed (the
-- function and constraints stay as 0015 left them). Rolling back under those rows would leave records the database would now refuse had
-- they been written today; that is a decision for the owner, not something a script does. It issues no DELETE, no UPDATE and no
-- TRUNCATE against any table, ever.
--
-- Step 2 re-points the four constraints at 0013's `is_catalogue_herb` (each NOT VALID, as in 0013), then drops the two functions 0015
-- added. `is_catalogue_herb` and every other function are untouched by both 0015 and this script.
-- The 54 ids below are 0013's list, used only for the pre-check; the schema test requires them to equal 0013's, in order.

do $rollback$
declare
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
  d integer; l integer; m integer; s integer;
begin
  select (select count(*) from public.discoveries x where x.herb_id <> all (old_ids)),
         (select count(*) from public.learned     x where x.herb_id <> all (old_ids)),
         (select count(*) from public.mastered    x where x.herb_id <> all (old_ids)),
         (select count(*) from public.sightings   x where x.herb_id <> all (old_ids))
    into d, l, m, s;

  if d + l + m + s > 0 then
    raise exception 'ROLLBACK REFUSED: rows already hold an expansion id (discoveries_beyond_54=%, learned_beyond_54=%, mastered_beyond_54=%, sightings_beyond_54=%). Nothing was changed. Leave 0015 in place.', d, l, m, s;
  end if;

  alter table public.discoveries drop constraint if exists discoveries_valid_herb;
  alter table public.discoveries add constraint discoveries_valid_herb check (public.is_catalogue_herb(herb_id)) not valid;
  alter table public.learned drop constraint if exists learned_valid_herb;
  alter table public.learned add constraint learned_valid_herb check (public.is_catalogue_herb(herb_id)) not valid;
  alter table public.mastered drop constraint if exists mastered_valid_herb;
  alter table public.mastered add constraint mastered_valid_herb check (public.is_catalogue_herb(herb_id)) not valid;
  alter table public.sightings drop constraint if exists sightings_valid_herb;
  alter table public.sightings add constraint sightings_valid_herb check (public.is_catalogue_herb(herb_id)) not valid;

  drop function if exists public.is_permitted_herb(text);
  drop function if exists public.is_expansion_herb(text);

  raise notice 'ROLLBACK DONE: constraints point at is_catalogue_herb again; is_permitted_herb and is_expansion_herb are gone; no row was touched.';
end
$rollback$;
