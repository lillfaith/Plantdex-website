'use client';

import Link from 'next/link';
import { progressForTask } from '@/lib/research';
import { useHerbdex } from '@/state/HerbdexProvider';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * The Field Research entry point, shown on the Herbdex page.
 *
 * Field Research deliberately does not get a seventh slot in the primary nav — at 390px
 * that bar is already six items wide. It belongs next to the Herbdex anyway: it exists to
 * send you back to the deck, so this is where you find it.
 */
export function ResearchTeaser() {
  const { ready, world, dailyTasks } = useHerbdex();

  const open = ready ? dailyTasks.filter((task) => !progressForTask(task, world).done) : [];
  const next = open[0];

  return (
    <Link
      href="/herbdex/research"
      className="panel flex items-center gap-3 p-4 transition-colors hover:bg-plum-600/50"
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-lg text-gold-300"
      >
        <PlantdexIcon name="research" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-gold-plate">Field Research</span>
        <span className="block truncate text-xs text-violet-300">
          {!ready
            ? 'Reasons to take the deck outside'
            : next
              ? `Next up: ${next.title}`
              : 'All caught up — new suggestions tomorrow'}
        </span>
      </span>
      {ready && open.length > 0 && (
        <span className="shrink-0 rounded-full bg-gold-500/20 px-2 py-0.5 text-xs font-bold text-gold-300 tabular-nums">
          {open.length}
          <span className="sr-only"> open tasks</span>
        </span>
      )}
      <span aria-hidden="true" className="shrink-0 text-violet-400">
        →
      </span>
    </Link>
  );
}
