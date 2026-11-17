# Expansion rarity review (#57-91)

Requested by the owner: check that the tiers on the cards made so far are accurate, and revise any that are not.

## What the data says (and does not say)

`evidence/rarity/result.json` holds research-grade iNaturalist observation counts for the 45 printed cards (as a calibration set)
and for expansion cards #57-91 (workflow `rarity-audit`, read-only). Counts track how many people photograph a species, so they
are a proxy for how often a player is likely to meet it - a signal, not an authority.

**The printed deck does not follow observation counts.** Median US count by tier: Common 34,152; Uncommon 23,310; Rare 67,816;
Epic 37,148 (Lactuca serriola, Epic, has 28k; Dandelion, Common, 61k; Viola sororia, Common, has 317). So the deck's tiers are an
editorial blend (conspicuousness, how special a find feels, habitat), and no count threshold can be applied to the new cards without
making them follow a rule the deck itself does not. That is why this review did NOT re-tier by counts.

## What was changed

Only a card whose own record contradicts its tier:

| Card | Was | Now | Why |
|---|---|---|---|
| #84 Slippery Elm | Common (100 XP) | Uncommon (175 XP) | Its rarity rationale reads "lower encounter certainty than some trees", which is not what Common means; and its count (3,364) is the lowest of all 35 expansion cards. |

Recorded as an owner-requested override in `expansion/text-overrides.json`; the master sheet and the imported record are untouched and
should be corrected to match.

## Borderline, left as the owner's sheet has them

Common cards with low observation counts: #58 Hollow Joe-Pye Weed (5,403), #71 New York Ironweed (5,457), #82 American Skullcap
(5,282), #59 New Jersey Tea (7,754), #66 Annual Fleabane (7,627), #61 Narrowleaf Mountain Mint (8,983). Uncommon cards with high
counts: #62 California Buckwheat (57,047). Their rationales do not contradict their tiers, and the deck has equally mixed cases, so they
are flagged, not changed.
