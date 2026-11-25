# Expansion pilot plan: five digital-only cards (DRAFT for owner approval)

Status: PLAN ONLY. Nothing is imported, enabled, published or deployed. Built from the two read-only audits (`docs/expansion/audit/`, PRs #57 and #58).
Owner decisions of 2026-11-25 applied: digital-only first; no change to approved artwork or card bases; unresolved safety/identification cards held from
public release; regions are not a prerequisite; sprites for #57-61 are NOT treated as approved; production untouched; restricted flags off.

## 1. Pilot cards (varied on purpose)
| # | Card | Why it is in the pilot | What it exercises |
|---|---|---|---|
| 57 | Boneset (*Eupatorium perfoliatum*) | Main image, icon and sprite all recorded as approved; caution cites pyrrolizidine alkaloids | The HELD path: a card whose safety review is unresolved must stay out of public release; sourced caution rendering |
| 60 | Black-Eyed Susan (*Rudbeckia hirta*) | Approved image, icon and sprite; shares its genus with an existing card | Scanner sibling-species matching (exact must win; no genus claim); sprite integration |
| 67 | Curly Dock (*Rumex crispus*) | Card art approved; no sprite; today an explicit tested refusal | The identification-refusal case, the missing-sprite state, same genus as two printed cards |
| 68 | Narrowleaf Plantain (*Plantago lanceolata*) | Card art approved; no sprite; shares genus with Plantago major | Same-genus sibling matching; missing-sprite state |
| 80 | White Clover (*Trifolium repens*) | Main image is an AI derivative flagged "botanical review required" | The image-provenance HOLD; sibling of *Trifolium pratense* |

No expansion card is genus-level (all 85 are binomials; the nine `spp.` cards are the ORIGINAL #17, 18, 20, 31, 37, 38, 41, 42, 45), and none shares a genus with them.
Genus-level handling is therefore tested on the existing cards and by checking that none of the five can be claimed by a `spp.` card.

## 2. What the pilot proves (acceptance gates)
1. A validated record becomes a complete catalogue entry by script, with stable id and number, and every generated file reproducible byte-for-byte.
2. Identify, Herbalism, Challenges and Progress render with only sourced content; a field with no source renders as absent, never invented.
3. Existing collections and player data are unchanged (no renumbering, no denominators moved, no XP change).
4. Scan to card: exact binomial resolves to the new card; hybrids and relatives never auto-resolve (see section 4).
5. Garden/profile: a defined missing-sprite state for cards without an approved sprite set.
6. Mobile performance measured on the built export (390px).
7. Automated botanical QA gates: a card is HELD unless source, safety review, image provenance and taxon identity checks all pass.

## 3. Collection id: no existing id fits, which needs a decision
The audit found two existing ids and neither is right: `collection-01` is the PHYSICAL 45-card deck (its tests forbid implying a second printed collection, and the shop and `/start`
count it), so a digital card there is labelled part of the box; and `field-cards` is the XP-unlocked ladder with its own unlock rules. A digital-only card that declares no
`collectionId` silently becomes part of `collection-01`. Recommendation: the browsing experience stays ONE Herbdex, and the cards declare a new DIGITAL collection id (the
Field Cards are the precedent; `PRINTED_COLLECTIONS` stays at one). The name is the owner's.

## 4. Scanner safety (Rumex crispus and relatives)
`Rumex crispus` is refused today because the deck's two *Rumex* cards share a genus and genus-wide matching would make every dock claimable as either. Once #67 exists, an
exact *R. crispus* answer can resolve to it, but the two docks hybridise and the provider already returns hybrids (*Rumex x acutus* scored 0.33 beside *R. obtusifolius*).
Rule for the pilot: exact binomial and checked synonyms only; hybrids, `sameGenus` and `listed` ranks never confirm; the standing refusal test is rewritten to say exactly that,
not deleted. Verified against the committed live-capture fixtures before any code ships.

## 5. What a digital-only card does today, and what it will NOT do without a decision
By the Field Card precedent a digital-only card pays 0 XP, has no mastery track and no knowledge check, and is not in the Garden or in habitat/region lists. So its Challenges and
Progress tabs show what the Field Card tabs show. Giving the expansion cards mastery, XP or Garden growth is a progression change and needs the owner. The pilot does not do it.
Also: the Field Board's database function `is_catalogue_herb` is a hard-coded list of 54 ids (migration 0013), so a discovery of a new card is REFUSED by the database until a new
reviewed migration lists it. That is a schema change and needs the owner; until then pilot cards are readable and scannable but cannot be recorded as server discoveries.

## 6. Work split (adapted to the ownership manifest)
| Role | Branch prefix | First task | Output | Gate |
|---|---|---|---|---|
| Catalog integration | `coord/` | Importer and validator: draft record to gated catalogue entry; id/number/hash/provenance checks; reproducible; flag OFF | script, tests, `docs/expansion/pilot/` | PR; owner approves import |
| Botanical research | `coord/` (research env) | The five cards: sourced identification features, lookalikes, cautions, taxon identity (WCVP), Rumex analysis | proposals with citations, uncertainty labelled | owner/botanist review; nothing published unsourced |
| Sprite and asset QA | `coord/` | Sprite specification and automated checker (dimensions, frame counts, ground line, palette); run on the five existing sets; contact sheet | spec, checker, report | owner approves any sprite; no art generated |
| Coordinator | `coord/` | Flags, schema/collection decisions, reviews, releases | PRs, task board | owner approves activation |

## 7. After the pilot
If the gates pass, batch the remaining 80 by readiness (assets approved, caution sourced, taxon verified), a few per PR, each behind the same flag, with the same validator as the gate.
Printed production, shop listings, regions and new scoring stay separate owner decisions.
