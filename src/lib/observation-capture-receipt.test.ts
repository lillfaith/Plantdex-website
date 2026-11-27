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
const MIGRATION = read('supabase/migrations/0016_discovery_capture_enforcement.sql');
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

describe('duplicate images are flagged for review, never refused and never revealed', () => {
  const code = MIGRATION.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  it('the digest key is per account, so a same-account repeat is a retake', () => {
    expect(code).toMatch(/primary key \(user_id, digest\)/);
    expect(code).toMatch(/on conflict do nothing/);
    expect(code).not.toMatch(/unique_violation/);
  });
  it('a cross-account repeat sets the flag and cannot refuse: no duplicate code exists anywhere', () => {
    expect(code).toMatch(/x\.user_id <> p_user/);
    expect(code).toMatch(/suspect_duplicate = v_cross/);
    expect(code).not.toMatch(/capture_duplicate/);
    expect(CAPTURE_CODES.join(' ')).not.toMatch(/duplicate/);
    expect(CONTRACT).not.toMatch(/capture_duplicate_image/);
  });
  it('the flag is never returned or granted: no response, view or column grant mentions it', () => {
    const mentions = code.split('\n').filter((l) => l.includes('suspect_duplicate'));
    expect(mentions).toHaveLength(3); // the column, the consume update and the release reset; nothing else
    expect(code).not.toMatch(/jsonb_build_object\([^;]*suspect_duplicate/);
    expect(code).not.toMatch(/grant[^;]*capture_sessions[^;]*(anon|authenticated)/i);
    expect(code).toMatch(/revoke all on table public\.capture_sessions from public, anon, authenticated/);
    expect(MODULE).not.toMatch(/suspect|duplicate/i);
  });
  it('the verification proves accept, flag, no flag on same-account repeat, and a silent response', () => {
    for (const claim of ['ACCEPTED, not refused', 'FLAGGED for review', 'SAME account re-using an image', 'reveals the duplicate'])
      expect(VERIFY, claim).toContain(claim);
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
      'release_capture_session(uuid, uuid)',
      'refund_scan_claim(text, date, text)',
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
    // One inner block that always ends by raising a private sentinel the function itself catches: that is what rolls the checks back,
    // so it does not depend on how a client wraps a script in a transaction. Only the sentinel is swallowed; a real failure aborts.
    expect(code).toMatch(/raise exception 'verification complete - rolling back' using errcode = 'VK001'/);
    expect(code).toMatch(/exception when sqlstate 'VK001' then\s+null;/);
    expect(code.match(/exception when sqlstate/g)).toHaveLength(1);
    expect(code).not.toMatch(/\bcommit\b/i);
    expect(code).toMatch(/enforcement is OFF on entry/);
  });

  it('the verification is Supabase SQL Editor compatible: no psql meta-command, no psql variable, no transaction-control statement', () => {
    const lines = VERIFY.split('\n').filter((l) => !l.trim().startsWith('--'));
    expect(lines.filter((l) => /^\s*\\/.test(l)), 'a line starts with a backslash (psql meta-command)').toEqual([]);
    expect(VERIFY).not.toMatch(/\\gset|\\if\b|\\endif|\\set\b|\\echo/);
    // `:name` psql variables (not casts `::`, not inside quoted strings like 'd5.x').
    const code = lines.join('\n').replace(/'(?:[^']|'')*'/g, "''").replace(/\$q\$[\s\S]*?\$q\$/g, '');
    expect(code.match(/(?<![:\w]):[a-z_]+\b/g) ?? [], 'a psql :variable is used').toEqual([]);
    expect(code).not.toMatch(/^\s*(begin|rollback|commit)\s*;/im);
    // The editor shows only the last statement's rows and never RAISE NOTICE: the last statement must be the result row.
    const statements = code.split(';').map((s) => s.trim()).filter(Boolean);
    expect(statements.at(-1)).toMatch(/^select case when[\s\S]*from \(select pg_temp\.vk_run\(\) as r\) x$/);
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
    expect(out).toContain('verification: 111 checks passed');
    expect(out).toContain('ALL LOCAL ACCEPTANCE STEPS PASSED');
    expect(out).toContain('suite fails when: the discoveries gate is dropped');
  }, 250_000);
});

