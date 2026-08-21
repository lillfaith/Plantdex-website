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
      achievements: { 'first-find': '2026-01-01T00:00:00.000Z' },
    };
    expect(parseState(state)).toEqual(state);
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
