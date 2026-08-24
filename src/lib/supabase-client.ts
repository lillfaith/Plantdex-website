import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client for V0.3 accounts.
 *
 * The anon key is public by design — see `.env.example` and the comment block atop
 * `src/lib/storage.ts`. Row Level Security on every table is the real boundary, not the
 * secrecy of this key.
 *
 * `null` until both env vars are configured, so the app can still run and be tested
 * signed-out (local-storage-only) before a Supabase project exists. Callers that need
 * accounts (AuthProvider, remote-herbdex-storage, remote-sightings) treat a `null` client
 * as "accounts are not configured on this deployment" rather than throwing.
 *
 * WHY THIS FILE CLEANS AND CHECKS ITS OWN CONFIG. These two values are the only
 * app-controlled content that ends up in an HTTP header: supabase-js sends the key as
 * `apikey` and as `Authorization: Bearer …` on every request. They are also, uniquely in
 * this codebase, values a human copies by hand out of a dashboard and pastes into a CI
 * settings box — which is how one of them arrived carrying a character that cannot travel
 * in a header at all, and every signup died on
 *
 *   Failed to execute 'fetch' on 'Window': Failed to read the 'headers' property from
 *   'RequestInit': String contains non ISO-8859-1 code point.
 *
 * That message names no variable, no character and no file, and it fires on every
 * request rather than at startup, so it points at the network layer instead of at the
 * one-character typo actually responsible. The checks below turn it into a startup error
 * that names the variable, the character, its code point and its position.
 */

/**
 * Zero-width characters and the byte order mark. Invisible in every editor and in the
 * dashboard box the value was copied from, so they survive proof-reading indefinitely —
 * and they are never part of an intended URL or key. Stripping them is a real fix.
 */
const INVISIBLE = /[\u200B\u200C\u200D\uFEFF]/g;

/** Strip invisible debris and surrounding whitespace from a pasted config value. */
export function cleanConfigValue(raw: string | undefined): string {
  // `trim()` covers the non-breaking space too, which is the other thing that rides along
  // on a copy-paste and is impossible to see.
  return (raw ?? '').replace(INVISIBLE, '').trim();
}

export interface UnsafeCharacter {
  character: string;
  codePoint: number;
  index: number;
}

/**
 * The first character that cannot travel in an HTTP header, or `null` if the value is
 * clean.
 *
 * Deliberately stricter than `fetch` itself, which rejects only above U+00FF: a Supabase
 * URL and key are both plain printable ASCII, so anything outside that range is wrong
 * whether or not the browser would carry it. That extra strictness is what catches a
 * non-breaking space in the middle of a key — which `fetch` accepts happily and Supabase
 * then rejects as a bad key, sending you looking in entirely the wrong place.
 */
export function headerUnsafeCharacter(value: string): UnsafeCharacter | null {
  const characters = [...value];
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index]!;
    const codePoint = character.codePointAt(0)!;
    if (codePoint < 0x20 || codePoint > 0x7e) return { character, codePoint, index };
  }
  return null;
}

/** The message shown when a config value cannot be used, written to be acted on. */
export function unsafeConfigMessage(variable: string, found: UnsafeCharacter): string {
  const hex = found.codePoint.toString(16).toUpperCase().padStart(4, '0');
  return (
    `[plantdex] ${variable} contains ${JSON.stringify(found.character)} (U+${hex}) at ` +
    `position ${found.index}, which cannot be sent in an HTTP header. This is almost ` +
    `always a copy-paste artefact — an en or em dash where a hyphen should be, a smart ` +
    `quote, or a non-breaking space. Re-copy the value from the Supabase dashboard as ` +
    `plain text. Accounts stay disabled until it is fixed; progress still saves on the ` +
    `device.`
  );
}

function configure(): SupabaseClient | null {
  const url = cleanConfigValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanConfigValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) return null;

  const entries: ReadonlyArray<readonly [string, string]> = [
    ['NEXT_PUBLIC_SUPABASE_URL', url],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey],
  ];
  for (const [variable, value] of entries) {
    const found = headerUnsafeCharacter(value);
    if (found) {
      // Degrade to the signed-out path rather than throwing: a broken deployment config
      // should not take the whole Herbdex down, and `configured: false` already has a
      // sensible message on the account page.
      console.error(unsafeConfigMessage(variable, found));
      return null;
    }
  }

  return createClient(url, anonKey);
}

export const supabase: SupabaseClient | null = configure();

export function isAccountsConfigured(): boolean {
  return supabase !== null;
}
