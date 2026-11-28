/**
 * WHAT THE WAITING PANEL MAY SAY, KEYED BY THE ONLY TWO STAGES THE CODE OBSERVES.
 *
 * `preparing` is `prepareImage` running; `identifying` begins when `identifyPlant` calls back to
 * say preparation finished, and covers everything after (upload, quota, provider, answer),
 * because `fetch` reports no upload completion. There is no third entry and no number that
 * moves on a timer: the bar's fill is a step per real event, never an estimate of progress.
 */
export type ScanStage = 'idle' | 'preparing' | 'identifying';

export const WAITING_COPY = {
  preparing: {
    title: 'Preparing photo…',
    detail: 'Resizing it and removing its location data on your device.',
    fill: '15%',
  },
  identifying: {
    title: 'Identifying…',
    detail: 'Sent for identification. This usually takes a few seconds.',
    fill: '65%',
  },
} as const;

export function waitingCopy(stage: ScanStage) {
  return stage === 'idle' ? null : WAITING_COPY[stage];
}
