-- The botanical catalog: three layers, deliberately separate, with the medicinal layer
-- unable to publish itself.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THREE TABLES AND NOT ONE WIDE ONE.
--
-- A species has three different KINDS of fact attached to it, and they have three different
-- evidence bars:
--
--   A  BOTANICAL     what the plant is and where it grows. Backed by GBIF/USDA/iNat, cheap
--                    to ingest, cheap to re-check, makes no claim about a person.
--   B  COLLECTIBLE   what its card looks like and how it plays. Our own invention; no
--                    external truth to get wrong.
--   C  MEDICINAL     what people have used it for and what might happen to them. Expensive,
--                    slow, and the only layer that can hurt somebody.
--
-- Collapsing them into one row means the cheapest fact and the most dangerous one share a
-- lifecycle: a species cannot be catalogued without somebody deciding whether it is safe,
-- and a card cannot be drawn without a medicinal review nobody has time to do. That is how
-- 2,000 species becomes unreachable, and it is also how an unreviewed toxicity note reaches
-- a reader on the back of a routine occurrence update.
--
-- So: a species may be CATALOGUED with no card and no medicinal content. It may be
-- COLLECTIBLE with no medicinal content. Layer C is additive and always optional.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHAT THIS MIGRATION DOES NOT DO. It creates no public write path of any kind. Every table
-- here is readable by the client roles under the conditions stated per table and writable by
-- nobody but the service role — the same posture `0005_species_packets.sql` takes for the
-- packet registry, and for the same reason: these rows are global, shared between every
-- user, and a client insert would let one person define what everybody else reads.
--
-- IT ALSO WRITES NO DATA. Ingestion is `scripts/ingest_species.py`, which emits artifacts a
-- human applies. Seeding from inside a migration would make the migration unrepeatable and
-- would bake today's GBIF answer into the schema.

-- ── Sources ────────────────────────────────────────────────────────────────────
--
-- The DB-side counterpart of `src/data/sources.json`, and it inherits that file's single
-- most important rule: `verified` means A HUMAN OPENED IT and confirmed it supports the
-- claim it is attached to. Nothing else may set it. An AI-proposed reference is a row with
-- `verified = false`, which is exactly what `docs/source-candidates.md` is for on the
-- repository side.
create table if not exists public.catalog_sources (
  id            text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  title         text not null check (length(title) between 4 and 300),
  publisher     text check (publisher is null or length(publisher) between 2 and 200),
  url           text check (url is null or url ~ '^https://'),
  -- What kind of thing this is, because "a database record" and "a clinical trial" are not
  -- the same evidence and must not look the same in a citation list.
  kind          text not null check (kind in (
                  'occurrence-database', 'taxonomic-backbone', 'flora', 'field-guide',
                  'ethnobotany', 'peer-reviewed', 'government', 'other'
                )),
  verified      boolean not null default false,
  verified_by   text check (verified_by is null or length(verified_by) between 2 and 120),
  verified_on   date,
  created_at    timestamptz not null default now(),
  -- Verification is a human act with a name and a date on it, or it has not happened.
  constraint verified_sources_name_their_checker
    check (not verified or (verified_by is not null and verified_on is not null))
);

