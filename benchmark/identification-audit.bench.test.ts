/**
 * IDENTIFICATION-READINESS AUDIT — every collectible, every unlock path, zero API calls.
 *
 * WHY THIS EXISTS. Three identification defects were found one at a time, each by a field
 * scan: a 0.065 `Solidago caesia` reaching a confirmable Goldenrod, `Taraxacum sect.
 * Erythrosperma` once opening the Dandelion card, and `Capsella bursa-pastoris` being
 * offered for a *C. rubella*. Discovering these one photograph at a time is not a method.
 * Everything a provider could say is a FINITE, ENUMERABLE set of shapes, and what Plantdex
 * does with each is decidable without asking anybody's API.
 *
 * SO THIS PROBES THE REAL MATCHER. It imports `matchScientificName` and `outcomeFor` — the
 * functions that ship — and asks them what they would do with ten classes of input against
 * every card in the CATALOGUE. No network, no credits, no provider.
 *
 * WHAT IT DOES NOT DO. It does not judge botany. It cannot know whether a curated scope is
 * taxonomically right; it can only report that the scope is broad, which taxa it admits, and
 * whether a human has signed off on each. Every finding here is "Plantdex behaves like this",
 * never "this species belongs on this card" — that second question is the one the shortlist
 * hands back to a person.
 *
 * Run: npx vitest run --config vitest.bench.config.ts benchmark/identification-audit.bench.test.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CATALOGUE, isPrintedCard } from '@/lib/catalogue';
import { allScopes, scopeFor, type CardScope } from '@/lib/card-coverage';
import { getPrintedCard } from '@/lib/deck';
import { tracksMastery } from '@/lib/mastery';
import {
  genusOf,
  matchScientificName,
  normalizeName,
  outcomeFor,
  taxonRank,
  type PlantMatch,
  type ScanCandidate,
  type ScanOutcome,
} from '@/lib/plant-match';
import { xpForDiscoveries } from '@/lib/progression';

/* ────────────────────────────────────────────────────────────────────────────
 * The synonym table is not exported, and this is the one place the audit reads
 * source text instead of calling a function. The table is DATA — a map of
 * provider spellings onto card ids — and the audit needs to know which card each
 * entry targets so it can probe B against the right card. Reading it back out of
 * the module is the same idiom several tests in src/lib already use for the edge
 * function, and it stays honest because every probe is still answered by the real
 * matcher rather than by this parse.
 * ──────────────────────────────────────────────────────────────────────────── */
function synonymsByCard(): Map<string, string[]> {
  const source = readFileSync('src/lib/plant-match.ts', 'utf8');
  const block = source.slice(
    source.indexOf('const ACCEPTED_NAME_SYNONYMS'),
    source.indexOf('export function normalizeName'),
  );
  const out = new Map<string, string[]>();
  for (const [, name, card] of block.matchAll(/'([a-z× .-]+)':\s*'([a-z-]+)'/g)) {
    out.set(card!, [...(out.get(card!) ?? []), name!]);
  }
  return out;
}

/** A coined epithet, so a probe never asserts that some real species exists. */
const COINED = 'plantdexia';

type ProbeId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J';

interface Probe {
  id: ProbeId;
  what: string;
  name: string;
}

interface ProbeResult extends Probe {
  kind: PlantMatch['kind'];
  eligibility: PlantMatch['eligibility'];
  herbId?: string;
  confirmable: boolean;
  rank: string;
  outcome: ScanOutcome;
}

function runProbe(probe: Probe): ProbeResult {
  const match = matchScientificName(probe.name);
  // Through the REAL outcome function, as a single-candidate list — which is what a
  // provider leading with this name produces, and what the UI branches on.
  const candidate: ScanCandidate = { scientificName: probe.name, score: 0.5, match };
  return {
    ...probe,
    kind: match.kind,
    eligibility: match.eligibility,
    herbId: match.herbId,
    confirmable: match.confirmable,
    rank: match.observedTaxon?.rank ?? taxonRank(probe.name),
    outcome: outcomeFor([candidate]),
  };
}

