/**
 * THE SELECTION / CONFIRMATION STATE MACHINE OF A CHALLENGE RUN, as pure functions.
 *
 * A player picks, may change their mind, then confirms. Confirming LOCKS the answer: nothing can
 * change it afterwards, so there is no second go at a question once it has been checked.
 *
 *   answering, nothing picked   -> select -> answering, picked
 *   answering, picked           -> select -> answering, picked (a different one)
 *   answering, picked           -> check  -> locked            (feedback is shown by the screen)
 *   locked                      -> next   -> answering on the following question
 *   locked, last question       -> next   -> submitting        (the whole set goes to scoring)
 *
 * THE BOSS TRIAL IS THE SAME MACHINE WITH ONE DIFFERENCE: `hidden` is true, so checking seals the
 * answer and moves on in one step, because nothing may be revealed until the whole Trial is
 * submitted. Whether a stage is hidden is decided by `revealsAnswersAtEndOnly` in the rules
 * module and passed in; nothing here knows which activity it is.
 *
 * NOTHING HERE SCORES ANYTHING. The only thing this module produces is the list of option indexes
 * the player locked, in order, which is exactly what `scoreSubmission` and the server read.
 */
export type FlowPhase = 'answering' | 'submitting';

export interface FlowState {
  readonly index: number;
  /** The option currently picked but not yet confirmed, or null. Changeable until checked. */
  readonly selected: number | null;
  /** The option the player confirmed for THIS question, or null while it is still open. */
  readonly locked: number | null;
  /** One locked option index per question answered so far. */
  readonly answers: readonly number[];
  readonly phase: FlowPhase;
}

export const START: FlowState = { index: 0, selected: null, locked: null, answers: [], phase: 'answering' };

export interface FlowContext {
  readonly total: number;
  /** True when answers are not revealed until the end (the Boss Trial). */
  readonly hidden: boolean;
  /** How many options the current question has, so a stray index can never be selected. */
  readonly optionCount: number;
}

export type FlowEvent = { type: 'select'; index: number } | { type: 'check' } | { type: 'next' };

function advance(state: FlowState, answers: readonly number[], total: number): FlowState {
  if (state.index >= total - 1) return { ...state, answers, selected: null, locked: null, phase: 'submitting' };
  return { index: state.index + 1, selected: null, locked: null, answers, phase: 'answering' };
}

/** The same object comes back when an event does nothing, so a repeat tap cannot re-trigger work. */
export function step(state: FlowState, event: FlowEvent, ctx: FlowContext): FlowState {
  if (state.phase !== 'answering') return state;
  switch (event.type) {
    case 'select': {
      if (state.locked !== null) return state; // locked: no change after the answer is checked
      if (!Number.isInteger(event.index) || event.index < 0 || event.index >= ctx.optionCount) return state;
      if (state.selected === event.index) return state;
      return { ...state, selected: event.index };
    }
    case 'check': {
      if (state.locked !== null || state.selected === null) return state;
      const answers = [...state.answers.slice(0, state.index), state.selected];
      if (ctx.hidden) return advance(state, answers, ctx.total); // sealed: nothing is shown, move on
      return { ...state, locked: state.selected, answers };
    }
    case 'next': {
      if (state.locked === null) return state; // cannot skip a question that is not checked
      return advance(state, state.answers, ctx.total);
    }
  }
}

/** What the single bottom action does right now. The screen turns this into a label. */
export type FlowAction = 'choose' | 'check' | 'seal' | 'submit' | 'next' | 'finish' | 'wait';

export function actionFor(state: FlowState, ctx: FlowContext): FlowAction {
  if (state.phase === 'submitting') return 'wait';
  const last = state.index === ctx.total - 1;
  if (state.locked !== null) return last ? 'finish' : 'next';
  if (state.selected === null) return 'choose';
  if (ctx.hidden) return last ? 'submit' : 'seal';
  return 'check';
}
