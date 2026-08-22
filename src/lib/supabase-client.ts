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
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export function isAccountsConfigured(): boolean {
  return supabase !== null;
}
