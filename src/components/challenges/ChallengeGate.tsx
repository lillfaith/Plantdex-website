'use client';

import dynamic from 'next/dynamic';

/**
 * THE ONLY DOOR TO THE CHALLENGE SCREENS, and it is shut unless the build says otherwise.
 *
 * The experience (and with it the whole draft question bank) is loaded through a dynamic import
 * that sits inside a build-time condition on `NEXT_PUBLIC_BOSS_FORMS`. With the flag unset, as
 * in production, the bundler drops the import, so the draft questions are not merely hidden by
 * a screen: they are not in any file the site ships. `preview` is development-only, the same
 * rule `bossFormsMode` enforces, and `challenge-screens.test.ts` pins both halves.
 */
const Experience =
  process.env.NEXT_PUBLIC_BOSS_FORMS === 'on' || process.env.NEXT_PUBLIC_BOSS_FORMS === 'preview'
    ? dynamic(() => import('./ChallengeExperience').then((m) => m.ChallengeExperience), {
        ssr: false,
      })
    : null;

export function ChallengeGate({ herbId, name }: { herbId: string; name: string }) {
  if (!Experience) {
    return <p className="mt-10 text-center text-violet-200">Boss Forms are not available yet.</p>;
  }
  return <Experience herbId={herbId} name={name} />;
}
