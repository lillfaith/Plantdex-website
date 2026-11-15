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
import { QuestionView, fillsHeight } from '@/components/challenges/QuestionViews';
import { pointInBox, regionAt } from '@/lib/boss-images';
import { buildChallenge } from '@/lib/mastery-challenges';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const read = (path: string) => strip(readFileSync(path, 'utf8'));
const DANDELION = 'taraxacum-officinale';

function questionOf(kind: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    for (const activity of ['part-spotter', 'habitat-season'] as const) {
      const questions = buildChallenge(DANDELION, activity, attempt, { includeUnreviewed: true })!;
      for (const q of questions) if (q.kind === kind) return q;
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
  it('spot-feature: one photograph, plus a visible "Use a list" with a button for each part', () => {
    const html = render('spot-feature');
    expect((html.match(/<img/g) ?? []).length).toBe(1);
    expect(html).toContain('Use a list');
    expect(html).not.toContain('sr-only');
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

describe('the Boss Trial reveals nothing until it is submitted', () => {
  const render = (kind: string, reveal: boolean) =>
    renderToStaticMarkup(
      createElement(QuestionView, { question: questionOf(kind), chosen: 0, onAnswer: () => undefined, reveal }),
    );
  it('with reveal off, an answered question marks only the player’s choice', () => {
    for (const kind of ['pick-picture', 'spot-feature', 'quick-pick']) {
      // The right answer is marked with a glow and a drawn tick, or a gold outline on the tapped photograph.
      const marker = /shadow-\[0_0_22px|challenge-pop/;
      expect(render(kind, false), kind).not.toMatch(marker);
      expect(render(kind, true), kind).toMatch(marker);
    }
  });
  it('a quick pick can carry its own photograph (tr.flowerbare)', () => {
    let found: ReturnType<typeof buildChallenge> extends (infer Q)[] | null ? Q | null : never = null;
    for (let attempt = 0; attempt < 6 && !found; attempt += 1) {
      found = buildChallenge(DANDELION, 'boss-trial', attempt, { includeUnreviewed: true })!.find((q) => q.id === 'tr.flowerbare') ?? null;
    }
    expect(found?.kind).toBe('quick-pick');
    const html = renderToStaticMarkup(createElement(QuestionView, { question: found!, chosen: null, onAnswer: () => undefined }));
    expect(html).toContain('<img');
  });
  it('the runner offers no second chance and reveals at the end only for the Trial', () => {
    const runner = read('src/components/challenges/ChallengeRunner.tsx');
    expect(runner).toMatch(/reveal=\{!hidden\}/);
    expect(runner).toMatch(/Submit the Trial/);
    expect(runner).toMatch(/Your answers and explanations/);
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
    // Every activity now has dandelion-only drafts, so each can be built in a development
    // preview. The Trial stays behind its three prerequisites.
    expect((out.match(/Coming soon/g) ?? []).length).toBe(0);
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
  it('asks the rules module when answers are revealed, offers no per-question second chance, and decides no scoring itself', () => {
    expect(runner).toMatch(/revealsAnswersAtEndOnly\(activity\)/);
    expect(runner).not.toMatch(/replacement|second chance|hasRetry/i);
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
      'evolve-out', 'evolve-in', 'evolve-burst', 'evolve-ring', 'evolve-flash', 'evolve-text', 'evolve-text-late',
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

describe('tapping a photograph is accurate at every size', () => {
  it('turns a pointer into the same percentage of the picture whatever size it is drawn at', () => {
    const small = pointInBox({ left: 20, top: 100, width: 280, height: 373 }, 20 + 140, 100 + 186.5);
    const large = pointInBox({ left: 0, top: 40, width: 400, height: 533 }, 200, 40 + 266.5);
    expect(small!.x).toBeCloseTo(50, 1);
    expect(large!.x).toBeCloseTo(50, 1);
    expect(small!.y).toBeCloseTo(large!.y, 0);
    // The same percentage lands on the same region, so the answer does not depend on the screen.
    expect(regionAt('d-flower-open', small!.x, small!.y)).toBe(regionAt('d-flower-open', large!.x, large!.y));
  });
  it('ignores a tap outside the picture or on an empty box', () => {
    expect(pointInBox({ left: 0, top: 0, width: 100, height: 100 }, 101, 50)).toBeNull();
    expect(pointInBox({ left: 0, top: 0, width: 0, height: 0 }, 0, 0)).toBeNull();
  });
  it('sizes the picture from the room its stage has, uncropped, and measures the picture itself', () => {
    const stage = read('src/components/challenges/PhotoStage.tsx');
    const views = read('src/components/challenges/QuestionViews.tsx');
    // The room is measured, and the picture cannot change the room it is sized from.
    expect(stage).toMatch(/new ResizeObserver\(read\)/);
    expect(stage).toMatch(/absolute inset-0/);
    expect(stage).toMatch(/framedWidth\(size\.w, size\.h, ratio\)/);
    expect(stage).toMatch(/style=\{\{ aspectRatio: ratio\.toFixed\(4\) \}\}/);
    expect(stage).toMatch(/min-h-\[15rem\]/); // never smaller than readable: the page scrolls instead
    expect(stage).not.toMatch(/cqw|cqh|container-type/); // container units collapse under flex growth
    // The ref'd box is the picture: no padding on it, so a tap is never offset by a frame.
    const ref = stage.slice(stage.indexOf('ref={boxRef}'), stage.indexOf('ref={boxRef}') + 300);
    expect(ref).not.toMatch(/\bp-\[?\d/);
    expect(views).toMatch(/<PhotoStage ratio=/);
    // Photographs are letterboxed, never cropped, wherever they appear.
    expect(views).toMatch(/object-contain/);
    expect(views).not.toMatch(/Photo id=\{[^}]*\} fit="cover"/);
  });
  it('gives every picture the same portrait thumbnail, a letter, and a visible keyboard focus', () => {
    const views = read('src/components/challenges/QuestionViews.tsx');
    expect(views).toContain('aspect-[3/4]');
    expect(views).toMatch(/grid-cols-3/);
    expect(views).toMatch(/focus-visible:ring-4/);
    expect(views).toMatch(/LETTERS\[index\]/);
  });
  it('keeps a reachable list for every botanical feature question, never hidden from sight', () => {
    const views = read('src/components/challenges/QuestionViews.tsx');
    expect(views).toMatch(/<details/);
    expect(views).toMatch(/Use a list/);
    expect(views).toMatch(/min-h-12/);
  });
  it('asks the tap logic, never a region rewritten here', () => {
    const views = read('src/components/challenges/QuestionViews.tsx');
    expect(views).toMatch(/resolveTap\(regions,/);
    expect(views).not.toMatch(/regions\[[^\]]+\]\s*=|\.x\s*[-+]=|\.w\s*[-+]=/);
  });
});

describe('the hub says what to tap next', () => {
  const render = (m: 'off' | 'preview' | 'on') => {
    mode.value = m;
    return renderToStaticMarkup(createElement(ChallengeExperience, { herbId: DANDELION, name: 'Dandelion' }));
  };
  it('features exactly one next step, and it is the first playable round', () => {
    const out = render('preview');
    expect((out.match(/Next up/g) ?? []).length).toBe(1);
    expect(out.indexOf('Next up')).toBeLessThan(out.indexOf('Habitat'));
    expect(out.slice(out.indexOf('Next up'), out.indexOf('Next up') + 160)).toContain('Part Spotter');
  });
  it('features nothing when nothing is playable, so locked or unavailable never leads', () => {
    expect(render('on')).not.toContain('Next up');
  });
});

describe('an evolution is earned only by the server, and a preview says so', () => {
  const hub = read('src/components/challenges/ChallengeExperience.tsx');
  const runner = read('src/components/challenges/ChallengeRunner.tsx');
  const evolution = read('src/components/challenges/BossEvolution.tsx');
  it('the Trial has no preview shortcut: it opens only when every round is done', () => {
    expect(hub).toMatch(/const trialOpen = PREREQUISITE_ACTIVITIES\.every\(\(one\) => done\.has\(one\)\);/);
    expect(hub).not.toMatch(/\|\| preview/);
  });
  it('only the server\u2019s answer, for the Boss Trial, can start the earned evolution', () => {
    // The flag comes from the SERVER's verdict, only for the Trial, and never from a preview verdict.
    expect(runner).toMatch(/const bossForm = !\('preview' in finished\) && finished\.bossForm && isTrial;/);
    const earned = hub.match(/setEvolved\('earned'\)/g) ?? [];
    expect(earned).toHaveLength(1);
    expect(hub).toMatch(/if \(bossForm\) setEvolved\('earned'\)/);
  });
  it('the preview button exists only in preview mode and starts the preview, never the earned one', () => {
    const button = hub.slice(hub.lastIndexOf('{preview ? ('), hub.lastIndexOf('Preview the evolution'));
    expect(button).toMatch(/setEvolved\('preview'\)/);
    expect(button).not.toMatch(/setEvolved\('earned'\)/);
  });
  it('keeps Skip above every layer, so a short screen can never cover it', () => {
    expect(evolution).toMatch(/right-4 z-20/);
  });
  it('the overlay labels a preview as not earned, and an earned one as complete', () => {
    expect(evolution).toMatch(/'Evolution Preview'/);
    expect(evolution).toMatch(/'Evolution Complete!'/);
    expect(evolution).toMatch(/Nothing was earned or recorded/);
    expect(evolution).toMatch(/data-evolution=\{preview \? 'preview' : 'earned'\}/);
  });
  it('the dev-only preview text never reaches production: the hub is not in the bundle with the flag off', () => {
    const gate = read('src/components/challenges/ChallengeGate.tsx');
    expect(gate).toMatch(/NEXT_PUBLIC_BOSS_FORMS === 'on'/);
  });
});

describe('the scenery stays inside the stage and away from the footer and navigation', () => {
  const stage = read('src/components/challenges/BotanicalStage.tsx');
  it('is not a fixed full-screen layer', () => {
    expect(stage).not.toMatch(/fixed inset-0|\bfixed\b/);
  });
  it('puts the fern strip after the content, as ordinary flow, with no text over it', () => {
    expect(stage.indexOf('{children}')).toBeLessThan(stage.indexOf('scan-forest'));
  });
});

describe('the full-screen shell (milestone 1)', () => {
  const shell = read('src/components/challenges/ChallengeShell.tsx');
  const runner = read('src/components/challenges/ChallengeRunner.tsx');
  const hub = read('src/components/challenges/ChallengeExperience.tsx');
  const labels = read('src/components/challenges/activity-labels.ts');
  it('covers the site navigation through a portal, as a modal dialog', () => {
    expect(shell).toMatch(/createPortal\(/);
    expect(shell).toMatch(/role="dialog"/);
    expect(shell).toMatch(/aria-modal="true"/);
    expect(shell).toMatch(/z-\[60\]/); // above the bottom bar (z-50), below the evolution (z-[70])
  });
  it('always shows a labelled Exit, at least 48px tall, and Escape also exits', () => {
    expect(shell).toMatch(/Exit\s*<\/button>/);
    expect(shell).toMatch(/min-h-12/);
    expect(shell).toMatch(/event\.key === 'Escape'/);
  });
  it('honours the safe areas and keeps the status line a fixed height so the action never moves', () => {
    expect(shell).toMatch(/safe-area-inset-top/);
    expect(shell).toMatch(/safe-area-inset-bottom/);
    expect(shell).toMatch(/h-\[4\.25rem\]/);
  });
  it('uses no timer, randomness, blur or filter, and restores page scrolling on close', () => {
    expect(shell).not.toMatch(/setTimeout|setInterval|requestAnimationFrame|Math\.random|Date\.now|blur|filter/);
    expect(shell).toMatch(/document\.body\.style\.overflow = overflow/);
  });
  it('the runner uses the state machine, locks on check, and sends the set once', () => {
    expect(runner).toMatch(/step\(flow, event, ctx\)/);
    expect(runner).toMatch(/sent\.current/);
    expect(runner).toMatch(/Check answer/);
    expect(runner).toMatch(/onSelect=\{/);
  });
  it('the runner notes a passed round only from a verdict, never from a tap', () => {
    expect(runner).toMatch(/if \(result\.ok\) onVerdict\?\.\(\{ passed: result\.passed \}\)/);
    expect(hub).toMatch(/onVerdict=\{/);
    expect(hub).toMatch(/notePassed\(/);
  });
  it('shows "Picture Match" for the compare round and keeps the internal id', () => {
    expect(labels).toMatch(/compare: \{ name: 'Picture Match'/);
    expect(hub + runner + labels).not.toMatch(/Lookalikes/);
    expect(labels).toMatch(/'part-spotter'/);
  });
  it('does not claim a retry brings new questions', () => {
    expect(runner).not.toMatch(/different set|mixes the questions differently|new questions/i);
    expect(runner).toMatch(/some may come back/);
  });
  it('the hub (and so the bottom bar) is not part of the full-screen experience', () => {
    expect(runner).toMatch(/<ChallengeShell/);
    expect(shell).not.toMatch(/SiteNav|nav-bar/);
  });
});

describe('the M2 correction pass: calmer, clearer, never an empty panel', () => {
  const views = read('src/components/challenges/QuestionViews.tsx');
  const runner = read('src/components/challenges/ChallengeRunner.tsx');
  it('Picture Match draws the choices first and a larger view only once there is something to show', () => {
    expect(views).toMatch(/Choose one picture/);
    expect(views).toMatch(/Picture \{LETTERS\[shown\]\}, larger/);
    expect(views).toMatch(/Tap a picture to see it larger/);
    expect(views).not.toMatch(/border-dashed[^`]*Tap a picture below/); // the old empty dashed panel is gone
    expect(views).toMatch(/Look at this photo/); // a reference photograph is named as one, with no letter
  });
  it('only a question whose photograph IS the question fills the screen; the rest are as tall as their content', () => {
    const kinds = ['pick-picture', 'spot-feature', 'quick-pick'].map((kind) => [kind, fillsHeight(questionOf(kind))] as const);
    expect(Object.fromEntries(kinds)).toEqual({ 'pick-picture': false, 'spot-feature': true, 'quick-pick': false });
    expect(runner).toMatch(/fillsHeight\(question\) \? 'min-h-full' : ''/);
    expect(views).not.toMatch(/Dandelion|taraxacum/i); // generic: no plant is named in a view
  });
  it('a tap message belongs to the selection it was made against, so it disappears when anything is picked', () => {
    expect(views).toMatch(/note && note\.at === selected/);
    expect(views).toMatch(/at: selected/);
  });
  it('every state has its own look: picked, right, not quite, and disabled are four different things', () => {
    expect(views).toMatch(/picked: 'ring-4 ring-violet-200'/);
    expect(views).toMatch(/right: 'ring-4 ring-gold-300/);
    expect(views).toMatch(/wrong: 'ring-4 ring-pink-accent'/);
    expect(views).toMatch(/dim: 'opacity-45'/);
    expect(views).toMatch(/'Right answer'/);
    expect(views).toMatch(/'Not this one'/);
    expect(views).toMatch(/'Your pick'/);
  });
  it('draws the answers on calm flat tiles and the question without a decorative frame', () => {
    expect(views).not.toMatch(/pixel-tile/);
    expect(runner).not.toMatch(/ChallengeFrame/);
    expect(views).toMatch(/const TILE = /);
  });
  it('keeps the photograph markers the reveal rule depends on', () => {
    expect(views).toMatch(/challenge-pop/);
    expect(views).toMatch(/shadow-\[0_0_22px_rgb\(255_210_110\/0\.55\)\]/);
  });
});
