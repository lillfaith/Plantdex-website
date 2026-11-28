import type { Metadata } from 'next';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { FieldBoardView } from '@/components/leaderboard/FieldBoardView';

export const metadata: Metadata = {
  title: 'Field Board',
  description:
    'A standing built from field work: species found, Field Journal entries written and research challenges completed. Opt-in, and self-reported rather than verified.',
};

export default function LeaderboardPage() {
  // The page background is a fixed atmosphere layer; the screen itself (in the board component) carries the lavender ground attributes.
  return (
    <>
      <PageAtmosphere theme="collection" />
      <FieldBoardView />
    </>
  );
}
