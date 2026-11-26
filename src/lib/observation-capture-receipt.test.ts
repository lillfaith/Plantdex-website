import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TAXON_RANKS } from './card-coverage';
import { ELIGIBILITIES, SPECIES_CONFIDENCES, type PlantMatch } from './plant-match';
import {
  CAPTURE_CODES,
  CAPTURE_CONFIG,
  CAPTURE_WORDS,
  CAPTURE_WORDS_FORBIDDEN,
  CLAIM_CODES,
  CLAIM_STATUSES,
  DIRECT_WRITE_REFUSALS,
  RECEIPT_ELIGIBILITIES,
  SESSION_CODES,
  receiptItemsFor,
  routeNewCard,
  type CaptureCandidate,
  type UnlockChannel,
} from './observation-capture-receipt';

const ROOT = path.resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');
const MIGRATION = read('docs/discoveries/sql/0016_discovery_capture_enforcement.sql');
const VERIFY = read('docs/discoveries/sql/0016_verify.sql');
const ROLLBACK = read('docs/discoveries/sql/0016_rollback.sql');
const CONTRACT = read('docs/discoveries/discovery-receipt-contract.md');
const MODULE = read('src/lib/observation-capture-receipt.ts');

/** The contents of `check (col in (...))` for one column, as a sorted list of literals. */
function checkList(sql: string, column: string): string[] {
  const m = new RegExp(`${column} text not null check \\(${column} in \\(([^)]*)\\)`).exec(sql);
  if (!m) throw new Error(`no CHECK list for ${column}`);
  return [...(m[1] ?? "").matchAll(/'([^']+)'/g)].map((x) => x[1] as string).sort();
}

const confirmable = (over: Partial<PlantMatch>): PlantMatch => ({
  kind: 'exact',
  eligibility: 'exact',
  confirmable: true,
  herbId: 'plantago-major',
  observedTaxon: { providerName: 'Plantago major L.', name: 'Plantago major', key: 'plantago major', rank: 'species', hybrid: false },
  ...over,
});
const cand = (match: PlantMatch, over: Partial<CaptureCandidate> = {}): CaptureCandidate => ({
  match,
  rankPosition: 'top',
  speciesConfidence: 'high',
  ...over,
});

