# Expansion Garden sprites #57-61: written proposals (DRAFT for owner review)

Status: **written proposals only.** No sprite was drawn, redrawn, edited, generated or built by this work; `scripts/sprite_sources` was not touched; no image is committed. The five draft sets
(on `origin/claude/plantdex-v0-3-supabase-verify-iic8pz`, `expansion/sprites/`) are **not approved**, and nothing here approves them. Art starts only after the owner approves a section below.

Owner notes of 2026-11-25 this answers: **#57 Boneset** more recognizable clusters of small white flowers; **#58 Hollow Joe-Pye Weed** refine the purple flower cluster; **#59 New Jersey Tea** denser white
flowering clusters, not isolated round flowers; **#60 Black-Eyed Susan** keep the dark centre and golden petals as the style reference; **#61 Narrowleaf Mountain Mint** more recognizable narrow leaves and
clustered flowers. Direction to preserve: the cute three-stage pixel-art character, with better botanical recognizability.

Inputs read: `CLAUDE.md` ("Animated plant portraits"), `AGENTS.md`, `docs/expansion/pilot/sprite-spec.md` (rules R01-R19), `sprite-qa-report.md`, `docs/expansion/pilot-plan.md` (all from
`origin/coord/expansion-pilot-sprite-qa` and `-plan`), the five source modules, `_build/manifest.json` and the built stills/sheets (read with `git archive` into a scratch directory outside the repo and viewed there).

## 0. Conventions and caveats

- **Sources.** All retrieved **2026-11-25**. No herbarium specimen image was opened in this pass (marked NOT CONSULTED where it matters). The printed expansion cards carry **no** flower-arrangement, leaf-shape or
  habit data (their back fields are uses, compounds, taste, aroma, preparations, parts), so botany below comes only from the cited floras, and anything not found is marked **NOT FOUND**, never guessed.
- **Taxonomy.** Cards name species by scientific name. Some sources file Boneset under *Eutrochium perfoliatum* (Morton Arboretum); the card and sprite id stay `eupatorium-perfoliatum`.
- **Parameters named below** are the existing source-module names (`flower_head(W, H, cx, cy, rx, ry, lobes, amp, face_rx, face_ry, ...)`, `parts`, `stages.swap/origins/motion`, `PALETTE`/`BUD_PALETTE`).
  Numbers are starting points for the art lane, not measurements; the checker decides the rest.
- **Hard constraints kept for all five** (spec): canvas 32x28 on every stage; sprout height 60%+/-6 and growing 80%+/-6 of the adult's ink; frame 0 one 8-connected piece at every stage; every feature measured onto
  the face with `face_box`/`seat_young`; the five `FACE_PALETTE` colours untouched; one named, botanical, non-medicinal gesture per species, personality label unique; sprout has no flower structure, growing is in bud.
- **The Garden question stays open.** The pilot plan keeps digital-only cards out of the Garden and profile today, and Boneset's card is HELD for safety review. Improving a sprite does not release a card.

### Source key

| Id | Source | URL |
|---|---|---|
| NC | NC State Extension Gardener Plant Toolbox | `plants.ces.ncsu.edu/plants/<genus-species>/` (per species, below) |
| MBG | Missouri Botanical Garden Plant Finder | `missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=...` (per species) |
| MDC | Missouri Department of Conservation field guide | `mdc.mo.gov/discover-nature/field-guide/<slug>` |
| FNA | Flora of North America | `floranorthamerica.org/<Genus_species>` |
| MW | Minnesota Wildflowers | `minnesotawildflowers.info/shrub/new-jersey-tea` |
| PA | Flora of Pennsylvania | `paenflowered.org/apgii/...` |
| USDA | NRCS Plant Fact Sheet, *Ceanothus americanus* | `plants.sc.egov.usda.gov/DocumentLibrary/factsheet/pdf/fs_ceam.pdf` |

---

## #57 Boneset (*Eupatorium perfoliatum*)

### (a) What the real plant shows

