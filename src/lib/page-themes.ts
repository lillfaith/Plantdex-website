/**
 * PAGE THEMES: one magical botanical world, a different atmosphere in each place.
 *
 * The palette for every theme lives in `globals.css` as `[data-page-theme='…']` custom
 * properties (`--pt-a` the dominant ground, `--pt-b` / `--pt-c` the lighting, `--pt-accent`
 * and `--pt-accent-2` the small touches), and `PageAtmosphere` is the ONE component that
 * paints them. A page opts in with a single line; nothing else in a component is recoloured.
 *
 * This list is the source of truth for which themes exist. `ACTIVE_PAGE_THEMES` are the ones a
 * page currently uses; the rest are defined and documented (`docs/page-themes.md`) and wait for
 * their page. `page-themes.test.ts` keeps this list, the stylesheet and the document in step.
 */
export const PAGE_THEMES = [
  'home',
  'scan',
  'collection',
  'garden',
  'journal',
  'learn',
  'quests',
  'board',
  'boss',
] as const;

export type PageThemeId = (typeof PAGE_THEMES)[number];

/** Themes a route renders today. The others are specified but not applied yet. */
export const ACTIVE_PAGE_THEMES: readonly PageThemeId[] = ['scan', 'collection', 'garden'];
