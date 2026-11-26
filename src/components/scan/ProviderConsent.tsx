'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  ANONYMOUS_CONSENT_SCOPE,
  CONSENT_COPY,
  CONSENT_PRIVACY_HREF,
  acknowledge,
  browserConsentStorage,
  hasAcknowledged,
  isConsentEnforced,
} from '@/lib/scan-consent';

/**
 * Whether the player has acknowledged where photos go, for THIS account (or this device, signed
 * out). `required` is false when the flag is off, so callers can ignore the whole feature.
 * `known` is false until the first read, so the screen never flashes a notice at somebody who
 * already accepted.
 */
const listeners = new Set<() => void>();
const subscribe = (notify: () => void) => {
  listeners.add(notify);
  window.addEventListener('storage', notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener('storage', notify);
  };
};
const emit = () => listeners.forEach((notify) => notify());
const noopSubscribe = () => () => undefined;

export function useProviderConsent(userId: string | null) {
  const scope = userId ?? ANONYMOUS_CONSENT_SCOPE;
  const required = isConsentEnforced();
  // Server render and the first client render both read "not acknowledged", then the real
  // value arrives, so the static export never hydrates a mismatch.
  const stored = useSyncExternalStore(
    subscribe,
    () => hasAcknowledged(browserConsentStorage(), scope),
    () => false,
  );
  const known = useSyncExternalStore(noopSubscribe, () => true, () => false);
  // A session-only accept covers a storage that refuses writes: the player did accept, and the
  // only cost of the failed write is being asked again next time (the safe direction).
  const [sessionAccepted, setSessionAccepted] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  const accept = useCallback(() => {
    acknowledge(browserConsentStorage(), scope);
    setSessionAccepted(scope);
    setDeclined(false);
    emit();
  }, [scope]);

  const decline = useCallback(() => setDeclined(true), []);

  const accepted = !required || stored || sessionAccepted === scope;
  return { required, known: !required || known, accepted, declined, accept, decline, scope };
}

/**
 * The notice itself. Plain markup in existing tokens; the owner designs the final look
 * (`data-ui-placeholder`). Inline rather than a dialog, so it cannot be dismissed by accident
 * and a keyboard user meets it in reading order.
 */
export function ProviderConsent({
  onAccept,
  onDecline,
  declined,
}: {
  onAccept: () => void;
  onDecline: () => void;
  declined: boolean;
}) {
  return (
    <section
      aria-labelledby="scan-consent-heading"
      data-ui-placeholder="provider-consent"
      className="panel space-y-3 p-4 pr-5"
    >
      <h3
        id="scan-consent-heading"
        className="font-display text-lg leading-snug font-bold text-gold-plate [overflow-wrap:anywhere]"
      >
        {CONSENT_COPY.heading}
      </h3>
      <p className="text-sm leading-relaxed text-violet-200">{CONSENT_COPY.body}</p>
      <p className="text-sm">
        <Link
          href={CONSENT_PRIVACY_HREF}
          className="font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300"
        >
          {CONSENT_COPY.privacyLink}
        </Link>
      </p>
      <div className="flex flex-col gap-2 min-[400px]:flex-row">
        <button
          type="button"
          onClick={onAccept}
          className="min-h-11 rounded-full border border-gold-500 bg-gold-500/15 px-5 text-sm font-bold text-gold-300 hover:bg-gold-500/25"
        >
          {CONSENT_COPY.accept}
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="min-h-11 rounded-full border border-violet-500 px-5 text-sm font-bold text-violet-100 hover:bg-violet-600/30"
        >
          {CONSENT_COPY.decline}
        </button>
      </div>
      {/* ONLY after the player pressed "Not now". It used to be able to appear before any decision. */}
      {declined && (
        <p role="status" className="text-sm text-violet-300">
          {CONSENT_COPY.declined}
        </p>
      )}
    </section>
  );
}
