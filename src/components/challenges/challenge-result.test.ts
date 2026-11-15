import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/challenges/ChallengeShell', async () => {
  const { createElement: h } = await import('react');
  return {
    ChallengeShell: (p: { kicker?: string; status?: unknown; action: { label: unknown; disabled?: boolean }; secondary?: unknown; children: unknown }) =>
      h('div', null, h('p', null, p.kicker), p.children as never, h('div', null, p.status as never), h('button', { disabled: p.action.disabled }, p.action.label as never), p.secondary as never),
  };
});

import { ChallengeResultView, type ResultKind } from './ChallengeResult';

const noop = () => undefined;
const render = (kind: ResultKind, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(ChallengeResultView, {
      kind, herbId: 'taraxacum-officinale', activityName: 'Part Spotter', isTrial: false, preview: false,
      resolved: 2, total: 3, review: [], onPrimary: noop, onBack: noop, onExit: noop, ...extra,
    }),
  );

describe('the four ways a submission can end', () => {
  it('complete says the stage is complete and leads straight on', () => {
    const out = render('complete', { nextLabel: 'Picture Match' });
    expect(out).toContain('Nicely done!');
    expect(out).toContain('Continue to Picture Match');
    expect(out).toContain('2 of 3');
  });
  it('a Trial pass the server confirmed leads into the evolution', () => {
    const out = render('complete', { isTrial: true, awakens: true });
    expect(out).toContain('The seal holds');
    expect(out).toContain('Awaken the Boss Form');
    expect(out).not.toContain('Continue to');
  });
  it('a preview pass never says it awakens anything', () => {
    const out = render('complete', { isTrial: true, preview: true, awakens: false });
    expect(out).not.toContain('Awaken the Boss Form');
  });
  it('a preview pass is labelled as one and claims nothing recorded', () => {
    const out = render('complete', { preview: true });
    expect(out).toContain('Passed in preview');
    expect(out).toContain('Nothing is recorded');
    expect(out).not.toContain('Stage complete');
  });
  it('failed keeps passed rounds passed, does not claim new questions, and offers a retry', () => {
    const out = render('failed');
    expect(out).toContain('So close!');
    expect(out).toContain('Rounds you have passed stay passed');
    expect(out).toContain('some may come back');
    expect(out).toContain('Try again');
  });
  it('the daily limit screen is its own screen: nothing to press but Back, and the reset time', () => {
    const out = render('limit');
    expect(out).toContain('That is enough for today');
    expect(out).toContain('midnight UTC');
    expect(out).toMatch(/<button disabled="">Come back tomorrow<\/button>/);
    expect(out).toContain('not scored');
  });
  it('an error claims nothing was recorded and is not the limit screen', () => {
    const out = render('error');
    expect(out).toContain('Could not save that');
    expect(out).toContain('Nothing was recorded');
    expect(out).not.toContain('enough for today');
  });
});

describe('the limit screen follows the server and nothing else', () => {
  const runner = readFileSync('src/components/challenges/ChallengeRunner.tsx', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  it('is chosen only for the server refusal, and every other failure is an error', () => {
    expect(runner).toMatch(/finished\.reason === 'limit' \? 'limit' : 'error'/);
    expect(runner).not.toMatch(/DAILY|CHALLENGE_DAILY_LIMIT|CHALLENGE_TRIAL_DAILY_LIMIT/);
  });
});

describe('a question starts clean', () => {
  const runner = readFileSync('src/components/challenges/ChallengeRunner.tsx', 'utf8');
  const shell = readFileSync('src/components/challenges/ChallengeShell.tsx', 'utf8');
  const views = readFileSync('src/components/challenges/QuestionViews.tsx', 'utf8');
  it('each question is its own element, so an opened list and a tap message never carry over', () => {
    expect(runner).toMatch(/<QuestionView\s+key=\{flow\.index\}/);
    expect(views).toMatch(/<details ref=\{list\} className="group">/); // uncontrolled and closed by default
    expect(views).not.toMatch(/<details[^>]*\bopen\b/);
  });
  it('the content scrolls back to the top when the question changes', () => {
    expect(runner).toMatch(/scrollKey=\{flow\.index\}/);
    expect(shell).toMatch(/body\.current\?\.scrollTo\(\{ top: 0 \}\)/);
  });
});
