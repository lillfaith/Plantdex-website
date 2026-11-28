import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasImportBeenOffered, markImportOffered } from './import-local-progress';

/**
 * Full network-backed import (importLocalProgress, hasLocalProgressToImport) needs a real
 * or mocked Supabase client and IndexedDB, and is exercised by the Playwright suite instead
 * — see the V0.3 plan's verification section. This covers the pure, storage-only half:
 * the "has this already been offered" flag that stops the dialog from nagging twice.
 *
 * Vitest runs in a plain Node environment (no DOM), so `window` is stubbed here rather
 * than pulling in jsdom for one small flag.
 */
function fakeLocalStorage(): Storage {
  const backing = new Map<string, string>();
  return {
    getItem: (key) => backing.get(key) ?? null,
    setItem: (key, value) => void backing.set(key, value),
    removeItem: (key) => void backing.delete(key),
    clear: () => backing.clear(),
    key: (index) => [...backing.keys()][index] ?? null,
    get length() {
      return backing.size;
    },
  };
}

const ALICE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BOB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('hasImportBeenOffered / markImportOffered', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: fakeLocalStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false until marked, then stays true', () => {
    expect(hasImportBeenOffered(ALICE)).toBe(false);
    markImportOffered(ALICE);
    expect(hasImportBeenOffered(ALICE)).toBe(true);
  });

  // The flag used to be one global key, so importing into the first account on a shared
  // device silently denied the offer to every account that signed in afterwards.
  it('tracks each account separately', () => {
    markImportOffered(ALICE);
    expect(hasImportBeenOffered(ALICE)).toBe(true);
    expect(hasImportBeenOffered(BOB)).toBe(false);

    markImportOffered(BOB);
    expect(hasImportBeenOffered(BOB)).toBe(true);
    expect(hasImportBeenOffered(ALICE)).toBe(true);
  });

  // Fail closed: a browser that throws on storage access must not nag on every sign-in.
  it('reports "already offered" when storage is unavailable', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem() {
          throw new Error('storage disabled');
        },
      },
    });
    expect(hasImportBeenOffered(ALICE)).toBe(true);
  });
});

// ── The import never sends self-declared collectibles ────────────────────────────────────────
import { readFileSync } from 'node:fs';

const h = vi.hoisted(() => ({
  calls: [] as { table: string; rows: unknown }[],
  refuse: ((): { code?: string } | null => null) as (t: string, rows: unknown) => { code?: string } | null,
  state: { discoveries: {}, learned: {}, mastered: {}, research: {}, achievements: {} } as Record<string, Record<string, string>>,
  sightings: [] as Record<string, unknown>[],
  finds: [] as Record<string, unknown>[],
}));

vi.mock('./supabase-client', () => ({
  supabase: {
    from: (table: string) => ({
      upsert: async (rows: unknown) => {
        h.calls.push({ table, rows });
        return { error: h.refuse(table, rows) };
      },
    }),
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
  },
}));
vi.mock('./storage', () => ({ createLocalStorageAdapter: () => ({ load: async () => h.state }) }));
vi.mock('./sightings', () => ({ getAllSightings: () => h.sightings }));
vi.mock('./local-seed-shelf', () => ({ getLocalFinds: () => h.finds }));
vi.mock('./remote-seed-shelf', () => ({ findToRow: (_u: string, f: { id: string }) => ({ id: f.id }) }));
vi.mock('./species-packets', () => ({ ensureCanonicalPackets: async () => undefined }));