-- ── Layer A: the botanical catalog ─────────────────────────────────────────────
--
-- Every species Plantdex knows about, card or no card. This is the layer that scales to
-- thousands, because every field in it comes from a database somebody else maintains.
create table if not exists public.catalog_species (
  -- Derived from the accepted binomial, never supplied by a caller — the same rule
  -- `species-identity.ts` enforces for the packet registry, for the same reason: a key that
  -- can be chosen is a key that can be collided with on purpose.
  species_key       text primary key
    check (species_key ~ '^[a-z][a-z-]{2,29} [a-z][a-z-]{1,29}$'),
  accepted_name     text not null
    check (accepted_name ~ '^[A-Z][a-z]{2,29} [a-z][a-z-]{1,29}'),
  -- Authorship as the source gave it, kept whole and never parsed into the name.
  name_authorship   text check (name_authorship is null or length(name_authorship) <= 200),
  family            text check (family is null or family ~ '^[A-Z][a-z]{2,39}$'),
  common_names      text[] not null default '{}',
  gbif_id           text check (gbif_id is null or gbif_id ~ '^[0-9]{1,12}$'),
  powo_id           text check (
                      powo_id is null or
                      powo_id ~ '^(urn:lsid:ipni\.org:names:)?[0-9]{1,10}-[0-9]{1,3}$'
                    ),
  usda_symbol       text check (usda_symbol is null or usda_symbol ~ '^[A-Z0-9]{2,10}$'),
  inat_taxon_id     text check (inat_taxon_id is null or inat_taxon_id ~ '^[0-9]{1,12}$'),

  -- TAXONOMY IS NOT ALWAYS SETTLED, AND THE SCHEMA MUST BE ABLE TO SAY SO.
  -- `unresolved` and `conflicting` are real, common answers from a backbone match, and
  -- forcing them to `accepted` would quietly invent a determination. A synonym row points
  -- at what it is a synonym OF and is never silently rewritten into it.
  taxonomy_status   text not null default 'unresolved' check (taxonomy_status in (
                      'accepted', 'synonym', 'unresolved', 'conflicting'
                    )),
  accepted_species_key text references public.catalog_species(species_key),

  -- Growth form drives the procedural sprite archetype. Nullable: most species will not
  -- have one until somebody looks, and guessing it draws the wrong plant.
  growth_form       text check (growth_form is null or growth_form in (
                      'rosette', 'erect-herb', 'vine', 'shrub', 'tree', 'grass',
                      'fern', 'succulent', 'aquatic'
                    )),
  -- The same five classes `src/lib/habitat.ts` already uses. Not a free-text field there
  -- and not one here.
  habitat_classes   text[] not null default '{}'
    check (habitat_classes <@ array['woodland','meadow','wetland','wayside','garden']::text[]),
  seasons           text[] not null default '{}'
    check (seasons <@ array['spring','summer','autumn','winter']::text[]),

  -- ── MEDICINAL ELIGIBILITY ────────────────────────────────────────────────────
  --
  -- THIS IS WHAT MAKES A SPECIES COLLECTIBLE, AND IT IS NOT A BOOLEAN.
  --
  -- Plantdex is a deck of medicinal plants. A species with no documented medicinal
  -- relevance belongs on the Seed Shelf, not in the collection — so eligibility is the gate
  -- on Layer B, enforced by `enforce_collectible_eligibility` below rather than by a
  -- convention somebody remembers.
  --
  -- THREE STATES, BECAUSE "NOT YET LOOKED AT" AND "LOOKED AT AND NO" ARE DIFFERENT FACTS.
  -- A boolean collapses them, and the collapse always resolves the same way: unreviewed
  -- reads as false, false reads as a decision, and nobody ever revisits it. `pending` is
  -- the default and the only state ingestion can produce.
  medicinal_eligibility text not null default 'pending' check (medicinal_eligibility in (
                          'pending', 'eligible', 'ineligible'
                        )),

  -- WHAT KIND OF RELEVANCE, AND THE DISTINCTION THAT MATTERS MOST ON THIS WHOLE TABLE.
  --
  -- Historical or traditional use is SUFFICIENT to make a species collectible and is NOT
  -- evidence that anything works or is safe. A card may exist because people used a plant;
  -- it may never imply the plant does what they used it for. `scientific-study` means
  -- studied, not proven — the same hedge `trait-evidence.ts` holds the printed deck to.
  -- Efficacy is a per-claim judgement in Layer C and has no column here, deliberately.
  medicinal_relevance_kind text check (medicinal_relevance_kind is null or medicinal_relevance_kind in (
                          'historical-use', 'traditional-use', 'scientific-study'
                        )),
  eligibility_basis     text check (eligibility_basis is null or length(eligibility_basis) between 20 and 2000),
  eligibility_sources   text[] not null default '{}',

  -- RULE 7: A GENUS RECORD DOES NOT MAKE ITS SPECIES ELIGIBLE.
  -- "Solidago has been used medicinally" says nothing about *Solidago altissima*
  -- specifically, and a catalog that reasons that way manufactures eligibility for whole
  -- genera at a stroke. A record derived from a genus-level source is marked, and a marked
  -- record cannot be `eligible` — somebody has to find a species-level source.
  eligibility_from_genus_record boolean not null default false,

  eligibility_reviewed_by text,
  eligibility_reviewed_on date,

  -- Image rights travel with the species or there is no image. Never a bare URL.
  image_url         text check (image_url is null or image_url ~ '^https://'),
  image_license     text check (image_license is null or image_license in (
                      'CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'public-domain', 'licensed'
                    )),
  image_attribution text,

  review_status     text not null default 'draft' check (review_status in (
                      'draft', 'in_review', 'approved', 'rejected'
                    )),
  reviewed_by       text,
  reviewed_on       date,

  source_ids        text[] not null default '{}',
  first_ingested_at timestamptz not null default now(),
  last_checked_on   date,

  -- An eligibility DECISION — either way — names what it rests on and who made it.
  -- `pending` carries nothing, which is what makes it the honest default.
  constraint eligibility_decisions_are_reviewed
    check (
      medicinal_eligibility = 'pending'
      or (eligibility_reviewed_by is not null and eligibility_reviewed_on is not null)
    ),
  constraint eligible_species_document_their_relevance
    check (
      medicinal_eligibility <> 'eligible'
      or (medicinal_relevance_kind is not null
          and eligibility_basis is not null
          and cardinality(eligibility_sources) > 0)
    ),
  constraint genus_records_cannot_make_a_species_eligible
    check (medicinal_eligibility <> 'eligible' or not eligibility_from_genus_record),
  constraint an_image_carries_its_licence
    check (image_url is null or (image_license is not null and image_attribution is not null)),
  constraint a_synonym_names_its_accepted_taxon
    check (taxonomy_status <> 'synonym' or accepted_species_key is not null),
  constraint approved_records_name_their_reviewer
    check (review_status <> 'approved' or (reviewed_by is not null and reviewed_on is not null))
);

