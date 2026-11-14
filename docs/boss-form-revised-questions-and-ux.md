# Dandelion Boss Form: revised questions and challenge experience

**Status: planning and draft content only. Nothing is implemented, applied or enabled.**
No scoring, XP, achievements, schema, unlock conditions or server validation change here.
Boss Forms stay off. Every question below is **unreviewed** and is not served until a named
botanical reviewer signs it off (`CHALLENGE_REVIEWS`, unchanged).

Labels used throughout:

- **SOURCE-VERIFIED**: a fact taken from the app's curated Dandelion notes
  (`card-field-notes.ts`, sources `wisc-dandelion` and `umn-dandelions`).
- **DRAFT, AWAITING REVIEW**: question wording, answer options, photo choices. A reviewer must approve.
- **PROPOSED MECHANIC**: how the screen behaves. Needs your approval, and some need a scoring decision.

---

## 1. What the sources actually say (the only facts available)

Seven facts, all **SOURCE-VERIFIED**. Every question below uses only these.

| # | Fact (as the curated note words it) |
|---|---|
| F1 | A low rosette of deeply toothed or lobed leaves. |
| F2 | Leaf lobes commonly point back toward the centre of the rosette. |
| F3 | One bright yellow head grows singly on a leafless, hollow stalk. |
| F4 | Broken leaves or flower stalks release a milky sap. |
| F5 | Mature flowers become round white, wind-dispersed seed heads ("clocks"). |
| F6 | Lawns, paths, roadsides, gardens, fields, open sunny disturbed ground. Especially tolerant of compacted soils. |
| F7 | Lookalike note: dandelion stalks are single and unbranched, rising straight from the rosette, rather than from branched flowering stems. |

Two things I am **not** doing, on purpose:
- **No "hollow stalk" as a difference** between dandelion and cat's-ear. Both are hollow. The only
  lookalike difference used is **single and unbranched** (F7).
- **No season question.** The sources give no bloom season. The card prints "summer", which is a
  fact about the card and could mislead (dandelions also flower in spring). Dropped.

**Honest limit:** seven facts cannot support many distinct questions. The Boss Trial below
re-tests the same facts from new angles and with different photographs, never the same wording.
A reviewer adding more sourced facts is the real way to widen the pool.

---

## 2. Question formats (PROPOSED MECHANICS)

Four formats, one screen each, one tap to answer, no typing, no timers.

