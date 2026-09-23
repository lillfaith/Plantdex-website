/**
 * The ad spec: one JSON file per video in `ads/`. Every asset is named by a manifest key
 * (a plant id, a screen key, a UI-part key, a pack path) — never a URL — so swapping the
 * plant, the screenshots or the order of scenes is a data edit, not a code change.
 *
 * TEXT HAS A PROVENANCE. A caption is either `quote` (the app's own words, which
 * `lint:ads` finds verbatim in the website's `src/`), `card` (a template filled from the
 * card's own data, e.g. "{commonName}"), or `authored` (ad copy, scanned for banned claims
 * and read by a person). Nothing on screen is anonymous.
 */

export type TextSource = 'quote' | 'card' | 'authored';

export interface Line {
  text: string;
  source: TextSource;
}

export type SpriteStage = 'adult' | 'growing' | 'sprout';

export interface Pan {
  /** 0 = top of the screenshot, 1 = bottom. */
  y: number;
  zoom: number;
  /** 0 = left, 1 = right; only matters when zoomed in. */
  x?: number;
}

export interface Highlight {
  /** Fractions of the screenshot, so a highlight survives a different framing. */
  x: number;
  y: number;
  w: number;
  h: number;
  from: number;
  to: number;
}

interface SceneBase {
  /** How this scene enters from the previous one. Ignored on the first scene. */
  enter?: Transition;
}

export interface HookScene extends SceneBase {
  type: 'hook';
  duration: number;
  plant: string;
  stage: SpriteStage;
  spriteScale: number;
  lines: Line[];
  /** Index into `lines` rendered in the accent colour. */
  accent?: number;
}

export interface CardRevealScene extends SceneBase {
  type: 'cardReveal';
  duration: number;
  plant: string;
  kicker?: Line;
  caption: Line;
}

export interface PhotoScene extends SceneBase {
  type: 'photo';
  duration: number;
  image: string;
  from: Pan;
  to: Pan;
  kicker?: Line;
  caption: Line;
  /** Where the caption plate sits. Pick the side with no printed card text under it. */
  captionAt?: 'top' | 'bottom';
}

export interface FootageScene extends SceneBase {
  type: 'footage';
  duration: number;
  /** Key under `footage` in the manifest (owner-shot video). */
  clip: string;
  /** Seconds into the clip to start. */
  startAt?: number;
  /** <1 slows the clip down to fill the scene; never so slow that it runs out. */
  playbackRate?: number;
  /** Slow push-in on the footage, uniform scale only. */
  zoomFrom?: number;
  zoomTo?: number;
  /** Shift the footage down (px) to clear the caption plate off printed card text. */
  offsetY?: number;
  kicker?: Line;
  caption: Line;
  captionAt?: 'top' | 'bottom';
}

export interface ScreenShot {
  screen: string;
  framing: 'phone-viewport' | 'phone-full';
  duration: number;
  from: Pan;
  to: Pan;
  caption: Line;
  highlights?: Highlight[];
}

export interface ScreenDemoScene extends SceneBase {
  type: 'screenDemo';
  duration: number;
  shots: ScreenShot[];
  safety?: Line;
}

export interface UiCalloutScene extends SceneBase {
  type: 'uiCallout';
  duration: number;
  part: string;
  /** Crop of the part, as fractions, before it is fitted to the frame. */
  crop?: { x: number; y: number; w: number; h: number };
  kicker?: Line;
  caption: Line;
  /** A row of one plant's real growth-stage sprites under the panel, each with its label. */
  growth?: { plant: string; stages: { stage: SpriteStage; label: Line }[] };
}

export interface CtaScene extends SceneBase {
  type: 'cta';
  duration: number;
  /** A product photograph (pack path) shown above the headline. */
  photo?: string;
  headline: Line;
  lines: Line[];
  sprites: { plant: string; stage: SpriteStage }[];
  button?: Line;
  safety?: Line;
}

export type Transition = 'fade' | 'slide-up' | 'wipe';

export type Scene =
  | HookScene
  | CardRevealScene
  | PhotoScene
  | FootageScene
  | ScreenDemoScene
  | UiCalloutScene
  | CtaScene;

export interface AdSpec {
  id: string;
  title: string;
  fps: number;
  width: number;
  height: number;
  transitionFrames: number;
  /** Target length in frames. `lint:ads` fails if the scenes do not add up to it. */
  durationInFrames: number;
  scenes: Scene[];
}

/** Scenes overlap by one transition each, exactly as TransitionSeries lays them out. */
export function totalFrames(spec: Pick<AdSpec, 'scenes' | 'transitionFrames'>): number {
  const sum = spec.scenes.reduce((n, s) => n + s.duration, 0);
  return sum - spec.transitionFrames * Math.max(0, spec.scenes.length - 1);
}