-- Synonyms get rows rather than an array, because each one has its own source and its own
-- date: "GBIF said this in November 2026" is the fact, not "these names are the same".
create table if not exists public.catalog_synonyms (
  species_key   text not null references public.catalog_species(species_key) on delete cascade,
  synonym       text not null check (length(synonym) between 3 and 200),
  source_id     text references public.catalog_sources(id),
  checked_on    date not null default current_date,
  primary key (species_key, synonym)
);

-- ── Regions and occurrence ─────────────────────────────────────────────────────
--
-- Generalises `REGIONAL_STATUS` in `src/lib/invasive-status.ts`, whose governing sentence
-- this table exists to make structural: "'Invasive' is not a property of a species. It is a
-- relationship between a species and a place, asserted by somebody, on a date."
create table if not exists public.catalog_regions (
  id         text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  kind       text not null check (kind in ('country', 'state', 'ecoregion', 'county')),
  name       text not null check (length(name) between 2 and 120),
  parent_id  text references public.catalog_regions(id),
  -- Only a launched region is offered to players. Everything else can be ingested quietly.
  launched   boolean not null default false
);

create table if not exists public.catalog_species_regions (
  species_key   text not null references public.catalog_species(species_key) on delete cascade,
  region_id     text not null references public.catalog_regions(id) on delete cascade,

  -- FOUR SEPARATE FACTS THAT ARE ROUTINELY CONFUSED, AND THE BRIEF IS RIGHT THAT THEY ARE
  -- NOT INTERCHANGEABLE:
  --
  --   occurrence  is it recorded here          (evidence of presence)
  --   nativity    how did it get here          (native / introduced)
  --   invasive    is it a declared problem here (a jurisdiction's listing, not an opinion)
  --   encounter   how likely is a walker to meet it
  --
  -- A species can be invasive and rarely encountered; native and nearly extinct; introduced
  -- and the commonest thing on the verge. One column could express none of that.
  occurrence    text not null check (occurrence in (
                  'confirmed', 'likely', 'insufficient', 'unlikely'
                )),
  nativity      text check (nativity is null or nativity in (
                  'native', 'introduced', 'cryptogenic'
                )),
  invasive_listing text check (invasive_listing is null or invasive_listing in (
                  'listed', 'watchlist', 'not-listed'
                )),
  encounter_rate text check (encounter_rate is null or encounter_rate in (
                  'abundant', 'frequent', 'occasional', 'rare'
                )),
  seasons       text[] not null default '{}'
    check (seasons <@ array['spring','summer','autumn','winter']::text[]),

  -- The evidence behind `occurrence`, kept so the classification can be re-derived and
  -- audited rather than trusted. A count is not a claim; it is the reason for one.
  record_count  integer check (record_count is null or record_count >= 0),
  source_ids    text[] not null default '{}',
  checked_on    date not null default current_date,

  primary key (species_key, region_id),

  -- ABSENCE OF RECORDS IS NOT ABSENCE OF THE PLANT. `unlikely` is a positive claim that
  -- some authority excludes the species from this region, so it must cite one; `insufficient`
  -- is the honest default when nobody knows, and it needs nothing.
  constraint unlikely_is_a_claim_and_needs_a_source
    check (occurrence <> 'unlikely' or cardinality(source_ids) > 0)
);

-- ── Layer B: the collectible ───────────────────────────────────────────────────
--
-- A card is not a species. It is a decision to make one collectible, at a tier, with a
-- rarity — and it may exist for a species with no medicinal content at all.
create table if not exists public.collectible_cards (
  species_key     text primary key references public.catalog_species(species_key) on delete cascade,

  -- THE PRINTED 45 ARE A TIER OF THEIR OWN AND MUST STAY DISTINGUISHABLE.
  -- `printed` cards are hand-designed, exist physically, and their artwork is never
  -- regenerated by anything in this system. `generated` cards are ours to redraw. A column
  -- rather than a convention, so the renderer can refuse the first kind outright.
  tier            text not null check (tier in ('printed', 'generated')),
  card_number     integer check (card_number is null or card_number > 0),
  collection_id   text check (collection_id is null or collection_id ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  rarity          text not null check (rarity in ('Common', 'Uncommon', 'Rare', 'Epic')),
  xp              integer not null check (xp >= 0),
  unlock_basis    text not null default 'field-discovery' check (unlock_basis in (
                    'field-discovery', 'xp-threshold', 'purchase'
                  )),
  published       boolean not null default false,

  -- THE PRINTED 45 PREDATE THIS CATALOG AND ARE NOT RE-LITIGATED BY IT.
  -- They are in buyers' hands and on the live site; this table did not publish them and
  -- cannot unpublish them. But "already shipped" is not a review, and the gap must not
  -- become invisible just because it is inherited — so a printed card may be published
  -- while its species is not yet `eligible` ONLY by naming the gap in writing. The trigger
  -- below requires it, so the exemption is a sentence somebody wrote, not a silence.
  eligibility_review_gap text check (
    eligibility_review_gap is null or length(eligibility_review_gap) between 20 and 1000
  ),

  created_at      timestamptz not null default now(),

  -- A printed card's number is its identity in the physical deck; a generated one has none.
  constraint printed_cards_carry_a_number
    check (tier <> 'printed' or card_number is not null),

  -- ── THE EXEMPTION IS CAPPED BY THE DATABASE, NOT BY THE ARTWORK WORKFLOW ────
  --
  -- I previously defended the printed-tier publication exemption by saying the printed set
  -- "cannot grow, because printed artwork comes from a designer's PDF and no program
  -- produces one". That is true and it is NOT a database rule — it is a description of how
  -- we happen to work. Nothing here stopped somebody inserting any species at all as
  -- `tier = 'printed'` with an invented card number and a sentence in the gap column, and
  -- publishing it with no eligibility review whatsoever. The bypass was unbounded.
  --
  -- Collection 01 is 45 species plus the icon sheet and the disclaimer: numbers 1 to 47.
  -- Bounding the number, and making it unique within the pre-catalog deck, caps the whole
  -- exemption at 47 rows that the database itself will not exceed.
  constraint printed_cards_are_collection_01_numbers
    check (tier <> 'printed' or card_number between 1 and 47)
);

-- Mint-once render registry, modelled directly on `species_packets`: a render is created
-- once, cached, and shared by every user and every region. `content_hash` is what makes a
-- regeneration provably identical rather than merely expected to be.
create table if not exists public.card_renders (
  species_key    text not null references public.collectible_cards(species_key) on delete cascade,
  render_version integer not null check (render_version > 0),
  front_path     text not null,
  back_path      text,
  sprite_recipe  jsonb not null,
  content_hash   text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  minted_at      timestamptz not null default now(),
  primary key (species_key, render_version)
);

-- ── The eligibility gate ───────────────────────────────────────────────────────
--
-- ONLY A DOCUMENTED MEDICINAL SPECIES MAY BE A PUBLISHED COLLECTIBLE.
--
-- Plantdex is a medicinal-plant deck. A species with no documented medicinal relevance is a
-- Seed Shelf find, not a card, and that is the product's identity rather than a filter
-- applied at render time. So it is enforced here, in two directions, because one is not
-- enough:
--
--   * publishing a card for a species that is not `eligible` is refused;
--   * taking eligibility AWAY from a species that already has a published card is refused
--     until somebody unpublishes the card. Without the second, the gate holds only at the
--     instant of writing and a later edit walks straight through it.
--
-- A CHECK CONSTRAINT CANNOT DO THIS. It may not query another table, so the rule would have
-- to live in application code — which is where rules like this get forgotten by the second
-- caller. It is a trigger so that every path, including a hand-written SQL session and a
-- future ingestion script nobody has written yet, meets the same refusal.
--
-- WHAT THIS DELIBERATELY DOES NOT REQUIRE: approved medicinal CLAIMS. Eligibility is a
-- species-level determination that this plant has documented medicinal relevance;
-- individual Healing Traits, compounds and preparations are reviewed one at a time in Layer
-- C and arrive later. A card may ship with an eligibility review and no claims at all —
-- otherwise every card would wait on the slowest field it could ever carry, and the three
-- layers would have bought nothing.
create or replace function public.enforce_collectible_eligibility()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_eligibility text;
begin
  if not new.published then
    return new;   -- An unpublished card is a draft and may exist for anything catalogued.
  end if;

  select s.medicinal_eligibility into v_eligibility
  from public.catalog_species s
  where s.species_key = new.species_key;

  if v_eligibility = 'eligible' then
    return new;
  end if;

  -- The inherited exemption, and it costs a sentence. See `eligibility_review_gap`.
  -- Collection 01 only. A future printed deck declares a `collection_id`, so it is reviewed
  -- like everything else rather than inheriting an exemption written for cards that shipped
  -- before this table existed.
  if new.tier = 'printed'
     and new.collection_id is null
     and new.eligibility_review_gap is not null then
    return new;
  end if;

  raise exception
    'species % is % for medicinal eligibility; a % card may not be published (%)',
    new.species_key,
    coalesce(v_eligibility, 'absent from the catalog'),
    new.tier,
    case
      when new.tier = 'printed'
        then 'printed cards predating review must record an eligibility_review_gap'
      else 'only documented medicinal species are collectible'
    end
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists collectible_cards_require_eligibility on public.collectible_cards;
create trigger collectible_cards_require_eligibility
  before insert or update on public.collectible_cards
  for each row execute function public.enforce_collectible_eligibility();

-- The other direction: eligibility may not be withdrawn out from under a published card.
create or replace function public.protect_published_collectibles()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.medicinal_eligibility = 'eligible' or old.medicinal_eligibility <> 'eligible' then
    return new;
  end if;
  if exists (
    select 1 from public.collectible_cards c
    where c.species_key = new.species_key
      and c.published
      and c.eligibility_review_gap is null
  ) then
    raise exception
      'species % has a published card; unpublish it before withdrawing eligibility',
      new.species_key
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists catalog_species_protect_published on public.catalog_species;
create trigger catalog_species_protect_published
  before update on public.catalog_species
  for each row execute function public.protect_published_collectibles();

-- ── Withdrawing eligibility, atomically ───────────────────────────────────────
--
-- THE GATE MAKES A TWO-STEP OPERATION OUT OF ONE DECISION, AND THAT IS WHERE MISTAKES LIVE.
--
-- An administrator who concludes a species should not be collectible has to unpublish its
-- cards and then withdraw eligibility, in that order, because the reverse is refused. Two
-- statements over PostgREST are two requests: the first can succeed and the second fail,
-- leaving a species that is still `eligible` with its cards unpublished. That state is
-- harmless — it fails SAFE, nothing medicinal is exposed — but it is silent, and the
-- operator believes the withdrawal happened.
--
-- So the decision is one call. A function body is a single transaction: either both writes
-- land or neither does, and no intermediate state is ever visible to another session.
--
-- NOT `security definer`, DELIBERATELY. A definer function would run as its owner and
-- become a privilege surface that has to be reasoned about every time the policies change —
-- the thing to avoid when the operation it performs is "make this plant not a medicine
-- any more". It is `security invoker`, so it can only do what its caller could already do,
-- and EXECUTE is revoked from the client roles below. The caller is therefore the service
-- role, which bypasses RLS anyway. The function buys atomicity and ordering, not privilege.
create or replace function public.withdraw_medicinal_eligibility(
  p_species_key text,
  p_reviewer    text,
  p_reason      text
)
returns table (unpublished_cards integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_reviewer is null or length(trim(p_reviewer)) = 0 then
    raise exception 'a withdrawal names the person making it'
      using errcode = 'check_violation';
  end if;
  if p_reason is null or length(trim(p_reason)) < 20 then
    raise exception 'a withdrawal states why, in at least 20 characters'
      using errcode = 'check_violation';
  end if;

  -- Cards first. The gate refuses the other order, which is the whole reason this exists.
  update public.collectible_cards
     set published = false
   where species_key = p_species_key and published;
  get diagnostics v_count = row_count;

  update public.catalog_species
     set medicinal_eligibility   = 'ineligible',
         eligibility_basis       = p_reason,
         eligibility_reviewed_by = p_reviewer,
         eligibility_reviewed_on = current_date
   where species_key = p_species_key;

  if not found then
    raise exception 'species % is not in the catalog', p_species_key
      using errcode = 'no_data_found';
  end if;

  return query select v_count;
end;
$$;

-- The client roles may not call it. They could not perform either write anyway — no table
-- in this migration has a write policy — but an executable admin function is a thing people
-- find, and the revoke says in the schema that it is not for them.
revoke all on function public.withdraw_medicinal_eligibility(text, text, text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.withdraw_medicinal_eligibility(text, text, text) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.withdraw_medicinal_eligibility(text, text, text) from authenticated';
  end if;
  -- service_role exists on Supabase and not in the local test harness, so the grant is
  -- conditional rather than assumed. A migration that fails on a missing role cannot be
  -- tested anywhere but production, which is the one place it must not be tested.
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.withdraw_medicinal_eligibility(text, text, text) to service_role';
  end if;
end $$;

-- ── Eligibility sources must be real, and verified ────────────────────────────
--
-- WITHOUT THIS, `eligible` IS A VALUE SOMEBODY TYPES.
--
-- The constraints above require a relevance kind, a basis, a reviewer and a non-empty
-- `eligibility_sources`. None of that makes the sources REAL: `array['looks-medicinal']`
-- satisfies every one of them. An array cannot carry a foreign key, so the reference has to
-- be checked by a trigger or not at all — and "not at all" means the citation requirement is
-- decorative, which is worse than absent because it reads as rigour.
--
-- VERIFIED, not merely present. `catalog_sources.verified` means a human opened the thing
-- and confirmed it supports the claim; an unverified row is a candidate, and a candidate
-- backing an eligibility decision is the AI-suggested-citation failure arriving one table
-- to the left.
--
-- WHAT THIS CANNOT CHECK, AND MUST NOT BE READ AS CHECKING: RELEVANCE.
-- A verified source about a different plant entirely satisfies this trigger. "Exists and
-- somebody has verified it" is a property of the source row; "supports THIS species'
-- medicinal relevance" is a judgement about a pairing, and no constraint can make it. The
-- database can only ensure a named human signed the determination — which is what
-- `eligibility_reviewed_by` and the 20-character `eligibility_basis` are for: the basis is
-- where the reviewer says what each source actually says about this species. Treating a
-- green trigger as evidence of relevance is precisely the false confidence this whole
-- layer exists to avoid. See docs/botanical-catalog.md, "What review means".
--
-- Applied to approved medicinal claims for the same reason and with the same words.
create or replace function public.require_verified_sources()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ids    text[];
  v_label  text;
  v_missing text[];
begin
  if tg_table_name = 'catalog_species' then
    if new.medicinal_eligibility = 'pending' then
      return new;
    end if;
    v_ids := new.eligibility_sources;
    v_label := 'eligibility';
  else
    if new.review_status <> 'approved' then
      return new;
    end if;
    v_ids := new.source_ids;
    v_label := 'approved claim';
  end if;

  if v_ids is null or cardinality(v_ids) = 0 then
    return new;   -- The CHECK constraints already decide whether empty is allowed.
  end if;

  select array_agg(wanted) into v_missing
  from unnest(v_ids) as wanted
  where not exists (
    select 1 from public.catalog_sources s where s.id = wanted and s.verified
  );

  if v_missing is not null then
    raise exception
      '% cites source(s) % that are absent from catalog_sources or not verified',
      v_label, v_missing
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists catalog_species_verified_sources on public.catalog_species;
create trigger catalog_species_verified_sources
  before insert or update on public.catalog_species
  for each row execute function public.require_verified_sources();

-- ── Layer C: medicinal evidence ────────────────────────────────────────────────
--
-- ONE CLAIM PER ROW, EACH WITH ITS OWN EVIDENCE AND ITS OWN REVIEW STATE.
--
-- A per-species medicinal BLOB would mean one review decision covering a dozen claims of
-- wildly different quality — a well-sourced traditional use and an unsourced contraindication
-- approved by the same click. Rows make the unit of review the unit of evidence.
create table if not exists public.medicinal_claims (
  id            bigint generated always as identity primary key,
  species_key   text not null references public.catalog_species(species_key) on delete cascade,

  kind          text not null check (kind in (
                  'traditional-use', 'studied-property', 'compound', 'plant-part',
                  'preparation', 'toxicity', 'contraindication', 'lookalike-hazard'
                )),
  body          text not null check (length(body) between 10 and 4000),

  -- The same three-way standing `src/lib/trait-evidence.ts` already uses. "Traditional" is
  -- a statement about people, not about pharmacology, and it may never be rendered as one.
  standing      text not null check (standing in ('traditional', 'laboratory', 'clinical')),

  -- HIGH RISK IS DERIVED FROM KIND BY A TRIGGER, NOT TYPED BY A CALLER.
  -- Left to an author, the one row that most needs the flag is the one most likely to be
  -- missing it.
  high_risk     boolean not null default false,

  source_ids    text[] not null default '{}',
  review_status text not null default 'draft' check (review_status in (
                  'draft', 'in_review', 'approved', 'rejected'
                )),
  reviewed_by   text,
  reviewed_on   date,

  -- Where the draft came from, so an AI-drafted row is identifiable forever rather than
  -- becoming indistinguishable from a curated one after it is edited once.
  drafted_by    text not null default 'human' check (drafted_by in ('human', 'ai-assisted', 'import')),

  created_at    timestamptz not null default now(),

  -- THE THREE CONSTRAINTS THAT CARRY THE WHOLE SAFETY POSITION:
  --
  -- 1. Nothing is approved without a named human and a date.
  constraint approved_claims_name_their_reviewer
    check (review_status <> 'approved' or (reviewed_by is not null and reviewed_on is not null)),
  -- 2. Nothing is approved without a citation.
  constraint approved_claims_cite_something
    check (review_status <> 'approved' or cardinality(source_ids) > 0),
  -- 3. An AI-drafted row may never BE the approved state. A human must re-author it, which
  --    is what makes "AI assists, humans decide" a property of the database rather than a
  --    promise in a comment. Agreement between models cannot reach this row.
  constraint ai_drafts_are_never_self_approving
    check (not (drafted_by = 'ai-assisted' and review_status = 'approved'))
);

drop trigger if exists medicinal_claims_verified_sources on public.medicinal_claims;
create trigger medicinal_claims_verified_sources
  before insert or update on public.medicinal_claims
  for each row execute function public.require_verified_sources();

-- `high_risk` follows from `kind`, always, on insert and on update.
create or replace function public.set_medicinal_claim_risk()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.high_risk := new.kind in ('toxicity', 'contraindication', 'lookalike-hazard');
  return new;
end;
$$;

drop trigger if exists medicinal_claims_set_risk on public.medicinal_claims;
create trigger medicinal_claims_set_risk
  before insert or update on public.medicinal_claims
  for each row execute function public.set_medicinal_claim_risk();

-- ── Row level security ─────────────────────────────────────────────────────────
--
-- Enabled everywhere, with SELECT policies only. No insert, update or delete policy exists
-- for any client role on any table in this migration, which is what makes the whole catalog
-- read-only from the browser — the `species_packets` posture, applied to nine tables.
--
-- RLS ENABLED WITH ZERO POLICIES IS CLOSED; RLS DISABLED WITH ZERO POLICIES IS WIDE OPEN,
-- because Supabase grants the client roles table privileges by default. Every table below
-- therefore gets its `enable row level security` whether or not it gets a policy.
alter table public.catalog_sources          enable row level security;
alter table public.catalog_species          enable row level security;
alter table public.catalog_synonyms         enable row level security;
alter table public.catalog_regions          enable row level security;
alter table public.catalog_species_regions  enable row level security;
alter table public.collectible_cards        enable row level security;
alter table public.card_renders             enable row level security;
alter table public.medicinal_claims         enable row level security;

do $$
begin
  -- Verified sources only. An unverified source is a candidate, and a candidate rendered
  -- beside a claim looks exactly like a citation.
  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'catalog_sources' and policyname = 'verified sources are public') then
    create policy "verified sources are public" on public.catalog_sources
      for select using (verified);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'catalog_species' and policyname = 'approved species are public') then
    create policy "approved species are public" on public.catalog_species
      for select using (review_status = 'approved');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'catalog_synonyms' and policyname = 'synonyms follow their species') then
    create policy "synonyms follow their species" on public.catalog_synonyms
      for select using (exists (
        select 1 from public.catalog_species s
        where s.species_key = catalog_synonyms.species_key and s.review_status = 'approved'
      ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'catalog_regions' and policyname = 'regions are public') then
    create policy "regions are public" on public.catalog_regions
      for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'catalog_species_regions' and policyname = 'occurrence follows its species') then
    create policy "occurrence follows its species" on public.catalog_species_regions
      for select using (exists (
        select 1 from public.catalog_species s
        where s.species_key = catalog_species_regions.species_key and s.review_status = 'approved'
      ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'collectible_cards' and policyname = 'published cards are public') then
    create policy "published cards are public" on public.collectible_cards
      for select using (published);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'card_renders' and policyname = 'renders follow their card') then
    create policy "renders follow their card" on public.card_renders
      for select using (exists (
        select 1 from public.collectible_cards c
        where c.species_key = card_renders.species_key and c.published
      ));
  end if;

  -- THE ONE THAT MATTERS. An unapproved medicinal claim is not merely unrendered by the UI;
  -- it is unreadable by the client roles. A UI bug cannot leak it, and neither can a
  -- hand-written PostgREST query.
  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'medicinal_claims' and policyname = 'approved claims are public') then
    create policy "approved claims are public" on public.medicinal_claims
      for select using (review_status = 'approved');
  end if;
end $$;

-- AT MOST ONE PRINTED CARD PER NUMBER IN THE PRE-CATALOG DECK. With the 1..47 range check
-- above, this is what makes the publication exemption finite: 47 numbers, one row each, and
-- no 48th. `collection_id is null` is Collection 01 — `Herb.collectionId` is absent on the
-- original deck by design (see src/lib/types.ts), so a future printed Collection 02 declares
-- an id, falls outside this index, and gets no exemption at all.
create unique index if not exists collectible_cards_printed_number_idx
  on public.collectible_cards (card_number)
  where tier = 'printed' and collection_id is null;

-- ── Indexes ────────────────────────────────────────────────────────────────────
-- The regional board is the hot query: "approved, collectible, in this region, this season".
create index if not exists catalog_species_regions_region_idx
  on public.catalog_species_regions (region_id, occurrence);
create index if not exists catalog_species_review_idx
  on public.catalog_species (review_status) where review_status <> 'approved';
create index if not exists medicinal_claims_species_idx
  on public.medicinal_claims (species_key, review_status);
create index if not exists collectible_cards_published_idx
  on public.collectible_cards (published, tier);