- **Flowers.** Many tiny heads of white disc florets (no rays) in **flat-topped compound clusters** (compound corymbs) at the top of the stem and in the upper leaf axils; dull/fuzzy white because the two-parted styles protrude. Each head has 9-23 florets (MDC, Morton), 10-20 (NC), 7-11 (Alabama Plant Atlas); sources disagree, so the sprite must not imply a count. Clusters 2-8 in. across (NC). Light-green bracts, hairy. - MBG (`.../kc/c730/eupatorium-perfoliatum.aspx`), MDC (`mdc.mo.gov/discover-nature/field-guide/american-boneset-common-boneset`), NC (`plants.ces.ncsu.edu/plants/eupatorium-perfoliatum/`), Morton (`mortonarb.org/plant-and-protect/trees-and-plants/common-boneset/`).
- **Leaves.** Opposite, lance-shaped to triangular-tapering, finely toothed, **wrinkled** with conspicuous veins, rough and hairy; the **bases of each opposite pair are fused around the stem** (perfoliate). Yellow-green to medium green, greyer beneath. - MBG, MDC, NC, UMass (`umass.edu/.../boneset--eupatorium-perfoliatum`).
- **Habit.** Tall (4-6 ft), clump-forming, hairy upright stem, wet habitats. - NC, MDC.
- **What separates it from lookalikes.** MDC: "easily identified by its opposite, stalkless leaves fused together across the stem." Against Joe-Pye weeds: **white (not pink-purple) flowers and mostly opposite (not whorled) leaves** (MDC Joe-Pye page, `mdc.mo.gov/discover-nature/field-guide/joe-pye-weeds`). Against yarrow (the deck's white flat cluster): leaves are broad, fused and wrinkled, not finely divided. The yarrow comparison is reasoned from the deck's own yarrow sprite and the leaf descriptions above; a yarrow-specific source was **NOT FETCHED**.

### (b) What the current set shows (from `_build` stills and the QA report)

Adult: a 24x18 cream head built by `flower_head(... lobes=11, amp=0.15 ...)` with `_florets` (deeper-cream flecks) and `AIRY` (7 carved holes), the face on the head, a two-leaf yellow-green collar (`COLLAR`) with the stalk showing through (`ss`), short stem. At 1x the ragged radial rim reads as a **spiky puff / seed-head or a dandelion cousin**, not a flat plate of many small heads; the holes read as damage. The collar does read as a fused pair. Growing: a green bud-ball head with a wider collar; sprout: a small green ball on a seedling collar. QA: passes, WARN R16 (negated medicinal wording in the docstring only).

### (c) Proposed change per stage

| Stage | Change (source parameters) |
|---|---|
| Adult (`flowering`) | Make the head a **flat-topped compound corymb**: flatten (`HEAD_H` 18 -> about 14, `ry` ~8.2 -> ~6.5, `rx` kept ~11) and replace the single radial lobe rim (`lobes=11`) with a **row of 5-6 adjacent small domes** along the top edge (hand-built mask rows, the way `eutrochium_fistulosum.py` builds `BUD_UMBEL`, because the generator produces a star, not a plate). Inside, break the surface into small floret blobs by a regular 2x2 pattern of `H`/`M` with 1-px `D` seams instead of the pseudo-random `_florets` flecks. Replace the carved `AIRY` holes by a few 1-px `H` pixels standing proud of the rim (protruding styles = "fuzzy"), never by holes. The face stays on the head (`face_dy` ~1.0 so the face sits slightly low in the plate). Keep the collar and make the fusion clearer: collar leaves 1 px longer with a darker 1-px vein and a notched lower edge (toothed, wrinkled). |
| Growing | Bud = a **flat plate of 4-5 tight green-white buttons** on a shared base (same technique as the existing hand-drawn `BUD_UMBEL`), `BUD_PALETTE` retained; the flat top already identifies it in bud. Collar unchanged in structure. |
| Sprout | Unchanged organ: vegetative only, fused seedling collar (`SEED_COLLAR`), no flower. Optionally 1 px more width on the collar so the fusion reads. |
| Gesture | **THE CLASP stays** (the collar rises and hugs the head); it is perfoliate anatomy shown as a movement, no medicinal reading. |
| Hue | Leaf 89 deg / flower 48 deg is only 6 deg above the 34-deg floor: keep the leaf hue where it is and do not warm the leaves; if the flowers are made whiter (lower saturation) the gap is unaffected. Re-run R11. |

### (d) Risks and checker

- **Yarrow (a deck card):** a flat white plate invites exactly that comparison. Mitigation: no feathery fronds, broad fused collar, fuzzy proud pixels, cream not white. Needs human side-by-side with the yarrow sprite at 1x.
- **Mountain mint (#61) and New Jersey Tea (#59)** are also white clusters; the three must differ by silhouette (flat plate + collar / needle bush / conical clusters on stalks).
- **Medicinal implication:** none introduced; the gesture is a posture. The card is HELD for a pyrrolizidine-alkaloid caution; the sprite must carry no use, tea or remedy cue. R16 stays WARN-only for the negated docstring lines.
- **Checker will test:** R05 heights (flattening the head lowers adult ink height, so the 0.615/0.769 ratios must be re-measured), R06, R07 (nothing dropped off canvas), **R08 (the proud pixels and domes must stay 8-connected to the plate)**, R09 (face re-measured after the head change), R11, R12, R14/R15, R18/R19 (rebuild and manifest `content` box). Not testable: whether the plate reads as "many small flowers" (owner eyes).

---

## #58 Hollow Joe-Pye Weed (*Eutrochium fistulosum*)

### (a) What the real plant shows

- **Flowers.** Large terminal **dome-shaped compound** arrays (12-18 in. wide, MBG; "convex to rounded (dome-shaped)" FNA), made of many small heads of only **4-7 florets**, pale pink to dull **pinkish-purple**, vanilla-scented; the thread-like styles protrude, making the clusters look furry (MDC). Seed heads are fluffy and persist into winter. - FNA (`floranorthamerica.org/Eutrochium_fistulosum`), MBG (`taxonid=257404`), MDC (`.../joe-pye-weeds`), Mt. Cuba (`mtcubacenter.org/plants/hollow-stem-joe-pye-weed/`), NC.
- **Leaves.** In **whorls of 4-7 (often 6)** at each node; lance-shaped, 8-12 in. long, dark green, coarsely/finely serrate, pinnately veined. - FNA, MBG, NC, MDC.
- **Stem and habit.** Tall (4-9 ft), stout; stem **hollow**, usually evenly dark purple to pale purplish-white, **glaucous** (whitish waxy bloom), usually not spotted. - FNA, MBG, NC, MDC, PA (`paenflowered.org/.../eutrochium-fistulosum`).
- **Separates it from lookalikes.** From spotted Joe-Pye (*E. maculatum*): larger whorls (4-7 vs 4-5), hollow evenly-purple glaucous stem vs mottled solid stem, **dome vs flat-topped** cluster (MDC, MBG). From sweet Joe-Pye (*E. purpureum*): stem only dark at nodes and rarely hollow, 3-4 leaves per whorl (MDC). From boneset: pink-purple flowers, whorled leaves (MDC).

### (b) What the current set shows

Adult: a 27x13 pink scalloped cloud (`_umbel`, `lobes=10`, `amp=0.16`, `face_rx=0`) sitting as a brim over a pale cool-green egg-shaped body that carries the face (`_body`), a short hollow-cored stem (`STEM`, pale `h` core), and **two** thin horizontal side leaves; floret dots `FLORET_DOTS`. At 1x it reads as **pink cotton-candy over an egg**; the cluster has no sub-structure, the colour is candy pink (`w` 232,170,214) rather than dull pinkish-purple, and the leaves are a single pair, so "whorls" and "tall plant" are not visible. Growing: a grey-purple flat lump hovers over the body (`BUD_UMBEL`, flat top). Sprout: pale body with side leaves. QA: passes with WARN **R06** (sprout/growing end 2 rows off the adult's ground line), **R10** (palette overrides `F`, `W`, `c`; `W` doubles as floret highlight and eye glint), **R11** (foliage hue 153 is within 1.9 deg of shipped *Prunella vulgaris* with near-equal saturation and lightness), R16.
Source-hygiene note: the module still carries yarrow-derived names (`FROND_*`, "millefolium", "feathery") in comments and part names; the brief to the art lane should say these are leftovers, not intent.

### (c) Proposed change per stage

| Stage | Change |
|---|---|
| Adult | **Cluster:** rebuild the umbel as a **convex dome** (narrower top, widest about 60% down) made of **4-5 rounded sub-clusters** separated by 1-px dark-pink `V` seams, with a few 1-px pale `W`-substitute pixels standing proud of the rim for the protruding styles. Keep roughly 27x13 but let the dome be about 2 rows taller; hand-built rows, as for the bud. **Colour:** move floret mid/deep from candy pink toward dusty mauve (hue near 300-315 deg, lower saturation, lighter highlight), keeping the 0.85 saturation ceiling. **Leaves:** draw a visible **whorl tier**: two tiers of leaves at one node level (2 left + 2 right at slightly staggered heights, the lower pair longer), narrower and longer than now, plus a smaller tier above. **Stem:** purple-tinted with a pale glaucous highlight stripe; keep the pale hollow core hint at the base. Face stays on the body below the dome (the existing, correct choice: a dome of tiny florets cannot carry eyes). |
| Growing | **Domed** bud (not flat): three or four tight grey-purple buttons rising to a dome, `BUD_PALETTE` retained. The current `BUD_UMBEL` flat top comes from the boneset/yarrow lineage and is the wrong profile for this species (FNA: dome-shaped). Leaves: one whorl tier. |
| Sprout | Vegetative: a **small whorl** (3-4 short leaves around a node, two visible each side), no cluster, no purple. |
| Ground line | Anchor the stem's lowest row to the adult's lowest row at every stage (clears the R06 WARN). |
| Gesture | **KNOCKING stays** (taps its own hollow stalk, listens, nods); it puns on the epithet and implies no use. |
| Palette / hue | Restore the shared `F`/`c` face colours and give the floret highlight its own character so the eye glint `W` stays white (clears R10 for the right reason, or the source must say the departure is deliberate). Move foliage off hue 153 toward the blue-green end (about 165-175 deg, a little darker) to stop twinning *Prunella*; the deck spans yellow-green to blue-green, so this is in range. |

### (d) Risks and checker

- **Boneset (#57) and yarrow:** both are tall with a cluster over a face. Separation is colour, dome vs plate, whorled tiers vs a fused collar. Joe-Pye vs **sweet** Joe-Pye is not a sprite concern: there is no sweet Joe-Pye card.
- **Medicinal implication:** the card prints urinary/kidney/skin traits; the sprite must show none (no kidney, no poultice, no dye bath). KNOCKING is on the plant's own stalk.
- **Hollow stem accuracy:** the pale core is an abstraction of "hollow"; do not draw a cut-open cross-section, which would imply a plant part being harvested.
- **Checker will test:** R05 (the taller dome and new whorl change adult ink height: re-measure 0.60/0.80), **R06 (should go PASS)**, R08 (whorl leaves must connect to the stem), R09, **R10 (should go PASS)**, **R11 (foliage move should clear the twin warning; re-measure)**, R12 (a wider whorl must still fit `FRAME_FILL` 0.74), R13-R15, R18/R19. Not testable: whether the dome reads as a Joe-Pye head rather than a bush or cloud.

---

## #59 New Jersey Tea (*Ceanothus americanus*)

### (a) What the real plant shows

- **Flowers.** Tiny white (cream) flowers, 1/4-3/8 in. across, five spoon- or hatchet-shaped petals on slender bases with five protruding stamens (sometimes dark-tipped), in **dense, compound clusters: "dense, rounded to cylindrical clusters 1 to 3 inches long ... elongated, compound, made up of smaller clusters ... each with about 10 to 14 flowers"** (MW). FNA: inflorescences "paniclelike, cylindric to conic, 3-14 cm," terminal or axillary. They arise on **long naked stalks from the upper leaf axils**; USDA: "elongated and rounded." MDC: "reminiscent of tiny lilac clusters." - MW, FNA (`floranorthamerica.org/Ceanothus_americanus`), USDA, MDC, NC (`.../ceanothus-americanus/`), PA.
- **Leaves.** Alternate, broadly ovate to oblong-ovate, 1-3 in., **three prominent veins from the base**, finely serrate, pointed tip, wrinkled/veiny, dull dark green above, paler and hairy beneath. - MW, FNA, USDA, NC.
- **Habit.** A low (1-3 ft), much-branched shrub, woody base with herbaceous upper branches, red taproot. - MW, MDC, USDA.
- **Separates it from lookalikes.** From *C. herbaceus* (narrow-leaved NJ tea): narrower elliptic leaves, **short peduncles and globose to hemispheric (round, flat-topped, smaller) clusters**, earlier bloom (FNA; MW; MDC). In other words the *current* round pom-pom look is closer to *C. herbaceus* than to *C. americanus*.

### (b) What the current set shows

Adult: **three separate 5x5 pom-poms** (`POM`, cool-white `W/M/D/S`) on thin stalks that converge to a join above the head (`CENTRES` 4/11/18, `TOPS` 3/0/3, `JOIN` (11,12)), a round leafy body carrying the face, two broad ovals with a single vein (`LEAF_L/R`) placed symmetrically. At 1x: three white dots on strings, the isolated-round-flower reading the owner flagged; leaves read as lily pads at the feet. Growing: three green bud dots (`BUD_POM`, `BUD_TOPS`) on shorter stalks. Sprout: a taller leafy body and two seed leaves, crown hidden. QA: passes; R11 SKIP (leaf and flower hue not readable), so the 34-deg floor is unmeasured.

### (c) Proposed change per stage

| Stage | Change |
|---|---|
| Adult | **Replace each pom-pom with an elongated, dense cluster** about 5-6 px wide and 7-9 px tall (rounded cone/ovoid, widest below the middle), built from a regular grid of 2x2 floret blobs (`W/M` lit, 1-px cool `D/S` seams between them), with 2-3 tiny `S` pixels at the rim for the dark-tipped stamens. Keep **three** clusters (the gesture needs them) but bring them **close and overlapping at their lower rows** (`CENTRES` about 5/11/17, join unchanged) so the crown reads as **one compound panicle of clusters**, centre tallest. Stalks stay long, thin and naked (they are, per MW/USDA). Keep the crown one part with `w1`-`w4` variants. **Leaves:** make them **alternate** (left leaf about 1-2 px higher than the right, not mirror-image), add **three veins** (midrib plus two curved from the base, `v`), a notched/serrate lower edge, and slightly darker upper tone; they remain the creature's feet. Face on the round leafy body, unchanged. |
| Growing | The same cluster geometry as **green-cream buds** (`BUD_PALETTE`), shorter and tighter, on shorter stalks (`BUD_TOPS` lower). |
| Sprout | Vegetative only, crown hidden (unchanged): alternate ovate seed leaves with the 3-vein hint. |
| Gesture | **THE RIPPLE stays** (cluster-by-cluster wave along the crown, `w1`-`w4`); rebuild the four wave variants from the new cluster geometry so each lifts one cluster. It moves flowers only; it never suggests a drink or an effect (the card prints a Tea icon; none is drawn). |
| Hue | Keep the leaf near 110 deg and flowers cool white; since R11 SKIPs here, add `# leaf light` / `# flower` palette comments so the checker can read the roles. |

### (d) Risks and checker

- **Lookalikes:** boneset (cream cloud, warm) and mountain mint (white clusters): NJ Tea must stay **cool white, conical clusters on long naked stalks over broad three-veined leaves**. Do not let the elongated clusters read as cattail or lilac (a conical white cluster is the plant's own description).
- **Medicinal/use:** the card prints tea/gargle/astringent traits; no steaming cup, leaf-brew or throat cue; the gesture is flowers only.
- **Stage height:** the existing growing ratio (0.76) sits 0.03 from its limit, and taller clusters shift the adult's ink height, so re-measure; this is the likeliest R05 failure.
- **Checker will test:** R05, R07 (taller clusters near the top edge: nothing may clip at rest), **R08 (overlapping clusters and stalks must stay one piece with the body)**, R09, R11 (will read if comments are added), R12, R13-R15, R18/R19. Not testable: the "dense panicle" read.

---

## #60 Black-Eyed Susan (*Rudbeckia hirta*): the style reference

### (a) What the real plant shows

- **Flower head.** Single heads (to 3-4 in.) with **8-21 slender yellow-to-orange-yellow rays** (MDC 8-21; NM wildflowers 8-13; NC 10-20; NY Flora newsletter 8-30, often 10-14), sometimes darker at the base, around a **domed, dark brown to purple-brown disc** that becomes egg-shaped. Rays spread, not drooping. - MBG (`taxonid=277225`), MDC (`.../black-eyed-susan`), NC (`.../rudbeckia-hirta/`), Wildflowers of New Mexico (`npsnm.org/wildflowersnm/Rudbeckia_hirta.html`), NY Flora Association newsletter, Vol. 13 no. 1.
- **Leaves and stem.** Lance-shaped to oval, alternate, rough with stiff bristles, mostly unlobed, sometimes toothed; stem grooved, bristly, little-branched, 1-3 ft (the epithet *hirta* = hairy). - MBG, MDC, NC.
- **Separates it from lookalikes.** NM wildflowers: prairie coneflower (*Ratibida*) has drooping rays and a tall cylindrical cone; sunflowers (*Helianthus*) lack the domed protruding disc. Against the deck's own coneflower (a pink-rayed *Echinacea*): the deck sprite documents pink rays and an orange cone; an *Echinacea* flora comparison was **NOT FETCHED** in this pass.

### (b) What the current set shows

Adult: 13 narrow golden rays (`_mane`, `lobes=11`, `amp=0.24`, four rotating phases), a dark domed cone carrying the face (`cone`, seated low via `face_dy`), a few bristle `spines`, two lance leaves and a stem. It matches the sources: dark domed disc, golden spreading rays, hairy stem and lance leaves. The read at 1x is a daisy with a dark eye, distinct from the deck's pink coneflower by palette and ray count. Growing: a gold fringe starting over the face; sprout: green ring body with leaves. QA: passes; WARN R11 (mid-lightness ray colour `r` above 0.85 saturation) and R16 (negated docstring lines), fps 4/6/7 with sprout on the floor of 4.

### (c) Proposed change

**None to the art.** Per the owner's note this set is the reference. Recommendations are about *using* it:

- Record what is being preserved so the other four are brought up to its standard: **one organ is the face-carrier, a second organ is layered under or over it (ray ring + domed disc), two clearly separated hue families (gold ~45 deg vs near-black disc ~25 deg, leaves ~100 deg), real-world features shown at sprite scale (bristle spines, domed disc, lance leaves).**
- R11 WARN: leave the colour as is and accept the WARN, or, only if the owner wants the checker clean, drop `r` just under 0.85 saturation in a *separate* approved revision; any recolour of the reference is the owner's call, and the golden petals must stay golden.
- Stage organs already correct (sprout no flower, growing in bud). No change proposed to sprout fps 4 (floor).

### (d) Risks and checker

- **Coneflower sibling** (same genus family look): already separated by palette and ray count; the scanner/species identity risk is a card matter, not a sprite matter.
- **Medicinal implication:** the card prints wound/skin/fever traits; the PINWHEEL gesture is rays spinning, nothing flung, nothing healed.
- **If it is touched at all later, the checker re-tests** R11/R12 and R18/R19; leaving it untouched, the existing QA result stands.

---

## #61 Narrowleaf Mountain Mint (*Pycnanthemum tenuifolium*)

### (a) What the real plant shows

- **Leaves.** Many, **opposite, linear, almost needle-like**, stalkless, smooth edges, **commonly 1-2 in. long (to 3 in.) and very narrow**; the width is stated differently by two sources (MDC: not more than 1/4 in.; plantnative.org: about 1/8 in. or less; Izel: about 1/4 in. at most), so the sprite should not imply a number. Crowded along the stems, giving a fine, airy, needle-like texture. - MDC (`.../slender-mountain-mint`), PA (`.../pycnanthemum-tenuifolium`), NC, plantnative (`plantnative.org/native-plants/narrowleaf-mountainmint-pycnanthemum-tenuifolium.htm`, published 2026-11-15), Izel (`izelplants.com/pycnanthemum-tenuifolium-narrowleaf-mountainmint/`), plantref.
- **Stems and habit.** Square, slender, stiffly erect, **much-branched in the upper half**, bushy clump 1-3 ft (to 4 ft, NC). Smooth, not the hair lines of *P. virginianum*. - PA, MDC, plantnative.
- **Flowers.** Tiny two-lipped flowers, white to pale lavender, **purple-spotted lower lip**, crowded into **small dense rounded heads about 1/2 in. across**, grouped into **flat-topped clusters at the branch ends** (clusters can exceed 3 in. across, Izel), with **light-green triangular, pointed bracts** peeking out below (Izel; MDC: "long nearly linear bracts below the heads"; plantref: "pale, whitened upper bracts"). - MDC, PA, plantnative, Izel, plantref, NC.
- **Separates it from lookalikes.** MDC: *P. pilosum* is hairier with wider, underside-haired leaves; *P. virginianum* has hairy stem angles and leaves wider than 1/4 in. plantnative: Virginia mountain mint has wider lance-shaped leaves, silverleaf mountain mint has much broader silvery upper leaves. Narrowleaf is the one with thread-like foliage.

### (b) What the current set shows

Adult: a pale round face-ball (`BALL`, 15x14) ringed by **10 radial 1-px needles** (`_needles(11.6, 10.0, count=10)`, tipped darker) like a hedgehog halo, and **three speckled white tufts** (`TUFT`) on the upward needles; the BRISTLE gesture snaps the needles outward (`NEEDLES_OUT`) and lifts the tufts (`TUFTS_UP`). At 1x it reads as a **sun, a dandelion seed-puff or a sea urchin**, not a plant: needles radiate from a face with no stem or branching, they are not visibly *leaves in opposite pairs*, and the flowers are three tiny dots with no cluster. Growing: face-ball with shorter needles and three green bud tufts; sprout: tiny face with a short ring. QA: passes; WARN R06 (growing stage 2 rows off), R15 (variant name `out` shared with shipped *Galium aparine* and *Monarda fistulosa*), R11 SKIP.

### (c) Proposed change per stage

| Stage | Change |
|---|---|
| Adult | **Replace the radial halo with an upright, branched habit built from opposite needle pairs.** A central stem rises under the face-ball; on it, 3 tiers of **opposite needle pairs** (each needle 1 px wide, 5-7 px long, angled about 45 deg up-and-out, darker tip `d`, one tier shorter than the next going up). The face-ball (`BALL`, `BALL_AT`, feature placement from `face_box`) stays as the creature's head. Add 2-3 additional needles angling up beside the ball so the silhouette is a narrow bushy upright, not a ring. **Flower clusters:** replace the three isolated tufts with a **flat-topped cluster of 4-5 small rounded heads across the top** sharing a base (each ~3x3, pale `H/M`, a `p` purple speck on 1-2 of them), with **1-px pale-green triangular bracts** under the cluster, connected to the stem by short branches. Everything is 4-connected so frame 0 stays one piece. |
| Growing | Same structure, **two tiers**, shorter needles, and the cluster as **green-cream buds** (`BUD_TUFT`/`BUD_PALETTE`), flat top retained. |
| Sprout | A short stem with **one or two needle pairs** and the small face-ball (`YOUNG`); no flower structure and no purple. A seedling that shows paired needles is recognisable *as* this plant. |
| Ground line | Fix the stem's base row to the adult's lowest ink at every stage (clears the R06 WARN). |
| Gesture | **THE BRISTLE stays**: on the beat the needle pairs rotate from up-and-out to horizontal and the cluster lifts; rename the variant `out` -> `flare` (and `up` -> `lift`) to take the choreography vocabulary out of the Galium/Monarda overlap (clears the R15 WARN in a cheap, honest way). It is posture only: no scent lines, no steam, no cooling effect. |
| Hue | Needles about 75 deg olive-green with the flowers near-white: add `# leaf` / `# flower` palette comments so R11 can read them; keep the purple speck at about 285 deg. |

### (d) Risks and checker

- **Mentha (deck mint):** the shipped mint sprite and this card are both mints; the pair must not look like palette swaps. Separation: needle-pair bush with flat flower plate vs the deck mint's ice gesture and leaves. Aroma, tea and "cooling" cues are explicitly out (the card prints digestive/breath/decongestant traits).
- **Yarrow and boneset:** a flat white plate over fine foliage is yarrow's description. Mitigation: the plate is **4-5 distinct small domes with purple specks**, and the leaves are single-pixel straight needles in opposite pairs, not feathery fronds.
- **Width cap:** more width than the current ring risks the avatar badge: re-check R12 at `FRAME_FILL` 0.74 (the growing stage at ratio 0.833 is also 0.03 from the height limit).
- **Checker will test:** R05, R06 (should go PASS), **R08 (every needle and head must attach to the stem or the ball)**, R09, R11 (readable after comments), R12, R13, **R15 (should go PASS after the rename)**, R16, R18/R19. Not testable: whether the needle pairs read as leaves rather than spikes.

---

## Cross-card notes for the approver

1. **Recognisability ladder.** Five species now share "white or pale cluster over a face" (boneset, NJ tea, mountain mint) or "pale/pink cluster" (Joe-Pye) with three of them near-white. The proposals separate them by **silhouette first** (flat plate + fused collar; dome + whorl tiers; elongated clusters on long stalks; bushy needle pairs + flat plate), colour second. Please judge them side by side at 1x in the Garden-sized tile, with yarrow and the deck's coneflower beside them.
2. **Shared pattern.** Boneset and mountain mint both gain "a flat plate of small domes"; the proposals keep them distinct by plate scale (wide and low vs small and on branch tips) and by what sits under it (fused collar vs needle tiers). If the owner finds them too alike, drop the domed row from mountain mint (keep the purple-speckled tufts) rather than from boneset.
3. **Palette hygiene.** The only palette-level changes proposed are Joe-Pye's (restore shared face colours, move foliage hue) and comments for R11 readability on #59 and #61. The five `FACE_PALETTE` colours are not touched anywhere.
4. **No invented botany.** Every drawn feature above is tied to a cited description; where the cited sources disagree (floret count, leaf width, ray count) the sprite is told not to imply a number.
5. **Sequence if approved.** Owner approves a section -> the art lane edits only that species' module -> `build_sprites.py --preview` for review -> rebuild -> `check_sprite_set.py` and `audit_sprites.py` (never together with `npm test`) -> owner approval of the art. This document triggers none of those steps.

## Open questions for the owner

- #57: flat plate of 5-6 domes acceptable, or keep the fluffier cloud and only reduce the spikiness?
- #58: shift to dusty mauve acceptable, given the current candy pink is the part that reads as "cute"?
- #59: keep exactly three clusters (gesture-preserving), or let the crown become one wider panicle with the wave moving along it?
- #60: confirm "no change" (and accept R11 WARN).
- #61: accept a stem-and-pairs construction replacing the starburst, accepting the BRISTLE is re-staged (needle pairs flare, not a full-ring snap)?
