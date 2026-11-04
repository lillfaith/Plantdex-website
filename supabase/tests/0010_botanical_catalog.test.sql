-- What 0010 claims, exercised against a real PostgreSQL.
--
-- The claims worth testing are the ones that are invisible by reading: a constraint that
-- looks right and permits the thing it names, a policy that looks closed and is not, and a
-- migration that works once and breaks on the second application. 0008 shipped all three
-- kinds of defect and every one was found here.
--
--   psql -f supabase/tests/harness.sql
--   psql -f supabase/migrations/0010_botanical_catalog.sql
--   psql -f supabase/tests/0010_botanical_catalog.test.sql

\set ON_ERROR_STOP on

-- ─── A. THE MIGRATION IS REPEATABLE ──────────────────────────────────────────
--
-- Applied twice in a row, which is what a re-run of a deploy does and what found 0008's
-- re-grandfathering bug. Everything here is `if not exists`, but that is a claim, not a
-- fact, until it has been done.
\i supabase/migrations/0010_botanical_catalog.sql
do $$ begin perform t_pass('0010 applies a second time without error'); end $$;

-- Fixtures: one source, one region, one species. Inserted as the owner, which is what the
-- service role is — RLS is tested separately in section F.
insert into public.catalog_sources (id, title, kind, verified, verified_by, verified_on)
values ('gbif-backbone', 'GBIF Backbone Taxonomy', 'taxonomic-backbone', true, 'test', current_date)
on conflict (id) do nothing;

insert into public.catalog_sources (id, title, kind)
values ('ai-candidate', 'An unchecked reference a model proposed', 'other')
on conflict (id) do nothing;

insert into public.catalog_regions (id, kind, name, launched)
values ('us-ga', 'state', 'Georgia', true)
on conflict (id) do nothing;

insert into public.catalog_species (species_key, accepted_name, review_status, reviewed_by, reviewed_on)
values ('taraxacum officinale', 'Taraxacum officinale', 'approved', 'test', current_date)
on conflict (species_key) do nothing;

insert into public.catalog_species (species_key, accepted_name)
values ('monarda fistulosa', 'Monarda fistulosa')
on conflict (species_key) do nothing;

-- ─── B. CLAIMS ARE NOT REQUIRED FOR A CARD; ELIGIBILITY IS ─────────────────
--
-- THIS SECTION ASSERTED THE OPPOSITE AND WAS WRONG. It published a card for a species with
-- `medicinally_relevant = false` and called it correct, on the reasoning that Layer C must
-- not block Layer B. Half of that is right and is kept: individual Healing Traits,
-- compounds and preparations are reviewed one at a time and a card may ship before any of
-- them exist. The other half had no basis — Plantdex is a medicinal-plant deck, and a
-- species with no documented medicinal relevance is a Seed Shelf find rather than a card.
--
-- So the property under test is now the precise one: ZERO APPROVED CLAIMS is fine, ZERO
-- ELIGIBILITY is not.
do $$
declare n integer;
begin
  -- Unpublished, with nothing medicinal anywhere: a legitimate draft.
  insert into public.collectible_cards (species_key, tier, rarity, xp, published)
  values ('monarda fistulosa', 'generated', 'Common', 100, false)
  on conflict (species_key) do nothing;
  perform t_pass('an UNPUBLISHED card may exist for a merely catalogued species');

  -- Publishing it is refused while the species is `pending`.
  begin
    update public.collectible_cards set published = true where species_key = 'monarda fistulosa';
    raise exception 'FAIL  a pending species was published as a collectible';
  exception when check_violation then
    perform t_pass('a pending species cannot be published as a collectible');
  end;

  -- Make it eligible, properly: kind, basis, sources, reviewer, date.
  update public.catalog_species set
    medicinal_eligibility = 'eligible',
    medicinal_relevance_kind = 'historical-use',
    eligibility_basis = 'Documented in regional ethnobotanical literature as a traditional remedy.',
    eligibility_sources = array['gbif-backbone'],
    eligibility_reviewed_by = 'test',
    eligibility_reviewed_on = current_date
  where species_key = 'monarda fistulosa';

  update public.collectible_cards set published = true where species_key = 'monarda fistulosa';
  perform t_pass('an eligible species may be published');

  -- And it got there with no medicinal claims at all, which is the half worth keeping.
  select count(*) into n from public.medicinal_claims where species_key = 'monarda fistulosa';
  perform t_assert_count(n, 0, 'publication required ZERO approved medicinal claims');

  insert into public.card_renders (species_key, render_version, front_path, sprite_recipe, content_hash)
  values ('monarda fistulosa', 1, 'cards/monarda-fistulosa.webp', '{"shape":"tall"}'::jsonb,
          repeat('a', 64))
  on conflict do nothing;
  perform t_pass('a render exists for a card with no medicinal claims');
