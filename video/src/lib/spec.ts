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
  /**
   * A curiosity line shown over the silhouette BEFORE the reveal, word by word. When set, the
   * reveal waits `duration` frames and `lines` become the payoff. `*words*` take the gradient.
   */
  teaser?: { line: Line; duration: number };
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

/** One stat-style tag: a label and the plant's own values for it. */
export interface KnowledgeTag {
  label: Line;
  /**
   * Where the values come from, so lint can check them against THIS plant's data:
   * `identification` = a trait name in src/lib/card-field-notes.ts; any other value is a
   * card-back field in herbs.json (preparations, compounds, usableParts, taste, aromatic).
   */
  field: 'identification' | 'preparations' | 'compounds' | 'usableParts' | 'taste' | 'aromatic';
  items: string[];
}

export interface KnowledgeScene extends SceneBase {
  type: 'knowledge';
  duration: number;
  plant: string;
  headline: Line;
  /** Up to four stat rows under the card, popping in fast from alternating sides. */
  tags: KnowledgeTag[];
  /** Small line under the stats. Required by lint when a tag is about edibility. */
  safety?: Line;
  /**
   * Frame the first row pops. Before it the headline has the screen to itself; once the rows
   * arrive it dims, so there is only ever one thing the eye is asked to read. Default 5.
   */
  rowsAt?: number;
}

export interface ScreenShot {
  screen: string;
  framing: 'phone-viewport' | 'phone-full';
  duration: number;
  from: Pan;
  to: Pan;
  caption: Line;
  highlights?: Highlight[];
  /**
   * A reward stamp that lands under the caption `at` frames into the shot (e.g. "{commonName}
   * unlocked."), with a burst and a glow on the phone frame. Typography and effects only: it
   * never sits on the screenshot, so it cannot be mistaken for app UI.
   */
  payoff?: { line: Line; plant?: string; at: number };
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
  | KnowledgeScene
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
