/**
 * THE SCOPE AUDIT — which of the four scope categories each identification-relevant card
 * belongs to, and, for every card, the exact claim-set a candidate species would have to
 * satisfy before it could be added.
 *
 * WHY IT IS GENERATED RATHER THAN WRITTEN. 54 cards times seven evidence criteria is 378
 * cells, and a hand-written audit of that goes stale the first time a card is reprinted or a
 * scope moves. Everything here is DERIVED from the deck data and `card-coverage.ts`, so it
 * re-states itself on every run and cannot drift from what the matcher actually does.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: decide anything. It cannot read a flora, a
 * pharmacopoeia or a taxonomic backbone, so it never proposes a species. It prints the
 * CHECKLIST — this card's traditional-use claims, its stated compounds, its usable parts,
 * its printed warning — because that checklist is what a human researcher needs in front of
 * them, and assembling it by hand per card is the step that gets skipped.
 *
 * It spends nothing and makes no network call.
 */
import { describe, expect, it } from 'vitest';

import { CATALOGUE, isPrintedCard } from '../src/lib/catalogue';
import { type CardScope, scopeFor } from '../src/lib/card-coverage';
import type { Herb } from '../src/lib/types';

/** The four categories the product rule names. `exact` is the default and the floor. */
type Category = 'exact' | 'curatedEquivalent' | 'complex' | 'genusCard' | 'unclassified';

const CATEGORY_LABEL: Record<Category, string> = {
  exact: '1. EXACT SPECIES',
  curatedEquivalent: '2. CURATED EQUIVALENT GROUP',
  complex: '3. TAXONOMIC / MEDICINAL COMPLEX',
  genusCard: '4. INTENTIONAL GENUS SPP.',
  unclassified: 'UNCLASSIFIED — fits no category and must not stay',
};

/**
 * Today's category for a card, read off the data rather than asserted.
 *
 * An `acceptedGroup` splits on the RANK of its members, and that split is the whole
 * difference between categories 2 and 3: a supra-specific member (a section, an aggregate)
 * means the broader botanical concept IS the card concept; a species-rank member means two
 * distinct accepted species were deliberately equated. A list holding both is neither, and
 * is reported as `mixed` so it cannot pass unnoticed.
 */
function categoryOf(scope: CardScope, declaredOnCard: boolean): Category | 'mixed' {
  if (scope.type === 'species') return 'exact';
  /*
   * A GENUS SCOPE IS ONLY CATEGORY 4 IF THE CARD SAYS SO ITSELF.
   *
   * This first read `genus -> genusCard` flat, which filed Goldenrod under INTENTIONAL
   * GENUS SPP. beside the nine cards that print `spp.` — and Goldenrod prints a binomial.
   * That is the precise shape the whole product rule exists to refuse: a card silently
   * behaving as though it declared something it never declared. A genus scope on a card
   * printing a binomial belongs to NO category, and is reported as such.
   */
  if (scope.type === 'genus') return declaredOnCard ? 'genusCard' : 'unclassified';
  const ranks = new Set(scope.accepted.map((one) => one.rank));
  const supra = [...ranks].some((one) =>
    ['genus', 'subgenus', 'section', 'subsection', 'series'].includes(one),
  );
  const specific = [...ranks].some((one) =>
    ['species', 'subspecies', 'variety', 'form'].includes(one),
  );
  if (supra && specific) return 'mixed';
  return supra ? 'complex' : 'curatedEquivalent';
}

/** Everything a candidate species would have to be checked against, taken off the card. */
function claimSet(herb: Herb) {
  const back = herb.back;
  return {
    traditionalUse: back?.healingTraits ?? [],
    compounds: back?.compounds ?? [],
    parts: back?.usableParts ?? [],
    preparations: back?.preparations ?? [],
    warning: herb.warning ?? '',
  };
}

const CARDS = CATALOGUE.map((herb) => {
  const declaredOnCard = /\bspp?\.?$/i.test(herb.scientificName.trim());
  // A Field Card has no printed scope: `card-coverage.ts` iterates the printed deck, so one
  // is reachable only by its own binomial. That is `exact` by construction rather than by
  // declaration, and saying so here is what stops a reader assuming it was classified.
  const scope = scopeFor(herb.id);
  return {
    herb,
    printed: isPrintedCard(herb),
    scope,
    category: scope ? categoryOf(scope, declaredOnCard) : ('exact' as const),
    declaredOnCard,
  };
});