function probesFor(
  herbId: string,
  scientificName: string,
  scope: CardScope | undefined,
  synonyms: string[],
  sameGenusCards: string[],
): Probe[] {
  const genus = genusOf(scientificName);
  const isSppCard = scientificName.includes('spp.');
  const probes: Probe[] = [];

  if (!isSppCard) {
    probes.push({ id: 'A', what: 'exact printed species', name: scientificName });
    probes.push({
      id: 'C',
      what: 'legitimate infraspecific name',
      name: `${scientificName} var. ${COINED}`,
    });
  }
  for (const synonym of synonyms) {
    probes.push({ id: 'B', what: 'accepted synonym', name: synonym });
  }
  probes.push({ id: 'D', what: 'bare genus', name: genus.charAt(0).toUpperCase() + genus.slice(1) });
  probes.push({
    id: 'E',
    what: 'arbitrary same-genus species',
    name: `${genus.charAt(0).toUpperCase() + genus.slice(1)} ${COINED}`,
  });

  if (scope?.type === 'acceptedGroup') {
    for (const member of scope.accepted) {
      if (member.rank !== 'species') {
        probes.push({ id: 'F', what: `accepted ${member.rank}`, name: member.scientificName });
      }
      for (const alt of member.synonyms ?? []) {
        probes.push({ id: 'F', what: `accepted ${member.rank} synonym`, name: alt });
      }
    }
  }
  if (scope?.type === 'genus') {
    for (const one of scope.excluded ?? []) {
      probes.push({ id: 'G', what: 'deliberately excluded', name: one });
    }
  }

  const Genus = genus.charAt(0).toUpperCase() + genus.slice(1);
  probes.push({ id: 'H', what: 'unresolved rank marker', name: `${Genus} sp.` });
  probes.push({ id: 'H', what: 'aggregate marker', name: `${Genus} ${COINED} agg.` });

  for (const other of sameGenusCards) {
    const entry = CATALOGUE.find((one) => one.id === other);
    if (entry && !entry.scientificName.includes('spp.')) {
      probes.push({ id: 'I', what: 'another deck card, same genus', name: entry.scientificName });
    }
  }
  return probes;
}

/* ────────────────────────────────────────────────────────────────────────────
 * RISK FLAGS. Concrete behaviours, never a score. Each one names something a
 * person could act on; "looks suspicious" is not a flag.
 * ──────────────────────────────────────────────────────────────────────────── */
const FLAGS = {
  exactOnly: 'exact-only behaviour',
  curatedBroader: 'intentionally curated broader scope',
  pendingScope: 'UNRESOLVED / pending scope',
  bareGenusUnlocks: 'bare genus can unlock the card',
  congenerUnlocks: 'an arbitrary same-genus species can unlock the card',
  aboveSpecies: 'a SUPRA-SPECIFIC answer can unlock the card',
  unresolvedRank: 'a name of unresolved rank can unlock the card',
  sameGenusSibling: 'another deck card shares this genus',
  providerErrorExposed:
    'provider naming this exact species is indistinguishable from a correct find',
  aggregateComplexity: 'aggregate / microspecies complexity',
  highStakesLookalike: 'card prints a lookalike warning',
} as const;

/*
 * ABOVE the species, so none of these resolves WHICH species. At or below it — species,
 * subspecies, variety, form — all do, so a card accepting `X var. anything` is accepting a
 * form of its own species and is correct, not a finding. An earlier version of this flag
 * tested `rank !== 'species'` and therefore fired on 43 of 54 cards for behaviour the
 * normaliser exists to provide; a checker that cries wolf is one people stop reading.
 */
const SUPRA_SPECIFIC = new Set(['genus', 'subgenus', 'section', 'subsection', 'series']);
type Flag = keyof typeof FLAGS;

