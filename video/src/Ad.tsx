import React from 'react';
import { AbsoluteFill } from 'remotion';
import { linearTiming, TransitionSeries, type TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import type { AdSpec, Scene, Transition } from './lib/spec';
import { C } from './lib/brand';
import { CardRevealView, CtaView, Hook, PhotoView, ScreenDemoView, UiCalloutView } from './scenes/Scenes';

// Widened to one type so TransitionSeries accepts whichever preset a spec picks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presentation = (t: Transition | undefined): TransitionPresentation<any> => {
  switch (t) {
    case 'slide-up':
      return slide({ direction: 'from-bottom' });
    case 'wipe':
      return wipe({ direction: 'from-bottom-left' });
    default:
      return fade();
  }
};

const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  switch (scene.type) {
    case 'hook':
      return <Hook scene={scene} />;
    case 'cardReveal':
      return <CardRevealView scene={scene} />;
    case 'photo':
      return <PhotoView scene={scene} />;
    case 'screenDemo':
      return <ScreenDemoView scene={scene} />;
    case 'uiCallout':
      return <UiCalloutView scene={scene} />;
    case 'cta':
      return <CtaView scene={scene} />;
  }
};

/** One component renders every ad: the spec is the whole creative. */
export const Ad: React.FC<{ spec: AdSpec }> = ({ spec }) => (
  <AbsoluteFill style={{ background: C.ground }}>
    <TransitionSeries>
      {spec.scenes.flatMap((scene, i) => {
        const seq = (
          <TransitionSeries.Sequence key={`s${i}`} durationInFrames={scene.duration}>
            <SceneView scene={scene} />
          </TransitionSeries.Sequence>
        );
        if (i === 0) return [seq];
        return [
          <TransitionSeries.Transition
            key={`t${i}`}
            presentation={presentation(scene.enter)}
            timing={linearTiming({ durationInFrames: spec.transitionFrames })}
          />,
          seq,
        ];
      })}
    </TransitionSeries>
  </AbsoluteFill>
);
