import { assertTestProject } from './e2e-guard';

// Runs before every live suite. Throws, loudly, if .env.local points anywhere but the test project.
assertTestProject(process.env.NEXT_PUBLIC_SUPABASE_URL);
