/**
 * CHECKED-IN EVIDENCE BEHIND EVERY GENUS-CARD EXCLUSION.
 *
 * TWO KINDS, and they are not the same argument. A TAXONOMIC exclusion says the name is not
 * really in this genus any more (`VERIFIED_PLACEMENTS`). A CONTENT exclusion says it is
 * genuinely in the genus and the CARD'S OWN CLAIMS do not hold for it
 * (`CONTENT_EXCLUSIONS`) — which no backbone can answer and no amount of taxonomy will
 * settle. Keeping them apart is what stops a safety judgement being mistaken for a lookup.
 *
 * `taxon-placements.test.ts` requires every excluded name to appear in exactly one of them,
 * so an exclusion with no recorded reason cannot exist.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS IS FOR. A `Genus spp.` card accepts any name whose FIRST WORD normalises to its
 * genus, because that is what `genusOf()` reads. A plant moved OUT of the genus therefore
 * still reaches the card under its historical combination — while its CURRENT name, being in
 * the new genus, matches nothing. The hazard exists only under the old name, so it is
 * invisible unless somebody goes looking, which is what this table is.
 *
 * IT IS EVIDENCE, NOT RUNTIME DATA. Nothing in the app imports it: the exclusions themselves
 * are written out explicitly in `card-coverage.ts`, where a reader of the scope can see them.
 * This table exists so `taxon-placements.test.ts` can assert that every verified out-of-genus
 * name IS excluded — the guard that stops the next such name being found by a player instead
 * of by CI. `card-coverage.test.ts` fails if a production module imports it.
 *
 * DELIBERATELY NOT A LIVE LOOKUP. Querying GBIF at build or run time would make a deploy
 * depend on somebody else's uptime and let a backbone revision silently change what unlocks a
 * card. The answers are fetched once, by a human, and reviewed in a diff.
 *
 * HOW TO ADD A ROW. Run the resolver from CI — the backbone is not reachable from the sandbox
 * this repo is edited in:
 *
 *     gh workflow run resolve-taxa.yml -f names="Rhus vernix; Morus papyrifera"
 *
 * and copy what it prints. NEVER fill one in from memory: a Pine case was proposed here and
 * WITHDRAWN when GBIF reported `Pinus abies`, `P. larix` and `P. picea` as accepted *Pinus*
 * homonyms rather than as names for spruce, larch and silver fir. The whole value of this
 * file is that every row was asked rather than recalled.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── TAXONOMIC: the name's accepted placement has left the genus ──────────────────────── */

/** One name, resolved against a backbone, with enough provenance to re-check it. */
export interface VerifiedPlacement {
  /** The historical combination exactly as an identification provider might return it. */
  readonly name: string;
  /** The genus it was queried under — the one whose card it would otherwise reach. */
  readonly queriedGenus: string;
  /** The genus of its ACCEPTED name today. Out-of-genus is the whole point of a row. */
  readonly acceptedGenus: string;
  /** The accepted name, or the genus where the bare string resolves no further. */
  readonly acceptedName: string;
  /** What the plant is, in words, so a reader needs no botany to judge the row. */
  readonly means: string;
  /** Why it matters for the card it would reach. Not a safety determination. */
  readonly concern: string;
  readonly source: string;
  /** When it was asked. A backbone moves; a row with no date cannot be aged. */
  readonly checkedOn: string;
}

