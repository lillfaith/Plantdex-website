# Dandelion Boss Form: safest implementation plan (v2)

**Status: plan. Nothing is deployed, no migration is applied beyond the test project's 0012,
no question is enabled.** Follows the owner's decisions: cat's-ear concept approved but the
botanical distinction held back until verified; Compare passes at 2 of 3 (pending the checks
below); one retry for missed questions at the end of each learning activity; Boss Trial stays
9 of 10 with no retry; 60/30/10 trial mix kept; the UI proceeds without the cat's-ear photo.

Labels: **SOURCE-VERIFIED**, **DRAFT, AWAITING REVIEW**, **PROPOSED**.

---

## 1. The "branched leafy flowering stems" wording

**Finding: "leafy" is very probably wrong, and "branched" needs softening.** None of the sources
below is the app's own curated source, I read search summaries only, and none replaces a
botanical reviewer. They are the leads the reviewer should check first.

| What the sources say | Source |
|---|---|
| Cat's-ear flower stems are usually branched, and carry small **scale-like bracts**, not real leaves. | [Illinois Wildflowers, cat's-ear](https://m.illinoiswildflowers.info/weeds/plants/rgh_catear.htm) |
| Branching is the main field feature against dandelion, and cat's-ear leaves carry **coarse hairs**. | [UC IPM weed gallery](https://ipm.ucanr.edu/PMG/WEEDS/common_catsear.html), [IEWF weed ID](https://www.iewf.org/weedid/Hypochoeris_radicata.htm) |
| Cat's-ear stems are tall, tough and **leafless or sparingly branched**. Hollowness is hard to see. | [AgPest NZ](https://agpest.co.nz/?p=1361) |
| A regional key separates them mainly by **leaf hairiness** and stem scales. | [Victorian Resources Online key](https://vro.agriculture.vic.gov.au/dpi/vro/vrosite.nsf/pages/sip_salt_yellow_daisy_key) |

What this means:
- **"Leafy" should go.** The sources describe leafless stems with small scales. Calling them
  "leafy" may be an error in the existing note.
- **"Branched" is the usual feature but not absolute.** One source says "sparingly branched", so a
  fixed rule such as "no branches means dandelion" can mislead. Hedge it.
- **"Hollow" stays out**, as you said. It is unreliable for cat's-ear.
- **Leaf hairiness is a second, visual feature** (coarse hairs on cat's-ear leaves). It would suit
  a photograph, if the reviewer confirms dandelion leaves are hairless or nearly so.

**Proposed replacement wording. DRAFT, AWAITING REVIEW. Do not publish:**
> Dandelion has one unbranched flower stalk rising from the leaf rosette. Cat's-ear stalks are usually
> branched, with small scale-like bracts, and its leaves are coarsely hairy.

**Effect on the questions (changes to my earlier drafts):**
- B1 keeps the line "Which has one stalk from the leaves?".
- B2 becomes "Which usually has a branching stem?" (adds "usually").
- B3 changes to "A stem forks into several heads. Dandelion?" with **"Probably not"**, not a flat "No".
- A new optional Showdown, "Which has hairy leaves?", is held until a reviewer confirms the fact
  and we have a clear leaf photo.
- Everything that depends on this stays **disabled** until the wording, the photo and a named
  reviewer all exist.

---

## 2. What the current server does, and what must change

I read the pure scoring code, the edge function and migration 0012 line by line.

| Area | Today | Needed for your decisions |
|---|---|---|
| **Pass marks** | One constant, `PASS_MARKS` in `boss-form.ts`. Not stored in the database. | Compare `need: 3` becomes `2`. **Code only, no migration.** |
| **Retry for a missed question** | **Already built.** Each slot has a `primary` question and an optional `replacement`. A replacement is answered only if the primary was wrong, and the Boss Trial gets none ("first-try only"). | **No server change.** The screen just asks replacements at the end instead of straight after the miss. The answer format is unchanged. |
| **Visual question types** | Text only: a prompt and four strings. | New question kinds (picture, tap, showdown) added to the **shared** pure modules. Every answer is still an integer index, so scoring is unchanged. |
| **Where completions live** | `challenge_completions` and `boss_forms`: owner can only read; the service role writes through `award_challenge`; one row per player per plant per activity. | **No schema change.** The 0012 already on test is enough. |
| **XP and achievements** | Challenge tables are read by nothing: not by XP, not by the Field Board (I checked `0011`), not by achievements. | **None.** A Boss Form awards no XP. No achievement is added without your approval. |
| **Function deployed?** | `challenge-submit` has **never been deployed** anywhere. | So no live data exists that a threshold change could affect. Records are write-once, so nothing could be downgraded anyway. |

**Because the function is not deployed, all of the above is a code change that ships together,
and then one deploy to test first, one to production later, each with your approval.**

### 2a. Two findings you should know about

**1. Retry plus lower pass marks makes the learning activities easy to pass by guessing.**
This is arithmetic, assuming pure random clicking, 3 options per picture and 2 per showdown:

| Activity | Guess-pass, no retry | Guess-pass, with one retry |
|---|---|---|
| Part Spotter 3 of 4 | 11% | 40% |
| Compare 2 of 3 | 50% | **84%** |
| Habitat 2 of 3 | 33% | 68% |
| Boss Trial 9 of 10, no retry | **under 1%** (about 1% if every question were 2-option) | n/a |

That is acceptable **only because the Boss Trial is the real gate** and it has no retry. These
activities are cosmetic, award no XP and can be repeated, so a lucky guess costs nothing, but
"guessing past the Compare activity" would be easy. Options, your call:
- **(Recommended)** Keep 2 of 3 and keep retry, and rely on the Trial. Simple and forgiving.
- Keep 2 of 3 but give Compare **no retry**, so guessing passes 50%, not 84%.
- Give Compare three photos per round (dandelion plus two lookalikes) so a guess is 1 in 3.
  This needs a second lookalike photo and reviewer approval.

**2. A missing step before any public launch: export and deletion.** `challenge_completions` and
`boss_forms` are user-owned tables, but they are **not yet in the account export or in the
`delete-account` function's table list.** The repo's rule is that export and deletion name the same set,
and a "deleted" account must not keep a row. Before Boss Forms are ever enabled in production:
add both tables to export and to deletion, redeploy `delete-account`, and update the Privacy page.
This is a small code change plus one more function deploy, and needs its own approval.

### 2b. Anti-farming (the retry and replays)
- **No XP exists to farm.** Nothing pays for a Boss Form or an activity.
- **Idempotent:** one row per (player, plant, activity), and `award_challenge` re-checks mastery and
  the prerequisites itself, so replaying a passed activity records nothing new.
- **Rate limit:** 60 submissions per player per UTC day, counted before any work. A whole activity,
  retry included, is **one** submission, so retry does not weaken the limit.
- **Retry cannot be a hint.** A replacement is a **different question on the same fact**, not the
  same question again, so the revealed answer does not carry over. This needs **spare questions**.

### 2c. Spare questions (a content requirement, not a code one)
The builder only gives a slot a replacement when the pool is larger than the activity. To cover every
slot the pool must be about double: **Part Spotter 8, Compare 6, Habitat 6.** With seven facts, the
spares are the same fact shown with a different photograph or wording. Each needs reviewer approval.
Until a pool is big enough, the screens still work: slots without a spare simply have no retry, and
the activity page says nothing misleading.

---

## 3. The safest implementation order

Every step is on the dev branch, tested, and behind the existing flag (off by default; `preview`
works only in `next dev`; a production build treats `preview` as off).

**Step A: Safe UI and non-sensitive code (I can do now, no approval needed).**
- Challenge screens: Pick the Picture, Spot the Feature, Lookalike Showdown, Quick Pick; progress
  dots; one-sentence feedback; retry-at-the-end; Boss Trial intro and the evolution screen using the
  **existing** boss sprite and an opacity-only crossfade (no blur, no new animation system).
- The extended question shape in the shared pure modules, with tests.
- Sample questions marked **draft** and shown **only in `next dev`**, so we can look at the experience.
  A production build serves nothing: the builder still requires a named reviewer for every item.
- Dependent items carry a `requires` list (for example `cats-ear-branch-photo`). An item with an
  unmet requirement is **disabled exactly like an unreviewed one**.
- Resize and record the CC0 photographs. They live outside the shipped site until a question using
  them is approved.

**Step B: Code that touches scoring, still not deployed (needs your OK on this plan).**
- Compare `need` 3 to 2, the matching test updates, then `npm run sync:edge-shared`.
- Add the two tables to export and deletion, with tests.

**Step C: Deploy to the TEST project only (needs your approval, one step at a time).**
- Deploy `challenge-submit` to test; extend the live suite to cover the new thresholds, replacement
  scoring, the Boss Trial having no retry, and a cross-user attack on both tables.

**Step D: Production (each needs your explicit approval, in this order).**
1. Migration 0012.
2. `challenge-submit` and the updated `delete-account`.
3. Website release with `NEXT_PUBLIC_BOSS_FORMS=on`. **Not until a named reviewer has approved
   questions.** With no reviewer entries, nothing is served even with the flag on.

Nothing in A to C reaches production.

---

## 4. What is still needed from you or others

| Need | Who |
|---|---|
| A named botanical reviewer, to approve wording, photos and every question | You |
| Review of the corrected cat's-ear wording in section 1 | Reviewer |
| A cat's-ear photograph that clearly shows a branched stem | Open (CC0 search continues) |
| Choice on the guessing finding in 2a | You |
| OK for Step B (Compare 2 of 3 and the export and deletion fix) | You |
| More CC0 seed-head photographs and a clear hairy-leaf photograph | Open |
