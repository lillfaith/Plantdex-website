# CLAUDE.md

**Read [`AGENTS.md`](./AGENTS.md) first.** It is the authoritative product spec — goals,
roadmap, safety rules and hard prohibitions — and it governs every change to this repo.
This file only adds the mechanics of working in this codebase.

## Current stage

**V0.2 complete**, plus three-stage card mastery, Field Research, the sources/safety
presentation work, contrast/polish, and **V0.3 accounts** (Supabase auth + server-persisted
collections). The Herbdex works fully signed-out against local storage, or signed in with
progress synced to Supabase — see "V0.3 accounts" below. Not yet built: commerce (V0.4), QR
(V0.5).

## Commands

```bash
npm run dev        # dev server
npm run verify     # lint + typecheck + test + build — run before pushing
npm test           # vitest
npm run build:deck -- --source /path/to/card-pdfs   # regenerate deck data + art
```

## Architecture rules

These exist because AGENTS.md requires them. Breaking one is a bug, not a style choice.

- **XP and level thresholds live only in `src/lib/progression.ts`.** Components must read
  `progressFromState()` / `progressFromXp()` and never contain a threshold literal.
- **XP is derived, never stored.** Persisted state is only
  `{discoveries, learned, mastered, research, achievements}`; XP is summed from those
  records. This is what makes repeat-XP structurally impossible rather than merely guarded
  — do not add an XP counter to stored state, client-side or server-side.
- **Every stage transition is idempotent.** `applyDiscovery()`, `applyLearned()` and
  `reconcileMastery()` each return the *same object* when there is nothing new to record.
  Covered by `src/lib/herbdex-reducer.test.ts` and `src/lib/mastery.test.ts`; keep those
  tests green.
- **A card has three stages, and they only ever go forwards** (`src/lib/mastery.ts`):
  discovered → learned → mastered. Discovery is never gated behind the other two —
  AGENTS.md requires finding a plant to unlock its card immediately. Mastery is *recorded*
  rather than recomputed, so deleting the sighting that earned it can never take it back.
- **The knowledge check may only ask what a card prints.** `src/lib/knowledge-check.ts`
  draws the answer from the card in hand and every distractor from other real cards. It
  must never ask about identification, edibility or safety, where a wrong answer could
  matter outdoors. `src/lib/knowledge-check.test.ts` enforces both rules across all 45
  cards.
- **Field Research derives progress and records completion** (`src/lib/research.ts`). A
  step measures itself from the current world; no task stores a counter. Completion is
  written down once and never revoked, so a challenge finished in spring does not un-finish
  in summer and a task completed by logging a sighting survives that sighting's deletion.
- **A research task may only group cards by something printed on them** — season, encounter
  rate, card number. This is why there is no Pollinator Challenge despite AGENTS.md
  suggesting one: the cards carry no pollinator data, so choosing the species would be
  inventing botany. Pinned by `src/lib/research.test.ts`.
- **No research task may be impossible.** The deck holds exactly one winter card, so every
  target is sized against real deck supply. `research.test.ts` masters the whole deck and
  asserts every standing task then reports itself complete.
- **A daily only pays once it has been offered.** `reconcileResearch` takes the *active*
  tasks, not the registry — otherwise every eligible daily would silently complete the
  moment its condition happened to be true.
- **The garden mirrors mastery; it is not a second progression system.** `src/lib/garden.ts`
  maps each mastery stage to exactly one growth stage and reads no clock at all, which is
  what structurally rules out the watering meters, timers and idle growth AGENTS.md forbids.
- **Extend the level ladder upwards; never re-tune existing thresholds.** Raising one
  demotes players whose XP has not changed. Pinned by `src/lib/progression.test.ts`.
- **Bump `STORAGE_VERSION` only together with adding it to `MIGRATABLE_VERSIONS` in
  `parseState()`.** An unrecognised version degrades to an empty collection, so a bare bump
  silently wipes real save data. The single-pass migration there is only valid while schema
  changes stay purely additive; the first rename or reshape needs a real per-version branch.
- **`HerbdexState` holds only what XP is derived from, plus achievements.** Reveals, field
  sightings and the daily research board award nothing, so they live in their own stores
  with their own keys — which is also what keeps the V0.3 server's surface small.
- **Herb ids come from the scientific name, never the common name.**
- **Achievements are keyed by stable `id`**, and predicates are pure functions of state so
  they can be re-evaluated from scratch (this is what makes retroactive unlocks work).
- **Deck data is generated.** Edit the `DECK` table in `scripts/build_deck.py` and re-run;
  never hand-edit `src/data/herbs.json`.
- **No invented botany.** Every herb field must come from the physical card — fronts and
  backs are both transcribed in `scripts/build_deck.py`. Where a card contains an error,
  transcribe it faithfully and record it in `KNOWN_CARD_ISSUES`; never silently correct it.
- **Icon labels and disclaimer text are the deck's own**, taken from the Icon Cheat Sheet
  (card 46) and Disclaimer (card 47). Change them in the build script, not in components.
