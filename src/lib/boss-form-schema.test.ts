import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHALLENGE_ACTIVITIES, CHALLENGE_DAILY_LIMIT, challengeBucket } from './boss-form';

const SQL = readFileSync('supabase/migrations/0012_boss_forms.sql', 'utf8');
const FN = readFileSync('supabase/functions/challenge-submit/index.ts', 'utf8');
const sqlCode = SQL.replace(/--.*$/gm, '');
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('migration 0012 gives clients no write path', () => {
  it('has only select policies on both tables', () => {
    const policies = [...sqlCode.matchAll(/create policy "[^"]+" on public\.(\w+)\s+for (\w+)/g)];
    expect(policies.map((m) => m[2])).toEqual(['select', 'select']);
    expect(policies.map((m) => m[1]).sort()).toEqual(['boss_forms', 'challenge_completions']);
    expect(sqlCode).not.toMatch(/for (insert|update|delete|all)/i);
  });
  it('revokes writes from client roles as well', () => {
    expect(sqlCode).toMatch(/revoke insert, update, delete on public\.challenge_completions from anon, authenticated/);
    expect(sqlCode).toMatch(/revoke insert, update, delete on public\.boss_forms from anon, authenticated/);
  });
  it('the award function is service-role only', () => {
    expect(sqlCode).toMatch(/grant execute on function public\.award_challenge\(uuid, text, text, boolean\) to service_role/);
    expect(sqlCode).toMatch(/revoke all on function public\.award_challenge\(uuid, text, text, boolean\) from public/);
    expect(sqlCode).not.toMatch(/grant execute[^;]*(authenticated|anon)/);
  });
  it('writes are idempotent and atomic, and re-check mastery and prerequisites', () => {
    expect((sqlCode.match(/on conflict do nothing/g) ?? []).length).toBe(2);
    expect(sqlCode).toMatch(/from public\.mastered m where m\.user_id = p_user/);
    expect(sqlCode).toMatch(/count\(\*\) from public\.challenge_completions/);
    expect(sqlCode).toMatch(/< 3/);
  });
  it('the activity check constraint equals the TypeScript list', () => {
    const listed = [...sqlCode.match(/activity_id in \(([^)]*)\)/)![1]!.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
    expect(listed.sort()).toEqual([...CHALLENGE_ACTIVITIES].sort());
  });
  it('stores no score, xp or progression value', () => {
    expect(sqlCode.replace(/row level security/g, '')).not.toMatch(/\b(xp|score|points|level)\b/i);
  });
  it('is independent of migration 0011', () => {
    expect(sqlCode).not.toMatch(/leaderboard/i);
  });
});

describe('challenge-submit', () => {
  const code = strip(FN);
  it('takes identity from the verified token and never from the body', () => {
    expect(code).toContain('caller.auth.getUser()');
    expect(code).not.toMatch(/body\.(user|userId|user_id)/);
  });
  it('reads standing under the caller session and uses the service role only for the RPC', () => {
    expect(code).toContain("caller.from('mastered')");
    expect(code).toContain("caller\n      .from('challenge_completions')");
    // the constant, its env lookup, and the one client built from it
    expect((code.match(/SERVICE_ROLE_KEY/g) ?? []).length).toBe(3);
    expect(code).toMatch(/service\.rpc\('award_challenge'/);
    expect(code).not.toMatch(/service\s*\.from\(/);
  });
  it('trusts no score or completion flag from the client', () => {
    expect(code).not.toMatch(/body\.(score|passed|completed|resolved|bossForm)/);
    expect(code).toContain('evaluateSubmission');
  });
  it('claims a durable per-user daily allowance before reading anything else', () => {
    expect(code).toContain("service.rpc('claim_scan'");
    expect(code).toContain('challengeBucket(userId)');
    expect(code.indexOf("rpc('claim_scan'")).toBeLessThan(code.indexOf('await req.json()'));
    expect(code.indexOf("rpc('claim_scan'")).toBeLessThan(code.indexOf("caller.from('mastered')"));
    expect(code).toMatch(/!\(limit > 0\)/);
    expect(CHALLENGE_DAILY_LIMIT).toBeGreaterThan(0);
    expect(challengeBucket('abc')).toBe('challenge:abc');
  });
  it('keeps its bucket apart from scanning\u2019s', () => {
    expect(challengeBucket('x').startsWith('challenge:')).toBe(true);
  });
  it('is not part of any deploy workflow yet', () => {
    expect(readFileSync('.github/workflows/deploy-function.yml', 'utf8')).not.toContain('challenge-submit');
  });
});
