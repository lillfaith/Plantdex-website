import { describe, expect, it } from 'vitest';

import {
  cleanConfigValue,
  headerUnsafeCharacter,
  unsafeConfigMessage,
} from './supabase-client';

/**
 * These guard the one class of config error that produces a genuinely misleading failure.
 *
 * The Supabase URL and anon key are the only app-controlled values that end up in an HTTP
 * header, and they are the only ones a human copies out of a dashboard by hand. When a
 * paste carries a smart dash or a zero-width space, `fetch` throws "String contains non
 * ISO-8859-1 code point" on every single request — a message that names no variable, no
 * character and no file, and that fires at request time rather than at startup, so it
 * reads as a network bug rather than as the one-character typo it is.
 */

const REAL_KEY = 'sb_publishable_h0-3sLBXI-fP_8GcEKKAAA_luKljl_T';

describe('cleanConfigValue', () => {
  it('leaves a good value alone', () => {
    expect(cleanConfigValue(REAL_KEY)).toBe(REAL_KEY);
    expect(cleanConfigValue('https://abc.supabase.co')).toBe('https://abc.supabase.co');
  });

  it('treats a missing variable as empty rather than throwing', () => {
    expect(cleanConfigValue(undefined)).toBe('');
  });

  it('strips the whitespace a paste picks up, including a non-breaking space', () => {
    expect(cleanConfigValue(`  ${REAL_KEY}\n`)).toBe(REAL_KEY);
    // U+00A0. `fetch` would carry this one happily and Supabase would then reject the
    // key, which sends you looking at auth rather than at the paste.
    expect(cleanConfigValue(` ${REAL_KEY} `)).toBe(REAL_KEY);
  });

  it('strips zero-width characters and a BOM from anywhere in the value', () => {
    expect(cleanConfigValue(`﻿${REAL_KEY}`)).toBe(REAL_KEY);
    expect(cleanConfigValue('sb_publish​able')).toBe('sb_publishable');
  });
});

describe('headerUnsafeCharacter', () => {
  it('passes a real URL and key', () => {
    expect(headerUnsafeCharacter(REAL_KEY)).toBeNull();
    expect(
      headerUnsafeCharacter('https://vygiamigomwlvnwkryyl.supabase.co'),
    ).toBeNull();
  });

  it('catches an en dash pasted where a hyphen belongs', () => {
    // This is the actual failure: a key copied through something that autocorrects.
    const found = headerUnsafeCharacter('sb_publishable_h0–3sLBXI');
    expect(found).toEqual({ character: '–', codePoint: 0x2013, index: 17 });
  });

  it('catches a smart quote and a stray control character', () => {
    expect(headerUnsafeCharacter('key”')?.codePoint).toBe(0x201d);
    expect(headerUnsafeCharacter('key\nmore')?.codePoint).toBe(0x0a);
  });

  it('reports the FIRST offender, so the message points at one place to look', () => {
    const found = headerUnsafeCharacter('ab—cd—ef');
    expect(found?.index).toBe(2);
  });

  it('counts astral characters as one position, not two', () => {
    // Naive indexing over UTF-16 units would report 3 here and send someone to the wrong
    // character of their key.
    const found = headerUnsafeCharacter('ab\u{1f331}');
    expect(found?.index).toBe(2);
    expect(found?.codePoint).toBe(0x1f331);
  });
});

describe('unsafeConfigMessage', () => {
  it('names the variable, the character, its code point and where it is', () => {
    const message = unsafeConfigMessage('NEXT_PUBLIC_SUPABASE_ANON_KEY', {
      character: '–',
      codePoint: 0x2013,
      index: 17,
    });
    expect(message).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(message).toContain('U+2013');
    expect(message).toContain('position 17');
    // The point of the message is that the reader knows what to do next.
    expect(message).toContain('Re-copy the value');
  });
});