describe('importLocalProgress: local collectibles stay on the device', () => {
  beforeEach(() => {
    h.calls = [];
    h.refuse = () => null;
    h.state = {
      discoveries: { a: 't', b: 't', c: 't' },
      learned: { a: 't' },
      mastered: { a: 't', b: 't' },
      research: { r: 't' },
      achievements: { first: 't' },
    };
    h.sightings = [{ id: 's1', herbId: 'a', date: 'd', createdAt: 'c' }, { id: 's2', herbId: 'b', date: 'd', createdAt: 'c' }, { id: 's3', herbId: 'c', date: 'd', createdAt: 'c' }];
    h.finds = [];
  });

  it('never writes discoveries, learned, mastered, research or achievements', async () => {
    const { importLocalProgress } = await import('./import-local-progress');
    const out = await importLocalProgress(ALICE);
    const tables = new Set(h.calls.map((c) => c.table));
    expect(tables).toEqual(new Set(['sightings']));
    expect(out.ok).toBe(true);
  });

  it('still imports sightings and reports leftOnDevice counts', async () => {
    const { importLocalProgress } = await import('./import-local-progress');
    const out = await importLocalProgress(ALICE);
    expect(out.parts.sightings).toMatchObject({ total: 3, imported: 3, refused: 0, failed: 0 });
    expect(out.leftOnDevice).toEqual({ discoveries: 3, learned: 1, mastered: 2, research: 1 });
  });

  it('isolates a permanently refused row: valid rows land, offer is not reopened', async () => {
    h.refuse = (t, rows) => (t === 'sightings' && (rows as { id: string }).id === 's2' ? { code: '42501' } : null);
    const { importLocalProgress } = await import('./import-local-progress');
    const out = await importLocalProgress(ALICE);
    expect(out.parts.sightings).toMatchObject({ total: 3, imported: 2, refused: 1, failed: 0 });
    expect(out.refused).toEqual(['sightings']);
    expect(out.ok).toBe(true);
  });

  it('treats a transient failure as a failure so the offer stays open', async () => {
    h.refuse = (t, rows) => (t === 'sightings' && (rows as { id: string }).id === 's1' ? { code: '08006' } : null);
    const { importLocalProgress } = await import('./import-local-progress');
    const out = await importLocalProgress(ALICE);
    expect(out.parts.sightings).toMatchObject({ imported: 2, failed: 1 });
    expect(out.ok).toBe(false);
    expect(out.failed).toEqual(['sightings']);
  });

  it('falls back row by row when a seed shelf batch is refused', async () => {
    h.sightings = [];
    h.finds = [{ id: 'f1', speciesKey: 'x', foundAt: '1' }, { id: 'f2', speciesKey: 'y', foundAt: '1' }];
    h.refuse = (t, rows) => {
      if (t !== 'seed_shelf') return null;
      const r = rows as { id: string }[];
      return r.length > 1 || r[0]?.id === 'f2' ? { code: '42501' } : null;
    };
    const { importLocalProgress } = await import('./import-local-progress');
    const out = await importLocalProgress(ALICE);
    expect(out.parts['seed shelf']).toMatchObject({ total: 2, imported: 1, refused: 1, failed: 0 });
    expect(out.ok).toBe(true);
  });

  it('having only local discoveries does not by itself earn the offer', async () => {
    h.sightings = [];
    const { hasLocalProgressToImport } = await import('./import-local-progress');
    expect(await hasLocalProgressToImport()).toBe(false);
  });

  it('offer flag is untouched by the import itself (the dialog owns it)', async () => {
    vi.stubGlobal('window', { localStorage: fakeLocalStorage() });
    const { importLocalProgress, hasImportBeenOffered: offered } = await import('./import-local-progress');
    await importLocalProgress(ALICE);
    expect(offered(ALICE)).toBe(false);
    vi.unstubAllGlobals();
  });

  it('source never writes a collectible table', () => {
    const src = readFileSync(new URL('./import-local-progress.ts', import.meta.url), 'utf8');
    for (const t of ['discoveries', 'learned', 'mastered', 'research', 'research_completions', 'unlocked_achievements']) {
      expect(src).not.toMatch(new RegExp(`from\\(\\s*['"\`]${t}['"\`]`));
      expect(src).not.toMatch(new RegExp(`upsertTimestampRows\\(\\s*['"\`]${t}['"\`]`));
    }
    expect(src).not.toMatch(/\.(insert|upsert)\([^)]*(discover|learned|mastered)/);
  });
});