describe('card scope audit', () => {
  it('groups every card by scope category instead of describing each one', () => {
    console.log('\n================================================================');
    console.log('SCOPE CATEGORIES — all 54 identification-relevant cards');
    console.log('================================================================');

    for (const category of [
      'exact',
      'curatedEquivalent',
      'complex',
      'genusCard',
      'unclassified',
    ] as const) {
      const mine = CARDS.filter((one) => one.category === category);
      console.log(`\n  ${CATEGORY_LABEL[category]} — ${mine.length} card(s)`);
      if (mine.length === 0) {
        console.log('    (none today)');
        continue;
      }
      // The spp. cards and the curated ones are few and each is a decision; the exact ones
      // are the default and are listed as ids only. That asymmetry is the point of grouping.
      if (category === 'exact') {
        console.log(`    ${mine.map((one) => one.herb.id).join(', ')}`);
      } else {
        for (const one of mine) {
          const extra =
            one.scope?.type === 'acceptedGroup'
              ? one.scope.accepted
                  .map((taxon) => `${taxon.scientificName} [${taxon.rank}]`)
                  .join('; ')
              : one.scope?.type === 'genus' && one.scope.pendingCuration
                ? 'GENUS-WIDE, pendingCuration'
                : `genus of ${one.herb.scientificName}`;
          console.log(`    #${one.herb.cardNumber} ${one.herb.id} — ${extra}`);
        }
      }
    }

    const mixed = CARDS.filter((one) => one.category === 'mixed');
    console.log(`\n  MIXED-RANK accepted groups (neither category 2 nor 3): ${mixed.length}`);
    for (const one of mixed) console.log(`    ${one.herb.id}`);

    expect(CARDS.length).toBeGreaterThan(0);
  });

  it('flags every card whose scope is broader than its own printed name', () => {
    console.log('\n----------------------------------------------------------------');
    console.log('SCOPE BROADER THAN THE PRINTED NAME');
    console.log('----------------------------------------------------------------');
    console.log('  A card printing `Genus spp.` says its own scope, so it is not listed here.');
    console.log('  Anything below is a card printing a BINOMIAL that accepts more than it.\n');

    const broadened = CARDS.filter(
      (one) => one.printed && one.scope?.type !== 'species' && !one.declaredOnCard,
    );
    for (const one of broadened) {
      const basis =
        one.scope?.type === 'genus'
          ? 'legacyGenus — EVERY species of the genus'
          : 'acceptedGroup — the listed taxa only';
      console.log(`  #${one.herb.cardNumber} ${one.herb.id}  (${one.herb.scientificName})`);
      console.log(`     ${basis}`);
      if (one.scope?.type === 'acceptedGroup') {
        for (const taxon of one.scope.accepted) {
          console.log(
            `     + ${taxon.scientificName} [${taxon.rank}]  source: ${taxon.source ? 'yes' : 'NONE'}`,
          );
        }
      }
    }
    console.log(`\n  ${broadened.length} card(s). Everything else is its own binomial only.`);
    expect(broadened.length).toBeLessThanOrEqual(2);
  });

  it('prints the evidence checklist a candidate species would have to satisfy', () => {
    console.log('\n----------------------------------------------------------------');
    console.log('EVIDENCE CHECKLIST, PER CARD');
    console.log('----------------------------------------------------------------');
    console.log('  Not a proposal. This is what a researcher must check a candidate against,');
    console.log('  taken off the card itself: nothing here is inferred and nothing is added.\n');

    // Only the cards a human is being asked to look at. Printing all 54 would bury them,
    // which is the failure mode this whole audit exists to avoid.
    const SHORTLIST = [
      'solidago-canadensis',
      'arctium-lappa',
      'fragaria-virginiana',
      'oxalis-stricta',
      'malva-neglecta',
      'chenopodium-album',
      'stellaria-media',
    ];
    for (const id of SHORTLIST) {
      const entry = CARDS.find((one) => one.herb.id === id);
      if (!entry) {
        console.log(`  ${id}: NOT IN CATALOGUE`);
        continue;
      }
      const claims = claimSet(entry.herb);
      console.log(
        `  #${entry.herb.cardNumber} ${entry.herb.commonName} (${entry.herb.scientificName})`,
      );
      console.log(`     present scope      ${entry.scope?.type ?? 'species (field card)'}`);
      console.log(`     traditional use    ${claims.traditionalUse.join(', ') || '(none)'}`);
      console.log(`     stated compounds   ${claims.compounds.join(', ') || '(none)'}`);
      console.log(`     usable parts       ${claims.parts.join(', ') || '(none)'}`);
      console.log(`     preparations       ${claims.preparations.join(', ') || '(none)'}`);
      console.log(`     printed warning    ${claims.warning || '(none)'}`);
      console.log('');
    }

    expect(SHORTLIST.length).toBeGreaterThan(0);
  });

  it('reports which genus cards carry the widest within-genus divergence to check', () => {
    console.log('\n----------------------------------------------------------------');
    console.log('GENUS CARDS — the opposite question');
    console.log('----------------------------------------------------------------');
    console.log('  These are already at genus scope by their own printed name, so the review');
    console.log('  question is NOT "can we broaden" but "does this content generalise".\n');

    for (const one of CARDS.filter((card) => card.declaredOnCard)) {
      const claims = claimSet(one.herb);
      console.log(
        `  #${one.herb.cardNumber} ${one.herb.commonName} (${one.herb.scientificName})` +
          `  parts: ${claims.parts.join('/')}`,
      );
    }
    expect(CARDS.filter((one) => one.declaredOnCard).length).toBe(9);
  });
});
