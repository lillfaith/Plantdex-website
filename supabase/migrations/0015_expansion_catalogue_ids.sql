-- 0015_expansion_catalogue_ids.sql
--
-- STATUS: DRAFT. NOT APPLIED ANYWHERE. Written by the progression-design lane for owner review; nothing in
-- the app reads or depends on it, no workflow runs it, and applying it to ANY database needs the owner's
-- explicit approval of THIS file. Test plan: docs/agent-workflow/migration-0015-test-plan.md.
--
-- WHAT IT DOES. `public.is_catalogue_herb()` is the database's list of valid card ids (0013). Every new
-- discoveries / learned / mastered / sightings row is checked against it by a CHECK constraint, and
-- `leaderboard_standings()` counts only ids it accepts. The list is hard-coded to the 54 cards of
-- today's CATALOGUE (45 printed + 9 Field Cards), so a discovery of any of the 85 digital-only Herbdex
-- Expansion cards (#57-141) is REFUSED by the database. This file replaces the function with the same
-- 54 ids, in the same order, followed by the 85 expansion ids in card-number order.
--
-- WHAT IT DELIBERATELY DOES NOT DO.
--   * It changes no constraint, trigger, policy, table, column or grant. The five CHECK constraints
--     from 0013 call the function BY NAME, so they pick up the new body without being touched, and they
--     stay NOT VALID: no existing row is re-checked, deleted or rewritten.
--   * It adds no id for a card the app does not yet serve. See "APPLY ONLY A RELEASED BATCH" below.
--   * It scores nothing new. LEADERBOARD_POINTS (50 / 15 / 100) are unchanged; a discovery of any valid id,
--     Field Cards included, already pays 50 and that is the one rule being inherited.
--   * It does not touch is_scoring_task, is_research_task or is_achievement. A DAILY task id is accepted
--     for any id this function accepts (0013), so daily:* for the new cards follows for free. Standing
--     tasks and achievements are a separate decision (docs/expansion/progression-inheritance.md, section 3).
--
-- APPLY ONLY A RELEASED BATCH. The function is executable through PostgREST by any caller, and every
-- discovery insert is a plain RLS-scoped upsert from the browser, so a listed id is an id any signed-in client
-- can record - and score 50 board points for - whether or not the app serves that card yet. Listing a card
-- that is HELD (an unresolved safety review, an unapproved image) would therefore let a hand-written request
-- record it. Before applying, delete from the second block every id that is not live in the build that is
-- going out; the schema test accepts any in-order subset, and the id order and spelling come from the
-- generated catalogue, never from this file.
--
-- ORDER OF OPERATIONS (details in the test plan): this migration first, on TEST; the edge bundle second
-- (`npm run sync:edge-shared`, deploy `herbdex-action`); the catalogue flag last. Nothing writes a new id
-- until the flag is on, so applying this first is inert. Reversing the order is not: a client that records
-- a new id against a database that has not heard of it gets a CHECK violation and, signed in, a failed sync.
--
-- ROLLBACK: docs/agent-workflow/migration-0015-rollback.sql restores the 0013 body. Safe only while no row
-- holds a new id (the test plan has the pre-check); otherwise those rows stop scoring, which changes
-- standings, and the right move is to leave this in place.
--
-- IDEMPOTENT: `create or replace`, same signature, same attributes. Running it twice changes nothing.
--
-- Block 1 is 0013's list, verbatim, in order. Block 2 is the expansion batch. Do not interleave.

create or replace function public.is_catalogue_herb(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p = any (array[
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
    'callicarpa-americana',
    -- Block 2: expansion batch, card numbers 57-141. Delete any id that is not live in the build going out.
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