end $$;

-- ─── B2. THE GATE HOLDS IN BOTH DIRECTIONS ──────────────────────────────────
--
-- A gate checked only when the card is written holds for one instant. Withdrawing
-- eligibility afterwards would leave a published card for a species somebody has just
-- decided is not medicinal, and nothing would notice.
do $$
begin
  begin
    update public.catalog_species
      set medicinal_eligibility = 'ineligible',
          eligibility_reviewed_by = 'test', eligibility_reviewed_on = current_date
      where species_key = 'monarda fistulosa';
    raise exception 'FAIL  eligibility was withdrawn from under a published card';
  exception when check_violation then
    perform t_pass('eligibility cannot be withdrawn while a card is published');
  end;

  -- Unpublish first, and the same edit is allowed. The order is the point.
  update public.collectible_cards set published = false where species_key = 'monarda fistulosa';
  update public.catalog_species
    set medicinal_eligibility = 'ineligible',
        eligibility_reviewed_by = 'test', eligibility_reviewed_on = current_date
    where species_key = 'monarda fistulosa';
  perform t_pass('unpublishing first permits the withdrawal');

  -- Put it back for the sections that follow.
  update public.catalog_species
    set medicinal_eligibility = 'eligible', medicinal_relevance_kind = 'historical-use'
    where species_key = 'monarda fistulosa';
end $$;

-- ─── B3. A GENUS RECORD DOES NOT MAKE A SPECIES ELIGIBLE ────────────────────
--
-- "Solidago has been used medicinally" says nothing about *Solidago altissima*. Reasoning
-- that way would manufacture eligibility for whole genera at once, which is the cheapest
-- possible route to a fabricated 2,000.
do $$
begin
  insert into public.catalog_species
    (species_key, accepted_name, medicinal_eligibility, medicinal_relevance_kind,
     eligibility_basis, eligibility_sources, eligibility_from_genus_record,
     eligibility_reviewed_by, eligibility_reviewed_on)
  values ('solidago gigantea', 'Solidago gigantea', 'pending', 'traditional-use',
          'The GENUS Solidago is recorded in traditional use; nothing species-level found yet.',
          array['gbif-backbone'], true, 'test', current_date);
  perform t_pass('a genus-derived record may be recorded as pending');

  begin
    update public.catalog_species set medicinal_eligibility = 'eligible'
      where species_key = 'solidago gigantea';
    raise exception 'FAIL  a genus-derived record was made eligible';
  exception when check_violation then
    perform t_pass('a genus-derived record cannot be made eligible');
  end;
end $$;

-- ─── B4. AN ELIGIBILITY DECISION IS REVIEWED, AND SAYS WHAT KIND ────────────
do $$
begin
  begin
    insert into public.catalog_species (species_key, accepted_name, medicinal_eligibility)
    values ('verbascum thapsus', 'Verbascum thapsus', 'eligible');
    raise exception 'FAIL  eligible was accepted with no reviewer, basis or source';
  exception when check_violation then
    perform t_pass('eligible with no reviewer is refused');
  end;

  begin
    insert into public.catalog_species
      (species_key, accepted_name, medicinal_eligibility, eligibility_reviewed_by, eligibility_reviewed_on)
    values ('verbascum thapsus', 'Verbascum thapsus', 'eligible', 'test', current_date);
    raise exception 'FAIL  eligible was accepted with no relevance kind or source';
  exception when check_violation then
    perform t_pass('eligible with no documented relevance is refused');
  end;

  -- `ineligible` is a determination too, and names its reviewer.
  begin
    insert into public.catalog_species (species_key, accepted_name, medicinal_eligibility)
    values ('verbascum thapsus', 'Verbascum thapsus', 'ineligible');
    raise exception 'FAIL  ineligible was accepted with no reviewer';
  exception when check_violation then
    perform t_pass('ineligible with no reviewer is refused');
  end;

  -- `pending` carries nothing. That is what makes it the honest default.
  insert into public.catalog_species (species_key, accepted_name)
  values ('verbascum thapsus', 'Verbascum thapsus');
  perform t_assert(
    (select medicinal_eligibility = 'pending' from public.catalog_species
     where species_key = 'verbascum thapsus'),
    'a newly catalogued species is pending, carrying nothing');
