/**
 * The tour can be opened on purpose, by anybody, from anywhere.
 *
 * Automatic display is decided by `shouldShowWelcome` and only ever reaches a player with
 * no discoveries and no dismissal. This is the other door: an explicit request. It reads and
 * writes NO flag, so an existing player who takes the tour is not reset, re-onboarded or
 * counted as new — the dialog simply opens, and closes again.
 *
 * A window event rather than shared state because the opener (a link on the homepage) and
 * the dialog (mounted once in the layout) share no ancestor that owns anything else.
 */
export const TOUR_EVENT = 'plantdex:take-the-tour';

export function openTour(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(TOUR_EVENT));
}
