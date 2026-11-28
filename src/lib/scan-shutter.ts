/**
 * THE SHUTTER RESPONSE, AS DATA.
 *
 * Fired by the real capture event only (a frame actually taken), for a fixed window, then gone.
 * It is a pure decision so the reduced-motion rule is testable without a browser: the media
 * query is INJECTED, and the caller reads it inside a handler, never during render (a render
 * read would disagree between the server's markup and the client's).
 *
 * Reduced motion keeps the corner brackets as a static outline and drops the flash. Nothing
 * here delays or gates capture: the photograph is handed on before this is even consulted.
 */
export const SHUTTER_MS = 300;

export type MatchMediaLike = (query: string) => { matches: boolean };

export function shutterPlan(matchMedia?: MatchMediaLike | null): { flash: boolean; brackets: boolean } {
  let reduced = false;
  try {
    reduced = !!matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    reduced = false;
  }
  return { flash: !reduced, brackets: true };
}