end $$;

-- ─── B5. THE PRINTED DECK IS PRESERVED, AND ITS GAP IS WRITTEN DOWN ─────────
--
-- The 45 printed cards are in buyers' hands and on the live site. This table did not
-- publish them and must not pretend to re-authorise them — but "already shipped" is not a
-- review, and the gap must not vanish into an exemption nobody can see.
do $$
begin
  insert into public.catalog_species (species_key, accepted_name)
  values ('taraxacum erythrospermum', 'Taraxacum erythrospermum') on conflict do nothing;

  begin
    insert into public.collectible_cards (species_key, tier, card_number, rarity, xp, published)
    values ('taraxacum erythrospermum', 'printed', 44, 'Common', 100, true);
    raise exception 'FAIL  a printed card was published with no eligibility and no stated gap';
  exception when check_violation then
    perform t_pass('even a printed card cannot be published while silently unreviewed');
  end;

  insert into public.collectible_cards
    (species_key, tier, card_number, rarity, xp, published, eligibility_review_gap)
  values ('taraxacum erythrospermum', 'printed', 44, 'Common', 100, true,
          'Printed deck 01, shipped before the catalog existed. Eligibility review outstanding.');
  perform t_pass('a printed card publishes once its review gap is recorded in writing');
end $$;

-- ─── C. HISTORICAL USE IS RELEVANCE, NOT EFFICACY ──────────────────────────
--
-- The distinction the whole product rests on: a plant may be collectible BECAUSE people
-- used it, and that is never a claim the use worked. The column records which kind of
-- relevance was found, and Layer C holds efficacy separately, per claim.
do $$
declare kinds text[];
begin
  insert into public.catalog_species
    (species_key, accepted_name, medicinal_eligibility, medicinal_relevance_kind,
     eligibility_basis, eligibility_sources, eligibility_reviewed_by, eligibility_reviewed_on)
  values ('asimina triloba', 'Asimina triloba', 'eligible', 'historical-use',
          'Recorded in regional ethnobotanical literature; included on that basis alone.',
          array['gbif-backbone'], 'test', current_date);
  perform t_pass('historical use alone establishes eligibility');

  select array_agg(distinct medicinal_relevance_kind) into kinds
  from public.catalog_species where medicinal_relevance_kind is not null;
  perform t_assert(
    kinds <@ array['historical-use','traditional-use','scientific-study']::text[],
    'relevance kinds stay within the three documented values');

  -- There is deliberately no efficacy column on this table to set.
  perform t_assert(
    not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'catalog_species'
        and column_name in ('efficacy', 'proven', 'effective', 'works')
    ),
    'Layer A carries no efficacy field for anybody to fill in');
end $$;

