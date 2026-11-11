import type { Metadata } from 'next';
import { FieldBoardView } from '@/components/leaderboard/FieldBoardView';

export const metadata: Metadata = {
  title: 'Field Board',
  description:
    'A standing built from field work: species found, Field Journal entries written and research challenges completed. Opt-in, and self-reported rather than verified.',
};

export default function LeaderboardPage() {
  return <FieldBoardView />;
}
