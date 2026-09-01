import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { confidenceBand, matchScientificName } from './plant-match';

const FUNCTION = 'supabase/functions/identify-plant/index.ts';
/*
 * Comments removed AND whitespace collapsed.
 *
 * The collapse is not cosmetic: JSX wraps prose across lines, so "the plant is safe\n to
 * eat" does not match /safe to eat/ in raw source. This test passed for exactly that reason
 * until the wrap was noticed — a forbidden claim was sitting in the file it was meant to
 * police. Anything that reads as one phrase to a person must read as one phrase here.
 */
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').replace(/\s+/g, ' ');

function sourceFiles(dir = 'src'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

/** Every file that renders any part of the scan flow. */
function scanUiFiles(): string[] {
  return sourceFiles().filter((path) => /scan/i.test(path) && /\.tsx$/.test(path));
}

describe('identification is never a safety verdict', () => {
  it('actually has scan UI to check', () => {
    /*
     * Without this the two tests below pass by scanning an empty file list — which they did
     * while the UI was still unwritten. A guard that cannot fail is not a guard; this is the
     * same lesson the analytics emitted-event check taught.
     */
    expect(scanUiFiles().length, 'no scan UI found — the safety checks would be vacuous')
      .toBeGreaterThan(0);
    expect(scanUiFiles().some((path) => /ScanCaution/.test(path))).toBe(true);
  });

  it('never claims a plant is safe, edible or confirmed', () => {
    /*
     * THE TEST THAT MATTERS FOR PLANT ID.
     *
     * A photograph identified at 97% is still a guess made from pixels, and the failure this
     * guards against is the one that hurts somebody: a screen that reads as "yes, this is
     * X" being taken as "yes, you can eat this". The words below may never appear in the
     * scan flow, at any confidence.
     */
    for (const path of scanUiFiles()) {
      const source = strip(readFileSync(path, 'utf8'));
      for (const forbidden of [
        /safe to (eat|consume|use|forage)/i,
        /\bedible\b/i,
        /confirmed safe/i,
        /verified\s+(plant|species|identification)/i,
        /you can (eat|consume|use) (this|it)/i,
        /100%\s*(sure|certain|match)/i,
        /definitely\b/i,
      ]) {
        expect(source, `${path} makes a safety or certainty claim: ${forbidden}`).not.toMatch(
          forbidden,
        );
      }
    }
  });

  it('carries the caution unconditionally, never gated on confidence', () => {
    /*
     * A caution that fades as the score rises is worse than none: it trains a reader to
     * treat a high number as permission. So the caution must not sit inside any branch that
     * reads a score. Checked structurally — the rendered caution may not appear in the same
     * expression as a comparison against a score or band.
     */
    for (const path of scanUiFiles()) {
      const source = strip(readFileSync(path, 'utf8'));
      const gated =
        /(score|confidence|band)\s*[<>=]{1,3}[^\n]{0,80}&&[^\n]{0,120}(caution|warning|never eat|not an identification)/i;
      expect(source, `${path} gates the safety caution on confidence`).not.toMatch(gated);
    }
  });

  it('has no confidence band that means certainty', () => {
    // There are three bands and none of them is "certain". A fourth that implied it would
    // be the single most dangerous word in this feature.
    expect(new Set([confidenceBand(1), confidenceBand(0.5), confidenceBand(0)])).toEqual(
      new Set(['strong', 'moderate', 'weak']),
    );
  });

  it('cannot confirm a discovery for a related species', () => {
    // Belt and braces alongside plant-match.test.ts: the honesty rule restated where the
    // safety rules live, because these two are the same rule seen from different sides.
    expect(matchScientificName('Taraxacum erythrospermum').confirmable).toBe(false);
  });
});

describe('the identify-plant function', () => {
  it('exists and answers a CORS preflight', () => {
    expect(existsSync(FUNCTION), 'identify-plant function is missing').toBe(true);
    const source = readFileSync(FUNCTION, 'utf8');
    // Without an OPTIONS handler the browser blocks every call before it is sent, and no
    // Node test can see it — this exact bug once silently killed mastery for every player.
    expect(source).toMatch(/OPTIONS.*204|204.*OPTIONS/s);
  });

  it('keeps the provider key server-side only', () => {
    const fn = readFileSync(FUNCTION, 'utf8');
    expect(fn).toMatch(/Deno\.env\.get\('PLANTNET_API_KEY'\)/);
    for (const path of sourceFiles()) {
      const source = strip(readFileSync(path, 'utf8'));
      expect(source, `${path} references the provider key`).not.toMatch(
        /PLANTNET_API_KEY|plantnet.*api.?key/i,
      );
      // The client must not know the provider's hostname either — it talks to our function.
      expect(source, `${path} calls the provider directly`).not.toMatch(/my-api\.plantnet\.org/);
    }
  });

  it('rate-limits anonymous callers more tightly than signed-in ones, under a global cap', () => {
    const fn = readFileSync(FUNCTION, 'utf8');
    const read = (name: string) => {
      const match = fn.match(new RegExp(`const ${name} = (\\d+)`));
      expect(match, `${name} not found`).not.toBeNull();
      return Number(match![1]);
    };
    const anon = read('ANON_DAILY_LIMIT');
    const user = read('USER_DAILY_LIMIT');
    const global = read('GLOBAL_DAILY_LIMIT');

    expect(anon, 'anonymous scanning must be allowed at all').toBeGreaterThan(0);
    expect(user, 'signing in must raise the limit, not lower it').toBeGreaterThan(anon);
    // The backstop that stops a busy day exhausting a shared allowance at the provider.
    expect(global).toBeGreaterThan(user);
    expect(global, 'stay under the free tier with headroom to notice').toBeLessThanOrEqual(500);
  });

  it('stores no raw IP address', () => {
    /*
     * Anonymous callers need a quota bucket they never chose to give, which is the one place
     * this feature could quietly start collecting something. The bucket is a salted daily
     * hash; the address itself must never be written or returned.
     */
    const fn = readFileSync(FUNCTION, 'utf8');
    expect(fn).toMatch(/crypto\.subtle\.digest\('SHA-256'/);
    expect(fn, 'the salt must include the day so buckets cannot be joined across days').toMatch(
      /QUOTA_SALT.*day.*ip|\$\{QUOTA_SALT\}:\$\{day\}:\$\{ip\}/s,
    );
    const stripped = strip(fn);
    // `ip` may be read, but never inserted or echoed back.
    expect(stripped).not.toMatch(/insert[^\n]*\bip\b|json\([^)]*\bip\b/);
  });

  it('writes no discovery of its own', () => {
    // Confirmation is always an explicit tap in the UI. The function returns candidates and
    // touches none of the progression tables.
    const fn = strip(readFileSync(FUNCTION, 'utf8'));
    for (const table of ['discoveries', 'learned', 'mastered', 'unlocked_achievements']) {
      expect(fn, `identify-plant writes to ${table}`).not.toContain(table);
    }
  });
});

describe('scan data is deleted and exported like everything else', () => {
  it('is erased by account deletion', () => {
    // The easiest thing to forget, and it would make "we keep no copy" false.
    const fn = readFileSync('supabase/functions/delete-account/index.ts', 'utf8');
    const tables = fn.match(/const USER_TABLES = \[([\s\S]*?)\]/);
    expect(tables, 'USER_TABLES not found').not.toBeNull();
    expect(tables![1], 'scans are not deleted with the account').toContain("'scans'");
  });

  it('is included in the data export', () => {
    const source = readFileSync('src/lib/export-account-data.ts', 'utf8');
    expect(source).toMatch(/from\('scans'\)/);
    expect(source).toMatch(/scans:/);
  });

  it('has a scans table with no update policy', () => {
    const sql = readFileSync('supabase/migrations/0002_scans.sql', 'utf8');
    expect(sql).toMatch(/create policy "own scans read"/);
    expect(sql).toMatch(/create policy "own scans insert"/);
    expect(sql).toMatch(/create policy "own scans delete"/);
    /*
     * `for all` silently includes update, and an updatable scan row is a rewritable record
     * of what somebody photographed. Same rule as every table in 0001.
     */
    expect(sql, 'a scans update policy would let a record be rewritten').not.toMatch(
      /create policy[^\n]*scans[^\n]*\n?\s*for (all|update)/i,
    );
  });

  it('keeps the quota table unreadable by any client', () => {
    const sql = readFileSync('supabase/migrations/0002_scans.sql', 'utf8');
    expect(sql).toMatch(/alter table public\.scan_quota enable row level security/);
    // RLS on with no policies means only the service role reaches it. A policy here would be
    // a way for a client to read or reset its own quota.
    expect(sql).not.toMatch(/create policy[^\n]*scan_quota/i);
  });
});

/*
 * CAN A PLAYER FIND IT AT ALL?
 *
 * Plant ID shipped reachable from exactly one place: a panel near the bottom of the Herbdex,
 * under the collection footer. Moved above the grid it was still beneath the progress cluster
 * — measured at y=563 on a 390x720 phone against a bottom-nav floor of y=662, so a strip of
 * it cleared the bar and nothing else did. The report both times was "I can't find the
 * button", which is indistinguishable from the feature not existing.
 *
 * A working feature nobody can reach is a broken feature. These pin the entry points; the
 * live browser check measures that they are actually above the fold, which is the half a
 * source-reading test cannot see.
 */
describe('Plant ID is reachable', () => {
  const HOME = 'src/app/page.tsx';
  const HERBDEX = 'src/app/herbdex/page.tsx';
  const source = (path: string) => readFileSync(path, 'utf8');

  it('is linked from the front page and from the Herbdex', () => {
    for (const page of [HOME, HERBDEX]) {
      expect(source(page), `${page} must offer a way into Plant ID`).toContain('href="/scan"');
    }
  });

  it('offers it on the Herbdex before the collection grid', () => {
    // Ordering is the whole point: below the grid is where it spent two releases being
    // invisible. A player who cannot name the plant in front of them is not going to scroll
    // 45 silhouettes to find the thing that would tell them.
    const herbdex = source(HERBDEX);
    expect(herbdex.indexOf('href="/scan"')).toBeLessThan(herbdex.indexOf('<HerbGrid'));
  });

  it('names the action in words a person would look for', () => {
    for (const page of [HOME, HERBDEX]) {
      expect(source(page)).toContain('Identify a plant');
    }
  });
});
