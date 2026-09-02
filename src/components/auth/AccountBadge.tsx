'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAuth } from '@/state/AuthProvider';
import { useHerbdex } from '@/state/HerbdexProvider';
import { getHerb } from '@/lib/deck';
import { stageForState } from '@/lib/garden';
import { resolveProfile } from '@/lib/player-profile';
import { useProfileStore } from '@/lib/profile-store';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';

/**
 * Your face in the corner, and the way into your profile.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A persistent, sitewide account affordance — not a seventh destination in `SiteNav` (see
 * that file's comment on why six is the limit). Floats top-right, clear of the fixed bottom
 * nav on mobile and the top nav on wider screens.
 *
 * IT SHOWS THE PLANT YOU CHOSE. The avatar comes through `resolveProfile`, the same path the
 * profile page uses, so a badge can never display a plant you have not discovered or a frame
 * you have not earned — the validation lives in one place and this inherits it rather than
 * repeating it.
 *
 * IT IS FROZEN. `PlantSprite`'s `frozen` holds frame 0, which every sprite authors as a
 * complete resting pose. This element is on EVERY page in the app, and a creature idling
 * forever in the corner of something you are trying to read is exactly the ambient motion
 * the profile was careful to ration. One still portrait costs nothing and asks for nothing.
 *
 * IT NEVER BECOMES AN EMPTY CIRCLE. No avatar chosen, nothing discovered yet, or an id whose
 * sprite is missing — any of those and it falls back to the email initial, which is what it
 * has always been. A badge that renders blank reads as a broken page.
 *
 * WHERE IT GOES. Signed in, your profile: that is where identity, your data and account
 * deletion now live. Signed out it still says "Sign in" and leads to the auth page, because
 * there is no session to show and asking someone to find the sign-in form inside a profile
 * would be a worse door.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function AccountBadge() {
  const { ready, configured, user } = useAuth();
  const { state } = useHerbdex();
  const { profile: stored } = useProfileStore();

  const resolved = useMemo(() => resolveProfile(stored, state), [stored, state]);
  const herb = resolved.avatarHerbId ? getHerb(resolved.avatarHerbId) : undefined;

  if (!configured || !ready) return null;

  const initial = user?.email?.[0]?.toUpperCase();

  /*
   * `tap-44` because the badge is drawn at 36px. Same trick the filter chips use: the visual
   * size stays as designed and an invisible overlay keeps the thumb area at 44px.
   */
  const shell =
    'tap-44 fixed top-2 right-2 z-40 flex items-center justify-center rounded-full sm:top-3 sm:right-3';

  if (herb) {
    return (
      <Link
        /* Always the profile: an avatar means there is a collection to show, and the page
           works signed out. Only the fallback badge cares about the session. */
        href="/profile"
        aria-label={`Your profile — ${herb.commonName}`}
        className={`${shell} transition-transform hover:scale-105 motion-reduce:transition-none`}
      >
        <ProfileAvatar
          herbId={herb.id}
          herbName={herb.commonName}
          frame={resolved.frame}
          stage={stageForState(state, herb.id) ?? 'flowering'}
          size="xs"
          frozen
        />
      </Link>
    );
  }

  return (
    <Link
      href={user ? '/profile' : '/account'}
      className={`${shell} h-9 min-w-9 border border-violet-600 bg-plum-950/90 px-3 text-xs font-semibold text-violet-100 backdrop-blur hover:bg-plum-600/80`}
    >
      {user ? (initial ?? 'Account') : 'Sign in'}
    </Link>
  );
}