-- ─── D. THE MEDICINAL LAYER CANNOT PUBLISH ITSELF ────────────────────────────
--
-- Four separate ways a claim could reach `approved` without having earned it. Each is a
-- line somebody could plausibly write.
do $$
declare got boolean;
begin
  -- 1. Approved with no reviewer.
  begin
    insert into public.medicinal_claims (species_key, kind, body, standing, review_status, source_ids)
    values ('taraxacum officinale', 'traditional-use', 'A claim with nobody behind it.',
            'traditional', 'approved', array['gbif-backbone']);
    raise exception 'FAIL  an approved claim was accepted with no reviewer';
  exception when check_violation then
    perform t_pass('approved claim with no reviewer is refused');
  end;

  -- 2. Approved with no citation.
  begin
    insert into public.medicinal_claims
      (species_key, kind, body, standing, review_status, reviewed_by, reviewed_on)
    values ('taraxacum officinale', 'traditional-use', 'A claim with nobody behind it.',
            'traditional', 'approved', 'test', current_date);
    raise exception 'FAIL  an approved claim was accepted with no source';
  exception when check_violation then
    perform t_pass('approved claim with no citation is refused');
  end;

  -- 3. AI-drafted and approved in one step. THE CENTRAL RULE: a model's draft may never be
  --    the published state, however well sourced it looks and however many models agree.
  begin
    insert into public.medicinal_claims
      (species_key, kind, body, standing, review_status, reviewed_by, reviewed_on,
       source_ids, drafted_by)
    values ('taraxacum officinale', 'studied-property', 'Something a model wrote.',
            'laboratory', 'approved', 'test', current_date, array['gbif-backbone'], 'ai-assisted');
    raise exception 'FAIL  an AI-drafted claim was approved directly';
  exception when check_violation then
    perform t_pass('an ai-assisted draft cannot be approved without re-authoring');
  end;

  -- 4. A toxicity claim that forgot to mark itself high-risk. Derived, not typed.
  insert into public.medicinal_claims (species_key, kind, body, standing)
  values ('taraxacum officinale', 'toxicity', 'A hazard note nobody flagged.', 'traditional');
  select high_risk into got from public.medicinal_claims
    where species_key = 'taraxacum officinale' and kind = 'toxicity';
  perform t_assert(got, 'high_risk is derived from kind, not from the author');

  insert into public.medicinal_claims (species_key, kind, body, standing)
  values ('taraxacum officinale', 'compound', 'Inulin is present in the root.', 'laboratory');
  select high_risk into got from public.medicinal_claims
    where species_key = 'taraxacum officinale' and kind = 'compound';
  perform t_assert(not got, 'an ordinary claim is not marked high risk');
end $$;

-- ─── E. OCCURRENCE: ABSENCE IS NOT EVIDENCE ──────────────────────────────────
do $$
begin
  -- `insufficient` is the honest default and needs nothing.
  insert into public.catalog_species_regions (species_key, region_id, occurrence)
  values ('monarda fistulosa', 'us-ga', 'insufficient');
  perform t_pass('insufficient occurrence needs no source');

  -- `unlikely` is a positive claim and must cite one.
  begin
    insert into public.catalog_species_regions (species_key, region_id, occurrence)
    values ('asimina triloba', 'us-ga', 'unlikely');
    raise exception 'FAIL  unlikely was accepted with no source';
  exception when check_violation then
    perform t_pass('unlikely occurrence without a source is refused');
  end;

  -- The four facts are independent: invasive and rare at the same time is representable.
  insert into public.catalog_species_regions
    (species_key, region_id, occurrence, nativity, invasive_listing, encounter_rate, source_ids)
  values ('asimina triloba', 'us-ga', 'confirmed', 'native', 'not-listed', 'rare',
          array['gbif-backbone']);
  perform t_pass('occurrence, nativity, invasive listing and encounter rate are independent');
end $$;

-- ─── F. NO CLIENT MAY WRITE, AND UNAPPROVED CONTENT IS UNREADABLE ────────────
--
-- The failure this section exists for is silent: a UI that filters on `review_status`
-- correctly, over a table that would have handed the row to anyone who asked PostgREST
-- directly. Tested as the real `anon` and `authenticated` roles.
-- THE GRANT CHECK COMES FIRST, OR THIS WHOLE SECTION PROVES NOTHING.
-- If `anon` lacks the table privilege, every insert below fails on the grant and the
-- refusals say nothing about RLS — the tests pass and the policies are untested. Supabase
-- grants these by default, which is why RLS is the boundary there; `harness.sql` mirrors
-- that with `alter default privileges`. This asserts the mirror actually took effect.
do $$
begin
  perform t_assert(
    has_table_privilege('anon', 'public.catalog_species', 'INSERT'),
    'anon HAS insert privilege, so the refusals below are RLS and not a missing grant');
  perform t_assert(
    has_table_privilege('anon', 'public.medicinal_claims', 'INSERT'),
    'anon HAS insert privilege on medicinal_claims');
end $$;