- **"Healing Traits" must always render with its non-claim framing.** It is the deck's
  heading for traditional use, not a statement that a plant treats anything.
- **A warning printed on a card (`herb.warning`) must render above the discovery CTA**,
  never collapsed behind an interaction.
- **Reveal is not discovery.** `src/lib/reveals.ts` is a *separate* store with its own
  storage key and never touches `HerbdexState`. Revealing shows a plant's entry for
  reading; it awards no XP, does not count toward the collection, and leaves the card a
  silhouette in the grid. Keep them separate — the V0.3 server owns discoveries and must
  never learn about reveals.
- **A `<dialog>` that reports the result of an action must outlive the state change that
  action causes.** This has bitten twice. The discovery celebration lives in `HerbDetail`,
  not `DiscoverPanel`, because discovering swaps the locked view for the full one.
  `KnowledgeCheck` is rendered unconditionally by `MasteryTrack` and hides only its trigger
  button, because passing the check advances the stage and re-renders the branch it would
  otherwise have been mounted inside. Both must also keep a *stable position* in the tree,
  or React recreates the `<dialog>` underneath itself.
- **Contrast is a property of the token, not a per-component decision.** Every shade used
  as text clears WCAG AA against the *composited* background it actually sits on, and the
  browser suite measures that from the rendered page rather than from the stylesheet —
  static maths under-reports, because a chip inside a `.panel` sits on panel-plus-tint. If
  a shade is too dim for the text you are placing, move up the ramp; do not add a colour.
  `violet-500` is the placeholder shade and is not for content.
- **Every text colour must resolve to a deck token.** `text-violet-100` was undefined for
  32 usages and silently fell through to Tailwind's stock violet; the suite now fails on
  any text colour that is not in the palette.
- **`SafetyNotice` appears on the Herbdex and every herb page.** Do not remove it, and do
  not soften traditional-use wording into medical claims. It has two weights: `brief` for
  pages that only list or track plants, `standard` for any page where ingestion,
  preparation, identification or medicinal traditions are discussed. Choosing `brief` on
  such a page is a safety regression, not a design tweak.
- **The full disclaimer lives in exactly one place — `/safety`.** It was previously repeated
  in full on three pages, which is how a warning stops being read: by the third identical
  block people scroll past it. `standard` now takes a `context` naming the risk *that page*
  raises, which is shorter and far likelier to be read than a general disclaimer someone has
  already skipped twice. Every notice links to the full text. A warning may only be
  shortened by making it **more** specific, never less.
- **Say each safety point once, where its content is.** "Traditional use is not evidence"
  was appearing four times on a single herb page. It now sits under the Healing Traits
  heading it qualifies, and nowhere else.
- **The sources section states what is NOT sourced**, not just what is. Listing only
  existing citations lets a reader assume the rest are cited too — worse than looking thin
  for a product about plants people take outdoors. `sectionCitations()` returns both halves
  for exactly this reason.
- **The deck is Collection 01, and nothing may claim a second collection exists.**
  `src/lib/collection.ts` resolves membership rather than stamping it on generated data,
  and `COLLECTIONS` holds exactly one entry until a second deck is really printed — pinned
  by `collection.test.ts`. Foreshadowing copy may say more are *planned*; it may never
  invent a date, name, size, price, preorder, waitlist or scarcity claim, and must never
  imply the current 45 cards are incomplete.

## V0.3 accounts

Backend is Supabase (Postgres + Auth + Storage, all behind Row Level Security), reached
directly from the client SDK. The frontend is still a fully static export on GitHub Pages —
no server we operate ourselves. See `supabase/README.md` for one-time project setup.

- **The reducer is the server too.** `src/lib/herbdex-reducer.ts`'s pure functions
  (`applyDiscovery`, `applyLearned`, `reconcileMastery`, `reconcileResearch`,
  `reconcileAchievements`) are imported unmodified by `supabase/functions/herbdex-action`,
  copied there by `npm run sync:edge-shared` (see `scripts/sync-edge-shared.mjs`). Never
  hand-edit anything under `supabase/functions/_shared/herbdex/` — it is generated, and a
  hand-edit is silently overwritten and drifts from what it's supposed to mirror the next
  time the script runs. Changing any pure module those files depend on
  (`types.ts`, `herbdex-state.ts`, `deck.ts`, `achievements.ts`, `progression.ts`,
  `mastery.ts`, `rng.ts`, `research.ts`, `herbdex-reducer.ts`) means re-running the sync
  script and redeploying the function, or the two silently diverge —
  `src/lib/edge-shared.test.ts` fails the moment a generated file drifts from its source,
  so a forgotten sync surfaces in `npm test` instead of in a rejected deploy.
