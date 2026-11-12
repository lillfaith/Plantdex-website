/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HAPTICS — capability-detected, never assumed, and a no-op by default.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * THERE IS NO WEB HAPTICS API ON iOS SAFARI, AND THAT IS THE WHOLE REASON THIS FILE IS AN
 * ABSTRACTION RATHER THAN A CALL TO `navigator.vibrate`.
 *
 * `navigator.vibrate` is the Vibration API. Android browsers implement it; Safari — on iOS
 * and macOS — does not, and does not expose the Taptic Engine to web content by any other
 * route either. So on an iPhone, which is most of the audience for a product somebody uses
 * while standing in front of a plant, the obvious implementation does nothing at all.
 *
 * Worse, it does nothing SILENTLY. `'vibrate' in navigator` is false there, so a guarded
 * call neither throws nor warns, and the feature reads as shipped. The known workarounds —
 * a hidden `<input type="checkbox" switch>`, an `<label>` toggled in a gesture handler —
 * are side effects of a WebKit implementation detail rather than an interface, work on some
 * versions and not others, and would put a fake control in the accessibility tree. None of
 * them is in here.
 *
 * What DOES reach the Taptic Engine is a native bridge, which is exactly what the iOS
 * packaging assessment is about. So `detectChannel` looks for a Capacitor Haptics plugin
 * FIRST: inside a native shell the real thing is available, and on the web the same call
 * sites degrade to the Vibration API or to nothing. That ordering is the forward
 * compatibility — the call sites never change, only what answers them.
 * ───────────────────────────────────────────────────────────────────────────────
 *
 * IT CAN NEVER THROW. Every path is wrapped, because a decorative buzz must not be able to
 * break the dialog that reports somebody's discovery. A browser may also refuse a vibration
 * for its own reasons (no user activation yet, a background tab, a platform policy) and
 * `navigator.vibrate` then simply returns false — which is not an error and is not reported
 * as one.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** The two things worth feeling. More kinds would be more precision than the hardware has. */
export type HapticKind =
  /** A light tick: the card turning over. */
  | 'tap'
  /** A short double pulse: a level-up or an achievement — something was won. */
  | 'success';

/** Which implementation is answering, if any. */
export type HapticChannel = 'native' | 'vibrate' | 'none';

/**
 * The pieces of the environment this module reads. Taken as an argument rather than off the
 * globals so every branch below is reachable from a test — the alternative is mutating
 * `navigator` in jsdom, which is both fragile and shared between test files.
 */
export interface HapticScope {
  readonly vibrate?: unknown;
  /** A Capacitor-style bridge: `Capacitor.Plugins.Haptics`. */
  readonly nativeHaptics?: unknown;
  /** Whether the viewer asked for reduced motion. */
  readonly reducedMotion?: boolean;
}

/**
 * Vibration patterns, in milliseconds, for the Vibration API's array form.
 *
 * DELIBERATELY SHORT. A haptic that outlasts the thing it is reporting stops being feedback
 * and becomes a notification, and the thing being reported here is a card turning over.
 * 12ms is at the floor of what most Android motors render as a distinct tick rather than a
 * hum; the success pattern is two of those with a gap, which is read as "two" rather than
 * as "longer".
 */
export function vibrationPattern(kind: HapticKind): number[] {
  return kind === 'success' ? [12, 44, 12] : [12];
}

/** The Capacitor Haptics argument for each kind, mapped to that plugin's own vocabulary. */
export function nativeCall(kind: HapticKind): { method: 'impact' | 'notification'; arg: object } {
  return kind === 'success'
    ? { method: 'notification', arg: { type: 'SUCCESS' } }
    : { method: 'impact', arg: { style: 'LIGHT' } };
}

/**
 * Which channel this environment offers.
 *
 * REDUCED MOTION SILENCES IT, and that is a judgement call rather than a spec requirement,
 * so it is written down. `prefers-reduced-motion` is about visual motion; haptics are a
 * different sense and nothing says the preference covers them. But it is the only standing
 * signal a browser gives for "I do not want decorative sensory feedback", vestibular
 * disorders are a common reason to set it, and the cost of reading it too broadly is a
 * missing buzz while the cost of ignoring it is a device shaking in the hand of somebody
 * who asked the opposite. An explicit toggle would be better than inferring from this one,
 * and belongs with the rest of the player's settings rather than invented here.
 */
export function detectChannel(scope: HapticScope): HapticChannel {
  if (scope.reducedMotion) return 'none';
  if (scope.nativeHaptics) return 'native';
  if (typeof scope.vibrate === 'function') return 'vibrate';
  return 'none';
}

/** The real environment. Returns an empty scope on the server, where there is no navigator. */
function currentScope(): HapticScope {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return {};
  const bridge = (window as { Capacitor?: { Plugins?: { Haptics?: unknown } } }).Capacitor;
  return {
    vibrate: (navigator as Navigator & { vibrate?: unknown }).vibrate,
    nativeHaptics: bridge?.Plugins?.Haptics,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

/**
 * Fire a haptic, if this device has one and the viewer has not asked for less.
 *
 * Returns the channel that handled it, which is what makes the no-op path observable in a
 * test. Callers ignore it: there is nothing a UI should do differently because a phone
 * cannot buzz.
 */
export function haptic(kind: HapticKind, scope: HapticScope = currentScope()): HapticChannel {
  const channel = detectChannel(scope);
  try {
    if (channel === 'native') {
      const { method, arg } = nativeCall(kind);
      const plugin = scope.nativeHaptics as Record<string, ((a: object) => unknown) | undefined>;
      const fn = plugin[method];
      // A bridge that exists but lacks this method is a version mismatch, not an error.
      if (typeof fn !== 'function') return 'none';
      fn.call(plugin, arg);
      return 'native';
    }
    if (channel === 'vibrate') {
      (scope.vibrate as (p: number[]) => boolean).call(navigator, vibrationPattern(kind));
      return 'vibrate';
    }
  } catch {
    // A decorative buzz may not break the dialog it was decorating.
    return 'none';
  }
  return channel;
}