/*
 * The one-photo rule has five homes: the migration, the TypeScript contract, the edge copy, the client and the
 * receipt contract document. Each changing alone is a silent drift; this pins them to one number.
 */
const OPR_MIGRATION = read('supabase/migrations/0016_discovery_capture_enforcement.sql');
const OPR_CONTRACT = read('docs/discoveries/discovery-receipt-contract.md');
const OPR_INDEX = read('supabase/functions/identify-plant/index.ts');
const OPR_EDGE_CAPTURE = read('supabase/functions/identify-plant/capture.ts');
const OPR_CLIENT_MIN = /export const MIN_CAPTURE_PHOTOS = 1;/.test(read('src/lib/scans.ts'));

describe('one in-app photograph is the mandatory minimum, and every layer says so', () => {
  it('the database default is min_images 1, max 3, no mandatory delay', () => {
    expect(OPR_MIGRATION).toMatch(/'min_images', 1,/);
    expect(OPR_MIGRATION).toMatch(/'max_images', 3/);
    expect(OPR_MIGRATION).toMatch(/'min_capture_ms', 0,/);
  });
  it('the TypeScript contract mirrors it', () => {
    expect(CAPTURE_CONFIG.minImages).toBe(1);
    expect(CAPTURE_CONFIG.maxImages).toBe(3);
    expect(CAPTURE_CONFIG.minCaptureMs).toBe(0);
  });
  it('the edge function copy and the client mirror it', () => {
    expect(OPR_EDGE_CAPTURE).toMatch(/export const MIN_CAPTURE_MS = 0;/);
    expect(OPR_CLIENT_MIN).toBe(true);
  });
  it('the handler lowers the floor for purpose=collect only', () => {
    expect(OPR_INDEX).toMatch(/purpose/);
    expect(OPR_INDEX).toMatch(/collect/);
  });
  it('the receipt contract document states the same numbers', () => {
    expect(OPR_CONTRACT).toMatch(/1\.\.3/);
    expect(OPR_CONTRACT).not.toMatch(/capture_duplicate_image/);
  });
});

