import type { Metadata } from 'next';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { FieldBoardView } from '@/components/leaderboard/FieldBoardView';

export const metadata: Metadata = {
  title: 'Field Board',
  description:
    'A standing built from field work: species found, Field Journal entries written and research challenges completed. Opt-in, and self-reported rather than verified.',
};

export default function LeaderboardPage() {
  // A wrapper rather than an attribute on <main>: <main> lives in the board component. Same ground as Collection.
  return (
    <div data-ground="lavender" data-palette="card">
      <PageAtmosphere theme="collection" />
      <FieldBoardView />
    </div>
  );
}
