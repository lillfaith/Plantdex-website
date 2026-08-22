import { describe, expect, it } from 'vitest';
import {
  createMemoryAdapter,
  emptyState,
  parseState,
  STORAGE_VERSION,
} from './storage';

describe('parseState', () => {
  it('accepts a well-formed state', () => {
    const state = {
      version: STORAGE_VERSION,
      discoveries: { 'urtica-dioica': '2026-01-01T00:00:00.000Z' },
      learned: { 'urtica-dioica': '2026-01-02T00:00:00.000Z' },
      mastered: { 'urtica-dioica': '2026-01-03T00:00:00.000Z' },
      achievements: { 'first-find': '2026-01-01T00:00:00.000Z' },
    };
    expect(parseState(state)).toEqual(state);
  });

  /**
   * The migration that matters. Version 1 had no `learned` or `mastered`; falling through
   * to emptyState() would silently wipe a collection someone spent a season building.
   */
  it('migrates a version 1 state instead of discarding the collection', () => {
    const v1 = {
      version: 1,
      discoveries: {
        'urtica-dioica': '2026-01-01T00:00:00.000Z',
        'achillea-millefolium': '2026-02-01T00:00:00.000Z',
      },
      achievements: { 'first-find': '2026-01-01T00:00:00.000Z' },
    };

    const parsed = parseState(v1);

    expect(parsed.version).toBe(STORAGE_VERSION);
    expect(parsed.discoveries).toEqual(v1.discoveries);
    expect(parsed.achievements).toEqual(v1.achievements);
    // The two new stages start empty — a v1 player has learned and mastered nothing yet.
    expect(parsed.learned).toEqual({});
    expect(parsed.mastered).toEqual({});
  });

  it.each([
    ['null', null],
    ['a string', 'nope'],
    ['a number', 42],
    ['an array', [1, 2, 3]],
    ['undefined', undefined],
  ])('degrades %s to an empty collection', (_label, input) => {
    expect(parseState(input)).toEqual(emptyState());
  });

  it('rejects an unknown storage version rather than misreading it', () => {
    const parsed = parseState({ version: 999, discoveries: { a: 'x' }, achievements: {} });
    expect(parsed).toEqual(emptyState());
  });

  it('drops malformed entries but keeps valid ones', () => {
    const parsed = parseState({
      version: STORAGE_VERSION,
      discoveries: { good: '2026-01-01T00:00:00.000Z', bad: 42, alsoBad: null, empty: '' },
      achievements: 'not an object',
    });
    expect(parsed.discoveries).toEqual({ good: '2026-01-01T00:00:00.000Z' });
    expect(parsed.achievements).toEqual({});
  });

  it('never returns a prototype-polluted object', () => {
    const parsed = parseState(
      JSON.parse('{"version":1,"discoveries":{"__proto__":"x"},"achievements":{}}'),
    );
    expect(Object.keys(parsed.discoveries)).not.toContain('__proto__');
  });
});

describe('createMemoryAdapter', () => {
  it('round-trips state and clears it', () => {
    const adapter = createMemoryAdapter();
    expect(adapter.load()).toEqual(emptyState());

    const state = { ...emptyState(), discoveries: { a: '2026-01-01T00:00:00.000Z' } };
    adapter.save(state);
    expect(adapter.load()).toEqual(state);

    adapter.clear();
    expect(adapter.load()).toEqual(emptyState());
  });
});
