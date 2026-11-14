import type { PageThemeId } from '@/lib/page-themes';

/**
 * A page's ground: a fixed, opaque, server-rendered gradient behind everything.
 *
 * WHY A FIXED ELEMENT AND NOT A BODY BACKGROUND. `body` already paints the global ground with
 * `background-attachment: fixed`, which iOS Safari does not honour, and a per-route body
 * class would need client code to set it (a flash of the wrong world on every navigation).
 * This is plain HTML in the page's own output, so the right atmosphere is there on first
 * paint, and `position: fixed` is the form Safari does support.
 *
 * It paints over the body's gradient at `-z-20` and under `SiteDecor`'s hills and stars
 * (`-z-10`), so the existing scenery still stands in front of it. It is `aria-hidden`,
 * `pointer-events-none`, carries no text and does not animate.
 */
export function PageAtmosphere({ theme }: { theme: PageThemeId }) {
  return <div aria-hidden="true" data-page-theme={theme} className="page-atmosphere" />;
}
