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

-- ─── B. A SPECIES MAY BE CATALOGUED, AND EVEN COLLECTIBLE, WITH NO MEDICINAL DATA ───
--
-- This is the whole point of three layers. If this section fails, 2,000 species is
-- unreachable again, because every one of them would need a medicinal review first.
do $$
declare n integer;
begin
  insert into public.collectible_cards (species_key, tier, rarity, xp, published)
  values ('monarda fistulosa', 'generated', 'Common', 100, true)
  on conflict (species_key) do nothing;

  select count(*) into n from public.medicinal_claims where species_key = 'monarda fistulosa';
  perform t_assert_count(n, 0, 'a card exists for a species with zero medicinal claims');

  insert into public.card_renders (species_key, render_version, front_path, sprite_recipe, content_hash)
  values ('monarda fistulosa', 1, 'cards/monarda-fistulosa.webp', '{"shape":"tall"}'::jsonb,
          repeat('a', 64))
  on conflict do nothing;
  perform t_pass('a render exists for a species with zero medicinal claims');
end $$;

-- ─── C. "MEDICINALLY RELEVANT" MUST SAY WHY ──────────────────────────────────
--
-- The brief's own requirement: record why a species qualifies. A flag with no basis is a
-- list somebody made up.
do $$
begin
  begin
    insert into public.catalog_species (species_key, accepted_name, medicinally_relevant)
    values ('asimina triloba', 'Asimina triloba', true);
    raise exception 'FAIL  a medicinally-relevant species was accepted with no basis';
  exception when check_violation then
    perform t_pass('medicinally_relevant without a basis is refused');
  end;

  insert into public.catalog_species
    (species_key, accepted_name, medicinally_relevant, medicinal_basis, medicinal_basis_sources)
  values ('asimina triloba', 'Asimina triloba', true,
          'Recorded in regional ethnobotanical literature; included for that reason alone.',
          array['gbif-backbone']);
  perform t_pass('medicinally_relevant with a basis and a source is accepted');
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
