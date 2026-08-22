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

describe('hasImportBeenOffered / markImportOffered', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: fakeLocalStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false until marked, then stays true', () => {
    expect(hasImportBeenOffered()).toBe(false);
    markImportOffered();
    expect(hasImportBeenOffered()).toBe(true);
  });
});
