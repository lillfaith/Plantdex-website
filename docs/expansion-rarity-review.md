# Expansion rarity review (#57-91) - RETRACTED

**Rarity tiers come from the owner's master sheet and nothing else.** This review was run on request, concluded the printed deck
follows no rule that observation counts could check, and then wrongly changed one tier (#84 Slippery Elm, Common -> Uncommon) on
Claude's own judgement. That was inventing a rarity. It has been reverted: every expansion card carries exactly the tier and XP in
`PlantDex_85_ALL_Corrections_Claude_Master.xlsx`, which is what the importer already cross-checks.

What remains is read-only evidence: `evidence/rarity/result.json` (research-grade iNaturalist observation counts for the printed deck
and #57-91, produced by the `rarity-audit` workflow). It informs nothing and changes no card. Rule going forward: do not alter
rarity, XP or any other sheet value without the owner naming the value.
