import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const { mode } = vi.hoisted(() => ({ mode: { value: 'off' as 'off' | 'preview' | 'on' } }));
vi.mock('@/lib/boss-forms', () => ({ bossFormsMode: () => mode.value }));
vi.mock('@/state/HerbdexProvider', () => ({
  useHerbdex: () => ({ isMastered: () => true, ready: true }),
}));

import { ChallengeExperience } from '@/components/challenges/ChallengeExperience';
import { QuestionView } from '@/components/challenges/QuestionViews';
import { buildChallenge } from '@/lib/mastery-challenges';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const read = (path: string) => strip(readFileSync(path, 'utf8'));
const DANDELION = 'taraxacum-officinale';

function questionOf(kind: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    for (const activity of ['part-spotter', 'habitat-season'] as const) {
      const slots = buildChallenge(DANDELION, activity, attempt, { includeUnreviewed: true })!;
      for (const slot of slots) {
        for (const q of [slot.primary, slot.replacement]) if (q?.kind === kind) return q;
      }
    }
  }
  throw new Error(`no ${kind} question in the preview pool`);
}

describe('the four question formats render', () => {
  const render = (kind: string, chosen: number | null = null) =>
    renderToStaticMarkup(
      createElement(QuestionView, { question: questionOf(kind), chosen, onAnswer: () => undefined }),
    );

  it('pick-picture: large photographs as buttons with plain descriptions', () => {
    const html = render('pick-picture');
    expect((html.match(/<button/g) ?? []).length).toBe(3);
    expect(html).toContain('<img');
    expect(html).toMatch(/aria-label="[^"]+"/);
  });
  it('spot-feature: one photograph, plus keyboard buttons for each part', () => {
    const html = render('spot-feature');
    expect((html.match(/<img/g) ?? []).length).toBe(1);
    expect(html).toContain('sr-only');
    expect((html.match(/<button/g) ?? []).length).toBe(4);
  });
  it('quick-pick: short text buttons', () => {
    const html = render('quick-pick');
    expect((html.match(/<button/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).not.toContain('<img');
  });
  it('after an answer every button is disabled and the right one is marked', () => {
    const html = render('pick-picture', 0);
    expect(html).toContain('disabled');
    expect(html).toContain('ring-gold-300');
  });
});

describe('the hub', () => {
  const html = (m: 'off' | 'preview' | 'on') => {
    mode.value = m;
    return renderToStaticMarkup(
      createElement(ChallengeExperience, { herbId: DANDELION, name: 'Dandelion' }),
    );
  };
  it('renders one plain sentence and no question when the flag is off', () => {
    const out = html('off');
    expect(out).toContain('not available yet');
    expect(out).not.toMatch(/<button|<img|Part Spotter/);
  });
  it('in preview shows the activities, and marks the disabled ones Coming soon', () => {
    const out = html('preview');
    expect(out).toContain('Part Spotter');
    expect(out).toContain('Habitat');
    // Compare and the Trial need the cat’s-ear photograph and ruling, so they cannot start.
    expect((out.match(/Coming soon/g) ?? []).length).toBe(2);
    expect(out).toMatch(/Preview: draft questions, nothing is recorded/);
  });
  it('in production-like "on" mode nothing is playable, because nothing is reviewed', () => {
    const out = html('on');
    expect((out.match(/Coming soon/g) ?? []).length).toBe(4);
    expect(out).not.toContain('Preview');
  });
});

describe('the screens keep the rules', () => {
  const runner = read('src/components/challenges/ChallengeRunner.tsx');
  const views = read('src/components/challenges/QuestionViews.tsx');
  const hub = read('src/components/challenges/ChallengeExperience.tsx');
  const evolution = read('src/components/challenges/BossEvolution.tsx');
  const art = ['ChallengeArt', 'ChallengeFrame', 'FlowerProgress', 'Sparkles', 'BotanicalStage']
    .map((name) => read(`src/components/challenges/${name}.tsx`))
    .join('\n');
  const all = runner + views + hub + evolution + art;
  const css = readFileSync('src/app/globals.css', 'utf8');

  it('has no timer, no countdown and no randomness', () => {
    expect(all).not.toMatch(/setTimeout|setInterval|requestAnimationFrame|Math\.random|Date\.now/);
  });
  it('asks the rules module whether a retry exists, and decides no scoring itself', () => {
    expect(runner).toMatch(/hasRetry\(activity\)/);
    expect(runner).toMatch(/scoreSubmission\(/);
    expect(all).not.toMatch(/PASS_MARKS|progression|herbdex-reducer|applyDiscovery|xpFor/);
  });
  it('previews drafts only in preview mode; the server is the only authority otherwise', () => {
    expect(runner).toMatch(/includeUnreviewed: mode === 'preview'/);
    expect(runner).toMatch(/submitChallenge\(/);
    expect(runner).not.toMatch(/includeUnavailable/);
    expect(hub).not.toMatch(/includeUnavailable/);
  });
  it('never uses blur, and never shows a decorative sprite as an answer image', () => {
    expect(all).not.toMatch(/blur/);
    expect(views).not.toMatch(/PlantSprite/);
  });
  it('is not linked from anywhere a player can reach with the flag off', () => {
    const detail = readFileSync('src/components/herbdex/HerbDetail.tsx', 'utf8');
    expect(detail).not.toMatch(/\/challenge/);
  });
  it('states the fixed disclaimer on the evolution screen', () => {
    expect(evolution).toMatch(/CHALLENGE_DISCLAIMER/);
  });
  it('names only rewards that exist: the Boss Form, and no XP, badge, frame or collectible', () => {
    for (const source of [evolution, hub, runner]) {
      expect(source).not.toMatch(/\bXP\b|achievement|avatar|frame unlocked|collectible|reward/i);
    }
  });
  it('the evolution is skippable, closes on Escape, and covers the navigation through a portal', () => {
    expect(evolution).toMatch(/setSkipped\(true\)/);
    expect(evolution).toMatch(/event\.key === 'Escape'/);
    expect(evolution).toMatch(/createPortal\(/);
    expect(evolution).toMatch(/role="dialog"/);
  });
  it('no animated element is hidden by an inline style, which reduced motion could not undo', () => {
    expect(evolution + hub + runner + art).not.toMatch(/style=\{\{[^}]*opacity:\s*0/);
  });
  it('every decorative piece is aria-hidden', () => {
    for (const name of ['Sparkles', 'BotanicalStage', 'ChallengeFrame', 'ChallengeArt']) {
      expect(read(`src/components/challenges/${name}.tsx`), name).toMatch(/aria-hidden="true"/);
    }
  });
  it('pauses with the page: a hidden-tab listener, and a stylesheet rule that freezes animations', () => {
    expect(art).toMatch(/visibilitychange/);
    expect(css).toMatch(/\.boss-scene\[data-paused='true'\] \*/);
  });
  it('every motion class the screens use runs a fixed number of times and is in the reduced-motion list', () => {
    const block = css.slice(css.indexOf('BOSS FORM CHALLENGES: every motion'));
    expect(block).not.toMatch(/infinite/);
    const reduced = block.slice(block.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const name of [
      'challenge-pop', 'flower-bloom', 'sparkle-out', 'seed-drift', 'boss-aura', 'tile-glow',
      'evolve-out', 'evolve-in', 'evolve-ring', 'evolve-flash', 'evolve-text', 'evolve-text-late',
    ]) {
      expect(reduced, name).toContain(`.${name}`);
    }
  });
  it('uses only inline SVG and CSS for decoration: no new image files, no blur, no filter', () => {
    const block = css.slice(css.indexOf('/*\n * BOSS FORM CHALLENGES: every motion'));
    expect(block.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/blur|filter:|backdrop/);
    expect(art).not.toMatch(/<img|new Image|\.png|\.webp/);
  });
});