export const VERIFIED_PLACEMENTS: readonly VerifiedPlacement[] = [
  {
    name: 'Rhus vernix',
    queriedGenus: 'rhus',
    acceptedGenus: 'toxicodendron',
    acceptedName: 'Toxicodendron Mill.',
    means: 'poison sumac',
    concern:
      'Card #20 lists Berry and Bark as usable and prints no warning. Contact with ' +
      'Toxicodendron causes urushiol dermatitis.',
    source: 'https://api.gbif.org/v1/species/match?name=Rhus%20vernix',
    checkedOn: '2026-10-01',
  },
  {
    name: 'Rhus radicans',
    queriedGenus: 'rhus',
    acceptedGenus: 'toxicodendron',
    acceptedName: 'Toxicodendron radicans subsp. radicans',
    means: 'poison ivy',
    concern: 'As above — Card #20 lists Berry and Bark as usable.',
    source: 'https://api.gbif.org/v1/species/match?name=Rhus%20radicans',
    checkedOn: '2026-10-01',
  },
  {
    name: 'Rhus toxicodendron',
    queriedGenus: 'rhus',
    acceptedGenus: 'toxicodendron',
    acceptedName: 'Toxicodendron Mill.',
    means: 'eastern poison oak',
    concern: 'As above — Card #20 lists Berry and Bark as usable.',
    source: 'https://api.gbif.org/v1/species/match?name=Rhus%20toxicodendron',
    checkedOn: '2026-10-01',
  },
  {
    name: 'Rhus diversiloba',
    queriedGenus: 'rhus',
    acceptedGenus: 'toxicodendron',
    acceptedName: 'Toxicodendron diversilobum (Torr. & A.Gray) Greene',
    means: 'western poison oak',
    concern: 'As above — Card #20 lists Berry and Bark as usable.',
    source: 'https://api.gbif.org/v1/species/match?name=Rhus%20diversiloba',
    checkedOn: '2026-10-01',
  },
  {
    name: 'Rhus rydbergii',
    queriedGenus: 'rhus',
    acceptedGenus: 'toxicodendron',
    acceptedName: 'Toxicodendron rydbergii (Small ex Rydb.) Greene',
    means: 'western poison ivy',
    concern: 'As above — Card #20 lists Berry and Bark as usable.',
    source: 'https://api.gbif.org/v1/species/match?name=Rhus%20rydbergii',
    checkedOn: '2026-10-01',
  },
  {
    name: 'Morus papyrifera',
    queriedGenus: 'morus',
    acceptedGenus: 'broussonetia',
    acceptedName: "Broussonetia papyrifera (L.) L'Hér. ex Vent.",
    means: 'paper mulberry',
    concern:
      'Not a poisoning risk. Card #42 is about a different plant, and lists Fruit, Leaf ' +
      'and Bark.',
    source: 'https://api.gbif.org/v1/species/match?name=Morus%20papyrifera',
    checkedOn: '2026-10-01',
  },
  {
    name: 'Quercus densiflora',
    queriedGenus: 'quercus',
    acceptedGenus: 'notholithocarpus',
    acceptedName: 'Notholithocarpus densiflorus (Hook. & Arn.) Manos, Cannon & S.H.Oh',
    means: 'tanoak',
    concern:
      'Not a poisoning risk. Card #45 is about a different plant, and lists Bark, Nut ' +
      'and Leaf.',
    source: 'https://api.gbif.org/v1/species/match?name=Quercus%20densiflora',
    checkedOn: '2026-10-01',
  },
];

/**
 * Rows whose accepted placement really is outside the genus they would be matched under.
 *
 * A row where the two agree is not a mistake and is not deleted — it is a name somebody
 * checked and cleared, and keeping it is what stops the same name being re-proposed. Only
 * these need excluding.
 */
export function outOfGenusPlacements(): readonly VerifiedPlacement[] {
  return VERIFIED_PLACEMENTS.filter((one) => one.acceptedGenus !== one.queriedGenus);
}

/* ── CONTENT: in the genus, but the card's own claims do not hold ─────────────────────── */

/**
 * A species that really is in the card's genus and is excluded anyway, because the card's
 * printed content would materially mislead whoever found it.
 *
 * THIS IS A JUDGEMENT, NOT A LOOKUP, and the fields say so: it records which of the card's
 * own claims fail and what the evidence was, rather than a backbone's verdict. Human and
 * animal evidence are separate fields because conflating them is the specific error available
 * here — a toxicity established in cattle is not a human claim, and a species is not excluded
 * on one.
 */
export interface ContentExclusion {
  readonly name: string;
  readonly cardId: string;
  /** Which printed claims fail for this species. The card's own words, not a paraphrase. */
  readonly failingClaims: readonly string[];
  /** What is established in humans. Empty means nothing is, and that must be said. */
  readonly humanEvidence: string;
  /** What is established only in other animals, named. */
  readonly animalEvidence: string;
  /** Why a caution could not carry it, since a caution is the cheaper answer. */
  readonly whyNotACaution: string;
  readonly source: string;
  readonly checkedOn: string;
}

export const CONTENT_EXCLUSIONS: readonly ContentExclusion[] = [
  {
    name: 'Sambucus ebulus',
    cardId: 'sambucus-spp',
    failingClaims: [
      'usable part: Berry',
      'preparation: Cold soak',
      'trait: Antiviral / Immune boost / Respiratory support / Fever aid',
    ],
    humanEvidence:
      'A peer-reviewed review states its usefulness as food is RESTRICTED by its toxicity. ' +
      'All parts carry ribosome-inactivating proteins with lectin activity (ebulin) plus a ' +
      'cyanogenic glycoside; high-dose fruit consumption induces vomitory toxicity, ' +
      'especially in children, and it appears in paediatric acute-plant-exposure casework. ' +
      'The documented mitigation is COOKING.',
    animalEvidence: 'Not the basis for this exclusion; the human evidence stands on its own.',
    whyNotACaution:
      'Two independent failures, and the first is that the card names a method which ' +
      'DEFEATS the only documented mitigation: `Cold soak` is uncooked, and heat is what ' +
      'removes the lectin risk. The second is that the four printed traits are the ' +
      'S. nigra / S. canadensis profile — a different medicinal tradition — so a player ' +
      'handed this card is not reading a card with a gap in it, they are reading a card ' +
      'about another plant.',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5871274/',
    checkedOn: '2026-10-01',
  },
];
