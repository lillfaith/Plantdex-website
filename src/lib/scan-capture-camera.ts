/**
 * Live-camera capture: the side-effecting half, with every browser API injected.
 *
 * - Off by default. With `NEXT_PUBLIC_CAMERA_CAPTURE` not 'on', no method touches `deps`,
 *   `navigator`, `window` or storage.
 * - Every exit path stops every track: a failure, a decline, a captured frame, a release, and
 *   a stream that arrives after the player has already left.
 * - The frame goes through `prepareImage`, so there is no path returning original bytes and
 *   the output is a fresh JPEG. Nothing is stored or uploaded here, and no location is read.
 * - Nothing here retries. A rejection is mapped to a state and stays there.
 */
import { IDENTIFY_PROFILE, prepareImage, type PreparedImage, type PrepareProfile } from './image-prepare';
import {
  ANONYMOUS_CAPTURE_SCOPE,
  isCameraCaptureEnabled,
  readDeclined,
  stateForError,
  transition,
  writeDeclined,
  type CaptureChannel,
  type CaptureEnvironment,
  type CaptureState,
  type DeclineStorage,
} from './scan-capture';

export interface CameraTrack {
  stop(): void;
}
export interface CameraStream {
  getTracks(): CameraTrack[];
}
/** What a video element exposes once a stream is playing in it. */
export interface FrameSource {
  videoWidth: number;
  videoHeight: number;
}
export interface FrameCanvas {
  getContext(kind: '2d'): { drawImage(source: unknown, x: number, y: number, w: number, h: number): void } | null;
  toBlob(callback: (blob: Blob | null) => void, type: string, quality: number): void;
}

export interface CaptureDeps {
  getUserMedia: (constraints: { video: { facingMode: { ideal: string } }; audio: false }) => Promise<CameraStream>;
  environment: CaptureEnvironment;
  storage: DeclineStorage | null;
  createCanvas: (width: number, height: number) => FrameCanvas;
  prepare: (file: File, profile: PrepareProfile) => Promise<PreparedImage>;
}

/** The real browser bindings, resolved only when called, never at import. */
export function browserCaptureDeps(): CaptureDeps {
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  return {
    getUserMedia: (c) => md!.getUserMedia(c) as Promise<CameraStream>,
    environment: { secureContext: window.isSecureContext, hasGetUserMedia: typeof md?.getUserMedia === 'function' },
    storage,
    createCanvas: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas as unknown as FrameCanvas;
    },
    prepare: prepareImage,
  };
}

/** A prepared frame plus the declared reason. A tag, not a statement about the plant. */
export interface CapturedFrame {
  image: PreparedImage;
  channel: CaptureChannel;
  source: 'live-camera';
}

export interface CameraCapture {
  readonly state: CaptureState;
  /** The open stream, for the UI to attach to a video element; null when none is open. */
  readonly stream: CameraStream | null;
  /** Work out what this device and page can do. Asks nothing. */
  probe(): CaptureState;
  /** Ask once. A no-op after a decline, however it is called. */
  request(): Promise<CaptureState>;
  capture(video: FrameSource, channel: CaptureChannel): Promise<CapturedFrame | null>;
  release(): void;
}

export function createCameraCapture(options: {
  deps: () => CaptureDeps;
  scope?: string;
  profile?: PrepareProfile;
}): CameraCapture {
  const scope = options.scope ?? ANONYMOUS_CAPTURE_SCOPE;
  const profile = options.profile ?? IDENTIFY_PROFILE;
  let state: CaptureState = 'unsupported';
  let stream: CameraStream | null = null;
  let deps: CaptureDeps | null = null;
  /** Bumped by `release`, so a stream resolving for a player who left is stopped on arrival. */
  let generation = 0;

  const stopAll = (s: CameraStream | null) => {
    if (!s) return;
    for (const track of s.getTracks()) {
      try {
        track.stop();
      } catch {
        /* a track that will not stop must not stop the others being stopped */
      }
    }
  };
  const closeStream = () => {
    stopAll(stream);
    stream = null;
  };

  return {
    get state() {
      return state;
    },
    get stream() {
      return stream;
    },
    probe() {
      if (!isCameraCaptureEnabled()) return state; // off: stays 'unsupported', touches nothing
      deps = options.deps();
      state = transition(state, {
        type: 'probe',
        env: deps.environment,
        declinedBefore: readDeclined(deps.storage, scope),
      });
      return state;
    },
    async request() {
      if (!isCameraCaptureEnabled() || !deps) return state;
      const next = transition(state, { type: 'request' });
      if (next !== 'prompting') return state; // includes denied: never asked twice
      state = next;
      const mine = ++generation;
      try {
        const opened = await deps.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (mine !== generation) {
          stopAll(opened);
          return state;
        }
        stream = opened;
        state = transition(state, { type: 'granted' });
      } catch (error) {
        if (mine !== generation) return state;
        const to = stateForError(error);
        if (to === 'denied') writeDeclined(deps.storage, scope);
        state = transition(state, { type: 'failed', to });
      }
      return state;
    },
    async capture(video, channel) {
      const current = deps;
      if (!isCameraCaptureEnabled() || !current) return null;
      const next = transition(state, { type: 'capture' });
      if (next !== 'capturing') return null;
      state = next;
      try {
        if (!video.videoWidth || !video.videoHeight) throw new Error('no frame');
        const canvas = current.createCanvas(video.videoWidth, video.videoHeight);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('no 2d context');
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        if (!blob) throw new Error('encode failed');
        const image = await current.prepare(new File([blob], 'capture.jpg', { type: 'image/jpeg' }), profile);
        state = transition(state, { type: 'captured' });
        return { image, channel, source: 'live-camera' };
      } catch {
        state = transition(state, { type: 'capture-failed' });
        return null;
      } finally {
        closeStream();
      }
    },
    release() {
      generation++;
      closeStream();
      state = transition(state, { type: 'release' });
    },
  };
}
