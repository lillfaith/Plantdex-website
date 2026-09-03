-- THE CANONICAL SEED PACKET REGISTRY — one row per species, shared by everybody.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS TABLE EXISTS, given that the generator is deterministic.
--
-- `seed-packet.ts` computes a packet from the species name alone, so two players who have
-- never met produce the same artwork for the same plant — for as long as the generator does
-- not change. The moment it does, they diverge: whoever saved the species first keeps the
-- version 1 packet stored with their find, and everybody after them is handed a freshly
-- generated version 2 for the very same plant.
--
-- So the packet is written down ONCE, the first time Plantdex ever sees the species, and
-- every later save references this row instead of regenerating. Determinism is still how a
-- packet is CREATED; it is no longer what holds the world together afterwards. A future
-- generator version therefore only affects species nobody has ever saved.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHAT IT MUST NEVER HOLD. This row is global — readable by everyone, signed in or not — so
-- it carries nothing about a person: no user id, no scan id, no photograph, no location, no
-- confidence, no discovery date. It describes a SPECIES and its artwork, full stop. Which
-- player first found it, when they found it, and what they photographed all stay in
-- `public.seed_shelf`, private to them under RLS (0004). `species-registry.test.ts` reads
-- this file and fails if a column that could identify a person ever appears here.
--
-- `first_seen_at` is the one timestamp, and it is deliberately about PLANTDEX rather than
-- about anybody: "this species entered the world on this date". It names no user, and the
-- private shelf row keeps its owner's own first-found date separately.

create table if not exists public.species_packets (
  -- The normalised binomial ("bellis perennis") that `plant-match.ts` produces. PRIMARY KEY,
  -- which is what makes two simultaneous first sightings safe: both callers insert, one wins
  -- the conflict, and both then read the same winning row. There is no path that creates two
  -- competing packets for one species.
  species_key text primary key check (species_key <> '' and species_key like '% %'),

  -- As the identification provider spelt it the first time, for display. Never used for
  -- matching — the key above is the identity.
  scientific_name text not null,
  common_name text,

  -- Taxonomy backbone identifiers, when the provider supplied them. Useful for recognising
  -- this species later against a source of truth rather than by string comparison.
  gbif_id text,
  powo_id text,

  -- The artwork itself, and the generator version that produced it. Written once and never
  -- updated: there is no update policy here, and nothing in the app issues one.
  packet jsonb not null,
  packet_version integer not null,

  first_seen_at timestamptz not null default now()
);

alter table public.species_packets enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- READABLE BY ANYONE, WRITABLE BY NOBODY.
--
-- A shelf has to render packets for species other people first discovered, so the read is
-- open — and it costs nothing, because there is nothing personal in the row.
--
-- There is deliberately NO insert, update or delete policy, for anybody. That is the whole
-- security posture: a client cannot create, redraw or remove a canonical packet, so no
-- player can reach another player's shelf art, and nobody gains a cross-user write surface.
-- The one writer is `supabase/functions/seed-packet`, which uses the service role and so
-- bypasses RLS entirely — the same shape `delete-account` already uses for the operations a
-- client must not be trusted with.
-- ─────────────────────────────────────────────────────────────────────────────
create policy "canonical packets are public to read" on public.species_packets
  for select using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- ACCOUNT DELETION DOES NOT TOUCH THIS TABLE, and must not.
--
-- There is no `user_id` here to delete by, which is the structural half of that. The other
-- half is a rule: this row is not the property of whoever happened to save the species
-- first. Deleting it when they close their account would delete the packet from every other
-- shelf that holds the same plant. `account-security.test.ts` fails if `species_packets`
-- ever appears in the delete function's USER_TABLES.
-- ─────────────────────────────────────────────────────────────────────────────
