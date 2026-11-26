'use client';

import dynamic from 'next/dynamic';

/**
 * THE ONLY DOOR TO THE GEORGIA TRAIL PREVIEW, shut unless the build says otherwise.
 *
 * Same pattern as `ChallengeGate`: the import sits inside a build-time condition on
 * `NEXT_PUBLIC_GEORGIA_QUEST_PREVIEW`, so with the flag unset (production) the bundler drops
 * it and the preview screen is not in any file the site ships. `region-quest.test.ts` pins it.
 */
const Trail =
  process.env.NEXT_PUBLIC_GEORGIA_QUEST_PREVIEW === 'on'
    ? dynamic(() => import('./GeorgiaHabitatQuest').then((m) => m.GeorgiaHabitatQuest), { ssr: false })
    : null;

export function GeorgiaQuestGate() {
  if (!Trail) return null;
  return <Trail />;
}
