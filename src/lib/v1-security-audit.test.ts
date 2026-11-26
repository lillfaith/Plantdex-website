import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * V1 SECURITY AUDIT, PINNED (coord/v1-qa, docs/release/v1-qa-report.md).
 *
 * These read the migrations IN ORDER and replay their `create policy` / `drop policy`
 * statements, because several earlier guards read one file at a time and so cannot see what
 * a LATER migration took away (0013 drops two insert policies that 0001 created). What
 * matters is the policy set that exists after the last migration, so that is what is pinned.
 *
 * A frontend flag is not authorisation: none of this depends on one.
 */

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');
const FUNCTIONS = join(ROOT, 'supabase', 'functions');

const files = readdirSync(MIGRATIONS).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
const sqlOf = (f: string) =>
  readFileSync(join(MIGRATIONS, f), 'utf8')
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
const ALL = files.map(sqlOf);

type Policy = { table: string; name: string; cmd: string };

/** Final policy set after replaying every migration in order. */
function finalPolicies(): Policy[] {
  const live = new Map<string, Policy>();
  for (const sql of ALL) {
    const events: { at: number; kind: 'create' | 'drop'; table: string; name: string; cmd?: string }[] = [];
    for (const m of sql.matchAll(/create policy\s+"([^"]+)"\s+on\s+([\w.]+)\s+for\s+(\w+)/gi)) {
      events.push({ at: m.index!, kind: 'create', name: m[1]!, table: m[2]!.replace(/^public\./, ''), cmd: m[3]!.toLowerCase() });
    }
    for (const m of sql.matchAll(/drop policy(?: if exists)?\s+"([^"]+)"\s+on\s+([\w.]+)/gi)) {
      events.push({ at: m.index!, kind: 'drop', name: m[1]!, table: m[2]!.replace(/^public\./, '') });
    }
    events.sort((a, b) => a.at - b.at);
    for (const e of events) {
      const key = `${e.table}::${e.name}`;
      if (e.kind === 'create') live.set(key, { table: e.table, name: e.name, cmd: e.cmd! });
      else live.delete(key);
    }
  }
  return [...live.values()];
}

const POLICIES = finalPolicies();
const cmdsOn = (table: string) => POLICIES.filter((p) => p.table === table).map((p) => p.cmd).sort();

describe('the migrations parse', () => {
  it('found 0001 through at least 0013 and a non-trivial policy set', () => {
    expect(files[0]).toMatch(/^0001_/);
    expect(files.length).toBeGreaterThanOrEqual(13);
    expect(POLICIES.length).toBeGreaterThan(20);
  });
});

describe('write-once, after the LAST migration', () => {
  const RECORDS = ['discoveries', 'learned', 'sightings', 'unlocked_achievements', 'seed_shelf', 'scans'];

  it('no table grants a client UPDATE except profiles, and none uses FOR ALL', () => {
    const updaters = POLICIES.filter((p) => p.cmd === 'update' || p.cmd === 'all').map((p) => p.table);
    expect(updaters).toEqual(['profiles']);
  });

  it.each(RECORDS)('%s can be read, inserted and deleted by its owner and nothing else', (table) => {
    expect(cmdsOn(table)).toEqual(['delete', 'insert', 'select']);
  });

  it('mastered and research_completions have NO client insert: only herbdex-action writes them', () => {
    // 0001 created these two policies and 0013 dropped them. Read one file at a time, the
    // pre-0013 guards would still see the insert and a regression would look like the design.
    expect(cmdsOn('mastered')).not.toContain('insert');
    expect(cmdsOn('research_completions')).not.toContain('insert');
  });

  it.each(['challenge_completions', 'boss_forms', 'entitlements'])('%s is read-only to every client', (table) => {
    expect(cmdsOn(table)).toEqual(['select']);
  });

  it.each(['deck_claims', 'scan_quota'])('%s has no policy at all, so RLS means nobody', (table) => {
    expect(cmdsOn(table)).toEqual([]);
  });

  it('the global registries are read-only to every client', () => {
    expect(cmdsOn('species_packets')).toEqual(['select']);
    expect(cmdsOn('app_settings')).toEqual(['select']);
  });
});

