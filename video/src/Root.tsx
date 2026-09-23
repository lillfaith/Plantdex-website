import React from 'react';
import { Composition } from 'remotion';
import { Ad } from './Ad';
import { ADS } from './ads';
import { totalFrames } from './lib/spec';

export const Root: React.FC = () => (
  <>
    {ADS.map((spec) => (
      <Composition
        key={spec.id}
        id={spec.id}
        component={Ad}
        width={spec.width}
        height={spec.height}
        fps={spec.fps}
        durationInFrames={totalFrames(spec)}
        defaultProps={{ spec }}
      />
    ))}
  </>
);
