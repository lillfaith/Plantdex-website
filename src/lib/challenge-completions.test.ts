import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCompletionRows, readCompletions, type CompletionsClient } from './challenge-completions';

function client(result: { data: unknown; error: unknown } | 'throw', seen?: string[]): CompletionsClient {
  return {
    from: (table) => ({
      select: (columns) => ({
        eq: (c1, v1) => ({
          eq: async (c2, v2) => {
            seen?.push(`${table}|${columns}|${c1}=${v1}|${c2}=${v2}`);
            if (result === 'throw') throw new Error('network');
            return result;
          },
        }),
      }),
    }),
  };
}

describe('reading the server record of passed rounds', () => {
  it('asks only for this player and this plant, from the one table, selecting one column', async () => {
    const seen: string[] = [];
    await readCompletions(client({ data: [], error: null }, seen), 'user-1', 'taraxacum-officinale');
    expect(seen).toEqual(['challenge_completions|activity_id|user_id=user-1|herb_id=taraxacum-officinale']);
  });

  it('turns rows into the set of passed rounds, ignoring anything that is not a real round', () => {
    const rows = [{ activity_id: 'part-spotter' }, { activity_id: 'compare' }, { activity_id: 'nonsense' }, null, {}, { activity_id: 7 }];
    expect([...parseCompletionRows(rows)].sort()).toEqual(['compare', 'part-spotter']);
    expect(parseCompletionRows('x').size).toBe(0);
  });

  it('an empty answer is a real "none yet"', async () => {
    const read = await readCompletions(client({ data: [], error: null }), 'u', 'h');
    expect(read).toEqual({ ok: true, passed: new Set() });
  });

  it('every failure is an error, never an empty set', async () => {
    expect(await readCompletions(client({ data: null, error: { message: 'x' } }), 'u', 'h')).toEqual({ ok: false });
    expect(await readCompletions(client({ data: null, error: null }), 'u', 'h')).toEqual({ ok: false });
    expect(await readCompletions(client({ data: 'oops', error: null }), 'u', 'h')).toEqual({ ok: false });
    expect(await readCompletions(client('throw'), 'u', 'h')).toEqual({ ok: false });
    expect(await readCompletions(null, 'u', 'h')).toEqual({ ok: false });
  });
});

describe('the read is read-only, and a late answer never wins', () => {
  const src = readFileSync('src/lib/challenge-completions.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  it('never writes: no insert, update, delete, upsert or rpc', () => {
    expect(src).not.toMatch(/\.(insert|update|delete|upsert|rpc)\(/);
    expect(src).not.toMatch(/functions\.invoke/);
  });
  it('drops an answer that is stale, cancelled, or for another player or plant', () => {
    expect(src).toMatch(/let cancelled = false/);
    expect(src).toMatch(/seq !== latest\.current/);
    expect(src).toMatch(/result\.key !== key/);
    expect(src).toMatch(/cancelled = true/);
  });
  it('treats a stale answer as loading, never as a result', () => {
    expect(src).toMatch(/!result \|\| result\.key !== key\) state = \{ status: 'loading' \}/);
  });
  it('is kept apart from the preview record', () => {
    const session = readFileSync('src/lib/boss-session.ts', 'utf8');
    expect(src).not.toMatch(/boss-session/);
    expect(session).not.toMatch(/challenge-completions/);
  });
});
