import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACTIVE_PAGE_THEMES, PAGE_THEMES } from './page-themes';

const css = readFileSync('src/app/globals.css', 'utf8');
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '');

/** The spec: ground, two lights, two accents, per theme. */
const SPEC: Record<string, [string, string, string, string, string]> = {
  home: ['#170d2b', '#38205b', '#512b86', '#f2a7cf', '#f2c75c'],
  scan: ['#14152f', '#243d70', '#235b69', '#6fd5c2', '#b9a1f2'],
  // SAMPLE (ui/palette-sample): lavender ground #C9A4F8, card violet #9C21F8 as the accent.
  collection: ['#c9a4f8', '#e2cffc', '#b98cf2', '#9c21f8', '#f180b4'],
  garden: ['#171c2c', '#426b58', '#40305f', '#8cc78b', '#c5a5e9'],
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

  it('a theme that any route or view applies is listed as active (order-independent: a listed theme may be applied by a later change)', () => {
    const files = execSync("grep -rl 'PageAtmosphere theme=' src/app src/components || true", { encoding: 'utf8' }).split('\n').filter(Boolean);
    const used = new Set<string>();
    for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/<PageAtmosphere theme="([a-z]+)" \/>/g)) used.add(m[1]!);
    for (const id of PAGE_THEMES) if (used.has(id)) expect(ACTIVE_PAGE_THEMES.includes(id), id).toBe(true);
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

  it('the navigation is one solid bright lavender, darker than every page ground, with readable ink', () => {
    const at = css.indexOf('@utility nav-bar');
    const block = strip(css.slice(at, css.indexOf('\n}', at)));
    expect(block).not.toMatch(/backdrop|transparent|color-mix/);
    const stops = [...block.matchAll(/#([0-9a-f]{6})/g)].map((m) => m[1]!).slice(0, 2);
    expect(stops.length).toBe(2);
    const lum = (hex: string) => {
      const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
    };
    const grounds = [...css.matchAll(/(?:body|html):has\(main\[data-(?:shade|ground)='[a-z]+'\]\)\s*\{\s*background:\s*#([0-9a-f]{6})/g)].map((m) => m[1]!);
    expect(grounds.length).toBeGreaterThanOrEqual(7);
    for (const g of grounds) for (const n of stops) expect(lum(n), `nav #${n} must be darker than page ground #${g}`).toBeLessThan(lum(g));
    // Ink #3D0A63 on both stops.
    for (const n of stops) expect((lum(n) + 0.05) / (lum('3d0a63') + 0.05), `ink on #${n}`).toBeGreaterThanOrEqual(4.5);
    const nav = readFileSync('src/components/SiteNav.tsx', 'utf8');
    expect(nav).toContain('nav-bar');
    expect(nav).not.toContain('panel-raised');
  });
});

describe('page theme refinement', () => {
  it('moss green reference on Garden, boosted teal on Scan', () => {
    expect(css).toMatch(/\[data-page-theme='garden'\][^}]*--pt-b:#426b58/);
    expect(css).toMatch(/\[data-page-theme='scan'\][^}]*--pt-c-a:90%/);
  });
  it('secondary text token is the pale lavender, and panels are lighter than the old plum-700 at 72%', () => {
    expect(css).toMatch(/--color-violet-300:\s*#ddd0ef/);
    const at = css.indexOf('@utility panel {');
    const block = css.slice(at, css.indexOf('}', at));
    expect(block).toContain('var(--color-plum-700) 91%, white');
  });
  it('a vignette keeps the edges darker than the middle', () => {
    const at = css.indexOf('@utility page-atmosphere');
    expect(css.slice(at, css.indexOf('\n}', at))).toMatch(/transparent 58%, color-mix\(in srgb, var\(--color-brand-plum\)/);
  });
});
