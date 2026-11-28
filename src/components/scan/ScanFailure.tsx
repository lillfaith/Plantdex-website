import type { ReactNode } from 'react';
import { ScanScout } from './ScanScout';

/**
 * A FAILED IDENTIFICATION: the scout at rest, the plain message, one clear way to try again.
 *
 * The scout is deliberately NOT `waiting` and has no pose of its own: it holds its resting
 * frame beside the words, which are the existing accurate ones (`answer.message`, passed in
 * unchanged). Retry only re-runs the same guarded `run`, so every session, consent and quota
 * rule applies exactly as to the first attempt. It is omitted when `onRetry` is not given
 * (a daily limit is not helped by trying again).
 */
export function ScanFailure({
  message,
  onRetry,
  children,
}: {
  message: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <section className="panel p-5" data-scan-failure>
      <div className="flex items-start gap-3">
        <ScanScout className="w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-violet-100">{message}</p>
          {children}
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 min-h-11 w-full rounded-full border border-gold-500 bg-gold-500/15 px-5 text-sm font-bold text-gold-300 hover:bg-gold-500/25"
        >
          Retry
        </button>
      )}
    </section>
  );
}
