import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  QUALIFYING_ELIGIBILITIES,
  classifyQualification,
  qualificationShadowEnabled,
  tallyQualifications,
  type QualificationInput,
} from './observation-qualification';
import { ELIGIBILITIES, type Eligibility, type PlantMatch } from './plant-match';

/**
 * WOULD THIS DISCOVERY QUALIFY, AND NOTHING ELSE.
 *
 * Owner decisions D2 and D3 (2026-11-24) as an executable table. The classifier is a
 * MEASUREMENT: it reports what a future rule would say and changes no behaviour, so most of
 * what is pinned here is what it must NOT depend on or do.
 */

function match(eligibility: Eligibility, confirmable = true): PlantMatch {
  return {
    kind: eligibility === 'genusCard' ? 'genusCard' : 'exact',
    eligibility,
    herbId: 'taraxacum-officinale',
    confirmable,
  };
}

function input(over: Partial<QualificationInput> = {}): QualificationInput {
  return {
    channel: 'collect',
    signedIn: true,
    match: match('exact'),
    rankPosition: 'top',
    alreadyHeld: false,
    ...over,
  };
}

describe('D2: which confirmable matches qualify', () => {
  it('admits exactly the supported bases and excludes provisional legacyGenus', () => {
    expect([...QUALIFYING_ELIGIBILITIES].sort()).toEqual(
      ['acceptedGroup', 'curatedEquivalent', 'exact', 'genusCard', 'synonym'],
    );
    expect(QUALIFYING_ELIGIBILITIES).not.toContain('legacyGenus');
  });

  it.each(QUALIFYING_ELIGIBILITIES)('%s qualifies when confirmable', (eligibility) => {
    const v = classifyQualification(input({ match: match(eligibility) }));
    expect(v.wouldQualify).toBe(true);
    expect(v.reason).toBe('qualifies');
  });

  it('refuses legacyGenus and says why, so the rows stay findable', () => {
    const v = classifyQualification(input({ match: match('legacyGenus') }));
    expect(v).toMatchObject({ wouldQualify: false, reason: 'legacyGenusExcluded' });
  });

  it('classifies every eligibility the matcher can emit, and none by accident', () => {
    for (const e of ELIGIBILITIES) {
      const v = classifyQualification(input({ match: match(e) }));
      expect(v.wouldQualify).toBe((QUALIFYING_ELIGIBILITIES as readonly string[]).includes(e));
    }
  });

  it('never qualifies something the matcher called unconfirmable', () => {
    for (const e of ELIGIBILITIES) {
      const v = classifyQualification(input({ match: match(e, false) }));
      expect(v.wouldQualify).toBe(false);
    }
  });

  it('never qualifies a match with no card', () => {
    const v = classifyQualification(input({ match: { kind: 'none', eligibility: 'none', confirmable: false } }));
    expect(v).toMatchObject({ wouldQualify: false, reason: 'notConfirmable' });
  });

  it('keeps exact, synonym, genus-level and uncertain apart rather than rounding them together', () => {
    const cls = (e: Eligibility, rankPosition: 'top' | 'listed' = 'top') =>
      classifyQualification(input({ match: match(e), rankPosition })).matchClass;
    expect(cls('exact')).toBe('exact');
    expect(cls('synonym')).toBe('synonym');
    expect(cls('genusCard')).toBe('genusLevel');
    expect(cls('acceptedGroup')).toBe('curatedGroup');
    expect(cls('curatedEquivalent')).toBe('curatedGroup');
    expect(cls('exact', 'listed')).toBe('uncertain');
  });

  it('asks for explicit confirmation when the answer is not a plain top-ranked exact or synonym', () => {
    const need = (e: Eligibility, rankPosition: 'top' | 'listed') =>
      classifyQualification(input({ match: match(e), rankPosition })).needsExplicitConfirmation;
    expect(need('exact', 'top')).toBe(false);
    expect(need('synonym', 'top')).toBe(false);
    expect(need('exact', 'listed')).toBe(true);
    expect(need('genusCard', 'top')).toBe(true);
    expect(need('acceptedGroup', 'top')).toBe(true);
    expect(need('curatedEquivalent', 'top')).toBe(true);
  });

  it('takes no score, so no certainty threshold can be invented here', () => {
    const keys = Object.keys(input());
    expect(keys.sort()).toEqual(['alreadyHeld', 'channel', 'match', 'rankPosition', 'signedIn']);
  });
});

describe('D3: one eligible scan per card, and re-scans pay nothing', () => {
  it('a card already held does not qualify again, and is named as a re-scan', () => {
    const v = classifyQualification(input({ alreadyHeld: true }));
    expect(v).toMatchObject({ wouldQualify: false, reason: 'alreadyHeld' });
  });

  it('is a plain function of its input, so the same scan always gives the same answer', () => {
    const a = classifyQualification(input());
    const b = classifyQualification(input());
    expect(a).toEqual(b);
  });
});

describe('channels and accounts (D1, D4)', () => {
  it('a lookup never qualifies, however good the match', () => {
    expect(classifyQualification(input({ channel: 'lookup' }))).toMatchObject({
      wouldQualify: false,
      reason: 'lookup',
    });
  });

  it('a request that declared no channel is treated as a lookup, not as a failure', () => {
    expect(classifyQualification(input({ channel: 'unspecified' }))).toMatchObject({
      wouldQualify: false,
      reason: 'lookup',
    });
  });

  it('signed out never qualifies for an account collection', () => {
    expect(classifyQualification(input({ signedIn: false }))).toMatchObject({
      wouldQualify: false,
      reason: 'signedOut',
    });
  });
});

describe('aggregate diagnostics (D7)', () => {
  it('counts reasons and carries nothing that identifies a person, a plant or a photograph', () => {
    const verdicts = [
      classifyQualification(input()),
      classifyQualification(input()),
      classifyQualification(input({ channel: 'lookup' })),
      classifyQualification(input({ alreadyHeld: true })),
    ];
    const tally = tallyQualifications(verdicts);
    expect(tally).toMatchObject({ total: 4, wouldQualify: 2, byReason: { qualifies: 2, lookup: 1, alreadyHeld: 1 } });
    expect(JSON.stringify(tally)).not.toMatch(/herb|user|taxon|score|photo|name/i);
  });

  it('is empty for no input, not undefined', () => {
    expect(tallyQualifications([])).toEqual({
      total: 0,
      wouldQualify: 0,
      byReason: {},
      byMatchClass: {},
    });
  });
});

describe('the flag defaults off and only an explicit on enables it', () => {
  it.each([undefined, '', 'off', '0', 'false', 'true', '1', 'ON ', 'yes'])('%j is off', (v) => {
    expect(qualificationShadowEnabled(v)).toBe(false);
  });
  it('"on" enables', () => {
    expect(qualificationShadowEnabled('on')).toBe(true);
  });
});

describe('the module is a measurement and stays one', () => {
  const src = readFileSync('src/lib/observation-qualification.ts', 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('imports nothing that can pay, store or read a clock', () => {
    expect(code).not.toMatch(/herbdex-reducer|progression|mastery|research|storage|sightings|supabase/);
    expect(code).not.toMatch(/Date\.now|new Date|Math\.random|localStorage|fetch\(/);
  });

  it('never calls a scan verified', () => {
    expect(code).not.toMatch(/verified/i);
  });
});