describe('identification readiness audit', () => {
  const synonyms = synonymsByCard();

  // Which cards share a genus, from the catalogue itself rather than a hand list.
  const byGenus = new Map<string, string[]>();
  for (const herb of CATALOGUE) {
    const genus = genusOf(herb.scientificName);
    byGenus.set(genus, [...(byGenus.get(genus) ?? []), herb.id]);
  }

  const inventory = CATALOGUE.map((herb) => {
    const scope = scopeFor(herb.id);
    const siblings = (byGenus.get(genusOf(herb.scientificName)) ?? []).filter(
      (one) => one !== herb.id,
    );
    const probes = probesFor(
      herb.id,
      herb.scientificName,
      scope,
      synonyms.get(herb.id) ?? [],
      siblings,
    );
    const results = probes.map(runProbe);

    const unlocks = (id: ProbeId) =>
      results.some((one) => one.id === id && one.confirmable && one.herbId === herb.id);

    const flags: Flag[] = [];
    if (!scope || scope.type === 'species') flags.push('exactOnly');
    if (scope?.type === 'acceptedGroup') flags.push('curatedBroader');
    if (scope?.type === 'genus') {
      flags.push(scope.pendingCuration ? 'pendingScope' : 'curatedBroader');
    }
    if (unlocks('D')) flags.push('bareGenusUnlocks');
    if (unlocks('E')) flags.push('congenerUnlocks');
    if (results.some((one) => one.confirmable && one.herbId === herb.id && SUPRA_SPECIFIC.has(one.rank)))
      flags.push('aboveSpecies');
    if (results.some((one) => one.confirmable && one.herbId === herb.id && one.rank === 'unknown'))
      flags.push('unresolvedRank');
    if (siblings.length) flags.push('sameGenusSibling');
    // Every card with an exact binomial has this: a provider that says the deck's own name
    // produces an exact match, and nothing downstream can tell a correct answer from a
    // misidentification wearing the same name. It is not a defect — it is the boundary.
    if (!herb.scientificName.includes('spp.')) flags.push('providerErrorExposed');
    if (scope?.type === 'acceptedGroup' && scope.accepted.some((one) => one.rank !== 'species'))
      flags.push('aggregateComplexity');
    if (herb.warning) flags.push('highStakesLookalike');
    return {
      id: herb.id,
      commonName: herb.commonName,
      scientificName: herb.scientificName,
      rank: taxonRank(herb.scientificName),
      normalized: normalizeName(herb.scientificName),
      printed: isPrintedCard(herb),
      scopeType: scope?.type ?? 'species (default)',
      pendingCuration: scope?.type === 'genus' ? (scope.pendingCuration ?? null) : null,
      acceptedMembers:
        scope?.type === 'acceptedGroup'
          ? scope.accepted.map((one) => ({
              name: one.scientificName,
              rank: one.rank,
              synonyms: one.synonyms ?? [],
              source: one.source ?? null,
            }))
          : [],
      excluded: scope?.type === 'genus' ? [...(scope.excluded ?? [])] : [],
      synonyms: synonyms.get(herb.id) ?? [],
      sameGenusCards: siblings,
      // Progression consequences, from the modules that own them.
      awardsXp: xpForDiscoveries([herb.id]),
      tracksMastery: tracksMastery(herb.id),
      inPrintedDeck: Boolean(getPrintedCard(herb.id)),
      flags,
      probes: results,
    };
  });

  it('PHASE 1+2 — inventory and exposure, written machine-readably', () => {
    writeFileSync(
      'benchmark/identification-audit.json',
      JSON.stringify({ generated: 'scripts: benchmark/identification-audit.bench.test.ts', cards: inventory }, null, 2) +
        '\n',
      'utf8',
    );
    console.log(`\n${inventory.length} identification-relevant cards`);
    console.log(`  printed deck      ${inventory.filter((one) => one.printed).length}`);
    console.log(`  digital-only      ${inventory.filter((one) => !one.printed).length}`);
    console.log(`  probes run        ${inventory.reduce((n, one) => n + one.probes.length, 0)}`);
    console.log('  API calls         0');
    expect(inventory.length).toBe(CATALOGUE.length);
  });

  it('PHASE 2 — groups cards by behaviour instead of describing each one', () => {
    const groups = new Map<string, string[]>();
    for (const card of inventory) {
      const key = card.flags
        .filter((one) => one !== 'providerErrorExposed' && one !== 'sameGenusSibling')
        .sort()
        .join(' + ');
      groups.set(key, [...(groups.get(key) ?? []), card.id]);
    }
    console.log('\n----------------------------------------------------------------');
    console.log('BEHAVIOUR GROUPS');
    console.log('----------------------------------------------------------------');
    for (const [key, ids] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n  ${ids.length} card(s) — ${key.replace(/(\w+)/g, (m) => FLAGS[m as Flag] ?? m)}`);
      console.log(`    ${ids.join(', ')}`);
    }
    expect(groups.size).toBeGreaterThan(0);
  });

  it('PHASE 2 — systemic findings across cards', () => {
    console.log('\n----------------------------------------------------------------');
    console.log('SYSTEMIC FINDINGS');
    console.log('----------------------------------------------------------------');

    // Two cards claiming one normalised name would make a scan ambiguous.
    const collisions = new Map<string, string[]>();
    for (const card of inventory) {
      collisions.set(card.normalized, [...(collisions.get(card.normalized) ?? []), card.id]);
    }
    const clashing = [...collisions].filter(([, ids]) => ids.length > 1);
    console.log(`\n  normalised-name collisions between cards: ${clashing.length}`);
    for (const [key, ids] of clashing) console.log(`    '${key}' <- ${ids.join(', ')}`);

    const genera = new Map<string, string[]>();
    for (const card of inventory) {
      const g = genusOf(card.scientificName);
      genera.set(g, [...(genera.get(g) ?? []), card.id]);
    }
    const shared = [...genera].filter(([, ids]) => ids.length > 1);
    console.log(`\n  genera holding more than one card: ${shared.length}`);
    for (const [g, ids] of shared) console.log(`    ${g}: ${ids.join(', ')}`);

    const bareGenus = inventory.filter((one) => one.flags.includes('bareGenusUnlocks'));
    console.log(`\n  cards a BARE GENUS answer can unlock: ${bareGenus.length}`);
    for (const one of bareGenus) console.log(`    ${one.id} (${one.scopeType})`);

    const congener = inventory.filter((one) => one.flags.includes('congenerUnlocks'));
    console.log(`\n  cards an ARBITRARY CONGENER can unlock: ${congener.length}`);
    for (const one of congener) console.log(`    ${one.id} (${one.scopeType})`);

    const pending = inventory.filter((one) => one.flags.includes('pendingScope'));
    console.log(`\n  cards with an UNRESOLVED scope: ${pending.length}`);
    for (const one of pending) console.log(`    ${one.id}`);

    // An `spp.` card legitimately accepts its genus; a card printing a binomial does not.
    const broadBinomial = congener.filter((one) => !one.scientificName.includes('spp.'));
    console.log(
      `\n  of those, cards that print a BINOMIAL rather than \`spp.\`: ${broadBinomial.length}`,
    );
    for (const one of broadBinomial) console.log(`    ${one.id} — prints ${one.scientificName}`);

    expect(clashing.length).toBe(0);
  });

  it('PHASE 4 — the shortlist: cards needing a human', () => {
    const needsHuman = inventory.filter(
      (one) =>
        one.flags.includes('pendingScope') ||
        one.flags.includes('aggregateComplexity') ||
        one.flags.includes('highStakesLookalike') ||
        (one.flags.includes('congenerUnlocks') && !one.scientificName.includes('spp.')),
    );
    console.log('\n----------------------------------------------------------------');
    console.log(`SHORTLIST — ${needsHuman.length} of ${inventory.length} cards need a person`);
    console.log('----------------------------------------------------------------');
    for (const one of needsHuman) {
      const why = one.flags
        .filter((f) =>
          ['pendingScope', 'aggregateComplexity', 'highStakesLookalike', 'congenerUnlocks'].includes(
            f,
          ),
        )
        .map((f) => FLAGS[f]);
      console.log(`\n  ${one.id}  (${one.commonName}, ${one.scientificName})`);
      console.log(`    ${why.join('; ')}`);
      if (one.acceptedMembers.length) {
        for (const m of one.acceptedMembers) {
          console.log(`    accepts ${m.name} [${m.rank}]${m.source ? '  src: yes' : '  SRC: NONE'}`);
        }
      }
    }
    console.log(
      `\n  every other card (${inventory.length - needsHuman.length}) is deterministically ` +
        'verified by the probes above and needs no botanical research.',
    );
    expect(needsHuman.length).toBeLessThan(inventory.length);
  });

  it('PHASE 6 — progression cannot be reached without a confirmable card', () => {
    console.log('\n----------------------------------------------------------------');
    console.log('XP / DISCOVERY INTEGRITY');
    console.log('----------------------------------------------------------------');

    // Every probe that is NOT confirmable must produce an outcome the UI cannot confirm from.
    const confirmableOutcomes: ScanOutcome[] = ['matched'];
    const leaks = inventory.flatMap((card) =>
      card.probes
        .filter((p) => !p.confirmable && confirmableOutcomes.includes(p.outcome))
        .map((p) => `${card.id}: '${p.name}' not confirmable but outcome=${p.outcome}`),
    );
    console.log(`  non-confirmable probes reaching a 'matched' outcome: ${leaks.length}`);
    for (const one of leaks) console.log(`    ${one}`);

    // A card outside the printed deck must pay nothing and track no mastery.
    const digital = inventory.filter((one) => !one.printed);
    const paying = digital.filter((one) => one.awardsXp !== 0);
    const mastering = digital.filter((one) => one.tracksMastery);
    console.log(`\n  digital-only cards: ${digital.length}`);
    console.log(`    paying XP (must be 0):        ${paying.length}`);
    console.log(`    tracking mastery (must be 0): ${mastering.length}`);

    // Every probe that unlocks SOME card must unlock a card that exists.
    const phantom = inventory.flatMap((card) =>
      card.probes
        .filter((p) => p.confirmable && !CATALOGUE.some((h) => h.id === p.herbId))
        .map((p) => `${card.id}: '${p.name}' -> ${p.herbId}`),
    );
    console.log(`\n  confirmable probes naming a card that does not exist: ${phantom.length}`);

    expect(leaks).toEqual([]);
    expect(paying).toEqual([]);
    expect(mastering).toEqual([]);
    expect(phantom).toEqual([]);
  });
});
