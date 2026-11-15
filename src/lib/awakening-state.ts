import { CHALLENGE_ACTIVITIES, PREREQUISITE_ACTIVITIES, type ActivityId } from './boss-form';
import type { CompletionsState } from './challenge-completions';

/**
 * WHAT THE AWAKENING MAY SAY, derived in one place so every claim can be tested.
 *
 * The rule that matters: a round is shown as DONE only when something authoritative says so, and is
 * never shown as NOT done unless the answer is actually known.
 *
 *   preview   the passes are simulated ones from this visit. Progress is "known", and labelled.
 *   signedout in `on` mode there is nothing to read. Nothing is claimed.
 *   loading   the read is in flight. Nothing is claimed.
 *   error     the read failed. Nothing is claimed, and it is never turned into an empty set.
 *   ready     the server answered; its set (plus a pass the server confirmed in this visit) is the
 *             truth, and an empty set really means none yet.
 *
 * Preview passes and the server's passes are separate inputs and are never merged: a preview run
 * only ever sees `seen`, and `on` only ever adds `seen` entries that came from a server verdict.
 */
export type ProgressNote = 'loading' | 'error' | 'signedout' | 'preview' | 'ready';
export type NodeState = 'done' | 'next' | 'later' | 'locked' | 'soon' | 'unknown';

export interface AwakeningInput {
  preview: boolean;
  signedIn: boolean;
  completions: CompletionsState;
  /** Passes this visit has seen by a verdict, under the current mode's own key. */
  seen: ReadonlySet<ActivityId>;
  /** Whether a round can be played at all (reviewed, or a development preview). */
  runnable: (activity: ActivityId) => boolean;
}

export interface AwakeningDerived {
  progress: ProgressNote;
  known: boolean;
  done: ReadonlySet<ActivityId>;
  nodes: { activity: ActivityId; state: NodeState }[];
  next: ActivityId | null;
  /** How many of the three rounds are known to be passed. 0 whenever progress is not known. */
  level: number;
}

export function deriveAwakening(input: AwakeningInput): AwakeningDerived {
  const { preview, signedIn, completions, seen, runnable } = input;
  const progress: ProgressNote = preview
    ? 'preview'
    : !signedIn
      ? 'signedout'
      : completions.status === 'ready'
        ? 'ready'
        : completions.status === 'error'
          ? 'error'
          : 'loading';
  const known = progress === 'preview' || progress === 'ready';
  // The server's set counts only once it has arrived; an error or a loading read adds nothing.
  const done = new Set<ActivityId>([...seen, ...(!preview && completions.status === 'ready' ? completions.passed : [])]);
  const trialOpen = PREREQUISITE_ACTIVITIES.every((one) => done.has(one));
  const raw = (activity: ActivityId): NodeState | 'ready' => {
    if (!runnable(activity)) return 'soon';
    if (!known) return 'unknown';
    if (done.has(activity)) return 'done';
    if (activity === 'boss-trial' && !trialOpen) return 'locked';
    return 'ready';
  };
  const next = known ? (CHALLENGE_ACTIVITIES.find((one) => raw(one) === 'ready') ?? null) : null;
  const nodes = CHALLENGE_ACTIVITIES.map((activity) => {
    const s = raw(activity);
    return { activity, state: (activity === next ? 'next' : s === 'ready' ? 'later' : s) as NodeState };
  });
  const level = known ? PREREQUISITE_ACTIVITIES.filter((one) => done.has(one)).length : 0;
  return { progress, known, done, nodes, next, level };
}
