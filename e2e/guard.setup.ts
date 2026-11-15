import { assertLiveConfigured, assertTestProject } from './e2e-guard';

// Runs before every live suite. Throws, loudly, if .env.local points anywhere but the test project.
assertTestProject(process.env.NEXT_PUBLIC_SUPABASE_URL);
// A workflow sets PLANTDEX_E2E_REQUIRED=1, and then missing configuration fails instead of skipping.
assertLiveConfigured(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.PLANTDEX_E2E_REQUIRED === '1',
);
