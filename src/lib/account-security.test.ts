import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * SOURCE-LEVEL GUARDS FOR ACCOUNT DELETION AND EXPORT.
 *
 * The real boundary is Row Level Security and the edge function's use of the caller's JWT,
 * and `e2e/supabase.e2e.test.ts` attacks both with a live second user. But that suite needs
 * credentials and is not part of `npm test`, so the two properties whose violation would be
 * catastrophic and silent are also checked here, where every build sees them:
 *
 *   1. The service-role key never reaches the browser bundle.
 *   2. No account-scoped operation takes a user id from anywhere but a verified token.
 */

const SRC = 'src';
const DELETE_FN = 'supabase/functions/delete-account/index.ts';

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

/*
 * Tests are excluded: they are not bundled, and this file necessarily names the pattern it
 * bans. Everything else under src/ ships to the browser.
 */
const clientFiles = walk(SRC).filter(
  (path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path),
);
/** Comments stripped: these files discuss the key at length, and must be free to. */
const code = (path: string) =>
  readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

describe('the service-role key stays on the server', () => {
  it('appears nowhere in the client source', () => {
    /*
     * THE ONE THAT MATTERS. Everything under src/ is compiled into a static export served
     * from GitHub Pages — there is no server-only half. A service-role key placed here would
     * be published to every visitor and would bypass every RLS policy in the project.
     */
    for (const path of clientFiles) {
      expect(code(path), `${path} references the service-role key`).not.toMatch(
        /SERVICE_ROLE|service_role|serviceRole/,
      );
    }
  });

  it('is read only from the environment, inside the function that needs it', () => {
    const fn = readFileSync(DELETE_FN, 'utf8');
    expect(fn).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
    // Never a literal. A key pasted into source is a key in git history forever.
    expect(fn, 'a key looks hard-coded').not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('is never sent in a request from the client', () => {
    for (const path of clientFiles) {
      expect(code(path), `${path} puts a key in a header`).not.toMatch(
        /['"]service[_-]?role['"]\s*:/i,
      );
    }
  });
});

describe('deletion acts only on the caller', () => {
  const fn = readFileSync(DELETE_FN, 'utf8');

  it('derives the account from the verified token, not from the request', () => {
    // The id used for every destructive step comes from `auth.getUser()` under the caller's
    // own JWT. Accepting one from the body would let any signed-in player delete any
    // account by guessing a uuid.
    expect(fn).toContain('await asCaller.auth.getUser()');
    expect(fn).toContain('const userId = userData.user.id;');
  });

  it('reads no request body at all', () => {
    const body = code(DELETE_FN);
    expect(body, 'the function parses a request body — it must not').not.toMatch(
      /req\.json\(\)|req\.text\(\)|req\.formData\(\)/,
    );
  });

  it('never widens a query beyond that one user', () => {
    const body = code(DELETE_FN);
    // Every destructive call is filtered by the derived id.
    const deletes = [...body.matchAll(/\.delete\(\)([^\n;]*)/g)].map((m) => m[1]!);
    expect(deletes.length).toBeGreaterThan(0);
    for (const tail of deletes) {
      expect(tail, `an unfiltered delete: .delete()${tail}`).toContain("eq('user_id', userId)");
    }
    expect(body).toContain('deleteUser(userId)');
  });

  it('removes the photographs before the account, so none can be orphaned', () => {
    /*
     * `storage.objects` does not cascade from `auth.users`, and the delete policy matches on
     * `auth.uid()`. Delete the user first and every photograph becomes permanently
     * unreachable — private files with no owner and no policy that can ever match them.
     */
    const photos = fn.indexOf('.remove(paths)');
    const rows = fn.indexOf('.delete().eq');
    const user = fn.indexOf('deleteUser(userId)');
    expect(photos).toBeGreaterThan(-1);
    expect(photos, 'photos must be deleted before rows').toBeLessThan(rows);
    expect(rows, 'rows must be deleted before the account').toBeLessThan(user);
  });

  it('verifies the photo folder is actually empty before reporting success', () => {
    // Storage reports per-object failures loosely; a bucket left holding private photographs
    // while the app says "deleted" is the failure this whole function exists to prevent.
    expect(fn).toContain('const remaining = await listAllPhotos(admin, userId);');
  });

  it('pages the photo listing', () => {
    // `list()` caps at 1000. One unpaged call silently leaves the remainder behind, which
    // looks exactly like success.
    expect(fn).toMatch(/offset \+= pageSize|offset: offset/);
  });

  it('sends no user id from the client', () => {
    const client = code('src/lib/delete-account.ts');
    expect(client).toContain("supabase.functions.invoke('delete-account'");
    expect(client, 'the client must not name an account to delete').not.toMatch(
      /body:\s*\{[^}]*user/i,
    );
  });

  it('clears this device only after the server confirms', () => {
    const client = readFileSync('src/lib/delete-account.ts', 'utf8');
    const failure = client.indexOf("return { ok: false, error: result?.error");
    const clear = client.indexOf('await clearLocalData();');
    // The early return on failure comes first, so a failed deletion leaves local progress
    // intact and retryable — never deleted before the thing replacing it succeeded.
    expect(failure).toBeGreaterThan(-1);
    expect(clear).toBeGreaterThan(failure);
  });
});

describe('the export reads only the caller own data', () => {
  const source = readFileSync('src/lib/export-account-data.ts', 'utf8');

  it('uses the ordinary anon-key client, so RLS scopes every read', () => {
    expect(source).toContain("import { supabase } from './supabase-client';");
    expect(code('src/lib/export-account-data.ts')).not.toMatch(/SERVICE_ROLE|createClient\(/);
  });

  it('filters every query by the signed-in user', () => {
    const selects = [...source.matchAll(/\.from\('(\w+)'\)\s*\n?\s*\.select\([^)]*\)([\s\S]{0,120}?);/g)];
    expect(selects.length).toBeGreaterThan(0);
    for (const [, table, tail] of selects) {
      expect(tail, `${table} is read without a user filter`).toContain("eq('user_id', userId)");
    }
  });

  it('fails loudly rather than exporting a partial file as if it were complete', () => {
    // Someone who downloads their data and then deletes their account has one copy. A
    // silently truncated export is the difference between keeping it and losing it.
    expect(source).toContain('throw new Error(`Could not read your ${name}');
  });

  it('never silently drops a photograph', () => {
    expect(source).toContain('omitted.push(');
    expect(source).toMatch(/reason: /);
  });
});

/*
 * SYMMETRY BETWEEN EXPORT AND DELETION.
 *
 * These two lists are the whole promise of "download everything" and "delete everything",
 * and they are kept in two different files in two different runtimes. A table added to one
 * and forgotten in the other is exactly how a "deleted" account keeps a row, or how an
 * export quietly omits something somebody was relying on before deleting. The same applies
 * to the browser keys: the signed-out export and `clearLocalData` must name the same set.
 */
describe('what is exported and what is deleted are the same set', () => {
  const exportSource = readFileSync('src/lib/export-account-data.ts', 'utf8');
  const deleteSource = readFileSync(DELETE_FN, 'utf8');

  const exportedTables = new Set(
    [...exportSource.matchAll(/\.from\('(\w+)'\)/g)].map(([, table]) => table!),
  );
  const deletedTables = new Set(
    (/const USER_TABLES = \[([\s\S]*?)\] as const;/.exec(deleteSource)?.[1] ?? '')
      .split('\n')
      .map((line) => /^\s*'(\w+)',/.exec(line)?.[1])
      .filter((name): name is string => Boolean(name)),
  );

  it('parsed both lists — an empty set would pass every check below', () => {
    expect(exportedTables.size).toBeGreaterThanOrEqual(7);
    expect(deletedTables.size).toBeGreaterThanOrEqual(7);
  });

  it('deletes every table the export can read', () => {
    for (const table of exportedTables) {
      // Storage buckets are removed separately, before any row — see the ordering argument
      // in the delete function.
      if (table === 'sighting-photos') continue;
      expect([...deletedTables], `${table} is exported but never deleted`).toContain(table);
    }
  });

  it('exports every table the deletion removes', () => {
    for (const table of deletedTables) {
      expect([...exportedTables], `${table} is deleted but never exported`).toContain(table);
    }
  });

  it('clears every browser key the device export reads', () => {
    const keys = readFileSync('src/lib/delete-account.ts', 'utf8');
    for (const key of ['STORAGE_KEY', 'REVEALS_STORAGE_KEY', 'PLAYER_PROFILE_STORAGE_KEY']) {
      expect(keys, `${key} is not cleared on deletion`).toContain(key);
    }
    expect(exportSource).toContain('PLAYER_PROFILE_STORAGE_KEY');
  });
});