| Format | What the player does | Time |
|---|---|---|
| **Pick the Picture** | Tap one of 2 or 3 large photographs. | 5 to 8 s |
| **Spot the Feature** | Tap the named part on one large photograph. A tap inside the marked area counts. | 5 to 10 s |
| **Lookalike Showdown** | Two photographs side by side (dandelion and cat's-ear). Tap the one that matches the line. | 6 to 10 s |
| **Quick Pick** | A short line and two or three short text answers. | 5 to 8 s |

Style rules for all copy: prompt up to 8 words, answers up to 4 words, feedback one sentence
up to 16 words. No "curated trait". No jargon beyond "rosette", which the first activity teaches.

**Photographs are CC0 iNaturalist observations only** (your rule). Pixel sprites are shown beside
the question for fun and are **never** an answer image or an identification reference.

---

## 3. Before and after: the eight existing questions

| # | Before (draft) | Problem | After | Format | Status |
|---|---|---|---|---|---|
| Q1 | "Which curated trait describes the dandelion's low ring of leaves at the base?" with four long trait sentences | Jargon, four sentences to read | **A1** "Find the leaf rosette." Three photographs. | Pick the Picture | DRAFT |
| Q2 | "...direction of the dandelion's leaf lobes?" | "Commonly" makes a fixed answer unfair, and it is hard to show in a photo | **Retired as a question.** The fact moves into A1's feedback. | none | DRAFT |
| Q3 | "...how the dandelion's flower is carried?" | Long sentences, and the wrong answers were other plants' traits | **A2** "Tap the flower stalk." | Spot the Feature | DRAFT |
| Q4 | "...once the flower has finished?" | Text only | **A3** "Find the seed 'clock'." Three photographs. | Pick the Picture | DRAFT |
| Q5 | "...what happens when a leaf or stalk is broken?" | Distractors were unrelated plant traits | **A4** "A broken stalk leaks what?" | Quick Pick | DRAFT |
| Q6 | "Which curated habitat note matches?" with three near-identical lists | Overlapping answers, a reading test | **C1** "Spot the dandelions along this kerb." | Spot the Feature | DRAFT |
| Q7 | "Which soil condition...?" with "flooded, deep shade, bare rock" | Silly wrong answers, not from sources | **C2** "A path gets trampled hard. Can dandelions cope?" | Quick Pick | DRAFT |
| Q8 | "Which season does the printed card give?" | Misleading and not botany | **C3** "This puff used to be a...?" Three photographs. | Pick the Picture | DRAFT |

Two additions, both new angles on facts already in the notes (no new facts):

| # | Question | Why it is needed |
|---|---|---|
| N1 | **Tap the yellow flower head.** | A pure visual warm-up and a Boss Trial item that is not a repeat. |
| N2 | **How does a dandelion puff travel?** | Applied question for F5. It replaces the idea of a season question. |

---

## 4. The question bank (exact text) — all DRAFT, AWAITING REVIEW

Correct answer marked **✓**. Photo ids are iNaturalist photo ids, all CC0, all viewed by me.
Answer order is shuffled by the builder.

### Activity 1: Part Spotter (4 rounds, pass 3 of 4) — about 1 to 2 minutes

**A1. Pick the Picture. "Find the leaf rosette."**
- ✓ Photo 282276229 (rosette of toothed leaves, from above)
- Photo 486847173 (open yellow flower head)
- Photo 282276185 (white seed head)
- Feedback: "A rosette is the ring of toothed leaves at ground level. The lobes usually point back toward the middle." (F1, F2)

**A2. Spot the Feature. "Tap the flower stalk."**
- Photo 282276157 (bare stalk under a seed head). Tap area: the stalk.
- Feedback: "One bare stalk carries one flower." (F3)
- Needs hotspot coordinates confirmed by the reviewer.

**A3. Pick the Picture. "Find the seed 'clock'."**
- ✓ Photo 282276185 (round white seed head)
- Photo 282276229 (leaf rosette)
- Photo 486847173 (open flower head)
- Feedback: "That round white puff is the seed head, and the wind spreads it." (F5)

**A4. Quick Pick. "If a stalk breaks, what leaks out?"**
- ✓ Milky white sap
- Clear water
- Nothing, it is dry
- Feedback: "Broken leaves and stalks release a milky sap." (F4)

### Activity 2: Lookalike Showdown (3 rounds, pass 3 of 3 as approved; see section 8)

Needs your approval of the cited cat's-ear edit and one photograph that is not yet found. See section 7.

**B1. Showdown. "Which one has a single stalk from the leaves?"**
- ✓ Dandelion photo 486847133 (flower stalk rising from the rosette)
- Cat's-ear photo (a branched flowering stem). **Photo still missing.**
- Feedback: "Dandelion stalks are single and unbranched, and rise straight from the leaves." (F7)

**B2. Showdown. "Which plant has a branching flower stem?"**
- ✓ Cat's-ear photo (branched stem). **Photo still missing.**
- Dandelion photo 284777956 (single stalks)
- Feedback: "Cat's-ear and similar lookalikes carry flowers on branched stems." (F7, wording needs review)

**B3. Quick Pick. "A stem forks into several flower heads. Dandelion?"**
- ✓ No, dandelion stalks do not branch
- Yes, that is dandelion
- Feedback: "Dandelion stalks are single and unbranched." (F7)

### Activity 3: Habitat and Life Cycle (3 rounds, pass 2 of 3) — about 1 minute

**C1. Spot the Feature. "Spot the dandelions along this kerb."**
- Photo 120604612 (yellow dandelion flowers along a pavement edge). Tap any flower.
- Feedback: "Dandelions love roadsides and paths: open, sunny, disturbed ground." (F6)
- Needs hotspot coordinates confirmed by the reviewer.

**C2. Quick Pick. "A path gets trampled hard. Can dandelions cope?"**
- ✓ Yes, packed soil is fine
- No, they need soft soil
- Feedback: "Dandelions are especially tolerant of packed, compacted soil." (F6)

**C3. Pick the Picture. "This puff used to be a...?"**
Shows photo 282276185 (seed head).
- ✓ Photo 486847173 (open yellow flower head)
- Photo 282276229 (leaf rosette)
- Photo 282276157 (bare stalk)
- Feedback: "Mature flowers turn into round white seed heads." (F5)

### Spare items (used by the Boss Trial)

**N1. Spot the Feature. "Tap the yellow flower head."** Photo 284777956. Feedback: "One bright yellow head sits on top of each stalk." (F3)

**N2. Quick Pick. "How does a dandelion puff travel?"**
- ✓ On the wind
- Floating on water
- Stuck to fur
- Feedback: "The seed head is wind-dispersed, so the wind carries the seeds." (F5)

---

## 5. The Boss Trial: ten questions, pass 9 of 10 — about 2 to 3 minutes

Re-tests the same facts with **different photographs and different wording**, nothing copied from
the three activities. Mix: **6 visual, 3 applied, 1 recall (60/30/10).**

| # | Format | Short text | ✓ | Feedback | Type |
|---|---|---|---|---|---|
| T1 | Spot the Feature | "Tap the ring of leaves." (photo 486847133) | the rosette | "Toothed leaves in a low ring: that is the rosette." | visual |
| T2 | Pick the Picture | "Which one is the seed head?" (photo 282276185 vs 284777918 vs 282276389) | seed head | "Round, white, and spread by the wind." | visual |
| T3 | Spot the Feature | "Tap the flower head." (photo 486847173) | the head | "One bright head per bare stalk." | visual |
| T4 | Showdown | "Which has one unbranched stalk?" (different photo pair) | dandelion | "Dandelion stalks do not branch." | visual |
| T5 | Showdown | "Which one forks into several heads?" (different photo pair) | cat's-ear | "Lookalikes branch; dandelion does not." | visual |
| T6 | Spot the Feature | "Find a dandelion by the road." (photo 120601622) | a flower | "Roadsides and paths suit dandelions." | visual |
| T7 | Pick the Picture | "What does a finished flower become?" (photos of flower, seed head, rosette) | seed head | "Flowers become wind-spread seed heads." | applied |
| T8 | Quick Pick | "Hard-packed soil along a path. Dandelions?" | "Yes, they cope" | "Compacted soil does not stop them." | applied |
| T9 | Quick Pick | "How do the seeds travel?" | on the wind | "The seed head is wind-dispersed." | applied |
| T10 | Quick Pick | "Which sap is a dandelion's?" | milky white | "Broken leaves and stalks leak milky sap." | recall |

**Is 9 of 10 still right?** Keep it for now. With clear photographs, one slip is allowed and the
framing is "you can take one hit". It only stays fair if the reviewer confirms every question is
unambiguous, and I would re-check after real playtests. If review finds two or more questions
need changes, 8 of 10 is the first thing to reconsider. **Changing it needs your approval.**
Also, with about 14 items a retry shares some questions with the first try. More sourced
questions would let each retry feel fresh.

---

## 6. Storyboard (390px phone, PROPOSED MECHANICS)

Existing look: plum background, gold frames, pixel borders, a light holographic edge on the final
button only. One pixel sprite stays visible at the top of every screen.

```
 1. MASTERED PLANT PAGE            2. CHALLENGE HUB
 ┌──────────────────────┐          ┌──────────────────────┐
 │  [Dandelion sprite]  │          │  [Dandelion sprite]  │
 │  Mastered            │          │  Evolve your Dandelion│
 │  ┌────────────────┐  │          │  ◉ Part Spotter  1:00 │
 │  │ Boss Form      │  │          │  ○ Lookalikes    1:00 │
 │  │ Start evolving │  │          │  ○ Habitat       1:00 │
 │  └────────────────┘  │          │  ▣ Boss Trial  (locked)│
 └──────────────────────┘          └──────────────────────┘

 3. PICK THE PICTURE               4. CORRECT (about 1.5 s, tap to go on)
 ┌──────────────────────┐          ┌──────────────────────┐
 │ [sprite]   ● ○ ○ ○   │          │ [sprite cheers]  ●●○○│
 │ Find the seed 'clock'│          │   ✓ Nice!            │
 │ ┌─────┐ ┌─────┐      │          │ That round white puff│
 │ │photo│ │photo│      │          │ is the seed head.    │
 │ └─────┘ └─────┘      │          │ [ Next ]             │
 │ ┌─────┐              │          └──────────────────────┘
 │ │photo│              │
 │ └─────┘              │
 └──────────────────────┘

 5. SPOT THE FEATURE               6. LOOKALIKE SHOWDOWN
 ┌──────────────────────┐          ┌──────────────────────┐
 │ [sprite]   ●●○○      │          │ [sprite]   ●●●○      │
 │ Tap the flower stalk │          │ One stalk from leaves?│
 │ ┌──────────────────┐ │          │ ┌────────┐ ┌────────┐│
 │ │  big photo       │ │          │ │dandelion│ │lookalike││
 │ │  (tap a part)    │ │          │ │ photo   │ │ photo   ││
 │ └──────────────────┘ │          │ └────────┘ └────────┘│
 └──────────────────────┘          └──────────────────────┘

 7. WRONG ANSWER (kind, no buzzers)   8. BOSS TRIAL INTRO
 ┌──────────────────────┐          ┌──────────────────────┐
 │ [sprite tilts]       │          │ [boss silhouette]    │
 │   Not quite          │          │ Boss Trial           │
 │ The answer: seed     │          │ 10 questions. You can│
 │ head. It's round and │          │ take 1 hit.          │
 │ white.  [ Next ]     │          │ [ Start ]            │
 └──────────────────────┘          └──────────────────────┘

 9. EVOLUTION (about 3 s, then settles)
 ┌──────────────────────┐   a. adult sprite goes grey, then lights back up
 │      ✦  ✦            │   b. one gold ring pulses once
 │   [BOSS FORM sprite] │   c. boss sprite crossfades in (existing boss sheet)
 │  Dandelion evolved!  │   d. short line + two buttons: "See it" and "Next plant"
 │  [See it] [Garden]   │   e. fixed small line: "Passing this means you studied this
 └──────────────────────┘      guide. It does not mean you can identify or use this
                               plant outdoors."
```

Behaviour notes (PROPOSED MECHANICS):
- **Progress** is five or ten small dots, never a number or a bar.
- **Correct:** a short pixel sparkle, one sentence, tap to continue.
- **Wrong:** the sprite tilts, the right answer is shown with the same one-sentence lesson. There is
  no buzzer, no red flash and no lives counter. The Boss Trial shows "one hit allowed" in words only.
- **Retry:** a failed activity or trial restarts straight away with a different draw of questions
  (existing rule). Nothing is lost and there is no cooldown.
- **Reuse, don't invent:** the evolution reuses the adult-to-boss sprite that already exists
  (`taraxacum-officinale-boss`) and the discovery reveal's opacity-only crossfade. It must not use
  backdrop blur, which measurably halved the frame rate before.
- **Reduced motion:** the ring and the crossfade become a still frame.
- **Hit areas** are at least 44px. There are no timers and no typing.

**The four stages stay:** Discovered, Learned, Mastered, Boss Form. The challenge screens sit
only after Mastered. Nothing here changes XP, achievements or unlock rules. A Boss Form still
awards no XP.

---

## 7. What is missing, and what needs approval

**Imagery (all must stay CC0 iNaturalist):**
1. **A cat's-ear photo that clearly shows a branched flowering stem.** None of the 14 CC0
   candidates I viewed shows it clearly. B1, B2, T4 and T5 depend on this.
2. **Photographs that clearly show cat's-ear leaf hairiness** (optional extra difference, only if
   a source supports it).