describe('the TypeScript mirror equals the SQL, in both directions', () => {
  it('every number in capture_config() equals CAPTURE_CONFIG', () => {
    const num = (key: string) => Number(new RegExp(`'${key}', (\\d+)`).exec(MIGRATION)?.[1]);
    expect(num('ttl_s')).toBe(CAPTURE_CONFIG.ttlSeconds);
    expect(num('min_capture_ms')).toBe(CAPTURE_CONFIG.minCaptureMs);
    expect(num('receipt_ttl_days')).toBe(CAPTURE_CONFIG.receiptTtlDays);
    expect(num('max_open_sessions')).toBe(CAPTURE_CONFIG.maxOpenSessions);
    expect(num('max_sessions_per_day')).toBe(CAPTURE_CONFIG.maxSessionsPerDay);
    expect(num('min_images')).toBe(CAPTURE_CONFIG.minImages);
    expect(num('max_images')).toBe(CAPTURE_CONFIG.maxImages);
  });

  it('the receipt eligibility CHECK is exactly the qualifying set, and never legacyGenus', () => {
    expect(checkList(MIGRATION, 'eligibility')).toEqual([...RECEIPT_ELIGIBILITIES].sort());
    expect(RECEIPT_ELIGIBILITIES).not.toContain('legacyGenus');
    for (const e of RECEIPT_ELIGIBILITIES) expect(ELIGIBILITIES).toContain(e);
    // The claim function repeats the list; it must agree with the table.
    const inClaim = /r\.eligibility not in \(([^)]*)\)/.exec(MIGRATION)?.[1] ?? '';
    expect([...inClaim.matchAll(/'([^']+)'/g)].map((x) => x[1]).sort()).toEqual([...RECEIPT_ELIGIBILITIES].sort());
  });

  it('the rank and confidence CHECKs equal TAXON_RANKS and SPECIES_CONFIDENCES (a narrower CHECK refuses a real insert)', () => {
    expect(checkList(MIGRATION, 'observed_taxon_rank')).toEqual([...TAXON_RANKS].sort());
    expect(checkList(MIGRATION, 'species_confidence')).toEqual([...SPECIES_CONFIDENCES].sort());
    expect(checkList(MIGRATION, 'rank_position')).toEqual(['listed', 'top']);
  });

  it('every error code the SQL can return is in the TypeScript lists, and vice versa', () => {
    const returned = new Set([...MIGRATION.matchAll(/'code', '([a-z_]+)'/g)].map((m) => m[1]));
    const declared = new Set<string>([...CAPTURE_CODES, ...SESSION_CODES, ...CLAIM_CODES]);
    // identify-plant-only codes never come out of the database.
    const edgeOnly = new Set(['capture_not_signed_in', 'capture_purpose_missing', 'capture_unavailable', 'no_eligible_candidate']);
    for (const code of returned) expect(declared, `SQL returns ${code}`).toContain(code);
    for (const code of declared) if (!edgeOnly.has(code)) expect(returned, `${code} is declared but never returned`).toContain(code);
  });

  it('the claim statuses and the refusal messages are the SQL strings', () => {
    for (const status of CLAIM_STATUSES) expect(MIGRATION).toContain(`'${status}'`);
    expect(MIGRATION).toContain(`'${DIRECT_WRITE_REFUSALS.discovery}'`);
    expect(MIGRATION).toContain(`'${DIRECT_WRITE_REFUSALS.progress}'`);
  });

  it('the contract document lists the same codes the module does', () => {
    const block = (name: string) => {
      const start = CONTRACT.indexOf(`type ${name} =`);
      if (start < 0) throw new Error(`contract has no ${name}`);
      const rest = CONTRACT.slice(start + 1);
      const end = Math.min(...['\ntype ', '```'].map((m) => rest.indexOf(m)).filter((i) => i >= 0));
      return [...rest.slice(0, end).matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
    };
    expect(block('CaptureCode').sort()).toEqual([...CAPTURE_CODES].sort());
    expect(block('SessionCode').sort()).toEqual([...SESSION_CODES].sort());
    // The contract's claim list omits collection_limit_reached only if it is documented elsewhere in prose.
    expect(block('ClaimCode').sort()).toEqual([...CLAIM_CODES].sort());
    expect(CONTRACT).toContain(`min_capture_ms": ${CAPTURE_CONFIG.minCaptureMs}`);
    expect(CONTRACT).toContain(`ttl_s = ${CAPTURE_CONFIG.ttlSeconds}`);
  });
});

describe('the switch defaults OFF and nothing here can turn it on', () => {
  it('the switch row is created with enforce = false and the migration never calls the setter', () => {
    expect(MIGRATION).toMatch(/enforce boolean not null default false/);
    const withoutComments = MIGRATION.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(withoutComments).not.toMatch(/set_discovery_enforcement\s*\(\s*true/i);
    // `enforce = true` is written exactly once: inside the setter, which nothing in this file calls.
    expect(withoutComments.match(/enforce = true/g)).toHaveLength(1);
    expect(withoutComments.indexOf('enforce = true')).toBeGreaterThan(withoutComments.indexOf('function public.set_discovery_enforcement'));
  });

  it('only the service role may call the setter or the internals, and anon/authenticated are revoked by name', () => {
    for (const fn of [
      'consume_capture_session(uuid, uuid, text, text, text[])',
      'issue_capture_receipts(uuid, uuid, jsonb)',
      'prune_capture_artifacts()',
      'set_discovery_enforcement(boolean, timestamptz, text)',
    ]) {
      expect(MIGRATION).toContain(`revoke all on function public.${fn} from public, anon, authenticated;`);
      expect(MIGRATION).toContain(`grant execute on function public.${fn} to service_role;`);
    }
    for (const fn of ['open_capture_session()', 'claim_discovery(text)', 'discovery_rules()']) {
      expect(MIGRATION).toContain(`revoke all on function public.${fn} from public, anon;`);
      expect(MIGRATION).toContain(`grant execute on function public.${fn} to authenticated;`);
    }
  });

  it('every function is pinned to an empty search_path (a definer function must not be hijackable)', () => {
    const functions = MIGRATION.match(/create or replace function public\.[a-z_]+\(/g) ?? [];
    const pinned = MIGRATION.match(/set search_path = ''/g) ?? [];
    expect(functions.length).toBeGreaterThanOrEqual(12);
    expect(pinned.length).toBe(functions.length);
  });

  it('no policy and no grant lets a client write any new table (the write-once rule)', () => {
    expect(MIGRATION).not.toMatch(/create policy[^;]*for (insert|update|delete|all)\b/i);
    expect(MIGRATION).not.toMatch(/grant\s+(insert|update|delete|all)[^;]*to\s+(anon|authenticated)/i);
    const selectGrants = MIGRATION.match(/grant select on table public\.[a-z_]+ to authenticated/g) ?? [];
    expect(selectGrants.sort()).toEqual([
      'grant select on table public.capture_receipts to authenticated',
      'grant select on table public.discovery_grandfathered to authenticated',
    ]);
  });

  it('it neither alters nor re-creates 0014, and never touches confirm_scan, scans, sightings or XP', () => {
    const code = MIGRATION.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(code).not.toMatch(/confirm_scan/);
    expect(code).not.toMatch(/(alter|insert into|update|delete from)\s+public\.(scans|sightings|profiles)\b/i);
    expect(code).not.toMatch(/exif|latitude|longitude|geolocation/i);
  });

  it('the rollback deletes no player record: no DROP TABLE, DELETE, TRUNCATE or DROP COLUMN', () => {
    const code = ROLLBACK.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(code).not.toMatch(/drop\s+table/i);
    expect(code).not.toMatch(/\bdelete\s+from\b/i);
    expect(code).not.toMatch(/truncate/i);
    expect(code).not.toMatch(/drop\s+column/i);
    expect(code).toMatch(/enforce = false/);
  });

  it('the verification is self-rolling-back and refuses a project that is already enforcing', () => {
    const code = VERIFY.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').trim();
    expect(code.startsWith('begin;')).toBe(true);
    expect(code.endsWith('rollback;')).toBe(true);
    expect(code).not.toMatch(/\bcommit\b/i);
    expect(code).toMatch(/enforcement is OFF on entry/);
  });

  it('the verification covers every bypass the owner named, ON and OFF', () => {
    for (const claim of [
      'OFF: direct insert of a new card is unchanged',
      'ON: DIRECT INSERT of a new card is refused',
      'a BACK-DATED direct insert is refused',
      'learned for an undiscovered card is refused',
      'mastered for an undiscovered card is refused',
      'FORGED receipt id is refused',
      'ANOTHER ACCOUNT',
      'confirm_scan',
      'REPLAY',
      'EXPIRED receipt is refused',
      'DUPLICATE IMAGE',
      'GRANDFATHERED',
      'OFF again: direct insert of a new card works exactly as before',
      'cannot flip the switch',
    ]) {
      expect(VERIFY, claim).toContain(claim);
    }
  });
});

describe('receiptItemsFor: which candidates earn a receipt', () => {
  it('issues one for an exact, top-ranked, confirmable candidate and carries the observed taxon, not the card', () => {
    const items = receiptItemsFor([cand(confirmable({}))]);
    expect(items).toEqual([
      {
        herb_id: 'plantago-major',
        observed_taxon_key: 'plantago major',
        observed_taxon_rank: 'species',
        eligibility: 'exact',
        rank_position: 'top',
        species_confidence: 'high',
      },
    ]);
  });

  it('issues for every allowed basis', () => {
    for (const eligibility of RECEIPT_ELIGIBILITIES) {
      expect(receiptItemsFor([cand(confirmable({ eligibility }))]), eligibility).toHaveLength(1);
    }
  });

  it('refuses legacyGenus, ambiguous, related, none and an unconfirmable match', () => {
    for (const eligibility of ['legacyGenus', 'ambiguous', 'related', 'none'] as const) {
      expect(receiptItemsFor([cand(confirmable({ eligibility }))]), eligibility).toEqual([]);
    }
    expect(receiptItemsFor([cand(confirmable({ confirmable: false }))])).toEqual([]);
    expect(receiptItemsFor([cand(confirmable({ herbId: undefined }))])).toEqual([]);
    expect(receiptItemsFor([cand(confirmable({ observedTaxon: undefined }))])).toEqual([]);
  });

  it('a listed (non-leading) candidate is issued on its own match, and is recorded as listed', () => {
    const items = receiptItemsFor([
      cand(confirmable({ herbId: 'urtica-dioica', eligibility: 'ambiguous' as never, confirmable: false })),
      cand(confirmable({ herbId: 'plantago-major' }), { rankPosition: 'listed', speciesConfidence: 'low' }),
    ]);
    expect(items.map((i) => [i.herb_id, i.rank_position, i.species_confidence])).toEqual([['plantago-major', 'listed', 'low']]);
  });

  it('never promotes a candidate because its card is in the deck: a 0.09 deck species under a non-card leader still needs its own match', () => {
    // The leading candidate is a species with no card (not confirmable). The deck species below it qualifies
    // only because ITS match is confirmable, and it is recorded as `listed`.
    const items = receiptItemsFor([
      cand(confirmable({ confirmable: false, herbId: undefined })),
      cand(confirmable({}), { rankPosition: 'listed' }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.rank_position).toBe('listed');
  });

  it('issues one receipt per card per observation (the table is unique on it)', () => {
    expect(receiptItemsFor([cand(confirmable({})), cand(confirmable({}), { rankPosition: 'listed' })])).toHaveLength(1);
  });
});

describe('routeNewCard: imported, manual and self-reported paths cannot unlock a new card once enforcement is on', () => {
  const nonCamera: UnlockChannel[] = ['manualDiscover', 'importedProgress', 'seedShelfClaim'];

  it('with enforcement ON, only a camera capture claims a receipt; every other unlock path is sent to the camera', () => {
    expect(routeNewCard('camera', true)).toBe('claimReceipt');
    for (const channel of nonCamera) expect(routeNewCard(channel, true), channel).toBe('sendToCamera');
  });

  it('a lookup and a journal entry never unlock a card, in either state', () => {
    for (const enforcing of [true, false, undefined]) {
      expect(routeNewCard('lookup', enforcing)).toBe('noUnlock');
      expect(routeNewCard('journal', enforcing)).toBe('noUnlock');
    }
  });

  it('with enforcement OFF nothing changes for the existing paths', () => {
    for (const channel of nonCamera) expect(routeNewCard(channel, false), channel).toBe('recordAsToday');
  });

  it('an unknown answer is treated as enforcing', () => {
    for (const channel of nonCamera) expect(routeNewCard(channel, undefined), channel).toBe('sendToCamera');
  });
});

describe('words and structure', () => {
  it('describes a capture as captured in the app and never as verified or outdoors', () => {
    expect(CAPTURE_WORDS.recorded).toBe('Captured in the app');
    const strings = Object.values(CAPTURE_WORDS).join(' ').toLowerCase();
    for (const bad of CAPTURE_WORDS_FORBIDDEN) expect(strings).not.toContain(bad);
    expect(CAPTURE_WORDS.notProof.toLowerCase()).toContain('does not prove');
    expect(CAPTURE_WORDS.notProof.toLowerCase()).toContain('safe to use');
  });

  it('the contract says what the server cannot know and uses the allowed words', () => {
    expect(CONTRACT).toContain('cannot** prove an image came from a live camera');
    expect(CONTRACT).toContain('captured in the app');
    const claims = CONTRACT.split('\n')
      .filter((l) => !/Not allowed|Never "verified|never "verified|NOT "verified/i.test(l))
      .join('\n')
      .toLowerCase();
    for (const bad of CAPTURE_WORDS_FORBIDDEN) expect(claims, bad).not.toContain(bad);
  });

  it('stores and requires no EXIF, coordinates, device value or photograph (CLAUDE.md: no invasive location tracking)', () => {
    const sqlCode = MIGRATION.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(sqlCode).not.toMatch(/\b(exif|gps|latitude|longitude|geom|coordinates|user_agent|device_id|fingerprint)\b/i);
    expect(MODULE).not.toMatch(/\b(exif|navigator|geolocation|getUserMedia)\b/);
  });

  it('cannot pay: it imports neither the reducer, progression, nor a store, and reads no clock or randomness', () => {
    const imports = [...MODULE.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    expect(imports.sort()).toEqual(['./observation-qualification', './observation-qualification', './plant-match']);
    const code = MODULE.split('\n').filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('/*') && !l.trim().startsWith('//')).join('\n');
    expect(code).not.toMatch(/Date\.now|new Date|Math\.random|performance\.now/);
  });
});

// The real database. Skipped unless D5_RUN_SQL=1 and a local PostgreSQL is reachable, because CI has no server by default;
// the acceptance run for this branch executed it and recorded the output in the pull request.
describe.skipIf(process.env.D5_RUN_SQL !== '1')('0016 against a real PostgreSQL (docs/discoveries/sql/run-local.sh)', () => {
  it('migration, verification, idempotence, rollback and mutation all pass', () => {
    const out = execFileSync('bash', [path.join(ROOT, 'docs/discoveries/sql/run-local.sh'), '--mutate'], {
      encoding: 'utf8',
      timeout: 240_000,
    });
    expect(out).toContain('ALL 0016 CHECKS PASSED');
    expect(out).toContain('ALL LOCAL ACCEPTANCE STEPS PASSED');
    expect(out).toContain('suite fails when: the discoveries gate is dropped');
  }, 250_000);
});
