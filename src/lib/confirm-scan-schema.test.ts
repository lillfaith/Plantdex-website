import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards `0014_confirm_scan.sql`: the atomic replacement for confirmScan's delete-then-insert.
 *
 * It is the ONE way a scan row changes after insertion, so the properties that keep it safe are
 * pinned here rather than trusted: ownership, write-once, a closed set of writable columns, no
 * client update policy, and no anonymous execute.
 */
const dir = join(import.meta.dirname, '..', '..', 'supabase', 'migrations');
const sql = readFileSync(join(dir, '0014_confirm_scan.sql'), 'utf8');
const code = sql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

describe('confirm_scan migration', () => {
  it('is security definer with a pinned search_path', () => {
    expect(code).toMatch(/security definer/i);
    expect(code).toMatch(/set search_path = ''/i);
  });

  it('acts only as the caller and only on an unconfirmed row', () => {
    expect(code).toMatch(/user_id = auth\.uid\(\)/);
    expect(code).toMatch(/confirmed_herb_id is null/);
    expect(code).toMatch(/auth\.uid\(\) is null/);
  });

  it('refuses a missing or blank card id and an out-of-range probability before writing', () => {
    // Found by the independent review: a null herb id matched `confirmed_herb_id is null`, wrote
    // junk into the evidence columns and returned true. The guard must come BEFORE the update.
    const guard = code.indexOf('p_herb_id is null');
    const update = code.search(/update public\.scans/i);
    expect(guard).toBeGreaterThan(-1);
    expect(update).toBeGreaterThan(guard);
    expect(code).toMatch(/btrim\(p_herb_id\) = ''/);
    expect(code).toMatch(/p_probability < 0 or p_probability > 1/);
  });

  it('can change only the confirmed_* columns', () => {
    const set = /update public\.scans\s+set([\s\S]*?)\bwhere\b/i.exec(code)?.[1] ?? '';
    const columns = [...set.matchAll(/^\s*([a-z_]+)\s*=/gm)].map((m) => m[1]);
    expect(columns.length).toBeGreaterThan(0);
    for (const c of columns) expect(c).toMatch(/^confirmed_/);
    // Every assigned column starts with confirmed_, so the provider's own answer (top_*, confidence),
    // created_at, photo_path, outcome and user_id cannot be among them.
    for (const forbidden of ['created_at', 'photo_path', 'outcome', 'top_', 'user_id']) {
      expect(set).not.toContain(forbidden);
    }
  });

  it('grants execute to authenticated only', () => {
    expect(code).toMatch(/revoke all on function public\.confirm_scan[^;]*from public, anon/i);
    expect(code).toMatch(/grant execute on function public\.confirm_scan[^;]*to authenticated/i);
    expect(code).not.toMatch(/to (anon|public)\b/i);
  });

  it('adds no update policy: history stays write-once', () => {
    expect(code).not.toMatch(/create policy/i);
    expect(code).not.toMatch(/for update/i);
    expect(code).not.toMatch(/for all/i);
  });

  it('is the next migration in sequence', () => {
    const names = readdirSync(dir).filter((f) => /^\d{4}_/.test(f)).sort();
    expect(names.at(-1)).toBe('0014_confirm_scan.sql');
  });
});