3. **Two or three more CC0 seed-head photographs** so the Trial does not reuse one image.
4. **Hotspot coordinates** for A2, N1, T1, T3 and C1, T6, drawn on the final cropped images and
   checked by the reviewer.
5. **Photographer names** for provenance. CC0 needs no credit, but the record should hold it.

**Chosen photographs (viewed by me, CC0):** dandelion 282276229, 282276157, 282276185, 282276146,
282276389, 282276319 (Omaha), 486847133, 486847173, 486847203 (Eschborn), 284777918 and 284777956
(Irkutsk), 120601622 and 120604612 (kerb). Cat's-ear candidates: 25823885, 77956319, 77956384,
668668006, 668668212. Full list in `evidence/boss-form-photos/`.

**Botanical evidence and reviewer:**
6. A **named botanical reviewer** and date for every question. Until then nothing is served.
7. The reviewer confirms every correct answer, every wrong answer, every photograph's species,
   and that the milky-sap and branching statements hold.
8. **F7 wording check.** The existing note says "branched *leafy* flowering stems". I'm not sure
   cat's-ear flowering stems are "leafy". The reviewer should confirm or correct this line.

**Approvals needed from you (I won't act without them):**
9. The **cited cat's-ear edit** to the curated Dandelion notes (naming *Hypochaeris radicata*).
10. **Compare pass mark.** Approved as 3 of 3. For a forgiving activity I would suggest 2 of 3,
    but that is an unlock rule, so it is your call.
11. **Retry missed questions once at the end** of an activity, as a second chance. This changes
    how the server scores a submission, so it needs a design review first.

**Not changed and not proposed:** XP, achievements, database schemas, unlock conditions,
server-authoritative validation, avatars or sidekicks, and the 9-of-10 Boss Trial requirement.
Boss Forms remain disabled.
