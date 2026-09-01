/**
 * THE CAUTION THAT NEVER MOVES.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT IS RENDERED UNCONDITIONALLY, AND IT MUST STAY THAT WAY.
 *
 * A caution that appears only for weak matches teaches exactly the wrong lesson: that a high
 * number means permission. The dangerous screen is not the uncertain one — a player reading
 * "we are not sure" behaves carefully. It is the 97% one, which reads as an answer.
 *
 * So this takes no confidence, no score, and no band. There is nothing to pass it that could
 * make it quieter, which is why it is a component with no props rather than a string with an
 * `if` in front of it. `plant-id-safety.test.ts` fails the build if the scan flow ever gates
 * a caution on a score.
 *
 * The wording separates the two things people collapse: recognising a plant, and knowing
 * what may be done with it. A photograph can support the first. Nothing here supports the
 * second, at any confidence, ever.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ScanCaution() {
  return (
    <aside
      // `note`, not `alert`: it is present from the moment the screen renders rather than
      // announced on a change, and an alert role here would interrupt on every result.
      role="note"
      className="rounded-xl border border-gold-500/45 bg-gold-500/10 p-4"
    >
      <p className="text-[0.72rem] font-bold tracking-[0.1em] text-gold-300 uppercase">
        A suggestion, not an identification
      </p>
      <p className="mt-2 text-sm leading-relaxed text-violet-100">
        This is a guess made from a photograph. It is <strong>not</strong> confirmation that
        you have found this plant, and it says nothing at all about whether the plant can be
        eaten, drunk, applied or handled without harm.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-violet-200">
        Check it against the card and against a second source before you act on it. Never
        consume or apply a wild plant on an identification you are not certain of &mdash;
        including a certain-looking one from a phone.
      </p>
    </aside>
  );
}
