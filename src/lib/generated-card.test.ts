import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CARD_PANELS,
  CLAIM_KINDS,
  GAUGE_UNAVAILABLE,
  HIGH_RISK_KINDS,
  PANEL_LABEL,
  PIPELINE_STATES,
  UNAVAILABLE_PANELS,
  panelAvailability,
  canPublish,
  isHighRisk,
  type GeneratedCard,
  type GeneratedClaim,
} from './generated-card';

const ROOT = join(__dirname, '..', '..');
const CHECKER = readFileSync(join(ROOT, 'scripts', 'check_citations.py'), 'utf8');
const MIGRATION = readFileSync(
  join(ROOT, 'supabase', 'migrations', '0010_botanical_catalog.sql'),
  'utf8',
);

/** Pull a Python list literal out of the checker, so the two cannot drift apart. */
function pythonList(name: string): string[] {
  const match = new RegExp(`^${name} = \\[([\\s\\S]*?)\\]`, 'm').exec(CHECKER);
  if (!match) throw new Error(`${name} not found in check_citations.py`);
  return [...match[1]!.matchAll(/"([^"]+)"/g)].map((one) => one[1]!);
}

describe('the five pipeline states', () => {
  it('is the same list the checker uses, in the same order', () => {
    // A state list that drifts is a state list that lies: the script would advance a
    // bundle into a state the app does not render, or render one the script never sets.
    expect(pythonList('STATES')).toEqual([...PIPELINE_STATES]);
  });

  it('runs weakest first, and ends at approved', () => {
    expect(PIPELINE_STATES[0]).toBe('retrieved');
    expect(PIPELINE_STATES[PIPELINE_STATES.length - 1]).toBe('approved');
  });

  it('does not contain a state called verified', () => {
    // `verified` is a property of a SOURCE and means a human opened it. It is not a
    // pipeline state, and the moment it becomes one the word has two meanings.
    expect(PIPELINE_STATES).not.toContain('verified');
    expect(PIPELINE_STATES).toContain('citation-checked');
  });
});

describe('claim kinds', () => {
  it('matches the checker', () => {
    expect(pythonList('CLAIM_KINDS')).toEqual([...CLAIM_KINDS]);
  });

  it('matches migration 0010 exactly', () => {
    // SCOPED TO THE TABLE, and the first version was not. `catalog_sources` ALSO has a
    // column called `kind` with an identically shaped check, and it appears first -- so
    // the unscoped regex returned the source kinds ('ethnobotany', 'field-guide', ...)
    // and failed naming the wrong list. Same trap this repository has hit before with
    // substring guards; the answer is the same, match the enclosing block first.
    const table = /create table if not exists public\.medicinal_claims \(([\s\S]*?)\n\);/
      .exec(MIGRATION);
    expect(table).not.toBeNull();
    const block = /kind\s+text not null check \(kind in \(([\s\S]*?)\)\)/.exec(table![1]!);
    expect(block).not.toBeNull();
    const fromSql = [...block![1]!.matchAll(/'([a-z-]+)'/g)].map((one) => one[1]!);
    expect(fromSql.sort()).toEqual([...CLAIM_KINDS].sort());
  });

  it('CONTROL: the scoped match really is the claims table, not catalog_sources', () => {
    // A guard that passes is a question about the guard. `catalog_sources.kind` holds
    // 'ethnobotany'; if the scoping ever slips back, this fails instead of silently
    // comparing the wrong list.
    const table = /create table if not exists public\.medicinal_claims \(([\s\S]*?)\n\);/
      .exec(MIGRATION);
    expect(table![1]!).not.toContain('ethnobotany');
    expect(table![1]!).toContain('lookalike-hazard');
  });
});

describe('high risk is derived, never typed', () => {
  it('equals the trigger in 0010', () => {
    const fn = /new\.high_risk := new\.kind in \(([^)]*)\)/.exec(MIGRATION);
    expect(fn).not.toBeNull();
    const fromSql = [...fn![1]!.matchAll(/'([a-z-]+)'/g)].map((one) => one[1]!);
    expect(fromSql.sort()).toEqual([...HIGH_RISK_KINDS].sort());
  });

  it('flags exactly the three hazard kinds', () => {
    expect(CLAIM_KINDS.filter(isHighRisk)).toEqual([
      'toxicity',
      'contraindication',
      'lookalike-hazard',
    ]);
  });
});

