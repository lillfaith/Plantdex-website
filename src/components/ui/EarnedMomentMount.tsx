'use client';

import { useHerbdex } from '@/state/HerbdexProvider';
import { EarnedMomentHost } from './EarnedMomentHost';

/** Connects the provider's authoritative earned-moment queue to the host. Mount once in the shell. */
export function EarnedMomentMount() {
  const { earnedMoments, acknowledgeMoment } = useHerbdex();
  return <EarnedMomentHost moments={earnedMoments} onAcknowledge={acknowledgeMoment} />;
}
