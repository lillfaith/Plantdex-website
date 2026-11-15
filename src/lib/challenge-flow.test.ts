import { describe, expect, it } from 'vitest';
import { START, actionFor, step, type FlowContext, type FlowState } from './challenge-flow';

const stage: FlowContext = { total: 3, hidden: false, optionCount: 3 };
const trial: FlowContext = { total: 3, hidden: true, optionCount: 3 };

function run(ctx: FlowContext, events: Parameters<typeof step>[1][], from: FlowState = START): FlowState {
  return events.reduce((state, event) => step(state, event, ctx), from);
}

describe('select, check, feedback', () => {
  it('starts with nothing picked and the action asking for a choice', () => {
    expect(START.selected).toBeNull();
    expect(actionFor(START, stage)).toBe('choose');
  });

  it('lets the player pick and change their mind any number of times before checking', () => {
    const picked = run(stage, [{ type: 'select', index: 0 }, { type: 'select', index: 2 }, { type: 'select', index: 1 }]);
    expect(picked.selected).toBe(1);
    expect(picked.locked).toBeNull();
    expect(actionFor(picked, stage)).toBe('check');
  });

  it('checking locks the answer: no later pick can change it', () => {
    const checked = run(stage, [{ type: 'select', index: 1 }, { type: 'check' }]);
    expect(checked.locked).toBe(1);
    expect(checked.answers).toEqual([1]);
    const tried = step(checked, { type: 'select', index: 2 }, stage);
    expect(tried).toBe(checked); // the same object: nothing changed
    expect(step(checked, { type: 'check' }, stage)).toBe(checked);
  });

  it('cannot check with nothing picked, and cannot move on from an unchecked question', () => {
    expect(step(START, { type: 'check' }, stage)).toBe(START);
    const picked = step(START, { type: 'select', index: 0 }, stage);
    expect(step(picked, { type: 'next' }, stage)).toBe(picked);
  });

  it('ignores an option that does not exist', () => {
    expect(step(START, { type: 'select', index: 3 }, stage)).toBe(START);
    expect(step(START, { type: 'select', index: -1 }, stage)).toBe(START);
    expect(step(START, { type: 'select', index: 0.5 }, stage)).toBe(START);
  });

  it('after next, the following question starts open and the answer given stays in the list', () => {
    const second = run(stage, [{ type: 'select', index: 2 }, { type: 'check' }, { type: 'next' }]);
    expect(second.index).toBe(1);
    expect(second.selected).toBeNull();
    expect(second.locked).toBeNull();
    expect(second.answers).toEqual([2]);
  });

  it('the last checked question goes to submitting, carrying every locked answer in order', () => {
    const done = run(stage, [
      { type: 'select', index: 1 }, { type: 'check' }, { type: 'next' },
      { type: 'select', index: 0 }, { type: 'check' }, { type: 'next' },
      { type: 'select', index: 2 }, { type: 'check' },
    ]);
    expect(actionFor(done, stage)).toBe('finish');
    const submitting = step(done, { type: 'next' }, stage);
    expect(submitting.phase).toBe('submitting');
    expect(submitting.answers).toEqual([1, 0, 2]);
    expect(actionFor(submitting, stage)).toBe('wait');
  });

  it('once submitting, nothing else does anything, so a double tap cannot send twice', () => {
    const submitting: FlowState = { index: 2, selected: null, locked: null, answers: [1, 0, 2], phase: 'submitting' };
    for (const event of [{ type: 'select', index: 0 }, { type: 'check' }, { type: 'next' }] as const) {
      expect(step(submitting, event, stage)).toBe(submitting);
    }
  });
});

describe('the Boss Trial seals and moves on, and shows nothing', () => {
  it('names its action "seal", then "submit" on the last step', () => {
    const picked = step(START, { type: 'select', index: 0 }, trial);
    expect(actionFor(picked, trial)).toBe('seal');
    const last = { ...picked, index: 2 };
    expect(actionFor(last, trial)).toBe('submit');
  });

  it('sealing locks nothing visible: it advances at once with the answer recorded', () => {
    const after = run(trial, [{ type: 'select', index: 2 }, { type: 'check' }]);
    expect(after.index).toBe(1);
    expect(after.locked).toBeNull();
    expect(after.answers).toEqual([2]);
  });

  it('submits after the last seal, with every answer in order', () => {
    const after = run(trial, [
      { type: 'select', index: 0 }, { type: 'check' },
      { type: 'select', index: 1 }, { type: 'check' },
      { type: 'select', index: 2 }, { type: 'check' },
    ]);
    expect(after.phase).toBe('submitting');
    expect(after.answers).toEqual([0, 1, 2]);
  });
});