describe('the card keeps every panel the card base has', () => {
  it('carries all six back panels, in the template\'s order', () => {
    // `docs/assets/cardbase.pdf` prints six. A card missing two of them is not
    // recognisably a Plantdex card, and quietly removing a heading is a worse lie than
    // leaving it marked empty: a reader who never sees "Taste profile" never learns the
    // deck has one and this card has nothing for it.
    expect([...CARD_PANELS]).toEqual([
      'healingTraits', 'compounds', 'taste', 'aromatic', 'preparations', 'usableParts',
    ]);
    for (const panel of CARD_PANELS) {
      expect(PANEL_LABEL[panel].length).toBeGreaterThan(4);
    }
  });

  it('marks taste and aroma unavailable, with the reason printed', () => {
    expect(panelAvailability('taste', [])).toBe('unavailable');
    expect(panelAvailability('aromatic', [])).toBe('unavailable');
    for (const reason of Object.values(UNAVAILABLE_PANELS)) {
      expect(reason!.length).toBeGreaterThan(30);
      expect(reason!.toLowerCase()).toContain('not guessed');
    }
  });

  it('keeps unavailable and pending apart', () => {
    // `unavailable` is a statement about the METHOD; `pending` is a statement about
    // PROGRESS. Collapsing them turns "nobody has done this yet" into "this cannot be
    // known", which is how a gap stops being revisited.
    expect(panelAvailability('compounds', [])).toBe('pending');
    expect(panelAvailability('compounds', ['compound'])).toBe('sourced');
    expect(panelAvailability('taste', ['traditional-use'])).toBe('unavailable');
  });

  it('never lets an approved claim fill taste or aroma', () => {
    // There is no claim kind that feeds them, so no amount of approved content can.
    for (const kind of CLAIM_KINDS) {
      expect(panelAvailability('taste', [kind])).toBe('unavailable');
      expect(panelAvailability('aromatic', [kind])).toBe('unavailable');
    }
  });

  it('says why the front gauge is blank rather than showing a number', () => {
    // The stats are COUNTED OFF THE PRINTED ARTWORK by build_deck.py. A generated species
    // has no printed artwork, and a fictional gameplay number in a botanical slot is the
    // one substitution that must never happen.
    expect(GAUGE_UNAVAILABLE).toContain('counted off the printed card artwork');
    expect(GAUGE_UNAVAILABLE).toContain('rather than invented');
  });
});

function claim(over: Partial<GeneratedClaim> = {}): GeneratedClaim {
  return {
    claimId: 'c1',
    kind: 'traditional-use',
    standing: 'traditional',
    body: 'Used traditionally as an infusion.',
    quote: 'Matricaria chamomilla is used as an infusion',
    passageId: 'pmc-1#abstract-0',
    sourceIds: ['pmc-1'],
    highRisk: false,
    state: 'approved',
    citationCheck: { ok: true, reason: null },
    review: { verdict: 'approve', by: 'a person', on: '2026-11-04', note: null },
    ...over,
  };
}

function card(over: Partial<GeneratedCard> = {}): GeneratedCard {
  return {
    speciesKey: 'matricaria chamomilla',
    acceptedName: 'Matricaria chamomilla',
    commonNames: ['Chamomile'],
    family: 'Asteraceae',
    gbifId: '8370958',
    collectionId: 'generated',
    tier: 'generated',
    conservation: {
      iucnCategory: 'NOT_EVALUATED',
      atRisk: false,
      promotable: false,
      note: 'no usable global assessment',
    },
    claims: [claim()],
    sprite: null,
    review: { content: 'approve', artwork: 'approve', by: 'a person', on: '2026-11-04' },
    ...over,
  };
}

describe('canPublish', () => {
  const verified = () => true;
  const unverified = () => false;

  it('allows a card where every gate is genuinely satisfied', () => {
    expect(canPublish(card(), verified).ok).toBe(true);
  });

  it('refuses when the source is not verified by a human', () => {
    // THE LOAD-BEARING CASE. The claim is citation-checked, approved by a named person,
    // and cites a paper NOBODY HAS OPENED. Publishing it would make `verified` mean "a
    // machine matched a string".
    const result = canPublish(card(), unverified);
    expect(result.ok).toBe(false);
    expect(result.blockers.join(' ')).toContain('not verified by a human');
  });

  it('refuses when artwork is approved but content is not', () => {
    const result = canPublish(
      card({ review: { content: null, artwork: 'approve', by: 'x', on: 'y' } }),
      verified,
    );
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain('medicinal content is not approved');
  });

  it('refuses when content is approved but artwork is not', () => {
    // The two verdicts are independent in both directions; neither implies the other.
    const result = canPublish(
      card({ review: { content: 'approve', artwork: null, by: 'x', on: 'y' } }),
      verified,
    );
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain('artwork is not approved');
  });

  it('refuses a claim that failed the citation check', () => {
    const result = canPublish(
      card({ claims: [claim({ citationCheck: { ok: false, reason: 'not verbatim' } })] }),
      verified,
    );
    expect(result.ok).toBe(false);
    expect(result.blockers.join(' ')).toContain('failed the citation check');
  });

  it('refuses a claim no human voted on', () => {
    const result = canPublish(
      card({
        claims: [claim({ review: { verdict: null, by: null, on: null, note: null } })],
      }),
      verified,
    );
    expect(result.ok).toBe(false);
    expect(result.blockers.join(' ')).toContain('no human approval');
  });

  it('refuses a card whose claims were all rejected', () => {
    const result = canPublish(
      card({
        claims: [
          claim({ review: { verdict: 'reject', by: 'x', on: 'y', note: null } }),
        ],
      }),
      verified,
    );
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain('no claim survived review');
  });

  it('refuses a claim still sitting in an earlier state', () => {
    const result = canPublish(
      card({ claims: [claim({ state: 'citation-checked' })] }),
      verified,
    );
    expect(result.ok).toBe(false);
    expect(result.blockers.join(' ')).toContain('state is citation-checked');
  });
});

describe('a generated card is not a second printed deck', () => {
  it('always declares the generated collection and tier', () => {
    const one = card();
    expect(one.collectionId).toBe('generated');
    expect(one.tier).toBe('generated');
  });

  it('carries a conservation verdict that defaults to not promotable', () => {
    // Missing assessment data is not evidence of abundance, and a card that sends people
    // to collect an unassessed plant is the failure this field exists to stop.
    expect(card().conservation.promotable).toBe(false);
  });
});
