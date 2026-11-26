-- 0015_expansion_catalogue_ids.sql
--
-- STATUS: REVIEWED DRAFT. Owner-approved for the TEST project ONLY (never production), after independent review, green CI and
-- confirmation that the file matches the reviewed commit. Procedure: docs/agent-workflow/migration-0015-test-apply.md.
--
-- WHAT IT DOES. Migration 0013 made the database refuse any card id that is not in `public.is_catalogue_herb()` (the 54 cards of
-- the CATALOGUE: 45 printed + 9 Field Cards), through four NOT VALID CHECK constraints (discoveries, learned, mastered, sightings).
-- That list also feeds the Field Board and the daily-research rule. This file lets those FOUR TABLES record the 85 digital-only Herbdex
-- Expansion ids (#57-141) and does nothing else:
--   * adds `public.is_expansion_herb(text)`: the 85 ids, in card-number order;
--   * adds `public.is_permitted_herb(text)`: `is_catalogue_herb(p) or is_expansion_herb(p)`, i.e. what a card-id column may HOLD;
--   * re-points exactly those four CHECK constraints from `is_catalogue_herb` to `is_permitted_herb`, each again NOT VALID.
--
-- WHY `is_catalogue_herb` IS NOT TOUCHED (owner decision 6, and the reason this is a different shape from the first draft).
-- The first draft widened `is_catalogue_herb` itself. `leaderboard_standings()` and `is_research_task()` call that function, so
-- every expansion discovery would have scored 50 Field Board points the moment the database accepted it. The owner's decision is that
-- expansion discoveries contribute NO board score until scan eligibility, database integrity and fraud-resistant collection rules are
-- validated and separately approved. So the scoring side keeps asking the unchanged 0013 function (54 ids, same signature, same order,
-- byte-identical), and "may be stored" is a separate question with its own function. An id can now be STORED and still be worth
-- nothing on the board, and that is a property of the SQL, not of a flag. A later decision that expansion cards should score is its own
-- migration that points the standings at a new function; nothing here prepares or implies it.
--
-- WHAT IT DELIBERATELY DOES NOT DO.
--   * It redefines no existing function: `is_catalogue_herb`, `is_scoring_task`, `is_research_task`, `is_achievement` and
--     `leaderboard_standings` are exactly as 0013 left them. Daily research tasks for an expansion id are therefore still refused.
--   * It adds no table, column, policy, grant, trigger or index, and writes no row. Constraints stay NOT VALID, so no existing row is
--     scanned, re-checked, deleted or rewritten.
--   * It awards no XP and unlocks nothing: XP is derived by the client and the edge bundle from the printed deck only, and an
--     expansion id is not in it.
--   * It does not publish a card. The app serves no expansion card (NEXT_PUBLIC_EXPANSION_PILOT is off and nothing imports the pilot
--     data); this only stops the database being the thing that says no, so a released batch does not need a migration at the moment of
--     release. See "APPLY ONLY A RELEASED BATCH".
--
-- APPLY ONLY A RELEASED BATCH FOR ANYTHING REAL. A permitted id is an id any signed-in client can record by a hand-written request
-- whether or not the app serves that card. It scores nothing and pays nothing, but it does write a row that belongs to the player. On
-- the TEST project that is accepted by the owner. Before this file goes anywhere that holds real players, delete from
-- `is_expansion_herb` every id that is not live in the build that is going out; the schema test accepts any in-order subset.
--
-- ORDER OF OPERATIONS: this migration on TEST only. Nothing writes a new id until a catalogue gate in the app is on, so applying it is
-- inert for players.
--
-- ROLLBACK: docs/agent-workflow/migration-0015-rollback.sql. It REFUSES (raises, changes nothing) if any row in the four tables holds
-- an id outside the 54, and it never deletes or edits a player record.
--
-- IDEMPOTENT: `create or replace` and `drop constraint if exists` / `add constraint`. Running it twice changes nothing.

create or replace function public.is_expansion_herb(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p = any (array[
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
  ]::text[])
$$;

create or replace function public.is_permitted_herb(p text)
returns boolean language sql immutable set search_path = '' as $$
  select public.is_catalogue_herb(p) or public.is_expansion_herb(p)
$$;

alter table public.discoveries drop constraint if exists discoveries_valid_herb;
alter table public.discoveries add constraint discoveries_valid_herb check (public.is_permitted_herb(herb_id)) not valid;
alter table public.learned drop constraint if exists learned_valid_herb;
alter table public.learned add constraint learned_valid_herb check (public.is_permitted_herb(herb_id)) not valid;
alter table public.mastered drop constraint if exists mastered_valid_herb;
alter table public.mastered add constraint mastered_valid_herb check (public.is_permitted_herb(herb_id)) not valid;
alter table public.sightings drop constraint if exists sightings_valid_herb;
alter table public.sightings add constraint sightings_valid_herb check (public.is_permitted_herb(herb_id)) not valid;
