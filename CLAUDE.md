# CLAUDE.md

**Read [`AGENTS.md`](./AGENTS.md) first.** It is the authoritative product spec — goals,
roadmap, safety rules and hard prohibitions — and it governs every change to this repo.
This file only adds the mechanics of working in this codebase.

## Current stage

**V0.2 complete**, plus three-stage card mastery, Field Research, the sources/safety
presentation work, contrast/polish, the **Seed Shelf** (see below), and **V0.3 accounts** (Supabase auth + server-persisted
collections). The Herbdex works fully signed-out against local storage, or signed in with
progress synced to Supabase — see "V0.3 accounts" below, **V0.4 commerce** (a Stripe
Payment Link behind `/shop`, see "V0.4 commerce" below), and the **player profile** at
`/profile` (see "Player profile"). Not yet built: QR (V0.5).

## Commands

```bash
npm run dev        # dev server
npm run verify     # lint + typecheck + test + build — run before pushing
npm test           # vitest
npm run build:deck -- --source /path/to/card-pdfs   # regenerate deck data + art
npm run build:structures                           # regenerate the skeletal formulas
python3 scripts/build_sprites.py                   # regenerate the animated portraits
python3 scripts/build_sprites.py --preview <herb-id> [--frame N]   # print a frame as text
python3 scripts/audit_sprites.py                   # face placement, connectivity, stale builds
python3 scripts/audit_sprites.py <herb-id> [...]   # just those sprites (skips the stale-build check)
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
  sightings, the daily research board and the player profile award nothing, so they live in
  their own stores with their own keys — which is also what keeps the V0.3 server's surface
  small.
- **Herb ids come from the scientific name, never the common name.**
- **Achievements are keyed by stable `id`**, and predicates are pure functions of state so
  they can be re-evaluated from scratch (this is what makes retroactive unlocks work).
- **Skeletal formulas are generated too.** `src/components/chemistry/structures.tsx` comes
  from `scripts/chemistry/build_structures.py`; edit that and re-run `npm run build:structures`,
  never the `.tsx`. Geometry is COMPUTED from a bond-length lattice and never hand-placed, for
  the same reason sprite parts are measured rather than inferred: a ring that is nearly regular
  reads as decoration, and a substituent whose position was assumed rather than measured lands
  on top of something. Two bugs here were exactly that — a hydroxyl placed 0.09 units from a
  ring carbon, and a "core" whose four free vertices were ordered by SORTING THEM ON POSITION,
  which put a double bond straight across the middle of a pyran ring on roughly twenty cards.
  Ring atoms are walked, never sorted. Every new structure must be rendered and read back
  before it ships; anything not both accurate and legible at plate size is dropped rather than
  shipped, which is why rutin, taraxasterol and ellagic acid are deliberately absent.
- **A `chemical-class` may carry a `scaffold`, never a `structure`**, and only when one
  genuine skeleton defines the whole class (a catechin *is* a flavan-3-ol). Tannins, saponins,
  alkaloids, glycosides, lignans and sesquiterpene lactones have no single skeleton and must
  never get one — `compounds.test.ts` lists them explicitly. The scaffold renders ghosted and
  captioned "Shared core", and its note must say in words that members differ; that caption is
  what stops the drawing being read as "this is the compound".
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

## Animated plant portraits

Every one of the 45 cards has a creature portrait: a pixel-art sprite sheet built by
`scripts/build_sprites.py` from an authored module per species in
`scripts/sprite_sources/`. `public/cards/animated/*.png` and `src/data/sprites.json` are
both generated — never hand-edit either, for the same reason `herbs.json` is off limits.

- **A sprite is a creature, not an icon, and every species moves differently.** Each one
  has a named trademark gesture that comes out of that plant's own botany — plantain gets
  trodden on and springs back, wood sorrel folds its leaflets over its own face, mint
  re-renders itself in ice, ragweed sneezes and then checks whether anybody saw. Two
  sprites sharing a gesture is the failure this whole set was rebuilt once to avoid;
  `plant-sprites.test.ts` guards the weakest available proxy for it, that no more than a
  few species share a `personality` label.
- **Part placement is MEASURED from the assembled art, never inferred from the parameters
  that produced it.** This is the bug the set produced over and over: `flower_head` trims
  empty rows, shading moves the face patch, and a squashed body does not move its face
  the way its radii suggest. `_face.py` reads the finished rows (`face_box`, `on_face`,
  `face_shift`) and every feature origin comes from it. `scripts/audit_sprites.py`
  renders every frame of every sprite and fails on any feature pixel that landed on
  something that is not its face — run it after touching any sprite.
- **`_flowerhead.py` is for round organs only.** Pine and horsetail are hand-drawn
  because a conifer and a jointed stem have no curve in them, and forcing either through
  the shared generator produced a lumpy circle pretending to be a tree.
- **Frame 0 is the resting pose**, because that is what `prefers-reduced-motion` freezes
  on. It must read as a complete, dignified sprite on its own: an oak with its acorn
  still on the twig, a mulberry with nothing yet spilled, a clover with three leaflets —
  never a mid-gesture stub and never a state that would claim something untrue.
- **Frame 0 must be ONE CONNECTED PIECE.** Twenty-five sprites once had parts that
  touched nothing — a berry in mid-air beside a leaf, a trunk standing apart from its own
  canopy — and it is invisible while authoring, because parts are a list and the gaps only
  exist in the render. Every fruit, flower and runner needs a stalk that reaches the
  plant. Detached elements *during* a gesture are fine and often the point (flung seeds, a
  falling samara, shed snow), which is why the rule is frame 0 only: at rest a plant is
  one plant. `audit_sprites.py` flood-fills it.
- **`--preview` renders without writing, so always run the plain build before committing.**
  It is entirely possible to tweak a sprite, preview it, and commit the *previous* PNG —
  which happened, and shipped a strawberry two pixels out of place. `npm run verify`
  cannot catch it because it cannot run Python, so `audit_sprites.py` with no arguments
  re-renders every sheet and reports any that were out of date.
- **Every species owns a hue, and the deck spans the whole range.** Thirty-six species
  are foliage-dominant and once sat within 30° of each other — the same green at the same
  muted saturation. They are now spread from yellow-green to blue-green, and because
  thirty-six species across that band land only ~3° apart, each also takes a saturation
  and lightness bias from a repeating three-step pattern, so any two neighbours in hue
  differ on another axis. Two constraints hold it in check: a species' leaves are never
  within 34° of its own flower (a dandelion with yellow-green leaves under a gold mane is
  one warm smudge), and midtone saturation is capped — a pastel highlight at 0.85 is
  pleasant, the same number at half lightness is a neon sign. Species that are drab by
  design stay relatively drab; ragweed being the plainest thing here is the reason
  goldenrod gets blamed for its pollen.
- **The five face colours in `FACE_PALETTE` are shared and stay shared.** They are what
  makes 45 different plants read as one deck rather than 45 unrelated drawings, so a
  recolour pass must never touch them. A species may deliberately author its own face or
  eye shade; nothing may drift into one by accident.
- **The manifest carries each sheet's frame-0 ink box, measured from the assembled art.**
  Same rule as `_face.py`: a part list says what was drawn, not where it ended up once
  gutters and shading had their say. It is what lets a fixed-size frame — the avatar badge —
  size itself to the plant rather than to the empty sky above a seedling. Frame 0 only,
  because a gesture may legitimately fling a seed off the canvas and sizing a portrait around
  that would shrink the plant to make room for a frame nobody is looking at.
- **Frame counts must be in `SUPPORTED_FRAME_COUNTS`**, because `steps()` cannot read a
  CSS custom property, so the count has to resolve to a literal class in `globals.css`.
  The build fails rather than shipping a sheet that would slide instead of snapping.
- **A gesture may only illustrate what the card and the plant actually support.** Nothing
  here may imply a medicinal effect: self-heal mends a notch in its OWN leaf, which is a
  pun on a common name, and never anybody else's. No invented botany, same rule as the
  deck data.

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
- **No `update` policy on any progression or history table**, and every policy on one is
  split into `select`/`insert`/`delete`. This is not a style choice: `for all` silently
  *includes* update, so the original single-policy-per-table version let a signed-in player
  rewrite their own `mastered_at`/`discovered_at`, or rewrite a sighting's `herb_id` after
  the fact — which is exactly the data `herbdex-action` re-derives mastery and research
  from. Splitting the policies is what makes the "write-once, recorded never revoked"
  contract real rather than merely stated in a comment. Every upsert in the app passes
  `ignoreDuplicates: true` (`insert ... on conflict do nothing`), which needs only the
  insert policy — so adding an `update` policy to `discoveries`, `learned`, `mastered`,
  `research_completions`, `unlocked_achievements`, `sightings` or `scans` would reopen the
  hole and buy nothing. **A mutable preference table may explicitly allow owner-scoped
  updates**, with `using` *and* `with check` both pinned to `auth.uid()` — the `with check`
  half is what stops an owner reassigning the row's `user_id` to somebody else. `profiles`
  (0003) is the one such table and holds no value anything is derived from;
  `profile-schema.test.ts` fails if a second table grants an update, or if that one loses
  its `with check`. Verified live by `e2e/supabase.e2e.test.ts`.
- **Live verification is `npm run verify:supabase`, and it now passes green against the test
  project** — 37 tests, including the cross-user attacks. Its first real run found one bug,
  and it was in the suite: the `with check` test seeded Bob's profile row through
  `saveRemoteProfile`, which is bound to the app's singleton client — signed in as Alice — so
  the database refused it exactly as it should. A fixture that needs another user's row must
  write it through that user's own client. Anything a test asserts about RLS is only as true
  as the identity it wrote with. It lives in `e2e/supabase.e2e.test.ts`, runs against a real
  project via `.env.local`, and is deliberately *not* part of `npm test` —
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

## The Seed Shelf

Species a player identifies that have no Plantdex card. `/seed-shelf` is a wooden shelf of
procedurally generated seed packets, offered from a scan that found a real plant the deck
does not carry — the state that used to be a dead end.

- **A packet is not a card, and the code cannot confuse them.** Shelf rows live in their own
  store with their own key and the shelf modules import neither `herbdex-reducer` nor
  `progression` — pinned by `seed-shelf.test.ts`. XP is summed over `HerbdexState`
  (`progression.ts`), so a store the reducer cannot see is a store that structurally cannot
  pay. Saving to the shelf awards nothing, and the page says so where somebody reads it.
- **Rows are write-once; the shelf is derived.** One row per SAVE, not per species
  (`0004_seed_shelf.sql`), folded into one entry per species by `mergeFinds`. So there is no
  `encounters` counter to replay, no first-found date a later write could move, and no
  `promoted` flag — which is why this table needs no update policy and `profiles` stays the
  single deliberate exception (`profile-schema.test.ts` enforces that).
- **"Grown into a card" is derived from the collection**, not stored: an entry has grown when
  the deck has a card for its species and that card is in `discoveries`. Claiming therefore
  writes a discovery through the ordinary idempotent `discover()` and touches the shelf not
  at all — no duplicate award is possible, because it is the same call every other entry
  point makes.
- **Identity is taxonomic, never a common name.** Entries key on `normalizeName()`, the
  matcher's own normalised binomial, and `cardFor()` promotes only on `confirmable` — `exact`
  and `genusCard`. `sameGenus` is a relative, and a packet that sprouted into it would write
  something untrue into a collection. Synonyms come from `plant-match.ts`'s checked table;
  nothing here invents one.
- **The future-collection mechanism is four lines and needs no migration.** The shelf stores
  scientific names and the matcher maps scientific names onto cards, so a card printed
  tomorrow makes every shelf holding that species sprout the next time it is read.
- **`discover()` takes an optional `at` for exactly one caller.** A claimed packet is stamped
  with the date the plant was FOUND, months before the card existed; stamping it with today
  would rewrite the player's own history. Every other call omits it.
- **Packets are generated, never authored.** `seed-packet.ts` computes a recipe from the
  species key with the existing seeded RNG (`rng.ts`) — four silhouettes, eleven pixel
  motifs, and a palette drawn entirely from deck tokens. Determinism is the whole design:
  the same species produces the same packet on any device for any player, which is what makes
  two shelves agree without a shared registry to consult, and it is why the generator may
  never read a clock or `Math.random()` (`seed-packet.test.ts` fails on either). The recipe is
  also STORED with the first find, so raising `PACKET_VERSION` later cannot redraw a packet
  somebody has been looking at.
- **A packet leans on the plant's own name where the name says something** — Trifolium gets a
  clover, "Yellow woodsorrel" gets a gold band — and is otherwise an arbitrary deterministic
  draw. That is reading a name, not inventing botany, and no packet claims to depict a
  specimen.
- **Nothing on the shelf is a confirmed identification.** It records what an identifier
  suggested from a photograph, carries the same uncertainty the scan did, and says nothing
  about edibility or safety.
- **The shelf works signed out** (localStorage, same rows as the server holds) and is carried
  into an account by the existing local-progress import. `seed-shelf-store.ts` is the facade
  that picks a backend; a component that reaches past it fails `seed-shelf.test.ts`, the same
  rule `sightings-store.test.ts` enforces after `/journal` once read the wrong store.
- **A board holds exactly as many packets as the grid has columns.** A board is one plank
  drawn under one row, so a longer slice wraps and the plank lands under the second row with
  the first floating above nothing. Three across at every width; the shelf takes a fixed
  maximum width instead, which is also how a real shelf behaves.

## Analytics, deletion and export

- **`track()` takes an event name and has no second parameter.** That is the privacy
  guarantee, not the forbidden-key list it replaced: a list can only fail the build *after*
  somebody has written the line that attaches a user id, whereas a one-parameter function
  makes the line impossible to write. Do not add a props argument. `analytics.test.ts` reads
  the signature and fails if it grows one.
- **It is also the plan decision.** Plausible's custom properties are Business-tier; below
  that a `props` payload is accepted by the API and then never displayed — the data leaves
  the browser and the breakdown silently is not there. Nothing is lost by sending none: every
  plant profile is its own URL, so the ordinary page report already splits plant events by
  species (and therefore by card number and habitat). Dimensions the path cannot imply live
  in the event name instead. See `docs/analytics.md`.
- **Every custom event must exist as a GOAL in the Plausible dashboard**, or it records
  nothing visible. `PLAUSIBLE_GOALS` is the list to work from, and a test keeps it equal to
  every event but `pageview`.
- **Analytics hangs off the provider, not off buttons.** Discovery is measured in
  `HerbdexProvider` because every entry point goes through one function and `awarded` is
  false on a repeat — so a component cannot report a discovery that did not happen.
- **`checkout_started` fires on `pointerdown` as well as `click`.** It is the only outbound
  navigation in the app; the four `deck_cta_*` links are client-side route changes that never
  unload the page. Fired only on click, the beacon races the unload and the most important
  number in the funnel is lost some of the time. Deliberately not `preventDefault` plus a
  callback: a blocked script would then strand a buyer on the product page.
- **Two analytics bugs were silent, and both are pinned by regression tests.** The queue shim
  must live in `track()` and not in a `<Script>` — a mount effect runs before an
  `afterInteractive` script, so `herbdex_opened` and `garden_opened` recorded zero. And the
  tag's id must not be `plausible`: an element's `id` becomes a property of `window`, so
  `window.plausible` was an HTMLScriptElement and every call threw into the catch.
- **The privacy page and the analytics code are checked against each other in both
  directions** (`legal.test.ts`). The page promises each action "carries no attached data";
  the test asserts that sentence *and* the one-parameter signature. Neither can drift alone.
- **Account deletion order is photos → rows → auth user → local state, and must stay that
  way.** Nothing in Postgres connects `storage.objects` to `auth.users`, and the delete
  policy compares `auth.uid()` to the folder name — so deleting the user first leaves
  photographs permanently unreachable. Rows are deleted explicitly rather than left to the
  cascade, so a failed `deleteUser` leaves an emptied account a retry can finish.
- **The delete function reads no request body.** Identity comes from `auth.getUser()` under
  the caller's own token; the service-role client that follows bypasses RLS, so RLS is *not*
  the boundary here and a forged `userId` must have nothing to attach to.
- **Local data is cleared only after the server confirms.** A failure leaves the dialog open
  and says plainly that nothing was deleted — never strand a device's progress on a failed
  delete, same rule as the import dialog.
- **The export throws rather than returning a partial file.** Somebody who exports and then
  deletes has one copy; a truncated file presented as complete is worse than a failed one.
  XP and level are absent because they are derived — printing them would put a number in a
  document people read as a copy of the database.

## Player profile

`/profile` is the collectible identity page — a field-naturalist card assembled from records
the game already holds, plus seven chosen settings. Owner-only: no public profiles,
followers, comments, leaderboards or feed.

- **The profile row holds only choices, and no numbers.** Seven fields: a display name and
  six ids (`src/lib/player-profile.ts`). Level, XP, counts, completion, achievements earned,
  habitat standings, recent finds and the garden strip are all derived on read by
  `profile-stats.ts`, exactly as XP always has been — a cached progression column here would
  be a number a client could assert, and there is deliberately none to assert.
  `profile-schema.test.ts` reads the migration's column list and fails if one appears.
- **Selections are validated on read, not on write.** `resolveProfile()` drops any avatar,
  sidekick, featured card, frame, title or pinned achievement the current collection does
  not support, and falls back rather than erroring. The row is client-written under RLS, so
  a player could name a plant they have not discovered; that is cosmetic, private and pays
  no XP, so it does not warrant server recomputation — but the page must never *render* a
  locked sprite as earned, and read-time validation is also what makes a stale id from an
  older build degrade quietly instead of breaking a page somebody is reading.
- **Frames and titles are pure predicates of `HerbdexState`** (`field-frames.ts`,
  `field-titles.ts`, sharing `cosmetics.ts`), like achievements — so unlock state is never
  stored and a cosmetic added later unlocks retroactively. Each carries a `condition`
  sentence, which is what the cabinet prints; restating a threshold in the UI would let it
  promise one thing while the code checked another. `field-frames.ts` reuses the
  achievements' own predicates rather than repeating their numbers.
- **Habitat Specialist privileges no habitat.** Five species sharing any one primary habitat
  earns it, and the qualifying habitat is resolved at render time for the label. Its
  tie-break is deterministic (highest count, then `HABITATS` order) because discoveries are
  an object — "whichever came first" would change between a reload, a sync and the server.
  Every "best" or "most recent" in `profile-stats.ts` ends in the same kind of fixed
  tie-break for the same reason.
- **The sidekick is not a pet.** Its sprite is drawn at `stageForState()`, the same
  mastery→growth mapping the Garden uses, so it grows only by that card being learned and
  mastered. No clock, no feeding, no timers, no state of its own — `garden.ts`'s rule
  applied to one plant.
- **`/profile` carries no `SafetyNotice` and no `DeckCta`.** It discusses no ingestion,
  preparation, identification or medicinal tradition, and a notice repeated onto a page that
  raises no such risk is how the notices on pages that *do* stop being read. That holds after
  the account blocks moved in: an email address and a delete button raise none of those
  either. The four CTA placements stay a fixed, tested set.
- **The profile owns the account; `/account` is only the sign-in door.** Identity ("signed in
  as" + sign out) and `AccountDataSection` (download + delete) live at the foot of `/profile`
  and *nowhere else* — `legal.test.ts` fails if `AccountDataSection` gains a second caller.
  An irreversible action offered in two places is one somebody meets twice and trusts less
  each time, and two copies drift until one is the stale warning. `/account` keeps the auth
  forms and `ImportLocalProgressDialog`, which must stay there: its effect fires on `userId`
  and a player who has just signed in lands on that page, so it is the only place the
  local-progress offer reliably appears. `/privacy` names where deletion lives, and
  `legal.test.ts` fails if it still points at the account page.
- **The sitewide badge is the avatar, resolved through `resolveProfile`.** It cannot show a
  plant that was never discovered or a frame that was never earned, because it inherits the
  page's own validation rather than repeating it, and it falls back to the email initial
  rather than ever rendering an empty circle. Its sprite is `frozen`: the badge is on every
  page, and frame 0 is authored as a complete resting pose precisely so it can be held.
- **The badge frames the PLANT, not the canvas it was drawn on.** Every stage is drawn on one
  fixed cell against a shared ground line, so a seedling uses under half of it and an adult
  four fifths — which at 36px meant a sprout was about twelve pixels of green floating low in
  the circle, reading as a broken avatar rather than as a young plant. `contentFit`
  (`plant-sprites.ts`) scales and re-centres each sprite by the ink box `build_sprites.py`
  measured for it, so every stage of every species reaches the same share of the badge. It
  changes nothing else: the badge still shows whichever sprite `stageForState` chose, so the
  avatar grows sprout → growing → flowering with the card it was set to, and there is
  deliberately no per-stage avatar to pick. The larger avatars keep the authored composition,
  ground line and all — they have the room.
- **`FRAME_FILL` is measured, not chosen by eye.** 0.74 is the largest share at which not one
  of the 135 sheets loses a pixel to the badge's circle; 0.82 costs twelve of them a leaf
  tip. `audit_sprites.py` re-measures that against the real art — `npm run verify` cannot,
  since the cropping only happens in a browser — so a plant redrawn wider, or a fill raised
  without re-measuring, fails the audit instead of shipping cropped.
- **Signing in seeds the account profile from the device; it never overwrites and never
  clears.** A signed-in save writes the account only, so on a shared device signing in does
  not repaint the signed-out identity — the same reasoning that keys the collection import
  offer per user id.
- **The privacy page and the profile are checked against each other.** `/privacy` used to
  say the application had "no username, display name, avatar … or profile of any kind";
  `legal.test.ts` now fails if that denial returns while `/profile` exists, and if the page
  stops disclosing what the profile stores. Same guard shape as `/shop` ↔ `/terms`.
- **Export and deletion must name the same set.** `account-security.test.ts` compares the
  tables `export-account-data.ts` reads against `USER_TABLES` in the delete function in both
  directions, and checks the browser keys too — a table added to one and forgotten in the
  other is how a "deleted" account keeps a row.

## V0.4 commerce

A Stripe Payment Link behind `/shop`. The site stays a static export; there is no commerce
backend and no order state anywhere in this repository.

- **No Stripe key of any kind belongs in this repo**, secret or publishable — a Payment Link
  needs neither, and that is the whole reason it was chosen over a custom integration. No
  Stripe.js either: the buyer types their card on Stripe's origin, and loading a script here
  would change the entire PCI position. `shop.test.ts` fails the build on both.
- **The Payment Link is regex-validated to a Stripe host.** This value is the destination of
  the loudest button on the site, so a mistyped or tampered repo variable must turn the
  button *off* rather than send buyers somewhere else with a card in hand.
- **Price, shipping, delivery times and returns are owner inputs, never defaults.** Both
  `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` and `NEXT_PUBLIC_DECK_PRICE` must be set or `/shop`
  renders an honest "not on sale yet" state. Tests refuse a hard-coded price, an invented
  delivery estimate and any scarcity or stock claim — AGENTS.md prohibits fabricated
  shipping and inventory claims outright, and a launch page is exactly where they appear.
- **`/shop/thanks` prints no order data.** The page is static with no Stripe secret, so
  anything read from `session_id` would be unverified — a confirmation anyone could forge by
  editing a query string. It confirms the event, points at Stripe's receipt as the record,
  and claims no delivery date.
- **A CTA never displaces a safety notice.** Four placements, one per page, each *above* the
  notice. Pushing the caution down to make room is the same regression as downgrading its
  weight. The plant CTA renders only on a discovered card — a locked page's job is the
  discovery loop.
- **Terms of Use and Terms of Sale are separate pages**, because one governs a free website
  and the other governs buying a physical object. `/terms` once claimed "there is no shop, no
  checkout and no payment processing anywhere in the application", which stopped being true
  the moment `/shop` shipped — exactly as the privacy page's "no analytics" sentences did.
  `legal.test.ts` now fails if a `/shop` route exists while `/terms` denies it.