- **The sync script rewrites relative imports to carry an explicit `.ts`, and must keep
  doing so.** `src/lib` compiles under `moduleResolution: bundler`, which permits
  `from './deck'`; Deno has no extension guessing and rejects the whole bundle with
  `Module not found ".../deck"`. A byte-for-byte copy therefore cannot deploy — this broke
  `supabase functions deploy` once, with 20 bad specifiers across 8 modules and only the
  first one reported. The rewrite belongs in `scripts/sync-edge-shared.mjs`, never in
  `src/lib` (tsconfig does not set `allowImportingTsExtensions`) and never as a hand-edit
  inside `_shared/`, which is regenerated. `edge-shared.test.ts` walks the whole graph from
  the entrypoint and fails on any specifier that would not resolve under Deno.
- **Only mastery and research completion are server-recomputed.** They're the one place a
  client claim can't be taken on faith, because they depend on sighting counts a client
  could otherwise just assert. Discoveries, learned and achievements-from-a-discovery are
  plain RLS-scoped upserts straight from the client (`src/lib/remote-herbdex-storage.ts`) —
  there's nothing to recompute there: the client already derived the transition with the
  same pure reducer, and RLS plus each table's (user_id, entity_id) primary key are the
  actual boundary either way, not which code path performed the write.
- **Sightings are synced too, including photos**, because CLAUDE.md already required
  mastery to be "re-derived by the server from its own sighting records" — that's only true
  if the server can see them. `src/lib/remote-sightings.ts` is the Supabase-backed
  counterpart to `src/lib/sightings.ts`; `src/lib/sightings-store.ts` is the facade that
  picks one or the other based on auth state so call sites (`MySightings.tsx`,
  `HerbdexProvider.tsx`) don't need to know which backend they're bound to. Photos go to
  the private `sighting-photos` Storage bucket, path-scoped to `{user_id}/...` by RLS the
  same way every table is.
- **Every RLS policy is split into `select`/`insert`/`delete`, and there is no `update`
  policy anywhere.** This is not a style choice: `for all` silently *includes* update, so
  the original single-policy-per-table version let a signed-in player rewrite their own
  `mastered_at`/`discovered_at`, or rewrite a sighting's `herb_id` after the fact — which
  is exactly the data `herbdex-action` re-derives mastery and research from. Splitting the
  policies is what makes the "write-once, recorded never revoked" contract real rather than
  merely stated in a comment. Every upsert in the app passes `ignoreDuplicates: true`
  (`insert ... on conflict do nothing`), which needs only the insert policy — so adding an
  `update` policy would reopen the hole and buy nothing. Verified by
  `e2e/supabase.e2e.test.ts`.
- **Live verification is `npm run verify:supabase`** (`e2e/supabase.e2e.test.ts`, run
  against a real project via `.env.local`). It is deliberately *not* part of `npm test` —
  it needs credentials and writes real rows. It drives the real adapters
  (`createRemoteHerbdexStorage`, `addRemoteSighting`) rather than reimplementing their
  queries, and its cross-user half actively attacks the database as a second signed-in
  user; those tests pass only when Postgres refuses.
- **Sighting ids are `text`, not `uuid`.** The client always generates its own id
  (`sighting_<timestamp>_<random>`, matching the local-storage format) so a sighting keeps
  the same id when later imported into an account. A `uuid` column would reject every one
  of those ids — this bit once already; don't reintroduce it.
- **`HerbdexStorage.load()` is async** (`src/lib/storage.ts`) so one interface covers both
  the local adapter (resolves immediately) and the remote one (a real network round trip).
  Every mutating method on the store still requires `ready` first — before hydration
  resolves there is nothing real to mutate, and acting on the placeholder empty state would
  be silently discarded the instant hydration's own load resolves and replaces it wholesale.
- **`HerbdexStore.reconcile()` replaces the old separate `syncMastery`/`syncResearch`.** One
  call, because the edge function does both together in one round trip. When
  `adapter.reconcile` exists (signed in) its answer is authoritative and the store reloads
  from it rather than trusting a locally computed guess; otherwise (signed out) it runs the
  same reducer locally, exactly as before accounts existed.
- **Local-progress import is a one-time, explicit, additive merge**
  (`src/lib/import-local-progress.ts`), offered once per account via
  `ImportLocalProgressDialog` and never again after that (accepted or skipped) — the
  "offered" flag is keyed by user id, because one global key meant importing into the first
  account on a shared device silently denied the offer to every account after it. A *failed*
  import is the one case that does not spend the offer: `importLocalProgress` reports which
  parts failed and the dialog stays open to retry, since marking it done after a failed
  write would strand that device's progress — never deleted, but no longer reachable from
  the account. It imports
  `mastered`/`research` timestamps directly rather than only re-deriving them from imported
  sightings — deleting a sighting must not retroactively erase mastery earned locally before
  an account existed, same as it never has for ordinary play.
- **`supabase/functions/**` is excluded from this project's `tsconfig.json`/ESLint** — it's
  Deno, a different runtime with different globals (`Deno.serve`, `npm:`/`https:` module
  specifiers). Validate it with `deno check` (or by deploying it) instead.
