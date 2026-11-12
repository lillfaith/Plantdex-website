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