describe('every public table has row level security', () => {
  it('enables it for each table any migration creates', () => {
    const joined = ALL.join('\n');
    const created = [...joined.matchAll(/create table if not exists public\.(\w+)/gi)].map((m) => m[1]);
    expect(created.length).toBeGreaterThan(15);
    for (const table of new Set(created)) {
      expect(joined, `${table} has no "enable row level security"`).toMatch(
        new RegExp(`alter table public\\.${table}\\s+enable row level security`, 'i'),
      );
    }
  });
});

describe('SECURITY DEFINER functions', () => {
  const joined = ALL.join('\n');
  const definers = [...joined.matchAll(/create or replace function public\.(\w+)\s*\(([\s\S]*?)\$\$/gi)]
    .filter((m) => /security definer/i.test(m[0]))
    .map((m) => ({ name: m[1], head: m[0] }));

  it('finds the known definers', () => {
    const names = definers.map((d) => d.name);
    for (const expected of ['claim_scan', 'claim_scan_pair', 'redeem_deck_code', 'enforce_discovery_limit', 'award_challenge', 'leaderboard_standings', 'sighting_photo_exists']) {
      expect(names).toContain(expected);
    }
  });

  it.each(definers.map((d) => [d.name, d.head]))('%s pins its search_path', (_name, head) => {
    expect(head).toMatch(/set search_path\s*=\s*(public|'')/i);
  });

  it.each(definers.map((d) => d.name))('%s is explicitly revoked from anon', (name) => {
    // `revoke ... from public` does not touch the grant Supabase makes to the named `anon`
    // role by default, which is how a definer function ends up callable from the internet.
    const revokes = [...joined.matchAll(new RegExp(`revoke all on function public\\.${name}\\([^)]*\\)\\s+from([^;]*);`, 'gi'))]
      .map((m) => m[1])
      .join(' ');
    expect(revokes, `${name} is never revoked from anon`).toMatch(/\banon\b/);
  });

  it('only the functions meant for signed-in callers grant execute to authenticated', () => {
    const granted = [...joined.matchAll(/grant execute on function public\.(\w+)\([^)]*\)\s+to\s+(\w+)/gi)];
    const toAuthenticated = granted.filter((g) => g[2] === 'authenticated').map((g) => g[1]);
    // 0013 re-grants the function it redefines, so the name appears once per migration.
    // 0016 (capture enforcement): the three functions a signed-in player calls themselves. Each is
    // caller-scoped through auth.uid(); the writers (consume/issue/set/prune) are service_role only.
    expect([...new Set(toAuthenticated)].sort()).toEqual(
      ['claim_discovery', 'discovery_rules', 'leaderboard_standings', 'open_capture_session'].sort(),
    );
    const toService = granted.filter((g) => g[2] === 'service_role').map((g) => g[1]);
    expect(toService).toContain('award_challenge');
  });
});

describe('edge functions', () => {
  const dirs = readdirSync(FUNCTIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name);
  const source = (name: string) => readFileSync(join(FUNCTIONS, name, 'index.ts'), 'utf8');

  it('lists the five known functions plus identify-plant', () => {
    expect(dirs.sort()).toEqual(['challenge-submit', 'delete-account', 'herbdex-action', 'identify-plant', 'redeem-deck-code', 'seed-packet']);
  });

  it.each(dirs)('%s takes identity from the verified token, not from the request body', (name) => {
    const src = source(name);
    expect(src).toMatch(/auth\.getUser\(/);
    expect(src, 'identity read from the body').not.toMatch(/body\.(userId|user_id)|json\(\)\)\.(userId|user_id)/);
  });

  it('delete-account reads no request body at all', () => {
    expect(source('delete-account')).not.toMatch(/req\.json\(|req\.text\(|req\.formData\(/);
  });

  it.each(dirs.filter((d) => d !== 'identify-plant'))('%s answers 401 when the token does not resolve to a user', (name) => {
    expect(source(name)).toMatch(/401/);
    expect(source(name)).toMatch(/!userData|userError/);
  });

  it('no service-role key is referenced anywhere a browser bundle could reach', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [join(dir, e.name)] : [],
      );
    const offenders = walk(join(ROOT, 'src')).filter((f) => /SERVICE_ROLE|service_role/.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => f.replace(ROOT + '/', ''))).toEqual([]);
  });
});
