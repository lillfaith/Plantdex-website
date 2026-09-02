import type { Metadata } from 'next';
import { ProfileView } from '@/components/profile/ProfileView';
import { TrackView } from '@/components/analytics/TrackView';

export const metadata: Metadata = {
  title: 'My Profile',
  description:
    'Your Plantdex field-naturalist card: level, collection, habitats, achievements and the plants that travel with you.',
};

/**
 * A server shell, so the static export keeps a prerendered page and only the parts that
 * genuinely need the browser ship as client components. `TrackView` is the same one-event
 * island `/herbdex` and `/garden` use, for the same reason: a server component cannot call
 * `track()`, and converting the page wholesale to measure one number is a poor trade.
 */
export default function ProfilePage() {
  return (
    <>
      <TrackView event="profile_opened" />
      <ProfileView />
    </>
  );
}
