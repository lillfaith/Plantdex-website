import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  EarnedMomentHost,
  describeMoment,
  type EarnedMoment,
} from '@/components/game/EarnedMomentHost';
import { getPrintedCard, PRINTED_CARDS } from '@/lib/deck';
import { MASTERY_STAGE_LABEL } from '@/lib/mastery';
import { LEVELS } from '@/lib/progression';
import { STANDING_TASKS } from '@/lib/research';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CSS_RAW = readFileSync('src/app/globals.css', 'utf8');
const START = CSS_RAW.indexOf('EARNED MOMENTS AND CAMERA FEEDBACK');
const END = CSS_RAW.indexOf('BOSS FORM CHALLENGES: every motion');
const BLOCK = strip(CSS_RAW.slice(START, END));
const SOURCE = readFileSync('src/components/game/EarnedMomentHost.tsx', 'utf8');
const CODE = strip(SOURCE);

const herb = PRINTED_CARDS[0]!;
const task = STANDING_TASKS[0]!;
const LEVEL: EarnedMoment = { id: 'l', kind: 'level-up', fromLevel: 3, toLevel: 4 };
const MASTERY: EarnedMoment = { id: 'm', kind: 'mastery', herbId: herb.id };
const RESEARCH: EarnedMoment = { id: 'r', kind: 'research', taskId: task.id };
const render = (moments: EarnedMoment[]) =>
  renderToStaticMarkup(createElement(EarnedMomentHost, { moments, onAcknowledge: () => undefined }));

describe('the host', () => {
  it('renders nothing for an empty list', () => {
    expect(render([])).toBe('');
  });

  it('shows one card however many are pending, folding the rest into a line', () => {
    const html = render([LEVEL, MASTERY, RESEARCH]);
    expect((html.match(/role="status"/g) ?? []).length).toBe(1);
    expect(html).toContain('+2 more');
    expect(html).not.toContain('role="dialog"');
  });

  it('copy comes from the libs the screens read', () => {
    expect(describeMoment(LEVEL)).toMatchObject({
      title: 'Level 4',
      detail: LEVELS.find((l) => l.level === 4)!.name,
    });
    expect(describeMoment(MASTERY)).toMatchObject({
      kicker: MASTERY_STAGE_LABEL.mastered,
      title: getPrintedCard(herb.id)!.commonName,
    });
    expect(describeMoment(RESEARCH).title).toBe(task.title);
    expect(describeMoment({ id: 'x', kind: 'research', taskId: 'nope' }).title).toBe('Field Research');
  });

  it('never states XP or a medicinal effect', () => {
    for (const m of [LEVEL, MASTERY, RESEARCH]) {
      const c = describeMoment(m);
      expect(`${c.kicker} ${c.title} ${c.detail ?? ''}`).not.toMatch(/\bXP\b|heal|cure|treat/i);
    }
  });

  it('has Skip, Escape, a 44px target and a real status role', () => {
    expect(CODE).toMatch(/'Escape'/);
    expect(CODE).toMatch(/Skip/);
    expect(CODE).toMatch(/min-h-11/);
    expect(CODE).toMatch(/role="status"/);
    expect(render([LEVEL])).toContain('min-h-11');
  });

  it('owns no threshold literal and no fixed random', () => {
    for (const level of LEVELS) {
      if (level.minXp > 0) expect(CODE).not.toMatch(new RegExp(`\\b${level.minXp}\\b`));
    }
    expect(CODE).not.toMatch(/Math\.random/);
  });

  it('auto-dismisses only when untouched', () => {
    expect(CODE).toMatch(/touched\.current/);
  });
});

describe('the earned-moment and camera CSS', () => {
  it('exists and sits before the boss block', () => {
    expect(START).toBeGreaterThan(0);
    expect(END).toBeGreaterThan(START);
  });

  it('never loops, blurs or filters', () => {
    const own = BLOCK.replace(/\.scan-scout\.scout-waiting \{[^}]*\}/, '');
    expect(own).not.toMatch(/infinite/);
    expect(own).not.toMatch(/blur\(|filter\s*:|backdrop-filter/);
  });

  it('runs one iteration and snaps on steps()', () => {
    for (const name of ['earned-rise', 'earned-dot', 'earned-text-in', 'shutter-flash', 'shutter-snap']) {
      const uses = [...BLOCK.matchAll(new RegExp(`animation:\\s*${name}\\s[^;]*`, 'g'))];
      expect(uses.length, name).toBeGreaterThan(0);
      for (const use of uses) expect(use[0], name).toMatch(/steps\(/);
    }
  });

  it('lists every new animation in the reduced-motion block', () => {
    const reduced = BLOCK.slice(BLOCK.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    for (const cls of ['.earned-card', '.earned-dot', '.earned-kicker', '.earned-title', '.shutter-brackets', '.shutter-flash', '.scout-waiting']) {
      expect(reduced, cls).toContain(cls);
    }
    expect(reduced).toMatch(/\.shutter-flash \{[^}]*display: none/);
  });

  it('never prints text under 0.72rem and never intercepts taps with the flash', () => {
    for (const m of BLOCK.matchAll(/font-size:\s*([\d.]+)rem/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(0.72);
    expect(BLOCK).toMatch(/\.shutter-flash \{[^}]*pointer-events: none/);
    expect(BLOCK).toMatch(/\.shutter-brackets \{[^}]*pointer-events: none/);
  });

  it('gates the scout on .scout-waiting', () => {
    expect(BLOCK).toMatch(/\.scan-scout\.scout-waiting \{[^}]*scan-scout-look/);
    const rule = CSS_RAW.slice(CSS_RAW.indexOf('\n.scan-scout {'));
    expect(rule.slice(0, rule.indexOf('}'))).toMatch(/animation:\s*none/);
  });
});
