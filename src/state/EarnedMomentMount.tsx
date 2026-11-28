'use client';

import { EarnedMomentHost } from '@/components/ui/EarnedMomentHost';
import { useHerbdex } from './HerbdexProvider';

/**
 * Connects the provider's authoritative earned-moment queue to the host. Mount once in the shell,
 * inside `HerbdexProvider`. It renders nothing when the queue is empty.
 */
export function EarnedMomentMount() {
  const { earnedMoments, acknowledgeMoment } = useHerbdex();
  return <EarnedMomentHost moments={earnedMoments} onAcknowledge={acknowledgeMoment} />;
}
