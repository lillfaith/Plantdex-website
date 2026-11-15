/**
 * THE LIVE SUITES MAY ONLY RUN AGAINST THE TEST PROJECT.
 *
 * They sign up users, write rows and attack the database as a second account. That belongs in
 * the test project and nowhere else, so this is an ALLOW-list, not a deny-list: a URL that is not
 * the test project is refused, which also covers a production project that did not exist when
 * this was written, a typo, and a pasted link to the wrong dashboard. With no URL set nothing
 * runs, and the suites skip themselves exactly as before.
 *
 * The refs are the ones in `supabase/README.md`. Production is named here only so the error can
 * say which mistake was made.
 */
export const TEST_PROJECT_REF = 'vgjehmwcpavflbfhbbrp';
export const PRODUCTION_PROJECT_REF = 'vygiamigomwlvnwkryyl';

export function assertTestProject(url: string | undefined): void {
  if (!url) return;
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not a valid URL; refusing to run the live suites.');
  }
  if (host === `${TEST_PROJECT_REF}.supabase.co`) return;
  const why = host.includes(PRODUCTION_PROJECT_REF)
    ? 'that is the PRODUCTION project'
    : 'that is not the test project';
  throw new Error(
    `Refusing to run the live Supabase suites against ${host}: ${why}. ` +
      `Point .env.local at https://${TEST_PROJECT_REF}.supabase.co and try again.`,
  );
}

/**
 * FAIL CLOSED WHEN A RUN IS MEANT TO BE LIVE. Locally a missing `.env.local` makes every suite
 * skip itself, which is right for a laptop and wrong for a workflow whose whole purpose is the
 * live run: a green job that skipped everything reads as a pass. With `required`, missing
 * configuration is an error, and the URL must be the test project exactly.
 */
export function assertLiveConfigured(
  url: string | undefined,
  anonKey: string | undefined,
  required: boolean,
): void {
  assertTestProject(url);
  if (!required) return;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set; a required live run cannot skip.');
  if (!anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set; a required live run cannot skip.');
}