do $$
declare n integer;
begin
  set local role anon;

  -- Writes.
  begin
    insert into public.catalog_species (species_key, accepted_name)
    values ('fakus plantus', 'Fakus plantus');
    raise exception 'FAIL  anon inserted a species';
  exception when insufficient_privilege then perform t_pass('anon cannot insert a species');
  end;

  begin
    insert into public.medicinal_claims (species_key, kind, body, standing)
    values ('taraxacum officinale', 'toxicity', 'Anything at all.', 'traditional');
    raise exception 'FAIL  anon inserted a medicinal claim';
  exception when insufficient_privilege then perform t_pass('anon cannot insert a medicinal claim');
  end;

  -- Reads: approved visible, everything else not.
  select count(*) into n from public.catalog_species where species_key = 'taraxacum officinale';
  perform t_assert_count(n, 1, 'anon reads an approved species');

  select count(*) into n from public.catalog_species where species_key = 'monarda fistulosa';
  perform t_assert_count(n, 0, 'anon cannot read a draft species');

  select count(*) into n from public.medicinal_claims;
  perform t_assert_count(n, 0, 'anon cannot read ANY unapproved medicinal claim');

  select count(*) into n from public.catalog_sources where id = 'ai-candidate';
  perform t_assert_count(n, 0, 'anon cannot read an unverified source');

  select count(*) into n from public.catalog_sources where id = 'gbif-backbone';
  perform t_assert_count(n, 1, 'anon reads a verified source');

  reset role;
end $$;

do $$
declare n integer;
begin
  set local role authenticated;
  begin
    update public.medicinal_claims set review_status = 'approved';
    -- An UPDATE with no policy affects zero rows SILENTLY rather than raising, so the
    -- assertion has to be that nothing changed, not that something threw. 0008's section J
    -- got this wrong and passed while proving nothing.
    select count(*) into n from public.medicinal_claims where review_status = 'approved';
    perform t_assert_count(n, 0, 'authenticated cannot approve a claim by updating it');
  exception when insufficient_privilege then
    perform t_pass('authenticated cannot update a claim at all');
  end;
  reset role;
end $$;

-- ─── G. THE PRINTED DECK IS PROTECTED BY TYPE ────────────────────────────────
--
-- The 45 hand-designed cards must stay distinguishable from generated ones, or a renderer
-- bug overwrites artwork that cannot be regenerated — it came from a designer's PDF.
do $$
begin
  insert into public.catalog_species (species_key, accepted_name)
  values ('achillea millefolium', 'Achillea millefolium') on conflict do nothing;

  begin
    insert into public.collectible_cards (species_key, tier, rarity, xp)
    values ('achillea millefolium', 'printed', 'Common', 100);
    raise exception 'FAIL  a printed card was accepted with no card number';
  exception when check_violation then
    perform t_pass('a printed card must carry its deck number');
  end;

  insert into public.collectible_cards (species_key, tier, card_number, rarity, xp)
  values ('achillea millefolium', 'printed', 2, 'Common', 100);
  perform t_pass('a printed card with its number is accepted');
end $$;

-- ─── H. TAXONOMY MAY BE UNSETTLED ────────────────────────────────────────────
do $$
begin
  begin
    insert into public.catalog_species (species_key, accepted_name, taxonomy_status)
    values ('rhus vernix', 'Rhus vernix', 'synonym');
    raise exception 'FAIL  a synonym was accepted without naming its accepted taxon';
  exception when check_violation then
    perform t_pass('a synonym must name what it is a synonym of');
  end;

  insert into public.catalog_species (species_key, accepted_name, taxonomy_status)
  values ('toxicodendron vernix', 'Toxicodendron vernix', 'accepted') on conflict do nothing;
  insert into public.catalog_species
    (species_key, accepted_name, taxonomy_status, accepted_species_key)
  values ('rhus vernix', 'Rhus vernix', 'synonym', 'toxicodendron vernix');
  perform t_pass('a synonym pointing at its accepted taxon is accepted');

  insert into public.catalog_species (species_key, accepted_name, taxonomy_status)
  values ('solidago altissima', 'Solidago altissima', 'conflicting') on conflict do nothing;
  perform t_pass('conflicting taxonomy is representable rather than forced to accepted');
end $$;

-- ─── I. AN IMAGE CARRIES ITS LICENCE OR IT DOES NOT EXIST ────────────────────
do $$
begin
  begin
    update public.catalog_species set image_url = 'https://example.org/x.jpg'
    where species_key = 'monarda fistulosa';
    raise exception 'FAIL  an image was accepted with no licence or attribution';
  exception when check_violation then
    perform t_pass('an unlicensed image is refused');
  end;
end $$;

do $$ begin raise notice 'ALL 0010 SECTIONS PASSED'; end $$;
