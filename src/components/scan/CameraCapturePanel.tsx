'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createCameraCapture,
  browserCaptureDeps,
  type CameraCapture,
  type CameraStream,
} from '@/lib/scan-capture-camera';
import { ANONYMOUS_CAPTURE_SCOPE, type CaptureState } from '@/lib/scan-capture';
import { captureStateCopy } from '@/lib/scan-capture-copy';
import { SHUTTER_MS, shutterPlan } from '@/lib/scan-shutter';

/**
 * TEST/SANDBOX PREVIEW of live in-app capture, for ONE photo slot at a time. Functional markup
 * only (`data-ui-placeholder`); the owner designs the look.
 *
 * Fails safe at every step: any state that is not a working camera offers the library picker,
 * whose photos still identify (education) but are labelled not eligible to collect. The stream
 * is released on shutter, cancel, unmount and whenever the page is hidden.
 */
export function CameraCapturePanel({
  slotLabel,
  scope,
  onCaptured,
  onUseLibrary,
  onCancel,
  onShutterDone,
}: {
  slotLabel: string;
  scope: string | null;
  onCaptured: (file: File) => void;
  onUseLibrary: () => void;
  onCancel: () => void;
  /** Called once the shutter response has finished, so the parent may close this panel. The photo was handed over earlier. */
  onShutterDone?: () => void;
}) {
  /*
   * Built and probed once, in a lazy initialiser: this panel only mounts after a tap, so `window`
   * exists, and probing asks the browser nothing (no prompt until the player taps Open camera).
   */
  const [camera] = useState<CameraCapture>(() => {
    const created = createCameraCapture({
      deps: browserCaptureDeps,
      scope: scope ?? ANONYMOUS_CAPTURE_SCOPE,
    });
    created.probe();
    return created;
  });
  const cameraRef = useRef<CameraCapture>(camera);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CaptureState>(camera.state);
  const [shutter, setShutter] = useState<{ flash: boolean; brackets: boolean } | null>(null);
  const shutterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shutterActive = useRef(false);
  useEffect(
    () => () => {
      if (shutterTimer.current) clearTimeout(shutterTimer.current);
    },
    [],
  );

  /*
   * THE SHUTTER RESPONSE. Called only with a frame that was really taken, AFTER the photograph
   * has been handed on, so it can neither delay nor block capture. A second call while one is
   * showing is ignored. The reduced-motion query is read here, in a handler, never in render.
   */
  const fireShutter = () => {
    if (shutterActive.current) return;
    shutterActive.current = true;
    setShutter(shutterPlan(typeof window === 'undefined' ? null : window.matchMedia?.bind(window)));
    shutterTimer.current = setTimeout(() => {
      shutterActive.current = false;
      setShutter(null);
      onShutterDone?.();
    }, SHUTTER_MS);
  };

  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === 'hidden') {
        camera.release();
        setState(camera.state);
      }
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', hide);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', hide);
      camera.release();
    };
  }, [camera]);

  // Attach the stream once granted.
  useEffect(() => {
    const video = videoRef.current;
    const stream: CameraStream | null = cameraRef.current?.stream ?? null;
    if (state === 'granted' && video && stream) {
      video.srcObject = stream as unknown as MediaStream;
      void video.play().catch(() => undefined);
    }
  }, [state]);

  const open = async () => {
    const camera = cameraRef.current;
    if (!camera) return;
    setState('prompting');
    setState(await camera.request());
  };

  const shoot = async () => {
    const camera = cameraRef.current;
    const video = videoRef.current;
    if (!camera || !video) return;
    setState('capturing');
    const frame = await camera.capture(video, 'collect');
    setState(camera.state);
    if (!frame) return;
    onCaptured(
      new File([frame.image.blob], `capture-${Date.now()}.${frame.image.extension}`, {
        type: frame.image.contentType,
      }),
    );
    fireShutter();
  };

  const copy = captureStateCopy(state);

  return (
    <section
      aria-label={`Camera: ${slotLabel}`}
      data-ui-placeholder="camera-capture"
      className="panel relative space-y-3 overflow-hidden p-4"
    >
      {shutter && (
        <>
          {shutter.flash && <span aria-hidden="true" className="shutter-flash pointer-events-none absolute inset-0 z-10" />}
          {shutter.brackets && <span aria-hidden="true" className="shutter-brackets pointer-events-none absolute inset-[6%] z-10" />}
        </>
      )}
      <p className="text-sm font-bold text-violet-100">Camera &middot; {slotLabel}</p>
      {(state === 'granted' || state === 'capturing') && (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-label="Camera preview"
          className="aspect-[3/4] w-full rounded-xl bg-plum-950 object-cover"
        />
      )}
      <p role="status" aria-live="polite" className="text-sm leading-relaxed text-violet-200">
        {copy.message}
      </p>
      {!shutter && (
      <div className="flex flex-col gap-2 sm:flex-row">
        {state === 'granted' && (
          <button
            type="button"
            onClick={() => void shoot()}
            className="arcade-key min-h-14 flex-1 rounded-full holo-fill px-6 text-base font-extrabold text-plum-900"
          >
            Take photo
          </button>
        )}
        {copy.canOpen && (
          <button
            type="button"
            onClick={() => void open()}
            className="min-h-11 rounded-full border border-gold-500 bg-gold-500/15 px-5 text-sm font-bold text-gold-300 hover:bg-gold-500/25"
          >
            {state === 'not-asked' ? 'Open camera' : 'Try the camera again'}
          </button>
        )}
        <button
          type="button"
          onClick={onUseLibrary}
          className="min-h-11 rounded-full border border-violet-500 px-5 text-sm font-bold text-violet-100 hover:bg-violet-600/30"
        >
          Use a library photo instead
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full px-5 text-sm font-semibold text-violet-300 underline underline-offset-2"
        >
          Cancel
        </button>
      </div>
      )}
      <p className="text-xs leading-relaxed text-violet-300">
        A library photo can identify a plant but is not eligible to collect a new card.
      </p>
    </section>
  );
}