describe('the consent gate is the first thing the only upload path does', () => {
  const SCANS = read('src/lib/scans.ts');
  it('no source file other than scans.ts invokes the identify-plant function', () => {
    // Warm-up (scan-warmup.ts) sends an OPTIONS request with no body; it is not an upload.
    const files = ['src/components/scan/ScanPanel.tsx', 'src/components/scan/ObservationPhotos.tsx', 'src/lib/scan-capture-session.ts', 'src/lib/scan-allowance.ts'];
    for (const f of files) expect(read(f), f).not.toMatch(/functions\.invoke\('identify-plant'|functions\/v1\/identify-plant/);
    expect(read('src/lib/scan-warmup.ts')).toMatch(/method: 'OPTIONS'/);
    expect(read('src/lib/scan-warmup.ts')).not.toMatch(/FormData|body:/);
  });
  it('mayTransmit runs before the image is prepared or the function is invoked', () => {
    const fn = SCANS.slice(SCANS.indexOf('export async function identifyPlant('));
    const gate = fn.indexOf('mayTransmit(');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(fn.indexOf('prepareImage('));
    expect(gate).toBeLessThan(fn.indexOf("functions.invoke('identify-plant'"));
  });
});

/* The live camera-to-collection workflow and suite stay TEST-only, secret-free and manual. */
const LCF_TEXT = read('.github/workflows/live-capture-flow.yml');
const LCF_CODE = LCF_TEXT.replace(/^\s*#.*$/gm, '');
const LCF_SPEC = read('e2e/capture-flow.e2e.test.ts');

describe('the live camera-to-collection workflow stays TEST-only, secret-free and manual', () => {
  it('is dispatch-only: no push, pull_request or schedule trigger', () => {
    expect(LCF_CODE).toMatch(/on:\s*\n\s*workflow_dispatch:/);
    expect(LCF_CODE).not.toMatch(/^\s{2}(push|pull_request|pull_request_target|schedule):/m);
  });
  it('targets the TEST project literal and never production', () => {
    expect(LCF_CODE).toContain('PROJECT_REF: vgjehmwcpavflbfhbbrp');
    expect(LCF_CODE).not.toContain('vygiamigomwlvnwkryyl');
  });
  it('reads no secret, only the public TEST anon key variable, and is read-only', () => {
    expect(LCF_CODE).not.toMatch(/secrets\./);
    expect([...new Set([...LCF_CODE.matchAll(/vars\.([A-Z_]+)/g)].map((m) => m[1]))]).toEqual(['TEST_SUPABASE_ANON_KEY']);
    expect(LCF_CODE).toMatch(/permissions:\s*\n\s*contents: read/);
  });
  it('deploys, migrates and flips nothing', () => {
    expect(LCF_CODE).not.toMatch(/functions deploy|database\/query|supabase-production|set_discovery_enforcement/i);
  });
  it('runs only the capture-flow suite', () => {
    expect(LCF_CODE).toContain('e2e/capture-flow.e2e.test.ts');
    expect(LCF_CODE).not.toContain('e2e/supabase.e2e.test.ts');
  });
});

/* The AUTONOMOUS live run: one deliberate trigger, TEST only, one credential and never in the step that runs the suite. */
const LCR_TEXT = read('.github/workflows/live-capture-run.yml');
const LCR_CODE = LCR_TEXT.replace(/^\s*#.*$/gm, '');
const LIVE_RUN_PY = read('scripts/live_run.py');
const LCR_SPEC_CP = read('e2e/capture-flow.e2e.test.ts');

describe('the autonomous live run workflow stays TEST-only, deliberate and bounded', () => {
  it('can start only from a push to integration that changes the request file', () => {
    expect(LCR_CODE).toMatch(/on:\s*\n\s{2}push:\s*\n\s{4}branches:\s*\n\s{6}- integration\s*\n\s{4}paths:\s*\n\s{6}- docs\/release\/live-run-request\.json\s*\n/);
    expect(LCR_CODE).not.toMatch(/^\s{2}(pull_request|pull_request_target|schedule|workflow_dispatch|workflow_run|issue_comment):/m);
  });
  it('names the TEST project as a literal, takes no project input and never names production', () => {
    expect(LCR_CODE).toContain('PROJECT_REF: vgjehmwcpavflbfhbbrp');
    expect(LCR_CODE).not.toContain('vygiamigomwlvnwkryyl');
    expect(LCR_CODE).not.toMatch(/inputs\./);
    expect(LIVE_RUN_PY).toContain('def require_test_only()');
  });
  it('refuses a re-run, a wrong ref, and a request that is not TEST-only, owner-authorised, enforcement-off, capped and unexpired', () => {
    for (const needle of ['GITHUB_RUN_ATTEMPT', 'refs/heads/integration', '.target == "TEST vgjehmwcpavflbfhbbrp"', '.authorized_by == "owner"', '(.enforcement == "off" or .enforcement == "on")', '. <= 2', '.skip_blank', 'fromdateiso8601 > now']) {
      expect(LCR_CODE, needle).toContain(needle);
    }
  });
  it('holds exactly one secret, SUPABASE_ACCESS_TOKEN, and the step that runs the suite holds none', () => {
    expect([...new Set([...LCR_CODE.matchAll(/secrets\.([A-Z_]+)/g)].map((m) => m[1]))]).toEqual(['SUPABASE_ACCESS_TOKEN']);
    const suiteStep = LCR_CODE.slice(LCR_CODE.indexOf('- name: Run the live camera-to-collection suite'), LCR_CODE.indexOf('- name: Summarise'));
    expect(suiteStep).toContain('npx vitest run');
    expect(suiteStep).not.toMatch(/secrets\.|SUPABASE_ACCESS_TOKEN|SERVICE_ROLE|service_role/i);
  });
  it('is read-only on the repository and deploys, migrates and flips nothing', () => {
    expect(LCR_CODE).toMatch(/permissions:\s*\n\s*contents: read/);
    expect(LCR_CODE).not.toMatch(/functions deploy|run-migration|database\/query|set_discovery_enforcement/i);
    expect(LIVE_RUN_PY).not.toMatch(/\.rpc\(/);
  });
  it('flips the TEST switch only when the request asks, proves it OFF afterwards, and always does', () => {
    expect((LIVE_RUN_PY.match(/sql\("select public\.set_discovery_enforcement\(/g) ?? []).length).toBe(2);
    const fn = LIVE_RUN_PY.slice(LIVE_RUN_PY.indexOf('def cmd_enforce()'), LIVE_RUN_PY.indexOf('def cmd_summary()'));
    expect(fn).toContain('the request does not ask for enforcement ON');
    expect(fn).toContain('enforcement is not verifiably OFF before the switch');
    expect(fn).toContain('ENFORCEMENT IS NOT PROVEN OFF');
    expect(LCR_CODE).toMatch(/if: needs\.preflight\.outputs\.enforcement == 'on'\s*\n(?:.*\n){1,4}\s+run: python3 scripts\/live_run\.py enforce on/);
    expect(LCR_CODE).toMatch(/name: Prove TEST enforcement is OFF[^\n]*\n\s+if: always\(\)/);
  });
  it('gives the suite counters without giving it the token: a separate helper process answers file checkpoints', () => {
    expect(LCR_CODE).toContain('python3 scripts/live_run.py watch');
    expect(LCR_SPEC_CP).toContain('E2E_CHECKPOINT_DIR');
  });
  it('verifies before it spends: the live job needs the preflight job, and cleanup always runs', () => {
    expect(LCR_CODE).toMatch(/live:\s*\n\s+needs: preflight/);
    expect(LCR_CODE).toMatch(/name: Delete only the accounts this run created\s*\n\s+if: always\(\)/);
    expect(LCR_CODE).toContain('python3 scripts/live_run.py preflight');
  });
  it('obtains no service-role key at all, and masks every credential it handles', () => {
    expect(LIVE_RUN_PY).not.toMatch(/reveal=true|\/auth\/v1\/admin\/|admin_headers|service_role"/);
    expect(LIVE_RUN_PY).toContain('mask(key)');
    expect(LIVE_RUN_PY).toContain('mask(password)');
    expect(LIVE_RUN_PY).not.toMatch(/save_state\([^)]*password/);
  });
  it('deletes only accounts it created: exact id AND exact email, from this run id', () => {
    expect(LIVE_RUN_PY).toContain("and email = {sql_literal(expect[role])} returning id::text");
    expect(LIVE_RUN_PY).toContain('plantdex-e2e-capture-{role}-{stamp}@mailinator.com');
    expect(LIVE_RUN_PY).not.toMatch(/like\s+'/i);
  });
  it('a prerequisite that cannot be verified is a failure, never a pass', () => {
    expect(LIVE_RUN_PY).toContain('credentials are UNVERIFIED, which is a failure');
    expect(LIVE_RUN_PY).toContain('sys.exit(1)');
  });
});

describe('the live suite itself', () => {
  it('refuses any project but TEST and skips without credentials', () => {
    expect(LCF_SPEC).toContain("const TEST_REF = 'vgjehmwcpavflbfhbbrp'");
    expect(LCF_SPEC).toMatch(/describe\.skipIf\(!configured\)/);
  });
  it('mocks no backend: it uses the real client, the real RPCs and the deployed function', () => {
    expect(LCF_SPEC).not.toMatch(/vi\.mock|vi\.fn|nock|msw/);
    expect(LCF_SPEC).toContain("functions.invoke('identify-plant'");
    expect(LCF_SPEC).toContain("rpc('open_capture_session')");
    expect(LCF_SPEC).toContain("rpc('claim_discovery'");
  });
  it('covers forged, expired and wrong-account receipts, replay, reuse and the real provider no-plant answer', () => {
    for (const t of ['FORGED RECEIPT', 'EXPIRED RECEIPT', 'CROSS-ACCOUNT', 'REPLAY', 'REUSE', 'PROVIDER, REAL']) expect(LCF_SPEC, t).toContain(t);
  });
  it('never carries a service-role key', () => {
    expect(LCF_SPEC).not.toMatch(/SERVICE_ROLE|service_role_key|sb_secret_/i);
  });
});

/*
 * EVERY RPC THE APP AND THE EDGE FUNCTIONS CALL EXISTS IN A MIGRATION WITH EXACTLY THOSE ARGUMENT NAMES.
 *
 * A call with a missing or misspelled named argument is not a type error and not a test failure: PostgREST answers
 * "function not found in the schema cache", the caller swallows it (receipts, refunds and releases are best-effort by
 * design), and the feature silently does nothing. That is how a two-argument refund call survived review. This reads the
 * migrations, parses each function's parameter names, and compares them with the keys at every call site.
 */
describe('RPC call sites match the deployed SQL signatures', () => {
  const SQL = ['0009_atomic_scan_quota.sql', '0014_confirm_scan.sql', '0016_discovery_capture_enforcement.sql']
    .map((f) => read(`supabase/migrations/${f}`))
    .join('\n');
  /** Declared parameter names; `optional` marks those with a SQL default (a caller may omit them). */
  function signature(fn: string): Array<{ name: string; optional: boolean }> | null {
    const m = new RegExp(`function public\\.${fn}\\s*\\(([^)]*)\\)`, 'i').exec(SQL);
    if (!m) return null;
    return (m[1] ?? '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ name: p.split(/\s+/)[0] ?? '', optional: /\bdefault\b/i.test(p) }));
  }
  const params = (fn: string): string[] | null => signature(fn)?.map((p) => p.name) ?? null;
  const FILES = [
    'src/lib/scan-capture-session.ts',
    'supabase/functions/identify-plant/capture.ts',
    'supabase/functions/identify-plant/index.ts',
  ];
  const calls: Array<{ file: string; fn: string; keys: string[] }> = [];
  for (const file of FILES) {
    const text = read(file);
    for (const m of text.matchAll(/\.rpc\(\s*'(\w+)'\s*(?:,\s*\{([^}]*)\})?/g)) {
      const keys = [...(m[2] ?? '').matchAll(/(\bp_\w+)\s*:/g)].map((k) => k[1]!);
      calls.push({ file, fn: m[1]!, keys });
    }
  }
  it('found the call sites (an empty list would pass everything below)', () => {
    expect(calls.length).toBeGreaterThanOrEqual(7);
    expect(calls.map((c) => c.fn)).toEqual(expect.arrayContaining(['open_capture_session', 'claim_discovery', 'consume_capture_session', 'issue_capture_receipts']));
  });
  it.each(['open_capture_session', 'claim_discovery', 'discovery_rules', 'consume_capture_session', 'issue_capture_receipts', 'release_capture_session', 'claim_scan_pair'])(
    '%s is defined in a migration',
    (fn) => {
      expect(params(fn), `${fn} is called but no migration defines it`).not.toBeNull();
    },
  );
  it('every call passes exactly the named arguments the SQL function declares', () => {
    for (const call of calls) {
      const declared = signature(call.fn);
      if (declared === null) continue; // a function from an earlier migration this pin does not read
      const required = declared.filter((p) => !p.optional).map((p) => p.name).sort();
      const all = declared.map((p) => p.name);
      expect([...call.keys].sort().filter((k) => !all.includes(k)), `${call.file}: ${call.fn} passes an argument the SQL does not declare`).toEqual([]);
      expect(call.keys.filter((k) => required.includes(k)).sort(), `${call.file}: ${call.fn} omits a required argument`).toEqual(required);
    }
  });
  it('the refund RPC, once called from the handler, passes all three arguments', () => {
    const index = read('supabase/functions/identify-plant/index.ts');
    if (!index.includes("'refund_scan_claim'")) return; // not wired yet (S8): nothing to compare
    expect(params('refund_scan_claim')).toEqual(['p_bucket', 'p_day', 'p_observation_id']);
    const m = /\.rpc\(\s*'refund_scan_claim'\s*,\s*\{([^}]*)\}/.exec(index);
    expect([...(m?.[1] ?? '').matchAll(/(\bp_\w+)\s*:/g)].map((k) => k[1]).sort()).toEqual(['p_bucket', 'p_day', 'p_observation_id']);
  });
});
