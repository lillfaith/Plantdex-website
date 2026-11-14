import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACTIVE_PAGE_THEMES, PAGE_THEMES } from './page-themes';

const css = readFileSync('src/app/globals.css', 'utf8');
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '');

/** The spec: ground, two lights, two accents, per theme. */
const SPEC: Record<string, [string, string, string, string, string]> = {
  home: ['#170d2b', '#38205b', '#512b86', '#f2a7cf', '#f2c75c'],
  scan: ['#14152f', '#243d70', '#235b69', '#6fd5c2', '#b9a1f2'],
  collection: ['#170d2b', '#34205f', '#59308c', '#f2c75c', '#b786f1'],
  garden: ['#171c2c', '#294a42', '#40305f', '#8cc78b', '#c5a5e9'],
  journal: ['#24152e', '#58304e', '#744366', '#f2a7cf', '#f5d58b'],
  learn: ['#211b40', '#414c83', '#5a477e', '#afc3ff', '#f2d58b'],
  quests: ['#27152d', '#663b57', '#89526b', '#ffaa93', '#f4cd75'],
  board: ['#190f30', '#43256c', '#63418b', '#ffd66b', '#c6a4f5'],
  boss: ['#220d38', '#572477', '#803c84', '#ef8ad0', '#ffd86f'],
};

describe('page themes', () => {
  it('defines every theme with exactly the specified palette', () => {
    expect(Object.keys(SPEC).sort()).toEqual([...PAGE_THEMES].sort());
    for (const id of PAGE_THEMES) {
      const m = css.match(new RegExp(`\\[data-page-theme='${id}'\\]\\s*\\{([^}]*)\\}`));
      expect(m, `no CSS block for ${id}`).not.toBeNull();
      const body = m![1]!;
      const get = (v: string) => body.match(new RegExp(`--${v}:\\s*(#[0-9a-f]{6})`))?.[1];
      expect([get('pt-a'), get('pt-b'), get('pt-c'), get('pt-accent'), get('pt-accent-2')]).toEqual(SPEC[id]);
    }
  });

  it('each active theme is applied by exactly its own route, and the rest by none', () => {
    const routes: Record<string, string> = {
      scan: 'src/app/scan/page.tsx',
      collection: 'src/app/herbdex/page.tsx',
      garden: 'src/app/garden/page.tsx',
    };
    for (const id of PAGE_THEMES) {
      const used = Object.entries(routes).filter(([, f]) => readFileSync(f, 'utf8').includes(`<PageAtmosphere theme="${id}" />`));
      expect(used.length).toBe(ACTIVE_PAGE_THEMES.includes(id) ? 1 : 0);
    }
  });

  it('the atmosphere is static, Safari-safe gradients: fixed, no animation, filter, blur or attachment', () => {
    const at = css.indexOf('@utility page-atmosphere');
    const block = strip(css.slice(at, css.indexOf('\n}', at)));
    expect(block).toMatch(/position:\s*fixed/);
    expect(block).not.toMatch(/animation|transition|filter|blur|background-attachment/);
    expect(block).toMatch(/pointer-events:\s*none/);
    const component = readFileSync('src/components/PageAtmosphere.tsx', 'utf8');
    expect(component).toContain('aria-hidden="true"');
  });

  it('the navigation is one solid brand plum on every page', () => {
    const at = css.indexOf('@utility nav-bar');
    const block = strip(css.slice(at, css.indexOf('\n}', at)));
    expect(block).toContain('var(--color-brand-nav)');
    expect(block).not.toMatch(/backdrop|transparent|color-mix/);
    const nav = readFileSync('src/components/SiteNav.tsx', 'utf8');
    expect(nav).toContain('nav-bar');
    expect(nav).not.toContain('panel-raised');
  });
});
