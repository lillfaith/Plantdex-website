import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const nav = readFileSync('src/components/SiteNav.tsx', 'utf8');
const code = nav.replace(/\/\*[\s\S]*?\*\//g, '');

describe('primary navigation (two layouts for the owner to choose between)', () => {
  it('keeps the label "Collection": renaming it is the owner\'s decision', () => {
    expect(code).toMatch(/label: 'Collection'/);
    expect(code).not.toMatch(/label: 'Cards'/);
  });

  it('defaults to the seven-tab layout; the six-tab layout is build-flagged', () => {
    expect(code).toMatch(/NEXT_PUBLIC_NAV_LAYOUT === 'six'/);
    expect(code.match(/\{ href: '\//g)?.length).toBe(7);
  });

  it('the six-tab layout tucks exactly Journal and Learn under a labelled, keyboard-closable More', () => {
    expect(code).toMatch(/MORE_HREFS = \['\/journal', '\/learn'\]/);
    expect(code).toMatch(/aria-expanded=\{moreOpen\}/);
    expect(code).toMatch(/e\.key === 'Escape'/);
    expect(code).toMatch(/aria-controls="nav-more"/);
  });

  it('keeps the safe-area padding and tap targets of at least 48px on a phone', () => {
    expect(code).toMatch(/pb-\[env\(safe-area-inset-bottom\)\]/);
    expect(code).toMatch(/min-h-12/);
    expect(readFileSync('src/app/layout.tsx', 'utf8')).toMatch(/viewportFit: 'cover'/);
  });

  it('does not put the Field Board in the bar', () => {
    expect(code).not.toMatch(/leaderboard/);
  });
});
