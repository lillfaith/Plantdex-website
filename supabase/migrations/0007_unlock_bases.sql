-- Admit `curatedEquivalent` and `synonym` as unlock bases.
--
-- WHY THIS MIGRATION EXISTS AT ALL, AND WHY IT SHIPS FIRST.
--
-- `sightings.eligibility` repeats the app's `Eligibility` union as a CHECK constraint. A
-- constraint NARROWER than the type does not degrade gracefully: the app emits the new value,
-- Postgres refuses the insert, and the sighting is LOST. So this must be applied before any
-- deployment that can issue the value — the edge function and the frontend both.
--
-- `identification-schema.test.ts` holds the CHECK equal to `ELIGIBILITIES`, which is what
-- turned this from something to remember into something that fails in `npm test`. That pin was
-- added deliberately ahead of this change, and this is the first migration it governs.
--
-- WIDENING ONLY. No row is read, written or rewritten. Every existing value stays valid,
-- including `legacyGenus`: stored sightings carry it, so it remains readable forever even
-- though nothing issues it any more. Removing a value would make real history unreadable, and
-- the only way to "fix" those rows would be to rewrite why a past observation reached a card.
--
-- BOTH VALUES SHIP IN ONE MIGRATION ON PURPOSE. They were found a few hours apart and this
-- file has never been applied to any project, so folding the second in costs nothing and
-- keeps the deployment to the two identification migrations the runbook names. Once 0007 is
-- live anywhere, the next vocabulary change is 0008 — amending an applied migration would
-- leave two databases claiming the same number with different contents.
--
-- `scans.confirmed_eligibility` deliberately carries no CHECK (see 0006) and needs no change.

-- `synonym` is a checked nomenclatural synonym of a card anchor, split out of `exact`, which
-- carried both and could not tell them apart once a row was written. `legacyGenus` stays
-- readable and is never newly issued. (Both noted HERE rather than inline below: an
-- apostrophe inside the value list is read as a quote by the test that parses this file, so
-- the list stays values-only.)

alter table public.sightings drop constraint if exists sightings_eligibility_check;

alter table public.sightings add constraint sightings_eligibility_check check (
  eligibility is null
  or eligibility in (
    'exact',
    'synonym',
    'acceptedGroup',
    'curatedEquivalent',
    'genusCard',
    'legacyGenus',
    'ambiguous',
    'related',
    'none'
  )
);
